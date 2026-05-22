export default class TimerXCommand {
  description() { return 'Countdown timer'; }
  help(term) { term.writeln('Usage: timerx <seconds>'); }
  execute(term, params) {
    let left = Number(params?.[0] || 0);
    if (!Number.isFinite(left) || left <= 0) {
      term.writeln('Usage: timerx <seconds>');
      return;
    }
    term.writeln(`Timer started: ${left}s`);
    const id = setInterval(() => {
      left -= 1;
      if (left <= 0) {
        clearInterval(id);
        term.writeln('TIME IS UP');
        return;
      }
      term.writeln(`${left}s left`);
    }, 1000);
  }
}
