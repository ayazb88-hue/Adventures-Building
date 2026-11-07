/* =====================================================================
 * 8c) PIXEL-FIGUREN
 * Siedler als Pixel-Art: jede Pose wird auf einem 40×40-Raster mit
 * Pixel-Linien gezeichnet, bekommt automatisch einen dunklen Umriss und
 * wird zwischengespeichert. Animation in festen Bildern (Laufen 8, Hacken 8 …).
 * ===================================================================== */
const PIX = { W: 40, H: 40, FX: 20, FY: 37, U: 30, OUTLINE: [36, 22, 15] };
const pixCache = new Map();

// Kopf (12×11), Blick nach rechts. s Haut, S Hautschatten, L Wimpern, i Iris, p Pupille, w Glanz, m Mund, b Wange
const HEAD_TPL = [
  '...ssssss...',
  '..ssssssss..',
  '.ssssssssss.',
  '.sssssssssss',
  'SsssLLssLLLs',
  'Sssswisswiis',
  'Ssssipssipis',
  'Ssssssssiiss',
  '.Sssssbssms.',
  '..Ssssssss..',
  '....Sssss...',
];
// Pony (14 breit, beginnt 1 Spalte links und 2 Zeilen über dem Kopf). h Haar, H Haarschatten, l Glanz
const HAIR_TPL = {
  short: [
    '....HHHHH.....',
    '..HHhhhhhHH...',
    '.HhhhlllhhhH..',
    'Hhhhhhllhhhhh.',
    'Hhhhhhhhhhhhhh',
    'Hhhhhh.hhh.hh.',
    'Hhhh...h......',
    'Hhhh..........',
    'Hhh...........',
    '.Hh...........',
  ],
  spiky: [
    '..H..H..H.....',
    '.HhHHhHHhH....',
    '.HhhhlllhhhHH.',
    'Hhhhhhllhhhhhh',
    'Hhhhhhhhhhhhhh',
    'Hhhhh.hh.hh.h.',
    'Hhhh..h.......',
    'Hhhh..........',
    'Hhh...........',
    '.H............',
  ],
  long: [
    '....HHHHH.....',
    '..HHhhhhhHH...',
    '.HhhhlllhhhH..',
    'Hhhhhhllhhhhh.',
    'Hhhhhhhhhhhhhh',
    'Hhhhhhh.hhhhh.',
    'Hhhh...h....h.',
    'Hhhh........h.',
    'Hhhh..........',
    'Hhhh..........',
  ],
};
const HAIR_FRONT_OF = { short: 'short', spiky: 'spiky', long: 'long', ponytail: 'short', bun: 'short', braid: 'long' };

function pixHex(col) { // beliebige Farbe → [r, g, b]
  if (col.startsWith('#')) { const v = parseInt(col.slice(1), 16); return [v >> 16, (v >> 8) & 255, v & 255]; }
  const m = col.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (m) {
    const h = +m[1] / 360, s = +m[2] / 100, l = +m[3] / 100, q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
    return [f(h + 1 / 3), f(h), f(h - 1 / 3)].map(v => Math.round(v * 255));
  }
  const v = col.match(/\d+/g) || [128, 128, 128]; return [+v[0], +v[1], +v[2]];
}
const pixRgb = (rgb, d = 0) => `rgb(${rgb.map(v => clamp(Math.round(v + d), 0, 255)).join(',')})`;

function pixFrame(n, pose, phase, now) {
  const t = now / 1000 + n.id * 0.37, g = n.gear || {}, wpn = g.weapon;
  const arms = n.sleeping ? 'sleep' : pose.arms;
  let q;
  if (n.sleeping) q = 'z';
  else if (pose.moving && arms !== 'fight') q = 'w' + (Math.round(phase / (TAU / 8)) & 7);
  else if (arms === 'chop') q = 'c' + Math.floor(((t / 1.15) % 1) * 8);
  else if (arms === 'build') q = 'b' + Math.floor(((t / 0.6) % 1) * 6);
  else if (arms === 'fight') q = 'f' + Math.floor(((t / 0.75) % 1) * 6);
  else if (arms === 'eat') q = 'e' + Math.floor(((t / 2.6) % 1) * 4);
  else if (arms === 'talk') q = 't' + Math.floor(((t / 1.4) % 1) * 4);
  else q = 'i' + (Math.floor(t * 1.2) & 1);
  const gearKey = SLOTS.map(sl => g[sl] ? g[sl].kind[0] + g[sl].rarity : '-').join('');
  const load = n.inventory.wood + (n.inventory.stone || 0) > 0 ? 1 : 0;
  const key = [n.id, arms, q, pose.tool || '', gearKey, n.profession, n.awakened ? n.cls || 'a' : '', n.color, n.mood > 55 ? 1 : 0, load].join('|');
  let cv = pixCache.get(key);
  if (cv) return cv;
  cv = document.createElement('canvas'); cv.width = PIX.W; cv.height = PIX.H;
  pixPaint(cv.getContext('2d'), n, arms, q, pose, load);
  if (pixCache.size > 1500) pixCache.delete(pixCache.keys().next().value);
  pixCache.set(key, cv);
  return cv;
}

function pixPaint(c, n, arms, q, pose, load) {
  const U = PIX.U, FX = PIX.FX, FY = PIX.FY, g = n.gear || {}, wpn = g.weapon;
  const skinRgb = pixHex(SKIN[n.id % SKIN.length]), hairRgb = pixHex(HAIR[(n.id * 7) % HAIR.length]), shirtRgb = pixHex(n.color);
  const pantsRgb = pixHex(n.awakened ? '#2c2a33' : ['#5a4632', '#4a5236', '#3d4a5c'][n.id % 3]), irisRgb = pixHex(EYES[(n.id * 3) % EYES.length]);
  const style = HAIR_STYLES[(n.id * 5 + 1) % HAIR_STYLES.length];
  const SK = pixRgb(skinRgb), SKD = pixRgb(skinRgb, -38), HR = pixRgb(hairRgb), HRD = pixRgb(hairRgb, -55), HRL = pixRgb(hairRgb, 60);
  const SH = pixRgb(shirtRgb), SHD = pixRgb(shirtRgb, -45), SHL = pixRgb(shirtRgb, 35), PA = pixRgb(pantsRgb), PAD = pixRgb(pantsRgb, -30);
  const INK = pixRgb(PIX.OUTLINE);
  const pr = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
  const pl = (x0, y0, x1, y1, w, col) => {
    c.fillStyle = col; x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, o = Math.floor(w / 2);
    let err = dx + dy;
    for (let k = 0; k < 200; k++) { c.fillRect(x0 - o, y0 - o, w, w); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
  };
  const poly = (pts, col) => {
    c.fillStyle = col; const ys = pts.map(p => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y < Math.ceil(Math.max(...ys)); y++) {
      const yc = y + 0.5, xs = [];
      for (let i = 0; i < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]; if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + (yc - ay) / (by - ay) * (bx - ax)); }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) { const xa = Math.round(xs[k]), xb = Math.round(xs[k + 1]); if (xb > xa) c.fillRect(xa, y, xb - xa, 1); }
    }
  };
  const tpl = (rows, ox, oy, pal) => { for (let r = 0; r < rows.length; r++) for (let k = 0; k < rows[r].length; k++) { const col = pal[rows[r][k]]; if (col) { c.fillStyle = col; c.fillRect(ox + k, oy + r, 1, 1); } } };

  if (arms === 'sleep') { // liegt unter einer Decke
    poly([[FX - 9, FY - 1], [FX + 10, FY - 1], [FX + 11, FY - 5], [FX - 8, FY - 6]], SH);
    pr(FX - 8, FY - 4, 18, 1, SHD);
    pr(FX - 15, FY - 7, 7, 6, SK); pr(FX - 16, FY - 8, 6, 4, HR);
    pixOutline(c);
    return;
  }

  // Skelett (wie die gezeichneten Figuren, aber in Pixeln)
  const fr = +q.slice(1) || 0, ease = x => x * x * (3 - 2 * x), lerp = (a, b, k) => a + (b - a) * k;
  const walking = q[0] === 'w', ph = walking ? fr / 8 * TAU : 0, sw = Math.sin(ph);
  const chopT = (fr + 0.5) / 8, hamT = (fr + 0.5) / 6, fightT = (fr + 0.5) / 6;
  let lean = walking ? 0.07 : 0, bob = walking ? Math.abs(sw) * 0.03 : (q === 'i1' ? 0.012 : 0);
  if (arms === 'chop') lean = chopT < 0.55 ? -0.1 * ease(chopT / 0.55) : chopT < 0.68 ? 0.15 : lerp(0.2, 0, ease((chopT - 0.68) / 0.32));
  if (arms === 'build') lean = 0.12;
  if (arms === 'fight' && (!wpn || !['bow', 'staff', 'spear'].includes(wpn.kind))) lean = fightT < 0.45 ? -0.08 : fightT < 0.6 ? 0.2 : 0.1;
  const hip = { x: FX, y: FY - (0.35 + bob) * U };
  const L1 = 0.17 * U, L2 = 0.17 * U, A1 = 0.15 * U, A2 = 0.14 * U;
  const sh = { x: hip.x + Math.sin(lean) * 0.25 * U, y: hip.y - Math.cos(lean) * 0.25 * U };
  const head = { x: sh.x + Math.sin(lean) * 0.12 * U + 0.5, y: sh.y - 0.2 * U };
  const fk = (a, bend) => { const e = { x: sh.x + Math.sin(a) * A1, y: sh.y + Math.cos(a) * A1 }; return { e, h: { x: e.x + Math.sin(a + bend) * A2, y: e.y + Math.cos(a + bend) * A2 } }; };
  const ik = tg => {
    let dx = tg.x - sh.x, dy = tg.y - sh.y, d = Math.hypot(dx, dy); const mx = (A1 + A2) * 0.999; if (d > mx) { dx *= mx / d; dy *= mx / d; d = mx; }
    const base = Math.atan2(dx, dy), al = Math.acos(clamp((A1 * A1 + d * d - A2 * A2) / (2 * A1 * Math.max(d, 0.01)), -1, 1)), ua = base - al;
    return { e: { x: sh.x + Math.sin(ua) * A1, y: sh.y + Math.cos(ua) * A1 }, h: { x: sh.x + dx, y: sh.y + dy } };
  };

  // Arme je Pose
  let front, back, tool = null;
  if (arms === 'chop') {
    let ua, bend;
    if (chopT < 0.55) { const k = ease(chopT / 0.55); ua = lerp(0.5, 2.85, k); bend = lerp(0.3, 0.95, k); }
    else if (chopT < 0.68) { ua = 1.4; bend = 0.4; }
    else if (chopT < 0.8) { ua = 0.75; bend = 0.05; }
    else { const k = ease((chopT - 0.8) / 0.2); ua = lerp(0.75, 0.5, k); bend = lerp(0.05, 0.3, k); }
    front = fk(ua, bend); tool = { kind: pose.tool || 'axe', h: front.h, a: ua + bend };
    back = ik({ x: front.h.x - Math.sin(ua + bend) * 2, y: front.h.y - Math.cos(ua + bend) * 2 });
  } else if (arms === 'build') {
    const k = hamT < 0.6 ? ease(hamT / 0.6) : hamT < 0.72 ? 1 - (hamT - 0.6) / 0.12 : 0;
    front = fk(1.0, lerp(0.15, 1.9, k)); tool = { kind: 'hammer', h: front.h, a: 1.0 + lerp(0.15, 1.9, k) }; back = fk(0.85, 0.5);
  } else if (arms === 'fight') {
    const kind = wpn ? wpn.kind : 'sword';
    if (kind === 'bow' || kind === 'staff') { front = ik({ x: sh.x + 0.26 * U, y: sh.y }); back = ik({ x: sh.x + (fightT < 0.7 ? 0.06 : 0.14) * U, y: sh.y + 0.03 * U }); tool = { kind, h: front.h, a: Math.PI, weapon: true }; }
    else if (kind === 'spear') { const k = fightT < 0.5 ? 0.2 : fightT < 0.7 ? 1 : 0.5; front = ik({ x: sh.x + (0.08 + 0.16 * k) * U, y: sh.y + 0.07 * U }); back = ik({ x: sh.x + 0.1 * k * U, y: sh.y + 0.11 * U }); tool = { kind, h: back.h, a: Math.PI / 2 + 0.05, weapon: true }; }
    else {
      let ua, bend;
      if (fightT < 0.45) { const k = ease(fightT / 0.45); ua = lerp(0.6, 2.9, k); bend = lerp(0.3, 0.6, k); }
      else if (fightT < 0.6) { ua = 1.5; bend = 0.3; }
      else { const k = ease((fightT - 0.6) / 0.4); ua = lerp(0.9, 0.6, k); bend = lerp(0.1, 0.3, k); }
      front = fk(ua, bend); back = fk(0.4, 0.6); tool = { kind, h: front.h, a: ua + bend, weapon: true };
    }
  } else if (arms === 'eat') {
    const m = fr % 2 ? 1 : 0;
    front = ik({ x: lerp(sh.x + 0.1 * U, head.x + 0.07 * U, m), y: lerp(sh.y + 0.13 * U, head.y + 0.08 * U, m) }); back = fk(0.1, 0.2);
  } else if (arms === 'talk') {
    front = fk(0.55 + [0, 0.3, 0.1, -0.2][fr % 4], 0.9 + [0, 0.4, -0.3, 0.2][fr % 4]); back = fk(0.08, 0.15);
  } else if (arms === 'pray') {
    front = ik({ x: sh.x + 0.1 * U, y: sh.y + 0.06 * U }); back = ik({ x: sh.x + 0.09 * U, y: sh.y + 0.07 * U });
  } else if (arms === 'carry' || load) {
    back = ik({ x: sh.x - 0.12 * U, y: sh.y - 0.02 * U }); front = walking ? fk(-sw * 0.4, 0.3) : fk(0.08, 0.2); // hält die Last hinter dem Rücken
  } else {
    front = walking ? fk(-sw * 0.5, 0.25 + Math.max(0, -sw) * 0.4) : fk(0.08, 0.15);
    back = walking ? fk(sw * 0.5, 0.25 + Math.max(0, sw) * 0.4) : fk(0.06, 0.15);
  }

  // Umhang, Rückenwaffe, lange Haare hinten
  if (g.cape) {
    const cc = pixRgb(pixHex(n.cls ? CLASSES[n.cls].color : '#8a2e3a'), -40), flap = walking ? 2 + Math.abs(sw) : 0;
    poly([[sh.x - 3, sh.y], [sh.x + 1, sh.y], [hip.x + 1, FY - 4], [hip.x - 6 - flap, FY - 3]], cc);
    pl(hip.x - 6 - flap, FY - 3, hip.x + 1, FY - 4, 1, RARITIES[g.cape.rarity].color);
  }
  if (wpn && arms !== 'fight') pixTool(c, pl, poly, pr, wpn.kind, wpn.rarity, { x: sh.x + 3, y: sh.y - 4 }, 0.55 + Math.PI, 14, true);
  const hx = Math.round(head.x - 6), hy = Math.round(head.y - 6);
  if (!g.helmet) {
    if (style === 'long' || style === 'braid') poly([[hx - 1, hy + 3], [hx + 4, hy + 3], [hx + 4, hy + 15], [hx - 2, hy + 14]], HRD);
    if (style === 'ponytail') { poly([[hx - 1, hy + 1], [hx + 2, hy + 1], [hx - 3, hy + 12 + (walking ? Math.round(sw) : 0)], [hx - 5, hy + 10]], HRD); }
    if (style === 'bun') { pr(hx - 1, hy - 3, 5, 4, HRD); }
    if (style === 'braid') for (let k = 0; k < 4; k++) pr(hx - 1, hy + 9 + k * 2, 3 - (k > 2 ? 1 : 0), 2, k % 2 ? HR : HRD);
  }

  // hinterer Arm und Beine
  const arm = (a, dark) => {
    pl(sh.x, sh.y, a.e.x, a.e.y, 4, INK); pl(a.e.x, a.e.y, a.h.x, a.h.y, 4, INK);
    pl(sh.x, sh.y, a.e.x, a.e.y, 2, dark ? SHD : SH); pl(a.e.x, a.e.y, a.h.x, a.h.y, 2, dark ? SHD : SH);
    pr(a.h.x - 1, a.h.y - 1, 2, 2, dark ? SKD : SK);
  };
  const leg = (p, dark) => {
    const a1 = walking ? Math.sin(p) * 0.5 : 0, kn = walking ? Math.max(0, Math.cos(p)) * 0.95 + 0.05 : 0.04;
    const k = { x: hip.x + (dark ? -1 : 1) + Math.sin(a1) * L1, y: hip.y + Math.cos(a1) * L1 }, a2 = a1 - kn;
    const f = { x: k.x + Math.sin(a2) * L2, y: Math.min(FY, k.y + Math.cos(a2) * L2) };
    pl(hip.x + (dark ? -1 : 1), hip.y, k.x, k.y, 3, dark ? PAD : PA); pl(k.x, k.y, f.x, f.y, 3, dark ? PAD : PA);
    const boot = g.boots ? pixRgb(pixHex(METAL[g.boots.rarity]), dark ? -80 : -50) : (dark ? '#22170f' : '#3b2a1e');
    pr(f.x - 1, f.y - 2, 4, 2, boot); if (g.boots) pr(f.x - 1, f.y - 4, 3, 2, boot);
  };
  arm(back, true);
  leg(ph + Math.PI, true); leg(ph, false);

  // Rumpf mit Cel-Schatten
  const tor = [[-4, -8], [4, -8], [5, 1], [-5, 1]].map(([x, y]) => { const ca = Math.cos(lean), sa = Math.sin(lean); return [hip.x + x * ca - y * sa, hip.y + x * sa + y * ca]; });
  poly(tor, SH);
  poly([tor[0], [lerp(tor[0][0], tor[1][0], 0.35), tor[0][1]], [lerp(tor[3][0], tor[2][0], 0.35), tor[3][1]], tor[3]], SHD); // Schattenseite (hinten)
  pr(Math.round(sh.x) + 1, Math.round(sh.y) + 1, 2, 3, SHL);
  pr(hip.x - 5, hip.y - 1, 10, 1, '#4a2f1c'); pr(hip.x, hip.y - 1, 1, 1, '#d9b45a'); // Gürtel
  pr(Math.round(sh.x) - 1, Math.round(sh.y), 2, 2, SKD); // Kragen
  if (!n.awakened && (n.profession === 'bauer' || n.profession === 'handwerker')) poly([[hip.x - 2, hip.y - 4], [hip.x + 4, hip.y - 4], [hip.x + 4, hip.y + 2], [hip.x - 2, hip.y + 2]], n.profession === 'bauer' ? '#e2d4b0' : '#6b4a2c');
  if (g.armor) {
    const mc = pixHex(METAL[g.armor.rarity]);
    poly(tor.map(([x, y], i) => [x + (i % 3 ? 0 : 0), y + (i < 2 ? 0 : -2)]), pixRgb(mc));
    poly([tor[0], [lerp(tor[0][0], tor[1][0], 0.4), tor[0][1]], [lerp(tor[3][0], tor[2][0], 0.4), tor[3][1] - 2], [tor[3][0], tor[3][1] - 2]], pixRgb(mc, -55));
    pr(Math.round(sh.x) + 1, Math.round(sh.y) + 1, 2, 2, '#ffffff');
    if (g.armor.rarity >= 2) pl(hip.x - 2, hip.y - 6, hip.x + 2, hip.y - 4, 1, RARITIES[g.armor.rarity].color);
  }

  // Holz/Stein auf dem Rücken (hinter dem Kopf)
  if (load && (arms === 'carry' || arms === 'none')) {
    const stone = n.inventory.stone > 0;
    for (let j = 0; j < 3; j++) { pr(sh.x - 9, sh.y - 1 - j * 2, 9, 2, stone ? (j % 2 ? '#8d897f' : '#a39d91') : (j % 2 ? '#6b4526' : '#7a5230')); pr(sh.x - 10, sh.y - 1 - j * 2, 1, 2, stone ? '#c2beb4' : '#d6a76d'); }
  }
  // Kopf
  pr(Math.round(sh.x) - 1, Math.round(sh.y) - 3, 3, 3, SKD); // Hals
  const happy = n.mood > 55;
  tpl(HEAD_TPL, hx, hy, { s: SK, S: SKD, L: '#1e1210', i: pixRgb(irisRgb), p: '#140c0a', w: '#ffffff', m: '#8a3a2e', b: happy ? '#f4a3a3' : SK });
  const hat = !n.awakened && CONFIG.professions[n.profession] ? CONFIG.professions[n.profession].hat : null;
  if (!g.helmet && hat !== 'straw' && hat !== 'cap' && hat !== 'miner') tpl(HAIR_TPL[HAIR_FRONT_OF[style]], hx - 1, hy - 2, { h: HR, H: HRD, l: HRL });
  if (g.helmet) {
    const r = g.helmet.rarity, mc = pixHex(METAL[r]);
    poly([[hx - 1, hy + 4], [hx - 1, hy + 1], [hx + 2, hy - 2], [hx + 9, hy - 2], [hx + 12, hy + 1], [hx + 12, hy + 3]], pixRgb(mc));
    pr(hx - 1, hy + 3, 14, 1, pixRgb(mc, -55)); pr(hx + 3, hy - 1, 3, 1, '#ffffff');
    if (r >= 1) pr(hx + 10, hy + 3, 1, 3, pixRgb(mc, -30));
    if (r >= 2) poly([[hx + 4, hy - 2], [hx + 1, hy - 6], [hx - 3, hy - 4], [hx + 2, hy - 2]], r >= 3 ? RARITIES[r].color : '#b03a3a');
    if (r >= 3) { pr(hx - 2, hy, 2, 2, '#ffe9a8'); pr(hx + 12, hy, 2, 2, '#ffe9a8'); }
    if (r === 4) pr(hx + 6, hy - 1, 2, 2, '#ff8fa3');
  } else if (hat === 'straw') {
    pr(hx - 3, hy + 1, 18, 2, '#e3c66b'); pr(hx + 1, hy - 3, 10, 4, '#e3c66b'); pr(hx + 1, hy, 10, 1, '#b0402f'); pr(hx - 3, hy + 2, 18, 1, '#b89a45');
  } else if (hat === 'cap') {
    tpl(HAIR_TPL.short.slice(5), hx - 1, hy + 3, { h: HR, H: HRD, l: HRL });
    pr(hx, hy - 2, 12, 5, '#b8342c'); pr(hx - 1, hy + 2, 14, 1, '#8f2620'); pr(hx + 4, hy - 4, 3, 2, '#e9e2d4');
  } else if (hat === 'miner') {
    tpl(HAIR_TPL.short.slice(5), hx - 1, hy + 3, { h: HR, H: HRD, l: HRL });
    pr(hx, hy - 2, 12, 5, '#c9a43a'); pr(hx - 1, hy + 2, 14, 1, '#8a6e22'); pr(hx + 8, hy - 1, 3, 2, '#fff3b0');
  } else if (hat === 'band') pr(hx, hy + 1, 12, 1, '#3f6fb0');

  // vorderer Arm, Schulterplatte, Werkzeug
  arm(front, false);
  if (g.armor && g.armor.rarity >= 1) { pr(sh.x - 1, sh.y - 1, 4, 3, pixRgb(pixHex(METAL[g.armor.rarity]))); pr(sh.x, sh.y - 1, 2, 1, '#ffffff'); }
  if (arms === 'eat') pr(front.h.x, front.h.y - 2, 2, 2, '#b8325f');
  if (tool) pixTool(c, pl, poly, pr, tool.kind, wpn && tool.weapon ? wpn.rarity : 0, tool.h, tool.a, tool.weapon ? 13 : 9, !!tool.weapon);
  pixOutline(c);
}

/** Werkzeug/Waffe in Pixeln, vom Griff (Hand) in Richtung a (0 = nach unten). */
function pixTool(c, pl, poly, pr, kind, rarity, h, a, len, weapon) {
  const dx = Math.sin(a), dy = Math.cos(a), nx = -dy, ny = dx, mc = METAL[rarity] || '#aab3bb', rc = RARITIES[rarity] ? RARITIES[rarity].color : '#ccc';
  const at = (d, o = 0) => [h.x + dx * d + nx * o, h.y + dy * d + ny * o];
  const shaft = (from, to, col, w = 1) => { const [x0, y0] = at(from), [x1, y1] = at(to); pl(x0, y0, x1, y1, w, col); };
  switch (kind) {
    case 'axe': shaft(-1, len, '#8a6239'); poly([at(len - 4, 0), at(len - 4, 4), at(len, 4), at(len, 0)], '#aab3bb'); break;
    case 'pick': shaft(-1, len, '#8a6239'); { const [x0, y0] = at(len, -4), [x1, y1] = at(len, 4); pl(x0, y0, x1, y1, 1, '#8a8f96'); } break;
    case 'hoe': shaft(-1, len, '#8a6239'); poly([at(len, 0), at(len, 4), at(len - 2, 4)], '#9aa0a6'); break;
    case 'sickle': shaft(-1, 3, '#8a6239'); for (let k = 0; k < 6; k++) { const [x, y] = at(3 + k * 0.9, Math.sin(k / 5 * Math.PI) * 3); pr(x, y, 1, 1, '#c9ced4'); } break;
    case 'hammer': shaft(-1, len, weapon ? '#6b4526' : '#8a6239'); poly([at(len - 2, -3), at(len - 2, 3), at(len + 1, 3), at(len + 1, -3)], mc); if (rarity >= 2) shaft(len - 1, len, rc, 2); break;
    case 'sword': case 'blade': shaft(-2, 1, '#5a3a22', 2); { const [gx0, gy0] = at(1, -2), [gx1, gy1] = at(1, 2); pl(gx0, gy0, gx1, gy1, 1, rc); } shaft(2, len, mc, 2); shaft(3, len - 1, '#ffffff'); break;
    case 'staff': shaft(-2, len, '#7a5230'); { const [x, y] = at(len + 1); pr(x - 1, y - 1, 3, 3, rc); pr(x, y - 1, 1, 1, '#ffffff'); } break;
    case 'spear': shaft(-4, len, '#7a5230'); poly([at(len, -1.5), at(len + 4, 0), at(len, 1.5)], mc); poly([at(len - 2, 0), at(len - 5, 3), at(len - 6, 0)], rc); break;
    case 'bow': for (let k = -len / 2; k <= len / 2; k++) { const [x, y] = at(k, Math.cos(k / len * Math.PI) * 3); pr(x, y, 1, 1, '#6b4526'); } { const [x0, y0] = at(-len / 2), [x1, y1] = at(len / 2); pl(x0, y0, x1, y1, 1, '#e8e2d0'); } break;
  }
}

/** Dunkler Umriss um alles Gezeichnete (klassischer Pixel-Art-Rand). */
function pixOutline(c) {
  const W = PIX.W, H = PIX.H, img = c.getImageData(0, 0, W, H), d = img.data, [r, g, b] = PIX.OUTLINE;
  const op = i => d[i * 4 + 3] > 40, add = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (op(i)) continue;
    if ((x > 0 && op(i - 1)) || (x < W - 1 && op(i + 1)) || (y > 0 && op(i - W)) || (y < H - 1 && op(i + W))) add.push(i);
  }
  for (const i of add) { d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = 255; }
  c.putImageData(img, 0, 0);
}

/** Pixel-Figur ins Bild setzen (scharf vergrößert), plus Aura, Schimmer und Pfeile. */
Renderer.prototype.drawSettlerPixel = function (c, n, px, py, s, now, pose, phase) {
  const cv = pixFrame(n, pose, phase, now), k = (0.66 * s) / 26, t = now / 1000 + n.id * 0.37;
  const fx = px, fy = py + s * 0.38;
  if (n.awakened && !n.sleeping) { // Aura
    const col = n.cls ? CLASSES[n.cls].color : '#8fd3ff', gr = c.createRadialGradient(fx, fy, 0, fx, fy, s * 0.36);
    gr.addColorStop(0, col + '99'); gr.addColorStop(1, col + '00');
    c.globalAlpha = 0.75 + Math.sin(t * 3) * 0.25; c.fillStyle = gr; c.beginPath(); c.ellipse(fx, fy, s * 0.36, s * 0.12, 0, 0, TAU); c.fill(); c.globalAlpha = 1;
  }
  const g = n.gear || {}, topR = SLOTS.reduce((m, sl) => Math.max(m, g[sl] ? g[sl].rarity : -1), -1);
  if (topR >= 3 && !n.sleeping) { const gc = RARITIES[topR].color, gr = c.createRadialGradient(fx, fy - s * 0.3, 0, fx, fy - s * 0.3, s * 0.5); gr.addColorStop(0, gc + '50'); gr.addColorStop(1, gc + '00'); c.fillStyle = gr; c.fillRect(fx - s * 0.5, fy - s * 0.85, s, s); }
  c.save(); c.imageSmoothingEnabled = false;
  c.translate(fx, fy); c.scale(pose.facing * k, k);
  c.drawImage(cv, -PIX.FX, -PIX.FY);
  c.restore();
  // Fernkampf: Pfeil oder Zauberkugel fliegt
  const wpn = g.weapon, fightT = (t / 0.75) % 1;
  if (pose.arms === 'fight' && n.foe && wpn && (wpn.kind === 'bow' || wpn.kind === 'staff') && fightT > 0.7) {
    const q = (fightT - 0.7) / 0.3, sx = fx + pose.facing * s * 0.25, sy = fy - s * 0.4, tx = (n.foe.x + 0.5) * s, ty = (n.foe.y + 0.5) * s;
    const ax = sx + (tx - sx) * q, ay = sy + (ty - sy) * q;
    if (wpn.kind === 'bow') { c.strokeStyle = '#e8e2d0'; c.lineWidth = Math.max(1, s * 0.025); c.beginPath(); c.moveTo(ax - Math.sign(tx - sx) * s * 0.15, ay); c.lineTo(ax, ay); c.stroke(); }
    else { c.fillStyle = RARITIES[wpn.rarity].color; c.beginPath(); c.arc(ax, ay, s * 0.06, 0, TAU); c.fill(); }
  }
};

