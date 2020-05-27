export declare let template: RegExp;
/**
 * __An Electronic Mail Address__
 * @link https://tools.ietf.org/html/rfc3501#section-9
 */
export declare class Address {
    /**
     * Mailbox name
     * @link https://tools.ietf.org/html/rfc3501#section-7.4.2
     */
    mailbox: string;
    /**
     * Host name
     * @link https://tools.ietf.org/html/rfc3501#section-7.4.2
     */
    host: string;
    /**
     * Personal name
     * @link https://tools.ietf.org/html/rfc3501#section-7.4.2
     */
    name?: string;
    /**
     * SMTP at-domain-list, or source route
     * @link https://tools.ietf.org/html/rfc3501#section-7.4.2
     * @link https://tools.ietf.org/html/rfc2821#appendix-C
     */
    adl?: string;
    constructor(host?: string, mailbox?: string, name?: string, adl?: string);
    /**
     * Construct an Address given ABNF `address` string form.
     * @link https://tools.ietf.org/html/rfc3501#section-9
     * @param address string `(Name ADL Mailbox Host)`
     */
    static from(address: string): Address;
    /**
     * A string representation of the address, in the form `name <mailbox@host>`
     */
    toString(): string;
}
export default Address;
/**
 * Construct a collection of Addresses given a parenthesized list of addresses in ABNF form.
 * @param input string `((name adl mailbox host) (name adl mailbox host))`
 */
export declare let parseList: (input: string) => Address[];
/**
 * Construct an Address given ABNF `address` string form.
 * @link https://tools.ietf.org/html/rfc3501#section-9
 * @param input string `(name adl mailbox host)`
 */
export declare let parse: (input: string) => Address;
