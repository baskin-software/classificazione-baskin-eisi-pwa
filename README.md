# Classificazione Baskin EISI (PWA)

## Cos'è il Baskin

Il Baskin è uno sport fondato sul basket, inclusivo per progettazione, che prevede per regolamento la partecipazione simultanea degli atleti senza divisione in categorie grazie ad un sistema basato sui ruoli in campo: atleti di entrambi i sessi, con e senza disabilità, con disabilità fisiche e/o cognitive giocano insieme sullo stesso campo la stessa partita. Il regolamento del Baskin è una proprietà intellettuale di *Associazione Baskin* ed i campionati in Italia sono organizzati da *EISI - Ente Italiano Sport Inclusivi*, Ente di Promozione Paralimpica riconosciuto dal *Comitato Italiano Paralimpico*.

Per approfondire: [baskin.it](https://baskin.it) · [eisi.it](https://eisi.it)

> I loghi «EISI» e «Baskin» sono marchi registrati rispettivamente da Ente
> Italiano Sport Inclusivi e Associazione Baskin.

---

## La PWA

PWA per compilare da **smartphone**, anche **completamente offline**, la
**Griglia di valutazione delle abilità in partita** (ruoli 3, 4 e 5) prevista
dall'*Allegato A al regolamento di gioco - La classificazione dei ruoli nel
Baskin (rev. 1 settembre 2025)*. Pensata per essere ospitata su **GitHub Pages**.

<p align="center">
  <a href="https://uncledan.github.io/classificazione-baskin-eisi-pwa/pwa/"><img src="https://img.shields.io/badge/%E2%96%B6%20Apri%20la%20PWA-2962FF?style=for-the-badge&logoColor=white" alt="Apri la PWA"></a>
</p>

### Funzioni

- **Sessione**: si sceglie se la sessione è di **Griglia** (valutazione delle
  abilità in partita) o di **Percorsi** (A, B, C). Numero di giocatori
  consigliato: **4** per la griglia, **20** per i percorsi.
- **Inserimento dei giocatori**: squadra e numero di maglia obbligatori,
  cognome e nome, data di nascita e sesso facoltativi (il sesso serve per il
  Percorso B e viene chiesto all'avvio del B se manca); per la griglia anche
  il **colore della maglia** (selettore del Tabellone Baskin EISI: otto colori
  base più colore personalizzato) e il ruolo attuale. Dopo ogni inserimento
  l'app chiede se aggiungere un altro giocatore, fino alla risposta "No" o al
  numero consigliato; oltre si può ancora aggiungere dalla pulsantiera, con
  richiesta di conferma ogni volta.
- **Pulsantiera giocatori**: un pulsante per giocatore con stato,
  punteggio/esito e pulsante di stampa; nelle sessioni Griglia è nel colore
  della maglia, nelle sessioni Percorsi è bluette (M) o fucsia (F) secondo il
  sesso. Con più di 6 giocatori la pulsantiera diventa compatta.
- **Griglia**: menu delle cinque abilità più la voce Malus; ogni abilità si
  apre, si sceglie il livello, si **conferma** e si torna al menu; calcolo
  automatico (malus solo nella fascia prevista), confronto con il ruolo
  attuale, **conferma finale** con richiesta di conferma e poi stampa.
- **Percorsi**: per ogni giocatore scelta del percorso, menu delle tre prove,
  prova con **cronometro a 7 segmenti** (cifre del Tabellone; avvio/arresto
  anche toccando il display, schermo sempre acceso durante la misura) o tempo
  inserito a mano, criteri con punteggio automatico e **Conferma**. Esito
  secondo le tabelle "In sintesi": A → Ruolo 3, Ruolo 4 o Percorso C;
  B → Ruolo 4, Ruolo 4 da monitorare o Ruolo 5; C → verifica 3/4 (soglia 20")
  o 2/2R (soglia 40") su due prove su tre. Dopo la conferma finale si attiva la
  stampa e si può avviare il percorso successivo per lo stesso giocatore
  (A → B oppure A → C).
- **Stampa**: scheda risultati della griglia o scheda del percorso, da stampare
  / salvare come PDF o da scaricare come **HTML autonomo**. L'app tiene conto
  di cosa è già stato stampato: quando si chiude la sessione, se ne inizia
  un'altra o si esce dall'app con il tasto Indietro dalla home, chiede se
  stampare le valutazioni confermate rimanenti (un'unica stampa, una scheda per
  pagina). Riaprendo l'app, la home segnala le valutazioni ancora da stampare.
- **Aiuti contestuali** (pulsante **?**): livelli con il profilo di ruolo,
  esempi per ruolo dalla *Tabella delle casistiche in forma estesa*, note della
  legenda pertinenti, soglie, schemi e tabelle dei percorsi.
- **Testo integrale** dell'Allegato A, con indice, tabelle, esempi di calcolo e
  schemi dei percorsi A, B e C.
- **Archivio** delle griglie e dei percorsi confermati, con **media matematica**
  delle valutazioni dello stesso giocatore (squadra + numero), ristampa ed
  esportazione/importazione in JSON.

### Privacy

Tutti i dati restano sul dispositivo (memoria del browser): nessun dato viene
inviato in rete.

---

## Struttura

```
pwa/
  index.html              schermate + testo integrale
  manifest.webmanifest
  service-worker.js       cache-first, offline completo
  css/styles.css
  js/data.js              testi della griglia, forma estesa, legenda, malus
  js/logos.js             loghi SVG come data URI (per l'export HTML)
  js/app.js               logica (griglia, archivio, stampa)
  js/seg.js               display a 7 segmenti (dal Tabellone)
  js/percorsi-data.js     tabelle di valutazione dei percorsi
  js/percorsi.js          percorsi A, B, C e cronometro
  icons/                  icone PWA e loghi vettoriali (logos/)
  img/doc/                figure del testo integrale
```

## Versioni

Versionamento allineato al Tabellone Baskin EISI (PWA) e all'app Cast:
`versione.sottoversione[.patch]`, con la versione maggiore pari all'anno a due
cifre. La patch si indica solo quando c'è: il primo rilascio è `26.0`, poi `26.0.1`
per una correzione, `26.1` per nuove funzioni, `27.0` per il primo rilascio
dell'anno successivo. A ogni rilascio aggiornare insieme `APP_VERSION` in
`pwa/js/app.js` e `CACHE_NAME` in `pwa/service-worker.js`, con il tag git
corrispondente (`v26.0`).

## Licenza

MIT — vedi [LICENSE](LICENSE). Il testo dell'Allegato A e i loghi restano dei
rispettivi titolari.
