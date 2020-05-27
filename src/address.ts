import {
  Patterns,
  named as namedPattern,
  compile as compilePattern,
  deparenthesize,
  unquote
} from './patterns';

export let template = compilePattern([
  namedPattern('name', Patterns.nilOrString),
  namedPattern('adl', Patterns.nilOrString),
  namedPattern('mailbox', Patterns.nilOrString),
  namedPattern('host', Patterns.nilOrString)
]);

/**
 * __An Electronic Mail Address__
 * @link https://tools.ietf.org/html/rfc3501#section-9
 */
export class Address {
  /**
   * Mailbox name
   * @link https://tools.ietf.org/html/rfc3501#section-7.4.2
   */
  mailbox: string = '';
  /**
   * Host name
   * @link https://tools.ietf.org/html/rfc3501#section-7.4.2
   */
  host: string = '';
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

  constructor(host?: string, mailbox?: string, name?: string, adl?: string) {
    this.host = host ?? '';
    this.mailbox = mailbox ?? '';
    this.name = name;
    this.adl = adl;
  }

  /**
   * Construct an Address given ABNF `address` string form.
   * @link https://tools.ietf.org/html/rfc3501#section-9
   * @param address string `(Name ADL Mailbox Host)`
   */
  static from(address: string): Address {
    return parse(address);
  }

  /**
   * A string representation of the address, in the form `name <mailbox@host>`
   */
  toString(): string {
    return `${this.name} <${this.mailbox}@${this.host}>`;
  }
}

export default Address;

/**
 * Construct a collection of Addresses given a parenthesized list of addresses in ABNF form.
 * @param input string `((name adl mailbox host) (name adl mailbox host))`
 */
export let parseList = (input: string): Address[] => {
  let pattern = new RegExp(/\(([^\(\)]+)\)/, 'g');
  let addresses = input.match(pattern) ?? [];
  return addresses.map(parse);
};

/**
 * Construct an Address given ABNF `address` string form.
 * @link https://tools.ietf.org/html/rfc3501#section-9
 * @param input string `(name adl mailbox host)`
 */
export let parse = (input: string): Address => {
  let address: Address = {
    host: '',
    mailbox: ''
  };
  let match = deparenthesize(input).match(template);
  if (match && match.groups) {
    let m = match.groups;
    Object.keys(match.groups).forEach(key => {
      if (m[key] !== 'NIL') {
        address[key] = unquote(m[key]);
      }
    });
  }
  return address;
};
