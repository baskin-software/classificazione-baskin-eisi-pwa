/* elenchi.js by Daniele Lolli (UncleDan) feat. Claude AI - Release 26.0b12 - 2026-11-19 07-42-22 */
/* =====================================================================
   Classificazione Baskin EISI (PWA) - elenchi di SQUADRE e CTL
   - Squadre: nome + due colori di maglia (facoltativi).
   - CTL: nome + e-mail; al primo uso l'elenco parte da CTL_DESTINATARI (ctl.js).
   - Se un elenco ha una sola voce, viene proposta in automatico (modificabile).
   - Import/export CSV: separatore ; , o tab, intestazione facoltativa.
     Squadre: nome;colore1;colore2   (colori #rrggbb, #rgb o nome: rosso, blu…)
     CTL:     nome;email
   ===================================================================== */
const KEY_SQUADRE = 'classificazione-baskin-eisi-squadre';
const KEY_CTL_ELENCO = 'classificazione-baskin-eisi-ctl-elenco';

const NOMI_COLORI = {
  bianco:'#ffffff', bianca:'#ffffff', nero:'#000000', nera:'#000000', rosso:'#ff2b2b', rossa:'#ff2b2b',
  blu:'#2962ff', giallo:'#ffe000', gialla:'#ffe000', viola:'#9b30ff', verde:'#1ee63a',
  azzurro:'#29b6f6', azzurra:'#29b6f6', celeste:'#29b6f6', arancione:'#ff8c00', arancio:'#ff8c00',
  grigio:'#9e9e9e', grigia:'#9e9e9e', rosa:'#ff6fb5', fucsia:'#d6248f', bordeaux:'#800020', granata:'#7b1e2b',
  oro:'#d4af37', argento:'#c0c0c0', marrone:'#795548', 'blu scuro':'#0d1b5e', navy:'#0d1b5e', bluette:'#3f63e0'
};
function normColore(v){
  const s = String(v || '').trim().toLowerCase();
  if(!s) return '';
  if(/^#?[0-9a-f]{6}$/.test(s)) return '#' + s.replace('#', '');
  if(/^#?[0-9a-f]{3}$/.test(s)){ const h = s.replace('#', ''); return '#' + h[0]+h[0]+h[1]+h[1]+h[2]+h[2]; }
  return NOMI_COLORI[s] || null;   // null = colore non riconosciuto
}

const elencoSquadre = () => store.get(KEY_SQUADRE, []) || [];
const salvaSquadre = l => store.set(KEY_SQUADRE, l.sort((a, b) => a.nome.localeCompare(b.nome, 'it')));
function elencoCTL(){
  const l = store.get(KEY_CTL_ELENCO, null);
  return Array.isArray(l) ? l : (typeof CTL_DESTINATARI !== 'undefined' ? CTL_DESTINATARI.map(c => ({ ...c })) : []);
}
const salvaCTL = l => store.set(KEY_CTL_ELENCO, l);
const trovaSquadra = nome => { const n = String(nome || '').trim().toLowerCase(); return n ? elencoSquadre().find(s => s.nome.toLowerCase() === n) : null; };
const emailValida = e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(e || '').trim());

/* ---------- CSV ---------- */
function leggiCSV(testo){
  testo = String(testo || '').replace(/^﻿/, '');
  const prima = testo.split(/\r?\n/).find(r => r.trim()) || '';
  const sep = [';', '\t', ','].map(c => [c, prima.split(c).length]).sort((a, b) => b[1] - a[1])[0][0];
  const righe = []; let riga = [], campo = '', q = false;
  for(let i = 0; i < testo.length; i++){
    const ch = testo[i];
    if(q){
      if(ch === '"'){ if(testo[i+1] === '"'){ campo += '"'; i++; } else q = false; }
      else campo += ch;
    } else if(ch === '"') q = true;
    else if(ch === sep){ riga.push(campo); campo = ''; }
    else if(ch === '\n' || ch === '\r'){
      if(ch === '\r' && testo[i+1] === '\n') i++;
      riga.push(campo); campo = '';
      if(riga.some(c => c.trim())) righe.push(riga.map(c => c.trim()));
      riga = [];
    } else campo += ch;
  }
  riga.push(campo); if(riga.some(c => c.trim())) righe.push(riga.map(c => c.trim()));
  return righe;
}
const csvCampo = v => /[;"\n\r]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v);
function scaricaCSV(nome, intestazione, righe){
  const testo = '﻿' + [intestazione, ...righe].map(r => r.map(csvCampo).join(';')).join('\r\n') + '\r\n';
  scarica(new Blob([testo], { type: 'text/csv;charset=utf-8' }), nome);
}
const eIntestazione = (r, parole) => r.some(c => parole.includes(c.toLowerCase().replace(/[^a-z]/g, '')));

function importaSquadreCSV(testo){
  const righe = leggiCSV(testo); if(!righe.length) return toast('File CSV vuoto');
  const base = eIntestazione(righe[0], ['nome', 'squadra', 'colore', 'colore1', 'maglia']) ? (righe.shift(), 2) : 1;   // n° di riga nel file
  const l = elencoSquadre(); let nuove = 0, agg = 0; const scarti = [];
  righe.forEach((r, i) => {
    const nome = r[0]; if(!nome){ scarti.push(i + base); return; }
    const c1 = normColore(r[1]), c2 = normColore(r[2]);
    if(c1 === null || c2 === null) scarti.push(i + base);   // colore non riconosciuto: la squadra entra senza quel colore
    const v = { nome, colore1: c1 || '', colore2: c2 || '' };
    const k = l.findIndex(s => s.nome.toLowerCase() === nome.toLowerCase());
    if(k >= 0){ l[k] = v; agg++; } else { l.push(v); nuove++; }
  });
  salvaSquadre(l); renderElenchi();
  toast(`Squadre aggiunte: ${nuove}, aggiornate: ${agg}` + (scarti.length ? ` · righe da controllare (nome mancante o colore non riconosciuto): ${scarti.join(', ')}` : ''));
}
function importaCtlCSV(testo){
  const righe = leggiCSV(testo); if(!righe.length) return toast('File CSV vuoto');
  const base = eIntestazione(righe[0], ['nome', 'ctl', 'email', 'mail', 'indirizzo']) ? (righe.shift(), 2) : 1;
  const l = elencoCTL(); let nuove = 0, agg = 0; const scarti = [];
  righe.forEach((r, i) => {
    // accetta anche «email;nome» o una sola colonna con l'indirizzo
    let [nome, email] = r; if(emailValida(nome) && !emailValida(email)){ [nome, email] = [email, nome]; }
    if(!emailValida(email)){ scarti.push(i + base); return; }
    email = email.trim(); nome = (nome || '').trim() || email;
    const k = l.findIndex(c => c.email.toLowerCase() === email.toLowerCase());
    if(k >= 0){ l[k] = { nome, email }; agg++; } else { l.push({ nome, email }); nuove++; }
  });
  salvaCTL(l); renderElenchi();
  toast(`CTL aggiunte: ${nuove}, aggiornate: ${agg}` + (scarti.length ? ` · righe scartate (e-mail non valida): ${scarti.join(', ')}` : ''));
}
function apriFileCSV(fn){
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.csv,.txt,text/csv,text/plain';
  inp.onchange = () => { const f = inp.files[0]; if(!f) return; const fr = new FileReader(); fr.onload = () => fn(String(fr.result)); fr.readAsText(f, 'utf-8'); };
  inp.click();
}

/* ---------- schermata ---------- */
function pallino(c){ return c ? `<span class="el-dot" style="background:${esc(c)}"></span>` : `<span class="el-dot vuoto" title="nessun colore"></span>`; }
function renderElenchi(){
  if(!$('#elSquadre')) return;
  const sq = elencoSquadre(), ctl = elencoCTL();
  $('#elSquadreN').textContent = sq.length;
  $('#elSquadre').innerHTML = sq.length ? sq.map((s, i) => `
    <li class="el-row">${pallino(s.colore1)}${pallino(s.colore2)}<span class="el-t"><b>${esc(s.nome)}</b></span>
      <button class="btn sm" type="button" data-el="sq-mod" data-i="${i}">Modifica</button>
      <button class="btn sm" type="button" data-el="sq-del" data-i="${i}" aria-label="Elimina">&#10005;</button></li>`).join('')
    : '<li class="muted small">Nessuna squadra: aggiungile qui o importale da CSV.</li>';
  $('#elCtlN').textContent = ctl.length;
  $('#elCtl').innerHTML = ctl.length ? ctl.map((c, i) => `
    <li class="el-row"><span class="el-t"><b>${esc(c.nome)}</b><small>${esc(c.email)}</small></span>
      <button class="btn sm" type="button" data-el="ctl-mod" data-i="${i}">Modifica</button>
      <button class="btn sm" type="button" data-el="ctl-del" data-i="${i}" aria-label="Elimina">&#10005;</button></li>`).join('')
    : '<li class="muted small">Nessuna CTL: aggiungila qui o importala da CSV.</li>';
}

/* tavolozza per la scheda di modifica: colori del Tabellone + personalizzato + nessuno */
function tavolozza(id, val){
  const personal = val && !TEAM_COLORS.includes(val);
  return `<div class="color-row" data-pal="${id}" data-val="${esc(val || '')}">
    <button class="swatch none ${val ? '' : 'sel'}" type="button" data-color="" aria-label="Nessun colore">&#8856;</button>
    ${TEAM_COLORS.map(c => `<button class="swatch ${c === val ? 'sel' : ''}" type="button" data-color="${c}" style="background:${c}" aria-label="Colore ${c}"></button>`).join('')}
    <input class="swatch custom ${personal ? 'sel' : ''}" type="color" value="${personal ? esc(val) : '#ffffff'}" ${personal ? `style="background:${esc(val)}"` : ''} aria-label="Colore personalizzato" /></div>`;
}
function modificaSquadra(i){
  const s = i >= 0 ? elencoSquadre()[i] : { nome:'', colore1:'', colore2:'' };
  apriSheet(i >= 0 ? 'Modifica squadra' : 'Nuova squadra', [{ nome:'Squadra', html:`
    <label class="fld"><span>Nome della squadra <b class="req">*</b></span><input id="elSqNome" type="text" value="${esc(s.nome)}" /></label>
    <div class="fld"><span>Colore maglia 1</span>${tavolozza('c1', s.colore1)}</div>
    <div class="fld"><span>Colore maglia 2</span>${tavolozza('c2', s.colore2)}</div>
    <div class="actions"><button class="btn btn-pri" type="button" id="elSqSalva">Salva</button></div>` }]);
  const body = $('#sheetBody');
  body.onclick = e => {
    const sw = e.target.closest('[data-pal] .swatch[data-color]'); if(!sw) return;
    const row = sw.closest('[data-pal]'); row.dataset.val = sw.dataset.color;
    $$('.swatch', row).forEach(x => x.classList.toggle('sel', x === sw));
    const cu = $('input.swatch.custom', row); cu.style.background = '';
  };
  body.oninput = e => {
    if(!e.target.matches('input.swatch.custom')) return;
    const row = e.target.closest('[data-pal]'); row.dataset.val = e.target.value;
    $$('.swatch', row).forEach(x => x.classList.toggle('sel', x === e.target)); e.target.style.background = e.target.value;
  };
  $('#elSqSalva').onclick = () => {
    const nome = $('#elSqNome').value.trim(); if(!nome) return toast('Inserisci il nome della squadra');
    const l = elencoSquadre();
    const dup = l.findIndex(x => x.nome.toLowerCase() === nome.toLowerCase());
    if(dup >= 0 && dup !== i) return toast('Questa squadra è già nell’elenco');
    const v = { nome, colore1: $('[data-pal="c1"]').dataset.val, colore2: $('[data-pal="c2"]').dataset.val };
    if(i >= 0) l[i] = v; else l.push(v);
    salvaSquadre(l); chiudiSheet(); renderElenchi(); toast('Squadra salvata');
  };
  setTimeout(() => $('#elSqNome').focus(), 80);
}
function modificaCtl(i){
  const c = i >= 0 ? elencoCTL()[i] : { nome:'CTL ', email:'' };
  apriSheet(i >= 0 ? 'Modifica CTL' : 'Nuova CTL', [{ nome:'CTL', html:`
    <label class="fld"><span>Nome <b class="req">*</b></span><input id="elCtlNome" type="text" value="${esc(c.nome)}" placeholder="CTL Emilia-Romagna" /></label>
    <label class="fld"><span>E-mail <b class="req">*</b></span><input id="elCtlMail" type="email" value="${esc(c.email)}" placeholder="ctl.regione@eisi.it" /></label>
    <div class="actions"><button class="btn btn-pri" type="button" id="elCtlSalva">Salva</button></div>` }]);
  $('#elCtlSalva').onclick = () => {
    const nome = $('#elCtlNome').value.trim(), email = $('#elCtlMail').value.trim();
    if(!nome) return toast('Inserisci il nome della CTL');
    if(!emailValida(email)) return toast('Inserisci un indirizzo e-mail valido');
    const l = elencoCTL();
    const dup = l.findIndex(x => x.email.toLowerCase() === email.toLowerCase());
    if(dup >= 0 && dup !== i) return toast('Questo indirizzo è già nell’elenco');
    if(i >= 0) l[i] = { nome, email }; else l.push({ nome, email });
    salvaCTL(l); chiudiSheet(); renderElenchi(); toast('CTL salvata');
  };
  setTimeout(() => $('#elCtlNome').focus(), 80);
}
function elenchiClick(t){
  const b = t.closest('[data-el]'); if(!b) return false;
  const i = Number(b.dataset.i), a = b.dataset.el;
  if(a === 'sq-add') modificaSquadra(-1);
  else if(a === 'sq-mod') modificaSquadra(i);
  else if(a === 'sq-del'){ const l = elencoSquadre(); if(confirm(`Eliminare la squadra ${l[i].nome} dall’elenco?`)){ l.splice(i, 1); salvaSquadre(l); renderElenchi(); } }
  else if(a === 'sq-imp') apriFileCSV(importaSquadreCSV);
  else if(a === 'sq-exp') scaricaCSV(`Squadre_Baskin_${stamp()}.csv`, ['nome', 'colore1', 'colore2'], elencoSquadre().map(s => [s.nome, s.colore1, s.colore2]));
  else if(a === 'sq-mod-csv') scaricaCSV('Modello_squadre.csv', ['nome', 'colore1', 'colore2'], [['Baskin Esempio', 'rosso', 'bianco'], ['Altra Squadra', '#2962ff', '#ffe000']]);
  else if(a === 'sq-svuota'){ if(confirm('Svuotare tutto l’elenco delle squadre?')){ salvaSquadre([]); renderElenchi(); } }
  else if(a === 'ctl-add') modificaCtl(-1);
  else if(a === 'ctl-mod') modificaCtl(i);
  else if(a === 'ctl-del'){ const l = elencoCTL(); if(confirm(`Eliminare ${l[i].nome} dall’elenco?`)){ l.splice(i, 1); salvaCTL(l); renderElenchi(); } }
  else if(a === 'ctl-imp') apriFileCSV(importaCtlCSV);
  else if(a === 'ctl-exp') scaricaCSV(`CTL_Baskin_${stamp()}.csv`, ['nome', 'email'], elencoCTL().map(c => [c.nome, c.email]));
  else if(a === 'ctl-mod-csv') scaricaCSV('Modello_CTL.csv', ['nome', 'email'], [['CTL Esempio', 'ctl.esempio@eisi.it']]);
  else if(a === 'ctl-ripr'){ if(confirm('Ripristinare l’elenco CTL predefinito dell’app? Le CTL aggiunte andranno perse.')){ store.set(KEY_CTL_ELENCO, null); renderElenchi(); } }
  return true;
}

/* ---------- uso nel modulo giocatore ---------- */
/* mostra i due colori della squadra scelta; con cambiaColore li applica (maglia 1) */
function coloriSquadraIdent(cambiaColore){
  const box = $('#teamColors'); if(!box) return;
  const s = trovaSquadra($('#p_squadra').value);
  const cols = s ? [s.colore1, s.colore2].filter(Boolean) : [];
  box.hidden = !cols.length || !isGriglia();
  box.innerHTML = cols.length ? `<span class="small muted">Maglie di ${esc(s.nome)}:</span>` + cols.map((c, k) =>
    `<button class="swatch" type="button" data-tcolor="${esc(c)}" style="background:${esc(c)}" aria-label="Maglia ${k + 1}"></button>`).join('') : '';
  if(cambiaColore && cols.length && isGriglia() && !cols.includes(colScelto)) setColore(cols[0]);
  $$('[data-tcolor]', box).forEach(b => b.classList.toggle('sel', b.dataset.tcolor === colScelto));
}
/* chiamata da renderIdent: con una sola squadra in elenco la propone */
function elenchiIdent(nuovo){
  const sq = elencoSquadre();
  if(nuovo && !$('#p_squadra').value && sq.length === 1){
    $('#p_squadra').value = sq[0].nome;
    coloriSquadraIdent(true);
  } else coloriSquadraIdent(nuovo && !colScelto);
}

document.addEventListener('DOMContentLoaded', () => {
  const ps = $('#p_squadra');
  if(ps){ ps.addEventListener('change', () => coloriSquadraIdent(true)); ps.addEventListener('input', () => { if(trovaSquadra(ps.value)) coloriSquadraIdent(true); else coloriSquadraIdent(false); }); }
  document.addEventListener('click', e => {
    const tc = e.target.closest('[data-tcolor]');
    if(tc){ setColore(tc.dataset.tcolor); coloriSquadraIdent(false); return; }
    if(e.target.closest('#scr-elenchi')) elenchiClick(e.target);
  });
});
