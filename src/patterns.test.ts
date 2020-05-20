import test from 'ava';
import Patterns, { compile, named, deliteralize, unquote, unescape } from './patterns';

test('Patterns can be combined named patterns for keyed extraction', t => {
  let patterns = [
    named('a', Patterns.string, false),
    named('b', Patterns.nilOrString, true)
  ];
  let pattern = compile(patterns, true);
  let matches = `"1234 \\" \r\n" "5678"`.match(pattern);
  if (matches === null || matches.groups === undefined) {
    t.fail('Exepected named pattern matches.');
  } else {
    t.deepEqual(matches.groups, {
      a: `"1234 \\" \r\n"`,
      b: `"5678"`
    });
  }
  matches = `"Mon, 5 May 2020 00:00:01 -1000" "test\r\n"`.match(pattern);
  if (matches === null || matches.groups === undefined) {
    t.fail('Exepected named pattern matches.');
  } else {
    t.deepEqual(matches.groups, {
      a: `"Mon, 5 May 2020 00:00:01 -1000"`,
      b: `"test\r\n"`
    });
  }
});

test('Patterns can deliteralize string literals interspersed in a string', t => {
  let result = deliteralize(`{7}\r\n1234 "  "5678" {3}\r\nfoo \r\n`);
  t.is(result, '"1234 \\" " "5678" "foo" \r\n');
});


test('Patterns can unquote a string to remove boundary double quotes', t => {
  let result = unquote(`"testing quotes"`);
  t.is(result, 'testing quotes');
});

test('Patterns can unescape a string to remove escaped double quotes', t => {
  let result = unescape(`"test a \\"quote"`);
  t.is(result, '"test a "quote"');
});
