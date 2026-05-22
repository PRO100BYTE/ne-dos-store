export default class JokeCommand {
  description() { return 'Shows a random joke'; }
  help(term) { term.writeln('Usage: joke'); }
  async execute(term) {
    try {
      const res = await fetch('https://official-joke-api.appspot.com/random_joke');
      const data = await res.json();
      term.writeln(data.setup);
      term.writeln(data.punchline);
    } catch {
      term.writeln('Failed to load joke.');
    }
  }
}
