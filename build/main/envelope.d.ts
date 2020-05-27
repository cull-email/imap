import Address from './address';
export declare let template: RegExp;
/**
 * __An Electronic Mail Message Envelope__
 * @link https://tools.ietf.org/html/rfc3501#section-2.3.5
 */
export declare class Envelope {
    /**
     * `Message-ID`: A unique message identifier.
     * @link https://tools.ietf.org/html/rfc2822#section-3.6.4
     */
    id?: string;
    /**
     * The date and time at which the message was considered complete and ready to be sent.
     * @link https://tools.ietf.org/html/rfc2822#section-3.6.1
     */
    date: string;
    /**
     * The topic of the message.
     * @link https://tools.ietf.org/html/rfc2822#section-3.6.5
     */
    subject?: string;
    /**
     * Address(es) of the message author(s).
     * @link https://tools.ietf.org/html/rfc2822#section-3.6.2
     */
    from: Address[];
    /**
     * Address(es) of the agent(s) responsible for the actual transmission.
     * @link https://tools.ietf.org/html/rfc2822#section-3.6.2
     */
    sender: Address[];
    /**
     * Address(es) the author(s) suggests replies be sent to.
     * @link https://tools.ietf.org/html/rfc2822#section-3.6.2
     */
    replyTo: Address[];
    /**
     * Address(es) of the primary recipient(s) of the message.
     * @link https://tools.ietf.org/html/rfc2822#section-3.6.3
     */
    to?: Address[];
    /**
     * Address(es) of additional recipient(s) of the message.
     * @link https://tools.ietf.org/html/rfc2822#section-3.6.3
     */
    cc?: Address[];
    /**
     * Address(es) of additional recipient(s) of the message hidden from all recipients.
     */
    bcc?: Address[];
    /**
     * The `Message-ID` to which this message is a reply.
     * @link https://tools.ietf.org/html/rfc2822#section-3.6.4
     */
    inReplyTo?: string;
    /**
     * Generate an envelope by parsing a FETCH ENVELOPE response string
     * @link https://tools.ietf.org/html/rfc3501#section-7.4.2
     */
    static from(response: string): Envelope;
}
export declare let parseFromString: (response: string) => Envelope;
export default Envelope;
