import { v4 as uuid } from 'uuid';
import { EventEmitter } from 'events';
import Connection, { Preferences as ConnectionPreferences } from './connection';
import { Status as ResponseStatus, Status } from './response';
import { Command } from './command';

// import { Mailbox, Message, Envelope } from './types';

export interface Preferences extends ConnectionPreferences {
  /**
   * Client Identifier
   */
  id?: string;
}

export default class Client extends EventEmitter {
  name: string;
  connection: Connection;

  constructor(preferences: Preferences) {
    super();
    this.name = preferences.id ?? uuid();
    this.connection = new Connection(preferences);
    this.initialize();
  }

  initialize(): void {
    this.connection.on('error', (error) => {
      this.emit('error', error);
    });
  }

  async connect(login: boolean = true): Promise<boolean> {
    let status = await this.connection.connect(login);
    return Promise.resolve(status === ResponseStatus.OK);
  }

  async disconnect(): Promise<boolean> {
    let status = await this.connection.disconnect();
    return Promise.resolve(status === ResponseStatus.OK);
  }

  async mailboxes(): Promise<string[]> {
    try {
      let command = new Command('list', '"" %');
      let response = await this.connection.exchange(command);
      if (response.status === Status.OK) {

      } else {
        return Promise.reject(response);
      }
      console.log(this.connection.log);
      return [];
    } catch (error) {
      return Promise.reject(error);
    }
  }

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
