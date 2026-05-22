export default class SHA256Command {
  description() { return 'Calculates SHA-256 for a text'; }
  help(term) { term.writeln('Usage: sha256 <text>'); }
  async execute(term, params) {
    const text = (params || []).join(' ').trim();
    if (!text) {
      term.writeln('Usage: sha256 <text>');
      return;
    }
    const data = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    term.writeln(hashHex);
  }
}
