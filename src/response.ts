import ResponseCode from './code';
import Envelope from './envelope';
import Patterns, { bisect, unquote, deliteralize } from './patterns';

/**
 * Status Response
 * > Status responses are OK, NO, BAD, PREAUTH and BYE.
 * @link https://tools.ietf.org/html/rfc3501#section-7.1
 */
export enum Status {
  OK = 'OK',
  NO = 'NO',
  BAD = 'BAD',
  PREAUTH = 'PREAUTH',
  BYE = 'BYE'
}

/**
 * Server and Mailbox Status Response
 * @link https://tools.ietf.org/html/rfc3501#section-7.2
 */
export enum ServerStatus {
  CAPABILITY = 'CAPABILITY',
  LIST = 'LIST',
  LSUB = 'LSUB',
  STATUS = 'STATUS',
  SEARCH = 'SEARCH',
  FLAGS = 'FLAGS'
}
export type ServerStatusResponseData = { [key in ServerStatus]?: any };

/**
 * Mailbox Size Response
 * @link https://tools.ietf.org/html/rfc3501#section-7.3
 */
export enum MailboxSizeUpdate {
  EXISTS = 'EXISTS',
  RECENT = 'RECENT'
}
export type MailboxSizeUpdateResponseData = { [key in MailboxSizeUpdate]?: number };

/**
 * Message Status Response
 * @link https://tools.ietf.org/html/rfc3501#section-7.4
 */
export enum MessageStatus {
  EXPUNGE = 'EXPUNGE',
  FETCH = 'FETCH'
}
export interface MessageStatusResponseData {
  EXPUNGE?: number[];
  FETCH?: FetchResponseData;
};
/**
 * Message data map keyed by Sequence #
 */
export type FetchResponseData = Map<number, MessageData>;

/**
 * Message Data Items included a FETCH
 * @link https://tools.ietf.org/html/rfc3501#section-7.4.2
 */
export enum MessageDataItem {
  BODY = 'BODY',
  BODYSTRUCTURE = 'BODYSTRUCTURE',
  ENVELOPE = 'ENVELOPE',
  FLAGS = 'FLAGS',
  INTERNALDATE = 'INTERNALDATE',
  RFC822 = 'RFC822',
  HEADER = 'RFC822.HEADER',
  SIZE = 'RFC822.SIZE',
  TEXT = 'RFC822.TEXT',
  UID = 'UID'
}
export type MessageData = {
  [key in MessageDataItem]?: any;
}

export type Data = ServerStatusResponseData & MailboxSizeUpdateResponseData & MessageStatusResponseData;

/**
 * __An IMAP Server Response__
 *
 * Response parses a server response into a more accessible representation of its variable components.
 *
 * @link https://tools.ietf.org/html/rfc3501#section-2.2.2
 * @link https://tools.ietf.org/html/rfc3501#section-7
 */
export class Response {
  /**
   * Originating response buffer
   */
  buffer: Buffer;

  /**
   * Datetime Response object created; analgous to a "received" datetime
   */
  received: Date = new Date();
  /**
   * Server provided data
   * @link https://tools.ietf.org/html/rfc3501#section-2.2.2
   */
  data: Data = {};
  /**
   * Server provided human-readable text
   * @link https://tools.ietf.org/html/rfc3501#section-7
   */
  text?: string;
  /**
   * Server continuation request
   * @link https://tools.ietf.org/html/rfc3501#section-7.5
   */
  continuation?: boolean;
  /**
   * Server response tag
   * @link https://tools.ietf.org/html/rfc3501#section-7
   */
  tag?: string;
  /**
   * Server response status
   * @link https://tools.ietf.org/html/rfc3501#section-7.1
   */
  status?: Status;
  /**
   * Server response codes
   * @link https://tools.ietf.org/html/rfc3501#section-7.1
   */
  codes: ResponseCode[] = [];

  constructor(buffer: Buffer) {
    this.buffer = buffer;
    this.lines.forEach((line, _) => {
      let [token, data] = bisect(line);
      if (!token) {
        return;
      }
      if (token === '+') {
        this.continuation = true;
        this.text = data;
        return;
      }
      this.tag = token !== '*' ? token : undefined;
      try {
        this.parseLine(data);
      } catch (error) {
        throw error;
      }
    });
  }

  protected parseLine(data: string): void {
    let [head, tail] = bisect(data);
    if (!head) return;
    let i = parseInt(head, 10);
    let numeric = !isNaN(i);
    let [headOfTail, tailOfTail] = bisect(tail);
    let numericKey = headOfTail ?? tail;
    switch (true) {
      case numeric && numericKey in MailboxSizeUpdate:
        this.parseMailboxSizeResponse(numericKey as MailboxSizeUpdate, i);
        break;
      case numeric && numericKey in MessageStatus:
        this.parseMessageStatusResponse(numericKey as MessageStatus, i, tailOfTail);
        break;
      case head in Status:
        this.status = head as Status;
        let parsed = parseStatusResponse(this.status, tail);
        this.codes = this.codes.concat(parsed.codes);
        this.text = parsed.text;
        break;
      case head in ServerStatus:
        this.parseServerStatusResponse(head as ServerStatus, tail);
        break;
      default:
        throw new Error(`Unprocessed response: ${data}`);
    }
  }

  /**
   * Parse a Server and Mailbox Status response
   * @link https://tools.ietf.org/html/rfc3501#section-7.2
   */
  protected parseServerStatusResponse(state: ServerStatus, data: string): void {
    switch (state) {
      /**
       * `CAPABILITY` Response
       * @link https://tools.ietf.org/html/rfc3501#section-7.2.1
       */
      case ServerStatus.CAPABILITY:
        this.data[state] = data.split(` `);
        break;
      /**
       * `LIST` Response
       * @link https://tools.ietf.org/html/rfc3501#section-7.2.2
       */
      case ServerStatus.LIST:
        let m = data.match(/^\((.*)\)\s(\S+)\s(.+)$/);
        if (m) {
          if (this.data[state] === undefined) {
            this.data[state] = [];
          }
          let name = unquote(m[3]);
          let delimiter = unquote(m[2]);
          let attributes = m[1].split(` `).filter(a => a !== '');
          this.data[ServerStatus.LIST].push({ name, delimiter, attributes });
        }
        break;
      case ServerStatus.FLAGS:
        if (this.data[state] === undefined) {
          this.data[state] = [];
        }
        let m2 = data.match(/^\((.*)\)$/);
        this.data[ServerStatus.FLAGS] = m2 ? m2[1].split(` `) : [data];
        break;
      default:
        throw new Error(`Unprocessed Server State Response: ${state} ${data}`);
    }
  }

  /**
   * Parse a Mailbox Size response
   * @link https://tools.ietf.org/html/rfc3501#section-7.3
   */
  protected parseMailboxSizeResponse(key: MailboxSizeUpdate, size: number): void {
    this.data[key] = size;
  }

  /**
   * Parse a Message Status response.
   * @link https://tools.ietf.org/html/rfc3501#section-7.4
   */
  protected parseMessageStatusResponse(key: MessageStatus, sequence: number, data?: string): void {
    switch(key) {
      case MessageStatus.EXPUNGE:
        if (this.data[key] === undefined) {
          this.data[key] = [];
        }
        this.data[key]?.push(sequence);
        break;
      case MessageStatus.FETCH:
        this.parseFetchResponse(sequence, data);
        break;
      default:
        throw new Error(`Unprocessed Message Status Response: ${key} ${sequence} ${data}`);
    }
  }

  /**
   * Parse a FETCH response.
   * @link https://tools.ietf.org/html/rfc3501#section-7.4.2
   */
  protected parseFetchResponse(sequence: number, data?: string): void {
    if (!data) return;
    if (this.data[MessageStatus.FETCH] === undefined) {
      this.data[MessageStatus.FETCH] = new Map() as Map<number, {}>;
    }
    let deliteral = deliteralize(data);
    // extract [item, ...] from string `(item (...))`
    let m1 = deliteral.match(/^\((\S+)\s\((.*)\)\)$/s);
    if (m1) {
      let message = this.data[MessageStatus.FETCH]?.get(sequence) ?? {};
      let item = m1[1].toUpperCase();
      // BODY or BODY[...]
      if (item.length > 4 && item.indexOf(MessageDataItem.BODY) === 0) {
        item = MessageDataItem.BODY;
      }
      if (!(item in MessageDataItem)) {
        throw new Error(`Unsupported Message Data Item: ${item}.`);
      }
      switch (item) {
        case MessageDataItem.ENVELOPE:
          message[item] = Envelope.from(m1[2]);
          break;
        case MessageDataItem.BODY:
          let m2 = item.match(/^BODY\[(.+)\](\<(.*)\>)?$/s);
          if (m2) {
            let section = m2[1];
            let octet = m2[3];
            message[item] = { section, octet, data };
          } else {
            message[item] = { data };
          }
          break;
        default:
          message[item] = { data };
          break;
      }
      this.data[MessageStatus.FETCH]?.set(sequence, message);
    }
  }

  protected _lines?: string[];
  get lines(): string[] {
    if (this._lines === undefined) {
      let lines = linesFromResponse(this.toString());
      this._lines = lines.filter(line => line !== '');
    }
    return this._lines ?? [];
  }

  protected _string?: string;
  toString(): string {
    if (this._string === undefined) {
      this._string = this.buffer.toString('ascii');
    }
    return this._string ?? '';
  }
}

export default Response;

/**
 * Split response data into lines.
 * @link https://tools.ietf.org/html/rfc3501#section-2.2
 */
export let linesFromResponse = (data: string): string[] => {
  let containsLiterals = data.match(Patterns.stringLiteralPrefix);
  return containsLiterals === null
    ? data.split(`\r\n`)
    : linesFromResponseWithStringLiterals(data);
}

/**
 * Break single string multi-line response into array of strings by `\r\n`.
 *
 * Ignore `\r\n` when part of a string literal symbol, `{0}\r\n` or the string literal data.
 * @link https://tools.ietf.org/html/rfc3501#section-2.2
 * @link https://tools.ietf.org/html/rfc3501#section-4.3
 */
export let linesFromResponseWithStringLiterals = (data: string): string[] => {
  let lines: string[] = [];
  let buffer = '';
  let literal = false;
  let octet = {
    target: 0,
    index: 0
  };
  let pattern = new RegExp(`${Patterns.stringLiteralPrefix.source}$`);
  [...data].forEach(current => {
    let previous = buffer[buffer.length - 1];
    buffer += current;
    if (literal) octet.index++;
    if (current === `\n` && previous === `\r` && !literal) {
      let match = buffer.match(pattern);
      if (match && match.groups !== undefined && match.groups.octets !== undefined) {
        literal = true;
        let target = parseInt(match.groups.octets, 10);
        if (target) {
          octet = { target, index: 0 };
        }
      } else {
        lines.push(buffer.slice(0, -2));
        buffer = '';
      }
    }
    literal = literal && octet.index !== octet.target;
  });
  if (buffer !== '') lines.push(buffer);
  return lines;
}

export interface ParsedStatusResponse { codes: ResponseCode[], text?: string };
/**
 * Parse a general Status response
 * @link https://tools.ietf.org/html/rfc3501#section-7.1
 */
export let parseStatusResponse = (status: Status, data?: string): ParsedStatusResponse => {
  let result: ParsedStatusResponse = {
    codes: [],
  };
  if (data) {
    let m = data.match(/^[\[](.+)[\]]\s{1}(.*)$/);
    if (m) {
      let [a, b] = bisect(m[1]);
      let code = a
        ? new ResponseCode(status, a, b, m[2])
        : new ResponseCode(status, m[1], undefined, m[2]);
      result.codes.push(code);
    } else {
      result.text = data;
    }
  }
  return result;
}
