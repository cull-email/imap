import Code from './code';

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
    let lines = this.toString().split('\r\n').filter(l => l !== '');
    lines.forEach((line, _) => {
      let [token, r1] = bisect(line);
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
          let [status, r2] = bisect(r1);
          this.status = status as Status;
          let [responseCode, r3] = bisect(r2, true);
          if (responseCode !== undefined) {
            let [code, text] = bisect(responseCode);
            if (code !== undefined) {
              this.code = new Code(code, text);
            } else {
              this.code = new Code(responseCode);
            }
            this.text = r3;
          } else {
            this.text = r2;
          }
          break;
      }
    });
  }

  toString(encoding?: string): string {
    return this.buffer.toString(encoding);
  }
}

export default Response;

export let bisect = (input: string, code: boolean = false): [undefined|string,string] => {
  let matches = code ?
    input.match(/^[\[](.+)[\]]\s{1}(.*)$/) :
    input.match(/^(\S*)\s(.*)$/);
  return !matches ? [undefined, input] : [matches[1], matches[2]];
}
