// Sezione "Split": creazione e gestione di split, giornate ed esercizi.

import { db, save, findSplit, replaceAll } from './storage.js';
import { render, esc, val, uid, move, setField, topBar, nameOf, moveButtons, todayISO } from './utils.js';

// Testo riassuntivo di un esercizio, es. "3 × 8–12 · rec 90s · RIR 2"
export function exerciseSummary(ex) {
  if (ex.type === 'cardio') {
    return ex.minutes ? `Cardio · ${ex.minutes} min` : 'Cardio';
  }
  const parts = [];
  const reps = [ex.repMin, ex.repMax].filter((n) => n != null);
  const range = reps.length === 2 && reps[0] !== reps[1] ? `${reps[0]}–${reps[1]}` : reps[0];
  if (ex.sets) parts.push(range != null ? `${ex.sets} × ${range}` : `${ex.sets} serie`);
  if (ex.rest) parts.push(`rec ${ex.rest}s`);
  if (ex.rir != null) parts.push(`RIR ${ex.rir}`);
  if (ex.rpe != null) parts.push(`RPE ${ex.rpe}`);
  return parts.join(' · ');
}

// Campo numerico (tastiera numerica sul telefono, accetta anche la virgola).
const numberInput = (field, value, placeholder = '') =>
  `<input inputmode="decimal" data-field="${field}" data-num value="${val(value)}" placeholder="${placeholder}">`;

// ---------------------------------------------------------------------------
// Elenco delle split + backup
// ---------------------------------------------------------------------------

export function showSplitList() {
  const rows = db.splits.map((split) => `
    <a class="row" href="#/split/${split.id}">
      <span class="row-main">
        <strong>${nameOf(split.name)}</strong>
        <small>${split.days.length} giornate</small>
      </span>
      <span class="chevron">›</span>
    </a>`).join('');

  render(`
    <header class="top"><h1>Split</h1></header>
    ${rows ? `<div class="list">${rows}</div>` : '<p class="empty">Nessuna split. Creane una per iniziare.</p>'}
    <button class="btn primary block" data-action="new-split">+ Nuova split</button>

    <section class="backup">
      <h2>Backup</h2>
      <p class="muted">I dati sono salvati solo su questo telefono. Esporta un backup ogni tanto.</p>
      <div class="buttons">
        <button class="btn" data-action="export">Esporta dati</button>
        <label class="btn">Importa dati
          <input type="file" accept="application/json,.json" data-action="import" hidden>
        </label>
      </div>
    </section>
  `, {
    click(e) {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (action === 'new-split') {
        const split = { id: uid(), name: '', days: [] };
        db.splits.push(split);
        save(split);
        location.hash = `#/split/${split.id}`;
      }
      if (action === 'export') exportData();
    },
    change(e) {
      if (e.target.dataset.action === 'import') importData(e.target.files[0]);
    },
  });
}

async function exportData() {
  const fileName = `repwise-backup-${todayISO()}.json`;
  const file = new File([JSON.stringify(db, null, 2)], fileName, { type: 'application/json' });

  // Sul telefono apre il menu "Condividi" (salva su File, Drive, invia a te stesso...)
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Backup RepWise' });
      return;
    } catch (err) {
      if (err.name === 'AbortError') return; // l'utente ha annullato
    }
  }
  // Altrimenti scarica il file
  const link = document.createElement('a');
  link.href = URL.createObjectURL(file);
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

async function importData(file) {
  if (!file) return;
  if (!confirm('Importare il backup? I dati attuali verranno sostituiti.')) return;
  try {
    replaceAll(JSON.parse(await file.text()));
    alert('Backup importato.');
  } catch {
    alert('File non valido.');
  }
  showSplitList();
}

// ---------------------------------------------------------------------------
// Una split: nome e giornate
// ---------------------------------------------------------------------------

export function showSplit(splitId) {
  const split = findSplit(splitId);
  if (!split) return location.replace('#/splits');

  const rows = split.days.map((day, i) => `
    <div class="row">
      <a class="row-main" href="#/split/${split.id}/day/${day.id}">
        <strong>${nameOf(day.name)}</strong>
        <small>${day.exercises.length} esercizi</small>
      </a>
      ${moveButtons(i)}
    </div>`).join('');

  render(`
    ${topBar('#/splits', 'Split')}
    <label class="field">
      <span>Nome split</span>
      <input data-field="name" value="${val(split.name)}" placeholder="Es. Upper / Lower" ${split.name ? '' : 'data-autofocus'}>
    </label>

    <h2>Giornate</h2>
    ${rows ? `<div class="list">${rows}</div>` : '<p class="empty">Aggiungi la prima giornata (es. Upper A, Push, Legs).</p>'}
    <button class="btn primary block" data-action="add-day">+ Aggiungi giornata</button>
    <button class="btn danger block" data-action="delete-split">Elimina split</button>
  `, {
    input(e) {
      setField(split, e.target);
      save(split);
    },
    click(e) {
      const button = e.target.closest('[data-action]');
      const action = button?.dataset.action;
      if (action === 'up' || action === 'down') {
        move(split.days, Number(button.dataset.index), action === 'up' ? -1 : 1);
        save(split);
        showSplit(splitId);
      }
      if (action === 'add-day') {
        const day = { id: uid(), name: '', exercises: [] };
        split.days.push(day);
        save(split);
        location.hash = `#/split/${split.id}/day/${day.id}`;
      }
      if (action === 'delete-split' && confirm('Eliminare questa split? Le sessioni già registrate restano nel calendario.')) {
        db.splits.splice(db.splits.indexOf(split), 1);
        save();
        location.replace('#/splits');
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Una giornata: nome ed esercizi
// ---------------------------------------------------------------------------

export function showDay(splitId, dayId) {
  const split = findSplit(splitId);
  const day = split?.days.find((d) => d.id === dayId);
  if (!day) return location.replace(split ? `#/split/${splitId}` : '#/splits');

  const base = `#/split/${split.id}/day/${day.id}`;
  const rows = day.exercises.map((ex, i) => `
    <div class="row">
      <a class="row-main" href="${base}/ex/${ex.id}">
        <strong>${nameOf(ex.name)}</strong>
        <small>${esc(exerciseSummary(ex))}</small>
      </a>
      ${moveButtons(i)}
    </div>`).join('');

  render(`
    ${topBar(`#/split/${split.id}`, split.name || 'Split')}
    <label class="field">
      <span>Nome giornata</span>
      <input data-field="name" value="${val(day.name)}" placeholder="Es. Upper A" ${day.name ? '' : 'data-autofocus'}>
    </label>

    <h2>Esercizi</h2>
    ${rows ? `<div class="list">${rows}</div>` : '<p class="empty">Nessun esercizio.</p>'}
    <div class="buttons">
      <button class="btn primary" data-action="add-strength">+ Esercizio</button>
      <button class="btn" data-action="add-cardio">+ Cardio</button>
    </div>
    <button class="btn danger block" data-action="delete-day">Elimina giornata</button>
  `, {
    input(e) {
      setField(day, e.target);
      save(split);
    },
    click(e) {
      const button = e.target.closest('[data-action]');
      const action = button?.dataset.action;
      if (action === 'up' || action === 'down') {
        move(day.exercises, Number(button.dataset.index), action === 'up' ? -1 : 1);
        save(split);
        showDay(splitId, dayId);
      }
      if (action === 'add-strength' || action === 'add-cardio') {
        const ex = action === 'add-cardio'
          ? { id: uid(), type: 'cardio', name: '', minutes: 20, notes: '' }
          : { id: uid(), type: 'strength', name: '', sets: 3, repMin: 8, repMax: 12, rest: 90, rir: null, rpe: null, notes: '' };
        day.exercises.push(ex);
        save(split);
        location.hash = `${base}/ex/${ex.id}`;
      }
      if (action === 'delete-day' && confirm('Eliminare questa giornata?')) {
        split.days.splice(split.days.indexOf(day), 1);
        save(split);
        location.replace(`#/split/${split.id}`);
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Un esercizio: configurazione
// ---------------------------------------------------------------------------

export function showExercise(splitId, dayId, exId) {
  const split = findSplit(splitId);
  const day = split?.days.find((d) => d.id === dayId);
  const ex = day?.exercises.find((x) => x.id === exId);
  if (!ex) return location.replace(day ? `#/split/${splitId}/day/${dayId}` : '#/splits');

  const dayLink = `#/split/${split.id}/day/${day.id}`;

  const fields = ex.type === 'cardio'
    ? `
      <label class="field"><span>Durata (minuti)</span>${numberInput('minutes', ex.minutes)}</label>`
    : `
      <div class="grid2">
        <label class="field"><span>Serie</span>${numberInput('sets', ex.sets)}</label>
        <label class="field"><span>Recupero (secondi)</span>${numberInput('rest', ex.rest)}</label>
        <label class="field"><span>Ripetizioni min</span>${numberInput('repMin', ex.repMin)}</label>
        <label class="field"><span>Ripetizioni max</span>${numberInput('repMax', ex.repMax)}</label>
        <label class="field"><span>RIR (facoltativo)</span>${numberInput('rir', ex.rir)}</label>
        <label class="field"><span>RPE (facoltativo)</span>${numberInput('rpe', ex.rpe)}</label>
      </div>`;

  render(`
    ${topBar(dayLink, day.name || 'Giornata')}
    <h1>${ex.type === 'cardio' ? 'Cardio' : 'Esercizio'}</h1>
    <label class="field">
      <span>Nome</span>
      <input data-field="name" value="${val(ex.name)}" placeholder="${ex.type === 'cardio' ? 'Es. Cyclette' : 'Es. Panca piana'}" ${ex.name ? '' : 'data-autofocus'}>
    </label>
    ${fields}
    <label class="field">
      <span>Note personali</span>
      <textarea data-field="notes" rows="3" placeholder="Es. presa stretta, pausa al petto">${esc(ex.notes)}</textarea>
    </label>
    <a class="btn primary block" href="${dayLink}">Fatto</a>
    <button class="btn danger block" data-action="delete">Elimina esercizio</button>
  `, {
    input(e) {
      setField(ex, e.target);
      save(split);
    },
    click(e) {
      if (e.target.dataset.action === 'delete' && confirm('Eliminare questo esercizio?')) {
        day.exercises.splice(day.exercises.indexOf(ex), 1);
        save(split);
        location.replace(dayLink);
      }
    },
  });
}
