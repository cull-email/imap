/**
 * __An Electronic Mail Message Header__
 * @link https://tools.ietf.org/html/rfc2822#section-2.2
 */
export declare class Header extends Map<string, string | string[]> {
    protected source?: string;
    constructor(source?: string);
    toString(): string;
}
export default Header;
