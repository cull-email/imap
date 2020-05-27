import Patterns, { named as namedPattern, compile as compilePattern, unquote } from './patterns';
import { parseList as parseAddresses } from './address';
export let template = compilePattern([
    namedPattern('date', Patterns.string),
    namedPattern('subject', Patterns.nilOrString),
    namedPattern('from', Patterns.parenthesized),
    namedPattern('sender', Patterns.parenthesized),
    namedPattern('replyTo', Patterns.parenthesized),
    namedPattern('to', Patterns.nilOrParenthesized),
    namedPattern('cc', Patterns.nilOrParenthesized),
    namedPattern('bcc', Patterns.nilOrParenthesized),
    namedPattern('inReplyTo', Patterns.nilOrString, true),
    namedPattern('messageId', Patterns.nilOrString, true)
]);
/**
 * __An Electronic Mail Message Envelope__
 * @link https://tools.ietf.org/html/rfc3501#section-2.3.5
 */
export class Envelope {
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
        return parseFromString(response);
    }
}
export let parseFromString = (response) => {
    let match = response.match(template);
    if (!match || !match.groups) {
        throw new Error(`Could not parse envelope from response: ${response}`);
    }
    let parsed = match.groups;
    let envelope = new Envelope();
    envelope.date = unquote(parsed.date);
    if (parsed.messageId !== 'NIL') {
        envelope.id = unquote(parsed.messageId);
    }
    ['subject', 'inReplyTo'].forEach(key => {
        if (parsed[key] !== 'NIL') {
            envelope[key] = unquote(parsed[key]);
        }
    });
    ['from', 'sender', 'replyTo', 'to', 'cc', 'bcc'].forEach(key => {
        if (parsed[key] !== 'NIL') {
            envelope[key] = parseAddresses(parsed[key]);
        }
    });
    return envelope;
};
export default Envelope;
