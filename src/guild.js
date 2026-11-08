
/* =====================================================================
 * 16) ERFOLGE und GRUPPEN-EXPEDITIONEN DER GILDE
 * ===================================================================== */
const ACHIEVEMENTS = [
  { id: 'dach', icon: '🏠', name: 'Das erste Dach', desc: 'Das erste Haus steht.', check: s => s.allHouses.some(b => b.type === 'house') },
  { id: 'stadt', icon: '🏘️', name: 'Kleine Stadt', desc: '10 Häuser in einem Ort.', check: s => s.towns.some(t => t.houses.length >= 10) },
  { id: 'metropole', icon: '🌆', name: 'Metropole', desc: '40 Häuser im ganzen Reich.', check: s => s.allHouses.filter(b => b.type === 'house').length >= 40 },
  { id: 'volk', icon: '👥', name: 'Ein ganzes Volk', desc: '50 Siedler.', check: s => s.npcs.length >= 50 },
  { id: 'licht', icon: '✨', name: 'Das Licht', desc: 'Jemand ist erwacht.', check: s => s.npcs.some(n => n.awakened) },
  { id: 'lv10', icon: '⬆️', name: 'Zweistellig', desc: 'Jemand erreicht Level 10.', check: s => s.npcs.some(n => n.level >= 10) },
  { id: 'lv20', icon: '🌟', name: 'Aufsteigender Stern', desc: 'Jemand erreicht Level 20.', check: s => s.npcs.some(n => n.level >= 20) },
  { id: 'legende', icon: '🟡', name: 'Legendär', desc: 'Ein legendärer Gegenstand wurde geschmiedet.', check: s => s.npcs.some(n => Object.values(n.gear).some(i => i && i.rarity >= 3)) },
  { id: 'mythisch', icon: '🔴', name: 'Mythisch', desc: 'Ein mythischer Gegenstand existiert.', check: s => s.npcs.some(n => Object.values(n.gear).some(i => i && i.rarity >= 4)) },
  { id: 'plus10', icon: '💠', name: 'Perfekt verstärkt', desc: 'Ein Gegenstand +10.', check: s => s.npcs.some(n => Object.values(n.gear).some(i => i && i.plus >= 10)) },
  { id: 'gilde', icon: '🛡️', name: 'Niemand kämpft allein', desc: 'Eine Gilde wurde gegründet.', check: s => !!s.guild },
  { id: 'gilde5', icon: '🏅', name: 'Berühmte Gilde', desc: 'Gilden-Stufe 5.', check: s => s.guild && (s.guild.level || 1) >= 5 },
  { id: 'krone', icon: '👑', name: 'Eine Krone', desc: 'Das Königreich wurde ausgerufen.', check: s => !!s.kingdom },
  { id: 'burg', icon: '🏰', name: 'Die Burg', desc: 'Die Burg der Hauptstadt steht.', check: s => !!s.capital.castle },
  { id: 'mauer', icon: '🧱', name: 'Hinter Mauern', desc: 'Die Stadtmauer ist vollendet.', check: s => s.realm && s.realm.wallDone },
  { id: 'kronenfresser', icon: '👹', name: 'Kronenbrecher', desc: 'Der Kronenfresser ist besiegt.', check: s => s.story.bossDead },
  { id: 'hauptmann', icon: '🗡️', name: 'Schluss mit den Rotschals', desc: 'Der Bandenhauptmann ist gefallen.', check: s => (s.story.captainKills || 0) > 0 },
  { id: 'belagerung', icon: '🏆', name: 'Standhaft', desc: 'Eine Belagerung abgewehrt.', check: s => s.realm && s.realm.siegeWins > 0 },
  { id: 'vasall', icon: '🙇', name: 'Gebeugte Krone', desc: 'Das Nachbarreich ist Vasall.', check: s => s.realm && s.realm.rival && s.realm.rival.state === 'vassal' },
  { id: 'buendnis', icon: '🤝', name: 'Freunde über die Wälder', desc: 'Bündnis mit dem Nachbarreich.', check: s => s.realm && s.realm.rival && s.realm.rival.state === 'allied' },
  { id: 'drache', icon: '🐉', name: 'Drachenfreund', desc: 'Ein Mini-Drache wurde gezähmt.', check: s => s.npcs.some(n => n.pet && n.pet.kind === 'drache') },
  { id: 'risse', icon: '🌀', name: 'Rissgänger', desc: '10 Risse bezwungen.', check: s => s.npcs.reduce((a, n) => a + (n.gatesCleared || 0), 0) >= 10 },
  { id: 'gruppe', icon: '⚔️', name: 'Gemeinsam in die Tiefe', desc: 'Eine Gruppen-Expedition der Gilde war erfolgreich.', check: s => (s.raidWins || 0) > 0 },
  { id: 'reich', icon: '💰', name: 'Volle Schatzkammer', desc: '500 Münzen in der Hauptstadt.', check: s => s.capital.stock.coins >= 500 },
  { id: 'srang', icon: '🟨', name: 'Jenseits des Rangs', desc: 'Ein S-Rang-Riss wurde bezwungen.', check: s => (s.sriftWins || 0) > 0 },
  { id: 'duell', icon: '🤺', name: 'Underdog', desc: 'Die Hauptfigur gewinnt ein Duell gegen den Rivalen.', check: s => s.story.duel && s.story.duel.heroWins > 0 },
];
function checkAchievements(sim) {
  sim.achievements ||= [];
  for (const a of ACHIEVEMENTS) {
    if (sim.achievements.includes(a.id)) continue;
    let ok = false; try { ok = a.check(sim); } catch (e) { ok = false; }
    if (!ok) continue;
    sim.achievements.push(a.id);
    sim.log(`🏆 Erfolg freigeschaltet: ${a.icon} ${a.name}`, null, true);
    sim.emit('system', `🏆 ERFOLG: ${a.name}`);
    sim.emit('achievement', a);
  }
}

/* ---- Gruppen-Expedition: die Gilde zieht gemeinsam in den stärksten Riss ---- */
const RAID_BOSSES = ['Smaragdkoloss', 'Glutwurm', 'Sternenschlund', 'Nebelhirte', 'Aschenwächter'];
const raidBoss = gate => RAID_BOSSES[gate.gate.name.length % RAID_BOSSES.length];

function startGroupRaid(sim) {
  if (!sim.guild || sim.expedition || sim.isNight || sim.monsters.length) return;
  const party = sim.npcs.filter(n => n.awakened && n.level >= 8 && !n.inside && n.hp > n.maxHp * 0.6 && n.energy > 40).sort((a, b) => b.level - a.level).slice(0, 4);
  if (party.length < 3) return;
  const sr = sim.srift && !sim.srift.broken ? sim.srift : null;
  const gate = sr ? sim.world.gates[sr.gate] : sim.world.gates.filter(g => !g.gate.red && !isSRift(sim, g)).sort((a, b) => b.gate.tier - a.gate.tier)[0];
  if (!gate) return;
  sim.expedition = { gate: sim.world.gates.indexOf(gate), members: party.map(n => n.id), start: sim.minutes, done: false, boss: sr ? RIFT_BOSSES[sr.kind].name : raidBoss(gate), s: !!sr };
  for (const n of party) { const steps = ACTIONS.groupRaid.plan(n, sim); if (steps) { if (n.task) n.endTask(sim); n.startTask(ACTIONS.groupRaid, steps, sim); } }
  sim.lastRaidDay = sim.day;
  sim.log(`⚔️ Die „${sim.guild.name}“ bricht gemeinsam auf: ${party.map(n => n.name).join(', ')} wagen sich in den Riss „${gate.gate.name}“. Dort haust der Riss-Boss „${sim.expedition.boss}“.`, null, true);
  sim.emit('system', `GRUPPEN-EXPEDITION: ${gate.gate.name}`);
  sim.emit('groupRaid', { phase: 'start', party, gate: gate.gate, boss: sim.expedition.boss });
}

function finishGroupRaid(sim) {
  const ex = sim.expedition; if (!ex || ex.done) return;
  ex.done = true;
  const gate = sim.world.gates[ex.gate], tier = ex.s ? 4 : gate.gate.tier, party = ex.members.map(id => sim.npcs.find(n => n.id === id)).filter(Boolean);
  const power = party.reduce((a, n) => a + n.level + n.attack * 0.3, 0), boss = 45 + tier * 18 + sim.day * 2.5;
  const win = sim.rng() < clamp(0.35 + (power - boss) / 80, 0.15, 0.92);
  if (win) {
    const crystals = 6 + tier * 4, xp = 120 * tier;
    sim.capital.stock.crystals += crystals; sim.raidWins = (sim.raidWins || 0) + 1;
    for (const n of party) { n.addXp(sim, xp); n.gatesCleared++; n.mood = Math.min(100, n.mood + 25); n.remember(sim, `Hat mit der Gilde „${ex.boss}“ besiegt ⚔️`); n.addTitle(sim, 'Bezwinger der Tiefe'); }
    const roll = sim.rng(), rar = roll < 0.05 ? 4 : roll < 0.4 ? 3 : 2, best = party[0], slot = pick(sim, SLOTS), item = makeItem(slot, rar, best, { name: 'Beute aus dem Riss', level: best.level + 3 }, sim);
    if (!best.gear[slot] || item.power > best.gear[slot].power) { if (best.gear[slot]) sim.capital.storeItem(best.gear[slot]); best.gear[slot] = item; } else sim.capital.storeItem(item);
    if (sim.guild) guildXp(sim, ex.s ? 500 : 200);
    if (ex.s && sim.srift && sim.srift.gate === ex.gate) sriftCleared(sim, party[0], 'raid');
    sim.log(`🏆 Die Gilde besiegt den Riss-Boss „${ex.boss}“! +${crystals} 💎, je +${xp} EP – und ${best.name} erbeutet ${item.name} (${RARITIES[rar].name})!`, null, true);
    sim.emit('system', `RISS-BOSS BESIEGT: ${ex.boss}`);
    if (rar >= 3) sim.emit('legendary', { n: best, item });
    sim.emit('groupRaid', { phase: 'win', party, gate: gate.gate, boss: ex.boss, item, crystals });
  } else {
    for (const n of party) { n.hp = Math.round(n.maxHp * 0.2); n.energy = 10; n.mood = Math.max(0, n.mood - 25); n.addXp(sim, 30 * tier); n.remember(sim, `Musste vor „${ex.boss}“ fliehen 🩸`); }
    sim.log(`🩸 „${ex.boss}“ war zu stark. Die Gilde flieht verwundet aus dem Riss „${gate.gate.name}“.`, null, true);
    sim.emit('system', 'Die Gruppen-Expedition ist gescheitert …');
    sim.emit('groupRaid', { phase: 'lose', party, gate: gate.gate, boss: ex.boss });
  }
  sim.lastRaidDay = sim.day;
}

defineAction({
  id: 'groupRaid', label: 'ist auf Gruppen-Expedition', short: 'Gilde', start: 'zieht mit der Gilde los', icon: '⚔️',
  interruptible: false,
  score: () => 0, // startet nur über die Gilde
  think: (n, sim) => sim.expedition ? `Heute stellen wir uns „${sim.expedition.boss}“. Zusammen.` : 'Auf zur Expedition!',
  describe: (n, sim) => sim.expedition ? `zieht mit der Gilde zum Riss „${sim.world.gates[sim.expedition.gate].gate.name}“` : 'zieht mit der Gilde los',
  plan(n, sim) {
    const ex = sim.expedition; if (!ex) return null;
    const gate = sim.world.gates[ex.gate], res = sim.world.findAdjacent(n.x, n.y, t => t === gate, 9000);
    if (!res) return null;
    return [move(res.path), act((n, sim, s) => {
      const ex = sim.expedition;
      if (!ex || ex.done) return 'done';
      if (s.t === 1) { n.inside = { tile: gate, gate: true, group: true }; n.lastGate = sim.minutes; }
      n.energy = Math.max(0, n.energy - 0.08);
      if (s.t < 240) return;
      finishGroupRaid(sim);
      return 'done';
    }, { face: gate })];
  },
  onEnd(n, sim) { if (n.inside && n.inside.group) n.inside = null; if (sim.expedition && sim.expedition.done && !sim.npcs.some(o => o.task && o.task.actionId === 'groupRaid' && o !== n)) sim.expedition = null; },
});

/* =====================================================================
 * S-RANG-RISSE: Ein Riss erwacht zum S-Rang. Nur die Gilde gemeinsam darf hinein.
 * Wird er nicht binnen 3 Tagen bezwungen, bricht der Riss-Boss heraus (Ausbruch).
 * ===================================================================== */
const RIFT_BOSSES = {
  smaragdkoloss:  { name: 'Smaragdkoloss', hp: 700, atk: 12, speed: 0.1, tier: 4, xp: 420, title: 'Riese aus grünem Kristall', lore: 'Jeder Schritt lässt den Boden klingen wie eine Glocke.' },
  glutwurm:       { name: 'Glutwurm', hp: 560, atk: 15, speed: 0.15, tier: 4, xp: 420, title: 'Wurm aus flüssigem Feuer', lore: 'Wo er kriecht, bleibt schwarzes Glas zurück.' },
  nebelhirte:     { name: 'Nebelhirte', hp: 520, atk: 13, speed: 0.17, tier: 4, xp: 420, title: 'Hüter der verlorenen Seelen', lore: 'Seine Laterne ruft. Wer ihr folgt, kehrt nie zurück.' },
  sternenschlund: { name: 'Sternenschlund', hp: 620, atk: 14, speed: 0.12, tier: 4, xp: 420, title: 'Ein Maul voller fremder Sterne', lore: 'Es sieht dich an – mit einem Auge, das größer ist als ein Haus.' },
};
Object.assign(MONSTERS, RIFT_BOSSES);
const bossKindOf = name => Object.keys(RIFT_BOSSES).find(k => RIFT_BOSSES[k].name === name) || null;
const isSRift = (sim, t) => !!(sim.srift && sim.world.gates[sim.srift.gate] === t);

function sriftTick(sim) {
  const m = sim.minutes % 1440;
  // Erwachen: ab Tag 9 mit Gilde, abends um 21 Uhr
  if (!sim.srift && sim.guild && sim.day >= (sim.nextSRift || 9) && m === 21 * 60 && sim.rng() < 0.5) {
    const cand = sim.world.gates.map((g, i) => i).filter(i => !sim.world.gates[i].gate.red);
    if (!cand.length) return;
    const gi = pick(sim, cand), kind = pick(sim, Object.keys(RIFT_BOSSES)), g = sim.world.gates[gi];
    sim.srift = { gate: gi, kind, since: sim.day, breakAt: sim.minutes + 3 * 1440, broken: false, hp: 0 };
    sim.log(`🟨 Der Riss „${g.gate.name}“ bebt und färbt sich gold-schwarz: Er ist zum S-RANG erwacht! Darin wartet „${RIFT_BOSSES[kind].name}“. Nur die Gilde gemeinsam kann ihn bezwingen – sonst bricht er in 3 Tagen aus.`, null, true);
    sim.emit('system', `WARNUNG: S-RANG-RISS „${g.gate.name}“`);
    sim.emit('srift', { phase: 'open', gate: g.gate, kind, name: RIFT_BOSSES[kind].name });
    return;
  }
  const sr = sim.srift; if (!sr) return;
  const g = sim.world.gates[sr.gate]; if (!g) { sim.srift = null; return; }
  if (!sr.broken && sim.minutes >= sr.breakAt && !(sim.expedition && sim.expedition.gate === sr.gate)) {
    sr.broken = true; spawnRiftBoss(sim);
    sim.log(`💥 AUSBRUCH! „${RIFT_BOSSES[sr.kind].name}“ bricht aus dem Riss „${g.gate.name}“ hervor und zieht auf die Siedlung zu!`, null, true);
    sim.emit('system', `AUSBRUCH: ${RIFT_BOSSES[sr.kind].name}`);
    sim.emit('srift', { phase: 'break', gate: g.gate, kind: sr.kind, name: RIFT_BOSSES[sr.kind].name });
  }
  if (sr.broken) {
    const b = sim.monsters.find(x => x.riftBoss);
    if (b) sr.hp = b.hp; else if (sim.minutes % 60 === 30) spawnRiftBoss(sim); // nach dem Laden zurückholen
  }
}

function spawnRiftBoss(sim) {
  const sr = sim.srift, g = sim.world.gates[sr.gate], M = RIFT_BOSSES[sr.kind];
  const spot = sim.world.bfs(g.x, g.y + 1, (x, y) => sim.world.walkable(x, y), 80); if (!spot) return;
  const aw = sim.npcs.filter(n => n.awakened), maxHp = Math.round(M.hp * sim.monsterScale * 0.6 + aw.reduce((a, n) => a + n.level * 18, 0));
  const hp = sr.hp > 0 ? Math.min(sr.hp, maxHp) : maxHp;
  sim.monsters.push({ id: ++sim.monsterId, kind: sr.kind, riftBoss: true, x: spot.stand.x, y: spot.stand.y, prevX: spot.stand.x, prevY: spot.stand.y, hp, maxHp, path: [], repath: 0, facing: 1, cd: 0 });
  sr.hp = hp;
}

/** S-Rang bezwungen (in der Expedition oder nach dem Ausbruch). */
function sriftCleared(sim, hero, how) {
  const sr = sim.srift; if (!sr) return;
  const g = sim.world.gates[sr.gate], name = RIFT_BOSSES[sr.kind].name;
  sim.srift = null; sim.sriftWins = (sim.sriftWins || 0) + 1; sim.nextSRift = sim.day + 4;
  sim.capital.stock.crystals += 20;
  if (hero) {
    const rar = sim.rng() < 0.3 ? 4 : 3, slot = pick(sim, SLOTS), item = makeItem(slot, rar, hero, { name: `Herz des ${name}`, level: hero.level + 5 }, sim);
    if (!hero.gear[slot] || item.power > hero.gear[slot].power) { if (hero.gear[slot]) sim.capital.storeItem(hero.gear[slot]); hero.gear[slot] = item; } else sim.capital.storeItem(item);
    hero.addTitle(sim, 'S-Rang-Bezwinger'); hero.remember(sim, `Hat „${name}“ bezwungen 🟨`);
    sim.log(`🟨 S-RANG BEZWUNGEN! ${hero.name} erhält „${item.name}“ (${RARITIES[rar].name}) – und die Schatzkammer +20 💎.`, hero, true);
    sim.emit('legendary', { n: hero, item });
  }
  if (g) g.gate.cleared++;
  sim.emit('system', `S-RANG-RISS GESCHLOSSEN · ${name}`);
  sim.emit('srift', { phase: 'cleared', gate: g && g.gate, kind: sr.kind, name, hero, how });
}
