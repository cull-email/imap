export let Patterns = {
    string: new RegExp(/(?<!\\)"(.*?)(?<!\\)"/),
    stringLiteralPrefix: new RegExp(/\{(?<octets>\d+)\}\r\n/),
    stringLiteralSplit: new RegExp(/^(?<head>[^\{|.]*)\{(?<octets>\d+)\}\r\n(?<tail>.+)$/s),
    nilOrString: new RegExp(/NIL|(?<!\\)"(.*?)(?<!\\)"/),
    parenthesized: new RegExp(/\((.*)\)/),
    nilOrParenthesized: new RegExp(/NIL|\((.*)\)/)
};
export default Patterns;
export let named = (name, pattern, optional = false) => {
    return [name, pattern, optional];
};
export let compile = (patterns, singleline = true) => {
    let source = [];
    patterns.forEach(([name, pattern, optional]) => {
        let re = `(?<${name}>${pattern.source})`;
        if (optional) {
            re += '?';
        }
        source.push(re);
    });
    return new RegExp(`^${source.join('\\s')}$`, singleline ? 's' : undefined);
};
/**
 * Remove  quotes from a string
 */
export let unquote = (input) => {
    return input ? input.replace(/^"(.*)"$/s, '$1') : '';
};
export let quote = (input) => {
    return input ? `"${input}"` : '""';
};
export let unescape = (input) => {
    return input ? input.replace('\\"', '"') : '';
};
export let escape = (input) => {
    return input ? input.replace('"', '\\"') : '';
};
/**
 * Strip parentheses from a string
 */
export let deparenthesize = (input) => {
    return input ? input.replace(/^\((.*)\)$/s, '$1') : '';
};
/**
 * Bisect a string using the first occurrence of whitespace
 */
export let bisect = (input) => {
    let matches = input.match(/^(\S*)\s(.*)$/s);
    return !matches ? [undefined, input] : [matches[1], matches[2]];
};
/**
 * Isolate string literals, escape double quotes, wrap with double quotes
 */
export let deliteralize = (input) => {
    let data = input;
    let buffer = '';
    while (data.length > 0) {
        let matches = data.match(Patterns.stringLiteralSplit);
        if (matches !== null && matches.groups !== undefined) {
            let { head, octets, tail } = matches.groups;
            buffer += head;
            let length = parseInt(octets, 10);
            let literal = escape(tail.substring(0, length));
            buffer += `"${literal}"`;
            data = tail.substring(length);
        }
        else {
            buffer += data;
            data = '';
        }
    }
    return buffer;
};
