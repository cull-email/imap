"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deliteralize = exports.bisect = exports.deparenthesize = exports.escape = exports.unescape = exports.quote = exports.unquote = exports.compile = exports.named = exports.Patterns = void 0;
exports.Patterns = {
    string: new RegExp(/(?<!\\)"(.*?)(?<!\\)"/),
    stringLiteralPrefix: new RegExp(/\{(?<octets>\d+)\}\r\n/),
    stringLiteralSplit: new RegExp(/^(?<head>[^\{|.]*)\{(?<octets>\d+)\}\r\n(?<tail>.+)$/s),
    nilOrString: new RegExp(/NIL|(?<!\\)"(.*?)(?<!\\)"/),
    parenthesized: new RegExp(/\((.*)\)/),
    nilOrParenthesized: new RegExp(/NIL|\((.*)\)/)
};
exports.default = exports.Patterns;
exports.named = (name, pattern, optional = false) => {
    return [name, pattern, optional];
};
exports.compile = (patterns, singleline = true) => {
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
exports.unquote = (input) => {
    return input ? input.replace(/^"(.*)"$/s, '$1') : '';
};
exports.quote = (input) => {
    return input ? `"${input}"` : '""';
};
exports.unescape = (input) => {
    return input ? input.replace('\\"', '"') : '';
};
exports.escape = (input) => {
    return input ? input.replace('"', '\\"') : '';
};
/**
 * Strip parentheses from a string
 */
exports.deparenthesize = (input) => {
    return input ? input.replace(/^\((.*)\)$/s, '$1') : '';
};
/**
 * Bisect a string using the first occurrence of whitespace
 */
exports.bisect = (input) => {
    let matches = input.match(/^(\S*)\s(.*)$/s);
    return !matches ? [undefined, input] : [matches[1], matches[2]];
};
/**
 * Isolate string literals, escape double quotes, wrap with double quotes
 */
exports.deliteralize = (input) => {
    let data = input;
    let buffer = '';
    while (data.length > 0) {
        let matches = data.match(exports.Patterns.stringLiteralSplit);
        if (matches !== null && matches.groups !== undefined) {
            let { head, octets, tail } = matches.groups;
            buffer += head;
            let length = parseInt(octets, 10);
            let literal = exports.escape(tail.substring(0, length));
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
