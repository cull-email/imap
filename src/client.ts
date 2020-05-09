import { v4 as uuid } from 'uuid';
import { EventEmitter } from 'events';
import Connection, { Preferences as ConnectionPreferences } from './connection';
import Response, {
  Status as ResponseStatus,
  ServerStatus,
  MailboxSizeUpdate,
  MessageStatus,
  FetchResponseData,
  MessageDataItem,
} from './response';
import { Code } from './code';
import { Command } from './command';
import Mailbox, { SelectedMailbox } from './mailbox';
import Envelope from './envelope';

type Capabilities = Set<string>;
type Mailboxes = Map<string, Mailbox>;
type Envelopes = Map<number, Envelope>;

export interface Preferences extends ConnectionPreferences {
  /**
   * Client Identifier
   */
  id?: string;
}

export default class Client extends EventEmitter {
  id: string;
  connection: Connection;
  /**
   * Capabilities the server has communicated.
   * @link https://tools.ietf.org/html/rfc3501#section-7.2.1
   */
  capabilities: Capabilities = new Set();
  /**
   * Selected mailbox
   * @link https://tools.ietf.org/html/rfc3501#section-3.3
   */
  selected?: SelectedMailbox;
  /**
   * A cache of mailboxes the server has communicated.
   */
  _mailboxes: Mailboxes = new Map();
  /**
   * A cache of envelopes the server has communicated.
   */
  _envelopes: Envelopes = new Map();

  constructor(preferences: Preferences) {
    super();
    this.id = preferences.id ?? uuid();
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
      switch (c.code) {
        case Code.CAPABILITY:
          c.data.forEach(capability => this.capabilities.add(capability));
          break;
        case Code.PERMANENTFLAGS:
          if (this.selected) {
            c.data.forEach(flag => this.selected?.flags.set(flag as string, true));
          }
          break;
        case Code.READONLY:
          if (this.selected) {
            this.selected.writeable = false;
          }
          break;
        case Code.READWRITE:
          if (this.selected) {
            this.selected.writeable = true;
          }
          break;
        default:
          this.emit('debug', ['unhandled response code', c, response]);
          break;
      }
    });
    // Response Data
    Object.keys(response.data).forEach(key => {
      switch (key) {
        case ServerStatus.CAPABILITY:
          (response.data[key] as Capabilities).forEach(capability => this.capabilities.add(capability));
          break;
        case ServerStatus.LIST:
          (response.data[key] as Mailboxes).forEach(mailbox => this._mailboxes.set(mailbox.name, mailbox));
          break;
        case ServerStatus.FLAGS:
          if (this.selected) {
            response.data[key].forEach(flag => this.selected?.flags.set(flag, false));
          }
          break;
        case MailboxSizeUpdate.EXISTS:
          if (this.selected) {
            this.selected.exists = response.data[key] ?? 0;
          }
          break;
        case MailboxSizeUpdate.RECENT:
          if (this.selected) {
            this.selected.recent = response.data[key] ?? 0;
          }
          break;
        case MessageStatus.FETCH:
          let data = response.data[key];
          if (data !== undefined) {
            this.analyzeFetchResponseData(data);
          }
          break;
        default:
          this.emit('debug', ['unhandled response data', key, response]);
          break;
      }
    });
  }

  analyzeFetchResponseData(data: FetchResponseData): void {
    data.forEach((message, sequence) => {
      Object.keys(message).forEach(item => {
        switch(item) {
          case MessageDataItem.ENVELOPE:
            this._envelopes.set(sequence, message[item]);
            break;
          default:
            this.emit('debug', `Unhandled message data item: ${item}`);
            break;
        }
      });
    });
  }

  /**
   * Get Mailboxes
   * @link https://tools.ietf.org/html/rfc3501#section-6.3.8
   * @param flatten (`boolean`, default: `false`) Return a flat array vs a nested array (tree)
   * @param children (`boolean`, default: `true`) Return children under this hierarchy
   * @param path (`string`, default: empty) The name of a mailbox or level of hierarchy
   */
  async mailboxes(flatten: boolean = false, children: boolean = true, path: string = ''): Promise<Map<string, Mailbox>> {
    return new Promise(async (resolve, reject) => {
      try {
        let wildcard = children ? '*' : '%';
        let command = new Command('list', `"${path}" ${wildcard}`);
        let response = await this.connection.exchange(command);
        if (response.status === ResponseStatus.OK) {
          let mailboxes = flatten ? this._mailboxes : mailboxTree(this._mailboxes);
          return resolve(mailboxes);
        }
        throw response;
      } catch (error) {
        return reject(error);
      }
    });
  }

  async envelopes(name: string): Promise<Map<number, Envelope>> {
    this._envelopes = new Map();
    return new Promise(async (resolve, reject) => {
      try {
        let select = new Command('select', name);
        this.selected = new SelectedMailbox(name);
        let response = await this.connection.exchange(select);
        if (response.status === ResponseStatus.OK) {
          let command = new Command('fetch', '1:* envelope');
          response = await this.connection.exchange(command);
          if (response.status === ResponseStatus.OK) {
            return resolve(this._envelopes);
          }
          throw response;
        }
        throw response;
      } catch(error) {
        this.selected = undefined;
        return reject(error);
      }
    });
  }

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

export let mailboxTree = (map: Map<string, Mailbox>): Map<string, Mailbox> => {
  let mailboxes = [...map.values()];
  mailboxes.forEach(mailbox => {
    // reset for idempotency
    delete mailbox.children;
  });
  let tree: Map<string, Mailbox> = new Map();
  mailboxes.forEach(mailbox => {
    let components = mailbox.name.split(mailbox.delimiter);
    if (components.length > 1) {
      components.pop();
      let parent = map.get(components.join(mailbox.delimiter));
      if (parent) {
        parent.children ? parent.children.push(mailbox) : parent.children = [mailbox];
      } else {
        throw new Error(`Dangling mailbox: ${mailbox}`);
      }
    } else {
      tree.set(mailbox.name, mailbox);
    }
  });
  return tree;
}
