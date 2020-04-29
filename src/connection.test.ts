import test, {
  ExecutionContext
} from 'ava';

import Connection, {
  Preferences,
  State
} from './connection';

let debuggedConnection = (t: ExecutionContext, preferences: Preferences) => {
  let c = new Connection(preferences);
  c.on('debug', (msg) => {
    t.log(msg);
  });
  return c;
};

test('Connection can establish a connection to Ethereal.email and login', async (t) => {
  try {
    let connection = debuggedConnection(t, {
      host: 'imap.ethereal.email',
      user: 'manuel22@ethereal.email',
      pass: 'RZPfRRKZNnrptYDGmX'
    });
    let connected = await connection.connect();
    t.true(connected);
    t.is(connection.state, State.NotAuthenticated);
    let authenticated = await connection.login();
    t.true(authenticated);
    t.is(connection.state, State.Authenticated);
  } catch (error) {
    t.fail(error);
  }
});

test('Connection can establish a connection to Fastmail.', async (t) => {
  try {
    let connection = new Connection({ host: 'imap.fastmail.com', user: '', pass: '' });
    let connected = await connection.connect();
    t.true(connected);
    t.is(connection.state, State.NotAuthenticated);
  } catch (error) {
    t.fail(error);
  }
});

test('Connection can establish a connection to iCloud', async (t) => {
  try {
    let connection = new Connection({ host: 'imap.mail.me.com', user: '', pass: '' });
    let connected = await connection.connect();
    t.true(connected);
    t.is(connection.state, State.NotAuthenticated);
  } catch (error) {
    t.fail(error);
  }
});

test('Connection can establish a connection to Gmail', async (t) => {
  try {
    let connection = new Connection({ host: 'imap.gmail.com', user: '', pass: '' });
    let connected = await connection.connect();
    t.true(connected);
    t.is(connection.state, State.NotAuthenticated);
  } catch (error) {
    t.fail(error);
  }
});
