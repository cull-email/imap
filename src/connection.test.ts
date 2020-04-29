import test, { ExecutionContext } from 'ava';

import Connection, { Preferences, State } from './connection';

let debuggedConnection = (t: ExecutionContext, preferences: Preferences) => {
  let c = new Connection(preferences);
  c.on('debug', (msg) => {
    t.log(msg);
  });
  return c;
};

test('Connection can establish a connection.', async (t) => {
  try {
    let connection = debuggedConnection(t, {
      host: 'imap.fastmail.com',
      user: 'esta5@ethereal.email',
      pass: 'g8K7Z4Aw3RYjYq69eS'
    });
    let connected = await connection.connect();
    t.true(connected);
    t.is(connection.state, State.NotAuthenticated);
  } catch (error) {
    t.fail(error);
  }
})
