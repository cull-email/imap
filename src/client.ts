import { v4 as uuid } from 'uuid';
import { EventEmitter } from 'events';
import Connection, {
  Configuration as ClientConfiguration
} from './connection';

// import { Mailbox, Message, Envelope } from './types';

export interface Configuration {
  name?: string;
  host: string;
  port?: number;
  user: string;
  pass: string;
}

export default class Client extends EventEmitter {
  name: string;
  connection: Connection;

  constructor(options: Configuration) {
    super();
    this.name = options.name ?? uuid();
    this.connection = new Connection({
      host: options.host,
      port: options.port ?? 993,
      auth: {
        user: options.user,
        pass: options.pass,
      },
      options: {
        requireTLS: true
      }
    });
    this.initialize();
  }

  initialize(): void {
    this.connection.on('ready', () => {
      this.status = State.NotAuthenticated;
    });
    this.connection.on('close', () => {
      this.status = State.Disconnected;
      this.emit('debug', 'connection closed.');
    });
    this.connection.on('error', (error) => {
      this.close();
      this.emit('error', error);
    });
  }

  async connect(authenticate: boolean = true): Promise<boolean> {
    let { host, port } = this.configuration;
    return new Promise((resolve, reject) => {
      this.emit('debug', 'connecting...');
      this.connection.once('error', reject);
      this.connection.connect({ host, port });
      this.connection.once('ready', () => {
        this.connection.off('error', reject);
        this.status = State.NotAuthenticated;
        this.emit('debug', `connected to ${host}:${port}`);
        if (authenticate) {
          resolve(this.authenticate());
        } else {
          resolve(true);
        }
      });
    });
    ;
  }

  async execute(command: Command, parameters: string): Promise<Buffer> {
    if (this.status === State.Disconnected) {
      let error = `Command ${command} could not be executed. Not connected.`;
      this.emit('error', error);
      return Promise.reject(error);
    }
    return new Promise((resolve, reject) => {
      this.connection.once('error', reject);
      this.connection.on('data', (response) => {
        this.connection.off('error', reject);
        resolve(response);
      })
      this.emit('debug', `${command} ${parameters}`);
      this.connection.write(`${command} ${parameters}\r\n`, (error) => {
        this.emit('debug', error);
        if (error) {
          reject(error);
        }
      });
    });
  }

  async authenticate(): Promise<boolean> {
    if (!this.configuration.auth) return Promise.resolve(false);
    if (this.status === State.NotAuthenticated) {
      let { user, pass } = this.configuration.auth;
      try {
        let response = await this.execute(Command.Login, `${user} ${pass}`);
        this.emit('debug', response);
        return Promise.resolve(true);
      } catch (error) {
        return Promise.reject(error);
      }
    }
    return Promise.resolve(true);
  }

  close(): void {
    if (!this.connection.destroyed || this.status !== State.Disconnected) {
      this.connection.destroy();
    }
  }

  // async mailboxes(): Promise<Mailbox[]> {
  //   try {
  //     await this.client.connect();
  //     let mailboxes = await this.client
  //       .listMailboxes()
  //       .then((root: { children: Mailbox[] }) => root.children);
  //     this.client.close();
  //     return mailboxes;
  //   } catch (error) {
  //     return this.client.close().then(() => {
  //       Promise.reject(error);
  //     });
  //   }
  // }

  // async envelopes(
  //   mailbox: string = 'INBOX',
  //   sequence: string = '1:10',
  //   query: string[] = []
  // ): Promise<Envelope[]> {
  //   try {
  //     await this.client.connect();
  //     let messages = await this.client.listMessages(
  //       mailbox,
  //       sequence,
  //       ['uid', 'flags', 'envelope'].concat(query)
  //     );
  //     this.client.close();
  //     return messages.map((m: Message) => {
  //       return { ...m.envelope, client: this, mailbox };
  //     });
  //   } catch (error) {
  //     return this.client.close().then(() => {
  //       return Promise.reject(error);
  //     });
  //   }
  // }

  // async messages(
  //   mailbox: string = 'INBOX',
  //   sequence: string = '1:10',
  //   query: string[] = []
  // ): Promise<Message[]> {
  //   try {
  //     await this.client.connect();
  //     let messages = await this.client.listMessages(
  //       mailbox,
  //       sequence,
  //       ['uid', 'flags', 'envelope', 'body.peek[]'].concat(query)
  //     );
  //     this.client.close();
  //     return messages.map((m: any) => {
  //       m.body = ['body[]'];
  //       return { ...(m as Message), client: this, mailbox };
  //     });
  //   } catch (error) {
  //     return this.client.close().then(() => {
  //       return Promise.reject(error);
  //     });
  //   }
  // }
}
