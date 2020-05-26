import test from 'ava';
import Response, {
  Status, ServerStatus, MessageStatus, MessageData, MessageDataItem, extractMessageData
} from './response';
import { Code } from './code';
import Envelope from './envelope';

test('Response can process a server response including multiple lines and string literals', t => {
  let response = new Response(
    Buffer.from('* OK Line 1\r\n* OK Line {4}\r\n2 \r\n\r\n* OK Line 3\r\n')
  );
  t.is(response.lines.length, 3);
  t.deepEqual(response.lines, [
    '* OK Line 1',
    `* OK Line "2 \r\n"`,
    '* OK Line 3'
  ]);
});

test('Response can process a server ready response.', t => {
  let response = new Response(
    Buffer.from('* OK Server ready for requests 0.0.0.0 54bv5g2dokk43x5g\r\n')
  );
  t.is(response.status, Status.OK);
});

test('Response can process a tagged server response and result.', t => {
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
    Buffer.from(
      `* OK [CAPABILITY IMAP4rev1 SASL-IR AUTH=PLAIN AUTH=XOAUTH2 AUTH=OAUTHBEARER ID MOVE NAMESPACE XYMHIGHESTMODSEQ UIDPLUS LITERAL+ CHILDREN X-MSG-EXT OBJECTID] IMAP4rev1 Hello\r\n`
    )
  );
  t.is(response.tag, undefined);
  t.is(response.status, Status.OK);
  t.is(response.codes.length, 1);
  t.is(response.codes[0].code, Code.CAPABILITY);
  t.is(response.codes[0].data.length, 14);
});

test('Response can process an untagged CAPABILITY response.', t => {
  let response = new Response(
    Buffer.from(
      `* CAPABILITY IMAP4rev1 APPENDLIMIT=26214400 CHILDREN CONDSTORE ENABLE ID IDLE MOVE NAMESPACE QUOTA SPECIAL-USE UIDPLUS UNSELECT UNSELECT UTF8=ACCEPT XLIST`
    )
  );
  t.is(response.tag, undefined);
  t.is(response.status, undefined);
  t.is(response.data[ServerStatus.CAPABILITY].length, 16);
});

test('Response can process an untagged LIST response.', t => {
  let response = new Response(Buffer.from(`* LIST (\\HasNoChildren) "/" "INBOX"\r\n* LIST () "/" "Foo"\r\n* LIST () "/" "Foo/Bar"`));
  t.is(response.tag, undefined);
  t.is(response.status, undefined);
  t.is(response.data[ServerStatus.LIST].length, 3);
  let expected = {
    name: 'INBOX',
    delimiter: '/',
    attributes: ['\\HasNoChildren']
  };
  t.deepEqual(response.data[ServerStatus.LIST][0], expected);
  expected = {
    name: 'Foo/Bar',
    delimiter: '/',
    attributes: []
  }
  t.deepEqual(response.data[ServerStatus.LIST][2], expected);
});

test('Response can process a tagged LIST response preceded with multiple untagged lines.', t => {
  let response = new Response(
    Buffer.from(
      `* LIST (\\HasNoChildren \\Drafts) "/" "Drafts"\r\n* LIST (\\HasNoChildren \\Junk) "/" "Junk"\r\n* LIST (\\HasNoChildren \\Sent) "/" "Sent Mail"\r\n* LIST (\\HasNoChildren \\Trash) "/" "Trash"\r\n4 OK LIST completed\r\n`
    )
  );
  t.is(response.tag, '4');
  t.is(response.status, Status.OK);
  t.is(response.data[ServerStatus.LIST].length, 4);
});

test('Response can process an untagged FLAGS response.', t => {
  let response = new Response(
    Buffer.from(
      `* FLAGS (\\Seen \\Drafts \\*)\r\n`
    )
  );
  t.is(response.tag, undefined);
  t.deepEqual(response.data[ServerStatus.FLAGS], ['\\Seen', '\\Drafts', '\\*']);
});

test('Response can process an untagged OK response with PERMANENTFLAGS.', t => {
  let response = new Response(
    Buffer.from(
      `* OK [PERMANENTFLAGS (\\Seen \\Drafts \\*)] Flags permitted\r\n`
    )
  );
  t.is(response.status, Status.OK);
  t.is(response.codes[0].code, Code.PERMANENTFLAGS);
  t.deepEqual(response.codes[0].data, ['\\Seen', '\\Drafts', '\\*']);
});

test('Response can process an untagged OK response with UIDVALIDITY', t => {
  let response = new Response(
    Buffer.from(
      `* OK [UIDVALIDITY 1588148011] UIDs valid]\r\n`
    )
  );
  t.is(response.status, Status.OK);
  t.is(response.codes[0].code, Code.UIDVALIDITY);
  t.is(response.codes[0].data, '1588148011');
});

test('Response can process an EXPUNGE response with multiple sequences.', t => {
  let response = new Response(
    Buffer.from(
      `* 1 EXPUNGE\r\n* 5 EXPUNGE\r\n* 3 EXPUNGE\r\n`
    )
  );
  t.deepEqual(response.data[MessageStatus.EXPUNGE], [1, 5, 3]);
});

test('Response can process a FETCH response with an envelope.', t => {
  let response = new Response(
    Buffer.from(
      `* 1 FETCH (FLAGS () INTERNALDATE "25-May-2020 06:52:30 +0000" BODY[HEADER] {33}\r\nDelivered-To: jaclyn@cull.email\r\n ENVELOPE ("Sun, 24 May 2020 20:52:24 -1000" "test" (("Jon Adams" NIL "jon" "cull.email")) (("Jon Adams" NIL "jon" "cull.email")) (("Jon Adams" NIL "jon" "cull.email")) ((NIL NIL "manuel22" "ethereal.email")) NIL NIL NIL "<7F587D8A-7BBF-4FF8-8815-649279EF3D39@cull.email>"))\r\n`
    )
  );
  t.truthy(response.data[MessageStatus.FETCH]);
  let message = response.data[MessageStatus.FETCH]?.get(1) as MessageData;
  let envelope = message[MessageDataItem.ENVELOPE];
  t.truthy(envelope);
  t.true(envelope instanceof Envelope);
  t.is(envelope.date, 'Sun, 24 May 2020 20:52:24 -1000');
});
