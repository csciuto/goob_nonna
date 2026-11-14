/**
 * An on-page sound check, for phones where the console is out of reach. Errors always show; add `?debug` to the
 * address to also see the audio's state live.
 */
const box = document.createElement('div');
box.className = 'diag';
box.setAttribute('role', 'status');
const lines = [];
let status = '';
let small = false;
box.addEventListener('click', () => { small = !small; render(); });   // tap to shrink to one line, again to open

function render() {
  const all = [status, ...lines].filter(Boolean).join('\n');
  box.textContent = small ? all.split('\n')[0] : all;
  box.hidden = !all;
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
