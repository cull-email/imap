# imap for [Cull](https://cull.email)

A minimal IMAP client interface exposing mailboxes, envelopes and messages.

## Limitations

This library is neither feature complete nor __Production Ready™__.

It is intended for short-lived connections and is generally useful as an introduction to IMAP and for quickly retrieving mailboxes, envelopes and message data in most cases.

The following is not currently implemented:

* Insecure (non-TLS) connections. _See [Cleartext Considered Obsolete: Use of Transport Layer Security (TLS) for Email Submission and Access](https://tools.ietf.org/html/rfc8314)_
* Automatic UTF-7 encoding/decoding.

## Installation

```sh
npm install @cull/imap
```

## Usage

```js
import Client from '@cull/imap';

// Instantiate a client connecting to a mailserver
let c = new Client({
  host: 'mail.example.com',
  user: 'user@example.com',
  pass: 'password',
});

c.connect().then(() => {
  // List mailboxes
  let mailboxes = c.mailboxes();

   // List envelopes for a mailbox path
  let envelopes = c.envelopes('inbox');

  // List messages for a given sequence range
  // (1:3 = first, second and third messages)
  let messages = c.messages('inbox', '1:3');
});

// Be Kind and Correct - Disconnect ;)
c.disconnect();
```

Alternatively, study the tests.

## Development

[`makefile`](https://github.com/cull-email/imap/blob/master/makefile) codifies directives for building, testing, linting and other development oriented tasks.