import test from 'ava';
import Envelope from './envelope';

test('Envelope can parse a string response into an Envelope', t => {
  let result = Envelope.from(
    `"Mon, 5 May 2020 00:00:01 -1000" "test" (("Jon" NIL "jon" "cull.email")) (("Jan" NIL "jan" "cull.email")) (("Jin" NIL "jin" "cull.email")) ((NIL NIL "jaclyn" "cull.email")) NIL NIL NIL "<8ECD42F9-2045-4EF3-8287-BD7E0F2A3C90@cull.email>"`
  );
  let expected = new Envelope();
  expected.date = 'Mon, 5 May 2020 00:00:01 -1000';
  expected.subject = 'test';
  expected.from = [
    { host: 'cull.email', mailbox: 'jon', name: 'Jon' }
  ];
  expected.sender = [
    { host: 'cull.email', mailbox: 'jan', name: 'Jan' }
  ];
  expected.replyTo = [
    { host: 'cull.email', mailbox: 'jin', name: 'Jin' }
  ];
  expected.to = [
    { host: 'cull.email', mailbox: 'jaclyn' }
  ];
  expected.messageId = '<8ECD42F9-2045-4EF3-8287-BD7E0F2A3C90@cull.email>';
  t.deepEqual(result, expected);
});


