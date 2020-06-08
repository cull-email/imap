import { v4 as uuid } from 'uuid';
import { EventEmitter } from 'events';
import Connection, { Preferences as ConnectionPreferences } from './connection';
import Response, {
  Status as ResponseStatus,
  ServerStatus,
  MailboxSizeUpdate,
  MessageStatus,
  FetchResponseData,
  MessageDataItem
} from './response';
import { Code } from './code';
import { Command } from './command';
import Mailbox, { SelectedMailbox } from './mailbox';
import Envelope from './envelope';
import Message from './message';
import Header from './header';

/**
 * A collection of server capabilities.
 * @link https://tools.ietf.org/html/rfc3501#section-7.2.1
 */
type Capabilities = Set<string>;

/**
 * A collection of mailboxes keyed by name.
 */
type Mailboxes = Map<string, Mailbox>;
/**
 * A collection of envelopes keyed by message sequence number.
 */
type Envelopes = Map<number, Envelope>;
/**
 * A collection of messages keyed by sequence number.
 */
type Messages = Map<number, Message>;
/**
 * A collection of headrs keyed by message sequence number.
 */
type Headers = Map<number, Header>;

/**
 * User-specified client options analogous to configuration.
 */
export interface Preferences extends ConnectionPreferences {
  /**
   * A unique identifier for the client instance.
   */
  id?: string;
}

/**
 * __An IMAP Client__
 */
export class Client extends EventEmitter {
  /**
   * A unique identifier.
   */
  id: string;
  /**
   * An IMAP connection reference.
   */
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
  protected _mailboxes: Mailboxes = new Map();
  /**
   * A cache of envelopes the server has communicated.
   */
  protected _envelopes: Envelopes = new Map();
  /**
   * A cache of messages the server has communicated.
   */
  protected _messages: Messages = new Map();

  constructor(preferences: Preferences) {
    super();
    this.id = preferences.id ?? uuid();
    this.connection = new Connection(preferences);
    this.initialize();
  }

  protected initialize(): void {
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
  protected analyzeResponse(response: Response): void {
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
        case Code.UIDNEXT:
          if (this.selected) {
            this.selected.uid.next = c.data;
          }
          break;
        case Code.UIDVALIDITY:
          if (this.selected) {
            this.selected.uid.validity = c.data;
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
          (response.data[key] as Capabilities).forEach(capability =>
            this.capabilities.add(capability)
          );
          break;
        case ServerStatus.LIST:
          (response.data[key] as Mailboxes).forEach(mailbox =>
            this._mailboxes.set(mailbox.name, mailbox)
          );
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

  protected analyzeFetchResponseData(data: FetchResponseData): void {
    data.forEach((datum, sequence) => {
      let message = new Message();
      Object.keys(datum).forEach(item => {
        switch (item) {
          case MessageDataItem.ENVELOPE:
            message.envelope = datum[item];
            break;
          case MessageDataItem.UID:
            message.uid = datum[item];
            break;
          case MessageDataItem.FLAGS:
            message.flags = datum[item];
            break;
          case MessageDataItem.BODY:
            message.body = datum[item];
            break;
          default:
            this.emit('debug', `Unhandled message data item: ${item}`);
            break;
        }
      });
      if (message.envelope !== undefined) {
        this._envelopes.set(sequence, message.envelope);
      }
      this._messages.set(sequence, message);
    });
  }

  /**
   * Get Mailboxes
   * @param path (`string`, default: empty) The name of a mailbox or level of hierarchy
   * @param children (`boolean`, default: `true`) Return children under this hierarchy
   * @param flatten (`boolean`, default: `false`) Return a flat array vs a nested array (tree)
   * @link https://tools.ietf.org/html/rfc3501#section-6.3.8
   */
  async mailboxes(
    path: string = '',
    children: boolean = true,
    flatten: boolean = false
  ): Promise<Mailboxes> {
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

  /**
   * Get Mailbox
   * @link https://tools.ietf.org/html/rfc3501#section-6.3.8
   * @param name (`string`) The name of a mailbox or level of hierarchy
   * @param path (`string`, default: `/`)
   * @param stale (`boolean`, default: `true`) allow possibly stale (cached) result
   */
  async mailbox(name: string, path: string = '/', stale: boolean = true): Promise<Mailbox> {
    let mailbox: Mailbox | undefined;
    return new Promise(async (resolve, reject) => {
      if (stale) {
        mailbox = this._mailboxes.get(path);
        if (mailbox !== undefined) return resolve(mailbox);
      }
      try {
        let command = new Command('list', `"${path}" "${name}"`);
        let response = await this.connection.exchange(command);
        if (response.status === ResponseStatus.OK) {
          mailbox = this._mailboxes.get(name);
          return mailbox !== undefined
            ? resolve(mailbox)
            : reject(new Error('Mailbox could not be found.'));
        }
        throw response;
      } catch (error) {
        return reject(error);
      }
    });
  }

  /**
   * Select a Mailbox for subsequent command context.
   * @link https://tools.ietf.org/html/rfc3501#section-6.3.1
   * @param name (`string`)
   */
  async select(name: string): Promise<SelectedMailbox> {
    return new Promise(async (resolve, reject) => {
      if (this.selected !== undefined && this.selected.name === name) {
        return resolve(this.selected);
      }
      try {
        this.selected = new SelectedMailbox(name);
        let select = new Command('select', name);
        let response = await this.connection.exchange(select);
        if (response.status === ResponseStatus.OK) {
          return resolve(this.selected);
        }
        throw response;
      } catch (error) {
        this.selected = undefined;
        return reject(error);
      }
    });
  }

  /**
   * Fetch Envelopes for a given mailbox and sequence
   * @link https://tools.ietf.org/html/rfc3501#section-6.4.5
   * @param name (`string`) The mailbox name/path
   * @param sequence (`string) sequence set
   * @param timeout (`number`) timeout in seconds
   */
  async envelopes(
    name: string = 'INBOX',
    sequence: string = '1:10',
    timeout?: number
  ): Promise<Envelopes> {
    this._envelopes = new Map();
    return new Promise(async (resolve, reject) => {
      try {
        await this.select(name);
        let command = new Command('fetch', `${sequence} envelope`);
        let response = await this.connection.exchange(command, timeout);
        if (response.status === ResponseStatus.OK) {
          return resolve(this._envelopes);
        }
        throw response;
      } catch (error) {
        return reject(error);
      }
    });
  }

  async messages(
    name: string = 'INBOX',
    sequence: string = '1:10',
    items: string[] = ['UID', 'FLAGS', 'BODY.PEEK[]'],
    timeout?: number
  ): Promise<Messages> {
    this._messages = new Map();
    return new Promise(async (resolve, reject) => {
      try {
        await this.select(name);
        let command = new Command('fetch', `${sequence} (${items.join(' ')})`);
        let response = await this.connection.exchange(command, timeout);
        if (response.status === ResponseStatus.OK) {
          return resolve(this._messages);
        }
        throw response;
      } catch (error) {
        return reject(error);
      }
    });
  }

  async headers(
    name: string = 'INBOX',
    sequence: string = '1:10',
    timeout?: number
  ): Promise<Headers> {
    try {
      let headers: Headers = new Map();
      let messages = await this.messages(
        name,
        sequence,
        ['UID', 'FLAGS', 'BODY.PEEK[HEADER]'],
        timeout
      );
      messages.forEach((message, key) => {
        if (message.body !== undefined && message.body.HEADER !== undefined) {
          headers.set(key, message.body.HEADER);
        }
      });
      return Promise.resolve(headers);
    } catch (error) {
      return Promise.reject(error);
    }
  }
}

export default Client;

export let mailboxTree = (map: Mailboxes): Mailboxes => {
  let mailboxes = [...map.values()];
  mailboxes.forEach(mailbox => {
    // reset for idempotency
    delete mailbox.children;
  });
  let tree: Mailboxes = new Map();
  mailboxes.forEach(mailbox => {
    let components = mailbox.name.split(mailbox.delimiter);
    if (components.length > 1) {
      components.pop();
      let parent = map.get(components.join(mailbox.delimiter));
      if (parent) {
        parent.children ? parent.children.push(mailbox) : (parent.children = [mailbox]);
      } else {
        throw new Error(`Dangling mailbox: ${mailbox}`);
      }
    } else {
      tree.set(mailbox.name, mailbox);
    }
  });
  return tree;
};
