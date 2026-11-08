/* =====================================================================
 * 5) AKTIONEN (Utility-KI)
 * Jede Aktion bewertet sich selbst (score), erklärt ihre Absicht (think)
 * und plant Schritte (move / act). Neue Tätigkeiten = weitere defineAction.
 * ===================================================================== */
const ACTIONS = {};
function defineAction(def) { ACTIONS[def.id] = { interruptible: true, ...def }; }

const move = path => ({ kind: 'move', path });
const act = (tick, opts = {}) => ({ kind: 'act', tick, t: 0, ...opts });
const pick = (sim, arr) => arr[Math.floor(sim.rng() * arr.length)];
const houseCost = () => CONFIG.buildings.house.cost.wood;
const woodCarried = sim => sim.npcs.reduce((a, n) => a + n.inventory.wood, 0);

defineAction({
  id: 'eat', label: 'isst Beeren', short: 'Essen', start: 'geht Beeren essen', icon: '🫐',
  interruptible: false,
  score(n, sim) {
    if (n.hunger >= CONFIG.npc.eatThreshold) return 50 + n.hunger * 0.5;
    const h = sim.hourFloat;
    if (h >= 20 && h < 22 && n.hunger >= 35) return 68; // vorausplanen: vor dem Schlafen noch essen
    return 0;
  },
  urgent: n => n.hunger >= CONFIG.npc.criticalHunger,
  think: (n, sim) => n.hunger >= CONFIG.npc.eatThreshold
    ? pick(sim, [`Mein Magen knurrt (Hunger ${Math.round(n.hunger)}). Zeit für Beeren.`, 'Erst essen, dann weiterarbeiten.', 'Ich brauche etwas zu essen, sonst schaffe ich nichts.'])
    : 'Ich esse lieber jetzt noch etwas, bevor ich schlafen gehe.',
  plan(n, sim) {
    if (n.town.stock.food > 0) { // Brot aus dem Vorrat am Lager
      const camp = sim.world.findAdjacent(n.x, n.y, t => t === n.town.campTile, 6000);
      if (camp) return [move(camp.path), act((n, sim, s) => {
        if (s.t % CONFIG.resources.eatMinutes !== 0) return;
        if (n.town.stock.food <= 0) return 'done';
        n.town.stock.food--;
        n.hunger = Math.max(0, n.hunger - CONFIG.farming.foodPerMeal);
        sim.float(n.town.camp.x, n.town.camp.y, '🍞', '#fff');
        if (n.hunger <= 10) return 'done';
      })];
    }
    const res = sim.world.findAdjacent(n.x, n.y, t => t.type === 'bush' && t.berries > 0);
    if (!res) return null;
    const bush = res.target;
    return [move(res.path), act((n, sim, s) => {
      if (s.t % CONFIG.resources.eatMinutes !== 0) return;
      if (bush.type !== 'bush' || bush.berries <= 0) return 'done';
      bush.berries--; bush.timer = 0;
      n.hunger = Math.max(0, n.hunger - CONFIG.resources.berryFood);
      sim.float(bush.x, bush.y, '😋', '#fff');
      n.gainXp('gathering', 1);
      if (n.hunger <= 5) return 'done';
    }, { face: bush })];
  },
});

defineAction({
  id: 'sleep', label: 'schläft', short: 'Schlafen', start: 'legt sich schlafen', icon: '💤',
  score(n, sim) {
    const c = CONFIG.npc;
    if (n.energy < c.tiredThreshold) return 60 + (100 - n.energy) * 0.4;
    if (sim.isNight && n.energy < c.nightSleepBelow) return 65;
    return 0;
  },
  urgent: n => n.energy <= CONFIG.npc.criticalEnergy,
  think(n, sim) {
    if (n.energy < CONFIG.npc.tiredThreshold && !sim.isNight) return 'Ich bin völlig erschöpft, ich muss mich hinlegen.';
    if (n.bed && n.bed === n.home) return `Es ist spät. Ab nach Hause in Haus Nr. ${n.bed.id}.`;
    if (n.bed) return `Ich darf heute in Haus Nr. ${n.bed.id} übernachten.`;
    return 'Noch kein Dach über dem Kopf … ich schlafe am Lagerfeuer.';
  },
  plan(n, sim) {
    const free = h => h.sleepers.size < h.beds;
    const house = n.home && free(n.home) ? n.home : n.town.houses.find(free);
    const steps = [];
    if (house) {
      const res = sim.world.findAdjacent(n.x, n.y, t => t === house.tile);
      if (res) { steps.push(move(res.path)); house.sleepers.add(n); n.bed = house; }
    }
    if (!n.bed) { // ohne Haus: ans Lagerfeuer
      const res = sim.world.findAdjacent(n.x, n.y, t => t === n.town.campTile);
      if (res && res.path.length < 40) steps.push(move(res.path));
    }
    steps.push(act((n, sim) => {
      n.sleeping = true;
      n.inside = n.bed;
      const c = CONFIG.npc;
      n.energy = Math.min(100, n.energy + c.sleepEnergyPerMin * (n.bed ? c.houseSleepBonus : 1));
      if (!sim.isNight && n.energy >= c.wakeEnergy) return 'done';
    }));
    return steps;
  },
  describe: n => n.bed ? `geht ins Haus Nr. ${n.bed.id} schlafen` : 'schläft am Lagerfeuer',
  onEnd(n) {
    if (n.bed) n.bed.sleepers.delete(n);
    n.bed = null; n.inside = null; n.sleeping = false;
  },
});

defineAction({
  id: 'build', label: 'baut am Haus', short: 'Bauen', start: 'hilft beim Hausbau', icon: '🔨',
  score: (n, sim) => n.town.site ? 50 : 0,
  think(n, sim) {
    const site = n.town.site;
    const p = site ? Math.floor(site.progress / site.work * 100) : 0;
    const helpers = sim.npcs.filter(o => o !== n && o.task && o.task.actionId === 'build').length;
    return helpers ? `${helpers} ${helpers === 1 ? 'andere baut' : 'andere bauen'} schon, ich packe mit an! (${p} %)` : `Das neue Haus ist zu ${p} % fertig. Ich baue weiter.`;
  },
  plan(n, sim) {
    const site = n.town.site;
    const res = sim.world.findAdjacent(n.x, n.y, t => t.siteRef === site); // bei der Burg: irgendeine Kachel des 3×3-Bauplatzes
    if (!res) return null;
    return [move(res.path), act((n, sim) => {
      if (n.town.site !== site) return 'done';
      site.progress += n.workRate('build');
      n.gainXp('building', 1);
      if (site.progress >= site.work) { n.town.completeSite(); return 'done'; }
    }, { work: true, face: site.tile })];
  },
});

defineAction({
  id: 'deliver', label: 'bringt Holz ins Lager', short: 'Abliefern', start: 'bringt Holz zum Lager', icon: '📦',
  score(n, sim) {
    const w = n.inventory.wood + (n.inventory.stone || 0);
    if (w >= CONFIG.npc.carryCapacity) return 45;
    if (w > 0 && !n.town.site && n.town.stock.wood + w >= houseCost()) return 48; // reicht schon fürs Haus
    return w > 0 ? 20 : 0;
  },
  think(n, sim) {
    if (n.inventory.wood < CONFIG.npc.carryCapacity && n.town.stock.wood + n.inventory.wood >= houseCost())
      return 'Mit meinem Holz reicht es schon für ein Haus! Schnell zum Lager.';
    return 'Meine Arme sind voll, ab zum Lager.';
  },
  plan(n, sim) {
    const res = sim.world.findAdjacent(n.x, n.y, t => t === n.town.campTile);
    if (!res) return null;
    return [move(res.path), act((n, sim) => {
      const amount = n.inventory.wood, stone = n.inventory.stone || 0;
      n.town.stock.wood += amount; n.town.stock.stone += stone;
      n.inventory.wood = 0; n.inventory.stone = 0;
      sim.float(n.town.camp.x, n.town.camp.y, stone ? `+${stone} 🪨` : `+${amount} 🪵`, '#f0b54a');
      if (amount) sim.log(`legt ${amount} Holz ins Lager (${n.town.stock.wood}/${houseCost()})`, n);
      if (stone) sim.log(`bringt ${stone} Stein ins Lager (${n.town.stock.stone})`, n);
      return 'done';
    })];
  },
});

defineAction({
  id: 'gatherWood', label: 'hackt Holz', short: 'Holz', start: 'geht Holz hacken', icon: '🪓',
  score: (n, sim) => n.inventory.wood < CONFIG.npc.carryCapacity && !n.inventory.stone ? 30 + (n.town.stock.wood >= houseCost() * 0.6 ? 4 : 0) : 0,
  think(n, sim) {
    const need = Math.max(0, houseCost() - n.town.stock.wood - woodCarried(sim));
    if (n.town.site) return 'Fürs übernächste Haus brauchen wir auch Holz.';
    if (need === 0) return 'Wir haben genug Holz für das nächste Haus! Ich sammle schon mal vor.';
    if (need <= 5) return `Nur noch ${need} Holz, dann können wir bauen!`;
    if (n.traits.fleiss > 0.65) return pick(sim, ['Arbeit macht mir Spaß. Ich hole Holz.', `Noch ${need} Holz bis zum nächsten Haus, packen wir's an.`]);
    return `Das Lager braucht noch ${need} Holz.`;
  },
  plan(n, sim) {
    const res = sim.world.findAdjacent(n.x, n.y, t => t.type === 'tree' && t.wood > 0);
    if (!res) return null;
    const tree = res.target;
    return [move(res.path), act((n, sim, s) => {
      if (tree.type !== 'tree' || tree.wood <= 0) return 'done';
      tree.hitAt = performance.now(); // nur für die Wackel-Animation
      if (s.t % Math.max(1, Math.round(CONFIG.resources.chopMinutes / n.workRate('chop'))) !== 0) return;
      const amount = Math.min(tree.wood, CONFIG.npc.carryCapacity - n.inventory.wood, n.hasSkill('kraftschlag') ? 2 : 1);
      tree.wood -= amount;
      sim.float(tree.x, tree.y, `+${amount} 🪵`, '#f3d29b');
      sim.emit('chop', tree);
      n.inventory.wood += amount;
      n.gainXp('woodcutting', amount);
      if (tree.wood <= 0) sim.world.setType(tree, 'stump');
      if (n.inventory.wood >= CONFIG.npc.carryCapacity || tree.type !== 'tree') return 'done';
    }, { work: true, face: tree })];
  },
});

defineAction({
  id: 'socialize', label: 'unterhält sich', short: 'Reden', start: 'sucht Gesellschaft', icon: '💬',
  score(n, sim) {
    const need = 100 - n.social;
    if (need < 35 || sim.isNight) return 0;
    const h = sim.hourFloat;
    return need * 0.55 * (0.6 + n.traits.gesellig * 0.8) + (h >= 17 && h < 21 ? 10 : 0);
  },
  think: (n, sim) => n.partner
    ? ((n.relations[n.partner.id] || 0) >= 50 ? `Ich will mit ${n.partner.name} reden – wir sind befreundet.` : `Ich fühle mich etwas einsam. Mal sehen, wie es ${n.partner.name} geht.`)
    : 'Ich brauche Gesellschaft.',
  plan(n, sim) {
    const partner = choosePartner(n, sim);
    if (!partner) return null;
    const pt = sim.world.tile(Math.round(partner.x), Math.round(partner.y));
    const res = sim.world.findAdjacent(n.x, n.y, t => t === pt);
    if (!res || res.path.length > 30) return null;
    n.partner = partner;
    return [move(res.path), act((n, sim, s) => {
      if (Math.hypot(partner.x - n.x, partner.y - n.y) > 2.2 || partner.sleeping || partner.inside) return 'done';
      if (s.t === 1) converse(n, partner, sim);
      n.social = Math.min(100, n.social + (n.hasSkill('frohsinn') ? 5 : 2.5));
      partner.social = Math.min(100, partner.social + 1.2);
      changeRelation(n, partner, 0.6, sim);
      if (s.t >= 20 || n.social >= 98) return 'done';
    }, { face: partner })];
  },
  onEnd(n) { n.partner = null; },
});

/* ---- Landwirtschaft ---------------------------------------------------- */
/** Felder liegen auf demselben Raster wie Häuser (jede 2. Kachel) – so bleiben die Gassen dazwischen immer frei. */
function findFieldSpot(sim, town) {
  const w = sim.world, c = town.camp;
  let best = null, bd = Infinity;
  for (let y = c.y - 24; y <= c.y + 24; y += 2) for (let x = c.x - 24; x <= c.x + 24; x += 2) {
    const t = w.tile(x, y);
    if (!t || t.type !== 'grass') continue;
    const d = Math.hypot(x - c.x, y - c.y);
    if (d < 7 || d >= bd || (t.reserved && sim.minutes - t.reserved < 120)) continue;
    if (DIRS.some(([dx, dy]) => w.walkable(x + dx, y + dy))) { best = t; bd = d; }
  }
  return best;
}

defineAction({
  id: 'plantField', label: 'bestellt ein Feld', short: 'Feld', start: 'legt ein neues Feld an', icon: '🌱',
  score(n, sim) {
    const st = n.town;
    if (st.fieldCount >= Math.max(2, Math.ceil(sim.npcs.length * 0.45)) || sim.isNight) return 0;
    return 33;
  },
  think: n => n.profession === 'bauer' ? 'Ein neues Feld – damit im Winter niemand hungert.' : 'Die Beeren reichen bald nicht mehr. Wir brauchen Felder.',
  plan(n, sim) {
    const spot = findFieldSpot(sim, n.town);
    if (!spot) return null;
    const res = sim.world.findAdjacent(n.x, n.y, t => t === spot, 6000);
    if (!res) return null;
    spot.reserved = sim.minutes;
    return [move(res.path), act((n, sim, s) => {
      if (spot.type !== 'grass') return 'done';
      if (s.t < CONFIG.farming.plantMinutes) return;
      if (sim.npcs.some(o => Math.round(o.x) === spot.x && Math.round(o.y) === spot.y)) return 'done';
      sim.world.setType(spot, 'field'); spot.timer = 0; n.town.fieldCount++;
      n.gainXp('farming', 1);
      sim.log('🌱 hat ein neues Feld angelegt.', n);
      return 'done';
    }, { work: true, face: spot, tool: 'hoe' })];
  },
});

defineAction({
  id: 'harvest', label: 'erntet', short: 'Ernten', start: 'geht ernten', icon: '🌾',
  score: (n, sim) => n.town.ripe > 0 && !sim.isNight ? 40 : 0,
  think: () => 'Das Korn ist reif! Zeit für die Ernte.',
  plan(n, sim) {
    const grow = CONFIG.farming.growMinutes;
    const res = sim.world.findAdjacent(n.x, n.y, t => t.type === 'field' && t.timer >= grow && !t.harvester, 6000);
    if (!res) return null;
    const f = res.target;
    f.harvester = n;
    return [move(res.path), act((n, sim, s) => {
      if (f.type !== 'field') return 'done';
      if (s.t < CONFIG.farming.harvestMinutes) return;
      const food = CONFIG.farming.harvestFood + Math.floor((skillLevel('farming', n.skills.farming) - 1) / 2); // gute Bauern ernten mehr
      n.town.stock.food += food; f.timer = 0; n.town.ripe = Math.max(0, n.town.ripe - 1);
      sim.float(f.x, f.y, `+${food} 🍞`, '#ffe08a');
      n.gainXp('farming', 2);
      return 'done';
    }, { work: true, face: f, tool: 'sickle' })];
  },
  onEnd(n, sim) { for (const t of sim.world.tiles) if (t.harvester === n) t.harvester = null; },
});

/* ---- Schmiede und Ausrüstung ------------------------------------------- */
const gearPower = (n, slots = SLOTS) => slots.reduce((a, s) => a + (n.gear[s] ? n.gear[s].power : 0), 0);

function pickGearTarget(sim) {
  const aw = sim.npcs.filter(o => o.awakened).sort((a, b) => gearPower(a) - gearPower(b));
  for (const o of aw) { const slot = SLOTS.find(s => !o.gear[s] && (s !== 'cape' || o.level >= 5)); if (slot) return { npc: o, slot }; }
  if (!aw.length) return null;
  const o = aw[0];
  return { npc: o, slot: SLOTS.slice(0, 4).sort((a, b) => (o.gear[a] ? o.gear[a].power : 0) - (o.gear[b] ? o.gear[b].power : 0))[0] };
}

function rollRarity(n, sim) {
  const w = [60, 28, 9, 2.6, 0.4];
  if (n.cls === 'schmied' || n.cls === 'sternenschmied') { w[0] -= 15; w[1] += 5; w[2] += 7; w[3] += 2.5; w[4] += 0.5; }
  if (n.hasSkill('legendaererFunke')) { w[3] *= 2; w[4] *= 2; }
  const SL = (sim.capital.smithy && sim.capital.smithy.level) || 1; // ausgebaute Schmiede: bessere Chancen
  w[2] += 4 * (SL - 1); w[3] += 1.2 * (SL - 1); w[4] += 0.3 * (SL - 1);
  let r = sim.rng() * w.reduce((a, b) => a + b), tier = 0;
  while (tier < 4 && r > w[tier]) { r -= w[tier]; tier++; }
  if (n.hasSkill('meisterschmied') && sim.rng() < 0.35) tier++;
  if (n.hasSkill('sternenhammer')) tier += sim.rng() < 0.25 ? 2 : 1;
  return Math.min(4, tier);
}

function makeItem(slot, rarity, owner, smith, sim) {
  const R = RARITIES[rarity];
  let base = { armor: 'rüstung', helmet: 'helm', boots: 'stiefel', cape: 'umhang' }[slot], kind = slot;
  if (slot === 'weapon') { const wp = WEAPONS[owner.cls] || WEAPONS.none; kind = wp[0]; base = wp[1]; }
  let name = R.prefix + base;
  if (rarity >= 3) name += ` „${EPITHETS[Math.floor(sim.rng() * EPITHETS.length)]}“`;
  const power = Math.round((3 + smith.level * 0.6) * R.mult * (slot === 'weapon' ? 1.4 : slot === 'cape' ? 0.6 : 1));
  return { slot, kind, rarity, name, power, smith: smith.name };
}

const itemName = it => it.name + (it.plus ? ` +${it.plus}` : '');

/** Verstärken: +1 … +10. Je höher, desto riskanter – ab +6 kann es eine Stufe zurückgehen. */
function enhanceItem(n, o, slot, sim) {
  const it = o.gear[slot];
  it.plus = it.plus || 0; it.base = it.base || it.power;
  const smith = n.cls === 'schmied' || n.cls === 'sternenschmied' ? 0.1 : 0;
  const chance = clamp(0.95 - it.plus * 0.085 + smith + skillLevel('forging', n.skills.forging) * 0.01, 0.1, 0.97);
  n.forged = (n.forged || 0) + 1; n.gainXp('forging', 1 + it.rarity);
  const t = sim.capital.smithy.tile;
  if (sim.rng() < chance) {
    it.plus++; it.power = Math.round(it.base * (1 + 0.12 * it.plus));
    sim.log(`✨ verstärkt ${itemName(it)} von ${o === n ? 'sich selbst' : o.name}! (+${it.power})`, n, true);
    sim.emit('system', `VERSTÄRKUNG ERFOLGREICH: ${itemName(it)}`);
    sim.float(t.x, t.y, `+${it.plus}!`, '#8fd3ff');
    if (it.plus >= 7) n.addTitle(sim, 'Meister der Verstärkung');
    if (o !== n) changeRelation(n, o, 6, sim);
  } else {
    const drop = it.plus >= 6;
    if (drop) { it.plus--; it.power = Math.round(it.base * (1 + 0.12 * it.plus)); }
    sim.log(`💥 Die Verstärkung von ${it.name} misslingt${drop ? ` – zurück auf +${it.plus}` : ''}.`, n, true);
    sim.emit('system', 'Verstärkung misslungen …');
    sim.float(t.x, t.y, '💥', '#ff6b6b');
  }
}

/* ---- Tiere: Haustiere, Zähmen, Bauernhof, Forsthaus ------------------- */
const PETS = {
  wolf:   { name: 'Wolfswelpe', icon: '🐺', bonus: 'Angriff +15 %', w: 30 },
  fuchs:  { name: 'Fuchs', icon: '🦊', bonus: 'Holzfällen +20 %', w: 30 },
  eule:   { name: 'Eule', icon: '🦉', bonus: 'Erfahrung +10 %', w: 22 },
  hase:   { name: 'Kristallhase', icon: '🐇', bonus: 'Tempo +15 %', w: 15 },
  drache: { name: 'Mini-Drache', icon: '🐉', bonus: 'Angriff +30 %, Erfahrung +10 %', w: 3 },
  hund:   { name: 'Hund', icon: '🐕', bonus: 'Laune +', w: 0 },
  katze:  { name: 'Katze', icon: '🐈', bonus: 'Laune +', w: 0 },
};
const PET_NAMES = ['Flocke', 'Funke', 'Krümel', 'Nebel', 'Pfote', 'Luna', 'Rauch', 'Kiesel', 'Glut', 'Sternchen', 'Moos', 'Blitz', 'Wuschel', 'Ember'];
const petIs = (n, ...kinds) => !!(n.pet && kinds.includes(n.pet.kind));
function givePet(n, kind, sim) {
  const used = new Set(sim.npcs.filter(o => o.pet).map(o => o.pet.name));
  const name = PET_NAMES.find(x => !used.has(x) && sim.rng() < 0.5) || pick(sim, PET_NAMES);
  n.pet = { kind, name, bond: 10, day: sim.day };
  return n.pet;
}

defineAction({
  id: 'tame', label: 'versucht ein Tier zu zähmen', short: 'Zähmen', start: 'schleicht in den Wald, um ein Tier zu zähmen', icon: '🐾',
  interruptible: false,
  score(n, sim) {
    if (!n.awakened || n.pet || n.level < 3 || sim.isNight || n.energy < 50 || n.hunger > 50) return 0;
    if (sim.minutes - (n.lastTame || -1e9) < 1440) return 0;
    return 22 + n.traits.neugier * 12 + (['hueter', 'waldlaeufer'].includes(n.cls) ? 15 : 0);
  },
  think: n => n.cls === 'hueter' ? 'Die Tiere des Waldes vertrauen mir. Vielleicht findet mich heute ein Gefährte.' : 'Ein treuer Gefährte an meiner Seite … das wär’s.',
  plan(n, sim) {
    const c = n.town.camp;
    const res = sim.world.findAdjacent(n.x, n.y, t => t.type === 'tree' && Math.hypot(t.x - c.x, t.y - c.y) > 9, 6000);
    if (!res) return null;
    return [move(res.path), act((n, sim, s) => {
      if (s.t === 1) n.lastTame = sim.minutes;
      if (s.t < 45) return;
      const chance = 0.4 + n.stats.charisma * 0.025 + (n.cls === 'hueter' ? 0.2 : 0);
      const opts = Object.entries(PETS).filter(([k, p]) => p.w && (k !== 'drache' || n.level >= 8));
      let r = sim.rng() * opts.reduce((a, [, p]) => a + p.w, 0), kind = opts[0][0];
      for (const [k, p] of opts) { if ((r -= p.w) <= 0) { kind = k; break; } }
      if (sim.rng() < chance) {
        const pet = givePet(n, kind, sim), P = PETS[kind];
        sim.log(`🐾 zähmt ${kind === 'eule' || kind === 'katze' ? 'eine' : 'einen'} ${P.name} und nennt das Tier „${pet.name}“! (${P.bonus})`, n, true);
        sim.emit('system', `ZÄHMUNG ERFOLGREICH: ${P.name} „${pet.name}“`);
        n.remember(sim, `Hat ${P.name} „${pet.name}“ gezähmt ${P.icon}`);
        n.mood = Math.min(100, n.mood + 20); n.addXp(sim, 20);
        if (kind === 'drache') n.addTitle(sim, 'Drachenfreund');
      } else {
        sim.log(`🐾 Der ${PETS[kind].name} schnuppert kurz – und verschwindet im Unterholz.`, n);
        n.thought = 'Fast! Morgen versuche ich es noch einmal.';
      }
      return 'done';
    }, { face: res.target })];
  },
});

defineAction({
  id: 'tendAnimals', label: 'versorgt die Tiere', short: 'Tiere', start: 'geht zum Bauernhof', icon: '🐄',
  score: (n, sim) => n.town.bauernhof && !sim.isNight && sim.minutes - (n.lastTend || -1e9) > 720 && n.profession === 'bauer' ? 34 : 0,
  think: () => 'Die Hühner warten aufs Futter und die Kuh will gemolken werden.',
  plan(n, sim) {
    const b = n.town.bauernhof;
    const res = sim.world.findAdjacent(n.x, n.y, t => t === b.tile, 5000);
    if (!res) return null;
    return [move(res.path), act((n, sim, s) => {
      if (s.t === 1) n.lastTend = sim.minutes;
      if (s.t < 40) return;
      const food = 2 + (b.level || 1);
      n.town.stock.food += food; n.gainXp('farming', 2);
      sim.float(b.tile.x, b.tile.y, `+${food} 🥛`, '#fff');
      sim.log(`🐔 sammelt Eier und Milch: +${food} Essen`, n);
      return 'done';
    }, { work: true, face: b.tile })];
  },
});

defineAction({
  id: 'replant', label: 'pflanzt einen Baum', short: 'Pflanzen', start: 'geht Bäume pflanzen', icon: '🌱',
  score: (n, sim) => n.town.forsthaus && n.profession === 'holzfaeller' && !sim.isNight && !n.inventory.wood && sim.minutes - (n.lastPlant || -1e9) > 360 ? 27 : 0,
  think: () => 'Wer Bäume fällt, muss auch welche pflanzen. Sagt der Förster.',
  plan(n, sim) {
    const f = n.town.forsthaus.tile;
    const res = sim.world.findAdjacent(n.x, n.y, t => t.type === 'stump' && Math.hypot(t.x - f.x, t.y - f.y) < 16, 4000);
    if (!res) { n.lastPlant = sim.minutes; return null; }
    const st = res.target;
    return [move(res.path), act((n, sim, s) => {
      if (s.t === 1) n.lastPlant = sim.minutes;
      if (st.type !== 'stump') return 'done';
      if (s.t < 25) return;
      sim.world.setType(st, 'tree'); st.wood = CONFIG.resources.treeWood; st.timer = 0;
      sim.float(st.x, st.y, '🌱', '#7be08a'); n.gainXp('woodcutting', 2);
      sim.log('🌱 pflanzt einen jungen Baum.', n);
      return 'done';
    }, { work: true, face: st, tool: 'hoe' })];
  },
});

defineAction({
  id: 'guildMeeting', label: 'ist in der Gildenhalle', short: 'Gilde', start: 'geht zur Gildenversammlung', icon: '🛡️',
  score(n, sim) {
    const gh = sim.capital.gildenhalle, h = sim.hourFloat;
    if (!gh || !n.awakened || h < 18 || h > 21 || sim.monsters.length || sim.day === n.lastGuild) return 0;
    return 30 + n.traits.gesellig * 15;
  },
  think: (n, sim) => `Heute Abend Versammlung der „${sim.guild ? sim.guild.name : 'Gilde'}“. Wir planen die nächsten Risse.`,
  plan(n, sim) {
    const gh = sim.capital.gildenhalle;
    const res = sim.world.findAdjacent(n.x, n.y, t => t === gh.tile, 8000);
    if (!res) return null;
    return [move(res.path), act((n, sim, s) => {
      if (s.t === 1) { n.lastGuild = sim.day; n.inside = gh; }
      n.social = Math.min(100, n.social + 0.4);
      if (s.t < 40) return;
      n.addXp(sim, 8 + (gh.level || 1) * 4);
      if (sim.guild) guildXp(sim, 15);
      return 'done';
    }, { face: gh.tile })];
  },
  onEnd(n) { if (n.inside && n.inside.type === 'gildenhalle') n.inside = null; },
});

/** Gilden-Stufe: wächst mit allem, was die Erwachten erleben. */
function guildXp(sim, amount) {
  const g = sim.guild; if (!g) return;
  g.level = g.level || 1; g.xp = (g.xp || 0) + amount;
  const need = Math.round(150 * g.level ** 1.5);
  if (g.xp >= need) {
    g.xp -= need; g.level++;
    sim.log(`🛡️ Die „${g.name}“ steigt auf Gilden-Stufe ${g.level}! Alle Mitglieder bekommen mehr Erfahrung.`, null, true);
    sim.emit('system', `GILDE STUFE ${g.level}: ${g.name}`);
  }
}

function forgeItem(n, sim) {
  const target = pickGearTarget(sim);
  if (!target) return;
  const cur = target.npc.gear[target.slot];
  if (cur && (cur.plus || 0) < 10 && sim.rng() < 0.45) return enhanceItem(n, target.npc, target.slot, sim);
  const rarity = rollRarity(n, sim), item = makeItem(target.slot, rarity, target.npc, n, sim);
  const R = RARITIES[rarity], o = target.npc, old = o.gear[target.slot];
  n.forged = (n.forged || 0) + 1;
  n.gainXp('forging', 1 + rarity);
  if (!old || item.power > old.power) {
    if (old) sim.capital.storeItem(old); // das alte Teil wandert ins Lager
    o.gear[target.slot] = item;
    sim.log(`⚒️ schmiedet ${item.name} (${R.name}) für ${o === n ? 'sich selbst' : o.name}!`, n, true);
    if (o !== n) {
      changeRelation(n, o, n.hasSkill('seelenschmied') ? 60 : 20, sim);
      o.remember(sim, `Hat von ${n.name} ${item.name} bekommen 🎁`);
      if (n.hasSkill('seelenschmied')) o.loyalTo = n.id;
    }
  } else { sim.capital.storeItem(item); sim.log(`⚒️ schmiedet ${item.name} (${R.name}) – schwächer als das Alte, es wandert ins Lager.`, n); }
  sim.emit('system', rarity >= 3 ? `${R.name.toUpperCase()}ER GEGENSTAND! ${item.name}` : `Geschmiedet: ${item.name} (${R.name})`);
  if (rarity >= 3) { sim.emit('legendary', { n, item }); n.addTitle(sim, rarity === 4 ? 'Mythenschmied' : 'Legendenschmied'); }
  const t = sim.capital.smithy.tile;
  sim.float(t.x, t.y, `${R.name}!`, R.color);
}

defineAction({
  id: 'forge', label: 'schmiedet', short: 'Schmieden', start: 'geht zur Schmiede', icon: '⚒️',
  score(n, sim) {
    const st = n.town, sm = sim.capital.smithy;
    if (!n.awakened || n.level < 2 || !sm || st.stock.crystals < 2 || st.stock.wood < 3 || sim.isNight) return 0;
    if (sm.busy && sm.busy !== n) return 0;
    if (sim.kingdom && !sim.capital.castle && sim.capital.stock.crystals < CONFIG.buildings.castle.cost.crystals + 2) return 0; // für die Burg sparen
    if (!pickGearTarget(sim)) return 0;
    return n.cls === 'schmied' || n.cls === 'sternenschmied' ? 58 : 34;
  },
  think: n => n.cls === 'sternenschmied' ? 'Das Feuer ruft. Heute schmiede ich etwas, das man nie vergisst.' : 'Mit den Kristallen schmiede ich Ausrüstung für unsere Kämpfer.',
  plan(n, sim) {
    const smithy = sim.capital.smithy;
    const res = sim.world.findAdjacent(n.x, n.y, t => t === smithy.tile);
    if (!res) return null;
    return [move(res.path), act((n, sim, s) => {
      const st = n.town;
      if (s.t === 1) {
        if ((smithy.busy && smithy.busy !== n) || st.stock.crystals < 2 || st.stock.wood < 3) return 'done';
        smithy.busy = n; st.stock.crystals -= 2; st.stock.wood -= 3;
      }
      if (s.t < 60) return;
      forgeItem(n, sim);
      return 'done';
    }, { work: true, face: smithy.tile, tool: 'hammer' })];
  },
  onEnd(n, sim) { const sm = sim.capital.smithy; if (sm && sm.busy === n) sm.busy = null; },
});

/* ---- Ruinen: das vergessene Schmiedebuch ------------------------------- */
defineAction({
  id: 'searchRuin', label: 'durchsucht Ruinen', short: 'Ruinen', start: 'macht sich zu den Ruinen auf', icon: '🏛️',
  interruptible: false,
  score(n, sim) {
    if (!n.awakened || n.level < 2 || sim.isNight || sim.hourFloat > 15 || n.energy < 60 || n.hunger > 45) return 0;
    if (sim.minutes - n.lastRuin < 1440 * 2) return 0;
    return 30 + n.traits.neugier * 22;
  },
  think: () => 'In den alten Ruinen soll etwas verborgen liegen …',
  plan(n, sim) {
    const res = sim.world.findAdjacent(n.x, n.y, t => t.type === 'ruin' && !t.searched, 8000);
    if (!res) return null;
    const ruin = res.target;
    return [move(res.path), act((n, sim, s) => {
      if (s.t === 1) n.lastRuin = sim.minutes;
      if (s.t < 90) return;
      ruin.searched = true;
      sim.ruinsSearched = (sim.ruinsSearched || 0) + 1;
      if (!sim.tomeFound && sim.rng() < 0.2 + sim.ruinsSearched * 0.12) { sim.tomeFound = true; n.becomeStarSmith(sim); }
      else if (sim.rng() < 0.45) { const c = 1 + Math.floor(sim.rng() * 2); n.town.stock.crystals += c; sim.log(`🏛️ findet in den Ruinen ${c} alte Mana-Kristalle.`, n); }
      else sim.log('🏛️ findet in den Ruinen nur Staub und alte Scherben.', n);
      return 'done';
    }, { work: true, face: ruin, tool: 'hoe' })];
  },
});

/* ---- Monster und Kampf ------------------------------------------------- */
const MONSTERS = {
  rissling:     { name: 'Rissling', hp: 40, atk: 5, speed: 0.22, tier: 1, xp: 25 },
  schattenwolf: { name: 'Schattenwolf', hp: 75, atk: 8, speed: 0.32, tier: 2, xp: 50 },
  aschegolem:   { name: 'Aschegolem', hp: 180, atk: 14, speed: 0.13, tier: 3, xp: 110 },
  kronenfresser:{ name: 'Kronenfresser', hp: 1400, atk: 13, speed: 0.11, tier: 4, xp: 600 }, // Boss der Geschichte
};
function nearestMonster(n, sim, r) {
  let best = null, bd = r;
  for (const m of sim.monsters) { const d = Math.hypot(m.x - n.x, m.y - n.y); if (d < bd) { bd = d; best = m; } }
  return best;
}
function killMonster(m, n, sim) {
  const M = MONSTERS[m.kind];
  m.hp = 0; m.killer = n;
  const drop = M.tier >= 4 ? 15 : M.tier === 3 ? 2 : sim.rng() < 0.4 ? 1 : 0;
  n.town.stock.crystals += drop;
  sim.log(`⚔️ besiegt einen ${M.name}! (+${M.xp} EP${drop ? `, +${drop} 💎` : ''})`, n, true);
  sim.emit('system', `${M.name} besiegt!`);
  sim.emit('monsterKilled', m);
  n.kills = (n.kills || 0) + 1;
  n.gainXp('combat', 1);
  n.addXp(sim, M.xp);
  n.remember(sim, `Hat einen ${M.name} besiegt ⚔️`);
  if (n.kills >= 5) n.addTitle(sim, 'Wächter des Dorfes');
}

defineAction({
  id: 'fight', label: 'kämpft', short: 'Kämpfen', start: 'stellt sich dem Monster', icon: '⚔️',
  score: (n, sim) => n.awakened && n.hp > n.maxHp * 0.35 && nearestMonster(n, sim, 14) ? 96 : 0,
  urgent: (n, sim) => n.awakened && n.hp > n.maxHp * 0.35 && !!nearestMonster(n, sim, 10),
  think: (n, sim) => { const m = nearestMonster(n, sim, 14); return m ? `Ein ${MONSTERS[m.kind].name}! Ich beschütze das Dorf.` : 'Ich halte Wache.'; },
  plan(n, sim) {
    const m = nearestMonster(n, sim, 14);
    if (!m) return null;
    const mt = sim.world.tile(Math.round(m.x), Math.round(m.y));
    const res = sim.world.findAdjacent(n.x, n.y, t => t === mt, 3000);
    n.foe = m;
    return [move(res ? res.path.slice(0, 8) : []), act((n, sim, s) => {
      if (m.hp <= 0 || Math.hypot(m.x - n.x, m.y - n.y) > 1.7) return 'done';
      if (Math.abs(m.x - n.x) > 0.1) n.facing = m.x > n.x ? 1 : -1;
      if (s.t % 2) return;
      const dmg = Math.round(n.attack * (0.8 + sim.rng() * 0.4));
      m.hp -= dmg; m.hitAt = performance.now();
      sim.float(m.x, m.y - 0.3, `-${dmg}`, '#ffd166');
      sim.emit('hit', m);
      if (m.hp <= 0) { killMonster(m, n, sim); return 'done'; }
    }, { face: m, fight: true })];
  },
  onEnd(n) { n.foe = null; },
});

defineAction({
  id: 'flee', label: 'versteckt sich', short: 'Verstecken', start: 'flieht vor einem Monster', icon: '😱',
  interruptible: false,
  score: (n, sim) => !n.awakened && nearestMonster(n, sim, 7) ? 94 : 0,
  urgent: (n, sim) => !n.awakened && !!nearestMonster(n, sim, 5),
  think: () => 'Ein Monster! Schnell ins Haus!',
  plan(n, sim) {
    const res = sim.world.findAdjacent(n.x, n.y, t => t.type === 'house', 4000);
    if (!res) return null;
    const house = res.target.building;
    return [move(res.path), act((n, sim, s) => {
      n.inside = house; n.hiding = true;
      if (s.t > 20 && !nearestMonster(n, sim, 9)) return 'done';
    })];
  },
  onEnd(n) { n.inside = null; n.hiding = false; },
});

defineAction({
  id: 'exploreGate', label: 'kämpft im Riss', short: 'Riss', start: 'bricht zu einem Riss auf', icon: '🌀',
  interruptible: false,
  score(n, sim) {
    if (!n.awakened || n.level < CONFIG.gates.minLevel || sim.isNight || sim.hourFloat > 17) return 0;
    if (sim.minutes - n.lastGate < CONFIG.gates.cooldownMinutes) return 0;
    if (n.energy < 65 || n.hunger > 45) return 0;
    return 42 + n.level * 2 + (n.cls === 'torwandler' ? 15 : 0);
  },
  think: n => n.cls === 'torwandler' ? 'Der Riss ruft mich. Dort wartet mehr auf mich als auf jeden anderen.' : 'Ich muss stärker werden. Hinter dem Riss wartet echte Erfahrung.',
  describe: n => n.gateTarget ? `bricht zum ${n.gateTarget.gate.name} auf (Rang ${roman(n.gateTarget.gate.tier)})` : 'bricht zu einem Riss auf',
  plan(n, sim) {
    const maxTier = 1 + Math.floor((n.level - CONFIG.gates.minLevel) / 3);
    const res = sim.world.findAdjacent(n.x, n.y, t => t.type === 'gate' && t.gate.tier <= maxTier);
    if (!res) return null;
    const gate = res.target;
    n.gateTarget = gate;
    return [move(res.path), act((n, sim, s) => {
      if (s.t === 1) {
        n.inside = { tile: gate, gate: true }; n.lastGate = sim.minutes;
        sim.log(`🌀 betritt den ${gate.gate.name} (Rang ${roman(gate.gate.tier)}).`, n, true);
        sim.emit('system', `${n.name} betritt den ${gate.gate.name}.`);
      }
      n.energy = Math.max(0, n.energy - 0.12 * gate.gate.tier);
      if (s.t < CONFIG.gates.expeditionMinutes) return;
      finishGate(n, gate, sim);
      return 'done';
    }, { face: gate })];
  },
  onEnd(n) { n.inside = null; n.gateTarget = null; },
});

function finishGate(n, gate, sim) {
  const g = gate.gate, power = n.level + (n.stats.kraft + n.stats.geschick) * 0.3;
  const chance = clamp(0.55 + (power - g.tier * 5) * 0.06, 0.15, 0.95);
  n.gainXp('gate', 1);
  if (sim.rng() < chance) {
    let crystals = g.tier + Math.floor(sim.rng() * (g.tier + 1));
    if (n.hasSkill('torsicht')) crystals *= 2;
    const xp = 35 * g.tier;
    n.town.stock.crystals += crystals; g.cleared++; n.gatesCleared++;
    sim.log(`💎 kehrt siegreich aus dem ${g.name} zurück: +${crystals} Mana-Kristalle, +${xp} EP!`, n, true);
    sim.emit('system', `Riss bezwungen! Beute: ${crystals} Mana-Kristalle`);
    sim.float(gate.x, gate.y, `💎 +${crystals}`, '#c9b6ff');
    n.remember(sim, `Hat den ${g.name} bezwungen 💎`);
    n.mood = Math.min(100, n.mood + 20);
    n.addXp(sim, xp);
  } else {
    g.failed++;
    n.energy = 5; n.hunger = Math.min(100, n.hunger + 25); n.mood = Math.max(0, n.mood - 25);
    sim.log(`🩸 kehrt verwundet aus dem ${g.name} zurück …`, n, true);
    sim.emit('system', `${n.name} musste aus dem Riss fliehen.`);
    n.remember(sim, `Musste verwundet aus dem ${g.name} fliehen 🩸`);
    n.addXp(sim, 10 * g.tier);
  }
}

defineAction({
  id: 'mineStone', label: 'bricht Stein', short: 'Stein', start: 'geht zum Steinbruch', icon: '⛏️',
  score(n, sim) {
    if (n.inventory.wood || sim.isNight || (n.inventory.stone || 0) >= CONFIG.npc.carryCapacity) return 0;
    return n.town.stoneWanted || n.town.stock.stone < 15 ? 31 : 6;
  },
  think: (n, sim) => n.town.stoneWanted ? 'Für die neuen Gebäude brauchen wir Stein. Ab in den Steinbruch!' : 'Ein Vorrat an Stein kann nie schaden.',
  plan(n, sim) {
    const res = sim.world.findAdjacent(n.x, n.y, t => t.type === 'rock' && t.wood > 0, 6000);
    if (!res) return null;
    const rock = res.target;
    return [move(res.path), act((n, sim, s) => {
      if (rock.type !== 'rock' || rock.wood <= 0) return 'done';
      rock.hitAt = performance.now();
      if (s.t % Math.max(1, Math.round(CONFIG.resources.mineMinutes / n.workRate('mine'))) !== 0) return;
      rock.wood--; n.inventory.stone = (n.inventory.stone || 0) + 1;
      sim.float(rock.x, rock.y, '+1 🪨', '#d8d4cc');
      n.gainXp('mining', 1);
      if (rock.wood <= 0) { sim.world.setType(rock, 'grass'); sim.log('⛏️ hat einen Felsen ganz abgetragen.', n); }
      if (n.inventory.stone >= CONFIG.npc.carryCapacity || rock.type !== 'rock') return 'done';
    }, { work: true, face: rock, tool: 'pick' })];
  },
});

defineAction({
  id: 'visitTavern', label: 'sitzt in der Taverne', short: 'Taverne', start: 'geht in die Taverne', icon: '🍺',
  score(n, sim) {
    const tv = n.town.tavern, h = sim.hourFloat;
    if (!tv || h < 18 || h >= 22.5 || n.town.stock.coins < 1 || sim.minutes - (n.lastTavern || -1e9) < 1200) return 0;
    return 30 + (100 - n.social) * 0.3 + n.traits.gesellig * 10;
  },
  think: (n, sim) => pick(sim, ['Feierabend! Ein Krug in der Taverne wäre jetzt schön.', 'In der Taverne spielt heute bestimmt wieder Musik.', 'Mal hören, welche Geschichten die Abenteurer heute erzählen.']),
  plan(n, sim) {
    const tv = n.town.tavern;
    const res = sim.world.findAdjacent(n.x, n.y, t => t === tv.tile, 5000);
    if (!res) return null;
    return [move(res.path), act((n, sim, s) => {
      if (s.t === 1) { n.lastTavern = sim.minutes; n.town.stock.coins = Math.max(0, n.town.stock.coins - 1); n.inside = tv; tv.guests = (tv.guests || 0) + 1; }
      n.social = Math.min(100, n.social + 0.8); n.mood = Math.min(100, n.mood + 0.3);
      if (s.t >= 60) return 'done';
    })];
  },
  onEnd(n) { if (n.inside && n.inside.type === 'tavern') { n.inside.guests = Math.max(0, (n.inside.guests || 1) - 1); n.inside = null; } },
});

defineAction({
  id: 'pray', label: 'betet im Tempel', short: 'Tempel', start: 'geht zum Tempel', icon: '🙏',
  score(n, sim) {
    const tp = n.town.temple;
    if (!tp || sim.isNight || sim.minutes - (n.lastPray || -1e9) < 1440) return 0;
    const need = Math.max(0, 55 - n.mood) + (n.hp < n.maxHp * 0.6 ? 30 : 0);
    return need > 0 ? 25 + need * 0.6 : 0;
  },
  think: n => n.hp < n.maxHp * 0.6 ? 'Meine Wunden schmerzen. Im Tempel finde ich Heilung.' : 'Ich brauche einen Moment der Ruhe im Tempel.',
  plan(n, sim) {
    const tp = n.town.temple;
    const res = sim.world.findAdjacent(n.x, n.y, t => t === tp.tile, 5000);
    if (!res) return null;
    return [move(res.path), act((n, sim, s) => {
      if (s.t === 1) n.lastPray = sim.minutes;
      const L = tp.level || 1;
      n.mood = Math.min(100, n.mood + 0.5 * L); n.hp = Math.min(n.maxHp, n.hp + n.maxHp * 0.02 * L);
      if (s.t >= 40) return 'done';
    }, { face: tp.tile })];
  },
});

defineAction({
  id: 'visitMarket', label: 'bummelt über den Markt', short: 'Markt', start: 'geht auf den Markt', icon: '🛍️',
  score(n, sim) {
    const m = n.town.market;
    if (!m || sim.isNight || n.mood > 75 || sim.minutes - (n.lastMarket || -1e9) < 720) return 0;
    const h = sim.hourFloat;
    return 16 + (h >= 15 && h < 20 ? 12 : 0) + n.traits.gesellig * 6;
  },
  think: (n, sim) => pick(sim, ['Mal sehen, was es heute auf dem Markt gibt.', 'Auf dem Markt hört man immer die neuesten Geschichten.', 'Ich gönne mir einen Bummel über den Markt.']),
  plan(n, sim) {
    const m = n.town.market;
    const res = sim.world.findAdjacent(n.x, n.y, t => t === m.tile, 5000);
    if (!res) return null;
    return [move(res.path), act((n, sim, s) => {
      if (s.t === 1) n.lastMarket = sim.minutes;
      n.mood = Math.min(100, n.mood + 0.35); n.social = Math.min(100, n.social + 0.5);
      if (s.t === 15 && n.hunger > 40 && n.town.stock.food > 0 && n.town.stock.coins >= 0) { n.town.stock.food--; n.hunger = Math.max(0, n.hunger - CONFIG.farming.foodPerMeal); sim.float(m.tile.x, m.tile.y, '🥨', '#fff'); }
      if (s.t >= 35) return 'done';
    }, { face: m.tile })];
  },
});

defineAction({
  id: 'arrive', label: 'wandert zur Siedlung', short: 'Ankommen', start: 'wandert zur Siedlung', icon: '🧳',
  interruptible: false,
  score: () => 0, // wird nur beim Eintreffen direkt gestartet
  think: () => 'Ich habe von dieser Siedlung gehört. Vielleicht finde ich hier ein Zuhause.',
  plan(n, sim) {
    const res = sim.world.findAdjacent(n.x, n.y, t => t === n.town.campTile);
    return res ? [move(res.path)] : null;
  },
});

defineAction({
  id: 'wander', label: 'schlendert herum', short: 'Bummeln', start: 'schlendert herum', icon: '🚶',
  score: () => 2,
  think: (n, sim) => n.traits.neugier > 0.65 ? 'Ich schaue mich ein bisschen in der Gegend um.' : 'Kurz die Beine vertreten.',
  plan(n, sim) {
    const c = n.town.camp;
    const gx = c.x + Math.round((sim.rng() - 0.5) * 8), gy = c.y + Math.round((sim.rng() - 0.5) * 8);
    const res = sim.world.bfs(n.x, n.y, (x, y) => x === gx && y === gy);
    if (!res) return null;
    return [move(res.path), act((n, sim, s) => s.t >= 10 ? 'done' : undefined)];
  },
});

defineAction({
  id: 'idle', label: 'ruht sich aus', short: 'Ausruhen', start: 'ruht sich aus', icon: '🙂',
  score: () => 1,
  think: () => 'Ich gönne mir eine kleine Pause.',
  plan: () => [act((n, sim, s) => s.t >= 15 ? 'done' : undefined)],
});

/* ---- Soziales: Gesprächspartner, Gespräche, Beziehungen ---------------- */
function choosePartner(n, sim) {
  let best = null, bestScore = -Infinity;
  for (const o of sim.npcs) {
    if (o === n || o.sleeping || o.inside || (o.task && o.task.actionId === 'arrive')) continue;
    const d = Math.hypot(o.x - n.x, o.y - n.y);
    if (d > 18) continue;
    const sc = (n.relations[o.id] || 0) * 0.6 + 20 - d * 2 + sim.rng() * 12;
    if (sc > bestScore) { bestScore = sc; best = o; }
  }
  return best;
}

function dialogue(a, b, sim) {
  const st = a.town, need = houseCost() - st.stock.wood, rel = a.relations[b.id] || 0;
  const L = [];
  if (b.arrivedAt && sim.minutes - b.arrivedAt < 1440) L.push(`Willkommen in unserer Siedlung, ${b.name}!`, `Hast du dich schon eingelebt, ${b.name}?`);
  if (st.site) L.push(`Das neue Haus ist schon zu ${Math.floor(st.site.progress / st.site.work * 100)} % fertig!`);
  else if (need > 0) L.push(`Uns fehlen noch ${need} Holz fürs nächste Haus.`, 'Wenn wir so weitermachen, steht bald das nächste Haus.');
  if (a.hunger > 45) L.push('Ich könnte jetzt einen ganzen Strauch Beeren essen.');
  if (a.energy < 35) L.push('Ich bin hundemüde …');
  if (sim.weather === 'regen') L.push('Dieser Regen hört gar nicht auf.', 'Gut für die Beeren, schlecht für meine Laune.');
  if (sim.weather === 'klar' && !sim.isNight) L.push('Herrliches Wetter heute, oder?');
  if (a.home && a.home === b.home) L.push('Schön, dass wir unter einem Dach wohnen.');
  if (!a.home) L.push('Ich hoffe, ich bekomme bald ein eigenes Haus.');
  if (rel >= 50) L.push(`Auf dich kann man sich verlassen, ${b.name}.`, 'Weißt du noch, wie klein hier alles angefangen hat?');
  if (rel < 10) L.push(`Wir kennen uns noch kaum. Ich bin ${a.name}.`);
  if (sim.npcs.length >= 6) L.push(`Wir sind schon ${sim.npcs.length} Leute hier!`, 'Vielleicht sollten wir bald einen Markt bauen.');
  if ((a.skills.woodcutting || 0) >= 30) L.push(`Ich habe schon ${a.skills.woodcutting} Holz geschlagen.`);
  if (a.traits.neugier > 0.65) L.push('Was wohl hinter dem großen Wald liegt?');
  return pick(sim, L.length ? L : ['Na, alles gut bei dir?']);
}

function converse(a, b, sim) {
  const line = dialogue(a, b, sim);
  sim.log(`💬 zu ${b.name}: „${line}“`, a);
  b.thought = `${a.name} sagt: „${line}“`;
  a.gainXp('social', 1);
}

function changeRelation(a, b, d, sim) {
  for (const [x, y] of [[a, b], [b, a]]) {
    const before = x.relations[y.id] || 0;
    x.relations[y.id] = clamp(before + d, -100, 100);
    if (x === a && before < 50 && x.relations[y.id] >= 50) {
      sim.log(`🤝 ${a.name} und ${b.name} sind jetzt Freunde!`, null, true);
      a.remember(sim, `Hat sich mit ${b.name} angefreundet 🤝`);
      b.remember(sim, `Hat sich mit ${a.name} angefreundet 🤝`);
    }
  }
}

/* =====================================================================
 * 6) NPC: Bedürfnisse, Charakter, Gedanken, Entscheidungen
 * ===================================================================== */
function traitTags(t) {
  const tags = [];
  if (t.fleiss > 0.65) tags.push('fleißig'); else if (t.fleiss < 0.35) tags.push('gemütlich');
  if (t.gesellig > 0.65) tags.push('gesellig'); else if (t.gesellig < 0.35) tags.push('Einzelgänger');
  if (t.neugier > 0.65) tags.push('neugierig');
  return tags.length ? tags : ['ausgeglichen'];
}

class NPC {
  constructor(id, def, x, y, rng = Math.random) {
    this.id = id;
    this.name = def.name;
    this.color = def.color;
    this.x = x; this.y = y; this.prevX = x; this.prevY = y;
    this.hunger = CONFIG.npc.startHunger;
    this.energy = CONFIG.npc.startEnergy;
    this.inventory = { wood: 0, stone: 0 };  // später: food, coins, weapon ...
    this.profession = 'settler';
    this.home = null;
    this.skills = {};              // Erfahrung je Tätigkeit → Grundlage fürs Level-System
    this.traits = def.traits || { fleiss: rng(), gesellig: rng(), neugier: rng() };
    this.mood = 70;                // Laune 0..100
    this.social = 75;              // Gemeinschaft 0..100 (100 = zufrieden)
    this.relations = {};           // id → -100..100
    this.memories = [];
    this.thought = '';
    this.lastScores = [];          // Abwägung der letzten Entscheidung
    this.partner = null;
    this.task = null;
    this.lastLogged = null;
    this.sim = null;               // wird von der Simulation gesetzt (nicht gespeichert)
    // Erwachte („Spieler“): Level, Werte, Klasse, Fähigkeiten, Titel, tägliche Aufgabe
    this.awakened = false; this.level = 0; this.xp = 0; this.stats = null; this.cls = null;
    this.unlocked = []; this.titles = []; this.quest = null; this.questsDone = 0;
    this.lastGate = -1e9; this.gatesCleared = 0; this.housesBuilt = 0;
    this.hp = 100; this.gear = {}; this.kills = 0; this.forged = 0; this.lastRuin = -1e9; this.loyalTo = null; this.hiding = false; this.foe = null;
    this.facing = 1;
    this.arrivedAt = 0;
    this.sleeping = false; this.inside = null; this.bed = null; this.working = false;
  }

  get action() { return this.task ? ACTIONS[this.task.actionId] : null; }
  get tags() { return traitTags(this.traits); }
  get moodEmoji() { const m = this.mood; return m >= 75 ? '😄' : m >= 55 ? '🙂' : m >= 35 ? '😐' : '😟'; }

  remember(sim, text) {
    this.memories.unshift({ day: sim.day, clock: sim.clock, text });
    if (this.memories.length > 8) this.memories.pop();
  }

  // --- Erweiterungspunkte -------------------------------------------
  hasSkill(id) { return this.unlocked.includes(id); }
  unstick(sim) {
    const w = sim.world, c = this.town.camp;
    let best = null, bd = Infinity;
    w.bfs(c.x, c.y + 1, (x, y) => { const d = Math.hypot(x - this.x, y - this.y); if (d < bd && (x !== Math.round(this.x) || y !== Math.round(this.y))) { bd = d; best = { x, y }; } return null; }, 8000);
    if (!best) return;
    if (this.task) this.endTask(sim);
    this.x = this.prevX = best.x; this.y = this.prevY = best.y;
  }
  get maxHp() { return 100 + (this.awakened ? this.level * 8 + this.stats.ausdauer * 3 : 0); }
  get attack() { return this.awakened ? Math.round((6 + this.level * 2 + this.stats.kraft + (this.gear.weapon ? this.gear.weapon.power : 0)) * (petIs(this, 'drache') ? 1.3 : petIs(this, 'wolf') ? 1.15 : 1)) : 2; }
  get defense() { return gearPower(this, ['armor', 'helmet', 'boots', 'cape']); }
  becomeStarSmith(sim) {
    this.cls = 'sternenschmied'; this.level = 1; this.xp = 0; this.ambition = 'schmiede';
    this.unlocked = [];
    sim.log('📖 findet in den Ruinen ein vergessenes Schmiedebuch … und erhält die legendäre Klasse „Sternenschmied“! Doch die Macht fordert ihren Preis: zurück auf Level 1.', this, true);
    sim.emit('system', 'LEGENDÄRE KLASSE ERHALTEN: Sternenschmied');
    sim.emit('system', `${this.name}: Level auf 1 zurückgesetzt.`);
    sim.emit('awaken', this);
    this.remember(sim, 'Fand das vergessene Schmiedebuch 📖');
    this.addTitle(sim, 'Erbe der Sternenschmiede');
    for (const [id, sk] of Object.entries(SKILLS)) if (sk.cls === 'sternenschmied' && sk.lvl <= this.level) this.unlocked.push(id);
  }
  get speed() {
    let v = CONFIG.npc.moveSpeed;
    if (this.awakened) v *= 1 + this.stats.geschick * 0.015;
    if (this.hasSkill('leichtfuss')) v *= 1.35;
    if (this.hasSkill('phasenschritt')) v *= 1.5;
    if (petIs(this, 'hase')) v *= 1.15;
    return v;
  }
  gainXp(skill, amount) {
    const before = this.skills[skill] || 0;
    this.skills[skill] = before + amount;
    const lv = skillLevel(skill, this.skills[skill]);
    if (this.sim && SKILL_INFO[skill] && lv > skillLevel(skill, before)) { // Fertigkeit steigt
      const info = SKILL_INFO[skill];
      this.sim.log(`${info.icon} erreicht ${info.name} Stufe ${lv}!`, this, lv >= 5);
      this.sim.float(this.x, this.y - 0.6, `${info.icon} ${info.name} ${lv}!`, '#ffd76a');
      this.sim.emit('skillup', { n: this, skill, level: lv });
      if (lv === 5 || lv === 10) this.remember(this.sim, `Wurde Meister im ${info.name} (Stufe ${lv}) ${info.icon}`);
    }
    if (!this.awakened || !this.sim) return;
    const q = this.quest;
    if (q && !q.done && q.type === skill) { q.prog = Math.min(q.goal, q.prog + amount); if (q.prog >= q.goal) this.completeQuest(this.sim); }
    this.addXp(this.sim, amount * (CONFIG.levels.xpPer[skill] || 0));
  }
  addXp(sim, amount) {
    if (!this.awakened) return;
    const g = sim.guild, gh = sim.capital.gildenhalle;
    amount *= (petIs(this, 'eule', 'drache') ? 1.1 : 1) * (g ? 1 + ((g.level || 1) - 1) * 0.05 : 1) * (gh ? 1 + 0.05 * (gh.level || 1) : 1);
    if (g) guildXp(sim, amount * 0.15);
    this.xp += amount;
    while (this.xp >= xpForLevel(this.level)) { this.xp -= xpForLevel(this.level); this.levelUp(sim); }
  }
  awaken(sim, text) {
    if (this.awakened) return;
    const t = this.traits, r = v => Math.round(3 + v * 3);
    this.awakened = true; this.level = 1; this.xp = 0;
    this.ambition = pickAmbition(this, sim.rng);
    this.stats = { kraft: r(t.fleiss), geschick: r(t.neugier), ausdauer: 4, charisma: r(t.gesellig) };
    this.newQuest(sim);
    sim.log(`✨ ${text}`, this, true);
    sim.emit('system', `${this.name} ist erwacht. Ein leuchtendes Fenster erscheint …`);
    sim.emit('awaken', this);
    this.remember(sim, 'Ist erwacht ✨');
    this.addTitle(sim, 'Erwachte Seele');
  }
  levelUp(sim) {
    this.level++;
    for (const k of Object.keys(this.stats)) this.stats[k]++;
    const focus = this.cls ? CLASS_STAT[this.cls] : Object.keys(STAT_NAMES)[Math.floor(sim.rng() * 4)];
    this.stats[focus] += 2;
    this.energy = Math.min(100, this.energy + 30); this.mood = Math.min(100, this.mood + 15);
    sim.log(`⬆️ erreicht Level ${this.level}!`, this, true);
    sim.emit('levelup', this);
    sim.emit('system', `Level aufgestiegen! ${this.name} ist jetzt Level ${this.level}.`);
    if (this.level >= CONFIG.levels.classLevel && !this.cls) this.chooseClass(sim);
    for (const [id, sk] of Object.entries(SKILLS)) {
      if (sk.cls !== this.cls || sk.lvl > this.level || this.hasSkill(id)) continue;
      this.unlocked.push(id);
      sim.log(`✨ lernt die Fähigkeit „${sk.name}“: ${sk.desc}`, this, true);
      sim.emit('system', `Neue Fähigkeit: ${sk.name}`);
      this.remember(sim, `Hat „${sk.name}“ gelernt ✨`);
    }
  }
  chooseClass(sim) {
    let cls;
    // versteckte Klasse: nur sehr neugierige Seelen spüren den Ruf der Risse
    if (this.traits.neugier > 0.72 && sim.rng() < 0.5 && !sim.npcs.some(o => o.cls === 'torwandler')) cls = 'torwandler';
    else {
      const s = this.skills, w = { schmied: (s.forging || 0) * 6, waldlaeufer: (s.woodcutting || 0) * 0.55, baumeister: (s.building || 0) * 0.08, hueter: (s.gathering || 0) * 1.2, herold: (s.social || 0) * 4 };
      cls = Object.entries(w).sort((a, b) => b[1] - a[1])[0][0];
    }
    this.cls = cls;
    const c = CLASSES[cls];
    sim.log(`${c.icon} erhält die Klasse „${c.name}“!`, this, true);
    sim.emit('system', c.hidden ? `Versteckte Klasse entdeckt: ${c.name}!` : `Klasse erhalten: ${c.name}`);
    this.remember(sim, `Wurde zur Klasse ${c.name} ${c.icon}`);
  }
  addTitle(sim, title) {
    if (!title || this.titles.includes(title)) return;
    this.titles.push(title);
    sim.log(`🏅 erhält den Titel „${title}“`, this, true);
    sim.emit('system', `Titel erhalten: ${title}`);
  }
  checkTitles(sim) {
    const friends = Object.values(this.relations).filter(v => v >= 50).length;
    if ((this.skills.woodcutting || 0) >= 150) this.addTitle(sim, 'Holzfäller-Legende');
    if (this.housesBuilt >= 3) this.addTitle(sim, 'Erbauer');
    if (friends >= 3) this.addTitle(sim, 'Seele der Gemeinschaft');
    if (this.questsDone >= 3) this.addTitle(sim, 'Pflichtbewusst');
    if (this.gatesCleared >= 1) this.addTitle(sim, 'Rissbezwinger');
    if (this.level >= 10) this.addTitle(sim, 'Aufsteigender Stern');
  }
  newQuest(sim) {
    const q = QUESTS[Math.floor(sim.rng() * QUESTS.length)];
    const goal = Math.round(q.goal * (1 + (this.level - 1) * 0.15));
    this.quest = { type: q.type, goal, prog: 0, done: false, text: q.text(goal) };
  }
  completeQuest(sim) {
    this.quest.done = true; this.questsDone++;
    const xp = 15 + this.level * 5;
    sim.log(`📜 erfüllt die tägliche Aufgabe „${this.quest.text}“ (+${xp} EP)`, this, true);
    sim.emit('system', `Tägliche Aufgabe erfüllt! Belohnung: ${xp} EP`);
    this.addXp(sim, xp);
  }
  /** Arbeitsgeschwindigkeit; später abhängig von Level, Beruf, Werkzeug. */
  workRate(kind) {
    let r = this.awakened ? 1 + this.stats.kraft * 0.02 : 1;
    const sk = { build: 'building', chop: 'woodcutting', mine: 'mining' }[kind];
    if (sk) r *= 1 + (skillLevel(sk, this.skills[sk]) - 1) * 0.06; // jede Stufe +6 %
    if (kind === 'build' && this.hasSkill('meisterhand')) r *= 2;
    if (kind === 'chop') r *= (petIs(this, 'fuchs') ? 1.2 : 1) * (this.town && this.town.forsthaus ? 1 + 0.1 * (this.town.forsthaus.level || 1) : 1); // Fuchs, Forsthaus
    if (kind === 'build' && this.sim && this.sim.npcs.some(o => o.hasSkill('inspiration') && o.task && o.task.actionId === 'build')) r *= 1.3;
    return r;
  }
  /** Beruf und Charakter gewichten Aktionen. */
  weight(actionId) {
    let w = CONFIG.professions[this.profession]?.weights?.[actionId] ?? 1;
    if (actionId === 'gatherWood' || actionId === 'build' || actionId === 'deliver') w *= 0.75 + this.traits.fleiss * 0.5;
    if (actionId === 'wander' || actionId === 'idle') w *= 1.6 - this.traits.fleiss;
    if (this.awakened && this.quest && !this.quest.done && QUEST_ACTION[this.quest.type] === actionId) w *= 1.3; // Ehrgeiz
    if (this.awakened && AMBITIONS[this.ambition]) w *= AMBITIONS[this.ambition].w[actionId] || 1; // Lebensziel
    if (actionId === 'searchRuin' && this.sim && this.sim.story && this.sim.story.ruinCall && this.sim.story.hero === this) w *= 2.5; // das Flüstern der Ruinen
    return w;
  }
  // ------------------------------------------------------------------

  update(sim) {
    this.prevX = this.x; this.prevY = this.y;
    this.updateNeeds(sim);

    // Dringende Bedürfnisse unterbrechen die aktuelle Tätigkeit
    if (this.task && this.action.interruptible) {
      const urgent = Object.values(ACTIONS).find(a => a.urgent && a.id !== this.task.actionId && a.urgent(this, sim));
      if (urgent) {
        const steps = urgent.plan(this, sim);
        if (steps) { this.endTask(sim); this.startTask(urgent, steps, sim); }
      }
    }
    // eingesperrt (z. B. durch ein neues Feld rundherum)? Dann zum nächsten freien Weg klettern
    if (sim.minutes % 30 === this.id % 30 && !this.inside && !DIRS.some(([dx, dy]) => sim.world.walkable(Math.round(this.x) + dx, Math.round(this.y) + dy))) this.unstick(sim);
    if (!this.task) this.decide(sim);
    if (this.task) this.runTask(sim);
    if (this.awakened && sim.minutes % 30 === 0) {
      if (this.hasSkill('gruenerDaumen')) // Sträucher in der Nähe tragen schneller
        for (let y = Math.round(this.y) - 3; y <= Math.round(this.y) + 3; y++)
          for (let x = Math.round(this.x) - 3; x <= Math.round(this.x) + 3; x++) {
            const t = sim.world.tile(x, y);
            if (t && t.type === 'bush' && t.berries < CONFIG.resources.bushMaxBerries) t.berries++;
          }
      if (sim.minutes % 120 === 0) this.checkTitles(sim);
    }
  }

  updateNeeds(sim) {
    const c = CONFIG.npc;
    const endur = this.awakened ? 1 - Math.min(0.4, this.stats.ausdauer * 0.01) : 1;
    this.hunger = clamp(this.hunger + c.hungerPerMin * (this.sleeping ? 0.5 : 1) * endur * (this.hasSkill('genuegsam') ? 0.6 : 1), 0, 100);
    if (!this.sleeping) {
      this.energy = clamp(this.energy - (c.energyPerMin + (this.working ? c.workEnergyPerMin : 0)) * endur, 0, 100);
      this.social = clamp(this.social - c.socialPerMin * (0.5 + this.traits.gesellig), 0, 100);
    }
    const target = clamp(100 - this.hunger * 0.45 - (100 - this.energy) * 0.25 - (100 - this.social) * 0.3
      + (this.home ? 8 : -8) - (sim.weather === 'regen' ? 8 : 0) + (this.pet ? 6 : 0), 0, 100);
    if (this.pet && this.pet.bond < 100 && sim.minutes % 30 === 0) this.pet.bond = Math.min(100, this.pet.bond + 0.5); // Bindung wächst
    this.mood += (target - this.mood) * 0.02;
    this.hp = Math.min(this.maxHp, this.hp + (this.sleeping ? 0.5 : 0.12));
    if (this.hunger >= 100 && !this.starving) { this.starving = true; sim.log('hat schrecklichen Hunger!', this); this.remember(sim, 'Hatte schrecklichen Hunger 😣'); }
    if (this.hunger < 90) this.starving = false;
  }

  decide(sim) {
    const ranked = Object.values(ACTIONS)
      .filter(a => !(this.cool && this.cool[a.id] > sim.minutes))
      .map(a => ({ a, s: a.score(this, sim) * this.weight(a.id) }))
      .filter(e => e.s > 0)
      .sort((p, q) => q.s - p.s);
    this.lastScores = ranked.slice(0, 3).map(e => ({ label: e.a.short || e.a.label, score: Math.round(e.s) }));
    for (const { a } of ranked) if (this.tryStart(a, sim)) return;
  }

  tryStart(action, sim) {
    const steps = action.plan(this, sim);
    if (!steps) { (this.cool ||= {})[action.id] = sim.minutes + 20; return false; }
    this.startTask(action, steps, sim);
    return true;
  }

  startTask(action, steps, sim) {
    this.task = { actionId: action.id, steps, i: 0 };
    this.thought = action.think ? action.think(this, sim) : action.start;
    if (this.awakened && sim.story && !['fight', 'flee', 'duel'].includes(action.id) && sim.rng() < 0.3) this.thought = playerThought(this, sim); // denkt wie ein Spieler
    const q = this.quest;
    if (this.awakened && q && !q.done && QUEST_ACTION[q.type] === action.id) this.thought = `[Tägliche Aufgabe: ${q.text} – ${Math.floor(q.prog)}/${q.goal}] ` + this.thought;
    if (action.id !== this.lastLogged) {
      sim.log(action.describe ? action.describe(this, sim) : action.start, this);
      this.lastLogged = action.id;
    }
  }

  runTask(sim) {
    const task = this.task;
    const step = task.steps[task.i];
    if (!step) return this.endTask(sim);
    this.working = false;
    let result;
    if (step.kind === 'move') result = this.moveAlong(step, sim);
    else { step.t++; this.working = !!step.work; result = step.tick(this, sim, step); }
    if (result === 'done') { task.i++; if (task.i >= task.steps.length) this.endTask(sim); }
    else if (result === 'fail') this.endTask(sim);
  }

  moveAlong(step, sim) {
    let budget = this.speed;
    while (budget > 0 && step.path.length) {
      const next = step.path[0];
      if (!sim.world.walkable(next.x, next.y)) return 'fail'; // Weg verbaut → neu planen
      const dx = next.x - this.x, dy = next.y - this.y, d = Math.hypot(dx, dy);
      if (Math.abs(dx) > 0.01) this.facing = dx > 0 ? 1 : -1;
      this.dirV = Math.abs(dy) > Math.abs(dx) ? (dy > 0 ? 'down' : 'up') : 'side';
      if (d <= budget) {
        this.x = next.x; this.y = next.y; budget -= d; step.path.shift();
        const t = sim.world.tile(next.x, next.y);
        if (t.traffic < 400) { t.traffic++; if (t.traffic % 8 === 0 && t.traffic <= 64) sim.world.dirtyTiles.add(t); } // Trampelpfade
      } else { this.x += dx / d * budget; this.y += dy / d * budget; budget = 0; }
    }
    return step.path.length ? undefined : 'done';
  }

  endTask(sim) {
    const a = this.action;
    if (a && a.onEnd) a.onEnd(this, sim);
    this.task = null; this.working = false;
  }

  get statusText() {
    const a = this.action;
    if (!a) return 'überlegt …';
    if (this.inside && this.inside.gate) return `kämpft im ${this.inside.tile.gate.name} …`;
    if (a.id === 'fight' && this.foe) return `kämpft gegen einen ${MONSTERS[this.foe.kind].name}`;
    const step = this.task.steps[this.task.i];
    if (step && step.kind === 'move' && a.id !== 'wander') return a.describe ? a.describe(this) : a.start;
    if (a.id === 'socialize' && this.partner) return `unterhält sich mit ${this.partner.name}`;
    return a.label;
  }
}

/* =====================================================================
 * 7) SIMULATION: Zeit, Wetter, Wachstum, Ereignisse, Log, Speichern
 * ===================================================================== */
const TILE_TYPES = Object.keys(TILE_DEFS);
const SAVE_VERSION = 6; // 6: Geschichte (story), Lebensziele, Tagebuch
// Reihenfolge der Geländearten in älteren Spielständen (dort wurden Kacheln als Nummer gespeichert)
const BASE_TYPES = ['grass', 'tree', 'stump', 'water', 'bush', 'camp', 'site', 'house', 'rock'];
const OLD_TYPE_LISTS = {
  2: [[...BASE_TYPES, 'ford', 'ruin', 'gate']],
  3: [[...BASE_TYPES, 'field', 'smithy', 'ford', 'ruin', 'gate']],
  4: [[...BASE_TYPES, 'field', 'smithy', 'castle', 'ford', 'ruin', 'gate'],
      [...BASE_TYPES, 'field', 'smithy', 'market', 'castle', 'ford', 'ruin', 'gate'],
      [...BASE_TYPES, 'field', 'smithy', 'market', 'tower', 'tavern', 'temple', 'castle', 'ford', 'ruin', 'gate']],
};
const WEATHER_TEXT = { 'bewölkt': '☁️ Wolken ziehen auf.', regen: '🌧️ Es beginnt zu regnen.', klar: '🌤️ Der Himmel klart auf.' };

class Simulation {
  constructor(seed, save = null) {
    this.seed = seed;
    this.rng = mulberry32(seed);
    this.minutes = CONFIG.time.startHour * 60;
    this.weather = 'klar';
    this.world = new World(CONFIG, this.rng);
    this.towns = [new Settlement(this, this.world.camp, { id: 0, name: 'Erstes Lager', capital: true })];
    this.kingdom = null;
    this.npcs = [];
    this.logEntries = [];
    this.floats = [];   // schwebende Texte, nur Anzeige
    this.carts = []; this.cartId = 0; // Händlerkarren (nicht gespeichert)
    this.monsters = []; this.monsterId = 0; this.guild = null; this.tomeFound = false; this.ruinsSearched = 0;
    this.listeners = {};
    if (save) this.applySave(save);
    else CONFIG.startingNpcs.forEach(def => this.addNpc(def));
    this.firstAwakening = !!(save && save.firstAwakening);
    this.on('buildingCompleted', b => this.onHouseBuilt(b));
    this.story = new Story(this, save ? save.story : null, !!save);
  }

  get settlement() { return this.towns[0]; }
  get capital() { return this.towns[0]; }
  get allHouses() { return this.towns.flatMap(t => t.houses); }

  get day() { return Math.floor(this.minutes / 1440) + 1; }
  get hourFloat() { return (this.minutes % 1440) / 60; }
  get isNight() { const h = this.hourFloat; return h >= CONFIG.time.nightStart || h < CONFIG.time.nightEnd; }
  get clock() { const m = this.minutes % 1440; return `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`; }

  addNpc(def, pos = null, town = this.towns[0]) {
    const c = town.camp;
    const spot = pos ? { stand: pos } : this.world.bfs(c.x, c.y + 1, (x, y) =>
      Math.abs(x - c.x) + Math.abs(y - c.y) >= 1 && !this.npcs.some(n => n.x === x && n.y === y) ? true : null);
    const x = spot ? spot.stand.x : c.x, y = spot ? spot.stand.y : c.y + 1;
    const id = this.npcs.reduce((m, n) => Math.max(m, n.id), 0) + 1;
    const npc = new NPC(id, def, x, y, this.rng);
    npc.sim = this; npc.town = town;
    this.npcs.push(npc);
    this.emit('npcAdded', npc);
    return npc;
  }

  /** Morgens: Erwachte holen sich bessere Ausrüstung aus dem Lager (das Alte kommt zurück hinein). */
  handOutGear() {
    const st = this.capital;
    if (!st.items || !st.items.length) return;
    for (const n of this.npcs.filter(x => x.awakened)) for (const slot of SLOTS) {
      const cur = n.gear[slot], best = st.items.filter(it => it.slot === slot && (!cur || it.power > cur.power)).sort((a, b) => b.power - a.power)[0];
      if (!best) continue;
      st.items.splice(st.items.indexOf(best), 1);
      if (cur) st.storeItem(cur);
      n.gear[slot] = best;
      this.log(`📦 holt ${itemName(best)} aus dem Lager.`, n);
    }
  }

  /** Neues Haus: Siedler ohne Zuhause ziehen ein, danach kommt ein Neuer dazu. */
  onHouseBuilt(house) {
    if (house.type !== 'house') return;
    const town = house.town || this.capital, people = this.npcs.filter(n => n.town === town);
    for (const n of people) if (!n.home && house.residents.length < house.beds) this.moveIn(n, house);
    // Neue kommen nur, wenn die Siedlung satt ist
    const avgHunger = people.reduce((a, n) => a + n.hunger, 0) / Math.max(1, people.length);
    if (avgHunger > 50) { this.log('🍂 Kein Neuankömmling – das Essen ist gerade knapp.', null, true); return; }
    if (this.npcs.length < CONFIG.population.max) this.spawnNewcomer(town);
    if (this.npcs.some(n => n.hasSkill('rufDerFerne')) && this.npcs.length < CONFIG.population.max) this.spawnNewcomer(town);
  }

  moveIn(n, house, silent = false) {
    house.residents.push(n); n.home = house;
    if (!silent) n.remember(this, `Ist in Haus Nr. ${house.id} eingezogen 🏠`);
  }

  spawnNewcomer(town = this.capital) {
    const entry = this.findEntryTile(town);
    if (!entry) return;
    const used = new Set(this.npcs.map(n => n.name));
    const name = CONFIG.population.names.find(x => !used.has(x)) || `Siedler ${this.npcs.length + 1}`;
    const color = `hsl(${Math.round((this.npcs.length * 137.5) % 360)}, 62%, 58%)`;
    const npc = this.addNpc({ name, color }, entry, town);
    npc.hunger = 20 + this.rng() * 20; npc.energy = 70 + this.rng() * 20;
    npc.profession = this.pickProfession();
    npc.arrivedAt = this.minutes;
    npc.remember(this, 'Ist in die Siedlung gekommen 🧳');
    if (this.rng() < 0.18) { const p = givePet(npc, this.rng() < 0.5 ? 'hund' : 'katze', this); npc.remember(this, `Hat ${p.kind === 'hund' ? 'den Hund' : 'die Katze'} „${p.name}“ mitgebracht`); }
    const house = town.houses.find(h => h.residents.length < h.beds);
    if (house) this.moveIn(npc, house);
    this.log(`🧳 kommt neu nach ${town.name}${house ? ` und zieht in Haus Nr. ${house.id} ein` : ''}!`, npc, true);
    this.float(entry.x, entry.y, '👋 Neu!', '#fff');
    npc.lastLogged = 'arrive';
    npc.tryStart(ACTIONS.arrive, this);
    if (this.npcs.filter(n => n.awakened).length < CONFIG.awakening.max && this.rng() < CONFIG.awakening.chanceNewcomer)
      npc.awaken(this, 'kommt bereits erwacht in die Siedlung – ein seltsames Leuchten umgibt die Gestalt.');
  }

  /** Königreich ausrufen und neue Außenposten gründen. */
  updateKingdom() {
    const cap = this.capital;
    if (!this.kingdom && this.guild) {
      const st = this.story, hero = st && st.hero; // die Hauptfigur wird bevorzugt, ein Rivale nie (solange er Rivale ist)
      const top = hero && hero.level >= 8 ? hero : this.npcs.filter(n => n.awakened && !(st && st.rivalOf(n) && n === st.rival)).sort((a, b) => b.level - a.level)[0];
      if (top && top.level >= 8 && cap.houses.length >= 16) {
        const name = pick(this, KINGDOM_NAMES);
        this.kingdom = { name, founded: this.day, regent: top.name, regentId: top.id, color: pick(this, BANNERS) };
        cap.name = name; cap.color = this.kingdom.color; cap.leader = top.name;
        this.log(`👑 ${top.name} ruft das Königreich ${name} aus! Das Lager wird zur Hauptstadt.`, null, true);
        this.emit('system', `KÖNIGREICH GEGRÜNDET: ${name}`);
        this.emit('kingdom', this.kingdom);
        top.addTitle(this, `Regent von ${name}`);
      }
    }
    if (this.kingdom && this.towns.length < 4 && this.day >= this.kingdom.founded + 1 + (this.towns.length - 1) * 2
        && cap.members.length >= 24 && this.day !== this.outpostTry) this.foundOutpost();
  }

  foundOutpost() {
    const cap = this.capital, w = this.world;
    let best = null, bestScore = -Infinity;
    for (let i = 0; i < 500; i++) {
      const x = 6 + Math.floor(this.rng() * (w.w - 12)), y = 6 + Math.floor(this.rng() * (w.h - 12));
      const d = Math.hypot(cap.camp.x - x, cap.camp.y - y);
      if (d < 20 || d > 36 || this.towns.some(t => Math.hypot(t.camp.x - x, t.camp.y - y) < 20)) continue;
      if (w.gates.some(g => Math.hypot(g.x - x, g.y - y) < 9)) continue;
      let free = 0;
      for (let yy = y - 3; yy <= y + 3; yy++) for (let xx = x - 3; xx <= x + 3; xx++) { const t = w.tile(xx, yy); if (t && t.type === 'grass') free++; }
      if (free < 36 || !w.walkable(x, y + 1)) continue;
      if (free - d * 0.3 > bestScore) { bestScore = free - d * 0.3; best = { x, y }; }
    }
    if (!best || !w.bfs(cap.camp.x, cap.camp.y + 1, (x, y) => x === best.x && y === best.y + 1 ? true : null)) { this.outpostTry = this.day; return; }
    w.setType(w.tile(best.x, best.y), 'camp');
    const used = new Set(this.towns.map(t => t.name));
    const town = new Settlement(this, best, { id: this.towns.length, name: OUTPOST_NAMES.find(n => !used.has(n)) || 'Außenposten', founded: this.day });
    this.towns.push(town);
    const gift = (k, v) => { const g = Math.min(v, cap.stock[k]); cap.stock[k] -= g; town.stock[k] += g; };
    gift('wood', 25); gift('food', 15);
    const leader = this.npcs.filter(n => n.awakened && n.town === cap && n.id !== (this.kingdom && this.kingdom.regentId)).sort((a, b) => b.level - a.level)[0];
    const workers = this.npcs.filter(n => !n.awakened && n.town === cap && !n.inside).sort((a, b) => (a.home ? 1 : 0) - (b.home ? 1 : 0)).slice(0, 6);
    const group = leader ? [leader, ...workers] : workers;
    for (const n of group) {
      if (n.home) { n.home.residents = n.home.residents.filter(r => r !== n); n.home = null; }
      if (n.task) n.endTask(this);
      n.town = town; n.lastLogged = 'arrive';
      n.remember(this, `Zog los, um ${town.name} zu gründen 🏕️`);
      n.tryStart(ACTIONS.arrive, this);
    }
    town.leader = group[0] ? group[0].name : '';
    if (leader) leader.addTitle(this, `Vogt von ${town.name}`);
    this.log(`🏕️ ${town.leader} zieht mit ${group.length - 1} Siedlern los und gründet den Außenposten „${town.name}“!`, null, true);
    this.emit('system', `Neuer Außenposten: ${town.name}`);
  }

  /** Außenposten schicken jeden Morgen Abgaben in die Hauptstadt. */
  payTribute() {
    const cap = this.capital;
    for (const t of this.towns.slice(1)) {
      const wood = Math.max(0, Math.floor((t.stock.wood - 30) * 0.25)), food = Math.max(0, Math.floor((t.stock.food - 20) * 0.25));
      if (!wood && !food) continue;
      t.stock.wood -= wood; t.stock.food -= food; cap.stock.wood += wood; cap.stock.food += food;
      this.log(`💰 ${t.name} schickt Abgaben nach ${cap.name}: ${[wood && wood + ' Holz', food && food + ' Brot'].filter(Boolean).join(' und ')}.`, null, true);
    }
  }

  /** Arbeitern einen Beruf geben, damit die Mischung stimmt. */
  get monsterScale() { return 1 + Math.max(0, this.day - CONFIG.monsters.fromDay) * CONFIG.monsters.growthPerDay; }

  pickProfession() {
    const P = CONFIG.professions, counts = {};
    for (const n of this.npcs) counts[n.profession] = (counts[n.profession] || 0) + 1;
    let best = 'holzfaeller', gapBest = -Infinity;
    for (const k of ['holzfaeller', 'bauer', 'handwerker', 'steinmetz']) {
      const gap = P[k].share - (counts[k] || 0) / this.npcs.length;
      if (gap > gapBest) { gapBest = gap; best = k; }
    }
    return best;
  }

  /** Wachtürme schießen auf Monster in Reichweite. */
  updateTowers() {
    if (!this.monsters.length) return;
    const range = CONFIG.buildings.tower.range;
    for (const tw of this.towns) for (const b of tw.towers) {
      if ((b.cd = (b.cd || 0) - 1) > 0) continue;
      const L = b.level || 1;
      let best = null, bd = range + L - 1;
      for (const m of this.monsters) { const d = Math.hypot(m.x - b.tile.x, m.y - b.tile.y); if (d < bd) { bd = d; best = m; } }
      if (!best) continue;
      b.cd = 3;
      const dmg = Math.round(12 * (1 + this.day * 0.1) * (1 + 0.4 * (L - 1)));
      best.hp -= dmg; best.hitAt = performance.now();
      this.float(best.x, best.y - 0.3, `-${dmg}`, '#ffd166');
      this.emit('towerShot', { from: b.tile, to: best });
      if (best.hp <= 0) {
        const M = MONSTERS[best.kind];
        tw.stock.crystals += M.tier === 3 ? 2 : 1;
        this.log(`🏹 Ein Wachturm von ${tw.name} erlegt einen ${M.name}! (+💎)`, null, true);
        this.emit('monsterKilled', best);
      }
    }
  }

  /** Handel: Markttag, Karren zwischen den Orten, fahrender Händler. */
  updateTrade() {
    const cap = this.capital, market = cap.market, day = this.minutes % 1440;
    if (market && day === 12 * 60) { // Markttag: Überschuss wird verkauft
      const keepFood = cap.members.length * 3, sellFood = Math.max(0, Math.floor((cap.stock.food - keepFood) * 0.5)), sellWood = Math.max(0, Math.floor((cap.stock.wood - 100) * 0.3));
      const coins = Math.round((Math.floor(sellFood / 2) + Math.floor(sellWood / 4)) * (1 + 0.5 * ((market.level || 1) - 1)));
      if (coins > 0) {
        cap.stock.food -= sellFood; cap.stock.wood -= sellWood; cap.stock.coins += coins;
        cap.addTrade(`Markttag: ${sellFood} Brot und ${sellWood} Holz für ${coins} 🪙`);
        this.log(`🛍️ Markttag in ${cap.name}: Überschuss verkauft für ${coins} Münzen.`, null, true);
      }
    }
    if (market && this.towns.length > 1 && this.minutes % 240 === 0 && this.carts.filter(c => c.kind === 'cart').length < this.towns.length - 1) {
      const per = t => t.stock.food / Math.max(1, t.members.length);
      const rich = this.towns.reduce((a, b) => per(b) > per(a) ? b : a), poor = this.towns.reduce((a, b) => per(b) < per(a) ? b : a);
      if (rich !== poor && per(rich) - per(poor) > 1.5 && rich.stock.food > 20) {
        const food = Math.min(18, Math.floor((rich.stock.food - 20) / 2)), wood = rich.stock.wood > 60 && poor.stock.wood < 25 ? 12 : 0;
        if (food > 0 && this.sendCart('cart', rich, poor, { food, wood })) { rich.stock.food -= food; rich.stock.wood -= wood; }
      }
    }
    if (market && day === 10 * 60 && !this.carts.some(c => c.kind === 'merchant')) {
      const entry = this.findEntryTile(cap);
      if (entry) {
        const res = this.world.findAdjacent(entry.x, entry.y, t => t === market.tile, 8000);
        if (res) {
          this.carts.push({ id: ++this.cartId, kind: 'merchant', x: entry.x, y: entry.y, prevX: entry.x, prevY: entry.y, path: res.path, to: cap, state: 'go', facing: 1, phase: 0 });
          this.log('🐪 Ein fahrender Händler nähert sich mit seltenen Waren!', null, true);
        }
      }
    }
    for (const cart of this.carts) this.moveCart(cart);
    this.carts = this.carts.filter(c => !c.done);
  }

  sendCart(kind, from, to, cargo) {
    const res = this.world.findAdjacent(from.camp.x, from.camp.y + 1, t => t === to.campTile, 9000);
    if (!res) return false;
    const st = { x: from.camp.x, y: from.camp.y + 1 };
    this.carts.push({ id: ++this.cartId, kind, x: st.x, y: st.y, prevX: st.x, prevY: st.y, path: res.path, from, to, cargo, state: 'go', facing: 1, phase: 0 });
    this.log(`🐴 Ein Händlerkarren bricht von ${from.name} nach ${to.name} auf (${cargo.food} Brot${cargo.wood ? ', ' + cargo.wood + ' Holz' : ''}).`, null, true);
    return true;
  }

  moveCart(cart) {
    cart.prevX = cart.x; cart.prevY = cart.y;
    if (cart.wait > 0) { cart.wait--; return; }
    let budget = 0.22;
    while (budget > 0 && cart.path.length) {
      const nx = cart.path[0], dx = nx.x - cart.x, dy = nx.y - cart.y, d = Math.hypot(dx, dy);
      if (Math.abs(dx) > 0.01) cart.facing = dx > 0 ? 1 : -1;
      if (d <= budget) { cart.x = nx.x; cart.y = nx.y; budget -= d; cart.path.shift(); } else { cart.x += dx / d * budget; cart.y += dy / d * budget; budget = 0; }
      cart.phase += 0.22;
    }
    if (cart.path.length) return;
    if (cart.state === 'go') {
      if (cart.kind === 'cart') {
        cart.to.stock.food += cart.cargo.food; cart.to.stock.wood += cart.cargo.wood; this.capital.stock.coins += 2;
        cart.to.addTrade(`Karren aus ${cart.from.name}: +${cart.cargo.food} Brot${cart.cargo.wood ? ', +' + cart.cargo.wood + ' Holz' : ''}`);
        this.log(`🐴 Der Händlerkarren erreicht ${cart.to.name}: +${cart.cargo.food} Brot${cart.cargo.wood ? ', +' + cart.cargo.wood + ' Holz' : ''}.`, null, true);
        this.float(cart.x, cart.y, `+${cart.cargo.food} 🍞`, '#ffe08a');
        cart.cargo = { food: 0, wood: 0 };
        const back = this.world.findAdjacent(cart.x, cart.y, t => t === cart.from.campTile, 9000);
        cart.path = back ? back.path : []; cart.state = 'back'; cart.wait = 30;
        if (!back) cart.done = true;
      } else { // fahrender Händler am Markt
        const cap = this.capital, n = Math.min(4, Math.floor(cap.stock.coins / 25));
        if (n > 0) {
          cap.stock.coins -= n * 25; cap.stock.crystals += n;
          cap.addTrade(`Fahrender Händler: ${n} Mana-Kristall${n > 1 ? 'e' : ''} für ${n * 25} 🪙`);
          this.log(`🐪 Der fahrende Händler verkauft ${n} Mana-Kristall${n > 1 ? 'e' : ''} für ${n * 25} Münzen.`, null, true);
          this.emit('system', `Handel: +${n} Mana-Kristall${n > 1 ? 'e' : ''}`);
        } else this.log('🐪 Der fahrende Händler findet keine Kundschaft mit genug Münzen und zieht weiter.', null, true);
        const out = this.findEntryTile(cap), back = out && this.world.findAdjacent(cart.x, cart.y, t => t.x === out.x && t.y === out.y, 9000);
        cart.path = back ? back.path : []; cart.state = 'back'; cart.wait = 120;
        if (!back) cart.done = true;
      }
    } else cart.done = true;
  }

  updateMonsters() {
    const cfg = CONFIG.monsters, h = this.hourFloat;
    if (this.minutes % 1440 === 6 * 60 && this.monsters.length) {
      const boss = this.monsters.find(m => m.boss);
      if (boss) this.story.bossRetreat(boss);
      if (this.monsters.some(m => !m.boss)) this.log('☀️ Die Rissmonster zerfallen im Morgenlicht zu Asche.', null, true);
      this.monsters = [];
    }
    if (this.day >= cfg.fromDay && (h >= 22 || h < 4) && this.minutes % 60 === 0) {
      for (const g of this.world.gates) {
        const maxAlive = Math.min(16, cfg.maxAlive + Math.floor(this.day / 2));
        if (this.monsters.length >= maxAlive || this.rng() > cfg.spawnChance * g.gate.tier) continue;
        const kind = ['', 'rissling', 'schattenwolf', 'aschegolem'][g.gate.tier], M = MONSTERS[kind];
        const spot = this.world.bfs(g.x, g.y + 1, (x, y) => this.world.walkable(x, y), 60);
        if (!spot) continue;
        this.monsters.push({ id: ++this.monsterId, kind, x: spot.stand.x, y: spot.stand.y, prevX: spot.stand.x, prevY: spot.stand.y,
          hp: Math.round(M.hp * this.monsterScale), maxHp: Math.round(M.hp * this.monsterScale), path: [], repath: 0, facing: 1, cd: 0 });
        this.log(`👹 Aus dem ${g.gate.name} kriecht ein ${M.name}!`, null, true);
        this.emit('system', `Warnung: Ein ${M.name} nähert sich!`);
      }
    }
    for (const m of this.monsters) this.updateMonster(m);
    this.monsters = this.monsters.filter(m => m.hp > 0);
  }

  updateMonster(m) {
    const M = MONSTERS[m.kind];
    m.prevX = m.x; m.prevY = m.y;
    let target = null, bd = 9;
    for (const n of this.npcs) {
      if (n.inside) continue;
      const d = Math.hypot(n.x - m.x, n.y - m.y);
      if (d < bd) { bd = d; target = n; }
    }
    if (target && bd < 1.4) {
      if (Math.abs(target.x - m.x) > 0.1) m.facing = target.x > m.x ? 1 : -1;
      if (++m.cd >= 3) {
        m.cd = 0; m.attackAt = performance.now();
        const dmg = Math.max(1, Math.round(M.atk * this.monsterScale * (0.8 + this.rng() * 0.4) * (1 - target.defense / (target.defense + 60))));
        target.hp -= dmg;
        this.float(target.x, target.y - 0.4, `-${dmg}`, '#ff6b6b');
        this.emit('hit', target);
        if (target.hp <= 0) this.knockOut(target, m);
      }
      return;
    }
    if (--m.repath <= 0 || !m.path.length) {
      m.repath = 12;
      const c = this.towns.reduce((b, t) => Math.hypot(t.camp.x - m.x, t.camp.y - m.y) < Math.hypot(b.camp.x - m.x, b.camp.y - m.y) ? t : b).camp;
      const goal = target ? this.world.tile(Math.round(target.x), Math.round(target.y)) : this.world.tile(c.x, c.y);
      const res = this.world.findAdjacent(m.x, m.y, t => t === goal, 3000);
      m.path = res ? res.path : [];
    }
    let budget = M.speed;
    while (budget > 0 && m.path.length) {
      const nx = m.path[0], dx = nx.x - m.x, dy = nx.y - m.y, d = Math.hypot(dx, dy);
      if (Math.abs(dx) > 0.01) m.facing = dx > 0 ? 1 : -1;
      if (d <= budget) { m.x = nx.x; m.y = nx.y; budget -= d; m.path.shift(); }
      else { m.x += dx / d * budget; m.y += dy / d * budget; budget = 0; }
    }
  }

  knockOut(n, m) {
    if (n.task) n.endTask(this);
    const c = n.town.camp, spot = this.world.bfs(c.x, c.y + 1, (x, y) => this.world.walkable(x, y) ? true : null);
    if (spot) { n.x = n.prevX = spot.stand.x; n.y = n.prevY = spot.stand.y; }
    n.hp = Math.round(n.maxHp * 0.3); n.energy = Math.min(n.energy, 15); n.mood = Math.max(0, n.mood - 20);
    this.log(`💫 wurde von einem ${MONSTERS[m.kind].name} niedergestreckt und ans Lagerfeuer gebracht.`, n, true);
    n.remember(this, `Wurde von einem ${MONSTERS[m.kind].name} verwundet 💫`);
  }

  /** Zufälliges begehbares Randfeld mit Weg zum Lager. */
  findEntryTile(town = this.capital) {
    const { w, h } = this.world, c = town.camp;
    const edges = [];
    for (let x = 0; x < w; x++) edges.push([x, 0], [x, h - 1]);
    for (let y = 1; y < h - 1; y++) edges.push([0, y], [w - 1, y]);
    for (let i = edges.length - 1; i > 0; i--) { const j = Math.floor(this.rng() * (i + 1)); [edges[i], edges[j]] = [edges[j], edges[i]]; }
    for (const [x, y] of edges)
      if (this.world.walkable(x, y) && this.world.bfs(x, y, (px, py) => Math.abs(px - c.x) + Math.abs(py - c.y) === 1)) return { x, y };
    return null;
  }

  updateWeather() {
    const r = this.rng(), w = this.weather;
    let next = w;
    if (w === 'klar' && r < 0.1) next = 'bewölkt';
    else if (w === 'bewölkt') next = r < 0.22 ? 'regen' : r < 0.5 ? 'klar' : w;
    else if (w === 'regen' && r < 0.35) next = 'bewölkt';
    if (next !== w) { this.weather = next; this.log(WEATHER_TEXT[next], null, true); }
  }

  on(evt, fn) { (this.listeners[evt] ||= []).push(fn); }
  emit(evt, data) { (this.listeners[evt] || []).forEach(fn => fn(data, this)); }

  float(x, y, text, color = '#fff') {
    if (this.floats.length < 40) this.floats.push({ x, y, text, color, born: performance.now() });
  }

  log(text, npc = null, event = false) {
    const entry = { day: this.day, clock: this.clock, text, npc, event };
    this.logEntries.unshift(entry);
    if (this.logEntries.length > CONFIG.logSize) this.logEntries.pop();
    this.emit('log', entry);
  }

  /** Eine Spielminute. */
  step() {
    this.minutes++;
    if (this.minutes % 1440 === 0) this.log(`🌅 Tag ${this.day} beginnt.`, null, true);
    if (this.minutes % 60 === 0) this.updateWeather();
    if (this.minutes % 360 === 180) for (const tw of this.towns) { // freie Betten locken Neue an, wenn alle satt sind
      const people = tw.members, free = tw.houses.reduce((a, h) => a + h.beds - h.residents.length, 0);
      if (free > 0 && this.npcs.length < CONFIG.population.max && people.reduce((a, n) => a + n.hunger, 0) / Math.max(1, people.length) <= 50) this.spawnNewcomer(tw);
    }
    if (this.minutes % 1440 === 360) for (const n of this.npcs) if (n.awakened) { n.newQuest(this); n.thought = `Neue tägliche Aufgabe: ${n.quest.text}.`; }
    const aw = CONFIG.awakening;
    if (!this.firstAwakening && this.day >= aw.firstDay && this.minutes % 1440 === aw.firstHour * 60) {
      const cand = this.npcs.filter(n => !n.awakened).sort((a, b) => b.mood - a.mood)[0];
      if (cand) {
        this.firstAwakening = true;
        this.log('🌠 Ein blauer Lichtstrahl fällt vom Himmel …', null, true);
        cand.awaken(this, 'wird vom Licht getroffen und erwacht! Ab jetzt sieht diese Person die Welt mit anderen Augen.');
      }
    }
    this.world.update(this);
    for (const t of this.towns) t.update(this);
    if (this.minutes % 60 === 0) this.updateKingdom();
    if (this.minutes % 1440 === 7 * 60) this.payTribute();
    if (this.minutes % 1440 === 8 * 60) this.handOutGear();
    for (const npc of this.npcs) npc.update(this);
    this.story.update();
    this.updateMonsters();
    this.updateTowers();
    this.updateTrade();
    if (!this.guild && this.minutes % 60 === 0) {
      const aw = this.npcs.filter(n => n.awakened).sort((a, b) => b.level - a.level);
      if (aw.length >= 2) {
        this.guild = { name: pick(this, ['Gilde der Ersten Flamme', 'Orden des Morgenrots', 'Bund der Sternenfunken', 'Wacht am Riss']), founded: this.day, leader: aw[0].name };
        this.log(`🛡️ ${aw.map(n => n.name).join(', ')} gründen die „${this.guild.name}“! Anführung: ${aw[0].name}.`, null, true);
        this.emit('system', `Gilde gegründet: ${this.guild.name}`);
      }
    }
  }

  // --- Speichern / Laden ---------------------------------------------
  serialize() {
    const st = this.settlement;
    return {
      v: SAVE_VERSION, types: TILE_TYPES, kingdom: this.kingdom, towns: this.towns.map(t => ({ name: t.name, capital: t.capital, color: t.color, leader: t.leader, founded: t.founded, x: t.camp.x, y: t.camp.y, stock: t.stock, items: t.items || [],
        site: t.site && { type: t.site.type, x: t.site.tile.x, y: t.site.tile.y, progress: t.site.progress, work: t.site.work, upgrade: t.site.upgrade ? t.site.upgrade.id : null } })),
      story: this.story.serialize(), guild: this.guild, tomeFound: this.tomeFound, ruinsSearched: this.ruinsSearched,
      searched: this.world.tiles.filter(t => t.searched).map(t => t.y * this.world.w + t.x),
      seed: this.seed, minutes: this.minutes, weather: this.weather, firstAwakening: this.firstAwakening,
      gates: this.world.gates.map(g => [g.gate.cleared, g.gate.failed]),
      tiles: this.world.tiles.map(t => [TILE_TYPES.indexOf(t.type), t.wood, t.berries, t.timer, t.traffic]),
      stock: st.stock,
      buildings: this.towns.flatMap((t, ti) => t.buildings.map(b => ({ town: ti, id: b.id, level: b.level || 1, type: b.type, x: b.tile.x, y: b.tile.y, builtDay: b.builtDay, builtClock: b.builtClock, builders: b.builders }))),
      site: st.site && { type: st.site.type, x: st.site.tile.x, y: st.site.tile.y, progress: st.site.progress, work: st.site.work },
      npcs: this.npcs.map(n => ({
        id: n.id, name: n.name, color: n.color, x: Math.round(n.x), y: Math.round(n.y),
        hunger: n.hunger, energy: n.energy, inventory: n.inventory, skills: n.skills, traits: n.traits,
        mood: n.mood, social: n.social, relations: n.relations, memories: n.memories,
        home: n.home ? n.home.id : null, profession: n.profession, facing: n.facing, arrivedAt: n.arrivedAt,
        awakened: n.awakened, level: n.level, xp: n.xp, stats: n.stats, cls: n.cls, unlocked: n.unlocked, titles: n.titles,
        quest: n.quest, questsDone: n.questsDone, lastGate: n.lastGate, gatesCleared: n.gatesCleared, housesBuilt: n.housesBuilt,
        town: n.town.id, hp: n.hp, gear: n.gear, kills: n.kills, forged: n.forged, lastRuin: n.lastRuin, loyalTo: n.loyalTo,
        ambition: n.ambition || null, diary: n.diary || [], snap: n.snap || null, pet: n.pet || null, lastTame: n.lastTame ?? null,
      })),
      log: this.logEntries.slice(0, 30).map(e => ({ day: e.day, clock: e.clock, text: e.text, event: e.event, npc: e.npc ? e.npc.id : null })),
    };
  }

  applySave(d) {
    const w = this.world, st = this.settlement;
    this.minutes = d.minutes;
    this.weather = d.weather || 'klar';
    this.rng = mulberry32((this.seed ^ d.minutes) >>> 0);
    // Welche Typenliste gehört zu diesem Spielstand? Neue Stände bringen sie mit; bei alten erkennen wir sie
    // daran, dass Risse und Furten (aus der Welt-Nummer bekannt) richtig herauskommen müssen.
    let types = d.types;
    if (!types) {
      const cands = OLD_TYPE_LISTS[d.v] || [TILE_TYPES], fords = w.tiles.filter(t => t.type === 'ford');
      const score = list => w.gates.filter(g => list[d.tiles[g.y * w.w + g.x][0]] === 'gate').length * 10
        + fords.filter(t => list[d.tiles[t.y * w.w + t.x][0]] === 'ford').length;
      types = cands.reduce((b, l) => (score(l) >= score(b) ? l : b), cands[0]);
    }
    if (!d.towns) d.towns = [{ name: 'Erstes Lager', capital: true, x: w.camp.x, y: w.camp.y, stock: d.stock || {}, site: d.site || null }]; // vor dem Königreich
    d.tiles.forEach((a, i) => {
      const t = w.tiles[i];
      t.type = types[a[0]] || 'grass'; t.wood = a[1]; t.berries = a[2]; t.timer = a[3]; t.traffic = a[4] || 0; t.building = null;
    });
    this.kingdom = d.kingdom || null;
    this.towns = (d.towns || []).map((t, i) => {
      const tw = i === 0 ? st : new Settlement(this, { x: t.x, y: t.y }, { id: i });
      Object.assign(tw, { name: t.name, capital: t.capital, color: t.color, leader: t.leader, founded: t.founded });
      tw.stock = { ...tw.stock, ...t.stock }; tw.items = t.items || [];
      if (t.site) {
        const tile = w.tile(t.site.x, t.site.y);
        tw.site = { type: t.site.type, tile, progress: t.site.progress, work: t.site.work, town: tw, upgradeId: t.site.upgrade ?? null };
        tw.site.tiles = t.site.type === 'castle' ? tw.footprint(tile) : [tile];
        for (const x of tw.site.tiles) x.siteRef = tw.site;
      }
      return tw;
    });
    if (!this.towns.length) this.towns = [st];
    for (const b of d.buildings) {
      const town = this.towns[b.town || 0], tile = w.tile(b.x, b.y), def = CONFIG.buildings[b.type];
      const bb = { id: b.id, level: b.level || 1, type: b.type, tile, beds: (def.beds || 0) + (b.type === 'house' ? (b.level || 1) - 1 : 0), sleepers: new Set(), residents: [], builtDay: b.builtDay, builtClock: b.builtClock, builders: b.builders || [] };
      bb.town = town; tile.building = bb; town.buildings.push(bb);
      if (b.type === 'castle') for (const t of town.footprint(tile)) if (t !== tile) t.part = tile;
    }
    for (const s of d.npcs) {
      const spot = w.bfs(s.x, s.y, (x, y) => w.walkable(x, y));
      const pos = spot ? spot.stand : { x: s.x, y: s.y };
      const n = new NPC(s.id, { name: s.name, color: s.color, traits: s.traits }, pos.x, pos.y, this.rng);
      n.town = this.towns[s.town || 0] || st;
      Object.assign(n, {
        hunger: s.hunger, energy: s.energy, inventory: s.inventory || { wood: 0 }, skills: s.skills || {},
        mood: s.mood ?? 70, social: s.social ?? 70, relations: s.relations || {}, memories: s.memories || [],
        profession: s.profession || 'settler', facing: s.facing || 1, arrivedAt: s.arrivedAt || 0,
        awakened: !!s.awakened, level: s.level || 0, xp: s.xp || 0, stats: s.stats || null, cls: s.cls || null, unlocked: s.unlocked || [],
        titles: s.titles || [], quest: s.quest || null, questsDone: s.questsDone || 0, lastGate: s.lastGate ?? -1e9,
        gatesCleared: s.gatesCleared || 0, housesBuilt: s.housesBuilt || 0, sim: this,
        hp: s.hp ?? 100, gear: s.gear || {}, kills: s.kills || 0, forged: s.forged || 0, lastRuin: s.lastRuin ?? -1e9, loyalTo: s.loyalTo ?? null,
        diary: s.diary || [], snap: s.snap || null, pet: s.pet || null, lastTame: s.lastTame ?? -1e9,
      });
      n.ambition = s.ambition || (n.awakened ? pickAmbition(n, this.rng) : null); // alte Stände: Lebensziel nachtragen
      if (s.home != null) { const h = n.town.buildings.find(b => b.id === s.home); if (h) this.moveIn(n, h, true); }
      this.npcs.push(n);
    }
    for (const tw of this.towns) if (tw.site && tw.site.upgradeId != null) { // laufender Ausbau
      tw.site.upgrade = tw.buildings.find(b => b.id === tw.site.upgradeId);
      if (!tw.site.upgrade) { tw.site.tile.siteRef = null; tw.site = null; }
    }
    this.logEntries = (d.log || []).map(e => ({ ...e, npc: this.npcs.find(n => n.id === e.npc) || null }));
    this.guild = d.guild || null; this.tomeFound = !!d.tomeFound; this.ruinsSearched = d.ruinsSearched || 0;
    (d.searched || []).forEach(i => { if (w.tiles[i]) w.tiles[i].searched = true; });
    for (const t of this.towns) t.recount();
    (d.gates || []).forEach((g, i) => { if (w.gates[i]) { w.gates[i].gate.cleared = g[0]; w.gates[i].gate.failed = g[1]; } });
    w.dirty = true;
  }
}

