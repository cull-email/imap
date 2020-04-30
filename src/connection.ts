import { EventEmitter } from 'events';
import { Socket } from 'net';
import tls, { TLSSocket } from 'tls';

import Command from './command';
import Response, { Status } from './response';

/**
 * User-specified _preferences_
 */
export interface Preferences {
  /**
   * Server Name Indication
   * @link https://tools.ietf.org/html/rfc8446#section-9.2
   * @link https://tools.ietf.org/html/rfc6066#section-3
   */
  sni?: string;
  host: string;
  port?: number;
  user: string;
  pass: string;
  /**
   * Default timeout (in seconds) for a given command's expected response to be received.
   */
  timeout?: number;
  options?: tls.ConnectionOptions;
}

/**
 * Connection instance _configuration_
 */
export interface Configuration {
  /**
   * Server Name Indication
   * @link https://tools.ietf.org/html/rfc8446#section-9.2
   * @link https://tools.ietf.org/html/rfc6066#section-3
   */
  sni?: string;
  host: string;
  port: number;
  user: string;
  pass: string;
  /**
   * Default timeout (in seconds) for a given command's expected response to be received.
   */
  timeout: number;
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
  state: State = State.Disconnected;
  socket: TLSSocket = new TLSSocket(new Socket());
  configuration: Configuration;
  commands: Command[] = [];
  responses: Response[] = [];

  constructor(preferences: Preferences) {
    super();
    let defaults = {
      port: 993,
      timeout: 10
    };
    this.configuration = { ...defaults, ...preferences};
  }

  async connect(login: boolean = true): Promise<Status> {
    return new Promise((resolve, reject) => {
      try {
        let { host, port } = this.configuration;
        let servername = this.configuration.sni ?? host;
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
    this.commands.push(command);
    this.emit('send', command);
    this.socket.write(command.toString());
  }

  receive(response: Response): void {
    this.responses.push(response);
    this.emit('receive', response);
  }

  /**
   * Return the next untagged or a specific tagged response.
   *
   * @param tag Command tag
   * @param timeout Timeout in seconds
   */
  async awaitResponse(tag?: string, timeout?: number): Promise<Response> {
    return new Promise((resolve, reject) => {
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
   * Update connection state and configure default emitter relays from connection socket
   */
  connectionEstablished(): void {
    this.state = State.NotAuthenticated;
    this.emit('connect', 'TLS connection established.');
    this.socket.on('data', (buffer) => {
      try {
        let response = new Response(buffer);
        this.receive(response);
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
    })
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
}

export default Connection;
