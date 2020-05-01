import { Status } from './response';

/**
 * Response Code
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
 * Response Code and associated data
 * @link https://tools.ietf.org/html/rfc3501#section-7.1
 */
export class ResponseCode {
  status: Status;
  code: Code;
  data?: any;
  text?: string;

  constructor(status: Status, code: string, data?: string, text?: string) {
    if (!(code in Code)) {
      throw new Error(`${code} is not a valid response code.`);
    }
    this.status = status;
    this.code = code as Code;
    this.text = text;
    switch(code) {
      case Code.CAPABILITY:
        this.data = data?.split(` `);
        break;
      default:
        this.data = data;
        break;
    }
  }
}

export default ResponseCode;
