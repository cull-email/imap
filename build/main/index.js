"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const emailjs_imap_client_1 = __importDefault(require("emailjs-imap-client"));
const uuid_1 = require("uuid");
class Client {
    constructor(config) {
        var _a, _b;
        this.name = (_a = config.name) !== null && _a !== void 0 ? _a : uuid_1.v4();
        this.configuration = config;
        let { host, user, pass, options } = config;
        let auth = { user, pass };
        let port = (_b = config.port) !== null && _b !== void 0 ? _b : 993;
        this.client = new emailjs_imap_client_1.default(host, port, Object.assign(Object.assign({}, options), { auth }));
    }
    mailboxes() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.client.connect();
                let mailboxes = yield this.client
                    .listMailboxes()
                    .then((root) => root.children);
                this.client.close();
                return mailboxes;
            }
            catch (error) {
                return this.client.close().then(() => {
                    Promise.reject(error);
                });
            }
        });
    }
    envelopes(mailbox = 'INBOX', sequence = '1:10', query = []) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.client.connect();
                let messages = yield this.client.listMessages(mailbox, sequence, ['uid', 'flags', 'envelope'].concat(query));
                this.client.close();
                return messages.map((m) => {
                    return Object.assign(Object.assign({}, m.envelope), { client: this, mailbox });
                });
            }
            catch (error) {
                return this.client.close().then(() => {
                    return Promise.reject(error);
                });
            }
        });
    }
    messages(mailbox = 'INBOX', sequence = '1:10', query = []) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.client.connect();
                let messages = yield this.client.listMessages(mailbox, sequence, ['uid', 'flags', 'envelope', 'body.peek[]'].concat(query));
                this.client.close();
                return messages.map((m) => {
                    m.body = ['body[]'];
                    return Object.assign(Object.assign({}, m), { client: this, mailbox });
                });
            }
            catch (error) {
                return this.client.close().then(() => {
                    return Promise.reject(error);
                });
            }
        });
    }
}
exports.Client = Client;
exports.default = Client;
