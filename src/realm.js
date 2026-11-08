
/* =====================================================================
 * 15) NACHBARREICH, DIPLOMATIE, BELAGERUNG, STADTMAUER
 *     Ein rivalisierendes Königreich am Kartenrand. Gesandte bringen
 *     Entscheidungen (die Spielerin/der Spieler darf wählen, sonst
 *     entscheidet die Regentschaft), daraus folgen Bündnis oder Krieg.
 * ===================================================================== */
const RIVAL_REALMS = [
  { name: 'Dornwacht', ruler: 'Herrschaft Vaelor', color: '#7a1e3a', temper: -7, mood: 'angriffslustig' },
  { name: 'Grauhafen', ruler: 'Herrschaft Isveth', color: '#3a4a7a', temper: 1, mood: 'freundlich' },
  { name: 'Aschenthal', ruler: 'Herrschaft Korrin', color: '#6a3a1a', temper: -3, mood: 'gierig' },
];
const DIPLO_OPTIONS = {
  buendnis: { label: '🤝 Bündnis anbieten', cost: { coins: 20 }, rel: 25, text: 'bietet ein Bündnis an' },
  geschenk: { label: '🎁 Geschenke senden', cost: { coins: 12, crystals: 1 }, rel: 14, text: 'schickt Geschenke' },
  tribut:   { label: '⚔️ Tribut fordern', cost: {}, rel: -30, text: 'fordert Tribut' },
  ablehnen: { label: '🙅 Ablehnen', cost: {}, rel: -6, text: 'schickt den Gesandten fort' },
};

class Realm {
  constructor(sim, data) {
    this.sim = sim;
    Object.assign(this, { rival: null, wall: null, sieges: 0, siegeWins: 0 }, data || {});
    if (this.rival) this.markFeste();
  }
  serialize() { const { sim, ...d } = this; return JSON.parse(JSON.stringify(d)); }

  get strength() { // eigene Stärke: Erwachte, Türme, Mauer
    const sim = this.sim, aw = sim.npcs.filter(n => n.awakened).reduce((a, n) => a + n.level, 0);
    return aw + sim.capital.towers.length * 4 + (this.wallDone ? 15 : 0);
  }
  get rivalStrength() { return 25 + this.sim.day * 2.2 + (this.rival ? this.rival.losses * -8 : 0); }
  get wallDone() { return !!(this.wall && this.wall.progress >= 1); }

  update() {
    const sim = this.sim, m = sim.minutes % 1440;
    if (!this.rival && sim.kingdom && sim.day >= sim.kingdom.founded + 1 && m === 9 * 60) this.foundRival();
    if (m === 9 * 60 + 30) this.growWall();
    const r = this.rival; if (!r) return;
    if (r.pending && sim.minutes >= r.pending.until) this.choose(this.regentChoice(), true); // keine Wahl → Regentschaft entscheidet
    if (m === 10 * 60 && !r.pending) this.dailyDiplomacy();
    if (r.state === 'war' && sim.day >= r.nextSiege && m === 9 * 60 && !sim.monsters.some(x => x.army)) this.startSiege();
    if (sim.monsters.some(x => x.army)) this.updateSiege();
    if (m === 7 * 60 + 30 && (r.state === 'allied' || r.state === 'vassal')) {
      const cap = sim.capital, coins = r.state === 'vassal' ? 18 : 10, food = r.state === 'allied' ? 12 : 0, cr = r.state === 'vassal' ? 2 : 0;
      cap.stock.coins += coins; cap.stock.food += food; cap.stock.crystals += cr;
      cap.addTrade(`${r.state === 'vassal' ? 'Abgaben' : 'Handelszug'} aus ${r.name}: +${coins} 🪙${food ? `, +${food} 🍞` : ''}${cr ? `, +${cr} 💎` : ''}`);
    }
  }

  /* ---- Gründung: Feste am Kartenrand ---- */
  foundRival() {
    const sim = this.sim, w = sim.world, cap = sim.capital, reach = new Uint8Array(w.w * w.h);
    w.bfs(cap.camp.x, cap.camp.y + 1, (x, y) => { reach[y * w.w + x] = 1; return null; });
    let best = null, bd = -1;
    for (let y = 3; y < w.h - 3; y++) for (let x = 3; x < w.w - 3; x++) {
      const d = Math.min(...sim.towns.map(t => Math.hypot(t.camp.x - x, t.camp.y - y)));
      if (d < 24 || d <= bd || w.gates.some(g => Math.hypot(g.x - x, g.y - y) < 6)) continue;
      let ok = true;
      for (let dy = -1; dy <= 1 && ok; dy++) for (let dx = -1; dx <= 1; dx++) { const t = w.tile(x + dx, y + dy); if (!t || t.type !== 'grass') { ok = false; break; } }
      if (!ok || !DIRS.some(([dx, dy]) => reach[(y + 2 * dy) * w.w + x + 2 * dx])) continue;
      best = { x, y }; bd = d;
    }
    if (!best) { this.rival = null; return; }
    const R = RIVAL_REALMS[sim.seed % RIVAL_REALMS.length];
    this.rival = { ...R, x: best.x, y: best.y, relation: 0, state: 'neutral', contactDay: sim.day, nextSiege: 0, losses: 0, pending: null, history: [] };
    this.markFeste();
    sim.log(`🏰 Hinter den Wäldern im Osten erhebt sich die Feste ${R.name}. ${R.ruler} herrscht dort – und beobachtet ${sim.kingdom.name} genau.`, null, true);
    sim.emit('system', `NACHBARREICH ENTDECKT: ${R.name}`);
    sim.emit('diplo', { kind: 'contact', realm: this.rival });
    this.offer('Der Gesandte überbringt Grüße und fragt, wie ihr zu euren Nachbarn steht.');
  }
  markFeste() {
    const w = this.sim.world, r = this.rival, c = w.tile(r.x, r.y);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const t = w.tile(r.x + dx, r.y + dy); if (!t) continue; if (t.type !== 'feste') w.setType(t, 'feste'); if (t !== c) t.part = c; }
    w.dirty = true;
  }

  /* ---- Diplomatie ---- */
  note(text) { const r = this.rival; r.history.unshift(`T${this.sim.day}: ${text}`); if (r.history.length > 8) r.history.pop(); }
  shift(d, why) {
    const r = this.rival, sim = this.sim, before = r.relation;
    r.relation = clamp(r.relation + d, -100, 100);
    if (why) this.note(`${why} (${d > 0 ? '+' : ''}${d})`);
    if (r.state === 'neutral' && r.relation >= 60) { r.state = 'allied'; sim.log(`🤝 ${sim.kingdom.name} und ${r.name} schließen ein Bündnis!`, null, true); sim.emit('system', `BÜNDNIS MIT ${r.name.toUpperCase()}`); sim.emit('diplo', { kind: 'alliance', realm: r }); }
    if ((r.state === 'neutral' || r.state === 'allied') && r.relation <= -50) {
      r.state = 'war'; r.nextSiege = sim.day + 1;
      sim.log(`⚔️ ${r.ruler} erklärt ${sim.kingdom.name} den Krieg! Morgen marschiert das Heer von ${r.name}.`, null, true);
      sim.emit('system', `KRIEG! ${r.name.toUpperCase()} GREIFT AN`); sim.emit('diplo', { kind: 'war', realm: r });
    }
    if (r.state === 'allied' && r.relation < 30) { r.state = 'neutral'; sim.log(`💔 Das Bündnis mit ${r.name} zerbricht.`, null, true); }
    return before;
  }
  offer(text) {
    const r = this.rival, sim = this.sim;
    r.pending = { text, until: sim.minutes + 150, day: sim.day };
    sim.emit('diplo', { kind: 'offer', realm: r });
  }
  regentChoice() {
    const sim = this.sim, k = sim.kingdom, reg = k && sim.npcs.find(n => n.id === k.regentId), amb = reg && reg.ambition, cap = sim.capital;
    if (amb === 'staerke' && this.strength > this.rivalStrength) return 'tribut';
    if ((amb === 'ruhm' || amb === 'reichtum') && cap.stock.coins >= 20) return 'buendnis';
    if (cap.stock.coins >= 12 && cap.stock.crystals >= 1) return 'geschenk';
    return 'ablehnen';
  }
  /** Antwort auf den Gesandten (von der Oberfläche oder automatisch). */
  choose(key, auto = false) {
    const sim = this.sim, r = this.rival, o = DIPLO_OPTIONS[key], cap = sim.capital;
    if (!r || !r.pending || !o) return false;
    if (!cap.canAfford(o.cost)) { if (!auto) return false; key = 'ablehnen'; }
    const opt = DIPLO_OPTIONS[key];
    cap.pay(opt.cost); r.pending = null;
    const who = auto ? `Die Regentschaft von ${sim.kingdom.name}` : 'Ihr';
    if (key === 'tribut') {
      if (this.strength > this.rivalStrength * 1.2) { cap.stock.coins += 30; this.shift(-15, 'Tribut gezahlt – zähneknirschend'); sim.log(`💰 ${r.name} beugt sich und zahlt 30 Münzen Tribut.`, null, true); }
      else this.shift(opt.rel, 'Tribut gefordert – eine Beleidigung');
    } else this.shift(opt.rel, `${who} ${opt.text}`);
    sim.log(`📜 ${who} ${opt.text}. Beziehung zu ${r.name}: ${r.relation}.`, null, true);
    sim.emit('diplo', { kind: 'answer', realm: r, key, auto });
    return true;
  }
  dailyDiplomacy() {
    const sim = this.sim, r = this.rival, rng = sim.rng;
    if (r.state === 'vassal') return;
    if (r.state === 'war') { if (r.losses >= 2) this.surrender(); return; }
    if ((sim.day - r.contactDay) % 3 === 0) { this.offer(pick(sim, ['Der Gesandte bittet um eine Antwort seiner Herrschaft.', `${r.ruler} lässt fragen, ob ihr Freunde oder Feinde sein wollt.`, 'Ein Bote mit versiegeltem Brief wartet am Tor.'])); return; }
    if (r.temper) this.shift(r.temper, r.temper < 0 ? `${r.ruler} ist ${r.mood}` : 'gute Nachbarschaft');
    if (!this.rival || this.rival.state === 'war') return;
    const roll = rng();
    if (roll < 0.3) this.shift(8, `${r.name} schickt Geschenke`);
    else if (roll < 0.55) this.shift(-12, 'Streit an der Grenze');
    else if (roll < 0.7 && this.strength > this.rivalStrength) this.shift(-8, `${r.name} fürchtet eure Stärke`);
    else if (roll < 0.85 && sim.capital.market) { this.shift(5, 'Händler ziehen hin und her'); sim.capital.stock.coins += 6; }
  }

  /* ---- Belagerung ---- */
  startSiege() {
    const sim = this.sim, r = this.rival, w = sim.world, n = Math.min(8, 3 + Math.floor(sim.day / 5));
    const spot = w.bfs(r.x, r.y + 2, (x, y) => w.walkable(x, y), 200) || w.bfs(r.x + 2, r.y, (x, y) => w.walkable(x, y), 200);
    if (!spot) return;
    this.sieges++; this.siegeTicks = 0; this.siegeOver = false;
    const kinds = [...Array(n).fill('ritter'), 'feldherr'];
    kinds.forEach((kind, i) => {
      const M = MONSTERS[kind], hp = Math.round(M.hp * (1 + sim.day * 0.06)), p = spot.stand;
      sim.monsters.push({ id: ++sim.monsterId, kind, army: true, x: p.x + (i % 3) * 0.3, y: p.y, prevX: p.x, prevY: p.y, hp, maxHp: hp, path: [], repath: 0, facing: -1, cd: 0, t: 0 });
    });
    sim.log(`🚩 Das Heer von ${r.name} marschiert! ${n} Dornritter und ihr Feldherr ziehen gegen ${sim.capital.name}.`, null, true);
    sim.emit('system', `BELAGERUNG! Das Heer von ${r.name} naht`);
    sim.emit('diplo', { kind: 'siege', realm: r });
  }
  updateSiege() {
    const sim = this.sim, army = sim.monsters.filter(x => x.army);
    if (sim.minutes % 1440 === 23 * 60) { // Rückzug bei Nacht
      for (const m of army) m.gone = true;
      this.rival.nextSiege = sim.day + 2; this.siegeOver = true; this.stalemates = (this.stalemates || 0) + 1;
      if (this.stalemates >= 3) { // keine Seite gewinnt: Waffenstillstand
        const r = this.rival; r.state = 'neutral'; r.relation = 0; this.stalemates = 0;
        sim.log(`🕊️ Nach drei zähen Belagerungen schließen ${sim.kingdom.name} und ${r.name} einen Waffenstillstand.`, null, true);
        sim.emit('system', 'WAFFENSTILLSTAND'); this.note('Waffenstillstand');
      } else sim.log(`🌙 Das Heer von ${this.rival.name} zieht sich für die Nacht zurück. Die Belagerung geht weiter …`, null, true);
      return;
    }
    const cap = sim.capital.camp, at = army.filter(m => Math.hypot(m.x - cap.x, m.y - cap.y) < 2.5).length;
    if (at) this.siegeTicks = (this.siegeTicks || 0) + at;
    if (this.siegeTicks > (this.wallDone ? 1800 : 900)) this.siegeLost(army);
  }
  siegeLost(army) {
    const sim = this.sim, r = this.rival, cap = sim.capital, coins = Math.floor(cap.stock.coins * 0.4), cr = Math.floor(cap.stock.crystals * 0.3);
    for (const m of army) m.gone = true; this.siegeOver = true;
    cap.stock.coins -= coins; cap.stock.crystals -= cr; r.nextSiege = sim.day + 2;
    sim.log(`🏳️ Die Hauptstadt muss sich beugen: ${coins} 🪙 und ${cr} 💎 gehen an ${r.name}.`, null, true);
    sim.emit('system', 'Die Belagerung ist verloren …');
    sim.emit('diplo', { kind: 'siegeLost', realm: r });
  }
  armyDefeated() {
    const sim = this.sim, r = this.rival;
    if (this.siegeOver) return; this.siegeOver = true;
    r.losses++; this.siegeWins++; r.nextSiege = sim.day + 2;
    sim.log(`🏆 Das Heer von ${r.name} ist zerschlagen! ${sim.capital.name} hält stand.`, null, true);
    sim.emit('system', 'SIEG! Die Belagerung ist gebrochen');
    sim.emit('diplo', { kind: 'siegeWon', realm: r });
    for (const n of sim.npcs) { n.mood = Math.min(100, n.mood + 20); }
    if (r.losses >= 2) this.surrender();
  }
  surrender() {
    const sim = this.sim, r = this.rival;
    r.state = 'vassal'; r.relation = 10;
    sim.log(`👑 ${r.ruler} unterwirft sich. ${r.name} wird zum Vasallen von ${sim.kingdom.name} und zahlt jeden Morgen Abgaben.`, null, true);
    sim.emit('system', `${r.name.toUpperCase()} UNTERWIRFT SICH`);
    sim.emit('diplo', { kind: 'vassal', realm: r });
  }

  /* ---- Stadtmauer der Hauptstadt ---- */
  growWall() {
    const sim = this.sim, cap = sim.capital;
    if (!sim.kingdom || this.wallDone) return;
    if (cap.stock.stone < 12 || cap.stock.wood < 10) { cap.stoneWanted = true; return; }
    if (!this.wall) { this.wall = { progress: 0, r: Math.round(5 + Math.sqrt(cap.houses.length) * 2.1) }; sim.log(`🧱 Die Steinmetze beginnen mit der Stadtmauer von ${cap.name}.`, null, true); }
    cap.stock.stone -= 12; cap.stock.wood -= 10;
    this.wall.progress = Math.min(1, Math.round((this.wall.progress + 0.125) * 1000) / 1000);
    if (this.wall.progress >= 1) { sim.log(`🏰 Die Stadtmauer von ${cap.name} ist vollendet! Belagerer haben es jetzt schwer.`, null, true); sim.emit('system', 'STADTMAUER VOLLENDET'); sim.emit('wallDone', this.wall); }
  }
}

/** Ritter des Nachbarreichs: marschieren zur Hauptstadt und kämpfen gegen alle, die sich in den Weg stellen. */
function updateArmy(sim, m) {
  const M = MONSTERS[m.kind];
  m.prevX = m.x; m.prevY = m.y; m.t++;
  let target = null, bd = 1.6;
  for (const n of sim.npcs) { if (n.inside) continue; const d = Math.hypot(n.x - m.x, n.y - m.y); if (d < bd) { bd = d; target = n; } }
  if (target) {
    if (Math.abs(target.x - m.x) > 0.1) m.facing = target.x > m.x ? 1 : -1;
    if (++m.cd >= 3) {
      m.cd = 0; m.attackAt = performance.now();
      const wallCut = sim.realm.wallDone && Math.hypot(target.x - sim.capital.camp.x, target.y - sim.capital.camp.y) < sim.realm.wall.r ? 0.75 : 1;
      const dmg = Math.max(1, Math.round(M.atk * (1 + sim.day * 0.05) * wallCut * (0.8 + sim.rng() * 0.4) * (1 - target.defense / (target.defense + 60))));
      target.hp -= dmg; sim.float(target.x, target.y - 0.4, `-${dmg}`, '#ff6b6b'); sim.emit('hit', target);
      if (target.hp <= 0) sim.knockOut(target, m);
    }
    return;
  }
  const cap = sim.capital.campTile;
  if (Math.hypot(cap.x - m.x, cap.y - m.y) < 1.8) return; // am Ziel: belagern
  if (--m.repath <= 0 || !m.path.length) { m.repath = 25; const res = sim.world.findAdjacent(m.x, m.y, t => t === cap, 9000); m.path = res ? res.path : []; }
  let budget = M.speed;
  while (budget > 0 && m.path.length) {
    const nx = m.path[0], dx = nx.x - m.x, dy = nx.y - m.y, d = Math.hypot(dx, dy);
    if (Math.abs(dx) > 0.01) m.facing = dx > 0 ? 1 : -1;
    if (d <= budget) { m.x = nx.x; m.y = nx.y; budget -= d; m.path.shift(); } else { m.x += dx / d * budget; m.y += dy / d * budget; budget = 0; }
  }
}
function defeatSoldier(m, n, sim) {
  const M = MONSTERS[m.kind], coins = m.kind === 'feldherr' ? 25 : 4;
  sim.capital.stock.coins += coins;
  if (n) {
    sim.log(`⚔️ besiegt ${m.kind === 'feldherr' ? 'den Feldherrn' : 'einen Dornritter'}! (+${M.xp} EP, +${coins} 🪙)`, n, true);
    n.kills = (n.kills || 0) + 1; n.gainXp('combat', 1); n.addXp(sim, M.xp);
    n.remember(sim, `Hat ${m.kind === 'feldherr' ? 'den Feldherrn' : 'einen Dornritter'} besiegt ⚔️`);
    if (m.kind === 'feldherr') n.addTitle(sim, 'Bezwinger des Feldherrn');
  } else sim.log(`🗼 Ein Wachturm streckt ${m.kind === 'feldherr' ? 'den Feldherrn' : 'einen Dornritter'} nieder!`, null, true);
  sim.emit('system', `${M.name} besiegt!`);
  sim.emit('monsterKilled', m);
  if (!sim.monsters.some(x => x.army && x !== m && x.hp > 0 && !x.gone)) sim.realm.armyDefeated();
}
