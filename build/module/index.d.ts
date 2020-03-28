export interface Mailbox {
    name: string;
    delimiter: string;
    path: string;
    children?: Mailbox[];
    flags?: string[];
    listed: boolean;
    subscribed?: boolean;
    specialUse?: string;
    specialUseFlag?: string;
}
export interface Message {
    client: Client;
    mailbox: string;
    '#': number;
    uid?: number;
    flags?: string[];
    envelope?: Envelope;
    body?: any;
}
export interface Envelope {
    client: Client;
    mailbox: string;
    date: string;
    subject: string;
    from: Identity[];
    to: Identity[];
}
export interface Identity {
    name: string;
    address: string;
}
export interface ClientConfiguration {
    name?: string;
    host: string;
    port?: number;
    user: string;
    pass: string;
    options?: any;
}
export declare class Client {
    name: string;
    configuration: ClientConfiguration;
    client: any;
    constructor(config: ClientConfiguration);
    mailboxes(): Promise<Mailbox[]>;
    envelopes(mailbox?: string, sequence?: string, query?: string[]): Promise<Envelope[]>;
    messages(mailbox?: string, sequence?: string, query?: string[]): Promise<Message[]>;
}
export default Client;
