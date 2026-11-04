// Piccole funzioni di supporto usate da tutte le schermate.

const app = document.getElementById('app');

// Mostra una schermata: sostituisce il contenuto e collega i gestori degli eventi.
// Gli eventi sono gestiti "a delega": un solo gestore per tutta la schermata,
// che guarda gli attributi data-action / data-field dell'elemento toccato.
export function render(html, handlers = {}) {
  app.innerHTML = html;
  app.onclick = handlers.click || null;
  app.oninput = handlers.input || null;
  app.onchange = handlers.change || null;
  const autofocus = app.querySelector('[data-autofocus]');
  if (autofocus) autofocus.focus();
}

// Aggiorna obj[campo] con il valore di un input che ha l'attributo data-field.
// data-num indica un campo numerico, le checkbox salvano true/false.
export function setField(obj, input) {
  const field = input.dataset.field;
  if (!field || !obj) return;
  if (input.type === 'checkbox') obj[field] = input.checked;
  else if ('num' in input.dataset) obj[field] = num(input.value);
  else obj[field] = input.value;
}

// Barra superiore con il link per tornare indietro.
export const topBar = (href, label) =>
  `<header class="top"><a class="back" href="${href}">‹ ${esc(label)}</a></header>`;

// Nome da mostrare, con un testo di riserva se è vuoto.
export const nameOf = (text, fallback = 'Senza nome') => esc(text) || fallback;

// Pulsanti per riordinare un elemento di una lista.
export const moveButtons = (index) => `
  <button class="icon" data-action="up" data-index="${index}" aria-label="Sposta su">↑</button>
  <button class="icon" data-action="down" data-index="${index}" aria-label="Sposta giù">↓</button>`;

// Protegge il testo inserito dall'utente prima di metterlo nell'HTML.
export function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

// Id univoco, abbastanza robusto anche per una futura sincronizzazione.
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Converte il valore di un campo numerico: stringa vuota → null.
export function num(value) {
  if (value === '' || value == null) return null;
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

// Valore da mostrare in un <input>: null → stringa vuota.
export const val = (value) => (value == null ? '' : esc(value));

// Sposta un elemento di una posizione in su (-1) o in giù (+1).
export function move(list, index, delta) {
  const target = index + delta;
  if (target < 0 || target >= list.length) return;
  [list[index], list[target]] = [list[target], list[index]];
}

// --- Date (formato 'YYYY-MM-DD', in ora locale) ---

export function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const todayISO = () => toISO(new Date());

export function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Es. "mar 4 novembre"
export function formatDate(iso, options = { weekday: 'short', day: 'numeric', month: 'long' }) {
  return parseISO(iso).toLocaleDateString('it-IT', options);
}

// Es. "4 nov"
export const formatShortDate = (iso) => formatDate(iso, { day: 'numeric', month: 'short' });

// Arrotonda un carico a 0,5 kg.
export const roundWeight = (kg) => Math.round(kg * 2) / 2;

// Es. 80 → "80", 82.5 → "82,5"
export const kg = (n) => String(n).replace('.', ',');
