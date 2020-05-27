import test from 'ava';
import { parseList } from './address';

test('parseList can extract address structures', t => {
  let result = parseList('("Jon" NIL "jon" "cull.email") ("Jaclyn" NIL "jaclyn" "cull.email"))');
  t.deepEqual(result, [
    {
      host: 'cull.email',
      name: 'Jon',
      mailbox: 'jon'
    },
    {
      host: 'cull.email',
      name: 'Jaclyn',
      mailbox: 'jaclyn'
    }
  ]);
});
