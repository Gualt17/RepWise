// Timer di recupero: parte da solo quando si spunta una serie.
// Salviamo l'orario di fine (non i secondi rimasti), così il conto resta giusto
// anche se lo schermo si spegne o l'app viene chiusa e riaperta.

const KEY = 'repwise-timer';
const box = document.getElementById('timer');

let endsAt = 0;
let interval = null;
let audio = null;

box.innerHTML = `
  <span class="timer-label">Recupero</span>
  <strong class="timer-time"></strong>
  <button data-timer="add">+15s</button>
  <button data-timer="skip">Salta</button>`;

const timeText = box.querySelector('.timer-time');
const label = box.querySelector('.timer-label');

box.onclick = (e) => {
  const action = e.target.dataset.timer;
  if (action === 'add') {
    setEnd(Math.max(endsAt, Date.now()) + 15000);
    run();
  }
  if (action === 'skip') stop();
};

export function startTimer(seconds) {
  if (!seconds) return;
  prepareSound(); // va fatto durante un tocco dell'utente, altrimenti il telefono blocca l'audio
  setEnd(Date.now() + seconds * 1000);
  run();
}

// All'avvio dell'app: riprende un timer ancora attivo.
export function resumeTimer() {
  endsAt = Number(localStorage.getItem(KEY)) || 0;
  if (endsAt > Date.now()) run();
}

function setEnd(time) {
  endsAt = time;
  localStorage.setItem(KEY, String(endsAt));
  tick();
}

function run() {
  clearInterval(interval);
  label.textContent = 'Recupero';
  box.hidden = false;
  tick();
  interval = setInterval(tick, 250);
}

function tick() {
  const secondsLeft = Math.ceil((endsAt - Date.now()) / 1000);
  if (secondsLeft <= 0) return finish();
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = String(secondsLeft % 60).padStart(2, '0');
  timeText.textContent = `${minutes}:${seconds}`;
}

function finish() {
  if (interval === null) return;
  clearInterval(interval);
  interval = null;
  localStorage.removeItem(KEY);
  label.textContent = 'Recupero finito';
  timeText.textContent = '0:00';
  beep();
  if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
  setTimeout(() => { if (interval === null) box.hidden = true; }, 4000);
}

function stop() {
  clearInterval(interval);
  interval = null;
  localStorage.removeItem(KEY);
  box.hidden = true;
}

// --- Suono ---

function prepareSound() {
  try {
    audio = audio || new AudioContext();
    audio.resume();
  } catch {
    audio = null;
  }
}

function beep() {
  if (!audio) return;
  const oscillator = audio.createOscillator();
  const volume = audio.createGain();
  oscillator.frequency.value = 880;
  volume.gain.value = 0.2;
  oscillator.connect(volume).connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + 0.5);
}
