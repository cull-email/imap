import test from 'ava';
import Patterns, { compile, named, deliteralize } from './patterns';

test('Patterns can be combined named patterns for keyed extraction', t => {
  let patterns = [
    named('a', Patterns.string, false),
    named('b', Patterns.nilOrString, true)
  ];
  let pattern = compile(patterns, true);
  t.log(pattern.source);
  let matches = `"1234 \\" \r\n" "5678"`.match(pattern);
  if (matches === null || matches.groups === undefined) {
    t.fail('Exepected named pattern matches.');
  } else {
    t.deepEqual(matches.groups, {
      a: `"1234 \\" \r\n"`,
      b: `"5678"`
    });
  }
});

test('Patterns can deliteralize string literals interspersed in a string', t => {
  let result = deliteralize(`{7}\r\n1234 "  "5678" {3}\r\nfoo \r\n`);
  t.is(result, '"1234 \\" " "5678" "foo" \r\n');
});
