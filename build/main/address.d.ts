/**
 * __Electronic Mail Address__
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
}
export default Address;
export declare let parseList: (input: string) => Address[];
export declare let parse: (input: string) => Address;
