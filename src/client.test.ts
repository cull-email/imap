import test from 'ava';
import Client from './client';

/**
 * Credentials for a fake, functional imap server.
 * @link https://ethereal.email
 */
export let testPreferences = {
  host: 'imap.ethereal.email',
  user: 'manuel22@ethereal.email',
  pass: 'RZPfRRKZNnrptYDGmX'
}

test('Client id is generated when unspecified.', t => {
  let c = new Client({
    host: '',
    port: 0,
    user: '',
    pass: '',
  });
  t.truthy(typeof c.name === 'string');
  t.truthy(c.name !== '');
  t.truthy(c.name !== null);
});

test('Client id can be specified.', t => {
  let c = new Client({
    id: 'foo',
    host: '',
    port: 0,
    user: '',
    pass: '',
  });
  t.is(c.name, 'foo');
});

test('Client can establish an autheticated connection to an IMAP server.', async t => {
  let c = new Client(testPreferences);
  let connected = await c.connect();
  t.true(connected);
});

// test('Client can list mailboxes.', async t => {
//   let c = new Client(testPreferences);
//   try {
//     await c.connect();
//     let m = await c.mailboxes();
//     t.is(m.length, 2);
//   } catch (error) {
//     t.fail(error);
//   } finally {
//     c.disconnect();
//   }
// });

// test('Client can list all envelopes for a mailbox', async t => {
//   let c = client();
//   let e = await c.envelopes();
//   t.is(e.length, 6);
// });

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
