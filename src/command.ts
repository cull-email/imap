export let PREFIX = 'a';
export let INCREMENTOR = 1;
export let PAD = 4;

/**
 * Generate a tag using a globally scoped iterator for use with Commands
 * @link https://tools.ietf.org/html/rfc3501#section-2.2.1
 */
let Tag = (): string => {
  let i = String(INCREMENTOR++);
  while (i.length < PAD) { i = `0${i}` }
  return `${PREFIX}${i}`;
}

/**
 * __An IMAP Client Command__
 *
 * Command composes an IMAP command and arguments into a tagged, string representation.
 *
 * @link https://tools.ietf.org/html/rfc3501#section-2.2.1
 * @link https://tools.ietf.org/html/rfc3501#section-6
 */
export class Command {
  command: string;
  tag?: string;
  args?: string;

  constructor(command: string, args?: string, tag?: string) {
    this.command = command;
    this.args = args;
    this.tag = tag ?? Tag();
  }

  toString(): string {
    return [this.tag, this.command.toUpperCase(), this.args].join(' ') + '\r\n';
  }
}

export default Command;
