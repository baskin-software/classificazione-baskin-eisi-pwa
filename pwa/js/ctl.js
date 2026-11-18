/* ctl.js by Daniele Lolli (UncleDan) feat. Claude AI - Release 26.0b4 - 2026-11-18 13-48-26 */
/* =====================================================================
   Classificazione Baskin EISI (PWA) - destinatari di «Invia alla CTL»
   Per aggiungere una Commissione Tecnica Locale basta una riga
   { nome: 'CTL <Regione>', email: '<indirizzo>' }, nell'ordine in cui
   deve comparire nell'elenco. Dopo la modifica aggiornare la versione
   (APP_VERSION in app.js e CACHE_NAME in service-worker.js).
   ===================================================================== */
const CTL_DESTINATARI = [
  { nome: 'CTL Emilia-Romagna', email: 'ctl.emiliaromagna@eisi.it' },
  { nome: 'CTL Toscana',        email: 'ctl.toscana@eisi.it' },
];
