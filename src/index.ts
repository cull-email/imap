import { default as imapClient } from 'emailjs-imap-client';
import { v4 as uuid } from 'uuid';

export interface Mailbox {
  name: string;
  delimiter: string;
  path: string;
  children?: Mailbox[];
  flags?: string[];
  listed: boolean;
  subscribed?: boolean;
  specialUse?: string;
  specialUseFlag?: string;
}

export interface Message {
  client: Client;
  mailbox: string;
  '#': number;
  uid?: number;
  flags?: string[];
  envelope?: Envelope;
  body?: any;
}

export interface Envelope {
  client: Client;
  mailbox: string;
  date: string;
  subject: string;
  from: Identity[];
  to: Identity[];
}

export interface Identity {
  name: string;
  address: string;
}

export interface ClientConfiguration {
  name?: string;
  host: string;
  port?: number;
  user: string;
  pass: string;
  options?: any;
}

export class Client {
  name: string;
  configuration: ClientConfiguration;
  client: any;

  constructor(config: ClientConfiguration) {
    this.name = config.name ?? uuid();
    this.configuration = config;
    let { host, user, pass, options } = config;
    let auth = { user, pass };
    let port = config.port ?? 993;
    this.client = new imapClient(host, port, { ...options, auth });
  }

  async mailboxes(): Promise<Mailbox[]> {
    try {
      await this.client.connect();
      let mailboxes = await this.client
        .listMailboxes()
        .then((root: { children: Mailbox[] }) => root.children);
      this.client.close();
      return mailboxes;
    } catch (error) {
      return this.client.close().then(() => {
        Promise.reject(error);
      });
    }
  }

  async envelopes(
    mailbox: string = 'INBOX',
    sequence: string = '1:10',
    query: string[] = []
  ): Promise<Envelope[]> {
    try {
      await this.client.connect();
      let messages = await this.client.listMessages(
        mailbox,
        sequence,
        ['uid', 'flags', 'envelope'].concat(query)
      );
      this.client.close();
      return messages.map((m: Message) => {
        return { ...m.envelope, client: this, mailbox };
      });
    } catch (error) {
      return this.client.close().then(() => {
        return Promise.reject(error);
      });
    }
  }

  async messages(
    mailbox: string = 'INBOX',
    sequence: string = '1:10',
    query: string[] = []
  ): Promise<Message[]> {
    try {
      await this.client.connect();
      let messages = await this.client.listMessages(
        mailbox,
        sequence,
        ['uid', 'flags', 'envelope', 'body.peek[]'].concat(query)
      );
      this.client.close();
      return messages.map((m: any) => {
        m.body = ['body[]'];
        return { ...(m as Message), client: this, mailbox };
      });
    } catch (error) {
      return this.client.close().then(() => {
        return Promise.reject(error);
      });
    }
  }
}

export default Client;
