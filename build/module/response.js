import ResponseCode from './code';
import Patterns, { bisect, unquote, unescape, deliteralize, deparenthesize } from './patterns';
import Header from './header';
import Envelope from './envelope';
/**
 * Status Response
 * > Status responses are OK, NO, BAD, PREAUTH and BYE.
 * @link https://tools.ietf.org/html/rfc3501#section-7.1
 */
export var Status;
(function (Status) {
    Status["OK"] = "OK";
    Status["NO"] = "NO";
    Status["BAD"] = "BAD";
    Status["PREAUTH"] = "PREAUTH";
    Status["BYE"] = "BYE";
})(Status || (Status = {}));
/**
 * Server and Mailbox Status Response
 * @link https://tools.ietf.org/html/rfc3501#section-7.2
 */
export var ServerStatus;
(function (ServerStatus) {
    /**
     * `CAPABILITY` Response
     * @link https://tools.ietf.org/html/rfc3501#section-7.2.1
     */
    ServerStatus["CAPABILITY"] = "CAPABILITY";
    /**
     * `LIST` Response
     * @link https://tools.ietf.org/html/rfc3501#section-7.2.2
     */
    ServerStatus["LIST"] = "LIST";
    ServerStatus["LSUB"] = "LSUB";
    ServerStatus["STATUS"] = "STATUS";
    ServerStatus["SEARCH"] = "SEARCH";
    ServerStatus["FLAGS"] = "FLAGS";
})(ServerStatus || (ServerStatus = {}));
/**
 * Mailbox Size Response
 * @link https://tools.ietf.org/html/rfc3501#section-7.3
 */
export var MailboxSizeUpdate;
(function (MailboxSizeUpdate) {
    MailboxSizeUpdate["EXISTS"] = "EXISTS";
    MailboxSizeUpdate["RECENT"] = "RECENT";
})(MailboxSizeUpdate || (MailboxSizeUpdate = {}));
/**
 * Message Status Response
 * @link https://tools.ietf.org/html/rfc3501#section-7.4
 */
export var MessageStatus;
(function (MessageStatus) {
    MessageStatus["EXPUNGE"] = "EXPUNGE";
    MessageStatus["FETCH"] = "FETCH";
})(MessageStatus || (MessageStatus = {}));
/**
 * Message Data Items included a FETCH
 * @link https://tools.ietf.org/html/rfc3501#section-7.4.2
 */
export var MessageDataItem;
(function (MessageDataItem) {
    MessageDataItem["BODY"] = "BODY";
    MessageDataItem["BODYSTRUCTURE"] = "BODYSTRUCTURE";
    MessageDataItem["ENVELOPE"] = "ENVELOPE";
    MessageDataItem["FLAGS"] = "FLAGS";
    MessageDataItem["INTERNALDATE"] = "INTERNALDATE";
    MessageDataItem["RFC822"] = "RFC822";
    MessageDataItem["HEADER"] = "RFC822.HEADER";
    MessageDataItem["SIZE"] = "RFC822.SIZE";
    MessageDataItem["TEXT"] = "RFC822.TEXT";
    MessageDataItem["UID"] = "UID";
})(MessageDataItem || (MessageDataItem = {}));
/**
 * __An IMAP Server Response__
 *
 * Response parses a server response into a more accessible representation of its variable components.
 *
 * @link https://tools.ietf.org/html/rfc3501#section-2.2.2
 * @link https://tools.ietf.org/html/rfc3501#section-7
 */
export class Response {
    constructor(buffer) {
        /**
         * Datetime Response object created; analgous to a "received" datetime
         */
        this.received = new Date();
        /**
         * Server provided data
         * @link https://tools.ietf.org/html/rfc3501#section-2.2.2
         */
        this.data = {};
        /**
         * Server response codes
         * @link https://tools.ietf.org/html/rfc3501#section-7.1
         */
        this.codes = [];
        this.buffer = buffer;
        this.initialize();
    }
    /**
     * Parse each line based on the first token.
     * @link https://tools.ietf.org/html/rfc3501#section-2.2.2
     */
    initialize() {
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
            }
            catch (error) {
                throw error;
            }
        });
    }
    parse(line) {
        var _a, _b;
        let [token, data] = bisect(line);
        if (!token)
            return;
        let n = parseInt(token, 10);
        let numeric = !isNaN(n);
        if (numeric) {
            let [head, tail] = bisect(data);
            token = head !== null && head !== void 0 ? head : data;
            data = tail !== null && tail !== void 0 ? tail : data;
        }
        switch (true) {
            case token in MailboxSizeUpdate:
                this.data[token] = n;
                break;
            case token === MessageStatus.EXPUNGE:
                if (this.data[token] === undefined) {
                    this.data[token] = [];
                }
                (_a = this.data[token]) === null || _a === void 0 ? void 0 : _a.push(n);
                break;
            case token === MessageStatus.FETCH:
                if (this.data[token] === undefined) {
                    this.data[token] = new Map();
                }
                let message = parseFetchResponse(data);
                if (message !== undefined) {
                    (_b = this.data[token]) === null || _b === void 0 ? void 0 : _b.set(n, message);
                }
                break;
            case token in Status:
                let status = token;
                let parsed = parseStatusResponse(status, data);
                this.status = status;
                this.codes = this.codes.concat(parsed.codes);
                this.text = parsed.text;
                break;
            case token in ServerStatus:
                this.parseServerStatusResponse(token, data);
                break;
            default:
                throw new Error(`Unprocessed response: ${line}`);
        }
    }
    /**
     * Parse a Server and Mailbox Status response
     * @link https://tools.ietf.org/html/rfc3501#section-7.2
     */
    parseServerStatusResponse(state, data) {
        switch (state) {
            case ServerStatus.CAPABILITY:
                this.data[state] = data.split(' ');
                break;
            case ServerStatus.LIST:
                let m = data.match(/^\((.*)\)\s(\S+)\s(.+)$/);
                if (m) {
                    if (this.data[state] === undefined) {
                        this.data[state] = [];
                    }
                    let name = unquote(m[3]);
                    let delimiter = unquote(m[2]);
                    let attributes = m[1].split(' ').filter(a => a !== '');
                    this.data[ServerStatus.LIST].push({ name, delimiter, attributes });
                }
                break;
            case ServerStatus.FLAGS:
                if (this.data[state] === undefined) {
                    this.data[state] = [];
                }
                let m2 = data.match(/^\((.*)\)$/);
                this.data[ServerStatus.FLAGS] = m2 ? m2[1].split(' ') : [data];
                break;
            default:
                throw new Error(`Unprocessed Server State Response: ${state} ${data}`);
        }
    }
    get lines() {
        var _a;
        if (this._lines === undefined) {
            let lines = linesFromResponse(this.toString());
            this._lines = lines.filter(line => line !== '');
        }
        return (_a = this._lines) !== null && _a !== void 0 ? _a : [];
    }
    toString() {
        var _a;
        if (this._string === undefined) {
            this._string = this.buffer.toString('ascii');
        }
        return (_a = this._string) !== null && _a !== void 0 ? _a : '';
    }
}
export default Response;
/**
 * Split response data into lines.
 * @link https://tools.ietf.org/html/rfc3501#section-2.2
 */
export let linesFromResponse = (data) => {
    let containsLiterals = data.match(Patterns.stringLiteralPrefix);
    return containsLiterals === null ? data.split(`\r\n`) : linesFromResponseWithStringLiterals(data);
};
/**
 * Break single string multi-line response into array of strings by `\r\n`.
 *
 * Ignore `\r\n` when part of a string literal symbol, `{0}\r\n` or the string literal data.
 * @link https://tools.ietf.org/html/rfc3501#section-2.2
 * @link https://tools.ietf.org/html/rfc3501#section-4.3
 */
export let linesFromResponseWithStringLiterals = (data) => {
    let lines = [];
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
        if (literal)
            octet.index++;
        if (current === `\n` && previous === `\r` && !literal) {
            let match = buffer.match(pattern);
            if (match && match.groups !== undefined && match.groups.octets !== undefined) {
                literal = true;
                let target = parseInt(match.groups.octets, 10);
                if (target) {
                    octet = { target, index: 0 };
                }
            }
            else {
                lines.push(buffer.slice(0, -2));
                buffer = '';
            }
        }
        literal = literal && octet.index !== octet.target;
    });
    if (buffer !== '')
        throw new Error(`Invalid/incomplete buffer (not terminated with CRLF?): ${buffer}`);
    return lines.map(deliteralize);
};
/**
 * Parse a general Status response
 * @link https://tools.ietf.org/html/rfc3501#section-7.1
 */
export let parseStatusResponse = (status, data) => {
    let result = {
        codes: []
    };
    if (data) {
        let match = data.match(/^[\[](.+)[\]]\s{1}(.*)$/);
        if (match) {
            let [a, b] = bisect(match[1]);
            let code = a
                ? new ResponseCode(status, a, b, match[2])
                : new ResponseCode(status, match[1], undefined, match[2]);
            result.codes.push(code);
        }
        else {
            result.text = data;
        }
    }
    return result;
};
/**
 * Parse a FETCH response.
 * @link https://tools.ietf.org/html/rfc3501#section-7.4.2
 */
let parseFetchResponse = (response) => {
    let data = {};
    if (response !== undefined) {
        let extracted = extractMessageData(response);
        let keys = Object.keys(extracted);
        keys.forEach(key => {
            var _a, _b;
            let item = key.toUpperCase();
            let value = extracted[key];
            if (item.indexOf(MessageDataItem.BODY) === 0) {
                item = MessageDataItem.BODY;
            }
            if (!(item in MessageDataItem)) {
                throw new Error(`Unknown message data item: ${key}`);
            }
            switch (item) {
                case MessageDataItem.ENVELOPE:
                    data[item] = Envelope.from(deparenthesize(value));
                    break;
                case MessageDataItem.FLAGS:
                    data[item] = deparenthesize(value)
                        .split(`\s`)
                        .filter(flag => flag !== '');
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
                        if (((_a = match.groups) === null || _a === void 0 ? void 0 : _a.section) === 'HEADER') {
                            value = new Header(value);
                        }
                        data[item][(_b = match.groups) === null || _b === void 0 ? void 0 : _b.section] = value;
                    }
                    else {
                        data[item] = value;
                    }
                    break;
                default:
                    data[item] = value;
                    break;
            }
        });
    }
    return data;
};
export let extractMessageData = (data) => {
    let result = {};
    let buffer = '';
    let item;
    let start;
    let skip = 0;
    [...deparenthesize(data)].forEach(current => {
        let previous = buffer[buffer.length - 1];
        buffer += current;
        switch (true) {
            case item === undefined:
                switch (true) {
                    case current === ' ' && buffer === ' ':
                        buffer = '';
                        break;
                    case current === ' ':
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
                switch (true) {
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
            case current === ' ':
                result[item] = buffer.slice(0, -1);
                item = undefined;
                start = undefined;
                buffer = '';
                break;
        }
    });
    if (buffer !== '')
        throw new Error(`Invalid/incomplete buffer: ${buffer}`);
    return result;
};
