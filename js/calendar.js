// Sezione "Calendar": calendario mensile, dettaglio di un giorno e scelta della giornata da allenare.

import { db, save, sessionsOn, inProgressSession } from './storage.js';
import { render, esc, uid, toISO, todayISO, formatDate, formatShortDate, topBar, nameOf } from './utils.js';
import { createSession } from './session.js';

const WEEKDAYS = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];

// Stato di un giorno, usato per colorarlo nel calendario.
function dayStatus(date) {
  const sessions = sessionsOn(date);
  if (sessions.some((s) => s.type === 'workout' && s.status === 'completed')) return 'done';
  if (sessions.some((s) => s.status === 'in_progress')) return 'progress';
  if (sessions.some((s) => s.type === 'rest')) return 'rest';
  return '';
}

// Avviso in alto se c'è un allenamento non terminato (es. app chiusa a metà).
function inProgressBanner() {
  const session = inProgressSession();
  if (!session) return '';
  return `
    <a class="banner" href="#/session/${session.id}">
      <span>Allenamento in corso: <strong>${nameOf(session.dayName, 'Allenamento')}</strong> · ${formatShortDate(session.date)}</span>
      <span>Riprendi ›</span>
    </a>`;
}

// ---------------------------------------------------------------------------
// Calendario mensile
// ---------------------------------------------------------------------------

export function showCalendar(month = todayISO().slice(0, 7)) {
  const [year, monthNumber] = month.split('-').map(Number);
  const firstDay = new Date(year, monthNumber - 1, 1);
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const emptyCells = (firstDay.getDay() + 6) % 7; // la settimana parte da lunedì
  const today = todayISO();

  let cells = '<span></span>'.repeat(emptyCells);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = toISO(new Date(year, monthNumber - 1, d));
    const classes = ['cal-day', dayStatus(date), date === today ? 'today' : ''].join(' ');
    cells += `<a class="${classes}" href="#/day/${date}">${d}</a>`;
  }

  const prevMonth = toISO(new Date(year, monthNumber - 2, 1)).slice(0, 7);
  const nextMonth = toISO(new Date(year, monthNumber, 1)).slice(0, 7);
  const title = firstDay.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
  const isCurrentMonth = month === today.slice(0, 7);

  render(`
    ${inProgressBanner()}
    <header class="cal-head">
      <a class="icon" href="#/calendar/${prevMonth}" aria-label="Mese precedente">‹</a>
      <h1>${title}</h1>
      <a class="icon" href="#/calendar/${nextMonth}" aria-label="Mese successivo">›</a>
    </header>
    <div class="cal-grid">
      ${WEEKDAYS.map((w) => `<span class="cal-weekday">${w}</span>`).join('')}
      ${cells}
    </div>
    <div class="legend">
      <span><i class="dot done"></i>Allenamento</span>
      <span><i class="dot rest"></i>Riposo</span>
      <span><i class="dot progress"></i>In corso</span>
    </div>
    ${isCurrentMonth ? '' : '<a class="btn block" href="#/calendar">Torna a oggi</a>'}
    <a class="btn primary block" href="#/day/${today}">Allenamento di oggi</a>
  `);
}

// ---------------------------------------------------------------------------
// Dettaglio di un giorno
// ---------------------------------------------------------------------------

export function showCalendarDay(date) {
  const sessions = sessionsOn(date);

  const rows = sessions.map((s) => {
    if (s.type === 'rest') {
      return `
        <div class="row">
          <span class="row-main"><strong>Giorno di riposo</strong></span>
          <button class="icon" data-action="delete-rest" data-id="${s.id}" aria-label="Rimuovi riposo">✕</button>
        </div>`;
    }
    const doneSets = s.exercises.reduce((sum, ex) => sum + ex.sets.filter((set) => set.done).length, 0);
    const status = s.status === 'completed'
      ? '<span class="badge done">Completato</span>'
      : '<span class="badge progress">In corso</span>';
    return `
      <a class="row" href="#/session/${s.id}">
        <span class="row-main">
          <strong>${nameOf(s.dayName, 'Allenamento')}</strong>
          <small>${esc(s.splitName)} · ${s.exercises.length} esercizi · ${doneSets} serie</small>
        </span>
        ${status}
      </a>`;
  }).join('');

  const isRestDay = sessions.some((s) => s.type === 'rest');

  render(`
    ${topBar(`#/calendar/${date.slice(0, 7)}`, 'Calendario')}
    <h1 class="capitalize">${formatDate(date)}</h1>
    ${rows ? `<div class="list">${rows}</div>` : '<p class="empty">Niente registrato in questo giorno.</p>'}
    <a class="btn primary block" href="#/day/${date}/new">Registra allenamento</a>
    ${isRestDay ? '' : '<button class="btn block" data-action="rest">Segna come riposo</button>'}
  `, {
    click(e) {
      const button = e.target.closest('[data-action]');
      if (button?.dataset.action === 'rest') {
        const rest = { id: uid(), date, type: 'rest', status: 'completed', exercises: [], createdAt: Date.now() };
        db.sessions.push(rest);
        save(rest);
        showCalendarDay(date);
      }
      if (button?.dataset.action === 'delete-rest') {
        db.sessions = db.sessions.filter((s) => s.id !== button.dataset.id);
        save();
        showCalendarDay(date);
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Scelta della giornata della split da allenare
// ---------------------------------------------------------------------------

export function showChooseDay(date) {
  const groups = db.splits
    .filter((split) => split.days.length > 0)
    .map((split) => `
      <h2>${nameOf(split.name)}</h2>
      <div class="list">
        ${split.days.map((day) => `
          <button class="row" data-split="${split.id}" data-day="${day.id}">
            <span class="row-main">
              <strong>${nameOf(day.name)}</strong>
              <small>${day.exercises.length} esercizi</small>
            </span>
            <span class="chevron">›</span>
          </button>`).join('')}
      </div>`).join('');

  render(`
    ${topBar(`#/day/${date}`, formatDate(date))}
    <h1>Quale giornata?</h1>
    ${groups || `
      <p class="empty">Non hai ancora giornate da allenare.</p>
      <a class="btn primary block" href="#/splits">Crea una split</a>`}
  `, {
    click(e) {
      const button = e.target.closest('[data-day]');
      if (!button) return;
      const split = db.splits.find((s) => s.id === button.dataset.split);
      const day = split.days.find((d) => d.id === button.dataset.day);
      const session = createSession(date, split, day);
      // replace: tornando indietro dalla sessione si arriva al giorno, non a questa scelta
      location.replace(`#/session/${session.id}`);
    },
  });
}
