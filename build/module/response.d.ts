/// <reference types="node" />
import ResponseCode from './code';
/**
 * Status Response
 * > Status responses are OK, NO, BAD, PREAUTH and BYE.
 * @link https://tools.ietf.org/html/rfc3501#section-7.1
 */
export declare enum Status {
    OK = "OK",
    NO = "NO",
    BAD = "BAD",
    PREAUTH = "PREAUTH",
    BYE = "BYE"
}
/**
 * Server and Mailbox Status Response
 * @link https://tools.ietf.org/html/rfc3501#section-7.2
 */
export declare enum ServerStatus {
    /**
     * `CAPABILITY` Response
     * @link https://tools.ietf.org/html/rfc3501#section-7.2.1
     */
    CAPABILITY = "CAPABILITY",
    /**
     * `LIST` Response
     * @link https://tools.ietf.org/html/rfc3501#section-7.2.2
     */
    LIST = "LIST",
    LSUB = "LSUB",
    STATUS = "STATUS",
    SEARCH = "SEARCH",
    FLAGS = "FLAGS"
}
export declare type ServerStatusResponseData = {
    [key in ServerStatus]?: any;
};
/**
 * Mailbox Size Response
 * @link https://tools.ietf.org/html/rfc3501#section-7.3
 */
export declare enum MailboxSizeUpdate {
    EXISTS = "EXISTS",
    RECENT = "RECENT"
}
export declare type MailboxSizeUpdateResponseData = {
    [key in MailboxSizeUpdate]?: number;
};
/**
 * Message Status Response
 * @link https://tools.ietf.org/html/rfc3501#section-7.4
 */
export declare enum MessageStatus {
    EXPUNGE = "EXPUNGE",
    FETCH = "FETCH"
}
export interface MessageStatusResponseData {
    EXPUNGE?: number[];
    FETCH?: FetchResponseData;
}
/**
 * Message data map keyed by Sequence #
 */
export declare type FetchResponseData = Map<number, MessageData>;
/**
 * Message Data Items included a FETCH
 * @link https://tools.ietf.org/html/rfc3501#section-7.4.2
 */
export declare enum MessageDataItem {
    BODY = "BODY",
    BODYSTRUCTURE = "BODYSTRUCTURE",
    ENVELOPE = "ENVELOPE",
    FLAGS = "FLAGS",
    INTERNALDATE = "INTERNALDATE",
    RFC822 = "RFC822",
    HEADER = "RFC822.HEADER",
    SIZE = "RFC822.SIZE",
    TEXT = "RFC822.TEXT",
    UID = "UID"
}
export declare type MessageData = {
    [key in MessageDataItem]?: any;
};
export declare type Data = ServerStatusResponseData & MailboxSizeUpdateResponseData & MessageStatusResponseData;
/**
 * __An IMAP Server Response__
 *
 * Response parses a server response into a more accessible representation of its variable components.
 *
 * @link https://tools.ietf.org/html/rfc3501#section-2.2.2
 * @link https://tools.ietf.org/html/rfc3501#section-7
 */
export declare class Response {
    /**
     * Originating response buffer
     */
    buffer: Buffer;
    /**
     * Datetime Response object created; analgous to a "received" datetime
     */
    received: Date;
    /**
     * Server provided data
     * @link https://tools.ietf.org/html/rfc3501#section-2.2.2
     */
    data: Data;
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
    codes: ResponseCode[];
    constructor(buffer: Buffer);
    /**
     * Parse each line based on the first token.
     * @link https://tools.ietf.org/html/rfc3501#section-2.2.2
     */
    protected initialize(): void;
    protected parse(line: string): void;
    /**
     * Parse a Server and Mailbox Status response
     * @link https://tools.ietf.org/html/rfc3501#section-7.2
     */
    protected parseServerStatusResponse(state: ServerStatus, data: string): void;
    protected _lines?: string[];
    get lines(): string[];
    protected _string?: string;
    toString(): string;
}
export default Response;
/**
 * Split response data into lines.
 * @link https://tools.ietf.org/html/rfc3501#section-2.2
 */
export declare let linesFromResponse: (data: string) => string[];
/**
 * Break single string multi-line response into array of strings by `\r\n`.
 *
 * Ignore `\r\n` when part of a string literal symbol, `{0}\r\n` or the string literal data.
 * @link https://tools.ietf.org/html/rfc3501#section-2.2
 * @link https://tools.ietf.org/html/rfc3501#section-4.3
 */
export declare let linesFromResponseWithStringLiterals: (data: string) => string[];
export interface ParsedStatusResponse {
    codes: ResponseCode[];
    text?: string;
}
/**
 * Parse a general Status response
 * @link https://tools.ietf.org/html/rfc3501#section-7.1
 */
export declare let parseStatusResponse: (status: Status, data?: string | undefined) => ParsedStatusResponse;
export declare let extractMessageData: (data: string) => MessageData;
