"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const patterns_1 = require("./patterns");
exports.template = patterns_1.compile([
    patterns_1.named('name', patterns_1.Patterns.nilOrString),
    patterns_1.named('adl', patterns_1.Patterns.nilOrString),
    patterns_1.named('mailbox', patterns_1.Patterns.nilOrString),
    patterns_1.named('host', patterns_1.Patterns.nilOrString)
]);
/**
 * __An Electronic Mail Address__
 * @link https://tools.ietf.org/html/rfc3501#section-9
 */
class Address {
    constructor(host, mailbox, name, adl) {
        /**
         * Mailbox name
         * @link https://tools.ietf.org/html/rfc3501#section-7.4.2
         */
        this.mailbox = '';
        /**
         * Host name
         * @link https://tools.ietf.org/html/rfc3501#section-7.4.2
         */
        this.host = '';
        this.host = host !== null && host !== void 0 ? host : '';
        this.mailbox = mailbox !== null && mailbox !== void 0 ? mailbox : '';
        this.name = name;
        this.adl = adl;
    }
    /**
     * Construct an Address given ABNF `address` string form.
     * @link https://tools.ietf.org/html/rfc3501#section-9
     * @param address string `(Name ADL Mailbox Host)`
     */
    static from(address) {
        return exports.parse(address);
    }
    /**
     * A string representation of the address, in the form `name <mailbox@host>`
     */
    toString() {
        return `${this.name} <${this.mailbox}@${this.host}>`;
    }
}
exports.Address = Address;
exports.default = Address;
/**
 * Construct a collection of Addresses given a parenthesized list of addresses in ABNF form.
 * @param input string `((name adl mailbox host) (name adl mailbox host))`
 */
exports.parseList = (input) => {
    var _a;
    let pattern = new RegExp(/\(([^\(\)]+)\)/, 'g');
    let addresses = (_a = input.match(pattern)) !== null && _a !== void 0 ? _a : [];
    return addresses.map(exports.parse);
};
/**
 * Construct an Address given ABNF `address` string form.
 * @link https://tools.ietf.org/html/rfc3501#section-9
 * @param input string `(name adl mailbox host)`
 */
exports.parse = (input) => {
    let address = {
        host: '',
        mailbox: ''
    };
    let match = patterns_1.deparenthesize(input).match(exports.template);
    if (match && match.groups) {
        let m = match.groups;
        Object.keys(match.groups).forEach(key => {
            if (m[key] !== 'NIL') {
                address[key] = patterns_1.unquote(m[key]);
            }
        });
    }
    return address;
};
