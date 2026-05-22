export default class UnitCommand {
  description() { return 'Converts basic units'; }
  help(term) { term.writeln('Usage: unit <km-mi|mi-km|c-f|f-c|kg-lb|lb-kg> <value>'); }
  execute(term, params) {
    const mode = params?.[0];
    const value = Number(params?.[1]);
    if (!mode || !Number.isFinite(value)) {
      term.writeln('Usage: unit <km-mi|mi-km|c-f|f-c|kg-lb|lb-kg> <value>');
      return;
    }
    const map = {
      'km-mi': value * 0.621371,
      'mi-km': value * 1.60934,
      'c-f': (value * 9 / 5) + 32,
      'f-c': (value - 32) * 5 / 9,
      'kg-lb': value * 2.20462,
      'lb-kg': value / 2.20462,
    };
    if (!(mode in map)) {
      term.writeln('Unknown conversion mode');
      return;
    }
    term.writeln(String(map[mode]));
  }
}
