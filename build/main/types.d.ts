import Client from './client';
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
