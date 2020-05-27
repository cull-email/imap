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
    constructor(command, args, tag) {
        this.command = command;
        this.args = args;
        this.tag = tag !== null && tag !== void 0 ? tag : String(INCREMENTOR++);
    }
    toString() {
        let components = [this.tag, this.command, this.args];
        if (!this.args) {
            components.pop();
        }
        return components.join(' ') + '\r\n';
    }
}
export default Command;
