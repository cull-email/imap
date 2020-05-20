export let Patterns = {
  string: new RegExp(/(?<!\\)\"?(.*)(?<!\\)\"?/),
  stringLiteralPrefix: new RegExp(/\{(?<octets>\d+)\}\r\n/),
  stringLiteralSplit: new RegExp(/^(?<head>[^\{|.]*)\{(?<octets>\d+)\}\r\n(?<tail>.+)$/s),
  nilOrString: new RegExp(/NIL|(?<!\\)\"?([^\"]*)(?<!\\)\"?/),
  optionalString: new RegExp(/(?<!\\)\"?([^\"]*)(?<!\\)\"?/),
  parenthesized: new RegExp(/\((.+)\)/),
  nilOrParenthesized: new RegExp(/NIL|\((.+)\)/),
  parenthesizedList: new RegExp(/\(([^\(\)]+)\)/),
}

export default Patterns;

/**
 * Triad of Name, RegExp pattern and presence requirement (zero or 1)
 */
export type NamedPattern = [string, RegExp, boolean];

export let named = (name: string, pattern: RegExp, optional: boolean = false): NamedPattern => {
  return [name, pattern, optional];
};

export let compile = (patterns: NamedPattern[], singleline: boolean = false): RegExp => {
  let source: string[] = [];
  patterns.forEach(([name, pattern, optional]) => {
    let re = `(?<${name}>${pattern.source})`;
    if (optional) {
      re += '?';
    }
    source.push(re);
  });
  return new RegExp(`^${source.join('\\s')}$`, singleline ? 's' : undefined);
}

/**
 * Strip quotes from a string
 */
export let unquote = (input?: string): string => {
  return input ? input.replace(/^"(.*)"$/s, '$1') : '';
};

/**
 * Strip parentheses from a string
 */
export let deparenthesize = (input?: string): string => {
  return input ? input.replace(/^\((.*)\)$/s, '$1') : '';
}

/**
 * Bisect a string using the first occurrence of whitespace
 */
export let bisect = (input: string): [undefined | string, string] => {
  let matches = input.match(/^(\S*)\s(.*)$/s);
  return !matches ? [undefined, input] : [matches[1], matches[2]];
};

/**
 * Isolate string literals, "escape" double quotes, wrap with double quotes
 */
export let deliteralize = (input: string): string => {
  let data = input;
  let buffer = '';
  while (data.length > 0) {
    let matches = data.match(Patterns.stringLiteralSplit);
    if (matches !== null && matches.groups !== undefined) {
      let { head, octets, tail } = matches.groups;
      buffer += head;
      let length = parseInt(octets, 10);
      let literal = tail.substring(0, length).replace('"', '\\"');
      buffer += `"${literal}"`;
      data = tail.substring(length);
    } else {
      buffer += data;
      data = '';
    }
  }
  return buffer;
}
