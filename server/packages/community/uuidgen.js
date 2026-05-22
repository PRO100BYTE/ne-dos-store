export default class UUIDGenCommand {
  description() { return 'Generates UUID v4'; }
  help(term) { term.writeln('Usage: uuidgen'); }
  execute(term) {
    const uuid = globalThis.crypto?.randomUUID?.() || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
      const rnd = Math.random() * 16 | 0;
      const val = ch === 'x' ? rnd : (rnd & 0x3 | 0x8);
      return val.toString(16);
    });
    term.writeln(uuid);
  }
}
