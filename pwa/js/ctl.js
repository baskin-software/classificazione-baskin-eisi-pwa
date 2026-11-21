/* ctl.js by Daniele Lolli (UncleDan) feat. Claude AI - Release 26.1b4 - 2026-11-21 08-28-34 */
/* =====================================================================
   Classificazione Baskin EISI (PWA) - elenchi PREDEFINITI
   Sono gli elenchi con cui parte l'app (e quelli di «Ripristina l'elenco
   predefinito»). Ogni utente può poi modificarli dall'app, in «Squadre,
   CTL e Sezioni», anche importando un file XLSX. Per cambiare i
   predefiniti modificare qui e aggiornare la versione (APP_VERSION in
   app.js e CACHE_NAME in service-worker.js).
   ===================================================================== */

/* Sezioni Territoriali Baskin EISI */
const SEZIONI_TERRITORIALI = [
  'CAMPANIA', 'EMILIA-ROMAGNA', 'FRIULI-VENEZIA GIULIA', 'LAZIO',
  'LOMBARDIA NORD', 'LOMBARDIA SUD', 'LOMBARDIA EST', 'MARCHE',
  "PIEMONTE E VALLE D'AOSTA", 'PUGLIA', 'SICILIA', 'TOSCANA', 'UMBRIA', 'VENETO'
];

/* Una CTL per Sezione Territoriale; l'e-mail si aggiunge quando c'è */
const EMAIL_CTL = {
  'EMILIA-ROMAGNA': 'ctl.emiliaromagna@eisi.it'
};
/* «EMILIA-ROMAGNA» -> «Emilia-Romagna», «PIEMONTE E VALLE D'AOSTA» -> «Piemonte e Valle d'Aosta» */
const nomeSezione = s => String(s).toLowerCase()
  .replace(/(^|[\s-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase())
  .replace(/ E /g, ' e ').replace(/ D'(\p{L})/gu, (m, b) => " d'" + b.toUpperCase());
const CTL_DESTINATARI = SEZIONI_TERRITORIALI.map(s => ({
  nome: 'CTL ' + nomeSezione(s), email: EMAIL_CTL[s] || '', sezione: s
}));
