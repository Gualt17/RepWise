# RepWise

App per creare la propria split di allenamento e registrare le sessioni su un calendario.

È una **web app installabile (PWA)**: HTML, CSS e JavaScript puro, senza framework e senza
passaggi di build. Una volta installata sul telefono si apre a schermo intero come un'app
normale e funziona anche offline. I dati restano salvati sul telefono.

---

## Installare l'app sul telefono

Per installarla il telefono deve aprire l'app da un indirizzo **https**. Il modo più
semplice e gratuito è pubblicarla su **GitHub Pages**. Lo fai una volta sola, in circa 10 minuti.

### Passo 1: pubblicare l'app su GitHub Pages (una volta sola)

1. Crea un account gratuito su <https://github.com> (se non ce l'hai).
2. In alto a destra clicca **+** e poi **New repository**.
   - *Repository name*: `repwise`
   - Seleziona **Public** (GitHub Pages gratuito richiede un repository pubblico).
   - Clicca **Create repository**.
3. Nella pagina del repository clicca il link **uploading an existing file**.
4. Apri la cartella `RepWise` sul PC, seleziona **tutto il suo contenuto** (`index.html`,
   `manifest.webmanifest`, `sw.js` e le cartelle `css`, `js`, `icons`) e trascinalo nella pagina.
   Poi clicca **Commit changes**.
   > Trascina il *contenuto* della cartella, non la cartella stessa: `index.html` deve
   > trovarsi nella cartella principale del repository.
5. Vai su **Settings** e poi su **Pages** (menu a sinistra).
   - In *Build and deployment* → *Source* scegli **Deploy from a branch**.
   - In *Branch* scegli **main** e la cartella **/ (root)**, poi clicca **Save**.
6. Dopo 1-2 minuti, nella stessa pagina compare l'indirizzo dell'app, del tipo:
   `https://TUO-NOME-UTENTE.github.io/repwise/`

### Passo 2a: installare su Android (Chrome)

1. Apri l'indirizzo `https://TUO-NOME-UTENTE.github.io/repwise/` con **Chrome**.
2. Tocca il menu **⋮** in alto a destra.
3. Tocca **Installa app** (o **Aggiungi a schermata Home**) e conferma.
4. L'icona di RepWise compare nella schermata Home e nel cassetto delle app.

### Passo 2b: installare su iPhone (Safari)

1. Apri l'indirizzo `https://TUO-NOME-UTENTE.github.io/repwise/` con **Safari**
   (deve essere proprio Safari).
2. Tocca il pulsante **Condividi** (il quadrato con la freccia verso l'alto).
3. Scorri e tocca **Aggiungi alla schermata Home**, poi **Aggiungi**.
4. Apri RepWise **dall'icona nella Home**, non da Safari.

Dopo il primo avvio l'app funziona anche senza connessione.

### Aggiornare l'app dopo una modifica

1. Apri `sw.js` e aumenta il numero di versione: `const CACHE = 'repwise-v1';` diventa `'repwise-v2'`.
2. Su GitHub, nel repository, clicca **Add file** → **Upload files** e carica di nuovo i file modificati.
3. Sul telefono apri l'app, chiudila e riaprila: la seconda apertura usa la versione nuova.

I dati salvati non vengono toccati dagli aggiornamenti.

### Da sapere sui dati

- I dati sono salvati **solo su quel telefono**, dentro l'app. Non c'è nessun account e nessun cloud.
- **Se disinstalli l'app o cancelli i dati del browser, perdi i dati.** Ogni tanto usa
  **Split → Backup → Esporta dati** e salva il file (su Drive, iCloud, via email...).
  Con **Importa dati** lo ripristini, anche su un altro telefono.
- Su iPhone l'app installata e Safari hanno dati separati.

---

## Provare l'app sul PC

I moduli JavaScript non funzionano aprendo `index.html` con un doppio clic: serve un piccolo
server locale. Dalla cartella del progetto:

```bash
python -m http.server 8000
```

Poi apri <http://localhost:8000> nel browser. Per vederla in formato telefono, in Chrome premi
`F12` e attiva la visualizzazione dispositivo (`Ctrl+Shift+M`).

**Prova veloce sul telefono senza pubblicarla:** con il telefono sulla stessa rete Wi-Fi del PC,
apri `http://IP-DEL-PC:8000` (l'IP lo trovi con il comando `ipconfig`, alla voce *Indirizzo IPv4*).
Va bene per provarla, ma così l'app non funziona offline e si apre solo con il PC acceso.
Per l'uso vero conviene GitHub Pages.

---

## Come funziona

### Funzioni principali

**Split**
- Puoi creare più split, ognuna con le sue giornate (Upper A, Push, Legs...).
- Per ogni esercizio imposti serie, range di ripetizioni, recupero, RIR e RPE (facoltativi) e note. Puoi aggiungere anche esercizi cardio (durata e note).
- Puoi riordinare giornate ed esercizi con le frecce ↑ ↓ ed eliminarli.

**Calendar**
- Calendario mensile: verde = allenamento completato, grigio = riposo, arancione = sessione in corso.
- Toccando un giorno puoi registrare un allenamento (scegliendo una giornata della split) o segnarlo come riposo.
- Nella sessione inserisci carico, ripetizioni, RIR, RPE e note. Puoi aggiungere o togliere serie ed esercizi e cambiarne l'ordine.
- Quando spunti ✓ una serie:
  - i campi vuoti di carico e ripetizioni si riempiono con i valori della volta scorsa (sono quelli in grigio);
  - parte il **timer di recupero**, che suona e vibra alla fine.
- Per ogni esercizio vedi **l'ultima volta** che l'hai fatto e un suggerimento: mantieni o migliora, senza obblighi.
- Se c'è uno storico vedi anche il **riscaldamento** consigliato: 1ª serie al 50% e 2ª al 75% del carico. Queste serie non vengono contate tra quelle allenanti.
- Tutto si salva a ogni tocco. Se chiudi l'app a metà allenamento, al riavvio trovi il banner **Riprendi**.

Le sessioni salvano una **copia** degli esercizi della split. Se modifichi la split, gli
allenamenti già registrati non cambiano.

### Struttura del codice

```
index.html            pagina unica dell'app
manifest.webmanifest  nome, icona e colori per l'installazione
sw.js                 service worker: funzionamento offline
css/style.css         tutto lo stile (tema chiaro e scuro automatico)
icons/                icone dell'app
js/
  app.js        avvio e "router": collega ogni indirizzo #/... alla sua schermata
  storage.js    lettura e salvataggio dei dati (contiene anche la struttura dei dati)
  utils.js      funzioni di supporto (render, date, numeri...)
  split.js      schermate della sezione Split
  calendar.js   calendario, dettaglio del giorno, scelta della giornata
  session.js    registrazione dell'allenamento, storico, riscaldamento
  timer.js      timer di recupero
```

Ogni schermata è una funzione `showQualcosa()`. La funzione genera l'HTML con un template
string e lo passa a `render()` insieme ai gestori dei clic e degli input.

### Sincronizzazione cloud in futuro

Tutti gli accessi ai dati passano da `js/storage.js`. Per aggiungere la sincronizzazione
basta modificare `load()` e `save()` in quel file (ad esempio per inviare le modifiche a un
server). Ogni split e ogni sessione hanno già un `id` univoco e un campo `updatedAt`, utili
per unire i dati tra più dispositivi.
