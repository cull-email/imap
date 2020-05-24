import Patterns, {
  named as namedPattern,
  compile as compilePattern,
  unquote,
} from './patterns';
import Address, { parseList as parseAddresses } from './address';

export let template = compilePattern([
  namedPattern('date',      Patterns.string),
  namedPattern('subject',   Patterns.nilOrString),
  namedPattern('from',      Patterns.parenthesized),
  namedPattern('sender',    Patterns.parenthesized),
  namedPattern('replyTo',   Patterns.parenthesized),
  namedPattern('to',        Patterns.nilOrParenthesized),
  namedPattern('cc',        Patterns.nilOrParenthesized),
  namedPattern('bcc',       Patterns.nilOrParenthesized),
  namedPattern('inReplyTo', Patterns.nilOrString, true),
  namedPattern('messageId', Patterns.nilOrString, true)
]);

export class Envelope {
  /**
   * `Message-ID`: A unique message identifier.
   * @link https://tools.ietf.org/html/rfc2822#section-3.6.4
   */
  id?: string;
  /**
   * The date and time at which the message was considered complete and ready to be sent.
   * @link https://tools.ietf.org/html/rfc2822#section-3.6.1
   */
  date: string = new Date().toString();
  /**
   * The topic of the message.
   * @link https://tools.ietf.org/html/rfc2822#section-3.6.5
   */
  subject?: string;
  /**
   * Address(es) of the message author(s).
   * @link https://tools.ietf.org/html/rfc2822#section-3.6.2
   */
  from: Address[] = [];
  /**
   * Address(es) of the agent(s) responsible for the actual transmission.
   * @link https://tools.ietf.org/html/rfc2822#section-3.6.2
   */
  sender: Address[] = [];
  /**
   * Address(es) the author(s) suggests replies be sent to.
   * @link https://tools.ietf.org/html/rfc2822#section-3.6.2
   */
  replyTo: Address[] = [];
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
  static from(response: string): Envelope {
    return parseFromString(response);
  }
}

export let parseFromString = (response:string): Envelope => {
  let match = response.match(template);
  if (!match || !match.groups) {
    throw new Error(`Could not parse envelope from response: ${response}`);
  }
  let parsed = match.groups;
  let envelope = new Envelope();
  envelope.date = unquote(parsed.date);
  if (parsed.messageId !== 'NIL') {
    envelope.id = unquote(parsed.messageId);
  }
  ['subject', 'inReplyTo'].forEach(key => {
    if (parsed[key] !== 'NIL') {
      envelope[key] = unquote(parsed[key]);
    }
  });
  ['from', 'sender', 'replyTo', 'to', 'cc', 'bcc'].forEach(key => {
    if (parsed[key] !== 'NIL') {
      envelope[key] = parseAddresses(parsed[key]);
    }
  });
  return envelope;
}

export default Envelope;
