import test, { ExecutionContext } from 'ava';
import Client, { Preferences } from './client';
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

export let testClient = (t: ExecutionContext, preferences: Preferences = testPreferences) => {
  let client = new Client(preferences);
  client.on('error', (...args) => {
    t.fail(...args);
  });
  return client;
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
  let c = testClient(t);
  let connected = await c.connect();
  t.true(connected);
  await c.disconnect();
});

test('Client can store CAPABILITY data received from the server.', async t => {
  let c = testClient(t);
  try {
    await c.connect();
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
  } catch (error) {
    t.fail(error);
  } finally {
    await c.disconnect();
  }
});

test('Client can list mailboxes.', async t => {
  let c = testClient(t);
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
        name: 'Drafts'
      },
      {
        attributes: ['\\HasNoChildren', '\\Junk'],
        delimiter: '/',
        name: 'Junk'
      },
      {
        attributes: ['\\HasNoChildren', '\\Sent'],
        delimiter: '/',
        name: 'Sent Mail'
      },
      {
        attributes: ['\\HasNoChildren', '\\Trash'],
        delimiter: '/',
        name: 'Trash'
      }
    ];
    t.deepEqual([...m.values()], expected);
  } catch (error) {
    t.fail(error);
  } finally {
    await c.disconnect();
  }
});

test('Client can get a mailbox.', async t => {
  let c = testClient(t);
  try {
    await c.connect();
    let m = await c.mailbox('INBOX');
    let expected: Mailbox = {
      attributes: ['\\HasNoChildren'],
      delimiter: '/',
      name: 'INBOX'
    };
    t.deepEqual(m, expected);
  } catch (error) {
    t.fail(error);
  } finally {
    await c.disconnect();
  }
});

test('Client can select a mailbox.', async t => {
  let c = testClient(t);
  try {
    await c.connect();
    let m = await c.select('INBOX');
    t.deepEqual(m, c.selected);
  } catch (error) {
    t.fail(error);
  } finally {
    await c.disconnect();
  }
});

/**
 * @todo interface with a server/mock for legitimate, predictable scenario
 */
test('Client can list all envelopes for a mailbox.', async t => {
  let c = testClient(t);
  try {
    await c.connect();
    let e = await c.envelopes();
    t.is([...e.values()].length, 0);
  } catch (error) {
    t.log(error);
    t.fail('An unexpected error has occurred.');
  } finally {
    await c.disconnect();
  }
});

test('Client can list all messages for a mailbox.', async t => {
  let c = testClient(t);
  try {
    await c.connect();
    let m = await c.messages('inbox', '1:*', ['UID']);
    t.is([...m.values()].length, 0);
  } catch (error) {
    t.log(error);
    t.fail('An unexpected error has occurred.');
  } finally {
    await c.disconnect();
  }
});

test('Client can list all headers for a mailbox.', async t => {
  let c = testClient(t);
  try {
    await c.connect();
    let h = await c.headers('inbox', '1:*');
    t.is([...h.values()].length, 0);
  } catch (error) {
    t.log(error);
    t.fail('An unexpected error has occurred.');
  } finally {
    await c.disconnect();
  }
});