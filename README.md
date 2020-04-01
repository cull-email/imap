# imap for [cull](https://cull.email)

A minimal IMAP client interface exposing mailboxes, envelopes and messages.

## Installation

```sh
npm install cull-email-imap
```

## Usage

```js
import Client from 'cull-email-imap';

// optional `options` passes through to `emailjs-imap-client`
// see https://github.com/emailjs/emailjs-imap-client#api
let c = new Client({
  host: 'mail.example.com',
  port: 993,
  user: 'user@example.com',
  pass: 'password',
  options: {
    requireTLS: true
  }
});

// List mailboxes
let mailboxes = c.mailboxes();

// List message envelopes
// (to, from, subject, date, etc.)
// defaults to INBOX
let envelopes = c.envelopes();

// List messages for a given sequence range
// (1:3 = first, second and third messages)
let messages = c.messages('INBOX', '1:3');
```

Alternatively, study the [tests](https://github.com/cull-email/imap/blob/master/test/index.spec.ts).

## Development

[`makefile`](https://github.com/cull-email/imap/blob/master/makefile) codifies directives for building, testing, linting and other development oriented tasks.