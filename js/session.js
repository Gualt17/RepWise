// Registrazione di una sessione di allenamento.

import { db, save, findSession } from './storage.js';
import {
  render, esc, val, uid, move, setField, topBar, nameOf,
  formatDate, formatShortDate, roundWeight, kg,
} from './utils.js';
import { exerciseSummary } from './split.js';
import { startTimer } from './timer.js';

const DEFAULT_REST = 90; // secondi, per gli esercizi aggiunti durante la sessione

const emptySet = (type) => (type === 'cardio'
  ? { minutes: null, km: null, done: false }
  : { weight: null, reps: null, rir: null, rpe: null, done: false });

// Esercizio della sessione creato a partire da un esercizio della split.
// "target" è una copia: modificare la split in futuro non cambierà questa sessione.
function sessionExercise(ex) {
  const count = ex.type === 'cardio' ? 1 : ex.sets || 1;
  return {
    id: uid(),
    name: ex.name,
    type: ex.type,
    target: { ...ex },
    notes: '',
    sets: Array.from({ length: count }, () => emptySet(ex.type)),
  };
}

export function createSession(date, split, day) {
  const session = {
    id: uid(),
    date,
    type: 'workout',
    status: 'in_progress',
    splitName: split.name,
    dayName: day.name,
    notes: '',
    createdAt: Date.now(),
    exercises: day.exercises.map(sessionExercise),
  };
  db.sessions.push(session);
  save(session);
  return session;
}

// ---------------------------------------------------------------------------
// Storico
// ---------------------------------------------------------------------------

const hasData = (set) => (set.reps ?? set.weight ?? set.minutes ?? set.km) != null;

// Ultima volta in cui è stato fatto lo stesso esercizio (stesso nome), prima di questa sessione.
function lastPerformance(session, ex) {
  const name = ex.name.trim().toLowerCase();
  if (!name) return null;

  const previous = db.sessions
    .filter((s) => s.type === 'workout' && s.id !== session.id)
    .filter((s) => s.date < session.date || (s.date === session.date && s.createdAt < session.createdAt))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);

  for (const s of previous) {
    const match = s.exercises.find((e) => e.type === ex.type && e.name.trim().toLowerCase() === name);
    const sets = match?.sets.filter(hasData) ?? [];
    if (sets.length) return { date: s.date, sets };
  }
  return null;
}

function formatSet(set, type) {
  if (type === 'cardio') {
    return [set.minutes != null && `${set.minutes} min`, set.km != null && `${kg(set.km)} km`].filter(Boolean).join(' · ');
  }
  if (set.weight == null) return `${set.reps} rip`;
  return `${kg(set.weight)}×${set.reps ?? '?'}`;
}

// Serie migliore: carico più alto, a parità di carico più ripetizioni.
function bestSet(sets) {
  return sets.reduce((best, s) =>
    ((s.weight ?? 0) > (best.weight ?? 0) || ((s.weight ?? 0) === (best.weight ?? 0) && (s.reps ?? 0) > (best.reps ?? 0)) ? s : best));
}

function historyBlock(session, ex) {
  const last = lastPerformance(session, ex);
  if (!last) return '<div class="history"></div>';

  let html = `
    <div class="history">
      <p><strong>Ultima volta</strong> (${formatShortDate(last.date)}): ${last.sets.map((s) => formatSet(s, ex.type)).join(' · ')}</p>`;

  if (ex.type === 'cardio') {
    html += '<p class="hint">Suggerimento: mantieni o migliora durata e distanza.</p>';
  } else {
    const best = bestSet(last.sets);
    const atTopOfRange = ex.target.repMax != null && best.reps >= ex.target.repMax;
    html += `<p class="hint">Suggerimento: mantieni ${formatSet(best, ex.type)} o prova a fare una ripetizione in più.
      ${atTopOfRange ? 'Sei in cima al range: se te la senti, puoi aumentare leggermente il carico.' : ''}</p>`;

    // Riscaldamento calcolato sul carico allenante (il più alto della volta scorsa)
    if (best.weight > 0) {
      html += `<p class="warmup">Riscaldamento (non conta come serie):
        1ª ${kg(roundWeight(best.weight * 0.5))} kg · 2ª ${kg(roundWeight(best.weight * 0.75))} kg</p>`;
    }
  }
  return html + '</div>';
}

// ---------------------------------------------------------------------------
// Schermata della sessione
// ---------------------------------------------------------------------------

const numberCell = (field, value, placeholder) =>
  `<input inputmode="decimal" data-field="${field}" data-num value="${val(value)}" placeholder="${val(placeholder)}">`;

function setRow(ex, set, index, last) {
  // Come suggerimento grigio si mostra il valore della volta scorsa
  const previous = last?.sets[index] ?? last?.sets[last.sets.length - 1] ?? {};
  const cells = ex.type === 'cardio'
    ? numberCell('minutes', set.minutes, previous.minutes ?? ex.target.minutes)
      + numberCell('km', set.km, previous.km)
    : numberCell('weight', set.weight, previous.weight)
      + numberCell('reps', set.reps, previous.reps)
      + numberCell('rir', set.rir, ex.target.rir)
      + numberCell('rpe', set.rpe, ex.target.rpe);

  return `
    <div class="set-row ${ex.type} ${set.done ? 'done' : ''}" data-set="${index}">
      <span class="set-n">${index + 1}</span>
      ${cells}
      <input type="checkbox" data-field="done" ${set.done ? 'checked' : ''} aria-label="Serie completata">
    </div>`;
}

function exerciseCard(session, ex, index) {
  const last = lastPerformance(session, ex);
  const header = ex.type === 'cardio'
    ? '<span>min</span><span>km</span>'
    : '<span>kg</span><span>rip</span><span>RIR</span><span>RPE</span>';
  const summary = exerciseSummary(ex.target);

  return `
    <section class="card" data-ex="${index}">
      <div class="card-head">
        <input class="ex-name" data-field="name" value="${val(ex.name)}" placeholder="Nome esercizio">
        <button class="icon" data-action="up" aria-label="Sposta su">↑</button>
        <button class="icon" data-action="down" aria-label="Sposta giù">↓</button>
        <button class="icon" data-action="remove-ex" aria-label="Elimina esercizio">✕</button>
      </div>
      ${summary ? `<p class="target">${esc(summary)}</p>` : ''}
      ${ex.target.notes ? `<p class="target-notes">${esc(ex.target.notes)}</p>` : ''}
      ${historyBlock(session, ex)}
      <div class="set-row ${ex.type} head"><span>#</span>${header}<span>✓</span></div>
      ${ex.sets.map((set, i) => setRow(ex, set, i, last)).join('')}
      <div class="buttons">
        <button class="btn small" data-action="add-set">+ Serie</button>
        <button class="btn small" data-action="remove-set">− Serie</button>
      </div>
      <input class="notes" data-field="notes" value="${val(ex.notes)}" placeholder="Note esercizio">
    </section>`;
}

export function showSession(sessionId) {
  const session = findSession(sessionId);
  if (!session || session.type !== 'workout') return location.replace('#/calendar');

  const isDone = session.status === 'completed';

  render(`
    ${topBar(`#/day/${session.date}`, formatDate(session.date))}
    <h1>${nameOf(session.dayName, 'Allenamento')}</h1>
    <p class="muted">${esc(session.splitName)} ·
      ${isDone ? '<span class="badge done">Completato</span>' : '<span class="badge progress">In corso</span>'}</p>

    ${session.exercises.map((ex, i) => exerciseCard(session, ex, i)).join('')}

    <div class="buttons">
      <button class="btn" data-action="add-strength">+ Esercizio</button>
      <button class="btn" data-action="add-cardio">+ Cardio</button>
    </div>

    <label class="field">
      <span>Note allenamento</span>
      <textarea data-field="notes" rows="3" placeholder="Come è andata?">${esc(session.notes)}</textarea>
    </label>

    ${isDone ? '' : '<button class="btn primary block" data-action="finish">Termina allenamento</button>'}
    <button class="btn danger block" data-action="delete">Elimina sessione</button>
  `, {
    input(e) {
      setField(objectFor(session, e.target), e.target);
      save(session);
    },
    change(e) {
      const field = e.target.dataset.field;
      if (field === 'done') onSetDone(session, e.target);
      if (field === 'name') {
        // Aggiorna lo storico ora che l'esercizio ha un nome
        const card = e.target.closest('[data-ex]');
        card.querySelector('.history').outerHTML = historyBlock(session, session.exercises[card.dataset.ex]);
      }
    },
    click(e) {
      const button = e.target.closest('[data-action]');
      if (button) onAction(session, button.dataset.action, button);
    },
  });
}

// Oggetto da aggiornare quando cambia un campo: la serie, l'esercizio o la sessione.
function objectFor(session, input) {
  const card = input.closest('[data-ex]');
  if (!card) return session;
  const ex = session.exercises[card.dataset.ex];
  const row = input.closest('[data-set]');
  return row ? ex.sets[row.dataset.set] : ex;
}

function onSetDone(session, checkbox) {
  const ex = session.exercises[checkbox.closest('[data-ex]').dataset.ex];
  const set = ex.sets[checkbox.closest('[data-set]').dataset.set];
  set.done = checkbox.checked;

  if (set.done) {
    // Carico/ripetizioni vuoti → si usa il valore suggerito (così basta toccare ✓ se ripeti la volta scorsa).
    // RIR e RPE invece restano vuoti se non inseriti.
    checkbox.closest('[data-set]').querySelectorAll('input[data-num]').forEach((input) => {
      const autoFill = ['weight', 'reps', 'minutes', 'km'].includes(input.dataset.field);
      if (autoFill && input.value === '' && input.placeholder !== '') {
        input.value = input.placeholder;
        setField(set, input);
      }
    });
    if (ex.type !== 'cardio') startTimer(ex.target.rest ?? DEFAULT_REST);
  }
  checkbox.closest('[data-set]').classList.toggle('done', set.done);
  save(session);
}

function onAction(session, action, button) {
  const card = button.closest('[data-ex]');
  const index = card ? Number(card.dataset.ex) : -1;
  const ex = session.exercises[index];

  switch (action) {
    case 'up':
    case 'down':
      move(session.exercises, index, action === 'up' ? -1 : 1);
      break;
    case 'remove-ex':
      if (!confirm(`Eliminare "${ex.name || 'esercizio'}" da questa sessione?`)) return;
      session.exercises.splice(index, 1);
      break;
    case 'add-set':
      ex.sets.push(emptySet(ex.type));
      break;
    case 'remove-set': {
      const lastSet = ex.sets[ex.sets.length - 1];
      if (!lastSet) return;
      if (hasData(lastSet) && !confirm('Eliminare l\'ultima serie?')) return;
      ex.sets.pop();
      break;
    }
    case 'add-strength':
    case 'add-cardio': {
      const type = action === 'add-cardio' ? 'cardio' : 'strength';
      session.exercises.push(sessionExercise({ type, name: '', sets: 3, rest: DEFAULT_REST }));
      save(session);
      showSession(session.id);
      // Porta il cursore sul nome del nuovo esercizio
      const names = document.querySelectorAll('.ex-name');
      names[names.length - 1].focus();
      return;
    }
    case 'finish':
      session.status = 'completed';
      save(session);
      location.hash = `#/day/${session.date}`;
      return;
    case 'delete':
      if (!confirm('Eliminare questa sessione?')) return;
      db.sessions.splice(db.sessions.indexOf(session), 1);
      save();
      location.replace(`#/day/${session.date}`);
      return;
    default:
      return;
  }
  save(session);
  showSession(session.id);
}
