import test, {
  ExecutionContext
} from 'ava';

import Connection, {
  Preferences,
  State
} from './connection';

import { Status } from './response';
import Command from './command';

export let debuggedConnection = (t: ExecutionContext, preferences: Preferences) => {
  let c = new Connection(preferences);
  c.on('debug', (msg) => {
    t.log(msg);
  });
  return c;
};

/**
 * Credentials for a fake, functional imap server.
 * @link https://ethereal.email
 */
export let testPreferences = {
  host: 'imap.ethereal.email',
  user: 'manuel22@ethereal.email',
  pass: 'RZPfRRKZNnrptYDGmX'
}
let testConnection = (): Connection => {
  return new Connection(testPreferences);
}

test('Connection can establish a connection to Fastmail.', async (t) => {
  let connection = new Connection({ host: 'imap.fastmail.com', user: '', pass: '' });
  try {
    let connected = await connection.connect(false);
    t.is(connected, Status.OK);
    t.is(connection.state, State.NotAuthenticated);
  } catch (error) {
    t.fail(error);
  }
});

test('Connection can establish a connection to iCloud.', async (t) => {
  let connection = new Connection({ host: 'imap.mail.me.com', user: '', pass: '' });
  try {
    let connected = await connection.connect(false);
    t.is(connected, Status.OK);
    t.is(connection.state, State.NotAuthenticated);
  } catch (error) {
    t.fail(error);
  }
});

test('Connection can establish a connection to Gmail.', async (t) => {
  let connection = new Connection({ host: 'imap.gmail.com', user: '', pass: '' });
  try {
    let connected = await connection.connect(false);
    t.is(connected, Status.OK);
    t.is(connection.state, State.NotAuthenticated);
  } catch (error) {
    t.fail(error);
  }
});

test('Connection cannot login before connection is established.', async (t) => {
  let connection = testConnection();
  t.is(connection.state, State.Disconnected);
  await t.throwsAsync(connection.login);
  t.is(connection.state, State.Disconnected);
});

test('Connection can login.', async (t) => {
  try {
    let connection = testConnection();
    let connected = await connection.connect();
    t.is(connected, Status.OK);
    t.is(connection.state, State.Authenticated);
  } catch (error) {
    t.fail(error);
  }
});

test('Connection can send a command.', async (t) => {
  let connection = testConnection();
  try {
    let connected = await connection.connect();
    t.is(connected, Status.OK);
    t.is(connection.state, State.Authenticated);
    let command = new Command('capability');
    connection.send(command);
    await connection.awaitResponse(command.tag).then((response) => {
      t.is(response.status, Status.OK);
    }).catch(error => t.fail(error));
  } catch (error) {
    t.fail(error);
  }
});

test('Connection can exchange a command for an awaited response.', async (t) => {
  let connection = testConnection();
  try {
    let connected = await connection.connect();
    t.is(connected, Status.OK);
    t.is(connection.state, State.Authenticated);
    let command = new Command('capability');
    let response = await connection.exchange(command);
    t.fail('wip')
    t.is(response.status, Status.OK);
  } catch (error) {
    t.fail(error);
  }
});
