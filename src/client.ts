import { v4 as uuid } from 'uuid';
import { EventEmitter } from 'events';
import Connection, { Preferences as ConnectionPreferences } from './connection';
import Response, { Status as ResponseStatus, ServerState } from './response';
import { Code } from './code';
import { Command } from './command';

export interface Mailbox {
  name: string;
  path: string;
  delimiter: string;
  attributes: string[];
  children?: Mailbox[];
}

export interface Preferences extends ConnectionPreferences {
  /**
   * Client Identifier
   */
  id?: string;
}

export default class Client extends EventEmitter {
  name: string;
  connection: Connection;
  /**
   * A collection of capabilities the server has communicated.
   * @link https://tools.ietf.org/html/rfc3501#section-7.2.1
   */
  capabilities: Set<string> = new Set();
  /**
   * A collection of mailboxes
   */
  _mailboxes: Map<string, Mailbox> = new Map();

  constructor(preferences: Preferences) {
    super();
    this.name = preferences.id ?? uuid();
    this.connection = new Connection(preferences);
    this.initialize();
  }

  initialize(): void {
    this.connection.on('error', error => {
      this.emit('error', error);
    });
    this.connection.on('receive', response => {
      this.analyzeResponse(response);
    });
  }

  async connect(login: boolean = true): Promise<boolean> {
    let response = await this.connection.connect(login);
    if (response.status === ResponseStatus.OK) {
      return Promise.resolve(true);
    }
    return Promise.reject(response);
  }

  async disconnect(): Promise<boolean> {
    let response = await this.connection.disconnect();
    if (response.status === ResponseStatus.OK) {
      return Promise.resolve(true);
    }
    return Promise.reject(response);
  }

  /**
   * Analyze a response and update connection data as applicable.
   */
  analyzeResponse(response: Response): void {
    // Response Codes
    response.codes.forEach(c => {
      if (c.code === Code.CAPABILITY) {
        c.data.forEach(capability => this.capabilities.add(capability));
      }
    });
    // Response Data
    Object.keys(response.data).forEach(key => {
      switch (key) {
        case ServerState.CAPABILITY:
          response.data[key].forEach(capability => this.capabilities.add(capability));
          break;
        case ServerState.LIST:
          response.data[key].forEach(mailbox => this._mailboxes.set(mailbox.name, mailbox));
          break;
      }
    });
  }

  /**
   * Get Mailboxes
   * @link https://tools.ietf.org/html/rfc3501#section-6.3.8
   * @param flatten (`boolean`, default: `false`) Return a flat array vs a nested array (tree)
   * @param children (`boolean`, default: `true`) Return children under this hierarchy
   * @param path (`string`, default: empty) The name of a mailbox or level of hierarchy
   */
  async mailboxes(flatten: boolean = true, children: boolean = true, path: string = ''): Promise<Mailbox[]> {
    return new Promise(async (resolve, reject) => {
      try {
        let wildcard = children ? '*' : '%';
        let command = new Command('list', `"${path}" ${wildcard}`);
        let response = await this.connection.exchange(command);
        if (response.status === ResponseStatus.OK) {
          let mailboxes = flatten ? [...this._mailboxes.values()] : mailboxTree(this._mailboxes);
          return resolve(mailboxes);
        } else {
          return reject(response);
        }
      } catch (error) {
        return reject(error);
      }
    });
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

export let mailboxTree = (map: Map<string, Mailbox>): Mailbox[] => {
  let mailboxes = [...map.values()];
  mailboxes.forEach(mailbox => {
    // reset for idempotency
    delete mailbox.children;
  });
  let tree: Mailbox[] = [];
  mailboxes.forEach(mailbox => {
    let components = mailbox.path.split(mailbox.delimiter);
    if (components.length > 1) {
      components.pop();
      let parent = map.get(components.join(mailbox.delimiter));
      if (parent) {
        parent.children ? parent.children.push(mailbox) : parent.children = [mailbox];
      } else {
        throw new Error(`Dangling mailbox: ${mailbox}`);
      }
    } else {
      tree.push(mailbox);
    }
  });
  return tree;
}
