/* =====================================================================
 * 1) KONFIGURATION
 * Alle Spielwerte an einer Stelle. Neue Gebäude, Klassen, Fähigkeiten
 * werden hier ergänzt, ohne die Logik weiter unten umbauen zu müssen.
 * ===================================================================== */
const CONFIG = {
  map: { width: 80, height: 80 },
  time: {
    minutesPerSecond: 4,    // bei 1x: 1 echte Sekunde = 4 Spielminuten (1 Tag = 6 Minuten)
    startHour: 6,
    nightStart: 22,
    nightEnd: 6,
  },
  speeds: [0, 1, 2, 5],
  npc: {
    moveSpeed: 0.25,        // Kacheln pro Spielminute
    carryCapacity: 5,
    startHunger: 25,
    startEnergy: 90,
    hungerPerMin: 0.1,      // 0 = satt, 100 = am Verhungern
    energyPerMin: 0.06,
    workEnergyPerMin: 0.04,
    sleepEnergyPerMin: 0.22,
    houseSleepBonus: 1.5,
    eatThreshold: 55,
    criticalHunger: 85,
    tiredThreshold: 25,
    criticalEnergy: 8,
    socialPerMin: 0.05,
    nightSleepBelow: 95,
    wakeEnergy: 80,
  },
  resources: {
    treeWood: 4,
    chopMinutes: 15,
    treeRegrowMinutes: 2 * 1440,
    bushMaxBerries: 6,
    berryRegrowMinutes: 80,
    eatMinutes: 5,
    berryFood: 15,
    bushDensity: 0.022,
    rockStone: 8,           // Stein pro Felsen
    mineMinutes: 25,        // Minuten pro Stein     // Anteil der Kacheln mit Beerensträuchern
  },
  buildings: {
    house:  { name: 'Haus', cost: { wood: 20 }, work: 240, beds: 2 },
    smithy: { name: 'Schmiede', cost: { wood: 30 }, work: 360, beds: 0 },
    market: { name: 'Marktplatz', cost: { wood: 25 }, work: 240, beds: 0 },
    tower:  { name: 'Wachturm', cost: { wood: 10, stone: 15 }, work: 240, beds: 0, range: 6.5 },
    tavern: { name: 'Taverne', cost: { wood: 25, stone: 10, coins: 20 }, work: 300, beds: 0 },
    temple: { name: 'Tempel', cost: { wood: 15, stone: 30, coins: 40 }, work: 420, beds: 0 },
    castle: { name: 'Burg', cost: { wood: 80, crystals: 6 }, work: 600, beds: 4, size: 3 },
    forsthaus:   { name: 'Forsthaus', cost: { wood: 25, stone: 5 }, work: 260, beds: 0 },
    bauernhof:   { name: 'Bauernhof', cost: { wood: 30 }, work: 300, beds: 0 },
    gildenhalle: { name: 'Gildenhalle', cost: { wood: 40, stone: 20, crystals: 3 }, work: 420, beds: 0 },
    lagerhaus:   { name: 'Lagerhaus', cost: { wood: 30, stone: 8 }, work: 280, beds: 0 },
  },
  farming: { growMinutes: 1440, harvestFood: 6, foodPerMeal: 40, plantMinutes: 40, harvestMinutes: 20 },
  bandits: { fromDay: 7, chance: 0.06, bossDay: 12 },
  monsters: { fromDay: 3, maxAlive: 6, spawnChance: 0.2, growthPerDay: 0.15 },
  // Berufe der Arbeiter: Gewichte verändern, welche Tätigkeit bevorzugt wird; hat = Kopfbedeckung
  professions: {
    settler:    { name: 'Siedler', weights: {}, hat: null },
    holzfaeller:{ name: 'Holzfäller', weights: { gatherWood: 1.5, plantField: 0.3, harvest: 0.6, mineStone: 0.4 }, hat: 'cap', share: 0.35 },
    bauer:      { name: 'Bauer', weights: { plantField: 2, harvest: 2, gatherWood: 0.6, mineStone: 0.3 }, hat: 'straw', share: 0.3 },
    handwerker: { name: 'Handwerker', weights: { build: 1.6, gatherWood: 1.1 }, hat: 'band', share: 0.2 },
    steinmetz:  { name: 'Steinmetz', weights: { mineStone: 2, gatherWood: 0.6 }, hat: 'miner', share: 0.15 },
  },
  population: {
    max: 70,
    names: ['Lina', 'Bjarn', 'Selma', 'Oskar', 'Ylva', 'Ruben', 'Nele', 'Kasimir', 'Ida', 'Jorin', 'Frieda', 'Emil',
      'Hanna', 'Levin', 'Talia', 'Arvid', 'Mila', 'Finn', 'Runa', 'Theo', 'Greta', 'Ansgar', 'Lotta', 'Malte', 'Svea',
      'Jonte', 'Wilma', 'Henrik', 'Edda', 'Ivo', 'Smilla', 'Torben', 'Alma', 'Keno', 'Rieke', 'Bosse', 'Liv', 'Fiete',
      'Ronja', 'Mats', 'Enno', 'Juna', 'Piet', 'Thea', 'Linus', 'Carla', 'Sören', 'Merle', 'Jasper', 'Maja', 'Kalle',
      'Elin', 'Ole', 'Tilda', 'Hauke', 'Nora', 'Vito', 'Isla', 'Brann', 'Sanna'],
  },
  awakening: { chanceNewcomer: 0.15, max: 5, firstDay: 1, firstHour: 21 },
  levels: { xpBase: 20, xpGrowth: 1.32, classLevel: 4,
    xpPer: { woodcutting: 3, building: 0.25, gathering: 1.5, social: 4, gate: 0 } },
  gates: { count: 4, minLevel: 4, expeditionMinutes: 180, cooldownMinutes: 1440 },
  startingNpcs: [
    { name: 'Mira',  color: '#f0a04b' },
    { name: 'Tarek', color: '#5fb6ef' },
  ],
  logSize: 80,
};

// Klassen werden mit Level 4 gewählt – nach der Tätigkeit mit der meisten Erfahrung.
const CLASSES = {
  waldlaeufer: { name: 'Waldläufer', icon: '🏹', skill: 'woodcutting', color: '#7fd67a', desc: 'Eins mit dem Wald. Schlägt mehr Holz und ist flink unterwegs.' },
  baumeister:  { name: 'Baumeister', icon: '🏛️', skill: 'building', color: '#f0b54a', desc: 'Baut schneller und reißt die Helfer mit.' },
  hueter:      { name: 'Hüter der Haine', icon: '🌿', skill: 'gathering', color: '#c792ea', desc: 'Lässt Sträucher schneller tragen und braucht selbst wenig.' },
  herold:      { name: 'Herold', icon: '📯', skill: 'social', color: '#6fb6ef', desc: 'Verbindet Menschen und lockt Neue an.' },
  schmied:     { name: 'Schmied', icon: '⚒️', skill: 'forging', color: '#ff8a3d', desc: 'Formt Kristall und Stahl zu Ausrüstung – mit Glück sogar Legendäres.' },
  sternenschmied: { name: 'Sternenschmied', icon: '🌟', skill: 'forging', color: '#ffd76a', hidden: true, legendary: true, desc: 'Legendäre Klasse aus einem vergessenen Buch. Was diese Hände schmieden, sprengt jedes Maß.' },
  torwandler:  { name: 'Torwandler', icon: '🌀', skill: 'gate', color: '#a98bff', hidden: true, desc: 'Versteckte Klasse. Durchschreitet die Risse ohne Furcht und kehrt mit Kristallen zurück.' },
};
const SKILLS = {
  kraftschlag:   { cls: 'waldlaeufer', lvl: 5, name: 'Kraftschlag', desc: 'Jeder Axthieb bringt doppelt Holz.' },
  leichtfuss:    { cls: 'waldlaeufer', lvl: 8, name: 'Leichtfuß', desc: '+35 % Laufgeschwindigkeit.' },
  meisterhand:   { cls: 'baumeister', lvl: 5, name: 'Meisterhand', desc: 'Baut doppelt so schnell.' },
  inspiration:   { cls: 'baumeister', lvl: 8, name: 'Inspiration', desc: 'Alle Bauhelfer arbeiten 30 % schneller.' },
  gruenerDaumen: { cls: 'hueter', lvl: 5, name: 'Grüner Daumen', desc: 'Sträucher in der Nähe tragen schneller Beeren.' },
  genuegsam:     { cls: 'hueter', lvl: 8, name: 'Genügsam', desc: 'Hunger steigt 40 % langsamer.' },
  frohsinn:      { cls: 'herold', lvl: 5, name: 'Frohsinn', desc: 'Gespräche schenken doppelt Gemeinschaft.' },
  rufDerFerne:   { cls: 'herold', lvl: 8, name: 'Ruf der Ferne', desc: 'Lockt bei jedem neuen Haus einen zusätzlichen Siedler an.' },
  torsicht:      { cls: 'torwandler', lvl: 5, name: 'Torsicht', desc: 'Kehrt aus Rissen mit doppelter Beute zurück.' },
  meisterschmied:   { cls: 'schmied', lvl: 5, name: 'Meisterschmied', desc: 'Jedes Schmiedestück gelingt mindestens eine Stufe besser.' },
  legendaererFunke: { cls: 'schmied', lvl: 8, name: 'Legendärer Funke', desc: 'Dreifache Chance auf Legendäres und Mythisches.' },
  sternenhammer: { cls: 'sternenschmied', lvl: 1, name: 'Sternenhammer', desc: 'Schmiedestücke gelingen zwei Stufen besser.' },
  seelenschmied: { cls: 'sternenschmied', lvl: 5, name: 'Seelenschmied', desc: 'Wer ein Stück dieser Hände trägt, bleibt für immer treu.' },
  phasenschritt: { cls: 'torwandler', lvl: 8, name: 'Phasenschritt', desc: '+50 % Laufgeschwindigkeit.' },
};
const STAT_NAMES = { kraft: 'Kraft', geschick: 'Geschick', ausdauer: 'Ausdauer', charisma: 'Charisma' };
const CLASS_STAT = { waldlaeufer: 'kraft', baumeister: 'kraft', hueter: 'ausdauer', herold: 'charisma', torwandler: 'geschick', schmied: 'kraft', sternenschmied: 'geschick' };

// Ausrüstung: fünf Seltenheitsstufen, sichtbar an den Figuren
const RARITIES = [
  { name: 'Gewöhnlich', color: '#c9c9c9', mult: 1, prefix: 'Eisen' },
  { name: 'Selten', color: '#4fa3ff', mult: 1.6, prefix: 'Stahl' },
  { name: 'Episch', color: '#b067ff', mult: 2.4, prefix: 'Runen' },
  { name: 'Legendär', color: '#ffb020', mult: 3.6, prefix: 'Sternen' },
  { name: 'Mythisch', color: '#ff4f6a', mult: 5, prefix: 'Weltenbrecher' },
];
const SLOTS = ['weapon', 'armor', 'helmet', 'boots', 'cape'];
const SLOT_NAMES = { weapon: 'Waffe', armor: 'Rüstung', helmet: 'Helm', boots: 'Stiefel', cape: 'Umhang' };
const WEAPONS = { waldlaeufer: ['bow', 'bogen'], baumeister: ['hammer', 'kriegshammer'], hueter: ['staff', 'stab'], herold: ['spear', 'speer'],
  torwandler: ['blade', 'klinge'], schmied: ['hammer', 'schmiedehammer'], sternenschmied: ['hammer', 'sternenhammer'], none: ['sword', 'schwert'] };
const EPITHETS = ['Morgenröte', 'Sturmherz', 'Aschenkrone', 'Mondsplitter', 'Ewige Glut', 'Himmelsbrecher', 'Letzter Schwur', 'Nachtwind'];
const QUESTS = [
  { type: 'woodcutting', goal: 15, text: g => `Schlage ${g} Holz` },
  { type: 'building', goal: 90, text: g => `Arbeite ${g} Minuten am Bau` },
  { type: 'social', goal: 3, text: g => `Führe ${g} Gespräche` },
  { type: 'gathering', goal: 8, text: g => `Pflücke ${g} Beeren` },
];
const QUEST_ACTION = { woodcutting: 'gatherWood', building: 'build', social: 'socialize', gathering: 'eat' };
const KINGDOM_NAMES = ['Eldmar', 'Varenholm', 'Sonnenmark', 'Aldria', 'Rabenfels', 'Lichtenhain'];
const OUTPOST_NAMES = ['Birkenau', 'Steinfurt', 'Morgenwacht', 'Kieselbach', 'Falkenruh', 'Tannenheim', 'Wolfsgrund'];
const BANNERS = ['#c0392b', '#2e6fbf', '#7b3fb0', '#d4a017', '#2f8f5b'];
const roman = n => { if (!(n > 0 && n < 40)) return String(n); let r = ''; for (const [v, sym] of [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]) while (n >= v) { r += sym; n -= v; } return r; };
// Fertigkeiten aller Siedler: Punkte aus der Arbeit → Stufe (1 + Wurzel aus Punkte/per)
const SKILL_INFO = {
  woodcutting: { name: 'Holzfällen', icon: '🪓', per: 8, bonus: 'schneller hacken' },
  building:    { name: 'Bauen', icon: '🔨', per: 45, bonus: 'schneller bauen' },
  farming:     { name: 'Ackerbau', icon: '🌾', per: 6, bonus: 'mehr Ernte' },
  mining:      { name: 'Bergbau', icon: '⛏️', per: 8, bonus: 'schneller Stein brechen' },
  gathering:   { name: 'Sammeln', icon: '🫐', per: 10, bonus: 'Erfahrung' },
  forging:     { name: 'Schmieden', icon: '⚒️', per: 6, bonus: 'bessere Ausrüstung' },
  social:      { name: 'Gespräche', icon: '💬', per: 6, bonus: 'Freundschaften' },
  combat:      { name: 'Kampf', icon: '⚔️', per: 3, bonus: 'stärkere Treffer' },
};
const skillLevel = (skill, pts) => Math.min(20, 1 + Math.floor(Math.sqrt((pts || 0) / (SKILL_INFO[skill] ? SKILL_INFO[skill].per : 10))));
const skillPtsFor = (skill, lvl) => (lvl - 1) ** 2 * (SKILL_INFO[skill] ? SKILL_INFO[skill].per : 10); // Punkte für eine Stufe
const xpForLevel = l => Math.round(CONFIG.levels.xpBase * Math.pow(CONFIG.levels.xpGrowth, l - 1));

/* =====================================================================
 * 2) HILFSFUNKTIONEN
 * ===================================================================== */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pad2 = n => String(n).padStart(2, '0');
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/* =====================================================================
 * 3) WELT: Kacheln, Kartengenerierung, Wegfindung, Nachwachsen
 * ===================================================================== */
const TILE_DEFS = {
  grass: { name: 'Wiese',         walkable: true  },
  tree:  { name: 'Wald',          walkable: false },
  stump: { name: 'Baumstumpf',    walkable: false },
  water: { name: 'Wasser',        walkable: false },
  bush:  { name: 'Beerenstrauch', walkable: false },
  camp:  { name: 'Lager',         walkable: false },
  site:  { name: 'Baustelle',     walkable: false },
  house: { name: 'Haus',          walkable: false },
  rock:  { name: 'Fels',          walkable: false },
  field: { name: 'Feld',          walkable: false },
  smithy:{ name: 'Schmiede',      walkable: false },
  market:{ name: 'Marktplatz',    walkable: false },
  tower: { name: 'Wachturm',      walkable: false },
  tavern:{ name: 'Taverne',       walkable: false },
  temple:{ name: 'Tempel',        walkable: false },
  castle:{ name: 'Burg',          walkable: false },
  ford:  { name: 'Furt',          walkable: true  },
  ruin:  { name: 'Ruine',         walkable: false },
  gate:  { name: 'Riss',          walkable: false },
  forsthaus:   { name: 'Forsthaus',   walkable: false }, // ab hier neu – immer nur hinten anhängen!
  bauernhof:   { name: 'Bauernhof',   walkable: false },
  gildenhalle: { name: 'Gildenhalle', walkable: false },
  lagerhaus:   { name: 'Lagerhaus',   walkable: false },
};

class World {
  constructor(cfg, rng) {
    this.cfg = cfg;
    this.w = cfg.map.width;
    this.h = cfg.map.height;
    this.tiles = [];
    this.gates = [];
    this.dirty = true;
    this.dirtyTiles = new Set(); // geänderte Kacheln für den Boden-Zwischenspeicher
    this.camp = generateMap(this, rng);
  }
  inBounds(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  tile(x, y) { return this.inBounds(x, y) ? this.tiles[y * this.w + x] : null; }
  walkable(x, y) { const t = this.tile(x, y); return !!t && TILE_DEFS[t.type].walkable; }
  setType(t, type) { t.type = type; t.timer = 0; this.dirty = true; this.dirtyTiles.add(t); }

  /** Breitensuche über begehbare Kacheln; goal(x, y) liefert ein Ziel, wenn (x, y) passt. */
  bfs(sx, sy, goal, maxNodes = Infinity) {
    const start = { x: Math.round(sx), y: Math.round(sy) };
    if (!this.inBounds(start.x, start.y)) return null;
    const prev = new Int32Array(this.w * this.h).fill(-2);
    const startIdx = start.y * this.w + start.x;
    prev[startIdx] = -1;
    const queue = [startIdx];
    for (let head = 0; head < queue.length && head < maxNodes; head++) {
      const idx = queue[head];
      const x = idx % this.w, y = (idx / this.w) | 0;
      const target = goal(x, y);
      if (target) {
        const path = [];
        for (let i = idx; i !== startIdx; i = prev[i]) path.push({ x: i % this.w, y: (i / this.w) | 0 });
        path.reverse();
        return { path, stand: { x, y }, target };
      }
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy;
        if (!this.walkable(nx, ny)) continue;
        const ni = ny * this.w + nx;
        if (prev[ni] !== -2) continue;
        prev[ni] = idx;
        queue.push(ni);
      }
    }
    return null;
  }

  /** Nächster Standplatz direkt neben einer Kachel, die isTarget(tile) erfüllt. */
  findAdjacent(sx, sy, isTarget, maxNodes) {
    return this.bfs(sx, sy, (x, y) => {
      for (const [dx, dy] of DIRS) {
        const t = this.tile(x + dx, y + dy);
        if (t && isTarget(t)) return t;
      }
      return null;
    }, maxNodes);
  }

  /** Läuft jede Spielminute: Beeren und Bäume wachsen nach. */
  update() {
    const r = this.cfg.resources;
    for (const t of this.tiles) {
      if (t.type === 'bush' && t.berries < r.bushMaxBerries) {
        if (++t.timer >= r.berryRegrowMinutes) { t.berries++; t.timer = 0; }
      } else if (t.type === 'field') {
        if (t.timer < this.cfg.farming.growMinutes) t.timer += 1;
      } else if (t.type === 'stump') {
        if (++t.timer >= r.treeRegrowMinutes) { this.setType(t, 'tree'); t.wood = r.treeWood; }
      }
    }
  }
}

function generateMap(world, rng) {
  const { w, h } = world;
  const r = world.cfg.resources;
  const ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      world.tiles.push({ x, y, type: 'grass', wood: 0, berries: 0, timer: 0, shade: rng(), building: null, traffic: 0 });
  const camp = { x: Math.floor(w / 2), y: Math.floor(h / 2) };
  const far = (x, y, d) => Math.hypot(x - camp.x, y - camp.y) >= d;

  const blob = (cx, cy, radius, type, density = 1, onlyGrass = false) => {
    const R = Math.ceil(radius + 1);
    for (let y = cy - R; y <= cy + R; y++)
      for (let x = cx - R; x <= cx + R; x++) {
        const t = world.tile(x, y);
        if (!t || (onlyGrass && t.type !== 'grass')) continue;
        if (Math.hypot(x - cx, y - cy) + rng() * 1.4 < radius && rng() < density) t.type = type;
      }
  };

  // Seen
  for (let i = 0; i < 5; i++) { const x = ri(4, w - 5), y = ri(4, h - 5); if (far(x, y, 14)) blob(x, y, 3 + rng() * 4, 'water'); }
  // Fluss von oben nach unten, mit Furten
  let rx = rng() < 0.5 ? ri(8, 22) : ri(w - 23, w - 9);
  const fords = new Set();
  for (let y = 0; y < h; y++) {
    rx = clamp(rx + Math.round((rng() - 0.5) * 2.2), 3, w - 4);
    const ford = y % 14 === 7;
    for (let x = rx - 1; x <= rx + 1; x++) {
      const t = world.tile(x, y);
      if (!t) continue;
      t.type = ford ? 'ford' : 'water';
      if (ford) fords.add(t);
    }
  }
  // Wälder und Felsen
  for (let i = 0; i < 34; i++) blob(ri(0, w - 1), ri(0, h - 1), 2 + rng() * 4.5, 'tree', 0.8, true);
  for (let i = 0; i < 12; i++) { const x = ri(2, w - 3), y = ri(2, h - 3); if (far(x, y, 10)) blob(x, y, 1.2 + rng() * 2, 'rock', 0.85, true); }

  // Lichtung mit Lager in der Mitte
  for (let y = camp.y - 6; y <= camp.y + 6; y++)
    for (let x = camp.x - 6; x <= camp.x + 6; x++) {
      const t = world.tile(x, y);
      if (t && Math.hypot(x - camp.x, y - camp.y) <= 5.2) t.type = 'grass';
    }
  world.tile(camp.x, camp.y).type = 'camp';
  // Wäldchen in Reichweite
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * Math.PI * 2 + rng();
    blob(Math.round(camp.x + Math.cos(a) * 8.5), Math.round(camp.y + Math.sin(a) * 8.5), 2.2, 'tree', 0.9, true);
  }
  // Beerensträucher
  const bushes = Math.round(w * h * r.bushDensity);
  let placed = 0, tries = 0;
  while (placed < bushes + 6 && tries++ < 20000) {
    let x, y;
    if (placed < 6) { const a = rng() * Math.PI * 2, d = 4 + rng() * 3; x = Math.round(camp.x + Math.cos(a) * d); y = Math.round(camp.y + Math.sin(a) * d); }
    else { x = ri(0, w - 1); y = ri(0, h - 1); }
    const t = world.tile(x, y);
    if (!t || t.type !== 'grass' || !far(x, y, 3)) continue;
    t.type = 'bush'; placed++;
  }
  // Ruinen: kleine Gruppen alter Säulen
  for (let i = 0; i < 5; i++) {
    const x = ri(5, w - 6), y = ri(5, h - 6);
    if (!far(x, y, 14)) continue;
    for (let k = 0; k < 5; k++) { const t = world.tile(x + ri(-2, 2), y + ri(-2, 2)); if (t && t.type === 'grass') t.type = 'ruin'; }
  }
  for (const t of world.tiles) {
    if (t.type === 'tree') t.wood = r.treeWood;
    if (t.type === 'rock') t.wood = r.rockStone; // Steinvorrat (im Feld 'wood' gespeichert)
    if (t.type === 'bush') t.berries = r.bushMaxBerries;
  }
  // Risse (Tore in eine andere Welt): weit weg, je weiter, desto gefährlicher
  const reach = (x, y) => world.bfs(camp.x, camp.y + 1, (px, py) => Math.abs(px - x) + Math.abs(py - y) === 1 ? true : null);
  tries = 0;
  while (world.gates.length < world.cfg.gates.count && tries++ < 400) {
    const x = ri(4, w - 5), y = ri(4, h - 5), t = world.tile(x, y);
    if (!t || !far(x, y, 16) || world.gates.some(g => Math.hypot(g.x - x, g.y - y) < 14)) continue;
    for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x - 1; xx <= x + 1; xx++) { const n = world.tile(xx, yy); if (n && n.type !== 'water' && n.type !== 'ford') n.type = 'grass'; }
    if (t.type !== 'grass' || !reach(x, y)) continue;
    t.type = 'gate';
    const d = Math.hypot(x - camp.x, y - camp.y);
    t.gate = { tier: d > 32 ? 3 : d > 24 ? 2 : 1, cleared: 0, failed: 0, name: ['Smaragdriss', 'Aschetor', 'Sternenspalt', 'Nebelpforte', 'Glutschlund'][world.gates.length % 5] };
    world.gates.push(t);
  }
  return camp;
}

/* =====================================================================
 * 4) SIEDLUNG: Lager, Gebäude, Baustellen
 * ===================================================================== */
class Settlement {
  constructor(sim, camp, opts = {}) {
    this.sim = sim;
    this.camp = camp;
    this.campTile = sim.world.tile(camp.x, camp.y);
    this.campTile.town = this;
    this.id = opts.id || 0; this.name = opts.name || 'Siedlung'; this.capital = !!opts.capital;
    this.color = opts.color || BANNERS[this.id % BANNERS.length]; this.leader = opts.leader || ''; this.founded = opts.founded || 1;
    this.stock = { wood: 0, crystals: 0, food: 0, coins: 0, stone: 0 };
    this.trades = []; // letzte Handelsgeschäfte für die Anzeige
    this.buildings = [];
    this.items = []; // eingelagerte Ausrüstung
    this.site = null;
    this.foundedBy = '';
  }
  get houses() { return this.buildings.filter(b => b.type === 'house'); }
  get smithy() { return this.buildings.find(b => b.type === 'smithy'); }
  get towers() { return this.buildings.filter(b => b.type === 'tower'); }
  get tavern() { return this.buildings.find(b => b.type === 'tavern'); }
  get temple() { return this.buildings.find(b => b.type === 'temple'); }
  get market() { return this.buildings.find(b => b.type === 'market'); }
  get castle() { return this.buildings.find(b => b.type === 'castle'); }
  get forsthaus() { return this.buildings.find(b => b.type === 'forsthaus'); }
  get bauernhof() { return this.buildings.find(b => b.type === 'bauernhof'); }
  get gildenhalle() { return this.buildings.find(b => b.type === 'gildenhalle'); }
  get lagerhaus() { return this.buildings.find(b => b.type === 'lagerhaus'); }
  /** Ausrüstung ins Lager legen (höchstens 24 Teile – das Schwächste fliegt raus). */
  storeItem(it) {
    if (!it) return;
    (this.items ||= []).push(it);
    if (this.items.length > 24) { this.items.sort((a, b) => b.power - a.power); this.items.length = 24; }
  }
  get members() { return this.sim.npcs.filter(n => n.town === this); }
  get fields() { return this.sim.world.tiles.filter(t => t.type === 'field'); }
  canAfford(cost) { return Object.entries(cost).every(([k, v]) => (this.stock[k] || 0) >= v); }
  pay(cost) { for (const [k, v] of Object.entries(cost)) this.stock[k] -= v; }

  addTrade(text) { this.trades.unshift(`T${this.sim.day} ${this.sim.clock} · ${text}`); if (this.trades.length > 6) this.trades.pop(); }

  /** Felder zählen (alle 15 Minuten, damit es schnell bleibt). */
  recount() {
    let f = 0, r = 0;
    const towns = this.sim.towns || [this];
    for (const t of this.sim.world.tiles) if (t.type === 'field') {
      let own = towns[0], bd = Infinity; // Feld gehört zur nächsten Siedlung
      for (const tw of towns) { const d = Math.hypot(tw.camp.x - t.x, tw.camp.y - t.y); if (d < bd) { bd = d; own = tw; } }
      if (own !== this) continue;
      f++; if (t.timer >= CONFIG.farming.growMinutes && !t.harvester) r++;
    }
    this.fieldCount = f; this.ripe = r;
  }

  update() {
    if (this.fieldCount === undefined || this.sim.minutes % 15 === 0) this.recount();
    if (this.site || this.sim.minutes % 10 !== 0) return;
    // Wunschliste nach Wichtigkeit; gebaut wird das erste, das bezahlbar ist
    const sim = this.sim, H = this.houses.length, free = this.houses.reduce((a, h) => a + h.beds - h.residents.length, 0), wants = [];
    if (this.capital && sim.kingdom && !this.castle && sim.minutes >= (this.nextCastleTry || 0)) wants.push('castle');
    if (this.capital && !this.smithy && H >= 3 && this.stock.crystals >= 1) wants.push('smithy');
    if (this.capital && this.smithy && !this.market && H >= 8) wants.push('market');
    if (sim.day >= CONFIG.monsters.fromDay && H >= 3 && this.towers.length < Math.ceil((H + 1) / 7)) wants.push('tower');
    if (this.capital && !this.tavern && H >= 12) wants.push('tavern');
    if (this.capital && !this.temple && H >= 16) wants.push('temple');
    if (!this.lagerhaus && H >= 3) wants.push('lagerhaus');
    if (!this.forsthaus && H >= 4) wants.push('forsthaus');
    if (!this.bauernhof && H >= 5) wants.push('bauernhof');
    if (this.capital && sim.guild && !this.gildenhalle && H >= 6) wants.push('gildenhalle');
    if (free < 2) wants.push('house');
    this.stoneWanted = wants.some(t => (CONFIG.buildings[t].cost.stone || 0) > this.stock.stone);
    for (const type of wants) if (this.canAfford(CONFIG.buildings[type].cost) && this.startConstruction(type)) return;
    this.tryUpgrade(free);
  }

  /* ---- Gebäude-Stufen: vorhandene Gebäude ausbauen (Stufe I → III) ---- */
  upgradeCost(b) {
    const L = b.level || 1;
    return b.type === 'house' ? { wood: 14 + L * 6, stone: 4 * L } : { wood: 18 * L, stone: 10 * L, ...(b.type === 'smithy' ? { crystals: 2 * L } : {}) };
  }
  tryUpgrade(free) {
    const order = ['smithy', 'gildenhalle', 'lagerhaus', 'tower', 'bauernhof', 'forsthaus', 'market', 'temple', 'tavern', 'house'], c = this.camp;
    const cands = this.buildings.filter(b => order.includes(b.type) && (b.level || 1) < 3)
      .sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type) || (a.level || 1) - (b.level || 1)
        || Math.hypot(a.tile.x - c.x, a.tile.y - c.y) - Math.hypot(b.tile.x - c.x, b.tile.y - c.y));
    for (const b of cands) {
      if (b.type === 'house' ? free >= 2 && this.stock.wood < 70 : this.stock.wood < 45) continue; // Reserve fürs Nötige
      const cost = this.upgradeCost(b);
      if (!this.canAfford(cost)) continue;
      this.pay(cost);
      this.site = { type: b.type, tile: b.tile, tiles: [b.tile], progress: 0, work: Math.round(CONFIG.buildings[b.type].work * 0.6 * (b.level || 1)), upgrade: b, town: this, startedDay: this.sim.day };
      b.tile.siteRef = this.site;
      this.sim.log(`🔧 ${CONFIG.buildings[b.type].name}${b.type === 'house' ? ' Nr. ' + b.id : ''} wird ausgebaut – bald Stufe ${roman((b.level || 1) + 1)}!`, null, true);
      return true;
    }
    return false;
  }
  completeUpgrade() {
    const site = this.site, sim = this.sim, b = site.upgrade, def = CONFIG.buildings[b.type];
    b.level = (b.level || 1) + 1; b.tile.siteRef = null; this.site = null;
    if (b.type === 'house') b.beds = (def.beds || 2) + b.level - 1;
    const builders = sim.npcs.filter(n => n.task && n.task.actionId === 'build');
    for (const n of builders) { n.gainXp('building', 20); if (n.awakened) n.addXp(sim, 20); }
    sim.log(`⬆️ ${def.name}${b.type === 'house' ? ' Nr. ' + b.id : ''} ist jetzt Stufe ${roman(b.level)}!${b.type === 'house' ? ` (${b.beds} Betten)` : ''}`, null, true);
    sim.emit('system', `GEBÄUDE AUFGEWERTET: ${def.name} → Stufe ${roman(b.level)}`);
    sim.float(b.tile.x, b.tile.y, `⬆️ Stufe ${roman(b.level)}`, '#f0b54a');
    if (b.type === 'house') sim.emit('buildingCompleted', b); // neue Betten → Neue ziehen ein
  }

  startConstruction(type) {
    const def = CONFIG.buildings[type];
    const tile = type === 'castle' ? this.findCastleSpot() : this.findBuildSpot(type === 'tower' ? 4 + Math.sqrt(this.houses.length) * 1.6 : 0);
    if (!tile) { if (type === 'castle') this.nextCastleTry = this.sim.minutes + 240; return false; }
    this.pay(def.cost);
    const tiles = type === 'castle' ? this.footprint(tile) : [tile];
    this.site = { type, tile, tiles, progress: 0, work: def.work, startedDay: this.sim.day, town: this };
    for (const t of tiles) { this.sim.world.setType(t, 'site'); t.siteRef = this.site; }
    if (type === 'castle') this.sim.log(`🏰 Der Bau der Burg von ${this.sim.kingdom.name} beginnt!`, null, true);
    else this.sim.log(type === 'smithy' ? '⚒️ Die Siedler beginnen mit dem Bau einer Schmiede!' : `🪓 ${def.cost.wood} Holz beisammen – die Siedler bauen gemeinsam ein ${def.name}!`, null, true);
    this.sim.emit('constructionStarted', this.site);
    return true;
  }

  completeSite() {
    if (this.site.upgrade) return this.completeUpgrade();
    const site = this.site, sim = this.sim;
    const def = CONFIG.buildings[site.type];
    for (const t of site.tiles || [site.tile]) { sim.world.setType(t, site.type); t.siteRef = null; if (t !== site.tile) t.part = site.tile; }
    const builders = sim.npcs.filter(n => n.task && n.task.actionId === 'build');
    const b = { id: this.buildings.length + 1, level: 1, type: site.type, tile: site.tile, beds: def.beds || 0, sleepers: new Set(), residents: [],
      builtDay: sim.day, builtClock: sim.clock, builders: builders.map(n => n.name), town: this };
    site.tile.building = b;
    this.buildings.push(b);
    this.site = null;
    sim.log(site.type === 'castle' ? `🏰 Die Burg von ${sim.kingdom ? sim.kingdom.name : this.name} erhebt sich über dem Land!` : site.type === 'smithy' ? '⚒️ Die Schmiede ist fertig! Jetzt kann aus Kristallen Ausrüstung entstehen.' : `🏠 ${def.name} Nr. ${this.houses.length} in ${this.name} ist fertig!`, null, true);
    if (site.type === 'castle') sim.emit('system', 'Die Burg ist vollendet!');
    if (site.type === 'smithy') sim.emit('system', 'Neues Gebäude: Schmiede');
    sim.float(site.tile.x, site.tile.y, '🎉 Fertig!', '#f0b54a');
    for (const n of builders) { // Richtfest: alle Helfer bekommen einen Bonus
      n.remember(sim, `Hat Haus Nr. ${b.id} mitgebaut 🔨`); n.housesBuilt = (n.housesBuilt || 0) + 1;
      n.gainXp('building', 30); if (n.awakened) n.addXp(sim, 30);
    }
    if (builders.length) sim.log(`🎊 Richtfest! ${builders.map(n => n.name).join(', ')} ${builders.length > 1 ? 'bekommen' : 'bekommt'} Bau-Erfahrung.`, null, false);
    if (site.type === 'castle' && sim.kingdom) { const r = sim.npcs.find(n => n.id === sim.kingdom.regentId); if (r) { if (r.home) r.home.residents = r.home.residents.filter(x => x !== r); sim.moveIn(r, b); } }
    sim.emit('buildingCompleted', b);
  }

  footprint(center) {
    const out = [];
    for (let y = center.y - 1; y <= center.y + 1; y++) for (let x = center.x - 1; x <= center.x + 1; x++) out.push(this.sim.world.tile(x, y));
    return out;
  }

  /** Platz für die Burg: 3×3 freie Wiese, ohne dass Wege abgeschnitten werden. */
  findCastleSpot() {
    const { world } = this.sim, c = this.camp, W = world.w;
    const flood = blocked => { let cnt = 0; world.bfs(c.x, c.y + 1, (x, y) => { if (!blocked.has(y * W + x)) cnt++; return null; }); return cnt; };
    const base = flood(new Set());
    const cands = [];
    for (let y = c.y - 14; y <= c.y + 14; y++) for (let x = c.x - 14; x <= c.x + 14; x++) {
      const d = Math.hypot(x - c.x, y - c.y);
      if (d < 4 || d > 14) continue;
      const fp = this.footprint({ x, y });
      if (fp.some(t => !t || t.type !== 'grass')) continue;
      cands.push({ x, y, d });
    }
    cands.sort((a, b) => a.d - b.d);
    for (const cd of cands.slice(0, 12)) {
      const blocked = new Set(this.footprint(cd).map(t => t.y * W + t.x));
      const saved = world.walkable.bind(world);
      world.walkable = (x, y) => !blocked.has(y * W + x) && saved(x, y);
      const after = flood(blocked);
      world.walkable = saved;
      if (after >= base - 12) return world.tile(cd.x, cd.y);
    }
    return null;
  }

  /** Freie Wiese nahe am Lager. Raster mit Abstand 2 hält Wege frei. */
  findBuildSpot(minD = 0) {
    const { world, npcs } = this.sim;
    const c = this.camp, R = 30;
    if (this.sim.minutes < (this.nextSpotTry || 0)) return null;
    const reach = new Uint8Array(world.w * world.h);
    world.bfs(c.x, c.y + 1, (x, y) => { reach[y * world.w + x] = 1; return null; });
    let best = null, bestD = Infinity;
    for (let y = c.y - R; y <= c.y + R; y++)
      for (let x = c.x - R; x <= c.x + R; x++) {
        const dx = x - c.x, dy = y - c.y;
        if (dx % 2 !== 0 || dy % 2 !== 0 || (dx === 0 && dy === 0)) continue;
        const t = world.tile(x, y);
        if (!t || t.type !== 'grass') continue;
        const d = Math.hypot(dx, dy * 1.1);
        if (d >= bestD || d < minD) continue; // Wachtürme lieber am Ortsrand
        if (npcs.some(n => Math.round(n.x) === x && Math.round(n.y) === y)) continue;
        if (!DIRS.some(([ax, ay]) => world.walkable(x + ax, y + ay))) continue;
        if (DIRS.some(([ax, ay]) => world.inBounds(x + ax, y + ay) && reach[(y + ay) * world.w + x + ax])) { best = t; bestD = d; }
      }
    if (!best) this.nextSpotTry = this.sim.minutes + 120;
    return best;
  }
}

