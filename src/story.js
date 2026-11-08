
/* =====================================================================
 * 11) HANDLUNG: Chronik in Kapiteln, Hauptfigur, Rivale, Boss,
 *     Lebensziele, Spieler-Gedanken, Tagebuch der Erwachten
 * ===================================================================== */

/** Lebensziele der Erwachten – sie gewichten, was jemand bevorzugt tut. */
const AMBITIONS = {
  staerke:  { name: 'Stärke', icon: '⚔️', goal: 'die stärkste Kraft des Reiches werden', plan: 'Morgen will ich in einen Riss und stärker werden.', w: { exploreGate: 1.45, fight: 1.25 } },
  schmiede: { name: 'Schmiedekunst', icon: '⚒️', goal: 'eine Legende schmieden, die man in hundert Jahren noch kennt', plan: 'Morgen steht die Esse wieder im Feuer.', w: { forge: 1.6, searchRuin: 1.3 } },
  ruhm:     { name: 'Ruhm', icon: '🌟', goal: 'dass jedes Kind im Reich den eigenen Namen kennt', plan: 'Morgen erzähle ich in der Taverne davon.', w: { socialize: 1.35, visitTavern: 1.35 } },
  reichtum: { name: 'Reichtum', icon: '🪙', goal: 'die vollste Truhe der Siedlung besitzen', plan: 'Morgen schaue ich, was der Markt hergibt.', w: { visitMarket: 1.6, mineStone: 1.2 } },
  schutz:   { name: 'Schutz', icon: '🛡️', goal: 'dass nie wieder jemand vor Monstern fliehen muss', plan: 'Morgen halte ich wieder Wache am Dorfrand.', w: { fight: 1.45, build: 1.2 } },
};

function pickAmbition(n, rng) {
  if (n.cls === 'sternenschmied' || n.cls === 'schmied') return 'schmiede';
  const t = n.traits;
  const opts = { staerke: t.fleiss * 0.6 + (1 - t.gesellig) * 0.5, ruhm: t.gesellig * 0.9, reichtum: 0.4, schutz: t.fleiss * 0.5 + t.gesellig * 0.3, schmiede: 0.2 + t.neugier * 0.3 };
  return Object.entries(opts).map(([k, v]) => [k, v + rng() * 0.5]).sort((a, b) => b[1] - a[1])[0][0];
}

/** Was Erwachte „wie Spieler“ denken: EP, Ausrüstung, Rivalen, Ziele. */
function playerThought(n, sim) {
  const st = sim.story, L = [], amb = AMBITIONS[n.ambition];
  L.push(`Noch ${Math.max(1, Math.ceil(xpForLevel(n.level) - n.xp))} EP bis Level ${n.level + 1}.`);
  if (amb) L.push(`Mein Ziel: ${amb.goal}.`);
  if (!n.gear.weapon) L.push('Ohne richtige Waffe bin ich im Riss nur Futter.');
  else if (n.gear.weapon.rarity < 2) L.push(`${n.gear.weapon.name} … für den Anfang reicht es. Aber ich brauche etwas Besseres.`);
  if (n.hp < n.maxHp * 0.5) L.push('Meine Lebenspunkte sind zu niedrig. Erst erholen, dann weiter.');
  if (!n.cls) L.push(`Ab Level ${CONFIG.levels.classLevel} bekomme ich eine Klasse. Welche wohl?`);
  if (n.cls === 'sternenschmied') L.push('Die Zeichnungen im Schmiedebuch … jeden Tag verstehe ich ein bisschen mehr.', 'Alle haben gelacht, als ich auf Level 1 zurückfiel. Sie werden schon sehen.');
  const riv = st.rivalOf(n);
  if (riv) L.push(riv.level > n.level ? `${riv.name} ist schon Level ${riv.level}. Ich darf nicht zurückfallen.` : `${riv.name} wird mich nicht noch einmal belächeln.`);
  if (sim.day >= CONFIG.monsters.fromDay - 1 && !sim.isNight && sim.hourFloat > 17) L.push('Bald kommen die Monster. Ich sollte ausgeruht sein.');
  if (st.bossNight && !st.bossDead) L.push('Der rote Riss pocht wie ein Herz. Ich muss bereit sein.');
  if (n.quest && !n.quest.done) L.push(`Aufgabe: ${n.quest.text} (${Math.floor(n.quest.prog)}/${n.quest.goal}). Das schaffe ich heute noch.`);
  if (n === st.hero) L.push('Warum hat das Licht ausgerechnet mich getroffen?', 'Irgendwann erzählen sie Geschichten über uns.');
  return pick(sim, L);
}

const RIVAL_NAMES = ['Kaelith', 'Varik', 'Seraphine', 'Doran'];
const nameOf = (sim, id, fb = 'jemand') => { const n = sim.npcs.find(x => x.id === id); return n ? n.name : fb; };

/**
 * Kapitel: `req` = vorheriges Kapitel, `when` = Bedingung, `start` = Wirkung, `text` = Erzählung,
 * `hint` = was als Nächstes kommt (für die Chronik).
 */
const CHAPTERS = [
  { id: 'prolog', label: 'Prolog', title: 'Zwei Funken im Eldwald', when: () => true,
    text: sim => { const a = [...sim.npcs].sort((x, y) => x.id - y.id).slice(0, 2).map(n => n.name); return `Am Rand des Eldwalds entzünden ${a.join(' und ')} ein Lagerfeuer. Zwei Äxte, ein Beutel Beeren und eine Hoffnung: Hier soll ein Zuhause entstehen.`; },
    hint: 'Sammelt Holz für das erste Haus.' },
  { id: 'dach', req: 'prolog', title: 'Das erste Dach', when: sim => sim.allHouses.some(b => b.type === 'house'),
    text: () => 'Das erste Haus steht. Es ist schief, es zieht durch die Ritzen – und doch ist es der schönste Ort der Welt. Der Rauch aus dem Schornstein lockt die ersten Fremden an.',
    hint: 'Eines Nachts wird etwas vom Himmel fallen …' },
  { id: 'licht', req: 'dach', title: 'Das Licht vom Himmel', when: sim => sim.npcs.some(n => n.awakened),
    start(sim, st) { if (!st.hero) { const h = sim.npcs.filter(n => n.awakened).sort((a, b) => b.level - a.level || a.id - b.id)[0]; st.heroId = h.id; } },
    text: (sim, st) => `Ein blauer Lichtstrahl. ${st.H} spürt, wie die Welt den Atem anhält. Vor den Augen schwebt ein Fenster, das niemand sonst sehen kann: [ Du bist erwacht. ] Von nun an ist ${st.H} die Hauptfigur dieser Chronik.`,
    hint: 'Hinter den Rissen lauert etwas. In der dritten Nacht …' },
  { id: 'rissnacht', req: 'licht', title: 'Die erste Rissnacht', when: (sim, st) => sim.monsters.length > 0 || (st.legacy && sim.day > CONFIG.monsters.fromDay),
    text: () => 'Die Tore reißen auf. Kreaturen aus Schatten und Asche kriechen heraus. Die Arbeiter verbarrikadieren sich in den Häusern – nur die Erwachten greifen zu den Waffen.',
    hint: 'In den alten Ruinen soll etwas verborgen liegen.' },
  { id: 'fluestern', req: 'licht', title: 'Das Flüstern der Ruinen', when: (sim, st) => !sim.tomeFound && st.hero && st.hero.level >= 3, skip: sim => sim.tomeFound,
    start(sim, st) { st.ruinCall = true; },
    text: (sim, st) => `Nachts hört ${st.H} ein Flüstern: „Unter den alten Säulen schläft das Erbe derer, die einst Sterne schmiedeten …“ Seitdem lassen die Ruinen ${st.H} keine Ruhe mehr.`,
    hint: 'Wer findet das vergessene Schmiedebuch?' },
  { id: 'buch', req: 'licht', title: 'Das vergessene Schmiedebuch', when: sim => sim.tomeFound,
    start(sim, st) { st.ruinCall = false; const f = sim.npcs.find(n => n.cls === 'sternenschmied'); st.smithId = f ? f.id : st.heroId; },
    text: (sim, st) => { const f = nameOf(sim, st.smithId, st.H); return `${f} schlägt das vergessene Schmiedebuch auf – und die Zeichen brennen sich in die Seele. Legendäre Klasse: Sternenschmied. Der Preis: zurück auf Level 1. Die anderen lachen. ${f} lächelt nur und heizt die Esse an.`; },
    hint: 'Eines Tages wird ein Gegenstand geschmiedet, der golden leuchtet.' },
  { id: 'legende', req: 'licht', title: 'Die erste Legende',
    when(sim, st) {
      if (!st.legend) for (const n of sim.npcs) for (const it of Object.values(n.gear)) if (it && it.rarity >= 3 && !st.legend) st.legend = { smith: it.smith || n.name, item: it.name };
      return !!st.legend;
    },
    text: (sim, st) => `Funken regnen wie Sterne. ${st.legend.smith} hebt ${st.legend.item} aus der Glut – golden, warm, fast lebendig. Wer es berührt, weiß: Davon wird man in hundert Jahren noch singen.`,
    hint: 'Wer vom Schmied beschenkt wird, vergisst das nie.' },
  { id: 'treue', req: 'licht', title: 'Geschmiedete Treue', when: sim => sim.npcs.some(n => n.loyalTo != null),
    text: sim => { const l = sim.npcs.find(n => n.loyalTo != null); return `${l.name} kniet vor ${nameOf(sim, l.loyalTo)}: „Du hast mir mehr gegeben als eine Rüstung. Mein Schwert gehört dir.“ Treue lässt sich nicht kaufen – aber schmieden.`; },
    hint: 'Gemeinsam ist man stärker.' },
  { id: 'gilde', req: 'licht', title: 'Der Eid am Feuer', when: sim => !!sim.guild,
    text: sim => `${sim.guild.leader} und die anderen Erwachten legen die Hände übereinander und schwören einen Eid. So entsteht die „${sim.guild.name}“. Von nun an kämpft niemand mehr allein.`,
    hint: 'Ein Fremder aus dem Norden hat von euch gehört …' },
  { id: 'rivale', req: 'licht', title: 'Der Fremde aus dem Norden', when: (sim, st) => st.hero && st.hero.level >= 5 && sim.day >= 6,
    start(sim, st) { st.spawnRival(); },
    text: (sim, st) => { const r = st.rival; return r ? `Am Waldrand taucht eine Gestalt im schwarzen Mantel auf: ${r.name}, Level ${r.level}. „Du bist also ${st.H}? Alle reden nur von dir. Enttäuschend.“ Ein Rivale ist geboren – jeden Nachmittag gibt es ein Duell am Lagerfeuer.` : 'Ein Fremder beobachtet die Siedlung aus der Ferne – und verschwindet wieder.'; },
    hint: 'Jeden Nachmittag um 16 Uhr: Duell am Lagerfeuer.' },
  { id: 'bund', req: 'rivale', title: 'Vom Rivalen zum Gefährten', when: (sim, st) => !st.rival || st.duel.heroWins >= 2 || st.duel.count >= 5,
    start(sim, st) {
      const r = st.rival, h = st.hero;
      if (r && h) { changeRelation(r, h, 70, sim); r.remember(sim, `Hat ${h.name} als ebenbürtig anerkannt 🤝`); h.remember(sim, `${r.name} ist jetzt Gefährte 🤝`); r.addTitle(sim, 'Ehemals Rivale'); }
    },
    text: (sim, st) => st.rival ? `Nach dem letzten Duell reicht ${st.rival.name} ${st.H} die Hand. „Du gibst nie auf. Das … respektiere ich.“ Aus Rivalen werden Gefährten – meistens jedenfalls.` : 'Der Fremde ist fort. Vielleicht kommt er eines Tages zurück.',
    hint: 'Wird aus der Siedlung ein Königreich?' },
  { id: 'krone', req: 'gilde', title: 'Ein Königreich wird geboren', when: sim => !!sim.kingdom,
    text: sim => `${sim.kingdom.regent} steigt auf einen Steinblock. „Von heute an sind wir nicht mehr nur ein Dorf. Wir sind ${sim.kingdom.name}!“ Jubel, Banner, Tränen. Und irgendwo hinter den Rissen öffnet etwas die Augen.`,
    hint: 'Etwas Großes regt sich hinter den Rissen.' },
  { id: 'roterRiss', req: 'gilde', title: 'Der rote Riss',
    when: sim => sim.world.gates.length > 0 && ((sim.kingdom && sim.day >= Math.max(12, sim.kingdom.founded + 4)) || sim.day >= 24),
    start(sim, st) {
      const gates = sim.world.gates, idx = gates.reduce((b, g, i) => (g.gate.tier > gates[b].gate.tier ? i : b), 0);
      st.redGate = idx; gates[idx].gate.red = true; st.bossNight = sim.day + 2;
    },
    text: (sim, st) => `Der ${sim.world.gates[st.redGate].gate.name} färbt sich blutrot. Die Erde bebt, die Vögel verstummen. Die Alten flüstern von einem Wesen, das Kronen frisst. In zwei Nächten wird es kommen.`,
    hint: 'Bereitet euch vor: Ausrüstung, Level, Wachtürme. In zwei Nächten kommt der Kronenfresser.' },
  { id: 'kronenfresser', req: 'roterRiss', title: 'Die Nacht des Kronenfressers', when: (sim, st) => st.bossSpawned,
    text: () => 'Mitternacht. Aus dem roten Riss schiebt sich der Kronenfresser – groß wie ein Haus, mit Augen wie glühende Kohlen. Alle Erwachten greifen zu den Waffen. Für diesen Kampf wurden sie geboren.',
    hint: 'Nur gemeinsam ist der Kronenfresser zu besiegen. Bei Tagesanbruch zieht er sich zurück – und kommt wieder.' },
  { id: 'sieg', req: 'kronenfresser', title: 'Der Kronenbrecher', when: (sim, st) => st.bossDead,
    start(sim, st) {
      const k = sim.npcs.find(n => n.id === st.bossKiller) || st.hero;
      if (k) { k.addTitle(sim, 'Kronenbrecher'); k.remember(sim, 'Hat den Kronenfresser besiegt 👑'); }
      for (const n of sim.npcs) { n.mood = Math.min(100, n.mood + 30); if (n !== k) n.remember(sim, 'Hat den Sieg über den Kronenfresser gefeiert 🎉'); }
      if (sim.world.gates[st.redGate]) sim.world.gates[st.redGate].gate.red = false;
    },
    text: (sim, st) => `${nameOf(sim, st.bossKiller, st.H)} führt den letzten Schlag. Der Kronenfresser zerfällt zu glühender Asche, der rote Riss schließt sich mit einem Seufzer. Am Morgen feiert das ganze Reich – und überall erzählt man vom „Kronenbrecher“.`,
    hint: 'Die Geschichte ist noch nicht zu Ende …' },
  { id: 'epilog', req: 'sieg', label: 'Epilog', title: 'Die Welt lebt weiter', when: (sim, st) => sim.day > st.done.sieg,
    text: (sim, st) => `${st.H} blickt über die Dächer von ${sim.capital.name}. Hinter dem Horizont warten andere Reiche, tiefere Risse und neue Legenden. Die Chronik schreibt sich weiter – jeden Tag ein bisschen.`,
    hint: 'Die Siedler leben ihr Leben weiter. Jeder Tag schreibt neue Erinnerungen.' },
];

/* ---- Duell: Rivale und Hauptfigur messen sich am Lagerfeuer ------------ */
defineAction({
  id: 'duel', label: 'duelliert sich', short: 'Duell', start: 'geht zum Duell ans Lagerfeuer', icon: '🤺',
  interruptible: false,
  score: () => 0, // startet nur durch die Geschichte
  think: (n, sim) => { const o = sim.story.duelPartner(n); return o ? `Heute zeige ich ${o.name}, was ich kann.` : 'Zeit für das Duell.'; },
  plan(n, sim) {
    const o = sim.story.duelPartner(n);
    if (!o) return null;
    const camp = sim.story.hero ? sim.story.hero.town.campTile : n.town.campTile; // Treffpunkt: das Feuer der Hauptfigur
    const res = sim.world.findAdjacent(n.x, n.y, t => t === camp, 8000);
    if (!res) return null;
    return [move(res.path), act((n, sim, s) => {
      if (s.t > 90 || o.inside || sim.monsters.length) return 'done';
      if (Math.hypot(o.x - n.x, o.y - n.y) > 3.3) return; // auf den Gegner warten
      s.met = (s.met || 0) + 1;
      if (s.met >= 25) { if (n === sim.story.rival) sim.story.resolveDuel(); return 'done'; }
    }, { face: o, fight: true })];
  },
});

class Story {
  constructor(sim, data, legacy) {
    this.sim = sim;
    Object.assign(this, { done: {}, chronicle: [], heroId: null, rivalId: null, smithId: null, legend: null, ruinCall: false,
      duel: { count: 0, heroWins: 0, last: 0 }, redGate: null, bossNight: null, bossHp: null, bossSpawned: false, bossDead: false, bossKiller: null }, data || {});
    this.legacy = !data && legacy; // alter Spielstand: bisher Erreichtes still nachtragen
    if (this.redGate != null && !this.bossDead && sim.world.gates[this.redGate]) sim.world.gates[this.redGate].gate.red = true;
    sim.on('legendary', ({ n, item }) => { if (!this.legend) this.legend = { smith: n.name, item: item.name }; });
    sim.on('monsterKilled', m => { if (m.boss) { this.bossDead = true; this.bossKiller = m.killer ? m.killer.id : this.heroId; } });
    sim.on('levelup', n => this.onLevelUp(n));
  }

  get hero() { return this.sim.npcs.find(n => n.id === this.heroId) || null; }
  get rival() { return this.sim.npcs.find(n => n.id === this.rivalId) || null; }
  get H() { return this.hero ? this.hero.name : 'die Hauptfigur'; }
  rivalOf(n) { const r = this.rival, h = this.hero; if (!r || !h || this.done.bund) return null; return n === h ? r : n === r ? h : null; }
  duelPartner(n) { return this.rivalOf(n); }
  get hint() { const next = CHAPTERS.find(c => !this.done[c.id]); const lastDone = [...CHAPTERS].reverse().find(c => this.done[c.id]); return (lastDone || next || CHAPTERS[0]).hint; }

  serialize() {
    const { sim, legacy, ...d } = this;
    return JSON.parse(JSON.stringify(d));
  }

  update() {
    const sim = this.sim, m = sim.minutes;
    if (m % 10 === 0 || this.legacy) this.checkChapters();
    if (m % 1440 === 6 * 60) for (const n of sim.npcs) if (n.awakened) n.snap = { level: n.level, kills: n.kills, forged: n.forged, gates: n.gatesCleared, houses: n.housesBuilt };
    if (m % 1440 === 21 * 60 + 30) for (const n of sim.npcs) if (n.awakened) this.writeDiary(n);
    if (m % 60 === 0 && sim.hourFloat >= 15 && sim.hourFloat <= 18 && this.duel.last !== sim.day) this.startDuel(); // Duell am Nachmittag
    // Boss: in der angekündigten Nacht um 23 Uhr (und jede weitere Nacht, bis er fällt)
    if (this.bossNight && !this.bossDead && sim.day >= this.bossNight && m % 1440 === 23 * 60 && !sim.monsters.some(x => x.boss)) this.spawnBoss();
  }

  checkChapters() {
    const sim = this.sim;
    for (let guard = 0; guard < CHAPTERS.length; guard++) {
      const ch = CHAPTERS.find(c => !this.done[c.id] && (!c.req || this.done[c.req]) && !(c.skip && c.skip(sim, this) && (this.done[c.id] = -1)) && c.when(sim, this));
      if (!ch) break;
      this.done[ch.id] = sim.day;
      if (ch.start) ch.start(sim, this);
      const num = ch.label || `Kapitel ${roman(this.chronicle.filter(c => !c.label).length + 1)}`;
      const entry = { id: ch.id, num, label: ch.label || null, title: ch.title, text: ch.text(sim, this), day: sim.day };
      this.chronicle.push(entry);
      if (!this.legacy) { sim.log(`📖 ${num}: ${ch.title}`, null, true); sim.emit('chapter', entry); break; }
    }
    if (this.legacy) { this.legacy = false; const last = this.chronicle[this.chronicle.length - 1]; if (last) sim.emit('chapter', { ...last, recap: true }); }
  }

  onLevelUp(n) {
    const sim = this.sim;
    for (const o of sim.npcs) {
      if (o === n || !o.awakened || o.inside) continue;
      const rel = o.relations[n.id] || 0;
      if (rel >= 50) o.thought = `Glückwunsch, ${n.name}! Level ${n.level} – das feiern wir!`;
      else if ((o.ambition === 'staerke' || this.rivalOf(o) === n) && n.level > o.level) {
        o.thought = `${n.name} ist jetzt Level ${n.level} … und ich? Ich muss härter trainieren.`;
        o.relations[n.id] = clamp(rel - 2, -100, 100);
      }
    }
  }

  writeDiary(n) {
    const sim = this.sim, s = n.snap || { level: n.level, kills: n.kills, forged: n.forged, gates: n.gatesCleared, houses: n.housesBuilt };
    const p = [];
    if (n.level > s.level) p.push(`Level ${n.level} erreicht`);
    if (n.kills > s.kills) p.push(`${n.kills - s.kills} Monster besiegt`);
    if (n.forged > s.forged) p.push(`${n.forged - s.forged}× geschmiedet`);
    if (n.gatesCleared > s.gates) p.push('einen Riss bezwungen');
    if (n.housesBuilt > s.houses) p.push(`an ${n.housesBuilt - s.houses} Haus mitgebaut`);
    const open = n.mood >= 70 ? 'Was für ein Tag!' : n.mood >= 45 ? 'Ein ruhiger Tag.' : 'Heute war kein guter Tag.';
    let text = `${open} ${p.length ? 'Heute: ' + p.join(', ') + '.' : 'Viel ist nicht passiert.'}`;
    const mem = n.memories.find(x => x.day === sim.day && !/Level|besiegt/.test(x.text));
    if (mem) text += ` Besonders in Erinnerung: ${mem.text}`;
    if (n.quest) text += n.quest.done ? ' Die tägliche Aufgabe habe ich geschafft.' : ' Die tägliche Aufgabe habe ich nicht geschafft.';
    const r = this.rivalOf(n);
    if (r) text += ` ${r.name} … ${r.level > n.level ? 'ist mir noch voraus.' : 'holt mich nicht mehr ein.'}`;
    if (this.bossNight && !this.bossDead) text += ' Der rote Riss lässt mich nicht schlafen.';
    const amb = AMBITIONS[n.ambition];
    if (amb) text += ' ' + amb.plan;
    (n.diary ||= []).unshift({ day: sim.day, text });
    if (n.diary.length > 6) n.diary.pop();
  }

  spawnRival() {
    const sim = this.sim, h = this.hero, town = sim.capital, entry = sim.findEntryTile(town);
    if (!h || !entry || this.rivalId) return;
    const used = new Set(sim.npcs.map(n => n.name));
    const name = RIVAL_NAMES.find(x => !used.has(x)) || 'Kaelith';
    const n = sim.addNpc({ name, color: '#3d3a5c', traits: { fleiss: 0.8, gesellig: 0.25, neugier: 0.55 } }, entry, town);
    n.arrivedAt = sim.minutes; n.hunger = 20; n.energy = 90;
    n.awaken(sim, 'tritt aus dem Nebel – längst erwacht und voller Stolz.');
    const L = Math.max(5, h.level + 2);
    for (const k of Object.keys(n.stats)) n.stats[k] += L - 1;
    n.stats.geschick += 3; n.level = L; n.cls = 'waldlaeufer'; n.ambition = 'staerke';
    for (const [id, sk] of Object.entries(SKILLS)) if (sk.cls === n.cls && sk.lvl <= L && !n.hasSkill(id)) n.unlocked.push(id);
    const smith = { name: 'einer fernen Schmiede', level: L };
    n.gear.weapon = makeItem('weapon', 2, n, smith, sim); n.gear.armor = makeItem('armor', 1, n, smith, sim);
    n.hp = n.maxHp;
    n.relations[h.id] = -25; h.relations[n.id] = -25;
    n.addTitle(sim, 'Stolz des Nordens');
    n.remember(sim, `Ist gekommen, um ${h.name} herauszufordern ⚔️`);
    h.remember(sim, `${n.name} ist aufgetaucht – ein Rivale ⚔️`);
    const house = town.houses.find(b => b.residents.length < b.beds);
    if (house) sim.moveIn(n, house);
    n.lastLogged = 'arrive'; n.tryStart(ACTIONS.arrive, sim);
    this.rivalId = n.id;
  }

  startDuel() {
    const sim = this.sim, h = this.hero, r = this.rival;
    if (!h || !r || this.done.bund || sim.isNight || sim.monsters.length) return;
    const ready = n => !n.inside && !n.sleeping && n.hp > n.maxHp * 0.5 && !(n.task && ['fight', 'exploreGate', 'searchRuin', 'flee'].includes(n.task.actionId));
    if (!ready(h) || !ready(r) || [h, r].some(n => n.task && n.task.actionId === 'duel')) return;
    for (const n of [h, r]) { const steps = ACTIONS.duel.plan(n, sim); if (!steps) return; if (n.task) n.endTask(sim); n.startTask(ACTIONS.duel, steps, sim); }
    sim.log(`🤺 ${r.name} fordert ${h.name} zum Duell am Lagerfeuer heraus!`, null, true);
    sim.emit('duel', { a: h, b: r, start: true });
  }

  resolveDuel() {
    const sim = this.sim, h = this.hero, r = this.rival;
    if (!h || !r) return;
    const d = this.duel;
    // wer verliert, lernt dazu: jede Niederlage macht die Hauptfigur zäher
    const pow = (x, bonus) => x.level * 3 + x.attack * 0.6 + x.defense * 0.4 + x.stats.geschick + bonus + sim.rng() * 14;
    const heroWins = pow(h, (d.count - d.heroWins) * 10) >= pow(r, 0);
    d.count++; d.last = sim.day; if (heroWins) d.heroWins++;
    const [win, lose] = heroWins ? [h, r] : [r, h];
    const lines = heroWins
      ? [`„Glück gehabt“, knurrt ${r.name} und wischt sich den Staub vom Mantel.`, `${r.name} starrt ungläubig auf das eigene Schwert im Gras.`]
      : [`„Komm wieder, wenn du stärker bist“, sagt ${r.name} kühl.`, `${r.name} senkt die Klinge. „Besser als gestern. Aber nicht gut genug.“`];
    sim.log(`🤺 Duell Nr. ${d.count}: ${win.name} besiegt ${lose.name}! ${pick(sim, lines)}`, null, true);
    sim.emit('system', `Duell: ${win.name} gewinnt!`);
    sim.emit('duel', { a: win, b: lose });
    win.addXp(sim, 25 + win.level * 3); lose.addXp(sim, 15 + lose.level * 2);
    win.mood = Math.min(100, win.mood + 15); lose.mood = Math.max(0, lose.mood - 10);
    lose.thought = lose === h ? 'Verloren … schon wieder. Aber ich spüre, dass ich näher dran bin.' : 'Wie konnte das passieren? Ich habe sie unterschätzt.';
    win.thought = win === h ? 'Ich habe gewonnen! Das Training hat sich gelohnt.' : 'Wie erwartet.';
    win.remember(sim, `Hat das Duell gegen ${lose.name} gewonnen 🤺`);
    lose.remember(sim, `Hat das Duell gegen ${win.name} verloren 🤺`);
    changeRelation(h, r, 6, sim); // Respekt wächst mit jedem Kampf
  }

  spawnBoss() {
    const sim = this.sim, g = sim.world.gates[this.redGate];
    if (!g) return;
    const spot = sim.world.bfs(g.x, g.y + 1, (x, y) => sim.world.walkable(x, y), 80);
    if (!spot) return;
    const aw = sim.npcs.filter(n => n.awakened), M = MONSTERS.kronenfresser;
    const maxHp = Math.round(M.hp * 0.7 + aw.reduce((a, n) => a + n.level * 25, 0));
    const hp = this.bossHp ? Math.min(maxHp, this.bossHp) : maxHp; // Wunden heilen nicht
    sim.monsters.push({ id: ++sim.monsterId, kind: 'kronenfresser', boss: true, x: spot.stand.x, y: spot.stand.y, prevX: spot.stand.x, prevY: spot.stand.y, hp, maxHp, path: [], repath: 0, facing: 1, cd: 0 });
    this.bossSpawned = true;
    sim.log(this.bossHp ? '👹 Der Kronenfresser kehrt aus dem roten Riss zurück!' : '👹 Der Kronenfresser bricht aus dem roten Riss hervor!', null, true);
    sim.emit('system', 'BOSS: Der Kronenfresser erscheint!');
    sim.emit('boss', sim.monsters[sim.monsters.length - 1]);
    if (!this.done.kronenfresser) this.checkChapters();
  }

  bossRetreat(m) {
    this.bossHp = m.hp;
    this.sim.log(`☀️ Der Kronenfresser weicht vor dem Morgenlicht in den roten Riss zurück – verwundet (${Math.round(m.hp / m.maxHp * 100)} %). Heute Nacht kommt er wieder.`, null, true);
  }
}
