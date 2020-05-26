import ResponseCode from './code';
import Patterns, {
  bisect,
  unquote,
  unescape,
  deliteralize,
  deparenthesize
} from './patterns';
import Header from './header';
import Envelope from './envelope';

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
  /**
   * `CAPABILITY` Response
   * @link https://tools.ietf.org/html/rfc3501#section-7.2.1
   */
  CAPABILITY = 'CAPABILITY',
  /**
   * `LIST` Response
   * @link https://tools.ietf.org/html/rfc3501#section-7.2.2
   */
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
    this.initialize();
  }

  /**
   * Parse each line based on the first token.
   * @link https://tools.ietf.org/html/rfc3501#section-2.2.2
   */
  protected initialize(): void {
    this.lines.forEach(line => {
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
        this.parse(data);
      } catch (error) {
        throw error;
      }
    });
  }

  protected parse(line: string): void {
    let [token, data] = bisect(line);
    if (!token) return;
    let n = parseInt(token, 10);
    let numeric = !isNaN(n);
    if (numeric) {
      let [head, tail] = bisect(data);
      token = head ?? data;
      data = tail ?? data;
    }
    switch (true) {
      case token in MailboxSizeUpdate:
        this.data[token] = n;
        break;
      case token === MessageStatus.EXPUNGE:
        if (this.data[token] === undefined) {
          this.data[token] = [];
        }
        this.data[token]?.push(n);
        break;
      case token === MessageStatus.FETCH:
        if (this.data[token] === undefined) {
          this.data[token] = new Map() as Map<number, {}>;
        }
        let message = parseFetchResponse(data);
        if (message !== undefined) {
          this.data[token]?.set(n, message);
        }
        break;
      case token in Status:
        let status = token as Status;
        let parsed = parseStatusResponse(status, data);
        this.status = status;
        this.codes = this.codes.concat(parsed.codes);
        this.text = parsed.text;
        break;
      case token in ServerStatus:
        this.parseServerStatusResponse(token as ServerStatus, data);
        break;
      default:
        throw new Error(`Unprocessed response: ${line}`);
    }
  }

  /**
   * Parse a Server and Mailbox Status response
   * @link https://tools.ietf.org/html/rfc3501#section-7.2
   */
  protected parseServerStatusResponse(state: ServerStatus, data: string): void {
    switch (state) {
      case ServerStatus.CAPABILITY:
        this.data[state] = data.split(` `);
        break;
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
  if (buffer !== '') throw new Error(`Invalid/incomplete buffer (not terminated with CRLF?): ${buffer}`);
  return lines.map(deliteralize);
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
    let match = data.match(/^[\[](.+)[\]]\s{1}(.*)$/);
    if (match) {
      let [a, b] = bisect(match[1]);
      let code = a
        ? new ResponseCode(status, a, b, match[2])
        : new ResponseCode(status, match[1], undefined, match[2]);
      result.codes.push(code);
    } else {
      result.text = data;
    }
  }
  return result;
}

/**
 * Parse a FETCH response.
 * @link https://tools.ietf.org/html/rfc3501#section-7.4.2
 */
let parseFetchResponse = (response?: string): MessageData => {
  let data: MessageData = {};
  if (response !== undefined) {
    let extracted = extractMessageData(response);
    let keys = Object.keys(extracted);
    keys.forEach(key => {
      let item = key.toUpperCase();
      let value = extracted[key];
      if (item.indexOf(MessageDataItem.BODY) === 0) {
        item = MessageDataItem.BODY;
      }
      if (!(item in MessageDataItem)) {
        throw new Error(`Unknown message data item: ${key}`);
      }
      switch(item) {
        case MessageDataItem.ENVELOPE:
          data[item] = Envelope.from(deparenthesize(value));
          break;
        case MessageDataItem.FLAGS:
          data[item] = deparenthesize(value).split(`\s`).filter(flag => flag !== '');
          break;
        case MessageDataItem.INTERNALDATE:
          data[item] = unquote(value);
          break;
        case MessageDataItem.HEADER:
          data[item] = new Header(value);
          break;
        case MessageDataItem.BODY:
          value = unescape(unquote(value));
          if (data[item] === undefined) {
            data[item] = {};
          }
          let template = /^(BODY|BODY\.PEEK)\[(?<section>.+)\](\<(?<partial>.*)\>)?$/;
          let match = key.toUpperCase().match(template);
          if (match !== null && match.groups !== undefined) {
            if (match.groups?.section === 'HEADER') {
              value = new Header(value);
            }
            data[item][match.groups?.section] = value;
          } else {
            data[item] = value;
          }
          break;
        default:
          data[item] = value;
          break;
      }
    })
  }
  return data;
}

export let extractMessageData = (data: string): MessageData => {
  let result: MessageData = {};
  let buffer = '';
  let item;
  let start;
  let skip = 0;
  [...deparenthesize(data)].forEach((current) => {
    let previous = buffer[buffer.length - 1];
    buffer += current;
    switch(true) {
      case item === undefined:
        switch(true) {
          case current === ` ` && buffer === ` `:
            buffer = '';
            break;
          case current === ` `:
            item = buffer.slice(0, -1);
            start = undefined;
            buffer = '';
            skip = 0;
            break;
        }
        break;
      case start === undefined:
        start = current;
        break;
      // Parentheses
      case start === '(':
        switch(true) {
          case current === '(':
            skip++;
            break;
          case current === ')' && skip > 0:
            skip--;
            break;
          case current === ')' && skip === 0:
            result[item] = buffer;
            item = undefined;
            start = undefined;
            buffer = '';
          break;
        }
        break;
      // Quotes
      case start === '"':
        if (current === '"' && previous !== `\\`) {
          result[item] = buffer;
          item = undefined;
          start = undefined;
          buffer = '';
        }
        break;
      // Unquoted, non-whitespace string
      case current === `\s`:
        result[item] = buffer;
        start = undefined;
        buffer = '';
        break;
    }
  });
  if (buffer !== '') throw new Error(`Invalid/incomplete buffer: ${buffer}`);
  return result;
}
