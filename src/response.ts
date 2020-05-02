import ResponseCode from './code';

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
export enum ServerState {
  CAPABILITY = 'CAPABILITY',
  LIST = 'LIST',
  LSUB = 'LSUB',
  STATUS = 'STATUS',
  SEARCH = 'SEARCH',
  FLAGS = 'FLAGS'
}

/**
 * Mailbox Size Response
 * @link https://tools.ietf.org/html/rfc3501#section-7.3
 */
export enum MailboxSize {
  EXISTS = 'EXISTS',
  RECENT = 'RECENT'
}
export interface MailboxSizeResponseData {
  size: number;
  response: MailboxSize;
}

/**
 * Message Status Response
 * @link https://tools.ietf.org/html/rfc3501#section-7.4
 */
export enum MessageState {
  EXPUNGE = 'EXPUNGE',
  FETCH = 'FETCH'
}

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
   * Original Buffer received from Socket
   */
  buffer: Buffer;
  /**
   * Date object tracking object instantiation -- synonymous to "received" datetime
   */
  received: Date = new Date();
  /**
   * Server provided data
   * @link https://tools.ietf.org/html/rfc3501#section-2.2.2
   */
  data = {};
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
    let lines = this.toString('ascii')
      .split('\r\n')
      .filter(l => l !== '');
    lines.forEach((line, _) => {
      let [token, data] = bisect(line);
      if (token === '+') {
        this.continuation = true;
        this.text = data;
        return;
      }
      this.tag = token !== '*' ? token : undefined;
      this.parseResponse(data);
    });
  }

  parseResponse(data: string): void {
    let [atom, remainder] = bisect(data);
    if (!atom) {
      return;
    }
    switch (true) {
      case !isNaN(parseInt(atom, 10)) && remainder in MailboxSize:
        this.parseMailboxSizeResponse(atom, remainder);
        break;
      case atom in Status:
        this.parseStatusResponse(atom, remainder);
        break;
      case atom in ServerState:
        this.parseServerStateResponse(atom, remainder);
        break;
      default:
        throw new Error(`Unprocessed response: ${data}`);
    }
  }

  parseServerStateResponse(key: string, data: string): void {
    switch (key) {
      /**
       * CAPABILITY Response
       * @link https://tools.ietf.org/html/rfc3501#section-7.2.1
       */
      case ServerState.CAPABILITY:
        this.data[key] = data.split(` `);
        break;
      /**
       * `LIST` Response
       * @link https://tools.ietf.org/html/rfc3501#section-7.2.2
       */
      case ServerState.LIST:
        let m = data.match(/^\((.+)\)\s(\S+)\s(.+)$/);
        if (m) {
          if (this.data[key] === undefined) {
            this.data[key] = [];
          }
          let path = unquote(m[3]);
          let delimiter = unquote(m[2]);
          let name = path.split(delimiter).pop();
          let attributes = m[1].split(` `);
          this.data[ServerState.LIST].push({ name, path, delimiter, attributes });
        }
        break;
      default:
        throw new Error(`Unprocessed Server State Response: ${key} ${data}`);
    }
  }

  parseStatusResponse(atom: string, data?: string): void {
    let status = atom as Status;
    this.status = status;
    if (data) {
      let m = data.match(/^[\[](.+)[\]]\s{1}(.*)$/);
      if (m) {
        let [a, b] = bisect(m[1]);
        let code = a
          ? new ResponseCode(status, a, b, m[2])
          : new ResponseCode(status, m[1], undefined, m[2]);
        this.codes.push(code);
      } else {
        this.text = data;
      }
    }
  }

  parseMailboxSizeResponse(atom: string, data: string): void {
    this.data[data as MailboxSize] = parseInt(atom, 10);
  }

  toString(encoding?: string): string {
    return this.buffer.toString(encoding);
  }
}

export default Response;

export let bisect = (input: string): [undefined | string, string] => {
  let matches = input.match(/^(\S*)\s(.*)$/);
  return !matches ? [undefined, input] : [matches[1], matches[2]];
};

export let unquote = (input: string): string => {
  return input.replace(/^"(.*)"$/, '$1');
};
