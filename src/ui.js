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
    return `<li class="${e.event ? 'event' : ''}"><span class="t">T${e.day} ${e.clock}</span>${who}${esc(e.text)}</li>`;
  }).join('');
}

function buildRoster() {
  const sorted = [...sim.npcs].sort((a, b) => (b.awakened - a.awakened) || (b.level - a.level));
  const shown = ui.allRoster ? sorted : sorted.slice(0, 12);
  $('roster').innerHTML = shown.map(n =>
    `<button class="chip" data-id="${n.id}"><span class="dot" style="background:${n.color}"></span><span>${esc(n.name)}</span><span class="ic"></span></button>`).join('')
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

/** Steckbrief für eine angetippte Kachel (Haus, Baum, Lager, Riss …). */
function tileInfo(t) {
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
        + `<div class="sec"><h4>Vorräte</h4><span class="score">🪵 Holz ${st.stock.wood}</span><span class="score">🍞 Brot ${st.stock.food}</span><span class="score">💎 Mana-Kristalle ${st.stock.crystals}</span></div>`
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
    <div class="gear">${SLOTS.map(sl => { const it = n.gear[sl]; return `<div class="slot"><small>${SLOT_NAMES[sl]}</small>${it ? `<b style="color:${RARITIES[it.rarity].color}">${esc(it.name)}</b><span class="muted">${RARITIES[it.rarity].name} · +${it.power}${it.smith ? ' · von ' + esc(it.smith) : ''}</span>` : '<span class="muted">leer</span>'}</div>`; }).join('')}</div>
    <div class="stats">${Object.entries(n.stats).map(([k, v]) => `<span><small>${STAT_NAMES[k]}</small><b>${v}</b></span>`).join('')}</div>
    ${q ? `<div class="quest ${q.done ? 'done' : ''}">📜 Tägliche Aufgabe: ${esc(q.text)} ${q.done ? '✔' : `(${Math.floor(q.prog)}/${q.goal})`}</div>` : ''}
    <div class="sec"><h4>Fähigkeiten</h4>${n.unlocked.length ? n.unlocked.map(id => `<span class="score" title="${esc(SKILLS[id].desc)}">✨ ${SKILLS[id].name}</span>`).join('') : '<span class="muted">noch keine</span>'}</div>
    <div class="sec"><h4>Titel</h4>${n.titles.map(t => `<span class="score win">🏅 ${esc(t)}</span>`).join('') || '<span class="muted">–</span>'}</div>
  </div>`;
}

function updateInspector() {
  const n = ui.selected, box = $('inspector');
  if (!n && ui.selTile) { box.innerHTML = tileInfo(ui.selTile); bindLinks(box); return; }
  if (!n) { box.innerHTML = '<p class="empty">Tippe einen Siedler an (auf der Karte oder oben in der Liste), um seine Gedanken zu lesen.</p>'; return; }
  const a = n.action;
  const rels = Object.entries(n.relations).map(([id, v]) => ({ o: sim.npcs.find(x => x.id === Number(id)), v }))
    .filter(r => r.o).sort((p, q) => q.v - p.v).slice(0, 4);
  const skillRows = Object.keys(SKILL_INFO).filter(k => n.skills[k] > 0).sort((a, b) => n.skills[b] / SKILL_INFO[b].per - n.skills[a] / SKILL_INFO[a].per).map(k => {
    const info = SKILL_INFO[k], pts = n.skills[k], lv = skillLevel(k, pts), lo = skillPtsFor(k, lv), hi = skillPtsFor(k, lv + 1);
    return `<div class="skill"><span>${info.icon} ${info.name}</span><b>Stufe ${lv}</b><div class="bar"><i style="width:${Math.min(100, (pts - lo) / (hi - lo) * 100)}%;background:#ffd76a"></i></div></div>`;
  }).join('');
  box.innerHTML = `
    <div class="insp-head">
      <canvas class="portrait" width="72" height="72" aria-label="Porträt"></canvas>
      <div><b>${esc(n.name)}</b><div class="tags">${n.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div></div>
      <div class="mood" title="Laune">${n.moodEmoji}</div>
    </div>
    <div class="thought">💭 ${esc(n.thought || '…')}</div>
    <div class="doing">${a ? a.icon : ''} ${esc(n.statusText)} · ${n.home ? `🏠 wohnt in Haus Nr. ${n.home.id}` : '⛺ noch kein Haus'} · 🪵 ${n.inventory.wood}/${CONFIG.npc.carryCapacity}</div>
    <div class="bars">
      ${bar('Hunger', n.hunger, 'var(--hunger)')}${bar('Energie', n.energy, 'var(--energy)')}
      ${bar('Gemeinschaft', n.social, 'var(--social)')}${bar('Laune', n.mood, 'var(--mood)')}
    </div>
    ${statusWindow(n)}
    <div class="sec"><h4>⭐ Fertigkeiten</h4>${skillRows ? `<div class="skills">${skillRows}</div>` : '<span class="muted">noch keine – Arbeit macht den Meister</span>'}</div>
    <div class="sec"><h4>🧠 Abwägung bei der letzten Entscheidung</h4>${n.lastScores.map((e, i) => `<span class="score${i ? '' : ' win'}">${e.label} ${e.score}</span>`).join('') || '–'}</div>
    <div class="sec"><h4>❤️ Beziehungen</h4>${rels.length ? rels.map(r => `<span class="rel"><span class="dot" style="background:${r.o.color}"></span>${esc(r.o.name)} · ${relLabel(r.v)}</span>`).join('') : '<span class="muted">noch niemanden kennengelernt</span>'}</div>
    <div class="sec"><h4>📜 Erinnerungen</h4>${n.memories.length ? `<ul>${n.memories.slice(0, 5).map(m => `<li><span class="muted">T${m.day} ${m.clock}</span> ${esc(m.text)}</li>`).join('')}</ul>` : '<span class="muted">noch keine</span>'}</div>`;
  drawPortrait(box.querySelector('.portrait'), n);
  bindLinks(box);
}

function bindLinks(box) {
  box.querySelectorAll('[data-npc]').forEach(b => b.addEventListener('click', () => select(sim.npcs.find(x => x.id === Number(b.dataset.npc)))));
}

/** System-Meldungen im blauen Fenster (wie ein Spiel-Interface). */
function showSystem(now) {
  const box = $('sysWin');
  if (now < ui.sysUntil) return;
  const msg = ui.sysQueue.shift();
  if (!msg) { box.hidden = true; return; }
  box.innerHTML = `<div class="sys-title">[ SYSTEM ]</div><div>${esc(msg)}</div>`;
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
  ui.selTile = null;
  renderer.follow = ui.selected;
  updateRoster(); updateInspector();
}

function selectTile(t) {
  ui.selected = null; renderer.follow = null;
  ui.selTile = t && ui.selTile !== t ? t : null;
  updateRoster(); updateInspector();
}

function setSpeed(v) {
  ui.speed = v;
  document.querySelectorAll('#speed button').forEach(b => b.classList.toggle('active', Number(b.dataset.speed) === v));
}

function saveGame() {
  if (!sim) return;
  const ok = store(SAVE_KEY, JSON.stringify(sim.serialize())) !== null || store(SAVE_KEY) !== null;
  $('saveInfo').textContent = ok ? `💾 gespeichert (Tag ${sim.day} ${sim.clock})` : '';
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
  c.imageSmoothingEnabled = false;
  c.drawImage(f, 8, 2, 24, 24, 0, 0, 72, 72);
}

/** Kleines Fenster für Sichern/Laden (ohne prompt/alert). */
function openModal(title, text, value, okLabel, onOk) {
  $('modalTitle').textContent = title; $('modalText').textContent = text;
  const area = $('modalArea'); area.value = value || ''; area.readOnly = !onOk;
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
  sim.on('chop', t => {
    const cx = (renderer.camX + renderer.viewW / 2) / renderer.ts, cy = (renderer.camY + renderer.viewH / 2) / renderer.ts;
    if (ui.speed <= 2) sound.chop(Math.hypot(t.x - cx, t.y - cy));
  });
  ui.selected = null; ui.selTile = null; ui.accum = 0; ui.sysQueue = [];
  if (renderer) renderer.setSim(sim);
  else { renderer = new Renderer($('map'), sim); renderer.onTap = (n, t) => { if (n) select(n); else if (t) selectTile(t); }; }
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
  while (ui.accum >= 1) { sim.step(); ui.accum -= 1; }
  renderer.render(ui.speed ? ui.accum : 1, ui.selected, ui.selTile);
  showSystem(now);
  if (now - lastMini > 400) { renderer.drawMinimap($('minimap').getContext('2d'), MINI); lastMini = now; }
  sound.update(sim, renderer);
  updateHud();
  if (now - lastPanel > 300) { updateRoster(); updateInspector(); lastPanel = now; }
  requestAnimationFrame(frame);
}

document.querySelectorAll('#speed button').forEach(b => b.addEventListener('click', () => setSpeed(Number(b.dataset.speed))));
document.querySelectorAll('#zoomBtns [data-z]').forEach(b => b.addEventListener('click', () => renderer.setZoom(renderer.ts * Number(b.dataset.z))));
$('homeBtn').addEventListener('click', () => { select(null); const c = sim.world.camp; renderer.centerOn(c.x + 0.5, c.y + 0.5); });
$('soundBtn').addEventListener('click', () => setSound(!sound.on));
$('exportBtn').addEventListener('click', exportGame);
$('importBtn').addEventListener('click', importGame);
$('modalClose').addEventListener('click', () => { $('modal').hidden = true; });
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
document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });
window.addEventListener('pagehide', saveGame);

const urlSeed = Number(new URLSearchParams(location.search).get('seed'));
const saved = loadGame();
if (Number.isFinite(urlSeed) && urlSeed > 0) newWorld(urlSeed);
else if (saved) {
  try { startSim(new Simulation(saved.seed, saved)); sim.log('💾 Spielstand geladen – willkommen zurück!', null, true); }
  catch (e) { newWorld(Math.floor(Math.random() * 1e6)); }
} else newWorld(Math.floor(Math.random() * 1e6));
applyStyle();
requestAnimationFrame(frame);

// Als App installierbar und offline nutzbar (nur auf der echten Webseite, z. B. GitHub Pages)
if ('serviceWorker' in navigator && location.protocol === 'https:' && window.self === window.top) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
