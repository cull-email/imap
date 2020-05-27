/// <reference types="node" />
import { EventEmitter } from 'events';
import Connection, { Preferences as ConnectionPreferences } from './connection';
import Response, { FetchResponseData } from './response';
import Mailbox, { SelectedMailbox } from './mailbox';
import Envelope from './envelope';
import Message from './message';
import Header from './header';
/**
 * A collection of server capabilities.
 * @link https://tools.ietf.org/html/rfc3501#section-7.2.1
 */
declare type Capabilities = Set<string>;
/**
 * A collection of mailboxes keyed by name.
 */
declare type Mailboxes = Map<string, Mailbox>;
/**
 * A collection of envelopes keyed by message sequence number.
 */
declare type Envelopes = Map<number, Envelope>;
/**
 * A collection of messages keyed by sequence number.
 */
declare type Messages = Map<number, Message>;
/**
 * A collection of headrs keyed by message sequence number.
 */
declare type Headers = Map<number, Header>;
/**
 * User-specified client options analogous to configuration.
 */
export interface Preferences extends ConnectionPreferences {
    /**
     * A unique identifier for the client instance.
     */
    id?: string;
}
/**
 * __An IMAP Client__
 */
export declare class Client extends EventEmitter {
    /**
     * A unique identifier.
     */
    id: string;
    /**
     * An IMAP connection reference.
     */
    connection: Connection;
    /**
     * Capabilities the server has communicated.
     * @link https://tools.ietf.org/html/rfc3501#section-7.2.1
     */
    capabilities: Capabilities;
    /**
     * Selected mailbox
     * @link https://tools.ietf.org/html/rfc3501#section-3.3
     */
    selected?: SelectedMailbox;
    /**
     * A cache of mailboxes the server has communicated.
     */
    protected _mailboxes: Mailboxes;
    /**
     * A cache of envelopes the server has communicated.
     */
    protected _envelopes: Envelopes;
    /**
     * A cache of messages the server has communicated.
     */
    protected _messages: Messages;
    constructor(preferences: Preferences);
    protected initialize(): void;
    connect(login?: boolean): Promise<boolean>;
    disconnect(): Promise<boolean>;
    /**
     * Analyze a response and update connection data as applicable.
     */
    protected analyzeResponse(response: Response): void;
    protected analyzeFetchResponseData(data: FetchResponseData): void;
    /**
     * Get Mailboxes
     * @link https://tools.ietf.org/html/rfc3501#section-6.3.8
     * @param flatten (`boolean`, default: `false`) Return a flat array vs a nested array (tree)
     * @param children (`boolean`, default: `true`) Return children under this hierarchy
     * @param path (`string`, default: empty) The name of a mailbox or level of hierarchy
     */
    mailboxes(flatten?: boolean, children?: boolean, path?: string): Promise<Mailboxes>;
    /**
     * Get Mailbox
     * @link https://tools.ietf.org/html/rfc3501#section-6.3.8
     * @param name (`string`) The name of a mailbox or level of hierarchy
     * @param path (`string`, default: `/`)
     * @param stale (`boolean`, default: `true`) allow possibly stale (cached) result
     */
    mailbox(name: string, path?: string, stale?: boolean): Promise<Mailbox>;
    /**
     * Select a Mailbox for subsequent command context.
     * @link https://tools.ietf.org/html/rfc3501#section-6.3.1
     * @param name (`string`)
     */
    select(name: string): Promise<SelectedMailbox>;
    /**
     * Fetch Envelopes for a given mailbox and sequence
     * @link https://tools.ietf.org/html/rfc3501#section-6.4.5
     * @param name (`string`) The mailbox name/path
     * @param sequence (`string) sequence set
     * @param timeout (`number`) timeout in seconds
     */
    envelopes(name?: string, sequence?: string, timeout?: number): Promise<Envelopes>;
    messages(name?: string, sequence?: string, items?: string[], timeout?: number): Promise<Messages>;
    headers(name?: string, sequence?: string, timeout?: number): Promise<Headers>;
}
export default Client;
export declare let mailboxTree: (map: Mailboxes) => Mailboxes;
