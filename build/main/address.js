"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse = exports.parseList = exports.Address = void 0;
const patterns_1 = require("./patterns");
/**
 * __Electronic Mail Address__
 * @link https://tools.ietf.org/html/rfc3501#section-9
 */
class Address {
    constructor() {
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
    }
    toString() {
        return `${this.name} <${this.mailbox}@${this.host}>`;
    }
}
exports.Address = Address;
exports.default = Address;
exports.parseList = (input) => {
    var _a;
    let pattern = new RegExp(/\(([^\(\)]+)\)/, 'g');
    let addresses = (_a = input.match(pattern)) !== null && _a !== void 0 ? _a : [];
    return addresses.map(exports.parse);
};
exports.parse = (input) => {
    let address = {
        host: '',
        mailbox: ''
    };
    let patterns = [
        patterns_1.named('name', patterns_1.Patterns.nilOrString),
        patterns_1.named('adl', patterns_1.Patterns.nilOrString),
        patterns_1.named('mailbox', patterns_1.Patterns.nilOrString),
        patterns_1.named('host', patterns_1.Patterns.nilOrString)
    ];
    let pattern = patterns_1.compile(patterns);
    let match = patterns_1.deparenthesize(input).match(pattern);
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
