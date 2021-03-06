"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const patterns_1 = __importStar(require("./patterns"));
const address_1 = require("./address");
exports.template = patterns_1.compile([
    patterns_1.named('date', patterns_1.default.string),
    patterns_1.named('subject', patterns_1.default.nilOrString),
    patterns_1.named('from', patterns_1.default.parenthesized),
    patterns_1.named('sender', patterns_1.default.parenthesized),
    patterns_1.named('replyTo', patterns_1.default.parenthesized),
    patterns_1.named('to', patterns_1.default.nilOrParenthesized),
    patterns_1.named('cc', patterns_1.default.nilOrParenthesized),
    patterns_1.named('bcc', patterns_1.default.nilOrParenthesized),
    patterns_1.named('inReplyTo', patterns_1.default.nilOrString, true),
    patterns_1.named('messageId', patterns_1.default.nilOrString, true)
]);
/**
 * __An Electronic Mail Message Envelope__
 * @link https://tools.ietf.org/html/rfc3501#section-2.3.5
 */
class Envelope {
    constructor() {
        /**
         * The date and time at which the message was considered complete and ready to be sent.
         * @link https://tools.ietf.org/html/rfc2822#section-3.6.1
         */
        this.date = new Date().toString();
        /**
         * Address(es) of the message author(s).
         * @link https://tools.ietf.org/html/rfc2822#section-3.6.2
         */
        this.from = [];
        /**
         * Address(es) of the agent(s) responsible for the actual transmission.
         * @link https://tools.ietf.org/html/rfc2822#section-3.6.2
         */
        this.sender = [];
        /**
         * Address(es) the author(s) suggests replies be sent to.
         * @link https://tools.ietf.org/html/rfc2822#section-3.6.2
         */
        this.replyTo = [];
    }
    /**
     * Generate an envelope by parsing a FETCH ENVELOPE response string
     * @link https://tools.ietf.org/html/rfc3501#section-7.4.2
     */
    static from(response) {
        return exports.parseFromString(response);
    }
}
exports.Envelope = Envelope;
exports.parseFromString = (response) => {
    let match = response.match(exports.template);
    if (!match || !match.groups) {
        throw new Error(`Could not parse envelope from response: ${response}`);
    }
    let parsed = match.groups;
    let envelope = new Envelope();
    envelope.date = patterns_1.unquote(parsed.date);
    if (parsed.messageId !== 'NIL') {
        envelope.id = patterns_1.unquote(parsed.messageId);
    }
    ['subject', 'inReplyTo'].forEach(key => {
        if (parsed[key] !== 'NIL') {
            envelope[key] = patterns_1.unquote(parsed[key]);
        }
    });
    ['from', 'sender', 'replyTo', 'to', 'cc', 'bcc'].forEach(key => {
        if (parsed[key] !== 'NIL') {
            envelope[key] = address_1.parseList(parsed[key]);
        }
    });
    return envelope;
};
exports.default = Envelope;
