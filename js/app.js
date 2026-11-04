// Punto di ingresso: collega ogni indirizzo (#/...) alla schermata corrispondente.
// Usare l'hash dell'URL fa funzionare anche il tasto "indietro" del telefono.

import { showSplitList, showSplit, showDay, showExercise } from './split.js';
import { showCalendar, showCalendarDay, showChooseDay } from './calendar.js';
import { showSession } from './session.js';
import { resumeTimer } from './timer.js';
import { requestPersistentStorage } from './storage.js';

const routes = [
  [/^#\/splits$/, showSplitList],
  [/^#\/split\/(\w+)$/, showSplit],
  [/^#\/split\/(\w+)\/day\/(\w+)$/, showDay],
  [/^#\/split\/(\w+)\/day\/(\w+)\/ex\/(\w+)$/, showExercise],
  [/^#\/calendar(?:\/(\d{4}-\d{2}))?$/, showCalendar],
  [/^#\/day\/(\d{4}-\d{2}-\d{2})$/, showCalendarDay],
  [/^#\/day\/(\d{4}-\d{2}-\d{2})\/new$/, showChooseDay],
  [/^#\/session\/(\w+)$/, showSession],
];

function router() {
  const hash = location.hash || '#/calendar';

  for (const [pattern, show] of routes) {
    const match = hash.match(pattern);
    if (match) {
      highlightTab(hash);
      window.scrollTo(0, 0);
      show(...match.slice(1));
      return;
    }
  }
  location.replace('#/calendar');
}

function highlightTab(hash) {
  const current = hash.startsWith('#/split') ? 'split' : 'calendar';
  document.querySelectorAll('.tabbar a').forEach((a) => {
    a.classList.toggle('active', a.dataset.tab === current);
  });
}

window.addEventListener('hashchange', router);
router();
resumeTimer();
requestPersistentStorage();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}
