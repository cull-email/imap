import { Status } from './response';
/**
 * Response Code
 * @link https://tools.ietf.org/html/rfc3501#section-7.1
 */
export declare enum Code {
    ALERT = "ALERT",
    BADCHARSET = "BADCHARSET",
    CAPABILITY = "CAPABILITY",
    PARSE = "PARSE",
    PERMANENTFLAGS = "PERMANENTFLAGS",
    READONLY = "READ-ONLY",
    READWRITE = "READ-WRITE",
    TRYCREATE = "TRYCREATE",
    UIDNEXT = "UIDNEXT",
    UIDVALIDITY = "UIDVALIDITY",
    UNSEEN = "UNSEEN"
}
/**
 * Response Code and associated data
 * @link https://tools.ietf.org/html/rfc3501#section-7.1
 */
export declare class ResponseCode {
    status: Status;
    code: string;
    data?: any;
    text?: string;
    constructor(status: Status, code: string, data?: string, text?: string);
}
export default ResponseCode;
