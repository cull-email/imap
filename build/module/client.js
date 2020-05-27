var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { v4 as uuid } from 'uuid';
import { EventEmitter } from 'events';
import Connection from './connection';
import { Status as ResponseStatus, ServerStatus, MailboxSizeUpdate, MessageStatus, MessageDataItem } from './response';
import { Code } from './code';
import { Command } from './command';
import { SelectedMailbox } from './mailbox';
import Message from './message';
/**
 * __An IMAP Client__
 */
export class Client extends EventEmitter {
    constructor(preferences) {
        var _a;
        super();
        /**
         * Capabilities the server has communicated.
         * @link https://tools.ietf.org/html/rfc3501#section-7.2.1
         */
        this.capabilities = new Set();
        /**
         * A cache of mailboxes the server has communicated.
         */
        this._mailboxes = new Map();
        /**
         * A cache of envelopes the server has communicated.
         */
        this._envelopes = new Map();
        /**
         * A cache of messages the server has communicated.
         */
        this._messages = new Map();
        this.id = (_a = preferences.id) !== null && _a !== void 0 ? _a : uuid();
        this.connection = new Connection(preferences);
        this.initialize();
    }
    initialize() {
        this.connection.on('error', error => {
            this.emit('error', error);
        });
        this.connection.on('receive', response => {
            this.analyzeResponse(response);
        });
    }
    connect(login = true) {
        return __awaiter(this, void 0, void 0, function* () {
            let response = yield this.connection.connect(login);
            if (response.status === ResponseStatus.OK) {
                return Promise.resolve(true);
            }
            return Promise.reject(response);
        });
    }
    disconnect() {
        return __awaiter(this, void 0, void 0, function* () {
            let response = yield this.connection.disconnect();
            if (response.status === ResponseStatus.OK) {
                return Promise.resolve(true);
            }
            return Promise.reject(response);
        });
    }
    /**
     * Analyze a response and update connection data as applicable.
     */
    analyzeResponse(response) {
        // Response Codes
        response.codes.forEach(c => {
            switch (c.code) {
                case Code.CAPABILITY:
                    c.data.forEach(capability => this.capabilities.add(capability));
                    break;
                case Code.PERMANENTFLAGS:
                    if (this.selected) {
                        c.data.forEach(flag => { var _a; return (_a = this.selected) === null || _a === void 0 ? void 0 : _a.flags.set(flag, true); });
                    }
                    break;
                case Code.READONLY:
                    if (this.selected) {
                        this.selected.writeable = false;
                    }
                    break;
                case Code.READWRITE:
                    if (this.selected) {
                        this.selected.writeable = true;
                    }
                    break;
                case Code.UIDNEXT:
                    if (this.selected) {
                        this.selected.uid.next = c.data;
                    }
                    break;
                case Code.UIDVALIDITY:
                    if (this.selected) {
                        this.selected.uid.validity = c.data;
                    }
                    break;
                default:
                    this.emit('debug', ['unhandled response code', c, response]);
                    break;
            }
        });
        // Response Data
        Object.keys(response.data).forEach(key => {
            var _a, _b;
            switch (key) {
                case ServerStatus.CAPABILITY:
                    response.data[key].forEach(capability => this.capabilities.add(capability));
                    break;
                case ServerStatus.LIST:
                    response.data[key].forEach(mailbox => this._mailboxes.set(mailbox.name, mailbox));
                    break;
                case ServerStatus.FLAGS:
                    if (this.selected) {
                        response.data[key].forEach(flag => { var _a; return (_a = this.selected) === null || _a === void 0 ? void 0 : _a.flags.set(flag, false); });
                    }
                    break;
                case MailboxSizeUpdate.EXISTS:
                    if (this.selected) {
                        this.selected.exists = (_a = response.data[key]) !== null && _a !== void 0 ? _a : 0;
                    }
                    break;
                case MailboxSizeUpdate.RECENT:
                    if (this.selected) {
                        this.selected.recent = (_b = response.data[key]) !== null && _b !== void 0 ? _b : 0;
                    }
                    break;
                case MessageStatus.FETCH:
                    let data = response.data[key];
                    if (data !== undefined) {
                        this.analyzeFetchResponseData(data);
                    }
                    break;
                default:
                    this.emit('debug', ['unhandled response data', key, response]);
                    break;
            }
        });
    }
    analyzeFetchResponseData(data) {
        data.forEach((datum, sequence) => {
            let message = new Message();
            Object.keys(datum).forEach(item => {
                switch (item) {
                    case MessageDataItem.ENVELOPE:
                        message.envelope = datum[item];
                        break;
                    case MessageDataItem.UID:
                        message.uid = datum[item];
                        break;
                    case MessageDataItem.FLAGS:
                        message.flags = datum[item];
                        break;
                    case MessageDataItem.BODY:
                        message.body = datum[item];
                        break;
                    default:
                        this.emit('debug', `Unhandled message data item: ${item}`);
                        break;
                }
            });
            if (message.envelope !== undefined) {
                this._envelopes.set(sequence, message.envelope);
            }
            this._messages.set(sequence, message);
        });
    }
    /**
     * Get Mailboxes
     * @link https://tools.ietf.org/html/rfc3501#section-6.3.8
     * @param flatten (`boolean`, default: `false`) Return a flat array vs a nested array (tree)
     * @param children (`boolean`, default: `true`) Return children under this hierarchy
     * @param path (`string`, default: empty) The name of a mailbox or level of hierarchy
     */
    mailboxes(flatten = false, children = true, path = '') {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                try {
                    let wildcard = children ? '*' : '%';
                    let command = new Command('list', `"${path}" ${wildcard}`);
                    let response = yield this.connection.exchange(command);
                    if (response.status === ResponseStatus.OK) {
                        let mailboxes = flatten ? this._mailboxes : mailboxTree(this._mailboxes);
                        return resolve(mailboxes);
                    }
                    throw response;
                }
                catch (error) {
                    return reject(error);
                }
            }));
        });
    }
    /**
     * Get Mailbox
     * @link https://tools.ietf.org/html/rfc3501#section-6.3.8
     * @param name (`string`) The name of a mailbox or level of hierarchy
     * @param path (`string`, default: `/`)
     * @param stale (`boolean`, default: `true`) allow possibly stale (cached) result
     */
    mailbox(name, path = '/', stale = true) {
        return __awaiter(this, void 0, void 0, function* () {
            let mailbox;
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                if (stale) {
                    mailbox = this._mailboxes.get(path);
                    if (mailbox !== undefined)
                        return resolve(mailbox);
                }
                try {
                    let command = new Command('list', `"${path}" "${name}"`);
                    let response = yield this.connection.exchange(command);
                    if (response.status === ResponseStatus.OK) {
                        mailbox = this._mailboxes.get(name);
                        return mailbox !== undefined
                            ? resolve(mailbox)
                            : reject(new Error('Mailbox could not be found.'));
                    }
                    throw response;
                }
                catch (error) {
                    return reject(error);
                }
            }));
        });
    }
    /**
     * Select a Mailbox for subsequent command context.
     * @link https://tools.ietf.org/html/rfc3501#section-6.3.1
     * @param name (`string`)
     */
    select(name) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                if (this.selected !== undefined && this.selected.name === name) {
                    return resolve(this.selected);
                }
                try {
                    this.selected = new SelectedMailbox(name);
                    let select = new Command('select', name);
                    let response = yield this.connection.exchange(select);
                    if (response.status === ResponseStatus.OK) {
                        return resolve(this.selected);
                    }
                    throw response;
                }
                catch (error) {
                    this.selected = undefined;
                    return reject(error);
                }
            }));
        });
    }
    /**
     * Fetch Envelopes for a given mailbox and sequence
     * @link https://tools.ietf.org/html/rfc3501#section-6.4.5
     * @param name (`string`) The mailbox name/path
     * @param sequence (`string) sequence set
     * @param timeout (`number`) timeout in seconds
     */
    envelopes(name = 'INBOX', sequence = '1:10', timeout) {
        return __awaiter(this, void 0, void 0, function* () {
            this._envelopes = new Map();
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                try {
                    yield this.select(name);
                    let command = new Command('fetch', `${sequence} envelope`);
                    let response = yield this.connection.exchange(command, timeout);
                    if (response.status === ResponseStatus.OK) {
                        return resolve(this._envelopes);
                    }
                    throw response;
                }
                catch (error) {
                    return reject(error);
                }
            }));
        });
    }
    messages(name = 'INBOX', sequence = '1:10', items = ['UID', 'FLAGS', 'BODY.PEEK[]'], timeout) {
        return __awaiter(this, void 0, void 0, function* () {
            this._messages = new Map();
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                try {
                    yield this.select(name);
                    let command = new Command('fetch', `${sequence} (${items.join(' ')})`);
                    let response = yield this.connection.exchange(command, timeout);
                    if (response.status === ResponseStatus.OK) {
                        return resolve(this._messages);
                    }
                    throw response;
                }
                catch (error) {
                    return reject(error);
                }
            }));
        });
    }
    headers(name = 'INBOX', sequence = '1:10', timeout) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let headers = new Map();
                let messages = yield this.messages(name, sequence, ['UID', 'FLAGS', 'BODY.PEEK[HEADER]'], timeout);
                messages.forEach((message, key) => {
                    if (message.body !== undefined && message.body.HEADER !== undefined) {
                        headers.set(key, message.body.HEADER);
                    }
                });
                return Promise.resolve(headers);
            }
            catch (error) {
                return Promise.reject(error);
            }
        });
    }
}
export default Client;
export let mailboxTree = (map) => {
    let mailboxes = [...map.values()];
    mailboxes.forEach(mailbox => {
        // reset for idempotency
        delete mailbox.children;
    });
    let tree = new Map();
    mailboxes.forEach(mailbox => {
        let components = mailbox.name.split(mailbox.delimiter);
        if (components.length > 1) {
            components.pop();
            let parent = map.get(components.join(mailbox.delimiter));
            if (parent) {
                parent.children ? parent.children.push(mailbox) : (parent.children = [mailbox]);
            }
            else {
                throw new Error(`Dangling mailbox: ${mailbox}`);
            }
        }
        else {
            tree.set(mailbox.name, mailbox);
        }
    });
    return tree;
};
