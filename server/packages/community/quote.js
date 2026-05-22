export default class QuoteCommand {
  description() { return 'Shows a random quote'; }
  help(term) { term.writeln('Usage: quote'); }
  async execute(term) {
    try {
      const res = await fetch('https://api.quotable.io/random');
      const data = await res.json();
      term.writeln(`"${data.content}"`);
      term.writeln(`- ${data.author}`);
    } catch {
      term.writeln('Failed to load quote.');
    }
  }
}
