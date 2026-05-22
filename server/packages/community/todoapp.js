export default class TodoAppCommand {
  description() { return 'Simple TODO manager in BrowserFS'; }
  help(term) { term.writeln('Usage: todoapp <add|list|clear> [text]'); }
  execute(term, params) {
    const fs = window.fs;
    const file = '/todoapp.txt';
    const action = params?.[0] || 'list';
    const text = params?.slice(1).join(' ');
    if (!fs) {
      term.writeln('BrowserFS is unavailable.');
      return;
    }
    if (action === 'clear') {
      if (fs.existsSync(file)) fs.unlinkSync(file);
      term.writeln('TODO list cleared.');
      return;
    }
    if (action === 'add') {
      const prev = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : '';
      fs.writeFileSync(file, `${prev}${prev ? '\n' : ''}- ${text}`);
      term.writeln('Added.');
      return;
    }
    const data = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : 'TODO list is empty.';
    term.writeln(data);
  }
}
