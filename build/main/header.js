"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Header = void 0;
const patterns_1 = require("./patterns");
class Header extends Map {
    constructor(source) {
        super();
        if (source === undefined)
            return;
        this.source = source;
        source.split(`\r\n`).forEach(line => {
            let [key, value] = patterns_1.bisect(line);
            if (key === undefined)
                return;
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
    toString() {
        let keys = [...this.keys()];
        if (!!keys.length)
            return '';
        return keys
            .map(key => {
            let value = this.get(key);
            return Array.isArray(value) ? value.join(' ') : value;
        })
            .join('\r\n');
    }
}
exports.Header = Header;
exports.default = Header;
