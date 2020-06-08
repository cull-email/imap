export declare let Patterns: {
    string: RegExp;
    stringLiteralPrefix: RegExp;
    stringLiteralSplit: RegExp;
    nilOrString: RegExp;
    parenthesized: RegExp;
    nilOrParenthesized: RegExp;
};
export default Patterns;
/**
 * Triad of Name, RegExp pattern and presence requirement (zero or 1)
 */
export declare type NamedPattern = [string, RegExp, boolean];
export declare let named: (name: string, pattern: RegExp, optional?: boolean) => NamedPattern;
export declare let compile: (patterns: NamedPattern[], singleline?: boolean) => RegExp;
/**
 * Remove  quotes from a string
 */
export declare let unquote: (input?: string | undefined) => string;
export declare let quote: (input?: string | undefined) => string;
export declare let unescape: (input?: string | undefined) => string;
export declare let escape: (input?: string | undefined) => string;
/**
 * Strip parentheses from a string
 */
export declare let deparenthesize: (input?: string | undefined) => string;
/**
 * Bisect a string using the first occurrence of whitespace
 */
export declare let bisect: (input: string) => [string | undefined, string];
/**
 * Isolate string literals, escape double quotes, wrap with double quotes
 */
export declare let deliteralize: (input: string) => string;
