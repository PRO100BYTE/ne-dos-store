export default class StopwatchCommand {
  description() { return 'Simple stopwatch'; }
  help(term) { term.writeln('Usage: stopwatch'); }
  execute(term) {
    const start = Date.now();
    term.writeln('Stopwatch started. Run again and compare manually.');
    term.writeln(`Start timestamp: ${new Date(start).toLocaleTimeString()}`);
  }
}
