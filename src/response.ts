/**
 * Response Status
 * > Status responses are OK, NO, BAD, PREAUTH and BYE.
 * @link https://tools.ietf.org/html/rfc3501#section-7.1
 */
export enum Status {
  OK      = 'OK',
  NO      = 'NO',
  BAD     = 'BAD',
  PREAUTH = 'PREAUTH',
  BYE     = 'BYE',
}

/**
 * Response Code
 * > Status responses MAY include an OPTIONAL "response code".
 * @link https://tools.ietf.org/html/rfc3501#section-7.1
 */
export enum Code {
  ALERT          = 'ALERT',
  BADCHARSET     = 'BADCHARSET',
  CAPABILITY     = 'CAPABILITY',
  PARSE          = 'PARSE',
  PERMANENTFLAGS = 'PERMANENTFLAGS',
  READONLY       = 'READ-ONLY',
  READWRITE      = 'READ-WRITE',
  TRYCREATE      = 'TRYCREATE',
  UIDNEXT        = 'UIDNEXT',
  UIDVALIDITY    = 'UIDVALIDITY',
  UNSEEN         = 'UNSEEN',
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
  date: Date = new Date();
  /**
   * Server provided data
   * @link https://tools.ietf.org/html/rfc3501#section-2.2.2
   */
  data?: Response[];
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
   * Server response code
   * @link https://tools.ietf.org/html/rfc3501#section-7.1
   */
  code?: Code;

  constructor(buffer: Buffer) {
    this.buffer = buffer;
    let lines = buffer.toString().split('\r\n').filter(l => l !== '');
    lines.forEach((line, _) => {
      let [token, r1] = splitLine(line);
      switch(true) {
        case token === '+':
          this.continuation = true;
          this.text = r1;
          break;
        case token === '*' && lines.length > 1:
          let response = new Response(Buffer.from(line));
          this.data = this.data ? this.data.concat(response) : [response];
          break;
        default:
          if (token !== '*') {
            this.tag = token;
          }
          let [status, r2] = splitLine(r1);
          this.status = status as Status;
          let [code, r3] = getCode(r2);
          if (r3 !== '') {
            this.code = code as Code;
            this.text = r3;
          } else {
            this.text = r2;
          }
          break;
      }
    });
  }
}

export default Response;

export let splitLine = (line: string): string[] => {
  let m = line.match(/^(\S*)\s(.*)$/);
  if (!m) {
    return [line, ''];
  }
  return [m[1], m[2]];
}

export let getCode = (line: string) : string[] => {
  let m = line.match(/^[\[](\S+)[\]]\s{1}(.*)$/);
  if (!m) {
    return [line, ''];
  }
  return [m[1], m[2]];
}
