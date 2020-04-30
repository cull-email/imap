import test from 'ava';
import Response, { Status, ServerState } from './response';
import { ResponseCode as Code } from './code';

test('Response can process a server ready response.', t => {
  let response = new Response(
    Buffer.from('* OK Server ready for requests 0.0.0.0 54bv5g2dokk43x5g\r\n')
  );
  t.is(response.status, Status.OK);
});

test('Response can process a tagged server response and result.', (t) => {
  let response = new Response(
    Buffer.from(`* BYE IMAP4rev1 Server logging out\r\nA023 OK LOGOUT completed\r\n`)
  );
  t.is(response.tag, 'A023');
  t.is(response.status, Status.OK);
});

test('Response can process a tagged server response and result with optional response code ALERT.', t => {
  let response = new Response(
    Buffer.from(`* OK [ALERT] System shutdown in 10 minutes\r\nA001 OK LOGIN Completed\r\n`)
  );
  t.log(response);
  t.is(response.tag, 'A001');
  t.is(response.status, Status.OK);
  t.is(response.codes.length, 1);
  t.is(response.codes[0].code, Code.ALERT);
});

test('Response can process a tagged server response and result with optional response code CAPABILITY.', t => {
  let response = new Response(
    Buffer.from(`* OK [CAPABILITY IMAP4rev1 SASL-IR AUTH=PLAIN AUTH=XOAUTH2 AUTH=OAUTHBEARER ID MOVE NAMESPACE XYMHIGHESTMODSEQ UIDPLUS LITERAL+ CHILDREN X-MSG-EXT OBJECTID] IMAP4rev1 Hello\r\n`)
  );
  t.is(response.tag, undefined);
  t.is(response.status, Status.OK);
  t.is(response.codes.length, 1);
  t.is(response.codes[0].code, Code.CAPABILITY);
});

test('Response can process an untagged server response with LIST data.', t => {
  let response = new Response(
    Buffer.from(`* LIST (\\HasNoChildren) "/" "INBOX"\r\n`)
  );
  t.is(response.tag, undefined);
  t.log(response.data[ServerState.LIST]);
})
