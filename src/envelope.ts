import Patterns, {
  named as namedPattern,
  compile as compilePattern,
  unquote
} from './patterns';
import Address, { parseList as parseAddresses } from './address';

export class Envelope {
  date: string = new Date().toString();
  subject?: string;
  from: Address[] = [];
  sender: Address[] = [];
  replyTo: Address[] = [];
  to?: Address[];
  cc?: Address[];
  bcc?: Address[];
  inReplyTo?: string;
  messageId?: string;

  /**
   * Generate an envelope by parsing a FETCH ENVELOPE response string
   * @link https://tools.ietf.org/html/rfc3501#section-7.4.2
   */

  static from(response: string): Envelope {
    let patterns = [
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
    ];
    let pattern = compilePattern(patterns);
    let match = response.match(pattern);
    if (!match || !match.groups) {
      throw new Error(`Could not parse envelope from response: ${response}`);
    }
    let envelope = new Envelope();
    let m = match.groups;
    envelope.date = unquote(m.date);
    ['subject', 'inReplyTo', 'messageId'].forEach(key => {
      if (m[key] !== 'NIL') {
        envelope[key] = unquote(m[key]);
      }
    });
    ['from', 'sender', 'replyTo', 'to', 'cc', 'bcc'].forEach(key => {
      if (m[key] !== 'NIL') {
        envelope[key] = parseAddresses(m[key]);
      }
    });
    return envelope;
  }
}

export default Envelope;
