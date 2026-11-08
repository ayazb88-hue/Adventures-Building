/* =====================================================================
 * 9) OBERFLÄCHE: HUD, Log, Siedlerliste, Steckbrief, Speichern, Ton
 * ===================================================================== */
const $ = id => document.getElementById(id);
const SAVE_KEY = 'siedlung-save'; // bleibt gleich – die Version steht im Spielstand selbst
const OLD_SAVE_KEYS = ['siedlung-save-v4', 'siedlung-save-v3', 'siedlung-save-v2'];
const SOUND_KEY = 'siedlung-sound';
const STYLE_KEY = 'siedlung-figuren';
const ui = { speed: 1, selected: null, selTile: null, accum: 0, confirmNew: 0, sysQueue: [], sysUntil: 0 };
const sound = new Sound();
let sim, renderer;

function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function store(key, val) { try { if (val === undefined) return localStorage.getItem(key); localStorage.setItem(key, val); } catch (e) { return null; } }

function renderLog() {
  $('log').innerHTML = sim.logEntries.slice(0, 40).map(e => {
    const who = e.npc ? `<span class="who" style="color:${e.npc.color}">${esc(e.npc.name)}</span> ` : '';
    return `<li class="${e.event ? 'event' : ''}"${e.npc ? ` data-npc="${e.npc.id}"` : ''}><span class="t">T${e.day} ${e.clock}</span>${who}${esc(e.text)}</li>`;
  }).join('');
}

function buildRoster() {
  const st = sim.story, star = n => (n === st.hero ? 2 : n === st.rival ? 1 : 0);
  const sorted = [...sim.npcs].sort((a, b) => (star(b) - star(a)) || (b.awakened - a.awakened) || (b.level - a.level));
  const shown = ui.allRoster ? sorted : sorted.slice(0, 12);
  $('roster').innerHTML = shown.map(n =>
    `<button class="chip" data-id="${n.id}"><span class="dot" style="background:${n.color}"></span><span>${n === sim.story.hero ? '★ ' : n === sim.story.rival ? '⚔ ' : ''}${esc(n.name)}</span><span class="ic"></span></button>`).join('')
    + (sorted.length > 12 ? `<button class="chip more" id="rosterMore">${ui.allRoster ? 'weniger anzeigen' : `+${sorted.length - 12} weitere`}</button>` : '');
  const more = $('rosterMore'); if (more) more.addEventListener('click', () => { ui.allRoster = !ui.allRoster; buildRoster(); });
  $('roster').querySelectorAll('.chip[data-id]').forEach(b => b.addEventListener('click', () => select(sim.npcs.find(n => n.id === Number(b.dataset.id)))));
  updateRoster();
}

function updateRoster() {
  $('roster').querySelectorAll('.chip[data-id]').forEach(b => {
    const n = sim.npcs.find(x => x.id === Number(b.dataset.id));
    if (!n) return;
    b.classList.toggle('sel', n === ui.selected);
    b.querySelector('.ic').textContent = `${n.moodEmoji}${n.action ? n.action.icon : ''}`;
  });
}

const bar = (label, v, color) =>
  `<div><div class="lbl"><span>${label}</span><span>${Math.round(v)}</span></div><div class="bar"><i style="width:${v}%;background:${color}"></i></div></div>`;
const relLabel = v => v >= 50 ? 'Freund' : v >= 20 ? 'gut bekannt' : v >= 0 ? 'kennt sich' : 'mag nicht';
const SKILL_NAMES = { woodcutting: 'Holzfällen', building: 'Bauen', gathering: 'Sammeln', social: 'Gespräche', gate: 'Risse', farming: 'Ackerbau', forging: 'Schmieden' };
const npcLink = n => `<button class="link" data-npc="${n.id}"><span class="dot" style="background:${n.color}"></span>${esc(n.name)}${n.awakened ? ` <small>Lv ${n.level}</small>` : ''}</button>`;
const LORE = {
  ruin: ['Uralte Säulen, überwuchert von Efeu.', 'Niemand weiß, wer hier einst lebte – nur dass sie verschwanden, als die Risse kamen.'],
  rock: ['Ein Felsbrocken aus grauem Stein.', 'Eines Tages wird man hier Stein für größere Bauten brechen.'],
  water: ['Klares Wasser.', 'Fische glitzern unter der Oberfläche.'],
  ford: ['Eine Furt mit Trittsteinen.', 'Hier kann man den Fluss trockenen Fußes überqueren.'],
};

/* ---- Info-Fenster wie in Anime und Games: Kategorie, Rang, Effekt, Beschreibung ---- */
const RANK_COL = { F: '#9aa4ad', E: '#9fd4a0', D: '#7cc4ff', C: '#5fa8ff', B: '#b07cff', A: '#ffb84a', S: '#ff5a5a', '???': '#d9cfb8', '–': '#8fd3ff' };
const CARD = {
  castle: ['GEBÄUDE', 'S', 'Sitz der Regentschaft · Banner des Königreichs', 'Man sagt, jeder Stein wurde von einer anderen Hand gesetzt – und jede Hand gehört zum Reich.'],
  house:  ['GEBÄUDE', 'D', 'Erholung im Schlaf <b>×2</b> · Wetterschutz', 'Ein Zuhause aus Eldwald-Eiche. Wer hier schläft, träumt von besseren Tagen.'],
  site:   ['BAUSTELLE', '–', 'Gemeinsam bauen gibt <b>Bau-Erfahrung</b>', 'Hämmern, Sägen, Rufen. Hier wächst die Zukunft Brett für Brett.'],
  camp:   ['ORT', 'C', 'Lager für Holz, Brot, Stein und Kristalle', 'Das erste Feuer erlosch nie. Die Alten sagen, es wärmt auch die Seele.'],
  tree:   ['RESSOURCE', 'F', 'Ertrag: <b>Holz</b> · wächst nach 2 Tagen nach', 'Uralte Wurzeln. Wer genau hinhört, hört den Wald atmen.'],
  stump:  ['RESSOURCE', 'F', 'Regeneration läuft …', 'Auch das Ende eines Baumes ist der Anfang eines neuen.'],
  bush:   ['RESSOURCE', 'F', 'Ertrag: <b>Beeren</b> · senkt Hunger', 'Süß, saftig, ein bisschen sauer. Die Lieblingsspeise aller Siedler.'],
  field:  ['FELD', 'E', 'Ertrag: <b>Brot</b> nach einem Tag', 'Goldene Ähren, die im Wind miteinander flüstern.'],
  tower:  ['VERTEIDIGUNG', 'C', 'Schießt nachts auf <b>Monster</b>', 'Die Fackel dort oben ist das Letzte, was ein Rissling je sieht.'],
  tavern: ['GEBÄUDE', 'C', '<b>Laune +</b> · <b>Gemeinschaft +</b> · kostet 1 🪙', 'Hier entstehen Freundschaften, Lieder – und die besten Lügengeschichten.'],
  temple: ['HEILIGTUM', 'B', '<b>Heilung</b> · <b>Laune +</b>', 'Ein Ort, an dem selbst Erwachte ihre Waffen ablegen.'],
  rock:   ['RESSOURCE', 'E', 'Ertrag: <b>Stein</b>', 'Grau, schwer, geduldig. Aus Steinen wie diesem werden Burgen.'],
  market: ['GEBÄUDE', 'B', 'Markttag um 12 Uhr: Überschuss → <b>Münzen</b>', 'Händlerrufe, Gewürzduft und das Klimpern von Münzen.'],
  feste: ['NACHBARREICH', 'A', '', 'Dunkle Mauern, fremde Banner. Hinter diesen Zinnen wird über euer Schicksal beraten.'],
  lagerhaus: ['LAGER', 'C', 'Hier liegt alles, was gesammelt und hergestellt wird · übrige Ausrüstung wird verteilt', 'Kisten, Säcke, Fässer – und irgendwo ganz hinten eine Kiste, die niemand mehr öffnen will.'],
  smithy: ['WERKSTATT', 'B', '💎 + 🪵 → <b>Ausrüstung</b> in 5 Seltenheiten', 'Hier entsteht, worüber man Lieder singt. Oder zumindest ordentliche Stiefel.'],
  grass:  ['GELÄNDE', '–', 'Bauland', 'Weites Land voller Möglichkeiten.'],
  forsthaus:   ['GEBÄUDE', 'C', 'Holzfällen <b>schneller</b> · Holzfäller pflanzen neue Bäume', 'Wer hier wohnt, kennt jeden Baum beim Namen – und pflanzt für jeden gefällten einen neuen.'],
  bauernhof:   ['GEBÄUDE', 'C', 'Bauern versorgen Hühner und Kuh: <b>Eier und Milch</b>', 'Gackern, Muhen und der Duft von frischem Heu. Hier wird niemand hungrig.'],
  gildenhalle: ['GEBÄUDE', 'A', 'Gildenversammlung am Abend · <b>mehr Erfahrung</b> für alle Erwachten', 'An der langen Tafel wurden mehr Abenteuer geplant als irgendwo sonst im Reich.'],
  ruin:   ['RUINE', '???', 'Geheimnis: <b>unbekannt</b>', 'Niemand weiß, wer hier lebte – nur, dass sie verschwanden, als die Risse kamen.'],
  water:  ['GELÄNDE', '–', 'Nicht begehbar', 'Klares Wasser. Silberne Fische glitzern unter der Oberfläche.'],
  ford:   ['GELÄNDE', '–', 'Überquerung des Flusses', 'Trittsteine, glatt geschliffen von tausend Schritten.'],
};
const GATE_RANK = ['', 'E', 'C', 'A'], GATE_MON = ['', 'Rissling', 'Schattenwolf', 'Aschegolem'];
function sysCard(top, rank, body, fx, lore, cls = '') {
  return `<div class="syscard ${cls}"><div class="sc-top"><span>[ ${top} ]</span>${rank ? `<span class="sc-rank" style="color:${RANK_COL[rank] || '#8fd3ff'}">RANG ${rank}</span>` : ''}</div>`
    + body + (fx ? `<div class="sc-fx">✦ ${fx}</div>` : '') + (lore ? `<div class="lore">„${lore}“</div>` : '') + '</div>';
}
function tileInfo(t) {
  const c = CARD[t.type] || ['INFO', '', '', ''];
  let [top, rank, fx, lore] = c;
  if (t.type === 'gate') {
    const g = t.gate; rank = g.red ? 'S' : GATE_RANK[g.tier]; top = 'DUNGEON';
    fx = g.red ? 'Boss: <b>Kronenfresser</b> · Gefahr: <b>tödlich</b>' : `Monster: <b>${GATE_MON[g.tier]}</b> · Beute: <b>Mana-Kristalle</b>`;
    if (isSRift(sim, t)) { const B = RIFT_BOSSES[sim.srift.kind]; rank = 'S'; fx = sim.srift.broken ? `Boss <b>${B.name}</b> ist ausgebrochen!` : `Boss: <b>${B.name}</b> · nur für die Gilde · Ausbruch in <b>${Math.max(0, Math.ceil((sim.srift.breakAt - sim.minutes) / 60))} h</b>`; }
    lore = isSRift(sim, t) ? 'Gold und Schwärze wirbeln umeinander. Der Riss hat einen Rang erreicht, den es nicht geben dürfte.' : g.red ? 'Er pulsiert wie ein Herz. Etwas Uraltes wartet dahinter – und es hat Hunger.' : 'Ein Spalt zwischen den Welten. Wer hineingeht, kommt stärker zurück – oder gar nicht.';
  }
  if (t.type === 'ruin' && t.searched) { rank = 'E'; fx = 'Bereits durchsucht'; }
  if (t.type === 'camp' && sim.kingdom && (t.town || sim.capital).capital) rank = 'A';
  const b = t.building;
  if (b && CONFIG.buildings[b.type] && b.type !== 'castle') {
    const L = b.level || 1, up = t.siteRef && t.siteRef.upgrade === b;
    const eff = { house: `${b.beds} Betten`, smithy: 'bessere Seltenheiten', tower: `Reichweite ${CONFIG.buildings.tower.range + L - 1}, Schaden +${(L - 1) * 40} %`, temple: `Heilung ×${L}`, market: `Markterlös +${(L - 1) * 50} %`, tavern: 'gemütlicher' }[b.type] || '';
    fx = `Stufe <b>${roman(L)}</b> / III${eff ? ' · ' + eff : ''}` + (up ? ` · <b>Ausbau läuft: ${Math.floor(t.siteRef.progress / t.siteRef.work * 100)} %</b>` : L < 3 ? ' · ausbaubar' : ' · höchste Stufe') + (fx ? '<br>✦ ' + fx : '');
  }
  return sysCard(top, rank, tileBody(t), fx, lore, t.type === 'gate' && (t.gate.red || isSRift(sim, t)) ? 'red' : t.type === 'castle' ? 'gold' : '');
}

const MON_CARD = {
  rissling: ['E', 'Ein kichernder Kobold aus dem Riss. Allein harmlos – in Gruppen gefährlich.'],
  schattenwolf: ['C', 'Aus Nebel geformt. Er jagt lautlos und riecht Angst auf hundert Schritt.'],
  aschegolem: ['B', 'Glühende Kohle unter Steinhaut. Jeder Schritt lässt den Boden zittern.'],
  bandit: ['D', 'Rote Schals, schnelle Messer und keine Lust auf ehrliche Arbeit. Sie wollen nur eins: das Lager.'],
  banditenboss: ['B', 'Der Hauptmann der Rotschal-Bande. Man sagt, er habe noch nie einen Kampf fair begonnen – und noch nie einen Sack Münzen liegen lassen.'],
  ritter: ['C', 'Gepanzert, diszipliniert, gehorsam. Ein Dornritter stellt keine Fragen – er marschiert.'],
  feldherr: ['A', 'Der Feldherr des Nachbarreichs. Wer ihn fällt, bricht die Belagerung.'],
  smaragdkoloss: ['S', RIFT_BOSSES.smaragdkoloss.lore], glutwurm: ['S', RIFT_BOSSES.glutwurm.lore], nebelhirte: ['S', RIFT_BOSSES.nebelhirte.lore], sternenschlund: ['S', RIFT_BOSSES.sternenschlund.lore],
  kronenfresser: ['S', 'Der Herr des roten Risses. Er frisst keine Menschen. Er frisst Königreiche.'],
};
function monsterInfo(m) {
  const M = MONSTERS[m.kind], [rank, lore] = MON_CARD[m.kind] || ['?', ''], atk = Math.round(M.atk * sim.monsterScale);
  const top = sim.npcs.filter(n => n.awakened).sort((a, b) => b.attack - a.attack)[0];
  const danger = !top ? 'unbekannt' : m.boss || m.riftBoss ? 'tödlich' : atk * 4 > top.maxHp * 0.5 ? 'hoch' : atk * 4 > top.maxHp * 0.25 ? 'mittel' : 'gering';
  const loot = m.bandit ? lootText(m.loot) : '';
  return sysCard(m.boss ? 'BOSS' : m.riftBoss ? 'RISS-BOSS · AUSBRUCH' : m.bandit ? 'FEIND · BANDIT' : m.army ? 'FEIND · HEER' : 'MONSTER', rank,
    `<div class="insp-head"><span class="big-ic">${m.boss ? '👹' : m.riftBoss ? '🟨' : m.bandit ? '🗡️' : '👾'}</span><div><b>${esc(M.name)}</b><div class="muted">${m.boss ? 'Herr des roten Risses' : m.riftBoss ? esc(RIFT_BOSSES[m.kind].title) : m.bandit ? `Rotschal-Bande · ${m.state === 'flee' ? 'flieht!' : `will ins Lager von ${esc(m.town.name)}`}` : m.army ? `Heer von ${esc(sim.realm.rival ? sim.realm.rival.name : 'fernem Land')} · belagert ${esc(sim.capital.name)}` : 'Kreatur aus dem Riss'}</div></div></div>`
    + (m.bandit ? `<div class="muted small">💰 Beute im Sack: <b>${loot || 'noch nichts'}</b></div>` : '')
    + `<div class="lbl"><span>Leben</span><span>${Math.max(0, Math.round(m.hp))} / ${m.maxHp}</span></div><div class="bar"><i style="width:${Math.max(0, m.hp / m.maxHp * 100)}%;background:#e04848"></i></div>`
    + `<div class="stats"><span><small>Angriff</small><b>${atk}</b></span><span><small>Tempo</small><b>${M.speed >= 0.3 ? 'schnell' : M.speed >= 0.2 ? 'mittel' : 'langsam'}</b></span><span><small>EP</small><b>${M.xp}</b></span><span><small>Gefahr</small><b>${danger}</b></span></div>`,
    m.boss ? 'Zieht sich bei Sonnenaufgang verwundet zurück' : m.riftBoss ? 'Trotzt dem Morgenlicht · wer ihn fällt, schließt den S-Rang-Riss' : m.bandit ? 'Wer ihn besiegt, holt die Beute zurück' : m.army ? 'Zieht sich bei Nacht zurück · ist das ganze Heer besiegt, ist die Belagerung gebrochen' : 'Zerfällt im Morgenlicht zu Asche', lore, 'red');
}

const ITEM_LORE = [
  'Solide Handarbeit. Nichts Besonderes – aber verlässlich.',
  'Sorgfältig geschmiedet. Man spürt die Mühe in jedem Hammerschlag.',
  'Ein schwaches Leuchten liegt auf dem Metall. Mana-Kristalle wurden hineingeschmolzen.',
  'Golden schimmernd. Wer es trägt, spürt, wie die Welt für einen Herzschlag innehält.',
  'Blutrot pulsierend. Es heißt, so etwas entstehe nur einmal in einem Zeitalter.',
];
/* ---- Lager und Rucksack: Inventar wie in einem Game ---------------------- */
const RES_INFO = {
  wood:     { icon: '🪵', name: 'Holz', rank: 'F', from: 'Holzfäller fällen Bäume', use: 'Häuser, Ausbau, Schmiede', lore: 'Duftet nach Harz. Das Rückgrat jeder Siedlung.' },
  stone:    { icon: '🪨', name: 'Stein', rank: 'E', from: 'Steinmetze brechen Felsen', use: 'Wachtürme, Tempel, Ausbau', lore: 'Schwer, grau, geduldig. Aus ihm werden Mauern, die Jahrhunderte stehen.' },
  food:     { icon: '🍞', name: 'Brot und Vorräte', rank: 'F', from: 'Felder, Eier und Milch vom Bauernhof, Händlerkarren', use: 'Essen – stillt den Hunger', lore: 'Frisch aus dem Ofen. Niemand kämpft gut mit leerem Magen.' },
  crystals: { icon: '💎', name: 'Mana-Kristalle', rank: 'B', from: 'Risse, Ruinen, besiegte Monster, fahrender Händler', use: 'Schmieden, Verstärken, Burg, Gildenhalle', lore: 'Sie summen leise, wenn man sie ans Ohr hält. Man sagt, in jedem schläft ein Stück einer anderen Welt.' },
  coins:    { icon: '🪙', name: 'Münzen', rank: 'D', from: 'Markttag, Abgaben der Außenposten', use: 'Taverne, Tempel, Handel', lore: 'Geprägt mit dem Wappen des Reiches. Klimpern ist das schönste Geräusch der Welt – sagen die Händler.' },
  berries:  { icon: '🫐', name: 'Beeren', rank: 'F', from: 'Beerensträucher', use: 'Sofort essen', lore: 'Süß, saftig und ein bisschen sauer.' },
};
const SLOT_ICON = { weapon: '⚔️', armor: '🛡️', helmet: '🪖', boots: '👢', cape: '🧥' };
const WEAPON_ICON = { sword: '🗡️', bow: '🏹', staff: '🪄', hammer: '🔨', spear: '🔱', blade: '⚔️' };
/** Raster aus Feldern: Rohstoffe mit Anzahl, Ausrüstung mit Seltenheitsrahmen. */
function invGrid(cells, total = 12) {
  let html = '<div class="inv">';
  for (let i = 0; i < Math.max(total, cells.length); i++) {
    const c = cells[i];
    if (!c) { html += '<div class="cell empty"></div>'; continue; }
    html += `<button class="cell" ${c.attr} style="${c.color ? `border-color:${c.color};box-shadow:inset 0 0 10px ${c.color}55` : ''}" title="${esc(c.title)}"><span>${c.icon}</span>${c.count != null ? `<b>${c.count}</b>` : ''}${c.plus ? `<i>+${c.plus}</i>` : ''}</button>`;
  }
  return html + '</div>';
}
function townInventory(tw) {
  const cells = ['wood', 'stone', 'food', 'crystals', 'coins'].filter(k => tw.stock[k] > 0)
    .map(k => ({ icon: RES_INFO[k].icon, count: tw.stock[k], title: RES_INFO[k].name, attr: `data-res="${k}" data-town="${tw.id}"` }));
  (tw.items || []).forEach((it, i) => cells.push({ icon: it.slot === 'weapon' ? WEAPON_ICON[it.kind] || '⚔️' : SLOT_ICON[it.slot], color: RARITIES[it.rarity].color, plus: it.plus, title: itemName(it), attr: `data-store="${i}" data-town="${tw.id}"` }));
  return `<div class="sec"><h4>📦 Lager von ${esc(tw.name)} <span class="muted">· antippen für Infos</span></h4>${invGrid(cells, 15)}</div>`
    + `<div class="sec"><h4>📒 Handelsbuch</h4>${tw.trades.length ? `<ul>${tw.trades.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '<span class="muted">noch keine Geschäfte</span>'}</div>`;
}
function openRes(k, tw) {
  const r = RES_INFO[k];
  $('modalTitle').textContent = ''; $('modalText').textContent = '';
  $('modalHtml').innerHTML = sysCard('ROHSTOFF', r.rank,
    `<div class="insp-head"><span class="big-ic">${r.icon}</span><div><b>${r.name}</b><div class="muted">im Lager von ${esc(tw.name)}: <b>${tw.stock[k] || 0}</b></div></div></div>`
    + `<div class="muted small">Gewonnen durch: <b>${r.from}</b><br>Gebraucht für: <b>${r.use}</b></div>`, '', r.lore);
  $('modalHtml').hidden = false; $('modalArea').hidden = true; $('modalOk').hidden = true; $('modal').hidden = false;
}
function bindInv(box) {
  box.querySelectorAll('[data-res]').forEach(b => b.addEventListener('click', () => openRes(b.dataset.res, sim.towns[Number(b.dataset.town)] || sim.capital)));
  box.querySelectorAll('[data-store]').forEach(b => b.addEventListener('click', () => { const tw = sim.towns[Number(b.dataset.town)] || sim.capital, it = tw.items[Number(b.dataset.store)]; if (it) openItem(null, it.slot, it); }));
}

function openItem(n, slot, stored = null) {
  const it = stored || n.gear[slot]; if (!it) return;
  slot = it.slot || slot;
  const R = RARITIES[it.rarity], rank = ['F', 'D', 'B', 'A', 'S'][it.rarity];
  $('modalTitle').textContent = ''; $('modalText').textContent = '';
  $('modalHtml').innerHTML = sysCard('GEGENSTAND', rank,
    `<div style="font:700 17px Georgia,serif;color:${R.color};text-shadow:0 0 10px ${R.color}66">${esc(itemName(it))}</div>`
    + (it.plus ? `<div class="lbl"><span>Verstärkung</span><span>+${it.plus} / +10</span></div><div class="bar"><i style="width:${it.plus * 10}%;background:#8fd3ff"></i></div>` : '<div class="muted small">Noch nicht verstärkt – in der Schmiede bis +10 möglich.</div>')
    + `<div class="muted small">${R.name} · ${SLOT_NAMES[slot]}</div>`
    + `<div class="stats"><span><small>${slot === 'weapon' ? 'Angriff' : 'Abwehr'}</small><b>+${it.power}</b></span><span><small>Haltbarkeit</small><b>∞</b></span><span><small>${stored ? 'Ort' : 'Träger'}</small><b>${stored ? '📦 Lager' : esc(n.name)}</b></span></div>`
    + `<div class="muted small">Geschmiedet von <b>${esc(it.smith || 'unbekannt')}</b> · Einschränkung: nur Erwachte</div>`,
    it.rarity >= 3 ? 'Einzigartig – es existiert nur ein einziges Exemplar' : '', ITEM_LORE[it.rarity], it.rarity >= 4 ? 'red' : it.rarity >= 3 ? 'gold' : '');
  $('modalHtml').hidden = false; $('modalArea').hidden = true; $('modalOk').hidden = true; $('modal').hidden = false;
}

const PROF_LORE = {
  settler: 'Hände voller Schwielen, Herz voller Hoffnung. Ohne Leute wie diese gäbe es kein Reich.',
  holzfaeller: 'Riecht nach Harz und Sägespänen. Kennt jeden Baum im Eldwald beim Namen.',
  bauer: 'Steht vor der Sonne auf und weiß, wann es regnen wird. Sagt jedenfalls jeder.',
  handwerker: 'Kein Balken zu schwer, kein Nagel zu klein. Baut Häuser, die Generationen überdauern.',
  steinmetz: 'Hört dem Stein zu, bevor der Hammer fällt. Aus Fels wird hier Geschichte.',
};

/** Steckbrief für eine angetippte Kachel (Haus, Baum, Lager, Riss …). */
function tileBody(t) {
  const st = sim.settlement, R = CONFIG.resources;
  const head = (icon, title, sub = '') => `<div class="insp-head"><span class="big-ic">${icon}</span><div><b>${title}</b>${sub ? `<div class="muted">${sub}</div>` : ''}</div></div>`;
  switch (t.type) {
    case 'castle': {
      const b = t.building;
      return head('🏰', `Burg von ${sim.kingdom ? esc(sim.kingdom.name) : 'der Hauptstadt'}`, b && b.builtDay ? `vollendet an Tag ${b.builtDay}` : '')
        + `<div class="thought">Mauern aus grauem Stein, Türme mit wehenden Bannern. Hier wohnt die Regentschaft des Königreichs.</div>`
        + (b ? `<div class="sec"><h4>Bewohner</h4>${b.residents.map(npcLink).join('') || '<span class="muted">noch leer</span>'}</div>` : '');
    }
    case 'house': {
      const b = t.building, inside = [...b.sleepers];
      return head('🏠', `Haus Nr. ${b.id}${b.town && !b.town.capital ? ' in ' + esc(b.town.name) : ''}`, b.builtDay ? `gebaut an Tag ${b.builtDay} um ${b.builtClock}` : '')
        + `<div class="sec"><h4>Bewohner (${b.residents.length}/${b.beds})</h4>${b.residents.length ? b.residents.map(npcLink).join('') : '<span class="muted">steht noch leer</span>'}</div>`
        + `<div class="sec"><h4>Gerade drinnen</h4>${inside.length ? inside.map(n => npcLink(n) + ' 💤').join('') : '<span class="muted">niemand</span>'}</div>`
        + `<div class="sec"><h4>Erbaut von</h4>${b.builders && b.builders.length ? esc(b.builders.join(', ')) : '<span class="muted">unbekannt</span>'}</div>`;
    }
    case 'site': {
      const site = st.site, p = site ? Math.floor(site.progress / site.work * 100) : 0;
      const helpers = sim.npcs.filter(n => n.task && n.task.actionId === 'build');
      return head('🏗️', 'Baustelle', `ein neues Haus · ${p} % fertig`) + bar('Fortschritt', p, 'var(--accent)')
        + `<div class="sec"><h4>Helfer gerade</h4>${helpers.length ? helpers.map(npcLink).join('') : '<span class="muted">gerade niemand</span>'}</div>`;
    }
    case 'camp': {
      const tw = t.town || sim.capital, st = tw;
      return head(tw.capital && sim.kingdom ? '👑' : '🔥', tw.capital && sim.kingdom ? `${tw.name} – Hauptstadt des Königreichs` : tw.capital ? 'Lagerfeuer & Lager' : `Außenposten ${tw.name}`,
        `${tw.members.length} Bewohner · ${tw.houses.length} Häuser${tw.leader ? ' · geführt von ' + esc(tw.leader) : ''}`)
        + townInventory(tw)
        + (sim.guild ? `<div class="sec"><h4>Gilde</h4>🛡️ <b>${esc(sim.guild.name)}</b> <span class="muted">· gegründet an Tag ${sim.guild.founded} · Anführung: ${esc(sim.guild.leader)}</span></div>` : '')
        + (tw.capital && sim.kingdom ? `<div class="sec"><h4>Königreich ${esc(sim.kingdom.name)}</h4>Regent: <b>${esc(sim.kingdom.regent)}</b> · gegründet an Tag ${sim.kingdom.founded}<br>${sim.towns.map(x => `${x.capital ? '👑' : '🏕️'} ${esc(x.name)} (${x.members.length})`).join(' · ')}</div>` : '')
        + `<div class="sec"><h4>Erwachte</h4>${sim.npcs.filter(n => n.awakened && n.town === tw).map(npcLink).join('') || '<span class="muted">noch niemand … aber nachts fällt manchmal ein seltsames Licht.</span>'}</div>`;
    }
    case 'tree': return head(t.shade < 0.3 ? '🌲' : '🌳', t.shade < 0.3 ? 'Tanne' : 'Laubbaum', `${t.wood} von ${R.treeWood} Holz übrig`) + bar('Holz', t.wood / R.treeWood * 100, '#c99c66');
    case 'stump': return head('🪵', 'Baumstumpf', `wächst nach: noch etwa ${Math.ceil((R.treeRegrowMinutes - t.timer) / 60)} Stunden`) + bar('Nachwachsen', t.timer / R.treeRegrowMinutes * 100, 'var(--energy)');
    case 'bush': return head('🫐', 'Beerenstrauch', `${t.berries} von ${R.bushMaxBerries} Beeren` + (t.berries < R.bushMaxBerries ? ` · nächste Beere in ${R.berryRegrowMinutes - t.timer} Min.` : ' · voll')) + bar('Beeren', t.berries / R.bushMaxBerries * 100, '#c03a6b');
    case 'gate': {
      const g = t.gate, cols = ['', 'blau', 'violett', 'blutrot'];
      return head('🌀', g.name, `Riss des Rangs ${roman(g.tier)} · leuchtet ${cols[g.tier]}`)
        + `<div class="thought">Ein Spalt zwischen den Welten. Dahinter regt sich etwas … Nur Erwachte ab Level ${CONFIG.gates.minLevel + (g.tier - 1) * 3} wagen sich hinein.</div>`
        + `<div class="sec"><h4>Expeditionen</h4><span class="score">💎 bezwungen ${g.cleared}×</span><span class="score">🩸 geflohen ${g.failed}×</span></div>`;
    }
    case 'field': {
      const p = Math.min(1, t.timer / CONFIG.farming.growMinutes);
      return head('🌾', 'Getreidefeld', p >= 1 ? 'reif – bereit zur Ernte!' : `wächst … noch etwa ${Math.ceil((1 - p) * CONFIG.farming.growMinutes / 60)} Stunden`)
        + bar('Wachstum', p * 100, '#e6c45a') + `<div class="muted small">Eine Ernte bringt ${CONFIG.farming.harvestFood} Brot ins Lager.</div>`;
    }
    case 'tower': return head('🗼', 'Wachturm', `Schießt nachts auf Monster im Umkreis von ${CONFIG.buildings.tower.range} Feldern`) + '<div class="thought">Oben brennt eine Fackel. Wer Wache hält, sieht die Risslinge schon von Weitem.</div>';
    case 'tavern': { const b = t.building; return head('🍺', 'Taverne „Zum Goldenen Krug“', `${b.guests || 0} Gäste gerade · abends geöffnet`) + '<div class="thought">Lautenklänge, Lachen und Geschichten über die Risse. Ein Krug kostet eine Münze aus der Stadtkasse.</div>'; }
    case 'temple': return head('⛩️', 'Tempel des Lichts', 'Hier heilen Wunden und schwere Herzen') + '<div class="thought">Weißer Stein und eine goldene Kuppel, die selbst nachts schimmert.</div>';
    case 'rock': return head('🪨', 'Fels', `${t.wood || 0} Stein übrig – Steinmetze brechen ihn ab`) + bar('Stein', (t.wood || 0) / CONFIG.resources.rockStone * 100, '#a3a9ae');
    case 'market': {
      const tw = (t.building && t.building.town) || sim.capital, shoppers = sim.npcs.filter(n => n.task && n.task.actionId === 'visitMarket');
      return head('🛍️', `Marktplatz von ${esc(tw.name)}`, 'Markttag ist jeden Mittag – Überschuss wird zu Münzen.')
        + `<div class="sec"><h4>Kasse und Vorräte</h4><span class="score">🪙 ${tw.stock.coins} Münzen</span><span class="score">🍞 ${tw.stock.food}</span><span class="score">🪵 ${tw.stock.wood}</span><span class="score">💎 ${tw.stock.crystals}</span></div>`
        + `<div class="sec"><h4>Gerade auf dem Markt</h4>${shoppers.length ? shoppers.map(npcLink).join('') : '<span class="muted">niemand</span>'}</div>`
        + `<div class="sec"><h4>Letzte Geschäfte</h4>${tw.trades.length ? `<ul>${tw.trades.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '<span class="muted">noch keine</span>'}</div>`;
    }
    case 'smithy': {
      const b = t.building, smiths = sim.npcs.filter(n => n.forged).sort((a, b) => b.forged - a.forged);
      return head('⚒️', 'Schmiede', b.busy ? `${esc(b.busy.name)} schmiedet gerade …` : 'Das Feuer glimmt. Kristalle + Holz = Ausrüstung.')
        + `<div class="sec"><h4>Vorräte</h4><span class="score">💎 ${st.stock.crystals} Kristalle</span><span class="score">🪵 ${st.stock.wood} Holz</span></div>`
        + `<div class="sec"><h4>Schmiede</h4>${smiths.length ? smiths.map(n => npcLink(n) + ` ${n.forged}×`).join('') : '<span class="muted">noch nichts geschmiedet</span>'}</div>`;
    }
    case 'feste': {
      const r = sim.realm.rival; if (!r) return head('🏰', 'Verlassene Feste');
      const st = { neutral: '🤨 Neutral', allied: '🤝 Verbündet', war: '⚔️ Krieg', vassal: '👑 Vasall' }[r.state];
      return head('🏰', `Feste ${esc(r.name)}`, `${esc(r.ruler)} · ${st}`)
        + `<div class="lbl"><span>Beziehung</span><span>${r.relation}</span></div><div class="bar"><i style="width:${(r.relation + 100) / 2}%;background:${r.relation >= 0 ? '#7ac74f' : '#e04848'}"></i></div>`
        + `<div class="stats"><span><small>Eure Stärke</small><b>${Math.round(sim.realm.strength)}</b></span><span><small>Ihre Stärke</small><b>${Math.round(sim.realm.rivalStrength)}</b></span><span><small>Belagerungen</small><b>${sim.realm.sieges}</b></span><span><small>Siege</small><b>${sim.realm.siegeWins}</b></span></div>`
        + `<div class="sec"><h4>Was geschah</h4>${r.history.length ? `<ul>${r.history.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '<span class="muted">noch nichts</span>'}</div>`;
    }
    case 'lagerhaus': { const tw = t.building.town || sim.capital; return head('📦', `Lagerhaus von ${esc(tw.name)}`, 'Alles, was gesammelt und hergestellt wird, landet hier') + townInventory(tw); }
    case 'forsthaus': return head('🌲', 'Forsthaus', 'Hier wohnt die Liebe zum Wald') + `<div class="sec"><h4>Holzfäller</h4>${sim.npcs.filter(n => n.profession === 'holzfaeller' && n.town === t.building.town).slice(0, 8).map(npcLink).join('') || '<span class="muted">noch niemand</span>'}</div>`;
    case 'bauernhof': return head('🐄', 'Bauernhof', 'Hühner, eine Kuh und viel Heu') + `<div class="sec"><h4>Bauern</h4>${sim.npcs.filter(n => n.profession === 'bauer' && n.town === t.building.town).slice(0, 8).map(npcLink).join('') || '<span class="muted">noch niemand</span>'}</div>`;
    case 'gildenhalle': {
      const g = sim.guild, need = g ? Math.round(150 * (g.level || 1) ** 1.5) : 1;
      return head('🛡️', g ? `Gildenhalle der „${esc(g.name)}“` : 'Gildenhalle', g ? `Gilden-Stufe ${g.level || 1} · Anführung: ${esc(g.leader)}` : '')
        + (g ? `<div class="lbl"><span>Gilden-Erfahrung</span><span>${Math.floor(g.xp || 0)} / ${need}</span></div><div class="bar"><i style="width:${Math.min(100, (g.xp || 0) / need * 100)}%;background:#8fd3ff"></i></div>` : '')
        + `<div class="sec"><h4>Mitglieder</h4>${sim.npcs.filter(n => n.awakened).map(npcLink).join('')}</div>`;
    }
    case 'grass':
      return t.traffic > 20 ? head('👣', 'Trampelpfad', `${t.traffic} Schritte – hier laufen die Siedler oft entlang`) : head('🌾', 'Wiese', 'Freies Land – vielleicht steht hier bald ein Haus.');
    default: { const L = LORE[t.type] || ['', '']; return head({ ruin: '🏛️', rock: '🪨', water: '💧', ford: '🪨' }[t.type] || '❔', TILE_DEFS[t.type].name, L[0]) + (L[1] ? `<div class="thought">${L[1]}</div>` : ''); }
  }
}

/** Statusfenster der Erwachten. */
function statusWindow(n) {
  if (!n.awakened) return `<div class="sec"><h4>Status</h4>${bar('Leben', n.hp / n.maxHp * 100, '#e04848')}<span class="muted">${CONFIG.professions[n.profession].name} – nicht erwacht. Lebt einfach sein Leben.</span></div>`;
  const c = n.cls ? CLASSES[n.cls] : null, need = xpForLevel(n.level), q = n.quest;
  return `<div class="status">
    <div class="st-head"><span>[ STATUS ]</span><span>Level ${n.level}</span></div>
    <div class="st-row"><b>${c ? `${c.icon} ${c.name}` : 'Klasse: noch keine (ab Level ' + CONFIG.levels.classLevel + ')'}</b></div>
    ${c ? `<div class="muted small">${c.desc}</div>` : ''}
    ${sim.guild ? `<div class="muted small">🛡️ ${esc(sim.guild.name)}</div>` : ''}
    <div class="lbl"><span>Leben</span><span>${Math.round(n.hp)} / ${n.maxHp}</span></div><div class="bar"><i style="width:${n.hp / n.maxHp * 100}%;background:#e04848"></i></div>
    <div class="lbl"><span>EP</span><span>${Math.floor(n.xp)} / ${need}</span></div><div class="bar"><i style="width:${n.xp / need * 100}%;background:#8fd3ff"></i></div>
    <div class="stats"><span><small>Angriff</small><b>${n.attack}</b></span><span><small>Abwehr</small><b>${n.defense}</b></span><span><small>Siege</small><b>${n.kills}</b></span><span><small>Geschmiedet</small><b>${n.forged}</b></span></div>
    <div class="gear">${SLOTS.map(sl => { const it = n.gear[sl]; return `<div class="slot"${it ? ` data-slot="${sl}"` : ''}><small>${SLOT_NAMES[sl]}</small>${it ? `<b style="color:${RARITIES[it.rarity].color}">${esc(itemName(it))}</b><span class="muted">${RARITIES[it.rarity].name} · +${it.power}${it.smith ? ' · von ' + esc(it.smith) : ''}</span>` : '<span class="muted">leer</span>'}</div>`; }).join('')}</div>
    <div class="stats">${Object.entries(n.stats).map(([k, v]) => `<span><small>${STAT_NAMES[k]}</small><b>${v}</b></span>`).join('')}</div>
    ${q ? `<div class="quest ${q.done ? 'done' : ''}">📜 Tägliche Aufgabe: ${esc(q.text)} ${q.done ? '✔' : `(${Math.floor(q.prog)}/${q.goal})`}</div>` : ''}
    <div class="sec"><h4>Fähigkeiten</h4>${n.unlocked.length ? n.unlocked.map(id => `<span class="score" title="${esc(SKILLS[id].desc)}">✨ ${SKILLS[id].name}</span>`).join('') : '<span class="muted">noch keine</span>'}</div>
    <div class="sec"><h4>Titel</h4>${n.titles.map(t => `<span class="score win">🏅 ${esc(t)}</span>`).join('') || '<span class="muted">–</span>'}</div>
  </div>`;
}

function updateInspector() {
  const n = ui.selected, box = $('inspector');
  if (!n && ui.selMonster) { if (ui.selMonster.hp > 0 && sim.monsters.includes(ui.selMonster)) box.innerHTML = monsterInfo(ui.selMonster); else { ui.selMonster = null; box.innerHTML = '<p class="empty">Das Monster ist verschwunden.</p>'; } return; }
  if (!n && ui.selTile) { box.innerHTML = tileInfo(ui.selTile); bindLinks(box); bindInv(box); return; }
  if (!n) { box.innerHTML = '<p class="empty">Tippe einen Siedler an (auf der Karte oder oben in der Liste), um seine Gedanken zu lesen.</p>'; return; }
  const a = n.action;
  const rels = Object.entries(n.relations).map(([id, v]) => ({ o: sim.npcs.find(x => x.id === Number(id)), v }))
    .filter(r => r.o).sort((p, q) => q.v - p.v).slice(0, 4);
  const skillRows = Object.keys(SKILL_INFO).filter(k => n.skills[k] > 0).sort((a, b) => n.skills[b] / SKILL_INFO[b].per - n.skills[a] / SKILL_INFO[a].per).map(k => {
    const info = SKILL_INFO[k], pts = n.skills[k], lv = skillLevel(k, pts), lo = skillPtsFor(k, lv), hi = skillPtsFor(k, lv + 1);
    return `<div class="skill"><span>${info.icon} ${info.name}</span><b>Stufe ${lv}</b><div class="bar"><i style="width:${Math.min(100, (pts - lo) / (hi - lo) * 100)}%;background:#ffd76a"></i></div></div>`;
  }).join('');
  const st = sim.story, top = n === st.hero ? 'HAUPTFIGUR' : n === st.rival ? (st.done.bund ? 'GEFÄHRTE' : 'RIVALE') : n.awakened ? 'SPIELER · ERWACHT' : `NPC · ${CONFIG.professions[n.profession].name.toUpperCase()}`;
  const rank = n.awakened ? (n.level >= 20 ? 'S' : n.level >= 15 ? 'A' : n.level >= 10 ? 'B' : n.level >= 5 ? 'C' : 'D') : 'F';
  const lore = n.awakened ? (n.cls ? CLASSES[n.cls].desc : 'Sieht Fenster, die sonst niemand sieht. Die Welt ist für diese Seele ein Spiel geworden – eines, das man gewinnen kann.') : PROF_LORE[n.profession] || PROF_LORE.settler;
  box.innerHTML = `<div class="syscard${n === st.hero ? ' gold' : ''}"><div class="sc-top"><span>[ ${top} ]</span><span class="sc-rank" style="color:${RANK_COL[rank]}">RANG ${rank}</span></div>
    <div class="insp-head">
      <canvas class="portrait" width="72" height="72" aria-label="Porträt"></canvas>
      <div><b>${esc(n.name)}</b><div class="tags">${n.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>${roleBadge(n)}</div>
      <div class="mood" title="Laune">${n.moodEmoji}</div>
    </div>
    <div class="thought">💭 ${esc(n.thought || '…')}</div>
    ${n.inside && n.inside.gate ? `<button class="riftBtn" data-rift="1">🌀 Im ${esc(n.inside.tile.gate.name)} – in die Riss-Welt schauen</button>` : ''}
    ${n.awakened && AMBITIONS[n.ambition] ? `<div class="doing">🎯 Lebensziel (${AMBITIONS[n.ambition].icon} ${AMBITIONS[n.ambition].name}): ${esc(AMBITIONS[n.ambition].goal)}</div>` : ''}
    <div class="doing">${a ? a.icon : ''} ${esc(n.statusText)} · ${n.home ? `🏠 wohnt in Haus Nr. ${n.home.id}` : '⛺ noch kein Haus'} · 🪵 ${n.inventory.wood}/${CONFIG.npc.carryCapacity}</div>
    <div class="bars">
      ${bar('Hunger', n.hunger, 'var(--hunger)')}${bar('Energie', n.energy, 'var(--energy)')}
      ${bar('Gemeinschaft', n.social, 'var(--social)')}${bar('Laune', n.mood, 'var(--mood)')}
    </div>
    <div class="lore">„${esc(lore)}“</div></div>
    ${statusWindow(n)}
    <div class="sec"><h4>⭐ Fertigkeiten</h4>${skillRows ? `<div class="skills">${skillRows}</div>` : '<span class="muted">noch keine – Arbeit macht den Meister</span>'}</div>
    <div class="sec"><h4>🧠 Abwägung bei der letzten Entscheidung</h4>${n.lastScores.map((e, i) => `<span class="score${i ? '' : ' win'}">${e.label} ${e.score}</span>`).join('') || '–'}</div>
    <div class="sec"><h4>❤️ Beziehungen</h4>${rels.length ? rels.map(r => `<span class="rel"><span class="dot" style="background:${r.o.color}"></span>${esc(r.o.name)} · ${relLabel(r.v)}</span>`).join('') : '<span class="muted">noch niemanden kennengelernt</span>'}</div>
    <div class="sec"><h4>🎒 Rucksack</h4>${invGrid([['wood', n.inventory.wood], ['stone', n.inventory.stone]].filter(([, v]) => v > 0).map(([k, v]) => ({ icon: RES_INFO[k].icon, count: v, title: RES_INFO[k].name, attr: `data-res="${k}" data-town="${n.town.id}"` })), 6)}</div>
    ${n.pet ? `<div class="sec"><h4>🐾 Gefährte</h4><b>${PETS[n.pet.kind].icon} ${esc(n.pet.name)}</b> <span class="muted">· ${PETS[n.pet.kind].name} · ${esc(PETS[n.pet.kind].bonus)} · seit Tag ${n.pet.day}</span>${bar('Bindung', n.pet.bond, '#ff9ec7')}</div>` : ''}
    ${n.diary && n.diary.length ? `<div class="sec"><h4>📔 Tagebuch</h4><ul class="diary">${n.diary.slice(0, 3).map(d => `<li><span class="muted">Tag ${d.day}:</span> ${esc(d.text)}</li>`).join('')}</ul></div>` : ''}
    <div class="sec"><h4>📜 Erinnerungen</h4>${n.memories.length ? `<ul>${n.memories.slice(0, 5).map(m => `<li><span class="muted">T${m.day} ${m.clock}</span> ${esc(m.text)}</li>`).join('')}</ul>` : '<span class="muted">noch keine</span>'}</div>`;
  drawPortrait(box.querySelector('.portrait'), n);
  const rb = box.querySelector('[data-rift]'); if (rb) rb.addEventListener('click', () => { ui.riftClosedFor = null; openRift(n); });
  bindInv(box);
  box.querySelectorAll('[data-slot]').forEach(el => el.addEventListener('click', () => openItem(n, el.dataset.slot)));
  bindLinks(box);
}

function roleBadge(n) {
  const st = sim.story;
  if (n === st.hero) return '<div class="role">★ Hauptfigur der Chronik</div>';
  if (n === st.rival) return `<div class="role">${st.done.bund ? '🤝 Gefährte' : '⚔️ Rivale'} von ${esc(st.H)}</div>`;
  return '';
}

/* ---- Geschichte: Kapitel-Einblendung, Chronik, Erzähler-Modus ---------- */
function showChapter(ch) {
  const box = $('chapter');
  box.querySelector('.ch-num').textContent = ch.recap ? `Bisher in der Chronik · ${ch.num}` : ch.num;
  box.querySelector('.ch-title').textContent = ch.title;
  box.querySelector('.ch-text').textContent = ch.text;
  box.hidden = false; ui.chapterUntil = performance.now() + 14000;
  if (sound.on) { sound.chime(); setTimeout(() => sound.levelUp(), 500); }
}
function hideChapter() { $('chapter').hidden = true; ui.chapterUntil = 0; const nx = (ui.chapters || []).shift(); if (nx) setTimeout(() => showChapter(nx), 400); }

function openChronik() {
  const st = sim.story, h = st.hero, r = st.rival;
  $('modalTitle').textContent = '📖 Chronik';
  $('modalText').textContent = h ? `Hauptfigur: ${h.name} (Level ${h.level}${h.cls ? ', ' + CLASSES[h.cls].name : ''})${r ? ` · ${st.done.bund ? 'Gefährte' : 'Rivale'}: ${r.name} (Level ${r.level})` : ''}` : 'Noch hat das Licht niemanden erwählt.';
  $('modalHtml').innerHTML = st.chronicle.map(c => `<div class="chap"><small>${esc(c.num)} · Tag ${c.day}</small><b>${esc(c.title)}</b><p>${esc(c.text)}</p></div>`).join('')
    + (st.done.epilog ? '' : `<div class="chap next"><small>Was als Nächstes geschieht …</small><p>${esc(st.hint)}</p></div>`);
  $('modalHtml').hidden = false; $('modalArea').hidden = true; $('modalOk').hidden = true;
  $('modal').hidden = false;
}

/** Gesandter des Nachbarreichs wartet auf eine Antwort: Wahl mit Knöpfen, sonst entscheidet die Regentschaft. */
function updateDiplo() {
  const r = sim.realm && sim.realm.rival, box = $('diplo');
  if (!r || !r.pending || scn.cur) { box.hidden = true; ui.diploKey = null; return; }
  const left = Math.max(0, r.pending.until - sim.minutes), cap = sim.capital;
  const key = `${r.pending.day}|${r.relation}|${cap.stock.coins}|${cap.stock.crystals}|${Math.floor(left / 10)}`;
  if (key === ui.diploKey && !box.hidden) return;
  ui.diploKey = key;
  const cost = c => Object.entries(c).map(([k, v]) => `${v} ${RES_INFO[k].icon}`).join(' ') || 'kostenlos';
  box.innerHTML = `<div class="d-top">[ DIPLOMATIE ] · ${esc(r.name)}</div><div class="d-title">📜 Ein Gesandter von ${esc(r.ruler)}</div>
    <div>${esc(r.pending.text)}</div>
    <div class="lbl"><span>Beziehung ${r.relation}</span><span>⏳ Regentschaft entscheidet in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')} h</span></div>
    <div class="bar"><i style="width:${(r.relation + 100) / 2}%;background:${r.relation >= 0 ? '#7ac74f' : '#e04848'}"></i></div>
    <div class="d-opts">${Object.entries(DIPLO_OPTIONS).map(([k, o]) => `<button data-dip="${k}" ${cap.canAfford(o.cost) ? '' : 'disabled'}>${o.label}<small>${cost(o.cost)}</small></button>`).join('')}</div>`;
  box.hidden = false;
  box.querySelectorAll('[data-dip]').forEach(b => b.addEventListener('click', () => { sim.realm.choose(b.dataset.dip); ui.diploKey = null; updateDiplo(); }));
}

function setCine(on) {
  ui.cine = on; ui.cineTarget = null; ui.cineHold = 0;
  $('mapWrap').classList.toggle('cine', on); $('cineBtn').classList.toggle('active', on); $('narr').hidden = !on;
  if (!on && renderer) renderer.follow = ui.selected;
  store('siedlung-cine', on ? '1' : '0');
}
/** Erzähler-Kamera: folgt dem Boss, Kämpfen, großen Momenten – sonst der Hauptfigur. */
function updateNarrator(now) {
  if (!ui.cine) return;
  if (ui.cineTarget && renderer.follow !== ui.cineTarget) ui.cineHold = now + 15000; // selbst verschoben oder angetippt
  if (now < ui.cineHold) { $('narr').hidden = true; return; }
  const st = sim.story, boss = sim.monsters.find(m => m.boss);
  const fighter = sim.npcs.find(n => n.task && (n.task.actionId === 'duel' || (n.task.actionId === 'fight' && n.foe)));
  const ev = ui.cineEvent && now - ui.cineEvent.at < 12000 ? ui.cineEvent.n : null;
  const want = boss || ev || fighter || st.hero || sim.npcs[0];
  if (!ui.cineTarget || (want !== ui.cineTarget && now - (ui.cineSwitch || 0) > 8000) || (ui.cineTarget.hp <= 0 && !ui.cineTarget.name)) { ui.cineTarget = want; ui.cineSwitch = now; }
  const t = ui.cineTarget;
  renderer.follow = t;
  const box = $('narr'); box.hidden = false;
  if (!t.name) { box.innerHTML = `👹 <b style="color:#ff6b6b">${esc(MONSTERS[t.kind].name)}</b> wütet … (${Math.round(t.hp / t.maxHp * 100)} %)`; return; }
  box.innerHTML = `<b style="color:${t.color}">${t === st.hero ? '★ ' : ''}${esc(t.name)}</b>${t.awakened ? ` <small>Lv ${t.level}</small>` : ''} · ${esc(t.statusText)}<br>„${esc(t.thought || '…')}“`;
}
const cineMoment = n => { if (n && n.name) ui.cineEvent = { n, at: performance.now() }; };

/** Ort des letzten wichtigen Ereignisses (Person, Monster oder Kachel) – für „Hinspringen“. */
function setPoi(ent, x, y) { ui.poi = { ent, x: ent ? ent.x : x, y: ent ? ent.y : y, at: performance.now() }; }
function jumpToPoi() {
  const p = ui.poi; if (!p) return;
  if (ui.cine) ui.cineHold = performance.now() + 20000;
  if (p.ent && sim.npcs.includes(p.ent)) { ui.selected = null; select(p.ent); return; }
  if (p.ent && sim.monsters.includes(p.ent)) { selectMonster(p.ent); return; }
  renderer.follow = null; renderer.centerOn(p.x + 0.5, p.y + 0.5);
}

/** Erfolge: freigeschaltet bunt, gesperrt grau mit Hinweis. */
function openAchievements() {
  const got = sim.achievements || [];
  $('modalTitle').textContent = `🏆 Erfolge (${got.length}/${ACHIEVEMENTS.length})`; $('modalText').textContent = '';
  $('modalHtml').innerHTML = `<div class="ach">${ACHIEVEMENTS.map(a => `<div class="${got.includes(a.id) ? '' : 'locked'}"><span>${a.icon}</span><b>${esc(a.name)}</b>${esc(a.desc)}</div>`).join('')}</div>`;
  $('modalHtml').hidden = false; $('modalArea').hidden = true; $('modalOk').hidden = true; $('modal').hidden = false;
}

function bindLinks(box) {
  box.querySelectorAll('[data-npc]').forEach(b => b.addEventListener('click', () => select(sim.npcs.find(x => x.id === Number(b.dataset.npc)))));
}

/** System-Meldungen im blauen Fenster (wie ein Spiel-Interface). */
function showSystem(now) {
  if (ui.catchingUp) return; // das Fenster zeigt gerade den Fortschritt des Nachrechnens
  const box = $('sysWin');
  if (now < ui.sysUntil) return;
  const msg = ui.sysQueue.shift();
  if (!msg) { box.hidden = true; return; }
  const p = ui.poi && performance.now() - ui.poi.at < 20000 ? ui.poi : null;
  box.innerHTML = `<div class="sys-title">[ SYSTEM ]</div><div>${esc(msg)}</div>${p ? '<div class="sys-jump">📍 antippen = hinspringen</div>' : ''}`;
  box.hidden = false; box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop');
  ui.sysUntil = now + 2600;
}

const WEATHER_ICON = { klar: ['☀️', '🌙'], 'bewölkt': ['⛅', '☁️'], regen: ['🌧️', '🌧️'] };
function updateHud() {
  const icon = WEATHER_ICON[sim.weather][sim.isNight ? 1 : 0];
  $('clock').textContent = `Tag ${sim.day} · ${sim.clock} ${icon}`;
  $('realm').textContent = sim.kingdom ? `👑 Königreich ${sim.kingdom.name} · ${sim.towns.length} Orte` : sim.guild ? `🛡️ ${sim.guild.name}` : '';
  const st = sim.settlement, cost = CONFIG.buildings.house.cost.wood;
  const site = st.site ? ` · 🔨 Bau ${Math.floor(st.site.progress / st.site.work * 100)} %` : '';
  const mon = sim.monsters.length ? ` · <span style="color:#ff6b6b">👹 ${sim.monsters.length}</span>` : '';
  $('stats').innerHTML = `🪵 <b>${st.stock.wood}</b>/${cost} · 🍞 <b>${st.stock.food}</b> · 🪨 <b>${st.stock.stone || 0}</b> · 💎 <b>${st.stock.crystals}</b> · 🪙 <b>${st.stock.coins || 0}</b> · 🏠 <b>${st.houses.length}</b> · 👥 <b>${sim.npcs.length}</b>${site}${mon}`
    + `<div class="goal"><i style="width:${Math.min(100, st.stock.wood / cost * 100)}%"></i></div>`;
}

function select(n) {
  ui.selected = n && ui.selected !== n ? n : null;
  ui.selTile = null; ui.selMonster = null;
  renderer.follow = ui.selected;
  if (ui.rift && ui.rift.n !== ui.selected) closeRift(false);
  if (ui.selected && ui.selected.inside && ui.selected.inside.gate) { ui.riftClosedFor = null; openRift(ui.selected); }
  updateRoster(); updateInspector();
}

function selectMonster(m) {
  ui.selected = null; ui.selTile = null; ui.selMonster = m; renderer.follow = m;
  updateRoster(); updateInspector();
}

function selectTile(t) {
  ui.selected = null; ui.selMonster = null; renderer.follow = null;
  ui.selTile = t && ui.selTile !== t ? t : null;
  updateRoster(); updateInspector();
}

function setSpeed(v) {
  ui.speed = v;
  document.querySelectorAll('#speed button').forEach(b => b.classList.toggle('active', Number(b.dataset.speed) === v));
}

function saveGame() {
  if (!sim || ui.catchingUp) return;
  const data = sim.serialize(); data.savedAt = Date.now();
  const ok = store(SAVE_KEY, JSON.stringify(data)) !== null || store(SAVE_KEY) !== null;
  ui.local = ok;
  showSaveInfo();
}

function showSaveInfo() {
  const parts = [];
  if (ui.local || cloud.savedAt) parts.push('✅ speichert automatisch');
  if (cloud.ready) parts.push(cloud.error ? '☁️ Konto gerade nicht erreichbar' : cloud.savedAt ? '☁️ auch im Konto' : '☁️ verbunden');
  $('saveInfo').textContent = parts.join(' · ') || '⚠️ Dieser Browser speichert nicht – unter ⚙️ Mehr eine Kopie machen';
}

/* ---- Speichern im Claude-Konto (private Datenbank der Seite) ------------ */
const cloud = { ready: false, db: null, base: '', savedAt: 0, lastMinutes: -1, busy: false, error: false };
const CLOUD_CHUNK = 200000; // Zeichen pro Eintrag (Grenze: 256 KB)

async function cloudInit() {
  try {
    if (!window.claude || typeof window.claude.use !== 'function') return;
    const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
    if (!db || !user) return;
    const id = await user.id();
    if (!id) return;
    Object.assign(cloud, { db, base: `data/users/${id}/`, ready: true });
    const meta = await db.doc(cloud.base + 'welt').get();
    if (meta.exists) {
      const m = meta.data();
      if ((m.savedAt || 0) > (ui.loadedAt || 0) + 5000) { // Cloud-Stand ist neuer als der im Browser
        const parts = await Promise.all(Array.from({ length: m.parts }, (_, i) => db.doc(cloud.base + 'welt-' + i).get()));
        const d = JSON.parse(parts.map(p => (p.data() || {}).text || '').join(''));
        if (d && d.v <= SAVE_VERSION) {
          startSim(new Simulation(d.seed, d));
          sim.log('☁️ Spielstand aus deinem Konto geladen – willkommen zurück!', null, true);
          cloud.savedAt = m.savedAt; cloud.lastMinutes = sim.minutes;
          catchUp(d.savedAt);
        }
      } else cloud.savedAt = m.savedAt;
    }
    showSaveInfo();
  } catch (e) { cloud.error = true; showSaveInfo(); }
}

async function cloudSave() {
  if (!cloud.ready || cloud.busy || !sim || ui.catchingUp || sim.minutes === cloud.lastMinutes) return;
  cloud.busy = true;
  try {
    const data = sim.serialize(); data.savedAt = Date.now();
    const text = JSON.stringify(data), n = Math.ceil(text.length / CLOUD_CHUNK);
    for (let i = 0; i < n; i++) await cloud.db.doc(cloud.base + 'welt-' + i).set({ text: text.slice(i * CLOUD_CHUNK, (i + 1) * CLOUD_CHUNK) });
    await cloud.db.doc(cloud.base + 'welt').set({ parts: n, savedAt: data.savedAt, day: sim.day, settlers: sim.npcs.length });
    cloud.savedAt = data.savedAt; cloud.lastMinutes = sim.minutes; cloud.error = false;
  } catch (e) { cloud.error = true; }
  cloud.busy = false;
  showSaveInfo();
}

/** Die Welt läuft weiter, während man weg ist (höchstens 2 Spieltage nachrechnen). */
function catchUp(savedAt) {
  if (!savedAt) return;
  let left = Math.min(1440 * 2, Math.floor((Date.now() - savedAt) / 1000 * CONFIG.time.minutesPerSecond));
  if (left < 20) return;
  const total = left, hours = Math.round(total / 60);
  ui.catchingUp = true;
  const box = $('sysWin');
  const tick = () => {
    const n = Math.min(left, 90);
    for (let i = 0; i < n; i++) sim.step();
    left -= n;
    box.hidden = false; box.innerHTML = `<div class="sys-title">[ SYSTEM ]</div><div>Während du weg warst, lief die Welt weiter … ${Math.round((1 - left / total) * 100)} %</div>`;
    if (left > 0) return setTimeout(tick, 0);
    ui.catchingUp = false; box.hidden = true;
    sim.log(`🕰️ Während du weg warst, ${hours >= 1 ? `vergingen ${hours} Stunde${hours === 1 ? '' : 'n'}` : `vergingen ${total} Minuten`} in der Welt.`, null, true);
    buildRoster(); saveGame();
    if (ui.chapters && ui.chapters.length && $('chapter').hidden) showChapter(ui.chapters.shift());
  };
  tick();
}

function loadGame() {
  for (const key of [SAVE_KEY, ...OLD_SAVE_KEYS]) {
    try { const raw = store(key); const d = raw && JSON.parse(raw); if (d && d.v >= 2 && d.v <= SAVE_VERSION) return d; } catch (e) { /* weiter mit dem nächsten */ }
  }
  return null;
}

/** Großes Pixel-Porträt (Kopf und Schultern) im Steckbrief. */
function drawPortrait(cv, n) {
  if (!cv) return;
  const c = cv.getContext('2d'), col = n.awakened && n.cls ? CLASSES[n.cls].color : n.color;
  const g = c.createLinearGradient(0, 0, 0, 72); g.addColorStop(0, '#1b2a3a'); g.addColorStop(1, '#0e151d');
  c.fillStyle = g; c.fillRect(0, 0, 72, 72);
  c.fillStyle = col; c.globalAlpha = 0.35; c.beginPath(); c.arc(36, 40, 30, 0, TAU); c.fill(); c.globalAlpha = 1;
  const f = pixFrame(n, { arms: 'none', moving: false, facing: 1, view: 'down' }, 0, performance.now());
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
  c.drawImage(pixHD1(pixFrame(n, { arms: 'none', moving: false, facing: 1, view: 'down' }, 0, performance.now(), 2)), 32, 8, 96, 96, 0, 0, 72, 72); // HD-Porträt
}

/** Kleines Fenster für Sichern/Laden (ohne prompt/alert). */
function openModal(title, text, value, okLabel, onOk) {
  $('modalTitle').textContent = title; $('modalText').textContent = text;
  const area = $('modalArea'); area.value = value || ''; area.readOnly = !onOk; area.hidden = false; $('modalHtml').hidden = true;
  $('modalOk').hidden = !onOk; $('modalOk').textContent = okLabel || 'OK';
  $('modalOk').onclick = () => onOk && onOk(area.value);
  $('modal').hidden = false;
  if (value) { area.focus(); area.select(); }
}

function exportGame() {
  const code = 'SIEDLUNG:' + btoa(unescape(encodeURIComponent(JSON.stringify(sim.serialize()))));
  const show = () => openModal('📤 Spielstand sichern', 'Kopiere diesen Text und bewahre ihn auf (z. B. in deinen Notizen). Mit „📥 Laden“ kannst du die Welt auf jedem Gerät fortsetzen.', code);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code).then(() => openModal('📤 Spielstand gesichert', `In die Zwischenablage kopiert (${Math.round(code.length / 1024)} KB). Füge ihn in deine Notizen ein, um ihn aufzubewahren.`, code), show);
  } else show();
}

function importGame() {
  openModal('📥 Spielstand laden', 'Füge hier einen gesicherten Spielstand ein. Deine aktuelle Welt wird dabei ersetzt.', '', 'Laden', text => {
    try {
      const raw = text.trim().replace(/^SIEDLUNG:/, '');
      const d = JSON.parse(raw.startsWith('{') ? raw : decodeURIComponent(escape(atob(raw))));
      if (!d || !d.v || d.v > SAVE_VERSION || !d.tiles) throw new Error('kein Spielstand');
      startSim(new Simulation(d.seed, d));
      sim.log('📥 Spielstand übernommen – willkommen zurück!', null, true);
      saveGame();
      $('modal').hidden = true;
    } catch (e) { $('modalText').textContent = '⚠️ Das hat nicht geklappt: Der Text ist kein vollständiger Spielstand. Bitte den ganzen Text einfügen.'; }
  });
}

function startSim(s) {
  sim = s;
  sim.on('log', e => { renderLog(); if (e.event && /fertig|kommt neu|Freunde/.test(e.text)) sound.chime(); });
  sim.on('system', msg => { if (ui.sysQueue.length < 6) ui.sysQueue.push(msg); });
  sim.on('levelup', n => { n.cheerUntil = performance.now() + 2200; renderer.burst(n, 'levelup'); sound.levelUp(); buildRoster(); });
  sim.on('kingdom', () => { sound.levelUp(); setTimeout(() => sound.levelUp(), 300); setTimeout(() => sound.chime(), 700); });
  sim.on('towerShot', e => renderer.shots = [...(renderer.shots || []), { ...e, to: { x: e.to.x, y: e.to.y }, born: performance.now() }]);
  sim.on('legendary', ({ n }) => { renderer.burst(n, 'legendary'); sound.levelUp(); setTimeout(() => sound.levelUp(), 250); });
  sim.on('awaken', n => { n.cheerUntil = performance.now() + 2200; renderer.burst(n, 'awaken'); sound.levelUp(); buildRoster(); });
  sim.on('npcAdded', buildRoster);
  // Orte wichtiger Ereignisse merken (für „📍 Hinspringen“)
  sim.on('raid', e => setPoi(null, e.town.camp.x, e.town.camp.y));
  sim.on('boss', m => setPoi(m));
  sim.on('diplo', e => { if (e.kind === 'siege') { const m = sim.monsters.find(x => x.kind === 'feldherr'); if (m) setPoi(m); } else if (e.realm) setPoi(null, e.realm.x, e.realm.y); });
  for (const ev of ['awaken', 'levelup', 'npcAdded']) sim.on(ev, n => setPoi(n));
  sim.on('legendary', e => setPoi(e.n)); sim.on('tamed', e => setPoi(e.n)); sim.on('gateDone', e => setPoi(e.n)); sim.on('loyal', e => setPoi(e.who));
  sim.on('duel', e => setPoi(e.a)); sim.on('groupRaid', e => e.party[0] && setPoi(e.party[0]));
  sim.on('srift', e => { const m = e.phase === 'break' && sim.monsters.find(x => x.riftBoss); if (m) setPoi(m); else if (e.hero) setPoi(e.hero); else { const g = sim.world.gates.find(t => t.gate === e.gate); if (g) setPoi(null, g.x, g.y); } });
  sim.on('achievement', () => sound.on && sound.chime());
  directorEvents(sim);
  // im Anime-Modus übernimmt die Szene das Kapitel
  sim.on('chapter', ch => { if (scn.on && !ch.recap) return; if (ui.catchingUp && !ch.recap) { ui.chapters = [...(ui.chapters || []), ch]; return; } if (!$('chapter').hidden) (ui.chapters ||= []).push(ch); else showChapter(ch); cineMoment(sim.story.hero); });
  sim.on('duel', ({ a }) => cineMoment(a));
  sim.on('boss', () => { sound.levelUp(); ui.cineEvent = null; });
  for (const ev of ['levelup', 'awaken']) sim.on(ev, cineMoment);
  sim.on('legendary', ({ n }) => cineMoment(n));
  sim.on('chop', t => {
    const [cx, cy] = renderer.screenToTile(renderer.viewW / 2, renderer.viewH / 2);
    if (ui.speed <= 2) sound.chop(Math.hypot(t.x - cx, t.y - cy));
  });
  if (ui.rift) closeRift(false);
  scn.q = []; scn.cur = null; if ($('scene')) $('scene').hidden = true;
  ui.selected = null; ui.selTile = null; ui.accum = 0; ui.sysQueue = []; ui.chapters = []; ui.cineTarget = null; $('chapter').hidden = true;
  if (renderer) renderer.setSim(sim);
  else { renderer = new Renderer($('map'), sim); renderer.onTap = (n, t, m) => { if (m) selectMonster(m); else if (n) select(n); else if (t) selectTile(t); }; }
  buildRoster(); renderLog(); updateHud(); updateInspector();
  $('seedInfo').textContent = `Welt #${sim.seed}`;
  window.SIM = sim; // zum Ausprobieren in der Browser-Konsole
}

function newWorld(seed) {
  const s = new Simulation(seed);
  s.log(`🔥 ${s.npcs.map(n => n.name).join(' und ')} schlagen ihr Lager auf.`, null, true);
  startSim(s);
  saveGame();
}

function setSound(on) {
  if (on) on = sound.start(); else sound.stop();
  $('soundBtn').textContent = on ? '🔊' : '🔇';
  $('soundBtn').classList.toggle('active', !!on);
  store(SOUND_KEY, on ? '1' : '0');
}

/* =====================================================================
 * 10) HAUPTSCHLEIFE und Start
 * ===================================================================== */
let last = performance.now(), lastPanel = 0, lastMini = 0;
const MINI = 96; // Größe der Minikarte in Pixeln
$('minimap').width = MINI; $('minimap').height = MINI;
$('minimap').addEventListener('click', e => {
  const r = e.currentTarget.getBoundingClientRect(), k = Math.max(sim.world.w, sim.world.h) / r.width;
  renderer.follow = null; ui.selected = null;
  renderer.centerOn((e.clientX - r.left) * k, (e.clientY - r.top) * k);
});
function frame(now) {
  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;
  ui.accum += dt * ui.speed * CONFIG.time.minutesPerSecond;
  if (ui.catchingUp) ui.accum = 0;
  while (ui.accum >= 1) { sim.step(); directorTick(); ui.accum -= 1; if (scn.cur) { ui.accum = 0; break; } }
  if (scn.cur) ui.accum = 0; // während einer Szene steht die Welt still
  renderer.render(ui.speed ? ui.accum : 1, ui.selected, ui.selTile);
  showSystem(now);
  const sn = ui.selected; // ausgewählte Person betritt gerade einen Riss → Riss-Welt zeigen
  if (sn && !ui.rift && sn.inside && sn.inside.gate && ui.riftClosedFor !== sn) openRift(sn);
  drawRift(now);
  if (ui.welcomeEpisode && !ui.catchingUp && sim.story.hero) { ui.welcomeEpisode = false; sim.story.episode = sim.day; playScene(SCENES.episode(sim.day), 2); } // Begrüßung mit „Was bisher geschah“
  drawScene(now);
  if (now - lastMini > 400) { renderer.drawMinimap($('minimap').getContext('2d'), MINI); lastMini = now; }
  sound.update(sim, renderer);
  updateHud();
  if (now - lastPanel > 300) { updateDiplo(); updateNarrator(now); updateRoster(); updateInspector(); lastPanel = now; }
  if (ui.chapterUntil && now > ui.chapterUntil) hideChapter();
  requestAnimationFrame(frame);
}

document.querySelectorAll('#speed button').forEach(b => b.addEventListener('click', () => setSpeed(Number(b.dataset.speed))));
document.querySelectorAll('#zoomBtns [data-z]').forEach(b => b.addEventListener('click', () => renderer.setZoom(renderer.ts * Number(b.dataset.z))));
$('homeBtn').addEventListener('click', () => { select(null); const c = sim.world.camp; renderer.centerOn(c.x + 0.5, c.y + 0.5); });
$('soundBtn').addEventListener('click', () => setSound(!sound.on));
$('exportBtn').addEventListener('click', exportGame);
$('importBtn').addEventListener('click', importGame);
$('modalClose').addEventListener('click', () => { $('modal').hidden = true; });
$('chronikBtn').addEventListener('click', openChronik);
$('achBtn').addEventListener('click', openAchievements);
$('sysWin').addEventListener('click', jumpToPoi);
$('log').addEventListener('click', e => { const li = e.target.closest('li[data-npc]'); if (li) { const n = sim.npcs.find(x => x.id === Number(li.dataset.npc)); if (n) { ui.selected = null; select(n); } } });
$('riftClose').addEventListener('click', () => closeRift(true));
$('scene').addEventListener('click', e => { if (e.target.id !== 'sceneSkip') sceneTap(); });
$('sceneSkip').addEventListener('click', () => { scn.q = []; scn.cur = null; $('scene').hidden = true; });
const applyScenes = () => { scn.on = store('siedlung-szenen') !== '0'; $('sceneBtn').textContent = `🎭 Szenen: ${scn.on ? 'an' : 'aus'}`; };
$('sceneBtn').addEventListener('click', () => { store('siedlung-szenen', scn.on ? '0' : '1'); applyScenes(); });
applyScenes();
$('cineBtn').addEventListener('click', () => setCine(!ui.cine));
$('chapter').addEventListener('click', hideChapter);
$('moreBtn').addEventListener('click', () => { $('more').hidden = !$('more').hidden; });
const applyStyle = () => { renderer.pixelChars = store(STYLE_KEY) !== 'vektor'; $('styleBtn').textContent = renderer.pixelChars ? '🎨 Figuren: Pixel' : '🎨 Figuren: Gezeichnet'; };
$('styleBtn').addEventListener('click', () => { store(STYLE_KEY, renderer.pixelChars ? 'vektor' : 'pixel'); applyStyle(); });
$('newWorld').addEventListener('click', () => {
  const btn = $('newWorld');
  if (Date.now() - ui.confirmNew < 3000) { ui.confirmNew = 0; btn.textContent = '🌍 Neue Welt'; newWorld(Math.floor(Math.random() * 1e6)); return; }
  ui.confirmNew = Date.now(); btn.textContent = 'Wirklich? Nochmal tippen';
  setTimeout(() => { if (ui.confirmNew && Date.now() - ui.confirmNew >= 3000) { ui.confirmNew = 0; btn.textContent = '🌍 Neue Welt'; } }, 3100);
});
window.addEventListener('resize', () => renderer.resize());
// Ton darf erst nach einer Berührung starten
window.addEventListener('pointerdown', () => { if (store(SOUND_KEY) !== '0' && !sound.on) setSound(true); }, { once: true });
setInterval(saveGame, 5000);
setInterval(cloudSave, 20000); // automatisch – niemand muss selbst speichern
document.addEventListener('visibilitychange', () => { if (document.hidden) cloudSave(); });
cloudInit();
document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });
window.addEventListener('pagehide', saveGame);

const urlSeed = Number(new URLSearchParams(location.search).get('seed'));
const saved = loadGame();
if (Number.isFinite(urlSeed) && urlSeed > 0) newWorld(urlSeed);
else if (saved) {
  try { startSim(new Simulation(saved.seed, saved)); ui.welcomeEpisode = true; sim.log('💾 Spielstand geladen – willkommen zurück!', null, true); ui.loadedAt = saved.savedAt || 1; catchUp(saved.savedAt); }
  catch (e) { newWorld(Math.floor(Math.random() * 1e6)); }
} else newWorld(Math.floor(Math.random() * 1e6));
applyStyle();
setCine(store('siedlung-cine') !== '0'); // Zuschauer-Modus ist Standard
requestAnimationFrame(frame);

// Als App installierbar und offline nutzbar (nur auf der echten Webseite, z. B. GitHub Pages)
if ('serviceWorker' in navigator && location.protocol === 'https:' && window.self === window.top) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
