var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { EventEmitter } from 'events';
import { Socket } from 'net';
import tls, { TLSSocket } from 'tls';
import Command from './command';
import Response, { Status } from './response';
/**
 * Connection State
 * @link https://tools.ietf.org/html/rfc3501#section-3
 */
export var State;
(function (State) {
    /**
     * Logout State
     * @link https://tools.ietf.org/html/rfc3501#section-3.4
     */
    State[State["Disconnected"] = 0] = "Disconnected";
    /**
     * Not Authenticated State
     * @link https://tools.ietf.org/html/rfc3501#section-3.1
     */
    State[State["NotAuthenticated"] = 1] = "NotAuthenticated";
    /**
     * Authenticated State
     * @link https://tools.ietf.org/html/rfc3501#section-3.2
     */
    State[State["Authenticated"] = 2] = "Authenticated";
    /**
     * (Mailbox) Selected State
     * @link https://tools.ietf.org/html/rfc3501#section-3.3
     */
    State[State["MailboxSelected"] = 3] = "MailboxSelected";
})(State || (State = {}));
/**
 * __An IMAP Connection__
 */
export class Connection extends EventEmitter {
    constructor(preferences) {
        super();
        /**
         * Connection State
         * @link https://tools.ietf.org/html/rfc3501#section-3
         */
        this.state = State.Disconnected;
        /** The TLS Socket utilized for this connnection. */
        this.socket = new TLSSocket(new Socket());
        this._buffer = Buffer.from('');
        /** A collection of all commands sent to the server on this connection. */
        this.commands = [];
        /** A collection of all responses received from the server on this connection. */
        this.responses = [];
        let defaults = {
            port: 993,
            timeout: 60,
            sni: preferences.host
        };
        this.configuration = Object.assign(Object.assign({}, defaults), preferences);
    }
    /**
     * Establish a connection with the server.
     * @param login (default: `true`) attempt to automatically login immediately after a connection is established.
     * @link https://tools.ietf.org/html/rfc3501#section-2.2
     */
    connect(login = true) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                try {
                    let { host, port, sni: servername } = this.configuration;
                    let options = Object.assign(Object.assign({}, this.configuration.options), { host, port, servername });
                    this.socket = tls.connect(options, () => {
                        if (!this.socket.authorized) {
                            reject(this.socket.authorizationError);
                        }
                        else {
                            this.connectionEstablished();
                            this.awaitResponse()
                                .then(response => {
                                resolve(login ? this.login() : response);
                            })
                                .catch(error => reject(error));
                        }
                    });
                }
                catch (error) {
                    reject(error);
                }
            });
        });
    }
    /**
     * Inform the server the connection should be closed.
     * @link https://tools.ietf.org/html/rfc3501#section-6.1.3
     */
    disconnect() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                if (this.state !== State.Disconnected) {
                    try {
                        let command = new Command('logout');
                        this.send(command);
                        this.awaitResponse(command.tag)
                            .then(response => {
                            this.socket.end(() => {
                                response.status === Status.OK ? resolve(response) : reject(response);
                            });
                        })
                            .catch(error => reject(error));
                    }
                    catch (error) {
                        reject(error);
                    }
                }
                else {
                    resolve(undefined);
                }
            });
        });
    }
    /**
     * Authenticate as a user with the server.
     * @link https://tools.ietf.org/html/rfc3501#section-6.2.3
     */
    login() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                try {
                    let { user, pass } = this.configuration;
                    let command = new Command('login', `${user} ${pass}`);
                    this.send(command);
                    this.awaitResponse(command.tag)
                        .then(response => {
                        if (response.status === Status.BAD) {
                            throw new Error(`Server error: ${response.text}`);
                        }
                        if (response.status === Status.OK) {
                            this.state = State.Authenticated;
                        }
                        resolve(response);
                    })
                        .catch(error => reject(error));
                }
                catch (error) {
                    reject(error);
                }
            });
        });
    }
    send(command) {
        if (this.state === State.Disconnected) {
            throw new Error('Disconnected from server.');
        }
        command.sent = new Date();
        this.commands.push(command);
        this.emit('send', command);
        this.socket.write(command.toString());
    }
    /**
     * Attempt to retrieve the reponse for a given command, automatically sending the command as needed.
     * @param command Command
     * @param timeout timeout in seconds
     */
    exchange(command, timeout) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.commands.find(c => c === command)) {
                this.send(command);
            }
            return this.awaitResponse(command.tag, timeout);
        });
    }
    /**
     * Return the immediately next untagged or search for an exsting or upcoming tagged response.
     *
     * @param tag Command tag
     * @param timeout Timeout in seconds
     */
    awaitResponse(tag, timeout) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                // Search prior responses when tag specified.
                if (tag !== undefined) {
                    let existing = this.responses.find(r => r.tag === tag);
                    if (existing) {
                        resolve(existing);
                    }
                }
                let t = this.startResponseTimeout(reject, timeout);
                let receiver = (response) => {
                    if (tag === undefined || tag === response.tag) {
                        clearTimeout(t);
                        this.off('receive', receiver);
                        try {
                            resolve(response);
                        }
                        catch (error) {
                            reject(error);
                        }
                    }
                };
                this.on('receive', receiver);
            });
        });
    }
    /**
     * Start a timeout and throw an error or call the `reject` callback when reached.
     * @param reject callback
     * @param seconds cutoff time in seconds
     */
    startResponseTimeout(reject, seconds) {
        let timeout = (seconds !== null && seconds !== void 0 ? seconds : this.configuration.timeout) * 1000;
        return setTimeout(() => {
            let error = `Response time exceeded ${timeout}ms.`;
            if (reject === undefined) {
                throw new Error(error);
            }
            else {
                reject(error);
            }
        }, timeout);
    }
    /**
     * Update connection state and configure default emitter relays from connection socket
     */
    connectionEstablished() {
        this.state = State.NotAuthenticated;
        this.emit('connect', 'TLS connection established.');
        this.socket.on('data', buffer => {
            let b = buffer;
            try {
                let [response, remaining] = responseFromBuffer(Buffer.concat([this._buffer, b]));
                while (response !== undefined) {
                    this.responses.push(response);
                    this.emit('receive', response);
                    let next = responseFromBuffer(remaining);
                    response = next[0];
                    remaining = next[1];
                }
                b = remaining;
            }
            catch (error) {
                this.emit('error', error);
            }
            this._buffer = b;
        });
        this.socket.on('end', () => {
            this.state = State.Disconnected;
            this.emit('end', 'Server closed connection.');
        });
        this.socket.on('close', error => {
            this.state = State.Disconnected;
            if (error) {
                this.emit('error', 'Connection closed with error.');
            }
            this.emit('close', 'Connection closed.');
        });
        this.socket.on('error', error => {
            this.emit('error', error);
            this.socket.end();
        });
    }
    /**
     * Emit all events as `debug` event before standard emit.
     */
    emit(event, ...args) {
        if (event !== 'debug') {
            super.emit('debug', Object.assign({ event }, args));
        }
        return super.emit(event, ...args);
    }
    get log() {
        let log = new Map();
        let commands = this.commands.map(c => [c.sent, `> ${c.toString()}`]);
        let responses = this.responses.map(r => [r.received, `< ${r.toString()}`]);
        let merged = commands.concat(responses);
        merged.sort((a, b) => {
            if (a[0] < b[0])
                return -1;
            if (a[0] > b[0])
                return 1;
            return 0;
        });
        merged.forEach(l => log.set(l[0], l[1]));
        return log;
    }
}
export default Connection;
export let responseFromBuffer = (buffer) => {
    let b = buffer;
    let offset = 0;
    let literal = false;
    let target = 0;
    for (; offset < b.length; offset++) {
        if (literal && offset > target) {
            literal = false;
        }
        // CRLF
        if (b[offset] === 0x0a && b[offset - 1] === 0x0d && !literal) {
            let slice = b.slice(0, offset + 1);
            // https://tools.ietf.org/html/rfc3501#section-4.3
            let match = slice.toString('ascii').match(/^(.+)\{(?<target>(\d+))\}\r\n$/);
            if (match && match.groups && match.groups.target) {
                literal = true;
                target = offset + parseInt(match.groups.target, 10);
                continue;
            }
            let response = new Response(slice);
            return [response, b.slice(offset + 1)];
        }
    }
    return [undefined, b];
};
