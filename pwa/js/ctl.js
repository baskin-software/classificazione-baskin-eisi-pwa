/* ctl.js by Daniele Lolli (UncleDan) feat. Claude AI - Release 26.0b9 - 2026-11-18 17-15-43 */
/* =====================================================================
   Classificazione Baskin EISI (PWA) - elenco PREDEFINITO delle CTL
   È l'elenco con cui parte l'app (e quello di «Ripristina l'elenco
   predefinito»). Ogni utente può poi modificarlo dall'app, in
   «Squadre e CTL», anche importando un CSV. Per cambiare il predefinito
   basta una riga { nome: 'CTL <Regione>', email: '<indirizzo>' } e
   aggiornare la versione (APP_VERSION in app.js e CACHE_NAME in
   service-worker.js).
   ===================================================================== */
const CTL_DESTINATARI = [
  { nome: 'CTL Emilia-Romagna', email: 'ctl.emiliaromagna@eisi.it' },
  { nome: 'CTL Toscana',        email: 'ctl.toscana@eisi.it' },
];
