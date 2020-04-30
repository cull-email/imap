export let INCREMENTOR = 1;

/**
 * __An IMAP Client Command__
 *
 * Command composes an IMAP command and arguments into a tagged, string representation.
 *
 * @link https://tools.ietf.org/html/rfc3501#section-2.2.1
 * @link https://tools.ietf.org/html/rfc3501#section-6
 */
export class Command {
  /**
   * Client Command
   * @link https://tools.ietf.org/html/rfc3501#section-6
   */
  command: string;
  /**
   * Tag
   * @link https://tools.ietf.org/html/rfc3501#section-2.2.1
   */
  tag?: string;
  /**
   * Command Arguments
   * @link @link https://tools.ietf.org/html/rfc3501#section-2.2.1
   */
  args?: string;
  /**
   * Datetime sent to server
   */
  sent?: Date;

  constructor(command: string, args?: string, tag?: string) {
    this.command = command;
    this.args = args;
    this.tag = tag ?? String(INCREMENTOR++);
  }

  toString(): string {
    return [this.tag, this.command.toUpperCase(), this.args].join(' ') + '\r\n';
  }
}

export default Command;
