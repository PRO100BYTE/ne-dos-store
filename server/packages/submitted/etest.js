export default class HelloStoreCommand {
  description() { return 'Sample community command'; }
  help(term) { term.writeln('Usage: hellostore'); }
  execute(term) { term.writeln('Hello from NE-DOS Store.'); }
}
