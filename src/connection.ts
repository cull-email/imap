import { EventEmitter } from 'events';
import { Socket } from 'net';
import tls, { TLSSocket } from 'tls';

import Command from './command';
import Response, { Status } from './response';
import { Code } from './code';

/**
 * User-specified _preferences_
 */
export interface Preferences {
  /**
   * Server Name Indication
   * @link https://en.wikipedia.org/wiki/Server_Name_Indication
   * @link https://tools.ietf.org/html/rfc8446#section-9.2
   */
  sni?: string;
  /**
   * @link https://en.wikipedia.org/wiki/Hostname
   */
  host: string;
  /**
   * TCP Port
   * @link https://en.wikipedia.org/wiki/Port_(computer_networking)
   */
  port?: number;
  /**
   * Authentication Username
   */
  user: string;
  /**
   * Authentication Password
   */
  pass: string;
  /**
   * Default timeout (in seconds) for a given command's expected response to be received.
   */
  timeout?: number;
  /**
   * Additional options passed to lower-level TLS Socket.
   */
  options?: tls.ConnectionOptions;
}

/**
 * Connection instance _configuration_
 */
export interface Configuration {
  /**
   * Server Name Indication
   * @link https://en.wikipedia.org/wiki/Server_Name_Indication
   * @link https://tools.ietf.org/html/rfc8446#section-9.2
   */
  sni: string;
  /**
   * @link https://en.wikipedia.org/wiki/Hostname
   */
  host: string;
  /**
   * TCP Port
   * @link https://en.wikipedia.org/wiki/Port_(computer_networking)
   */
  port: number;
  /**
   * Authentication Username
   */
  user: string;
  /**
   * Authentication Password
   */
  pass: string;
  /**
   * Default timeout (in seconds) for a given command's expected response to be received.
   */
  timeout: number;
  /**
   * Additional options passed to lower-level TLS Socket.
   */
  options?: tls.ConnectionOptions;
}

/**
 * Connection State
 * @link https://tools.ietf.org/html/rfc3501#section-3
 */
export enum State {
  /**
   * Logout State
   * @link https://tools.ietf.org/html/rfc3501#section-3.4
   */
  Disconnected,
  /**
   * Not Authenticated State
   * @link https://tools.ietf.org/html/rfc3501#section-3.1
   */
  NotAuthenticated,
  /**
   * Authenticated State
   * @link https://tools.ietf.org/html/rfc3501#section-3.2
   */
  Authenticated,
  /**
   * (Mailbox) Selected State
   * @link https://tools.ietf.org/html/rfc3501#section-3.3
   */
  MailboxSelected,
}

/**
 * __An IMAP Connection__
 *
 * Things explicitly not currently implemented:
 * - Insecure (non-TLS) connections. (https://tools.ietf.org/html/rfc8314)
 */
export class Connection extends EventEmitter {
  /**
   * Connection State
   * @link https://tools.ietf.org/html/rfc3501#section-3
   */
  state: State = State.Disconnected;
  /** The TLS Socket utilized for this connnection. */
  socket: TLSSocket = new TLSSocket(new Socket());
  /** The configuration utilized for this connection. */
  configuration: Configuration;
  /** A collection of all commands sent to the server on this connection. */
  commands: Command[] = [];
  /** A collection of all responses received from the server on this connection. */
  responses: Response[] = [];
  /**
   * A collection of capabilities the server has communicated.
   * @link https://tools.ietf.org/html/rfc3501#section-7.2.1
   */
  capabilities: string[] = [];

  constructor(preferences: Preferences) {
    super();
    let defaults = {
      port: 993,
      timeout: 10,
      sni: preferences.host,
    };
    this.configuration = { ...defaults, ...preferences};
  }

  /**
   * Establish a connection with the server.
   * @param login (default: `true`) attempt to automatically login immediately after a connection is established.
   * @link https://tools.ietf.org/html/rfc3501#section-2.2
   */
  async connect(login: boolean = true): Promise<Status> {
    return new Promise((resolve, reject) => {
      try {
        let { host, port, sni: servername } = this.configuration;
        let options = { ...this.configuration.options, host, port, servername };
        this.socket = tls.connect(options, () => {
          if (!this.socket.authorized) {
            reject(this.socket.authorizationError);
          } else {
            this.connectionEstablished();
            this.awaitResponse().then(() => {
              resolve(login ? this.login() : Status.OK);
            }).catch(error => reject(error));
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Inform the server the connection should be closed.
   * @link https://tools.ietf.org/html/rfc3501#section-6.1.3
   */
  async disconnect(): Promise<Status> {
    return new Promise((resolve, reject) => {
      if (this.state !== State.Disconnected) {
        try {
          let command = new Command('logout');
          this.send(command);
          this.awaitResponse(command.tag).then((response) => {
            this.socket.end(() => {
              resolve(response.status);
            });
          }).catch(error => reject(error));
        } catch (error) {
          reject(error);
        }
      } else {
        resolve(Status.OK);
      }
    });
  }

  /**
   * Authenticate as a user with the server.
   * @link https://tools.ietf.org/html/rfc3501#section-6.2.3
   */
  async login(): Promise<Status> {
    return new Promise((resolve, reject) => {
      try {
        let { user, pass } = this.configuration;
        let command = new Command('login', `${user} ${pass}`);
        this.send(command);
        this.awaitResponse(command.tag).then((response) => {
          if (response.status === Status.BAD) {
            throw new Error(`Server error: ${response.text}`);
          }
          if (response.status === Status.OK) {
            this.state = State.Authenticated;
          }
          resolve(response.status);
        }).catch(error => reject(error));
      } catch (error) {
        reject(error);
      }
    });
  }

  send(command: Command): void {
    if (this.state === State.Disconnected) {
      throw new Error('Disconnected from server.');
    }
    command.sent = new Date();
    this.commands.push(command);
    this.emit('send', command);
    this.socket.write(command.toString());
  }

  /**
   * Attempt to retrieve the reponse for a given command, automatically sending the command as needed.
   * @param command Command
   * @param timeout timeout in seconds
   */
  async exchange(command: Command, timeout?: number): Promise<Response> {
    if (!this.commands.find(c => c === command)) {
      this.send(command);
    }
    return this.awaitResponse(command.tag, timeout);
  }

  /**
   * Return the immediately next untagged or search for an exsting or upcoming tagged response.
   *
   * @param tag Command tag
   * @param timeout Timeout in seconds
   */
  async awaitResponse(tag?: string, timeout?: number): Promise<Response> {
    return new Promise((resolve, reject) => {
      // Search prior responses when tag specified.
      if (tag !== undefined) {
        let existing = this.responses.find(r => r.tag === tag);
        if (existing) {
          resolve(existing);
        }
      }
      let t = this.startResponseTimeout(reject, timeout);
      let receiver = (response: Response) => {
        if (tag === undefined || tag === response.tag) {
          clearTimeout(t);
          this.off('receive', receiver);
          try {
            resolve(response);
          } catch (error) {
            reject(error);
          }
        }
      };
      this.on('receive', receiver);
    });
  }

  /**
   * Start a timeout and throw an error or call the `reject` callback when reached.
   * @param reject callback
   * @param seconds cutoff time in seconds
   */
  startResponseTimeout(reject?: (Error) => void, seconds?: number): ReturnType<typeof setTimeout> {
    let timeout = (seconds ?? this.configuration.timeout) * 1000;
    return setTimeout(() => {
      let error = `Response time exceeded ${timeout}ms.`;
      if (reject === undefined) {
        throw new Error(error);
      } else {
        reject(error);
      }
    }, timeout);
  }

  /**
   * Analyze a response and update connection data as applicable.
   */
  analyzeResponse(response: Response): void {
    response.codes.forEach(c => {
      if (c.code === Code.CAPABILITY && c.status === Status.OK) {
        this.capabilities = c.data as string[];
      }
    });
  }

  /**
   * Update connection state and configure default emitter relays from connection socket
   */
  connectionEstablished(): void {
    this.state = State.NotAuthenticated;
    this.emit('connect', 'TLS connection established.');
    this.socket.on('data', (buffer) => {
      try {
        let response = new Response(buffer);
        this.analyzeResponse(response);
        this.responses.push(response);
        this.emit('receive', response);
      } catch (error) {
        this.emit('error', error);
      }
    });
    this.socket.on('end', () => {
      this.state = State.Disconnected;
      this.emit('end', 'Server closed connection.');
    });
    this.socket.on('close', (error) => {
      this.state = State.Disconnected;
      if (error) {
        this.emit('error', 'Connection closed with error.');
      }
      this.emit('close', 'Connection closed.');
    });
    this.socket.on('error', (error) => {
      this.emit('error', error);
      this.socket.end();
    });
  }

  /**
   * Emit all events as `debug` event before standard emit.
   */
  emit(event: string | symbol, ...args: any[]): boolean {
    if (event !== 'debug') {
      super.emit('debug', { event, ...args});
    }
    return super.emit(event, ...args);
  }

  transactionLog(): Map<Date, string> {
    let log = new Map();
    let commands = this.commands.map(c => [c.sent, `> ${c.toString()}`]) as (Date | string)[][];
    let responses = this.responses.map(r => [r.received, `< ${r.toString()}`]);
    let merged = commands.concat(responses);
    merged.sort((a, b) => {
      if (a[0] < b[0]) return -1;
      if (a[0] > b[0]) return 1;
      return 0;
    });
    merged.forEach(l => log.set(l[0], l[1]));
    return log;
  }
}

export default Connection;
