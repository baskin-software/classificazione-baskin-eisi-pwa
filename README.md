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

- **Sessione di valutazione** (es. una partita): all'inizio si identifica il
  giocatore — **squadra e numero di maglia obbligatori**, cognome e nome, data
  di nascita, ruolo attuale e Sezione Territoriale facoltativi. Si gestiscono
  **fino a 4 giocatori** per sessione dalla **pulsantiera giocatori**.
- **Menu abilità**: per ogni giocatore le cinque abilità (Difesa, Qualità di
  scelta di tiro, Uso dei due canestri, Coinvolgimento compagni, Movimento
  senza palla) più la voce **Malus**. Si apre un'abilità, si sceglie il livello
  (testo completo dei cinque livelli), si **conferma** e si torna al menu.
- **Calcolo automatico**: somma dei livelli, malus abilitati solo nella fascia
  prevista (Malus H tra 5 e 20, Malus A.A.I.I. tra 21 e 25), punteggio finale,
  ruolo risultante e confronto con il ruolo attuale.
- **Conferma finale**: riepilogo e richiesta di conferma; solo il giocatore
  confermato ha la **stampa della griglia** attiva (dal menu abilità e dalla
  pulsantiera) e viene salvato nell'archivio. Una valutazione confermata si
  può riaprire.
- **Aiuti contestuali** (pulsante **?**): livelli con il profilo di ruolo
  corrispondente, esempi per ruolo tratti dalla *Tabella delle casistiche in
  forma estesa* (con evidenziata la colonna del livello scelto), note della
  legenda pertinenti al testo del livello, soglie e rimandi al testo integrale.
- **Testo integrale** dell'Allegato A, con indice, tabelle dei percorsi,
  esempi di calcolo e schemi dei percorsi A, B e C.
- **Output**: scheda *Risultati griglia di valutazione delle abilità in
  partita* compilata, da **stampare / salvare come PDF** oppure da scaricare
  come **file HTML autonomo** (loghi incorporati, stampabile a sua volta).
- **Archivio** delle valutazioni confermate, con **media matematica** delle
  valutazioni dello stesso giocatore (squadra + numero), nuova valutazione ed
  esportazione/importazione in JSON.
- **Percorsi**: pulsante e schermata segnaposto; il selettore dei percorsi con
  cronometro arriverà in una prossima versione.

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
  js/app.js               logica
  icons/                  icone PWA e loghi vettoriali (logos/)
  img/doc/                figure del testo integrale
```

Ad ogni rilascio aggiornare insieme `APP_VERSION` in `js/app.js` e
`CACHE_NAME` in `service-worker.js`.

## Licenza

MIT — vedi [LICENSE](LICENSE). Il testo dell'Allegato A e i loghi restano dei
rispettivi titolari.
