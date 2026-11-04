// Unico punto in cui l'app legge e scrive i dati.
//
// Oggi i dati vivono nel localStorage del telefono. Per aggiungere in futuro una
// sincronizzazione cloud basterà modificare questo file (load/save), lasciando
// invariate le schermate. Ogni oggetto ha un id univoco e un campo updatedAt,
// utili per unire i dati tra dispositivi.
//
// Struttura dei dati:
// {
//   version: 1,
//   splits: [{ id, name, updatedAt, days: [{ id, name, exercises: [Exercise] }] }],
//   sessions: [{ id, date: 'YYYY-MM-DD', type: 'workout' | 'rest', status: 'in_progress' | 'completed',
//                splitName, dayName, notes, createdAt, updatedAt, exercises: [SessionExercise] }]
// }
//
// Exercise (nella split):
//   forza:  { id, type: 'strength', name, sets, repMin, repMax, rest, rir, rpe, notes }
//   cardio: { id, type: 'cardio', name, minutes, notes }
//
// SessionExercise (nella sessione): { id, name, type, target: {...copia dell'esercizio}, notes, sets: [Set] }
//   Set forza:  { weight, reps, rir, rpe, done }
//   Set cardio: { minutes, km, done }
//
// Le sessioni salvano una COPIA degli esercizi della split (target): così modificare
// la split non cambia gli allenamenti già registrati.

const KEY = 'repwise-data';

export const db = load();

function load() {
  const empty = { version: 1, splits: [], sessions: [] };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    return saved ? { ...empty, ...saved } : empty;
  } catch {
    return empty;
  }
}

// Salva tutto. Se si passa l'oggetto modificato, ne aggiorna la data di modifica.
export function save(changed) {
  if (changed) changed.updatedAt = Date.now();
  localStorage.setItem(KEY, JSON.stringify(db));
}

// Sostituisce tutti i dati (usato dall'importazione del backup).
export function replaceAll(data) {
  if (!Array.isArray(data.splits) || !Array.isArray(data.sessions)) {
    throw new Error('File di backup non valido');
  }
  db.splits = data.splits;
  db.sessions = data.sessions;
  save();
}

// Chiede al browser di non cancellare i dati quando lo spazio scarseggia.
export function requestPersistentStorage() {
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
}

// --- Ricerche ---

export const findSplit = (id) => db.splits.find((s) => s.id === id);

export const findSession = (id) => db.sessions.find((s) => s.id === id);

export const sessionsOn = (date) => db.sessions.filter((s) => s.date === date);

export const inProgressSession = () => db.sessions.find((s) => s.status === 'in_progress');
