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
export enum MailboxSizeUpdate {
  EXISTS = 'EXISTS',
  RECENT = 'RECENT'
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
      this.parseResponse(data);
    });
  }

  parseResponse(data: string): void {
    let [atom, remainder] = bisect(data);
    if (!atom) {
      return;
    }
    switch (true) {
      case !isNaN(parseInt(atom, 10)) && remainder in MailboxSizeUpdate:
        this.parseMailboxSizeResponse(remainder as MailboxSizeUpdate, atom);
        break;
      case atom in Status:
        this.parseStatusResponse(atom as Status, remainder);
        break;
      case atom in ServerState:
        this.parseServerStateResponse(atom as ServerState, remainder);
        break;
      default:
        throw new Error(`Unprocessed response: ${data}`);
    }
  }

  /**
   * Parse a general Status response
   * @link https://tools.ietf.org/html/rfc3501#section-7.1
   */
  parseStatusResponse(status: Status, data?: string): void {
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

  /**
   * Parse a Server and Mailbox Status response
   * @link https://tools.ietf.org/html/rfc3501#section-7.2
   */
  parseServerStateResponse(state: ServerState, data: string): void {
    switch (state) {
      /**
       * `CAPABILITY` Response
       * @link https://tools.ietf.org/html/rfc3501#section-7.2.1
       */
      case ServerState.CAPABILITY:
        this.data[state] = data.split(` `);
        break;
      /**
       * `LIST` Response
       * @link https://tools.ietf.org/html/rfc3501#section-7.2.2
       */
      case ServerState.LIST:
        let m = data.match(/^\((.*)\)\s(\S+)\s(.+)$/);
        if (m) {
          if (this.data[state] === undefined) {
            this.data[state] = [];
          }
          let path = unquote(m[3]);
          let delimiter = unquote(m[2]);
          let name = path.split(delimiter).pop();
          let attributes = m[1].split(` `).filter(a => a !== '');
          this.data[ServerState.LIST].push({ name, path, delimiter, attributes });
        }
        break;
      default:
        throw new Error(`Unprocessed Server State Response: ${state} ${data}`);
    }
  }

  /**
   * Parse a Mailbox Size response
   * @link https://tools.ietf.org/html/rfc3501#section-7.3
   */
  parseMailboxSizeResponse(key: MailboxSizeUpdate, size: string): void {
    this.data[key] = parseInt(size, 10);
  }

  protected _lines?: string[];
  get lines(): string[] {
    if (this._lines === undefined) {
      this._lines = this.toString().split(`\r\n`).filter(line => line !== '');
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

export let bisect = (input: string): [undefined | string, string] => {
  let matches = input.match(/^(\S*)\s(.*)$/);
  return !matches ? [undefined, input] : [matches[1], matches[2]];
};

export let unquote = (input: string): string => {
  return input.replace(/^"(.*)"$/, '$1');
};
