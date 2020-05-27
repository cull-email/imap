import { bisect } from './patterns';

export class Header extends Map<string, string | string[]> {
  protected source?: string;

  constructor(source?: string) {
    super();
    if (source === undefined) return;
    this.source = source;
    source.split(`\r\n`).forEach(line => {
      let [key, value] = bisect(line);
      if (key === undefined) return;
      key = key.slice(0, -1);
      let existing = this.get(key);
      if (existing === undefined) {
        this.set(key, value);
        return;
      }
      let merged = Array.isArray(existing) ? existing.concat(value) : [existing].concat(value);
      this.set(key, merged);
    });
  }

  toString(): string {
    let keys = [...this.keys()];
    if (!!keys.length) return '';
    return keys
      .map(key => {
        let value = this.get(key);
        return Array.isArray(value) ? value.join(' ') : value;
      })
      .join('\r\n');
  }
}

export default Header;
