/**
 * __A Selected Mailbox__
 *
 * Identical to an unselected mailbox (a remote message folder) but with additional information.
 * @link https://tools.ietf.org/html/rfc3501#section-6.3.1
 */
export class SelectedMailbox {
    constructor(name) {
        /**
         * Mailbox hierarchy delimeter
         * @link https://tools.ietf.org/html/rfc3501#section-7.2.2
         */
        this.delimiter = '/';
        /**
         * Mailbox name attributes
         * @link https://tools.ietf.org/html/rfc3501#section-7.2.2
         */
        this.attributes = [];
        this.flags = new Map();
        /**
         * Number of messages in this mailbox.
         * @link https://tools.ietf.org/html/rfc3501#section-7.3.1
         */
        this.exists = 0;
        /**
         * Number of messages in this mailbox with the `\Recent` flag set.
         * @link https://tools.ietf.org/html/rfc3501#section-7.3.2
         */
        this.recent = 0;
        this.uid = {};
        this.name = name;
    }
}
