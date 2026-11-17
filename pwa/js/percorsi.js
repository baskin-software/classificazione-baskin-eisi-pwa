/* percorsi.js by Daniele Lolli (UncleDan) feat. Claude AI - Release 26.2 - 2026-11-14 18-02-27 */
/* =====================================================================
   Classificazione Baskin EISI (PWA) - Percorsi A, B e C
   Flusso: Selettore → Identificazione atleta → Menu prove
           → Prova (cronometro + criteri, Conferma) → Menu prove
           → Conferma finale (richiesta di conferma) → stampa scheda attiva
   Usa le funzioni comuni definite in app.js ($, esc, store, toast, ...)
   e il display a 7 segmenti di seg.js (dal Tabellone Baskin EISI).
   ===================================================================== */
'use strict';

const KEY_PERC_CUR  = 'classificazione-baskin-eisi-percorso-v1';
const KEY_PERC_ARCH = 'classificazione-baskin-eisi-percorsi-archivio-v1';

let T = store.get(KEY_PERC_CUR, null);   // percorso in corso
let tipoScelto = null;                   // percorso scelto nel selettore (nuovo)
let atletaPrefill = null;                // dati atleta proposti (da un altro percorso)
let varPrefill = null;                   // variante C proposta
let editAtleta = false;                  // modifica dati del percorso in corso
let provaIdx = -1;                       // prova aperta
let PP = null;                           // copia di lavoro della prova aperta

const salvaT = () => { if(T) store.set(KEY_PERC_CUR, T); else store.del(KEY_PERC_CUR); };
const percArchivio = () => store.get(KEY_PERC_ARCH, []);
const salvaPercArchivio = a => store.set(KEY_PERC_ARCH, a);
const percTutti = () => percArchivio().concat(T ? [T] : []);

function nuovoPercorso(tipo){
  return {
    id: uid('p'), tipo, variante: null, stato: 'bozza', creata: new Date().toISOString(), confermata: null,
    dati: { squadra:'', numero:'', nome:'', nascita:'', sesso:'', sezione:'', data: oggiISO(), valutatore:'', note:'' },
    prove: Array.from({length: NUM_PROVE}, () => ({ tempo: null, crit: {}, confermata: false }))
  };
}

const fmtSec = ms => ms == null ? '–' : (ms / 1000).toFixed(2).replace('.', ',');
function fmtCrono(ms){
  ms = Math.max(0, Math.min(ms || 0, 599990));
  const cs = Math.floor(ms / 10), m = Math.floor(cs / 6000), s = Math.floor(cs / 100) % 60, c = cs % 100;
  return `${m}:${String(s).padStart(2,'0')}.${String(c).padStart(2,'0')}`;
}
const etichettaAtleta = d => `${d.squadra || '?'} · n° ${d.numero || '?'}${d.nome ? ' · ' + d.nome : ''}`;

/* =====================================================================
   PUNTEGGI E DECISIONI
   ===================================================================== */
function fascePer(t){ return t.tipo === 'A' ? FASCE_A : t.tipo === 'B' ? FASCE_B[t.dati.sesso || 'M'] : null; }

function puntiProva(t, pr){
  const P = PERCORSI[t.tipo];
  if(t.tipo === 'C') return { completa: pr.tempo != null, totale: null, dett: {} };
  const dett = {}; let tot = 0, completa = true;
  for(const c of P.criteri){
    let p = null;
    if(c.tipo === 'tempo') p = pr.tempo != null ? puntiTempo(fascePer(t), pr.tempo / 1000) : null;
    else if(c.tipo === 'scelta'){ const o = c.opzioni.find(o => o.id === pr.crit[c.id]); p = o ? o.p : null; }
    else if(c.tipo === 'difficolta'){ const v = pr.crit[c.id]; p = Array.isArray(v) ? c.punti[v.length] : null; }
    dett[c.id] = p;
    if(p == null) completa = false; else tot += p;
  }
  return { completa, totale: completa ? tot : null, parziale: tot, dett };
}

/* Esito secondo le tabelle "PERCORSO A/B - IN SINTESI" e il riquadro sul Percorso C */
function esito(t){
  const fatte = t.prove.filter(p => p.confermata);
  const n = fatte.length;
  const out = { n, completo: n === NUM_PROVE, ruolo: null, titolo: '', testo: '', seguito: null, classe: '' };
  if(t.tipo === 'A' || t.tipo === 'B'){
    const tot = fatte.map(p => puntiProva(t, p).totale);
    if(t.tipo === 'A'){
      const almeno16 = tot.filter(x => x >= 16).length;
      const sotto14  = tot.filter(x => x < 14).length;
      if(almeno16 >= 1){
        Object.assign(out, { ruolo:'4', classe:'r4', titolo:'Ruolo 4',
          testo:'In almeno 1 delle tre prove l’atleta ha totalizzato almeno 16 punti: è da considerarsi Ruolo 4.',
          seguito:{ tipo:'B', label:'Verifica il Ruolo 5 con il Percorso B' } });
        if(!out.completo) out.testo += ' (Esito già determinato: le prove previste sono comunque tre.)';
      } else if(sotto14 >= 2){
        Object.assign(out, { ruolo:'3', classe:'r3', titolo:'Ruolo 3',
          testo:'In 2 delle tre prove l’atleta ha acquisito un punteggio inferiore a 14 punti: è da considerarsi Ruolo 3.' });
      } else if(out.completo && tot.every(x => x === 14 || x === 15)){
        Object.assign(out, { ruolo:'C', classe:'rc', titolo:'Percorso C',
          testo:'In tutte e 3 le prove l’atleta ha totalizzato 14/15 punti: deve essere sottoposto al Percorso C (navetta andata e ritorno di 60 metri in palleggio) per meglio individuare il ruolo.',
          seguito:{ tipo:'C', variante:'34', label:'Esegui il Percorso C (verifica 3/4)' } });
      } else if(out.completo){
        Object.assign(out, { ruolo:'?', classe:'rq', titolo:'Caso non previsto',
          testo:`Punteggi ${tot.join(', ')}: la combinazione non rientra nei casi previsti dalla tabella “In sintesi” del Percorso A. Valutare come caso dubbio (eventualmente con il Percorso C) e, se necessario, consultare la Commissione Tecnica.`,
          seguito:{ tipo:'C', variante:'34', label:'Esegui il Percorso C (verifica 3/4)' } });
      }
    } else {
      const alti  = tot.filter(x => x >= 14).length;
      const bassi = tot.filter(x => x <= 13).length;
      if(out.completo && alti === 3){
        Object.assign(out, { ruolo:'5', classe:'r5', titolo:'Ruolo 5',
          testo:'L’atleta ha totalizzato 14/15 punti in tutte e tre le prove: è da considerarsi Ruolo 5.' });
      } else if(bassi === 3){
        Object.assign(out, { ruolo:'4', classe:'r4', titolo:'Ruolo 4',
          testo:'L’atleta è rimasto sotto i 14 punti in tutte e tre le prove: è da considerarsi Ruolo 4.' });
      } else if(out.completo && bassi === 2 && alti === 1){
        Object.assign(out, { ruolo:'4M', classe:'r4', titolo:'Ruolo 4 da monitorare',
          testo:'In due prove su tre l’atleta rimane al di sotto dei 14 punti mentre la terza è di 14/15 punti: è Ruolo 4 da monitorare (per esempio durante le partite) e, arrivato a 14/15 punti, dovrà passare al ruolo superiore. In questo caso il tempo (la velocità) è una discriminante importante.' });
      } else if(!out.completo && bassi >= 2){
        Object.assign(out, { ruolo:'4', classe:'r4', titolo:'Ruolo 4 (provvisorio)',
          testo:'In due prove l’atleta è rimasto sotto i 14 punti: non potrà essere Ruolo 5. Completa la terza prova per sapere se è da monitorare.' });
      } else if(out.completo){
        Object.assign(out, { ruolo:'?', classe:'rq', titolo:'Caso non previsto',
          testo:`Punteggi ${tot.join(', ')}: la combinazione (due prove da 14/15 punti e una sotto i 14) non rientra nei casi previsti dalla tabella “In sintesi” del Percorso B. Valutare come caso dubbio e, se necessario, consultare la Commissione Tecnica.` });
      }
    }
    out.punteggi = tot;
  } else {
    const V = PERCORSI.C.varianti[t.variante || '34'];
    const tempi = fatte.map(p => p.tempo / 1000);
    const sotto = tempi.filter(x => x < V.soglia).length;
    const sopra = tempi.length - sotto;
    if(sotto >= 2){
      Object.assign(out, { ruolo:V.sotto, classe:'r' + V.sotto.toLowerCase(), titolo:'Ruolo ' + V.sotto,
        testo:`In ${sotto} prove su ${tempi.length} il tempo è inferiore a ${V.soglia}”: l’atleta è da considerarsi Ruolo ${V.sotto}.` });
    } else if(sopra >= 2){
      Object.assign(out, { ruolo:V.sopra, classe:'r' + V.sopra.toLowerCase(), titolo:'Ruolo ' + V.sopra,
        testo:`In ${sopra} prove su ${tempi.length} il tempo non è inferiore a ${V.soglia}”: l’atleta è da considerarsi Ruolo ${V.sopra}.` });
    }
    out.tempi = tempi;
    if(out.ruolo && !out.completo) out.testo += ' (Esito già determinato da due prove su tre.)';
  }
  return out;
}

/* =====================================================================
   SELETTORE
   ===================================================================== */
function renderSelettorePercorsi(){
  $('#tilePercCorso').hidden = !T;
  if(T){
    const P = PERCORSI[T.tipo];
    $('#tilePercCorsoS').textContent = `${P.nome} · ${etichettaAtleta(T.dati)} · ${T.prove.filter(p=>p.confermata).length}/3 prove${T.stato === 'confermata' ? ' · confermato' : ''}`;
  }
  $('#percList').innerHTML = ['A','B','C'].map(k => {
    const P = PERCORSI[k];
    return `<div class="perc-card">
      <button class="perc-main" type="button" data-perc-new="${k}">
        <span class="perc-badge big">${k}</span>
        <span class="perc-txt"><b>${esc(P.nome)}</b><small class="perc-scopo">${esc(P.scopo)}</small><small>${esc(P.descr)}</small></span>
      </button>
      <div class="perc-act">
        <button class="btn sm" type="button" data-perc-schema="${k}">Schema</button>
        <button class="btn sm" type="button" data-doc="${P.docTab}">Tabella</button>
        <button class="btn sm btn-pri" type="button" data-perc-new="${k}">Inizia &#8250;</button>
      </div>
    </div>`;
  }).join('');
}

function mostraSchema(k){
  const P = PERCORSI[k];
  apriSheet(`${P.nome} · schema`, [{ nome:'Schema', html:
    `<img class="sheet-img" src="${P.img}" alt="Schema ${esc(P.nome)}" />
     <p class="small muted">${esc(P.descr)}</p>
     <div class="sheet-links"><button class="btn" type="button" data-doc="sez-vi">Allegati nel testo integrale</button>
     <button class="btn" type="button" data-doc="${P.docTab}">Tabella di valutazione</button></div>` }]);
}

function iniziaPercorso(tipo, dati, variante){
  if(T && T.stato !== 'confermata' && T.prove.some(p => p.confermata) &&
     !confirm(`C’è un ${PERCORSI[T.tipo].nome} non confermato (${etichettaAtleta(T.dati)}). Scartarlo e iniziarne uno nuovo?`)) return;
  tipoScelto = tipo; atletaPrefill = dati || null; varPrefill = variante || null; editAtleta = false;
  go('perc-atleta');
}

/* =====================================================================
   IDENTIFICAZIONE ATLETA
   ===================================================================== */
const PA_CAMPI = ['squadra','numero','nome','nascita','sesso','sezione','data','valutatore'];
function renderPercAtleta(){
  const tipo = editAtleta ? T.tipo : tipoScelto;
  const P = PERCORSI[tipo];
  $('#paTitle').textContent = `${P.nome} · ${P.scopo}`;
  const src = editAtleta ? T.dati : (atletaPrefill || {});
  PA_CAMPI.forEach(c => $('#pa_' + c).value = src[c] || '');
  if(!$('#pa_data').value) $('#pa_data').value = oggiISO();
  if(!editAtleta && !atletaPrefill){
    const ultimo = percArchivio()[0];
    if(ultimo && !$('#pa_valutatore').value) $('#pa_valutatore').value = ultimo.dati.valutatore || '';
  }
  $('#paVariante').hidden = tipo !== 'C';
  const v = editAtleta ? T.variante : (varPrefill || '');
  $$('[name="pa_var"]').forEach(r => { r.checked = r.value === v; r.disabled = editAtleta && T.prove.some(p => p.confermata); });
  $('#paSessoReq').hidden = tipo !== 'B';
  $('#paErr').hidden = true;
}
function confermaPercAtleta(){
  const tipo = editAtleta ? T.tipo : tipoScelto;
  const v = {}; PA_CAMPI.forEach(c => v[c] = $('#pa_' + c).value.trim());
  const variante = ($$('[name="pa_var"]').find(r => r.checked) || {}).value || null;
  const err = [];
  if(tipo === 'C' && !variante) err.push('lo scopo della prova');
  if(!v.squadra) err.push('la squadra');
  if(!v.numero) err.push('il numero');
  if(tipo === 'B' && !v.sesso) err.push('il sesso (fasce di tempo diverse per maschi e femmine)');
  if(err.length){ const e = $('#paErr'); e.textContent = 'Inserisci ' + err.join(', ') + '.'; e.hidden = false; return; }
  if(editAtleta){
    Object.assign(T.dati, v); if(tipo === 'C') T.variante = variante; salvaT(); history.back(); return;
  }
  T = nuovoPercorso(tipo); Object.assign(T.dati, v); T.variante = tipo === 'C' ? variante : null;
  salvaT(); popolaSuggerimenti();
  history.replaceState(null, '', '#perc-menu'); show('perc-menu'); window.scrollTo(0,0);
}

/* =====================================================================
   MENU PROVE
   ===================================================================== */
function percGuard(name){
  if(name === 'perc-atleta' && !editAtleta && !tipoScelto) return 'percorsi';
  if(name === 'perc-atleta' && editAtleta && !T) return 'percorsi';
  if((name === 'perc-menu' || name === 'perc-prova') && !T) return 'percorsi';
  if(name === 'perc-prova' && (provaIdx < 0 || !PP)) return 'perc-menu';
  return name;
}

function renderPercMenu(){
  const P = PERCORSI[T.tipo], conf = T.stato === 'confermata';
  $('#appbarTitle').textContent = P.nome;
  $('#pmTipo').textContent = T.tipo;
  $('#pmTitolo').textContent = T.tipo === 'C' ? `${P.nome} · ${PERCORSI.C.varianti[T.variante || '34'].nome}` : `${P.nome} · ${P.scopo}`;
  $('#pmAtleta').textContent = etichettaAtleta(T.dati) + (T.tipo === 'B' && T.dati.sesso ? ` · ${T.dati.sesso}` : '');
  $('#pmLocked').hidden = !conf;
  const e = esito(T);
  $('#pmProve').innerHTML = T.prove.map((pr, i) => {
    const pt = puntiProva(T, pr);
    const info = pr.confermata
      ? `${fmtSec(pr.tempo)} s${T.tipo !== 'C' ? ` · ${pt.totale}/${P.max} punti` : ''}`
      : (pr.tempo != null ? 'in corso' : 'da eseguire');
    const big = pr.confermata ? (T.tipo === 'C' ? fmtSec(pr.tempo) : pt.totale) : '–';
    return `<button class="ab-row ${pr.confermata ? 'set' : ''}" type="button" data-prova="${i}" ${conf ? 'disabled' : ''}>
      <span class="abil-n">${i+1}</span>
      <span class="ab-txt"><b>Prova ${i+1}</b><small>${esc(info)}</small></span>
      <span class="ab-lv ${pr.confermata ? 'on' : ''}">${esc(big)}</span><span class="chev">&#8250;</span></button>`;
  }).join('');

  let html;
  if(!e.n) html = `<p class="muted">Esegui le tre prove: l’esito si calcola dalle prove confermate.</p>`;
  else if(!e.ruolo) html = `<p class="muted">Prove confermate: ${e.n}/3. Esito non ancora determinabile.</p>`;
  else html = `<div class="esito ${e.classe}"><small>${e.completo ? 'Esito' : 'Esito provvisorio'}</small><b>${esc(e.titolo)}</b></div><p>${esc(e.testo)}</p>`;
  if(T.tipo === 'C') html += `<p class="muted small">${esc(PERCORSI.C.varianti[T.variante || '34'].testo)}</p>`;
  if(T.tipo === 'B') html += `<p class="muted small">Fasce di tempo per ${T.dati.sesso === 'F' ? 'femmine' : 'maschi'}.</p>`;
  $('#pmEsito').innerHTML = html;

  const fatte = e.n === NUM_PROVE;
  $('#btnPmConferma').hidden = conf;
  $('#btnPmConferma').disabled = !fatte;
  $('#btnPmStampa').hidden = !conf;
  $('#btnPmHtml').hidden = !conf;
  $('#btnPmRiapri').hidden = !conf;
  $('#btnPmDati').hidden = conf;
  const seg = $('#btnPmSeguito');
  seg.hidden = !(conf && e.seguito);
  if(e.seguito) seg.innerHTML = '&#9654; ' + esc(e.seguito.label);
}

function confermaFinalePercorso(){
  const e = esito(T), P = PERCORSI[T.tipo];
  const righe = T.prove.map((pr, i) => {
    const pt = puntiProva(T, pr);
    return `<tr><td>Prova ${i+1}</td><td class="c">${fmtSec(pr.tempo)} s</td>${T.tipo !== 'C' ? `<td class="c"><b>${pt.totale}</b></td>` : ''}</tr>`;
  }).join('');
  const html = `
    <p><b>${esc(P.nome)}</b> — ${esc(etichettaAtleta(T.dati))}</p>
    <table class="mini conf-t"><tr><th></th><th>Tempo</th>${T.tipo !== 'C' ? `<th>Punti</th>` : ''}</tr>${righe}
      <tr class="hl"><td colspan="${T.tipo !== 'C' ? 2 : 1}"><b>Esito</b></td><td class="c"><b>${esc(e.titolo || '–')}</b></td></tr></table>
    <label class="fld"><span>Note (facoltative)</span><textarea id="pmNote" rows="2">${esc(T.dati.note || '')}</textarea></label>
    <p>Confermi il percorso? Dopo la conferma sarà attiva la stampa della scheda e il percorso verrà salvato nell’archivio.</p>
    <div class="sheet-links two">
      <button class="btn" type="button" data-close="1">Annulla</button>
      <button class="btn btn-pri" type="button" id="btnPercSiConferma">&#10004; Conferma percorso</button>
    </div>`;
  apriSheet('Conferma finale', [{ nome:'Conferma', html }]);
}
function eseguiConfermaPercorso(){
  T.dati.note = ($('#pmNote') || {}).value || '';
  T.stato = 'confermata'; T.confermata = new Date().toISOString();
  const a = percArchivio(); const i = a.findIndex(x => x.id === T.id);
  if(i >= 0) a[i] = clone(T); else a.unshift(clone(T));
  salvaPercArchivio(a); salvaT(); chiudiSheet();
  toast('Percorso confermato: stampa scheda attiva');
  renderPercMenu();
}

/* =====================================================================
   PROVA: cronometro + criteri
   ===================================================================== */
const SW = { running:false, t0:0, raf:0, lock:null };

function apriProva(i){
  provaIdx = i;
  const pr = T.prove[i];
  PP = { tempo: pr.tempo, crit: clone(pr.crit) };
  go('perc-prova');
}

function renderPercProva(){
  const P = PERCORSI[T.tipo];
  $('#appbarTitle').textContent = `${P.nome} · Prova ${provaIdx+1} di 3`;
  const crit = P.criteri.filter(c => c.tipo !== 'tempo');
  $('#ppCriteri').innerHTML = crit.map((c, k) => {
    let corpo;
    if(c.tipo === 'scelta'){
      corpo = c.opzioni.map(o => `
        <button class="opt ${PP.crit[c.id] === o.id ? 'sel' : ''}" type="button" data-crit="${c.id}" data-opt="${o.id}">
          <span class="opt-t">${esc(o.t)}</span><span class="opt-p">${o.p}</span></button>`).join('');
    } else {
      const sel = Array.isArray(PP.crit[c.id]) ? PP.crit[c.id] : null;
      corpo = `<button class="opt ${sel && !sel.length ? 'sel' : ''}" type="button" data-crit="${c.id}" data-diff="none">
          <span class="opt-t">${esc(c.ok)}</span><span class="opt-p">${c.punti[0]}</span></button>` +
        c.difficolta.map(d => `
          <label class="chk opt-chk"><input type="checkbox" data-crit="${c.id}" data-diff="${d.id}" ${sel && sel.includes(d.id) ? 'checked' : ''} />
          <span>${esc(d.t)}</span></label>`).join('') +
        `<p class="muted small">${sel ? `${sel.length} difficoltà → <b>${c.punti[sel.length]} punti</b>` : 'Nessuna scelta'}</p>`;
    }
    return `<fieldset class="card"><legend><span class="abil-n">${k+2}</span> ${esc(c.nome)}</legend>
      ${c.nota && c.tipo === 'scelta' ? `<p class="muted small">${esc(c.nota)}</p>` : ''}<div class="opts">${corpo}</div></fieldset>`;
  }).join('');
  if(T.tipo === 'C'){
    const V = PERCORSI.C.varianti[T.variante || '34'];
    $('#ppCriteri').innerHTML = `<div class="card small">${esc(PERCORSI.C.descr)}<br/><b>Soglia: ${V.soglia}”</b> — ${esc(V.nome)}</div>`;
  }
  aggiornaCrono(); aggiornaTotProva();
}

function tempoCorrente(){ return SW.running ? (PP.tempo || 0) + (performance.now() - SW.t0) : PP.tempo; }

function aggiornaCrono(){
  const ms = tempoCorrente();
  renderSeg($('#swDisplay'), fmtCrono(ms || 0));
  $('#swDisplay').classList.toggle('run', SW.running);
  const go = $('#swGo');
  go.innerHTML = SW.running ? '&#9632; Ferma' : (PP.tempo ? '&#9654; Riprendi' : '&#9654; Avvia');
  go.classList.toggle('stop', SW.running);
  $('#swReset').disabled = SW.running || !PP.tempo;
  const man = $('#swManual');
  man.disabled = SW.running;
  if(!SW.running && document.activeElement !== man) man.value = PP.tempo != null ? (PP.tempo / 1000).toFixed(2) : '';
  let pts = '';
  if(ms != null && !SW.running){
    if(T.tipo === 'C'){
      const V = PERCORSI.C.varianti[T.variante || '34'];
      pts = ms / 1000 < V.soglia ? `sotto ${V.soglia}” → Ruolo ${V.sotto}` : `non sotto ${V.soglia}” → Ruolo ${V.sopra}`;
    } else pts = `${puntiTempo(fascePer(T), ms / 1000)} punti tempo`;
  }
  $('#swPts').textContent = pts;
}

function tick(){ aggiornaCrono(); if(SW.running) SW.raf = requestAnimationFrame(tick); }

async function swToggle(){
  if(SW.running){
    PP.tempo = Math.round(((PP.tempo || 0) + performance.now() - SW.t0) / 10) * 10;   // centesimi
    SW.running = false; cancelAnimationFrame(SW.raf);
    try{ if(SW.lock){ await SW.lock.release(); SW.lock = null; } }catch(_){}
    vibra(60); aggiornaCrono(); aggiornaTotProva();
  } else {
    SW.t0 = performance.now(); SW.running = true; vibra(30);
    try{ if('wakeLock' in navigator) SW.lock = await navigator.wakeLock.request('screen'); }catch(_){}
    tick();
  }
}
function swStopSilenzioso(){
  if(!SW.running) return;
  SW.running = false; cancelAnimationFrame(SW.raf);
  try{ if(SW.lock){ SW.lock.release(); SW.lock = null; } }catch(_){}
}
function vibra(ms){ try{ navigator.vibrate && navigator.vibrate(ms); }catch(_){} }

function aggiornaTotProva(){
  const pr = { tempo: PP.tempo, crit: PP.crit };
  const pt = puntiProva(T, pr);
  let html;
  if(T.tipo === 'C') html = `<b>Tempo:</b> ${PP.tempo != null ? fmtSec(PP.tempo) + ' s' : 'da rilevare'}`;
  else html = `<span>Punteggio della prova</span><b>${pt.completa ? pt.totale : pt.parziale}<small>/${PERCORSI[T.tipo].max}</small></b>${pt.completa ? '' : '<small class="muted">parziale</small>'}`;
  $('#ppTot').innerHTML = html;
  $('#btnPpConferma').disabled = SW.running || !pt.completa;
}

function confermaProva(){
  if(SW.running) return;
  const pr = T.prove[provaIdx];
  pr.tempo = PP.tempo; pr.crit = clone(PP.crit); pr.confermata = true;
  salvaT(); PP = null; provaIdx = -1;
  history.back();
}
function annullaProva(){
  if(SW.running && !confirm('Il cronometro è in funzione. Annullare la prova?')) return;
  swStopSilenzioso(); PP = null; provaIdx = -1; history.back();
}

/* =====================================================================
   SCHEDA STAMPABILE
   ===================================================================== */
function htmlSchedaPercorso(t, logoB, logoE){
  const P = PERCORSI[t.tipo], d = t.dati, e = esito(t);
  let corpo;
  if(t.tipo === 'C'){
    const V = P.varianti[t.variante || '34'];
    corpo = `<p><b>${esc(V.nome)}</b> — soglia ${V.soglia}”. ${esc(V.testo)}</p>
      <table class="ps-ab"><tr><th class="l">Prova</th><th>Tempo impiegato</th><th>Rispetto alla soglia</th></tr>
      ${t.prove.map((pr,i) => `<tr><th class="l">${i+1}^ prova</th><td class="c b">${fmtSec(pr.tempo)} s</td><td class="c">${pr.tempo != null ? (pr.tempo/1000 < V.soglia ? `inferiore a ${V.soglia}”` : `non inferiore a ${V.soglia}”`) : ''}</td></tr>`).join('')}</table>`;
  } else {
    const righe = P.criteri.map((c, k) => {
      const celle = t.prove.map(pr => {
        const pt = puntiProva(t, pr).dett[c.id];
        let lab = '';
        if(c.tipo === 'tempo') lab = `${fmtSec(pr.tempo)} s`;
        else if(c.tipo === 'scelta'){ const o = c.opzioni.find(o => o.id === pr.crit[c.id]); lab = o ? o.breve : ''; }
        else { const v = pr.crit[c.id]; lab = Array.isArray(v) ? (v.length ? v.join('+') : 'Regolare') : ''; }
        return `<td class="c"><small>${esc(lab)}</small><br/><b>${pt ?? ''}</b></td>`;
      }).join('');
      return `<tr><th class="l">CRITERIO ${k+1}<small>${esc(c.nome)}</small></th>${celle}</tr>`;
    }).join('');
    const totali = t.prove.map(pr => `<td class="c b big">${puntiProva(t, pr).totale ?? ''}</td>`).join('');
    corpo = `<table class="ps-ab"><tr><th class="l">Criterio</th><th>1^ prova</th><th>2^ prova</th><th>3^ prova</th></tr>${righe}
      <tr class="tot"><th class="l">TOTALE (max ${P.max})</th>${totali}</tr></table>
      ${t.tipo === 'B' ? `<p class="small">Fasce di tempo applicate: ${d.sesso === 'F' ? 'femmine' : 'maschi'}.</p>` : ''}`;
  }
  return `
  <div class="ps">
    <header class="ps-head">
      <img class="ps-lb" src="${logoB}" alt="Baskin" />
      <div class="ps-ht">Sistema di classificazione per il Baskin<br/><span>Allegato A al regolamento di gioco (rev. 1 settembre 2025)</span></div>
      <span class="ps-le"><img src="${logoE}" alt="EISI" /></span>
    </header>
    <h1>${esc(P.titoloScheda)}</h1>
    <table class="ps-dati">
      <tr><th>Squadra di appartenenza</th><td>${esc(d.squadra)}</td><th>N° maglia</th><td class="c b">${esc(d.numero)}</td></tr>
      <tr><th>Cognome e nome</th><td colspan="3">${esc(d.nome)}</td></tr>
      <tr><th>Data di nascita</th><td>${esc(fmtData(d.nascita))}</td><th>Sesso</th><td class="c">${esc(d.sesso)}</td></tr>
      <tr><th>Sezione Territoriale</th><td colspan="3">${esc(d.sezione)}</td></tr>
      <tr><th>Data</th><td>${esc(fmtData(d.data))}</td><th>Valutatore</th><td>${esc(d.valutatore)}</td></tr>
    </table>
    ${corpo}
    <div class="ps-fin">
      <div class="ps-note" style="flex:1;margin:0"><b>Esito:</b> ${esc(e.testo || '–')}</div>
      <div class="ps-esito"><small>Esito</small><b class="${(e.titolo||'').length > 8 ? 'sm' : ''}">${esc(e.titolo || '–')}</b></div>
    </div>
    ${d.note ? `<div class="ps-note"><b>Note:</b> ${esc(d.note).replace(/\n/g,'<br/>')}</div>` : ''}
    <div class="ps-firma"><span>Data ____________________</span><span>Firma del valutatore ______________________________</span></div>
    <footer class="ps-foot">${esc(FONTE)} — compilata con ${esc(APP_NAME)} v${APP_VERSION}${t.confermata ? ', confermata il ' + esc(new Date(t.confermata).toLocaleString('it-IT')) : ''}<br/>
      Il regolamento, i documenti di gara e gli altri documenti si trovano sul sito EISI nel menu Documenti <a href="https://eisi.it/eisi/documenti/">https://eisi.it/eisi/documenti/</a> oppure in Area Download.</footer>
  </div>`;
}
const CSS_PERC_EXTRA = `.ps-esito b.sm{font-size:15pt;text-align:center;padding:0 2mm}.ps-ab th small{display:block;font-weight:normal}`;

function nomeFilePercorso(t){
  const pulisci = s => String(s || '').trim().replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_|_$/g,'');
  const parti = [pulisci(t.dati.squadra), 'n' + pulisci(t.dati.numero), pulisci(t.dati.nome)].filter(x => x && x !== 'n');
  return `Percorso_${t.tipo}_Baskin_${parti.join('_')}_${stamp()}`;
}
function stampaPercorso(t){
  if(t.stato !== 'confermata'){ toast('La stampa è attiva solo dopo la conferma finale'); return; }
  const area = $('#printArea');
  area.innerHTML = `<style>${CSS_SCHEDA}${CSS_PERC_EXTRA}</style>` + htmlSchedaPercorso(t, 'icons/logos/logo-baskin.svg', 'icons/logos/logo-eisi.svg');
  const titolo = document.title; document.title = nomeFilePercorso(t);
  document.body.classList.add('printing');
  const fine = () => { document.body.classList.remove('printing'); document.title = titolo; window.removeEventListener('afterprint', fine); };
  window.addEventListener('afterprint', fine);
  const imgs = $$('img', area);
  Promise.all(imgs.map(i => i.complete ? 1 : new Promise(res => { i.onload = i.onerror = res; })))
    .then(() => setTimeout(() => { window.print(); setTimeout(fine, 1500); }, 50));
}
function esportaHtmlPercorso(t){
  if(t.stato !== 'confermata'){ toast('L’export è attivo solo dopo la conferma finale'); return; }
  const nome = nomeFilePercorso(t);
  const doc = `<!DOCTYPE html>
<html lang="it"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(nome)}</title>
<style>body{margin:0;padding:6mm;background:#fff}${CSS_SCHEDA}${CSS_PERC_EXTRA}
.bar{max-width:190mm;margin:0 auto 4mm;text-align:right}.bar button{font:inherit;padding:2mm 4mm;border:0;border-radius:2mm;background:#2f3740;color:#fff}
@media print{.bar{display:none}body{padding:0}}</style></head>
<body><div class="bar"><button onclick="window.print()">Stampa / Salva come PDF</button></div>
${htmlSchedaPercorso(t, LOGO_BASKIN, LOGO_EISI)}
</body></html>`;
  scarica(new Blob([doc], {type:'text/html'}), nome + '.html');
}

/* =====================================================================
   ARCHIVIO PERCORSI
   ===================================================================== */
function renderArchivioPercorsi(){
  const a = percArchivio(), box = $('#archPerc');
  if(!box) return;
  if(!a.length){ box.innerHTML = '<div class="card"><p class="muted">Nessun percorso confermato.</p></div>'; return; }
  box.innerHTML = a.map(t => {
    const e = esito(t), P = PERCORSI[t.tipo];
    return `<div class="card arch" data-pid="${t.id}">
      <div class="arch-main">
        <div><b>${esc(P.nome)} · ${esc(t.dati.squadra)} · n° ${esc(t.dati.numero)}</b><small>${esc(t.dati.nome || '')}</small>
          <small>${esc(fmtData(t.dati.data))}${t.dati.valutatore ? ' · ' + esc(t.dati.valutatore) : ''}</small></div>
        <div class="arch-score perc ${e.classe}"><b>${esc(e.titolo.replace('Ruolo ','R').replace(' da monitorare','*').replace('Percorso C','→C').replace('Caso non previsto','?'))}</b><small>esito</small></div>
      </div>
      <div class="arch-act">
        <button class="btn sm" type="button" data-parch="stampa">Stampa</button>
        <button class="btn sm" type="button" data-parch="html">HTML</button>
        <button class="btn sm danger" type="button" data-parch="elimina">Elimina</button>
      </div></div>`;
  }).join('');
}
function percImporta(lista){
  const a = percArchivio(); let n = 0;
  lista.forEach(t => { if(t && t.id && t.tipo && t.prove && !a.some(x => x.id === t.id)){ a.push(t); n++; } });
  salvaPercArchivio(a); return n;
}

/* =====================================================================
   EVENTI (chiamato dal gestore click di app.js)
   ===================================================================== */
function percClick(t){
  let b;
  if((b = t.closest('[data-perc-new]'))){ iniziaPercorso(b.dataset.percNew); return true; }
  if((b = t.closest('[data-perc-schema]'))){ mostraSchema(b.dataset.percSchema); return true; }
  if((b = t.closest('[data-prova]'))){ apriProva(Number(b.dataset.prova)); return true; }
  if((b = t.closest('.opt[data-opt]'))){ PP.crit[b.dataset.crit] = b.dataset.opt; renderPercProva(); return true; }
  if((b = t.closest('.opt[data-diff="none"]'))){ PP.crit[b.dataset.crit] = []; renderPercProva(); return true; }
  if(t.closest('#btnPercSiConferma')){ eseguiConfermaPercorso(); return true; }
  if((b = t.closest('[data-parch]'))){
    const id = b.closest('.arch').dataset.pid, a = percArchivio(), x = a.find(y => y.id === id);
    if(!x) return true;
    if(b.dataset.parch === 'stampa') stampaPercorso(x);
    if(b.dataset.parch === 'html') esportaHtmlPercorso(x);
    if(b.dataset.parch === 'elimina' && confirm(`Eliminare il ${PERCORSI[x.tipo].nome} di ${etichettaAtleta(x.dati)}?`)){
      salvaPercArchivio(a.filter(y => y.id !== id)); renderArchivioPercorsi();
    }
    return true;
  }
  return false;
}

document.addEventListener('DOMContentLoaded', () => {
  $('#tilePercCorso').onclick = () => go('perc-menu');
  $('#btnPaConferma').onclick = confermaPercAtleta;
  $('#btnPaAnnulla').onclick = () => history.back();
  $('#frmPercAtleta').addEventListener('keydown', e => { if(e.key === 'Enter' && e.target.tagName === 'INPUT'){ e.preventDefault(); confermaPercAtleta(); } });

  $('#pmHelp').onclick = () => mostraSchema(T.tipo);
  $('#btnPmConferma').onclick = confermaFinalePercorso;
  $('#btnPmStampa').onclick = () => stampaPercorso(T);
  $('#btnPmHtml').onclick = () => esportaHtmlPercorso(T);
  $('#btnPmRiapri').onclick = () => {
    if(!confirm('Riaprire il percorso? La stampa resterà disattivata fino a una nuova conferma finale.')) return;
    T.stato = 'bozza'; T.confermata = null; salvaT(); renderPercMenu();
  };
  $('#btnPmDati').onclick = () => { editAtleta = true; go('perc-atleta'); };
  $('#btnPmChiudi').onclick = () => {
    if(T && T.stato === 'confermata'){ T = null; salvaT(); }   // il confermato è già in archivio
    history.back();
  };
  $('#btnPmSeguito').onclick = () => {
    const e = esito(T); if(!e.seguito) return;
    const dati = clone(T.dati); dati.note = '';
    T = null; salvaT();   // il percorso confermato è già in archivio
    tipoScelto = e.seguito.tipo; atletaPrefill = dati; varPrefill = e.seguito.variante || null; editAtleta = false;
    history.replaceState(null, '', '#perc-atleta'); show('perc-atleta'); window.scrollTo(0,0);
  };

  $('#swGo').onclick = swToggle;
  $('#swDisplay').onclick = swToggle;          // tocco sul display = avvia/ferma
  $('#swReset').onclick = () => { if(SW.running) return; PP.tempo = null; aggiornaCrono(); aggiornaTotProva(); };
  $('#swManual').addEventListener('input', e => {
    const v = parseFloat(String(e.target.value).replace(',', '.'));
    PP.tempo = isFinite(v) && v > 0 ? Math.round(v * 100) * 10 : null;
    aggiornaCrono(); aggiornaTotProva();
  });
  $('#swManual').addEventListener('blur', () => aggiornaCrono());
  $('#ppCriteri').addEventListener('change', e => {
    const c = e.target.closest('input[data-diff]'); if(!c) return;
    const cur = Array.isArray(PP.crit[c.dataset.crit]) ? PP.crit[c.dataset.crit] : [];
    const set = new Set(cur); c.checked ? set.add(c.dataset.diff) : set.delete(c.dataset.diff);
    PP.crit[c.dataset.crit] = ['A','B','C','D'].filter(x => set.has(x));
    renderPercProva();
  });
  $('#btnPpConferma').onclick = confermaProva;
  $('#btnPpAnnulla').onclick = annullaProva;

  // se si lascia la schermata della prova (tasto indietro) il cronometro si ferma
  window.addEventListener('hashchange', () => { if(location.hash !== '#perc-prova') swStopSilenzioso(); });
});
