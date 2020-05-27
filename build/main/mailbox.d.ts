/**
 * __A Mailbox__
 *
 * A remote message folder.
 * @link https://tools.ietf.org/html/rfc3501
 */
export interface Mailbox {
    name: string;
    delimiter: string;
    attributes: string[];
    children?: Mailbox[];
}
export default Mailbox;
/**
 * Mailbox flags the server has communicated, boolean indicates changes persist (`PERMANENTFLAGS`)
 * @link https://tools.ietf.org/html/rfc3501#section-7.1
 * @link https://tools.ietf.org/html/rfc3501#section-7.2.6
 */
export declare type Flags = Map<string, boolean>;
/**
 * Mailbox UID-related values UIDVALIDITY and UIDNEXT
 * @link https://tools.ietf.org/html/rfc3501#section-2.3.1.1
 */
export interface UID {
    /**
     * UIDNEXT: the next unique identifier value of the mailbox.
     * @link https://tools.ietf.org/html/rfc3501#section-2.3.1.1
     */
    next?: string;
    /**
     * UIDVALIDITY: the unique identifier validity value of the mailbox.
     * @link https://tools.ietf.org/html/rfc3501#section-2.3.1.1
     */
    validity?: string;
}
/**
 * __A Selected Mailbox__
 *
 * Identical to an unselected mailbox (a remote message folder) but with additional information.
 * @link https://tools.ietf.org/html/rfc3501#section-6.3.1
 */
export declare class SelectedMailbox implements Mailbox {
    /**
     * Mailbox name
     * @link https://tools.ietf.org/html/rfc3501#section-7.2.2
     */
    name: string;
    /**
     * Mailbox hierarchy delimeter
     * @link https://tools.ietf.org/html/rfc3501#section-7.2.2
     */
    delimiter: string;
    /**
     * Mailbox name attributes
     * @link https://tools.ietf.org/html/rfc3501#section-7.2.2
     */
    attributes: string[];
    flags: Flags;
    /**
     * `READ-ONLY` vs `READ-WRITE` access for the selected mailbox
     * @link https://tools.ietf.org/html/rfc3501#section-6.3.1
     */
    writeable?: boolean;
    /**
     * Number of messages in this mailbox.
     * @link https://tools.ietf.org/html/rfc3501#section-7.3.1
     */
    exists: number;
    /**
     * Number of messages in this mailbox with the `\Recent` flag set.
     * @link https://tools.ietf.org/html/rfc3501#section-7.3.2
     */
    recent: number;
    uid: UID;
    constructor(name: any);
}
