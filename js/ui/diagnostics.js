/**
 * An on-page sound check, for phones where the console is out of reach. Errors always show; add `?debug` to the
 * address to also see the audio's state live.
 */
const box = document.createElement('div');
box.className = 'diag';
box.setAttribute('role', 'status');
const lines = [];
let status = '';

function render() {
  box.textContent = [status, ...lines].filter(Boolean).join('\n');
  box.hidden = !box.textContent;
}

/** Show a problem (kept, newest last). */
export function report(message) {
  lines.push(message);
  if (lines.length > 6) lines.shift();
  render();
}

/** @param probe () => string, the live line, shown only with ?debug */
export function startDiagnostics(probe) {
  box.hidden = true;
  document.body.appendChild(box);
  addEventListener('error', e => report('Error: ' + (e.message || e.type)));
  addEventListener('unhandledrejection', e => { if (!e.reason?.reported) report('Error: ' + (e.reason?.message || e.reason)); });
  if (!new URLSearchParams(location.search).has('debug')) return;
  setInterval(() => { status = probe(); render(); }, 300);
}
