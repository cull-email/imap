import {
  Patterns,
  named as namedPattern,
  compile as compilePattern,
  deparenthesize,
  unquote,
} from './patterns';

/**
 * __Electronic Mail Address__
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
}

export default Address;

export let parseList = (input: string): Address[] => {
  let pattern = new RegExp(/\(([^\(\)]+)\)/, 'g');
  let addresses = input.match(pattern) ?? [];
  return addresses.map(parse);
}

export let parse = (input:string): Address => {
  let address: Address = {
    host: '',
    mailbox: ''
  };
  let patterns = [
    namedPattern('name',    Patterns.nilOrString),
    namedPattern('adl',     Patterns.nilOrString),
    namedPattern('mailbox', Patterns.nilOrString),
    namedPattern('host',    Patterns.nilOrString)
  ];
  let pattern = compilePattern(patterns);
  let match = deparenthesize(input).match(pattern);
  if (match && match.groups) {
    let m = match.groups;
    Object.keys(match.groups).forEach(key => {
      if (m[key] !== 'NIL') {
        address[key] = unquote(m[key]);
      }
    });
  }
  return address;
}
