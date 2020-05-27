import Envelope from './envelope';
import Mailbox from './mailbox';
import Header from './header';
export declare class Message {
    sequence?: string;
    uid?: string;
    mailbox?: Mailbox;
    envelope?: Envelope;
    header?: Header;
    flags: string[];
    body?: any;
}
export default Message;
