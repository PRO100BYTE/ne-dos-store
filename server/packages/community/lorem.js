export default class LoremCommand {
  description() { return 'Generates lorem ipsum text'; }
  help(term) { term.writeln('Usage: lorem [sentences]'); }
  execute(term, params) {
    const count = Math.min(10, Math.max(1, Number(params?.[0] || 3)));
    const sentences = [
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.',
      'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum.',
      'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia.'
    ];
    term.writeln(sentences.slice(0, count).join(' '));
  }
}
