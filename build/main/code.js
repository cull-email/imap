"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Response Code
 * @link https://tools.ietf.org/html/rfc3501#section-7.1
 */
var Code;
(function (Code) {
    Code["ALERT"] = "ALERT";
    Code["BADCHARSET"] = "BADCHARSET";
    Code["CAPABILITY"] = "CAPABILITY";
    Code["PARSE"] = "PARSE";
    Code["PERMANENTFLAGS"] = "PERMANENTFLAGS";
    Code["READONLY"] = "READ-ONLY";
    Code["READWRITE"] = "READ-WRITE";
    Code["TRYCREATE"] = "TRYCREATE";
    Code["UIDNEXT"] = "UIDNEXT";
    Code["UIDVALIDITY"] = "UIDVALIDITY";
    Code["UNSEEN"] = "UNSEEN";
})(Code = exports.Code || (exports.Code = {}));
/**
 * Response Code and associated data
 * @link https://tools.ietf.org/html/rfc3501#section-7.1
 */
class ResponseCode {
    constructor(status, code, data, text) {
        // if (!(code in Code)) {
        //   throw new Error(`${code} is not a valid response code.`);
        // }
        this.status = status;
        this.code = code;
        this.text = text;
        switch (code) {
            case Code.CAPABILITY:
                this.data = data === null || data === void 0 ? void 0 : data.split(` `);
                break;
            case Code.PERMANENTFLAGS:
                let m = data === null || data === void 0 ? void 0 : data.match(/^\((.*)\)$/);
                if (m) {
                    this.data = m[1].split(` `);
                }
                break;
            default:
                this.data = data;
                break;
        }
    }
}
exports.ResponseCode = ResponseCode;
exports.default = ResponseCode;
