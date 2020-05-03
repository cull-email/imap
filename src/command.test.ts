import test from 'ava';
import Command from './command';

test('Command will provide a tag when unspecified.', t => {
  let command = new Command('status');
  t.truthy(command.tag);
});

test('Command will compile a valid command without arguments.', t => {
  let command = new Command('list');
  t.is(command.toString(), `${command.tag} list\r\n`);
});

test('Command will compile a valid command with arguments.', t => {
  let command = new Command('list', '"" %');
  t.is(command.toString(), `${command.tag} list "" %\r\n`);
});
