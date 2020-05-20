import test from 'ava';
import Client from './client';
import Mailbox from './mailbox';
import { State } from './connection';
import { Status, ServerStatus } from './response';
import Command from './command';

/**
 * Credentials for a fake, functional imap server.
 * @link https://ethereal.email
 */
export let testPreferences = {
  host: 'imap.ethereal.email',
  user: 'manuel22@ethereal.email',
  pass: 'RZPfRRKZNnrptYDGmX'
};

test('Client id is generated when unspecified.', t => {
  let c = new Client({
    host: '',
    port: 0,
    user: '',
    pass: ''
  });
  t.truthy(typeof c.id === 'string');
  t.truthy(c.id !== '');
  t.truthy(c.id !== null);
});

test('Client id can be specified.', t => {
  let c = new Client({
    id: 'foo',
    host: '',
    port: 0,
    user: '',
    pass: ''
  });
  t.is(c.id, 'foo');
});

test('Client can establish an authenticated connection to an IMAP server.', async t => {
  let c = new Client(testPreferences);
  let connected = await c.connect();
  t.true(connected);
  await c.disconnect();
});

test('Connection can store CAPABILITY data received from the server.', async t => {
  let c = new Client(testPreferences);
  let connected = await c.connect();
  t.true(connected);
  t.is(c.connection.state, State.Authenticated);
  t.true([...c.capabilities].length > 0);
  c.capabilities = new Set();
  let command = new Command('capability');
  let response = await c.connection.exchange(command);
  t.is(response.status, Status.OK);
  let capabilityResponse = c.connection.responses.find(r => {
    return r.data[ServerStatus.CAPABILITY] !== undefined && r.received > command.sent!;
  });
  if (capabilityResponse) {
    t.deepEqual(c.capabilities, new Set(capabilityResponse.data[ServerStatus.CAPABILITY]));
  } else {
    t.fail(`Expected a CAPABILITY response.`);
  }
  await c.disconnect();
});

test('Client can list mailboxes.', async t => {
  let c = new Client(testPreferences);
  try {
    await c.connect();
    let m = await c.mailboxes(true);
    let expected: Mailbox[] = [
      {
        attributes: ['\\HasNoChildren'],
        delimiter: '/',
        name: 'INBOX'
      },
      {
        attributes: ['\\HasNoChildren', '\\Drafts'],
        delimiter: '/',
        name: 'Drafts',
      },
      {
        attributes: ['\\HasNoChildren', '\\Junk'],
        delimiter: '/',
        name: 'Junk',
      },
      {
        attributes: ['\\HasNoChildren', '\\Sent'],
        delimiter: '/',
        name: 'Sent Mail',
      },
      {
        attributes: ['\\HasNoChildren', '\\Trash'],
        delimiter: '/',
        name: 'Trash',
      }
    ];
    t.deepEqual([...m.values()], expected);
  } catch (error) {
    t.log(error);
  }

  await c.disconnect();
});

test('Client can list all envelopes for a mailbox.', async t => {
  let c = new Client({
    host: 'imap.fastmail.com',
    user: 'adbox@kuokoa.studio',
    pass: 'nkb5gnqsgp7udh4c',
  });
  c.on('error', (...args) => {
    t.fail(...args);
  });
  try {
    await c.connect();
    // c.on('debug', t.log);
    let e = await c.envelopes('INBOX', '1:20');
    t.is([...e.values()].length, 0);
  } catch(error) {
    t.log(c.connection.log);
    t.fail(error);
  }
});

// test('Client can list some envelopes for a mailbox', async t => {
//   let c = client();
//   let e = await c.envelopes('INBOX', '1:2');
//   t.is(e.length, 2);
// });

// test('Client will not list envelopes for an invalid mailbox', async t => {
//   let c = client();
//   let e = null;
//   try {
//     await c.envelopes('INVALID_MAILBOX');
//   } catch (error) {
//     e = error;
//   }
//   t.truthy(e);
// });

// test('Client can list all messages for a mailbox', async t => {
//   let c = client();
//   let m = await c.messages();
//   t.is(m.length, 6);
// });

// test('Client can list some messages for a mailbox', async t => {
//   let c = client();
//   let m = await c.messages('INBOX', '1:2');
//   t.is(m.length, 2);
// });

// test('Client will not list messages for an invalid mailbox', async t => {
//   let c = client();
//   let e = null;
//   try {
//     await c.messages('INVALID_MAILBOX');
//   } catch (error) {
//     e = error;
//   }
//   t.truthy(e);
// });
