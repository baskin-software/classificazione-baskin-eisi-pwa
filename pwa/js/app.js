/* app.js by Daniele Lolli (UncleDan) feat. Claude AI - Release 26.0 - 2026-11-14 13-34-14 */
/* =====================================================================
   Griglia Valutazione Baskin EISI (PWA) - logica applicativa
   Autore: Daniele Lolli (UncleDan)
   PWA offline: compilazione della "Griglia di valutazione delle abilità
   in partita" (ruoli 3, 4, 5), archivio locale, stampa/PDF ed export HTML,
   testo integrale dell'Allegato A con aiuti contestuali.
   ===================================================================== */
'use strict';

const APP_VERSION = '26.0';
const APP_NAME = 'Griglia Valutazione Baskin EISI (PWA)';
const KEY_DRAFT = 'griglia-baskin-eisi-bozza-v1';
const KEY_ARCH  = 'griglia-baskin-eisi-archivio-v1';

const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---------- storage sicuro (localStorage può mancare o lanciare) ---------- */
const store = {
  get(k, def){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; }catch(_){ return def; } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); return true; }catch(_){ return false; } },
  del(k){ try{ localStorage.removeItem(k); }catch(_){ /* niente */ } }
};

/* =====================================================================
   STATO DELLA GRIGLIA
   ===================================================================== */
function oggiISO(){
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function nuovaGriglia(){
  const livelli = {}; ABILITA.forEach(a => livelli[a.id] = null);
  const malusA = {}; MALUS_AAII.forEach(m => malusA[m.id] = false);
  return {
    id: 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2,6),
    creata: new Date().toISOString(), modificata: null, salvata: false,
    dati: { nome:'', nascita:'', ruolo:'', sezione:'', squadra:'', data: oggiISO(), valutatore:'', gara:'', note:'' },
    livelli, malusH: false, malusA
  };
}

let G = store.get(KEY_DRAFT, null) || nuovaGriglia();

function calcola(g){
  const vals = ABILITA.map(a => g.livelli[a.id]).filter(v => v != null);
  const fatti = vals.length;
  const somma = vals.reduce((s,v)=>s+v, 0);
  const completa = fatti === ABILITA.length;
  const base = completa ? somma : null;
  const hApplicabile = completa && base >= 5 && base <= 20;
  const aApplicabile = completa && base >= 21 && base <= 25;
  let malus = 0;
  if(hApplicabile && g.malusH) malus += MALUS_H.punti;
  if(aApplicabile) MALUS_AAII.forEach(m => { if(g.malusA[m.id]) malus += m.punti; });
  const finale = completa ? base - malus : null;
  const ruolo = ruoloDaPunteggio(finale);
  return { fatti, somma, completa, base, hApplicabile, aApplicabile, malus, finale, ruolo };
}

function salvaBozza(){ G.modificata = new Date().toISOString(); store.set(KEY_DRAFT, G); }

/* =====================================================================
   NAVIGAZIONE
   ===================================================================== */
const SCREENS = ['home','griglia','archivio','percorsi','documento','info'];
function show(name){
  if(!SCREENS.includes(name)) name = 'home';
  document.body.dataset.screen = name;
  $$('.screen').forEach(s => s.classList.toggle('active', s.id === 'scr-' + name));
  const scr = $('#scr-' + name);
  $('#appbarTitle').textContent = scr ? scr.dataset.title : '';
  if(name === 'archivio') renderArchivio();
  if(name === 'griglia') renderGriglia();
}
function go(name){
  if(location.hash !== '#' + name) location.hash = name; else show(name);
}
window.addEventListener('hashchange', () => { show(location.hash.slice(1)); window.scrollTo(0,0); });

function apriDoc(id){
  go('documento');
  setTimeout(() => {
    const el = document.getElementById(id);
    if(el){ el.scrollIntoView({behavior:'smooth', block:'start'}); el.classList.add('flash'); setTimeout(()=>el.classList.remove('flash'), 1600); }
  }, 60);
}

/* =====================================================================
   COMPILAZIONE
   ===================================================================== */
const CAMPI = ['nome','nascita','ruolo','sezione','squadra','data','valutatore','gara','note'];

function costruisciAbilita(){
  const box = $('#abilita');
  box.innerHTML = ABILITA.map((a, i) => `
    <fieldset class="card abil" id="ab-${a.id}" data-ab="${a.id}">
      <legend><span class="abil-n">${i+1}</span> ${esc(a.nome)}
        <button class="qbtn" type="button" data-help="ab:${a.id}" aria-label="Aiuto: ${esc(a.nome)}">?</button></legend>
      <div class="levels" role="radiogroup" aria-label="${esc(a.nome)}">
        ${a.livelli.map((t, j) => `
          <button class="lvl lvl-${j+1}" type="button" role="radio" aria-checked="false" data-ab="${a.id}" data-lv="${j+1}">
            <span class="lvl-n">${j+1}</span>
            <span class="lvl-t">${esc(t)}<small>${esc(PROFILI_LIVELLO[j+1])}</small></span>
          </button>`).join('')}
      </div>
    </fieldset>`).join('');

  $('#malusAList').innerHTML = MALUS_AAII.map(m => `
    <label class="chk"><input type="checkbox" data-malus="${m.id}" /> <span><b>${esc(m.nome)}</b><small>${esc(m.testo)}</small></span><em>-${m.punti} ${m.punti===1?'punto':'punti'}</em></label>`).join('');
}

function renderGriglia(){
  CAMPI.forEach(c => { const el = $('#f_' + c); if(el && el.value !== (G.dati[c] || '')) el.value = G.dati[c] || ''; });
  ABILITA.forEach(a => {
    const sel = G.livelli[a.id];
    const card = $('#ab-' + a.id);
    card.classList.toggle('done', sel != null && !card.classList.contains('open'));
    $$('.lvl', card).forEach(b => {
      const on = Number(b.dataset.lv) === sel;
      b.classList.toggle('sel', on);
      b.setAttribute('aria-checked', on ? 'true' : 'false');
    });
  });
  $('#m_h').checked = !!G.malusH;
  $$('[data-malus]').forEach(c => c.checked = !!G.malusA[c.dataset.malus]);
  aggiornaCalcolo();
}

function aggiornaCalcolo(){
  const r = calcola(G);
  $('#sbDone').textContent = `${r.fatti}/5`;
  $('#sbBase').textContent = r.completa ? r.base : (r.fatti ? `(${r.somma})` : '–');
  $('#sbMalus').textContent = r.malus ? `-${r.malus}` : '0';
  $('#sbFinal').textContent = r.completa ? r.finale : '–';
  $('#sbRole').textContent = r.ruolo || '–';
  $('#scorebar').dataset.role = r.ruolo || '';

  // malus abilitati in base al punteggio
  $('#malusH').classList.toggle('na', !r.hApplicabile);
  $('#malusA').classList.toggle('na', !r.aApplicabile);
  $('#m_h').disabled = !r.hApplicabile;
  $$('[data-malus]').forEach(c => c.disabled = !r.aApplicabile);
  let st;
  if(!r.completa) st = 'Completa le cinque abilità: i malus applicabili si attivano in base al punteggio ottenuto.';
  else if(r.hApplicabile) st = `Punteggio ${r.base} (tra 5 e 20): è applicabile solo il Malus H.`;
  else st = `Punteggio ${r.base} (tra 21 e 25): è applicabile solo il Malus A.A.I.I.`;
  $('#malusState').textContent = st;

  // riquadro risultato
  $('#risultato').innerHTML = htmlRisultato(r);
}

function htmlRisultato(r){
  if(!r.completa){
    return `<p class="muted">Seleziona un livello per ciascuna delle cinque abilità (${r.fatti}/5 completate).</p>`;
  }
  const attuale = Number(G.dati.ruolo) || null;
  let conf = '';
  if(attuale){
    conf = attuale === r.ruolo
      ? `<p class="ok">&#10004; Il risultato conferma il ruolo attuale (${attuale}).</p>`
      : `<p class="ko">&#9888; Il risultato (ruolo ${r.ruolo}) è differente dall’arruolamento attuale (ruolo ${attuale}). Secondo le istruzioni della griglia, se le valutazioni producono un risultato differente dall’arruolamento attuale l’atleta DEVE cambiare ruolo; le tempistiche del passaggio sono stabilite dalle commissioni locali. <button class="help-link" type="button" data-doc="modalita">Leggi</button></p>`;
  }
  const limite = [10,11,20,21].includes(r.finale)
    ? `<p class="muted">Punteggio a ridosso di una soglia: per i casi “borderline” vedi <button class="help-link" type="button" data-doc="casi-dubbi">Casi dubbi</button>.</p>` : '';
  return `
    <div class="res-grid">
      <div><small>Punteggio ottenuto</small><b>${r.base}</b></div>
      <div><small>Malus</small><b>${r.malus ? '-' + r.malus : '0'}</b></div>
      <div><small>Dopo i malus</small><b>${r.finale}</b></div>
      <div class="res-role r${r.ruolo}"><small>Ruolo</small><b>${r.ruolo}</b></div>
    </div>
    ${conf}${limite}
    <p class="muted small">Soglie: 10 o inferiore = ruolo 3 · tra 11 e 20 = ruolo 4 · da 21 a 25 = ruolo 5. In presenza di più valutazioni si procede alla media matematica dei risultati (vedi Archivio).</p>`;
}

function onLivello(btn){
  const ab = btn.dataset.ab, lv = Number(btn.dataset.lv);
  const card = $('#ab-' + ab);
  if(card.classList.contains('done')){ card.classList.add('open'); card.classList.remove('done'); return; }
  G.livelli[ab] = lv;
  card.classList.remove('open');
  salvaBozza(); renderGriglia();
  // passa alla prossima abilità ancora da compilare
  const next = ABILITA.find(a => G.livelli[a.id] == null);
  const target = next ? $('#ab-' + next.id) : $('#cardMalus');
  setTimeout(() => target.scrollIntoView({behavior:'smooth', block:'start'}), 120);
}

/* =====================================================================
   AIUTO CONTESTUALE
   ===================================================================== */
function apriSheet(titolo, tabs){
  $('#sheetTitle').textContent = titolo;
  const tb = $('#sheetTabs');
  tb.innerHTML = tabs.length > 1 ? tabs.map((t,i)=>`<button type="button" class="${i?'':'on'}" data-tab="${i}">${esc(t.nome)}</button>`).join('') : '';
  tb.hidden = tabs.length < 2;
  const body = $('#sheetBody');
  const mostra = i => {
    body.innerHTML = tabs[i].html; body.scrollTop = 0;
    // porta in vista l'elemento evidenziato (livello o colonna del ruolo)
    const hl = body.querySelector('.est-col.hl, .help-lvl.sel');
    if(hl && hl.offsetTop > body.clientHeight * 0.6) body.scrollTop = hl.offsetTop - 12;
    $$('button', tb).forEach(b => b.classList.toggle('on', Number(b.dataset.tab) === i));
  };
  tb.onclick = e => { const b = e.target.closest('[data-tab]'); if(b) mostra(Number(b.dataset.tab)); };
  mostra(0);
  $('#sheet').hidden = false;
  document.body.classList.add('sheet-open');
}
function chiudiSheet(){ $('#sheet').hidden = true; document.body.classList.remove('sheet-open'); }

function noteLegenda(testo){ return LEGENDA.filter(n => n.chiavi.some(rx => rx.test(testo))); }

function aiutoAbilita(id){
  const a = ABILITA.find(x => x.id === id);
  const sel = G.livelli[id];
  const col = sel ? COLONNA_LIVELLO[sel] : null;

  const livelli = `
    <p class="muted small">Tocca un livello per selezionarlo. Ogni livello corrisponde idealmente a un profilo di ruolo.</p>
    ${a.livelli.map((t,i)=>`
      <button type="button" class="help-lvl ${sel===i+1?'sel':''}" data-pick="${id}:${i+1}">
        <span class="lvl-n">${i+1}</span><span>${esc(t)}<small>${esc(PROFILI_LIVELLO[i+1])}</small></span>
      </button>`).join('')}`;

  const colonne = [['r3','RUOLO 3','livello 1 & 2'],['r4','RUOLO 4','livello 3 & 4'],['r5','RUOLO 5','livello 5']];
  const estesa = `
    <p class="muted small">Esempi di come l’abilità si manifesta nei diversi ruoli (Tabella delle casistiche in forma estesa).${col ? ' È evidenziata la colonna del livello selezionato.' : ''}</p>
    ${colonne.map(([k,t,l]) => `
      <div class="est-col ${k} ${col===k?'hl':''}">
        <h4>${t} <small>(${l})</small></h4>
        <ul>${a.estesa[k].map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
      </div>`).join('')}`;

  const testoRif = sel ? a.livelli[sel-1] : a.livelli.join(' ');
  const pert = noteLegenda(testoRif);
  const legenda = `
    ${pert.length ? `<p class="muted small">${sel ? `Note della legenda pertinenti al livello ${sel}:` : 'Note della legenda pertinenti a questa abilità:'}</p>
      ${pert.map(n=>`<div class="leg"><b>${esc(n.segno)}</b> ${esc(n.testo)}</div>`).join('')}` : '<p class="muted">Nessuna nota della legenda riguarda direttamente il livello selezionato.</p>'}
    <details><summary>Tutte le note della legenda</summary>${LEGENDA.map(n=>`<div class="leg"><b>${esc(n.segno)}</b> ${esc(n.testo)}</div>`).join('')}</details>`;

  const altro = `
    <p><b>Funzionamento</b>: 5 abilità, 5 livelli ciascuna. Punteggio = somma dei livelli.</p>
    <table class="mini"><tr><th>Somma</th><th>Ruolo</th></tr><tr><td>da 5 a 10</td><td>3</td></tr><tr><td>da 11 a 20</td><td>4</td></tr><tr><td>da 21 a 25</td><td>5</td></tr></table>
    <p class="small">Chiave di lettura: la “funzionalità”, cioè la capacità di comprendere una situazione, elaborare una soluzione ed eseguirla, fino a “creare gioco”.</p>
    <div class="sheet-links">
      <button class="btn" type="button" data-doc="griglia-istruzioni">Istruzioni per l’uso</button>
      <button class="btn" type="button" data-doc="griglia-testo">Griglia nel testo integrale</button>
      <button class="btn" type="button" data-doc="forma-estesa">Forma estesa completa</button>
      <button class="btn" type="button" data-doc="etica">Questione etica</button>
    </div>`;

  apriSheet(a.nome, [
    {nome:'Livelli', html: livelli},
    {nome:'Esempi per ruolo', html: estesa},
    {nome:'Legenda', html: legenda},
    {nome:'Riferimenti', html: altro}
  ]);
}

function aiutoMalus(){
  const r = calcola(G);
  const stato = !r.completa ? 'Il punteggio non è ancora completo.'
    : r.hApplicabile ? `Con ${r.base} punti si applica solo il Malus H.` : `Con ${r.base} punti si applica solo il Malus A.A.I.I.`;
  const h = `
    <p class="callout">${esc(stato)}</p>
    <p><b>${esc(MALUS_H.nome)}</b> ${esc(MALUS_H.condizione)}:</p>
    <p>${esc(MALUS_H.testo)}</p>
    <p class="muted small">Scopo dei malus: abbassare il punteggio ottenuto per equilibrare una componente fisica non modificabile che influisce in modo svantaggioso nel confronto con i pari ruolo.</p>`;
  const a = `
    <p><b>Malus A.A.I.I. (Arti inferiori)</b> ${esc(MALUS_AAII_CONDIZIONE)}:</p>
    <table class="mini malus-t">${MALUS_AAII.map(m=>`<tr><th>${esc(m.nome)}</th><td>${esc(m.testo)}</td><td class="nw">-${m.punti} ${m.punti===1?'punto':'punti'}</td></tr>`).join('')}</table>
    <p class="muted small">Malus massimo: -6 punti. Esempio: 23 punti con Salto e Cambi di velocità → 23 - 1 - 2 = 20 → ruolo 4.</p>`;
  apriSheet('Malus', [
    {nome:'Malus H', html: h},
    {nome:'Malus A.A.I.I.', html: a + '<div class="sheet-links"><button class="btn" type="button" data-doc="malus-istr">Malus nel testo integrale</button></div>'}
  ]);
}

function aiutoDoc(ids, titolo){
  const html = ids.map(id => {
    const el = document.getElementById(id); if(!el) return '';
    let out = el.outerHTML.replace(/\sid="[^"]*"/g,''); let n = el.nextElementSibling;
    while(n && !/^H[1-3]$/.test(n.tagName)){ out += n.outerHTML.replace(/\sid="[^"]*"/g,''); n = n.nextElementSibling; }
    return out;
  }).join('');
  apriSheet(titolo, [{nome:titolo, html: `<div class="doc">${html}</div>`}]);
}

function onHelp(key){
  if(key.startsWith('ab:')) return aiutoAbilita(key.slice(3));
  if(key === 'malus') return aiutoMalus();
  if(key === 'modalita') return aiutoDoc(['modalita','casi-dubbi','etica'], 'Modalità di valutazione');
}

/* =====================================================================
   ARCHIVIO
   ===================================================================== */
function archivio(){ return store.get(KEY_ARCH, []); }
function salvaArchivio(a){ return store.set(KEY_ARCH, a); }

function salvaInArchivio(){
  const a = archivio();
  G.salvata = true; G.modificata = new Date().toISOString();
  const i = a.findIndex(x => x.id === G.id);
  const copia = JSON.parse(JSON.stringify(G));
  if(i >= 0) a[i] = copia; else a.unshift(copia);
  if(salvaArchivio(a)){ salvaBozza(); toast('Griglia salvata nell’archivio'); popolaSuggerimenti(); }
  else toast('Impossibile salvare: memoria del browser non disponibile');
}

function chiaveGiocatore(g){ return (g.dati.nome || '').trim().toLowerCase().replace(/\s+/g,' '); }

function renderArchivio(){
  const a = archivio();
  const box = $('#archList');
  if(!a.length){ box.innerHTML = '<div class="card"><p class="muted">Nessuna griglia salvata.</p></div>'; return; }

  // medie per giocatore (solo griglie complete)
  const gruppi = {};
  a.forEach(g => { const r = calcola(g); if(!r.completa) return; const k = chiaveGiocatore(g); if(!k) return; (gruppi[k] = gruppi[k] || []).push(r.finale); });
  const medie = Object.entries(gruppi).filter(([,v]) => v.length > 1).map(([k,v]) => {
    const m = v.reduce((s,x)=>s+x,0) / v.length;
    const nome = a.find(g => chiaveGiocatore(g) === k).dati.nome;
    const tra = (m > 10 && m < 11) || (m > 20 && m < 21);
    return `<li><b>${esc(nome)}</b>: media di ${v.length} valutazioni = <b>${m.toFixed(2).replace('.',',')}</b> → ${tra ? 'tra due soglie (caso dubbio)' : 'ruolo ' + ruoloDaPunteggio(m)}</li>`;
  });

  box.innerHTML = (medie.length ? `<div class="card"><h3>Media delle valutazioni</h3><ul class="medie">${medie.join('')}</ul><p class="muted small">In presenza di più valutazioni dello stesso giocatore si procede alla media matematica dei risultati (punteggi dopo i malus).</p></div>` : '') +
    a.map(g => {
      const r = calcola(g);
      const d = g.dati;
      return `<div class="card arch" data-id="${g.id}">
        <div class="arch-main">
          <div><b>${esc(d.nome || '(senza nome)')}</b><small>${esc([d.squadra, d.sezione].filter(Boolean).join(' · '))}</small>
            <small>${esc(fmtData(d.data))}${d.valutatore ? ' · ' + esc(d.valutatore) : ''}${d.ruolo ? ' · attuale ' + esc(d.ruolo) : ''}</small></div>
          <div class="arch-score r${r.ruolo || 0}">${r.completa ? `<b>${r.finale}</b><small>ruolo ${r.ruolo}</small>` : `<small>incompleta<br/>${r.fatti}/5</small>`}</div>
        </div>
        <div class="arch-act">
          <button class="btn sm" type="button" data-arch="apri">Apri</button>
          <button class="btn sm" type="button" data-arch="stampa">Stampa</button>
          <button class="btn sm" type="button" data-arch="duplica" title="Nuova valutazione dello stesso giocatore">Nuova valutaz.</button>
          <button class="btn sm danger" type="button" data-arch="elimina">Elimina</button>
        </div></div>`;
    }).join('');
}

function onArchivio(azione, id){
  const a = archivio(); const g = a.find(x => x.id === id); if(!g) return;
  if(azione === 'apri'){ G = JSON.parse(JSON.stringify(g)); salvaBozza(); go('griglia'); }
  if(azione === 'stampa'){ stampa(g); }
  if(azione === 'duplica'){
    const n = nuovaGriglia();
    ['nome','nascita','ruolo','sezione','squadra'].forEach(k => n.dati[k] = g.dati[k]);
    G = n; salvaBozza(); go('griglia'); toast('Nuova valutazione con i dati del giocatore');
  }
  if(azione === 'elimina'){
    if(!confirm(`Eliminare la griglia di ${g.dati.nome || '(senza nome)'}?`)) return;
    salvaArchivio(a.filter(x => x.id !== id)); renderArchivio();
  }
}

function esportaArchivio(){
  const blob = new Blob([JSON.stringify({app: APP_NAME, versione: APP_VERSION, esportato: new Date().toISOString(), griglie: archivio()}, null, 2)], {type:'application/json'});
  scarica(blob, `Archivio_Griglie_Baskin_${stamp()}.json`);
}
function importaArchivio(file){
  const fr = new FileReader();
  fr.onload = () => {
    try{
      const j = JSON.parse(fr.result);
      const nuove = Array.isArray(j) ? j : j.griglie;
      if(!Array.isArray(nuove)) throw new Error('formato');
      const a = archivio(); let n = 0;
      nuove.forEach(g => { if(g && g.id && g.livelli && g.dati && !a.some(x => x.id === g.id)){ a.push(g); n++; } });
      salvaArchivio(a); renderArchivio(); toast(`Importate ${n} griglie`);
    }catch(_){ toast('File non valido'); }
  };
  fr.readAsText(file);
}

function popolaSuggerimenti(){
  const sez = [...new Set(archivio().map(g => g.dati.sezione).filter(Boolean))];
  $('#dlSezioni').innerHTML = sez.map(s => `<option value="${esc(s)}">`).join('');
}

/* =====================================================================
   STAMPA / PDF ed EXPORT HTML
   ===================================================================== */
function fmtData(iso){ if(!iso) return ''; const [y,m,d] = iso.split('-'); return d ? `${d}/${m}/${y}` : iso; }
function stamp(){
  const d = new Date(), p = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}
function nomeFile(g){
  const n = (g.dati.nome || 'senza_nome').trim().replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_|_$/g,'');
  return `Griglia_Valutazione_Baskin_${n}_${stamp()}`;
}

function htmlScheda(g, logoB, logoE){
  const r = calcola(g), d = g.dati;
  const cerchio = (a, i) => g.livelli[a.id] === i ? `<td class="lv on"><span>${i}</span></td>` : `<td class="lv">${i}</td>`;
  const box = (on, na) => `<span class="cb ${na?'na':''}">${on && !na ? '&#10005;' : ''}</span>`;
  const righeRuolo = [[3,'10 o inferiore'],[4,'Tra 11 e 20'],[5,'Da 21 a 25']]
    .map(([ru, t]) => `<tr class="${r.ruolo === ru ? 'hit' : ''}"><td>${t}</td><td>${ru}</td></tr>`).join('');
  const dettagli = ABILITA.map(a => {
    const lv = g.livelli[a.id];
    return `<tr><th>${esc(a.nome)}</th><td class="c">${lv || '–'}</td><td>${lv ? esc(a.livelli[lv-1]) : '<i>non valutata</i>'}</td></tr>`;
  }).join('');
  return `
  <div class="ps">
    <header class="ps-head">
      <img class="ps-lb" src="${logoB}" alt="Baskin" />
      <div class="ps-ht">Allegato A al regolamento di gioco<br/><span>La classificazione dei ruoli nel Baskin (rev. 1 settembre 2025)</span></div>
      <span class="ps-le"><img src="${logoE}" alt="EISI" /></span>
    </header>
    <h1>RISULTATI GRIGLIA DI VALUTAZIONE DELLE ABILITÀ IN PARTITA</h1>
    <table class="ps-dati">
      <tr><th>Cognome e nome</th><td colspan="3">${esc(d.nome)}</td></tr>
      <tr><th>Data di nascita</th><td>${esc(fmtData(d.nascita))}</td><th>Sezione Territoriale</th><td>${esc(d.sezione)}</td></tr>
      <tr><th>Squadra di appartenenza</th><td>${esc(d.squadra)}</td><th>Ruolo attuale</th><td class="c b">${esc(d.ruolo)}</td></tr>
      <tr><th>Data osservazione</th><td>${esc(fmtData(d.data))}</td><th>Valutatore</th><td>${esc(d.valutatore)}</td></tr>
      <tr><th>Gara/e osservata/e</th><td colspan="3">${esc(d.gara)}</td></tr>
    </table>
    <table class="ps-ab">
      <tr><th class="l">ABILITÀ</th><th colspan="5">LIVELLO DI ESPRESSIONE</th><th>PUNTI</th></tr>
      ${ABILITA.map(a => `<tr><th class="l">${esc(a.nome)}</th>${[1,2,3,4,5].map(i=>cerchio(a,i)).join('')}<td class="c b">${g.livelli[a.id] || ''}</td></tr>`).join('')}
      <tr class="tot"><th class="l" colspan="6">PUNTEGGIO OTTENUTO</th><td class="c b">${r.completa ? r.base : ''}</td></tr>
    </table>
    <table class="ps-malus">
      <tr><th class="l" rowspan="1">Malus H <small>(per punteggi tra 5 e 20)</small></th><td>${box(g.malusH, !r.hApplicabile)} H &lt; 155 cm</td><td class="c">-3 punti</td></tr>
      ${MALUS_AAII.map((m,i) => `<tr>${i===0?`<th class="l" rowspan="${MALUS_AAII.length}">Malus A.A.I.I. <small>(per punteggi tra 21 e 25)</small></th>`:''}<td>${box(g.malusA[m.id], !r.aApplicabile)} ${esc(m.nome)}</td><td class="c">-${m.punti} ${m.punti===1?'punto':'punti'}</td></tr>`).join('')}
      <tr class="tot"><th class="l" colspan="2">PUNTEGGIO OTTENUTO DOPO L’APPLICAZIONE DEI MALUS</th><td class="c b big">${r.completa ? r.finale : ''}</td></tr>
    </table>
    <div class="ps-fin">
      <table class="ps-ruolo"><tr><th>PUNTEGGIO FINALE</th><th>RUOLO</th></tr>${righeRuolo}</table>
      <div class="ps-esito ${r.completa ? 'r' + r.ruolo : ''}"><small>Ruolo risultante</small><b>${r.completa ? r.ruolo : '–'}</b>${!r.completa ? '<small>griglia incompleta</small>' : ''}</div>
    </div>
    ${d.note ? `<div class="ps-note"><b>Note:</b> ${esc(d.note).replace(/\n/g,'<br/>')}</div>` : ''}
    <div class="ps-firma"><span>Data ____________________</span><span>Firma del valutatore ______________________________</span></div>
    <h2 class="ps-brk">DETTAGLIO DEI LIVELLI ASSEGNATI</h2>
    <table class="ps-det"><tr><th>Abilità</th><th>Livello</th><th>Descrizione del livello (Griglia di valutazione delle abilità in partita)</th></tr>${dettagli}</table>
    <footer class="ps-foot">${esc(FONTE)} — compilata con ${esc(APP_NAME)} v${APP_VERSION}<br/>
      Il regolamento, i documenti di gara e gli altri documenti si trovano sul sito EISI nel menu Documenti <a href="https://eisi.it/eisi/documenti/">https://eisi.it/eisi/documenti/</a> oppure in Area Download.</footer>
  </div>`;
}

/* CSS della scheda: usato sia per la stampa sia per il file HTML esportato */
const CSS_SCHEDA = `
.ps{font-family:Arial,Helvetica,sans-serif;color:#222;font-size:10.5pt;max-width:190mm;margin:0 auto}
.ps h1,.ps h2,.ps th{font-family:"Arial Narrow",Arial,sans-serif}
.ps-head{display:flex;align-items:center;gap:4mm;background:#2f3740;color:#fff;padding:2.5mm 4mm;border-radius:2mm;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.ps-lb{height:20mm;width:20mm}
.ps-ht{flex:1;text-align:center;font-family:"Arial Narrow",Arial,sans-serif;font-size:11pt;font-weight:bold}
.ps-ht span{font-weight:normal;font-size:9.5pt}
.ps-le{background:#fff;border-radius:1.5mm;padding:1mm;display:inline-flex}
.ps-le img{height:18mm;width:18mm}
.ps h1{font-size:14pt;text-align:center;margin:5mm 0 3mm;color:#2f3740}
.ps h2{font-size:12pt;color:#2f3740;margin:6mm 0 2mm}
.ps table{border-collapse:collapse;width:100%;margin:0 0 3mm}
.ps th,.ps td{border:0.3mm solid #8a949e;padding:1.4mm 2mm;vertical-align:middle}
.ps th{background:#eef0f2;text-align:center;font-size:10pt;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.ps th.l{text-align:left}
.ps th small{font-weight:normal;display:block}
.ps .c{text-align:center}.ps .b{font-weight:bold}.ps .big{font-size:14pt}
.ps-dati th{text-align:left;width:22%}
.ps-ab td.lv{text-align:center;width:9%;color:#8a949e}
.ps-ab td.lv.on span{display:inline-block;min-width:6mm;line-height:6mm;border:0.6mm solid #f4991b;border-radius:50%;color:#222;font-weight:bold;background:#fde9cf;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.ps tr.tot th,.ps tr.tot td{background:#e3e6ea;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.ps .cb{display:inline-block;width:3.6mm;height:3.6mm;line-height:3.4mm;border:0.3mm solid #222;text-align:center;font-weight:bold;font-size:9pt;margin-right:1.5mm;vertical-align:-0.6mm}
.ps .cb.na{border-color:#bbb;background:repeating-linear-gradient(45deg,#fff,#fff 0.5mm,#ddd 0.5mm,#ddd 1mm)}
.ps-fin{display:flex;gap:4mm;align-items:stretch}
.ps-ruolo{flex:1}
.ps-ruolo td{text-align:center}
.ps-ruolo tr.hit td{background:#fde9cf;font-weight:bold;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.ps-esito{width:40mm;border:0.6mm solid #2f3740;border-radius:2mm;display:flex;flex-direction:column;align-items:center;justify-content:center;margin-bottom:3mm}
.ps-esito b{font-size:30pt;line-height:1.1;color:#2f3740}
.ps-esito small{font-size:8.5pt;color:#555}
.ps-note{border:0.3mm solid #8a949e;padding:2mm;margin-bottom:3mm}
.ps-firma{display:flex;justify-content:space-between;margin:8mm 0 2mm;font-size:10pt}
.ps-brk{page-break-before:always;break-before:page}
.ps-det th{text-align:left}
.ps-det td{font-size:9.5pt}
.ps-foot{margin-top:5mm;font-size:8pt;color:#555;text-align:center;border-top:0.3mm solid #ccc;padding-top:2mm}
.ps-foot a{color:#f4991b}
@page{size:A4;margin:12mm}
`;

function stampa(g){
  const area = $('#printArea');
  area.innerHTML = `<style>${CSS_SCHEDA}</style>` + htmlScheda(g, 'icons/logos/logo-baskin.svg', 'icons/logos/logo-eisi.svg');
  const titolo = document.title;
  document.title = nomeFile(g);
  document.body.classList.add('printing');
  const fine = () => { document.body.classList.remove('printing'); document.title = titolo; window.removeEventListener('afterprint', fine); };
  window.addEventListener('afterprint', fine);
  // attende il caricamento dei loghi prima di aprire la finestra di stampa
  const imgs = $$('img', area);
  Promise.all(imgs.map(i => i.complete ? 1 : new Promise(res => { i.onload = i.onerror = res; })))
    .then(() => setTimeout(() => { window.print(); setTimeout(fine, 1500); }, 50));
}

function esportaHtml(g){
  const nome = nomeFile(g);
  const doc = `<!DOCTYPE html>
<html lang="it"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(nome)}</title>
<style>body{margin:0;padding:6mm;background:#fff}${CSS_SCHEDA}
.bar{max-width:190mm;margin:0 auto 4mm;text-align:right}.bar button{font:inherit;padding:2mm 4mm;border:0;border-radius:2mm;background:#2f3740;color:#fff}
@media print{.bar{display:none}body{padding:0}}</style></head>
<body><div class="bar"><button onclick="window.print()">Stampa / Salva come PDF</button></div>
${htmlScheda(g, LOGO_BASKIN, LOGO_EISI)}
</body></html>`;
  scarica(new Blob([doc], {type:'text/html'}), nome + '.html');
}

function scarica(blob, nome){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nome; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 2000);
}

/* =====================================================================
   TESTO INTEGRALE: parti generate dai dati (unica fonte)
   ===================================================================== */
function costruisciDocGriglia(){
  $('#docGriglia').innerHTML = ABILITA.map(a => `
    <h4>${esc(a.nome.toUpperCase())}</h4>
    <ol>${a.livelli.map(t => `<li>${esc(t)}</li>`).join('')}</ol>`).join('');
  $('#docMalus').innerHTML = `
    <ul>
      <li>MALUS H (Altezza) ${esc(MALUS_H.condizione)}:<ul><li>${esc(MALUS_H.testo)}</li></ul></li>
      <li>MALUS A.A.I.I. (Arti inferiori) da applicare a chi ha ottenuto un punteggio compreso tra 21 e 25:<ul><li>Se il giocatore possiede una o più protesi o menomazione fisica agli arti inferiori riceve un Malus pari alla somma dei seguenti risultati:</li></ul></li>
    </ul>
    <div class="tbl-wrap"><table class="doc-tbl malus-t">${MALUS_AAII.map(m=>`<tr><th>${esc(m.nome)}</th><td>${esc(m.testo)}</td><td class="nw"><b>-${m.punti} ${m.punti===1?'punto':'punti'}</b></td></tr>`).join('')}</table></div>`;
  $('#docLegenda').innerHTML = LEGENDA.map(n => `<p class="leg"><sup>${esc(n.segno)}</sup> ${esc(n.testo)}</p>`).join('');
  $('#docEstesa').innerHTML = `<tr><th></th><th>RUOLO 3<br/><small>(livello 1 &amp; 2)</small></th><th>RUOLO 4<br/><small>(livello 3 &amp; 4)</small></th><th>RUOLO 5<br/><small>(livello 5)</small></th></tr>` +
    ABILITA.map(a => `<tr><th>${esc(a.nome.toUpperCase())}</th>${['r3','r4','r5'].map(k => `<td><ul>${a.estesa[k].map(x=>`<li>${esc(x)}</li>`).join('')}</ul></td>`).join('')}</tr>`).join('');
}

/* =====================================================================
   VARIE
   ===================================================================== */
let toastT;
function toast(msg){
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2600);
}

async function verificaAggiornamenti(){
  try{
    const r = await fetch('service-worker.js', {cache:'no-store'});
    const txt = await r.text();
    const m = txt.match(/CACHE_NAME\s*=\s*'griglia-valutazione-baskin-eisi-v([^']+)'/);
    const remota = m ? m[1] : null;
    if(remota && remota !== APP_VERSION){
      const reg = await navigator.serviceWorker.getRegistration();
      if(reg){ await reg.update(); }
      toast(`Nuova versione ${remota} disponibile: chiudi e riapri l’app`);
    } else toast(`L’app è aggiornata (v${APP_VERSION})`);
  }catch(_){ toast('Verifica non possibile: sei offline'); }
}

/* =====================================================================
   EVENTI
   ===================================================================== */
function init(){
  costruisciAbilita();
  costruisciDocGriglia();
  popolaSuggerimenti();
  $('#infoVersion').textContent = APP_VERSION;

  document.addEventListener('click', e => {
    const t = e.target;
    const goB = t.closest('[data-go]');
    if(goB){
      if(goB.dataset.new){
        const r = calcola(G);
        const vuota = !r.fatti && !CAMPI.some(c => c !== 'data' && G.dati[c]);
        if(!vuota && !G.salvata && !confirm('C’è una griglia in compilazione non salvata. Iniziarne una nuova?')){ go('griglia'); return; }
        if(!vuota) { G = nuovaGriglia(); salvaBozza(); }
      }
      go(goB.dataset.go); return;
    }
    const docB = t.closest('[data-doc]');
    if(docB){ e.preventDefault(); chiudiSheet(); apriDoc(docB.dataset.doc); return; }
    const helpB = t.closest('[data-help]');
    if(helpB){ e.preventDefault(); onHelp(helpB.dataset.help); return; }
    const pick = t.closest('[data-pick]');
    if(pick){
      const [ab, lv] = pick.dataset.pick.split(':');
      G.livelli[ab] = Number(lv); $('#ab-' + ab).classList.remove('open');
      salvaBozza(); renderGriglia(); chiudiSheet(); return;
    }
    const lvl = t.closest('.lvl');
    if(lvl){ onLivello(lvl); return; }
    const leg = t.closest('.abil legend');
    if(leg && !t.closest('.qbtn')){ const c = leg.parentElement; if(c.classList.contains('done')){ c.classList.add('open'); c.classList.remove('done'); } return; }
    if(t.closest('[data-close]')){ chiudiSheet(); return; }
    const arch = t.closest('[data-arch]');
    if(arch){ onArchivio(arch.dataset.arch, arch.closest('.arch').dataset.id); return; }
  });

  $('#frmGriglia').addEventListener('input', e => {
    const id = e.target.id || '';
    if(id.startsWith('f_')){ G.dati[id.slice(2)] = e.target.value; G.salvata = false; salvaBozza(); if(id === 'f_ruolo') aggiornaCalcolo(); }
  });
  $('#frmGriglia').addEventListener('change', e => {
    const t = e.target;
    if(t.id === 'm_h'){ G.malusH = t.checked; }
    else if(t.dataset.malus){ G.malusA[t.dataset.malus] = t.checked; }
    else return;
    G.salvata = false; salvaBozza(); aggiornaCalcolo();
  });

  $('#btnSalva').onclick = salvaInArchivio;
  $('#btnStampa').onclick = () => stampa(G);
  $('#btnHtml').onclick = () => esportaHtml(G);
  $('#btnNuova').onclick = () => {
    if(!G.salvata && calcola(G).fatti && !confirm('La griglia corrente non è stata salvata. Iniziarne una nuova?')) return;
    G = nuovaGriglia(); $$('.abil').forEach(c => c.classList.remove('open')); salvaBozza(); renderGriglia(); window.scrollTo(0,0);
  };
  $('#btnBack').onclick = () => { if(history.length > 1 && location.hash) history.back(); else go('home'); };
  $('#btnTop').onclick = () => $('#scr-documento').scrollIntoView({behavior:'smooth'});
  $('#btnExport').onclick = esportaArchivio;
  $('#fileImport').onchange = e => { if(e.target.files[0]) importaArchivio(e.target.files[0]); e.target.value = ''; };
  $('#btnUpdate').onclick = verificaAggiornamenti;
  document.addEventListener('keydown', e => { if(e.key === 'Escape') chiudiSheet(); });

  show(location.hash.slice(1) || 'home');

  if('serviceWorker' in navigator && location.protocol.startsWith('http')){
    navigator.serviceWorker.register('service-worker.js').catch(()=>{});
  }
}

document.addEventListener('DOMContentLoaded', init);
