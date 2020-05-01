import test from 'ava';
import Response, { Status, ServerState } from './response';
import { Code } from './code';

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
  t.is(response.codes[0].data.length, 14);
});

test('Response can process an untagged CAPABILITY response.', t => {
  let response = new Response(
    Buffer.from(`* CAPABILITY IMAP4rev1 APPENDLIMIT=26214400 CHILDREN CONDSTORE ENABLE ID IDLE MOVE NAMESPACE QUOTA SPECIAL-USE UIDPLUS UNSELECT UNSELECT UTF8=ACCEPT XLIST`)
  );
  t.is(response.tag, undefined);
  t.is(response.status, undefined);
  t.is(response.data[ServerState.CAPABILITY].length, 16);
})

test('Response can process an untagged LIST response.', t => {
  let response = new Response(
    Buffer.from(`* LIST (\\HasNoChildren) "/" "INBOX"\r\n`)
  );
  t.is(response.tag, undefined);
  t.is(response.status, undefined);
  t.is(response.data[ServerState.LIST].length, 1);
  t.deepEqual(response.data[ServerState.LIST][0], {name: 'INBOX', delimiter: '/', attributes: ['\\HasNoChildren']});
  t.log(response);
})
