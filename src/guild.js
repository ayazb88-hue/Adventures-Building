
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
  const gate = sim.world.gates.filter(g => !g.gate.red).sort((a, b) => b.gate.tier - a.gate.tier)[0];
  if (!gate) return;
  sim.expedition = { gate: sim.world.gates.indexOf(gate), members: party.map(n => n.id), start: sim.minutes, done: false, boss: raidBoss(gate) };
  for (const n of party) { const steps = ACTIONS.groupRaid.plan(n, sim); if (steps) { if (n.task) n.endTask(sim); n.startTask(ACTIONS.groupRaid, steps, sim); } }
  sim.log(`⚔️ Die „${sim.guild.name}“ bricht gemeinsam auf: ${party.map(n => n.name).join(', ')} wagen sich in den Riss „${gate.gate.name}“. Dort haust der Riss-Boss „${sim.expedition.boss}“.`, null, true);
  sim.emit('system', `GRUPPEN-EXPEDITION: ${gate.gate.name}`);
  sim.emit('groupRaid', { phase: 'start', party, gate: gate.gate, boss: sim.expedition.boss });
}

function finishGroupRaid(sim) {
  const ex = sim.expedition; if (!ex || ex.done) return;
  ex.done = true;
  const gate = sim.world.gates[ex.gate], tier = gate.gate.tier, party = ex.members.map(id => sim.npcs.find(n => n.id === id)).filter(Boolean);
  const power = party.reduce((a, n) => a + n.level + n.attack * 0.3, 0), boss = 45 + tier * 18 + sim.day * 2.5;
  const win = sim.rng() < clamp(0.35 + (power - boss) / 80, 0.15, 0.92);
  if (win) {
    const crystals = 6 + tier * 4, xp = 120 * tier;
    sim.capital.stock.crystals += crystals; sim.raidWins = (sim.raidWins || 0) + 1;
    for (const n of party) { n.addXp(sim, xp); n.gatesCleared++; n.mood = Math.min(100, n.mood + 25); n.remember(sim, `Hat mit der Gilde „${ex.boss}“ besiegt ⚔️`); n.addTitle(sim, 'Bezwinger der Tiefe'); }
    const roll = sim.rng(), rar = roll < 0.05 ? 4 : roll < 0.4 ? 3 : 2, best = party[0], slot = pick(sim, SLOTS), item = makeItem(slot, rar, best, { name: 'Beute aus dem Riss', level: best.level + 3 }, sim);
    if (!best.gear[slot] || item.power > best.gear[slot].power) { if (best.gear[slot]) sim.capital.storeItem(best.gear[slot]); best.gear[slot] = item; } else sim.capital.storeItem(item);
    if (sim.guild) guildXp(sim, 200);
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
