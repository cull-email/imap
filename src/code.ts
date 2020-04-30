/**
 * Response Code
 * @link https://tools.ietf.org/html/rfc3501#section-7.1
 */
export enum ResponseCode {
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
 * Response Code and associated data
 * @link https://tools.ietf.org/html/rfc3501#section-7.1
 */
export class Code {
  code: ResponseCode;
  data?: any;

  constructor(code: string, text?: string) {
    if (!(code in ResponseCode)) {
      throw new Error(`${code} is not a valid response code.`);
    }
    this.code = code as ResponseCode;
    switch(code) {
      case ResponseCode.CAPABILITY:
        this.data = text?.split(` `);
        break;
      default:
        this.data = text;
        break;
    }
  }
}

export default Code;
