import { Patterns, named as namedPattern, compile as compilePattern, deparenthesize, unquote } from './patterns';
/**
 * __Electronic Mail Address__
 * @link https://tools.ietf.org/html/rfc3501#section-9
 */
export class Address {
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
}
export default Address;
export let parseList = (input) => {
    var _a;
    let pattern = new RegExp(/\(([^\(\)]+)\)/, 'g');
    let addresses = (_a = input.match(pattern)) !== null && _a !== void 0 ? _a : [];
    return addresses.map(parse);
};
export let parse = (input) => {
    let address = {
        host: '',
        mailbox: ''
    };
    let patterns = [
        namedPattern('name', Patterns.nilOrString),
        namedPattern('adl', Patterns.nilOrString),
        namedPattern('mailbox', Patterns.nilOrString),
        namedPattern('host', Patterns.nilOrString)
    ];
    let pattern = compilePattern(patterns);
    let match = deparenthesize(input).match(pattern);
    if (match && match.groups) {
        let m = match.groups;
        Object.keys(match.groups).forEach(key => {
            if (m[key] !== 'NIL') {
                address[key] = unquote(m[key]);
            }
        });
    }
    return address;
};
