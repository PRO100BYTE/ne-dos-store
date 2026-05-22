export default class JSONFmtCommand {
  description() { return 'Pretty prints JSON'; }
  help(term) { term.writeln('Usage: jsonfmt <json-string>'); }
  execute(term, params) {
    const input = (params || []).join(' ').trim();
    if (!input) {
      term.writeln('Usage: jsonfmt <json-string>');
      return;
    }
    try {
      const parsed = JSON.parse(input);
      term.writeln(JSON.stringify(parsed, null, 2));
    } catch (error) {
      term.writeln(`Invalid JSON: ${error.message}`);
    }
  }
}
