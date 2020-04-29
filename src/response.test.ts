import test from 'ava';
import Response, { Status, Code } from './response';

test('Response can process a server ready response', (t) => {
  let response = new Response(
    Buffer.from('* OK Server ready for requests 0.0.0.0 54bv5g2dokk43x5g\r\n')
  );
  t.is(response.status, Status.OK);
});

test('Response can process a tagged server response and result', (t) => {
  let response = new Response(
    Buffer.from(`* BYE IMAP4rev1 Server logging out\r\nA023 OK LOGOUT completed\r\n`)
  );
  t.is(response.tag, 'A023');
  t.is(response.status, Status.OK);
});

test('Response can process a tagged server response and result with optional response code data', (t) => {
  let response = new Response(
    Buffer.from(`* OK [ALERT] System shutdown in 10 minutes\r\nA001 OK LOGIN Completed\r\n`)
  );
  t.is(response.tag, 'A001');
  t.is(response.status, Status.OK);
  t.truthy(response.data);
  t.is(response.data?.length, 1);
  if (response.data) {
    let optional = response.data[0];
    t.is(optional.status, Status.OK);
    t.is(optional.code, Code.ALERT);
  }
});
