import Envelope from './envelope';
import Mailbox from './mailbox';
import Header from './header';

/**
 * __An Electronic Mail Message__
 * @link https://tools.ietf.org/html/rfc3501#section-2.3
 * @link https://tools.ietf.org/html/rfc2822
 * @link https://tools.ietf.org/html/rfc2045
 */
export class Message {
  sequence?: string;
  uid?: string;
  mailbox?: Mailbox;
  envelope?: Envelope;
  header?: Header;
  flags: string[] = [];
  body?: any;
}

export default Message;
