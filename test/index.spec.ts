import test from 'ava';
import server from './server';
import { Client } from '../src/index';

let port = 1143;
server.listen(port);

let client = () => {
  return new Client({
    host: 'localhost',
    port,
    user: 'testuser',
    pass: 'testpass',
    options: {
      logLevel: 40,
      ignoreTLS: true
    }
  });
}

test('Client name is generated when unspecified', t => {
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

test('Client name can be specified', t => {
  let c = new Client({
    name: 'foo',
    host: '',
    port: 0,
    user: '',
    pass: '',
  });
  t.is(c.name, 'foo');
});

test('Client can list mailboxes', async t => {
  let c = client();
  let m = await c.mailboxes();
  c.client.close();
  t.is(m.length, 2);
});

test('Client can list all envelopes for a mailbox', async t => {
  let c = client();
  let e = await c.envelopes();
  t.is(e.length, 6);
});

test('Client can list some envelopes for a mailbox', async t => {
  let c = client();
  let e = await c.envelopes('INBOX', '1:2');
  t.is(e.length, 2);
});

test('Client will not list envelopes for an invalid mailbox', async t => {
  let c = client();
  let e = null;
  try {
    await c.envelopes('INVALID_MAILBOX');
  } catch (error) {
    e = error;
  }
  t.truthy(e);
});

test('Client can list all messages for a mailbox', async t => {
  let c = client();
  let m = await c.messages();
  t.is(m.length, 6);
});

test('Client can list some messages for a mailbox', async t => {
  let c = client();
  let m = await c.messages('INBOX', '1:2');
  t.is(m.length, 2);
});

test('Client will not list messages for an invalid mailbox', async t => {
  let c = client();
  let e = null;
  try {
    await c.messages('INVALID_MAILBOX');
  } catch (error) {
    e = error;
  }
  t.truthy(e);
});
