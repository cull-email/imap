export declare let INCREMENTOR: number;
/**
 * __An IMAP Client Command__
 *
 * Command composes an IMAP command and arguments into a tagged, string representation.
 *
 * @link https://tools.ietf.org/html/rfc3501#section-2.2.1
 * @link https://tools.ietf.org/html/rfc3501#section-6
 */
export declare class Command {
    /**
     * Client Command
     * @link https://tools.ietf.org/html/rfc3501#section-6
     */
    command: string;
    /**
     * Tag
     * @link https://tools.ietf.org/html/rfc3501#section-2.2.1
     */
    tag?: string;
    /**
     * Command Arguments
     * @link @link https://tools.ietf.org/html/rfc3501#section-2.2.1
     */
    args?: string;
    /**
     * Datetime sent to server
     */
    sent?: Date;
    constructor(command: string, args?: string, tag?: string);
    toString(): string;
}
export default Command;
