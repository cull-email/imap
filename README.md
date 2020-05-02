# imap for [Cull](https://cull.email)

A minimal IMAP client interface exposing mailboxes, envelopes and messages.

## Installation

```sh
npm install @cull/imap
```

## Usage

```js
import Client from '@cull/imap';

let c = new Client({
  host: 'mail.example.com',
  user: 'user@example.com',
  pass: 'password',
});

c.connect().then(() => {
  // List mailboxes
  // defaults to root level only
  // pass true for recursive: `c.mailboxes(true);`
  let mailboxes = c.mailboxes();

   // List envelopes
  // (to, from, subject, date, etc.)
   // defaults to INBOX
  let envelopes = c.envelopes();

  // List messages for a given sequence range
  // (1:3 = first, second and third messages)
  let messages = c.messages('INBOX', '1:3');
});


```

Alternatively, study the tests.

## Development

[`makefile`](https://github.com/cull-email/imap/blob/master/makefile) codifies directives for building, testing, linting and other development oriented tasks.