export let Patterns = {
  string: new RegExp(/\"?([^\"]*)\"?/),
  nilOrString: new RegExp(/NIL|\"?([^\"]*)\"?/),
  optionalString: new RegExp(/\"?([^\"]*)\"?/),
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

export let compile = (patterns: NamedPattern[]): RegExp => {
  let source: string[] = [];
  patterns.forEach(([name, pattern, optional]) => {
    let re = `(?<${name}>${pattern.source})`;
    if (optional) {
      re += '?';
    }
    source.push(re);
  });
  return new RegExp(`^${source.join('\\s')}$`);
}

/**
 * Strip quotes from a string
 */
export let unquote = (input?: string): string => {
  return input ? input.replace(/^"(.*)"$/, '$1') : '';
};

/**
 * Strip parentheses from a string
 */
export let deparenthesize = (input?: string): string => {
  return input ? input.replace(/^\((.*)\)$/, '$1') : '';
}

/**
 * Bisect a string using the first occurrence of whitespace
 */
export let bisect = (input: string): [undefined | string, string] => {
  let matches = input.match(/^(\S*)\s(.*)$/);
  return !matches ? [undefined, input] : [matches[1], matches[2]];
};
