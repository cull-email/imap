/// <reference types="node" />
import { EventEmitter } from 'events';
import tls, { TLSSocket } from 'tls';
import Command from './command';
import Response from './response';
/**
 * User-specified _preferences_
 */
export interface Preferences {
    /**
     * Server Name Indication
     * @link https://en.wikipedia.org/wiki/Server_Name_Indication
     * @link https://tools.ietf.org/html/rfc8446#section-9.2
     */
    sni?: string;
    /**
     * @link https://en.wikipedia.org/wiki/Hostname
     */
    host: string;
    /**
     * TCP Port
     * @link https://en.wikipedia.org/wiki/Port_(computer_networking)
     */
    port?: number;
    /**
     * Authentication Username
     */
    user: string;
    /**
     * Authentication Password
     */
    pass: string;
    /**
     * Default timeout (in seconds) for a given command's expected response to be received.
     */
    timeout?: number;
    /**
     * Additional options passed to lower-level TLS Socket.
     */
    options?: tls.ConnectionOptions;
}
/**
 * Connection instance _configuration_
 */
export interface Configuration {
    /**
     * Server Name Indication
     * @link https://en.wikipedia.org/wiki/Server_Name_Indication
     * @link https://tools.ietf.org/html/rfc8446#section-9.2
     */
    sni: string;
    /**
     * @link https://en.wikipedia.org/wiki/Hostname
     */
    host: string;
    /**
     * TCP Port
     * @link https://en.wikipedia.org/wiki/Port_(computer_networking)
     */
    port: number;
    /**
     * Authentication Username
     */
    user: string;
    /**
     * Authentication Password
     */
    pass: string;
    /**
     * Default timeout (in seconds) for a given command's expected response to be received.
     */
    timeout: number;
    /**
     * Additional options passed to lower-level TLS Socket.
     */
    options?: tls.ConnectionOptions;
}
/**
 * Connection State
 * @link https://tools.ietf.org/html/rfc3501#section-3
 */
export declare enum State {
    /**
     * Logout State
     * @link https://tools.ietf.org/html/rfc3501#section-3.4
     */
    Disconnected = 0,
    /**
     * Not Authenticated State
     * @link https://tools.ietf.org/html/rfc3501#section-3.1
     */
    NotAuthenticated = 1,
    /**
     * Authenticated State
     * @link https://tools.ietf.org/html/rfc3501#section-3.2
     */
    Authenticated = 2,
    /**
     * (Mailbox) Selected State
     * @link https://tools.ietf.org/html/rfc3501#section-3.3
     */
    MailboxSelected = 3
}
/**
 * __An IMAP Connection__
 */
export declare class Connection extends EventEmitter {
    /**
     * Connection State
     * @link https://tools.ietf.org/html/rfc3501#section-3
     */
    state: State;
    /** The TLS Socket utilized for this connnection. */
    socket: TLSSocket;
    protected _buffer: Buffer;
    /** The configuration utilized for this connection. */
    configuration: Configuration;
    /** A collection of all commands sent to the server on this connection. */
    commands: Command[];
    /** A collection of all responses received from the server on this connection. */
    responses: Response[];
    constructor(preferences: Preferences);
    /**
     * Establish a connection with the server.
     * @param login (default: `true`) attempt to automatically login immediately after a connection is established.
     * @link https://tools.ietf.org/html/rfc3501#section-2.2
     */
    connect(login?: boolean): Promise<Response>;
    /**
     * Inform the server the connection should be closed.
     * @link https://tools.ietf.org/html/rfc3501#section-6.1.3
     */
    disconnect(): Promise<Response>;
    /**
     * Authenticate as a user with the server.
     * @link https://tools.ietf.org/html/rfc3501#section-6.2.3
     */
    login(): Promise<Response>;
    send(command: Command): void;
    /**
     * Attempt to retrieve the reponse for a given command, automatically sending the command as needed.
     * @param command Command
     * @param timeout timeout in seconds
     */
    exchange(command: Command, timeout?: number): Promise<Response>;
    /**
     * Return the immediately next untagged or search for an exsting or upcoming tagged response.
     *
     * @param tag Command tag
     * @param timeout Timeout in seconds
     */
    awaitResponse(tag?: string, timeout?: number): Promise<Response>;
    /**
     * Start a timeout and throw an error or call the `reject` callback when reached.
     * @param reject callback
     * @param seconds cutoff time in seconds
     */
    startResponseTimeout(reject?: (Error: any) => void, seconds?: number): ReturnType<typeof setTimeout>;
    /**
     * Update connection state and configure default emitter relays from connection socket
     */
    protected connectionEstablished(): void;
    /**
     * Emit all events as `debug` event before standard emit.
     */
    emit(event: string | symbol, ...args: any[]): boolean;
    get log(): Map<Date, string>;
}
export default Connection;
export declare let responseFromBuffer: (buffer: Buffer) => [Response | undefined, Buffer];
