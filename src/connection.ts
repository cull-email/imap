import { EventEmitter } from 'events';
import { Socket } from 'net';
import tls, { TLSSocket } from 'tls';

import Command from './command';
import Response from './response';

export interface Preferences {
  host: string;
  port?: number;
  user: string;
  pass: string;
  timeout?: number; // default timeout (in seconds) for a given command's expected response to be received.
  options?: tls.ConnectionOptions;
}

export interface Configuration {
  host: string;
  port: number;
  user: string;
  pass: string;
  /**
   * Default timeout for expected responses (in seconds).
   */
  timeout: number;
  options?: tls.ConnectionOptions;
}

export enum State {
  Disconnected,
  NotAuthenticated,
  Authenticated,
  MailboxSelected,
}

/**
 * An asynchronous IMAP Connection interface leaning toward synchronous.
 *
 * Things explicitly not currently implemented:
 * - Insecure (non-TLS-enabled) connections. (https://tools.ietf.org/html/rfc8314)
 * - Features required for the "online" access model (i.e. `SUBSCRIBE` and related commands)
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

  async connect(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        let { host, port } = this.configuration;
        this.socket = tls.connect({ ...this.configuration.options, host, port }, () => {
          if (!this.socket.authorized) {
            reject(this.socket.authorizationError);
          } else {
            this.connected();
            this.awaitResponse().then(() => {
              let command = new Command('capability');
              this.send(command);
              this.awaitResponse(command.tag).then(() => {
                resolve(true);
              }).catch((error) => reject(error));
            }).catch((error) => reject(error));
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  send(command: Command): void {
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
  connected(): void {
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
  }

  /**
   * Emit all events as `debug` event before standard emit.
   */
  emit(event: string | symbol, ...args: any[]): boolean {
    if (event !== 'debug') {
      super.emit('debug', { event, args});
    }
    return super.emit(event, ...args);
  }
}

export default Connection;
