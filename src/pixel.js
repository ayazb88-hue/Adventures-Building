/* =====================================================================
 * 8c) PIXEL-FIGUREN
 * Siedler als Pixel-Art: jede Pose wird auf einem 40×40-Raster mit
 * Pixel-Linien gezeichnet, bekommt automatisch einen dunklen Umriss und
 * wird zwischengespeichert. Animation in festen Bildern (Laufen 8, Hacken 8 …).
 * ===================================================================== */
const PIX = { W: 40, H: 40, FX: 20, FY: 37, U: 30, OUTLINE: [36, 22, 15] };
const pixCache = new Map();
let PXR = 1, PXMOOD = null; // Auflösung beim Zeichnen (1 = 40×40, 2 = HD 80×80) und Gesichtsausdruck
const pxq = v => Math.round(v * PXR) / PXR;
/** Vorlage (Zeichenraster) mit Scale2x verdoppeln – runde Kanten für Kopf und Haare in HD. */
const tplCache = new Map();
function tplHD(rows) {
  let out = tplCache.get(rows); if (out) return out;
  const h = rows.length, w = Math.max(...rows.map(r => r.length)), at = (x, y) => (rows[Math.max(0, Math.min(h - 1, y))][Math.max(0, Math.min(w - 1, x))] || '.');
  out = Array.from({ length: h * 2 }, () => Array(w * 2).fill('.'));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const P = at(x, y), A = at(x, y - 1), B = at(x + 1, y), C = at(x - 1, y), D = at(x, y + 1);
    out[y * 2][x * 2] = C === A && C !== D && A !== B ? A : P;
    out[y * 2][x * 2 + 1] = A === B && A !== C && B !== D ? B : P;
    out[y * 2 + 1][x * 2] = D === C && D !== B && C !== A ? C : P;
    out[y * 2 + 1][x * 2 + 1] = B === D && B !== A && D !== C ? D : P;
  }
  out = out.map(r => r.join('')); tplCache.set(rows, out); return out;
}
/** Vorlage zeichnen – in HD aus der verdoppelten Vorlage mit halben Rasterpunkten. */
function pxTpl(c, rows, ox, oy, pal) {
  const R = PXR, src = R === 2 ? tplHD(rows) : rows;
  for (let r = 0; r < src.length; r++) for (let k = 0; k < src[r].length; k++) { const col = pal[src[r][k]]; if (col) { c.fillStyle = col; c.fillRect(ox + k / R, oy + r / R, 1 / R, 1 / R); } }
}

/* ---- HD-Gesichter als Pixel-Vorlagen (halbe Rasterpunkte, scharf) ----
 * L Wimper/Linie, W Augenweiß, w Glanz, d Iris dunkel, i Iris, j Iris hell, p Pupille. Vorlagen für das linke Auge (außen = links). */
const EYE_HD = {
  normal:       ['.LLLLLL', 'LLddddL', 'WwwdppW', 'WwddppW', 'WiiiiwW', '.jjjjj.', '..LLL..'],
  blink:        ['.......', '.......', '.......', 'LLLLLLL', '.L...L.', '.......', '.......'],
  lachen:       ['.......', '.......', '..LLL..', '.L...L.', 'L.....L', '.......', '.......'],
  wut:          ['LL.....', 'WLLL...', 'WwdLLL.', 'WwddpLL', 'WiiipwW', '.jjjjj.', '..LLL..'],
  traurig:      ['.....LL', '...LLLW', '.LLdpwW', 'LWddppW', 'WiiiiwW', '.jjjjj.', '..LLL..'],
  entschlossen: ['.......', '.......', 'LLLLLLL', 'WwdppdW', 'WiiipwW', '.jjjjj.', '..LLL..'],
  spott:        ['.......', '.......', '.LLLLLL', 'LwdppdW', 'WiiipwW', '.jjjjj.', '..LLL..'],
  schock:       ['.LLLLL.', 'LWWWWWL', 'WWdddWW', 'WWdpdWW', 'WWdddWW', '.WWWWW.', '..LLL..'],
};
const MOUTH_HD = {
  happy: ['L..L', '.LL.'], neutral: ['LLLL'], lachen: ['LLLL', 'LrrL', '.LL.'], wut: ['.LL.', 'L..L'], traurig: ['.LL.', 'L..L'],
  schock: ['.LL.', 'LrrL', '.LL.'], spott: ['...L', 'LLL.'], entschlossen: ['LLL.'],
};
const mirror = rows => rows.map(r => r.split('').reverse().join(''));
/** Zeichenraster in halben Punkten setzen (scharf, ohne Kantenglättung). */
function pxCells(c, rows, ox, oy, pal) { for (let r = 0; r < rows.length; r++) for (let k = 0; k < rows[r].length; k++) { const col = pal[rows[r][k]]; if (col) { c.fillStyle = col; c.fillRect(ox + k / 2, oy + r / 2, 0.5, 0.5); } } }
/** HD-Gesicht: Augen, Brauen, Mund, Wangen, Träne – je nach Gefühl. eyes: [x, y, gespiegelt, Spalten] (x/y = linke obere Ecke). */
function pxFaceHD(c, eyes, mouth, mood, happy, blink, iris, skin, hairDark, front) {
  const key = blink ? 'blink' : (mood && EYE_HD[mood]) ? mood : 'normal';
  const pal = { L: '#1e1210', W: '#f4f1ec', w: '#ffffff', d: pixRgb(iris, -60), i: pixRgb(iris), j: pixRgb(iris, 55), p: '#120a08' };
  for (const [ex, ey, mir, cols] of eyes) {
    c.fillStyle = skin; c.fillRect(ex - 0.5, ey - 0.5, (cols || 7) / 2 + 1, 4.5); // alte Pixel-Augen übermalen
    let rows = EYE_HD[key]; if (mir) rows = mirror(rows); if (cols && cols < 7) rows = rows.map(r => mir ? r.slice(0, cols) : r.slice(7 - cols));
    pxCells(c, rows, ex, ey, pal);
    // Brauen: 7 halbe Punkte, Neigung je Gefühl (innen = zur Gesichtsmitte)
    const tilt = { wut: 1, traurig: -1, entschlossen: 0.5, schock: -0.5 }[mood] || 0, n = cols || 7;
    for (let k = 0; k < n; k++) { const t = mir ? 1 - k / (n - 1) : k / (n - 1), dy = Math.round(tilt * t * 2) / 2 - (mood === 'schock' ? 0.5 : 0); c.fillStyle = hairDark; c.fillRect(ex + k / 2, ey - 1.5 + dy, 0.5, 0.5); }
  }
  const mk = mood && MOUTH_HD[mood] ? mood : happy ? 'happy' : 'neutral', mr = MOUTH_HD[mk];
  pxCells(c, mr, mouth[0] - mr[0].length / 4, mouth[1], { L: '#6a241c', r: '#c0445a' });
  if (happy || mood === 'lachen' || mood === 'spott') for (const [ex, ey, mir, cols] of eyes) { if (cols && cols < 7) continue; c.fillStyle = 'rgba(255,120,130,.55)'; c.fillRect(ex + 0.5, ey + 4, 2, 0.5); }
  if (mood === 'traurig') { const [ex, ey] = eyes[eyes.length - 1]; c.fillStyle = '#7ac8ff'; c.fillRect(ex + 1, ey + 3.5, 0.5, 1.5); c.fillRect(ex + 0.5, ey + 4.5, 1.5, 0.5); }
}
/** Anime-Glanzbögen auf den Haaren (scharfe helle Striche). */
function pxHairShine(c, x0, x1, y, col) { c.fillStyle = col; const w = x1 - x0; for (const [a, b] of [[0.12, 0.36], [0.52, 0.76]]) { const xa = Math.round((x0 + w * a) * 2) / 2, xb = Math.round((x0 + w * b) * 2) / 2; c.fillRect(xa + 0.5, y, xb - xa - 1, 0.5); c.fillRect(xa, y + 0.5, 0.5, 0.5); c.fillRect(xb - 0.5, y + 0.5, 0.5, 0.5); } }
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

function pixFrame(n, pose, phase, now, R = 1) {
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
  else if (arms === 'cheer') q = 'j' + (Math.floor(t * 5) & 1);
  else q = (now + n.id * 913) % 3900 < 150 ? 'ib' : 'i' + (Math.floor(t * 1.2) & 1);
  const view = n.sleeping ? 'side' : pose.view || 'side';
  const gearKey = SLOTS.map(sl => g[sl] ? g[sl].kind[0] + g[sl].rarity : '-').join('');
  const load = n.inventory.wood + (n.inventory.stone || 0) > 0 ? 1 : 0;
  const key = [n.id, view, arms, q, pose.tool || '', gearKey, n.profession, n.awakened ? n.cls || 'a' : '', n.color, n.mood > 55 ? 1 : 0, load, R, pose.mood || ''].join('|');
  let cv = pixCache.get(key);
  if (cv) return cv;
  cv = document.createElement('canvas'); cv.width = PIX.W * R; cv.height = PIX.H * R;
  const ctx = cv.getContext('2d'); ctx.scale(R, R); PXR = R; PXMOOD = pose.mood || null;
  try {
    if (view === 'side') pixPaint(ctx, n, arms, q, pose, load);
    else pixPaintFront(ctx, n, view, q, load);
  } finally { PXR = 1; PXMOOD = null; }
  if (pixCache.size > 1500) pixCache.delete(pixCache.keys().next().value);
  pixCache.set(key, cv);
  return cv;
}

function pixPaint(c, n, arms, q, pose, load) {
  const U = PIX.U, FX = PIX.FX, FY = PIX.FY, g = n.gear || {}, wpn = g.weapon;
  const Pal = pixPalette(n), style = HAIR_STYLES[(n.id * 5 + 1) % HAIR_STYLES.length], outfit = pixOutfit(n, g);
  const { SK, SKD, HR, HRD, HRL, SH, SHD, SHL, PA, PAD } = Pal;
  const INK = pixRgb(PIX.OUTLINE), R = PXR;
  const pr = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(pxq(x), pxq(y), Math.max(1 / R, pxq(w)), Math.max(1 / R, pxq(h))); };
  const pl = (x0, y0, x1, y1, w, col) => { // Linie auf dem (in HD feineren) Raster
    c.fillStyle = col; x0 = Math.round(x0 * R); y0 = Math.round(y0 * R); x1 = Math.round(x1 * R); y1 = Math.round(y1 * R);
    const W2 = Math.max(1, Math.round(w * R)), dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, o = Math.floor(W2 / 2);
    let err = dx + dy;
    for (let k = 0; k < 400; k++) { c.fillRect((x0 - o) / R, (y0 - o) / R, W2 / R, W2 / R); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
  };
  const poly = (pts, col) => {
    c.fillStyle = col; const ys = pts.map(p => p[1] * R);
    for (let y = Math.floor(Math.min(...ys)); y < Math.ceil(Math.max(...ys)); y++) {
      const yc = (y + 0.5) / R, xs = [];
      for (let i = 0; i < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]; if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + (yc - ay) / (by - ay) * (bx - ax)); }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) { const xa = Math.round(xs[k] * R), xb = Math.round(xs[k + 1] * R); if (xb > xa) c.fillRect(xa / R, y / R, (xb - xa) / R, 1 / R); }
    }
  };
  const tpl = (rows, ox, oy, pal) => pxTpl(c, rows, ox, oy, pal);

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
  if (outfit === 'waldlaeufer') { pl(sh.x - 5, sh.y - 3, sh.x - 2, sh.y + 7, 3, '#7a5230'); pr(sh.x - 6, sh.y - 5, 1, 2, '#e8e2d0'); pr(sh.x - 4, sh.y - 6, 1, 2, '#c0392b'); }
  arm(back, true);
  leg(ph + Math.PI, true); leg(ph, false);

  // Rumpf mit Cel-Schatten
  const tor = [[-4, -8], [4, -8], [5, 1], [-5, 1]].map(([x, y]) => { const ca = Math.cos(lean), sa = Math.sin(lean); return [hip.x + x * ca - y * sa, hip.y + x * sa + y * ca]; });
  poly(tor, SH);
  poly([tor[0], [lerp(tor[0][0], tor[1][0], 0.35), tor[0][1]], [lerp(tor[3][0], tor[2][0], 0.35), tor[3][1]], tor[3]], SHD); // Schattenseite (hinten)
  pr(Math.round(sh.x) + 1, Math.round(sh.y) + 1, 2, 3, SHL);
  pr(hip.x - 5, hip.y - 1, 10, 1, '#4a2f1c'); pr(hip.x, hip.y - 1, 1, 1, '#d9b45a'); // Gürtel
  pr(Math.round(sh.x) - 1, Math.round(sh.y), 2, 2, SKD); // Kragen
  if (outfit === 'hueter') { poly([tor[3], tor[2], [tor[2][0] + 1, tor[2][1] + 7], [tor[3][0] - 1, tor[3][1] + 7]], SH); pr(tor[3][0] - 1, tor[3][1], 2, 7, SHD); }
  if (outfit === 'schmied' || outfit === 'sternenschmied') poly([[sh.x - 1, sh.y + 2], [sh.x + 4, sh.y + 2], [hip.x + 5, hip.y + 4], [hip.x - 1, hip.y + 4]], '#5e3b22');
  if (outfit === 'herold') { pr(sh.x - 3, sh.y - 1, 7, 2, '#c0392b'); pr(sh.x - 4, sh.y + 1, 2, 5, '#a02e22'); }
  if (outfit === 'torwandler') pl(tor[0][0], tor[0][1], tor[3][0], tor[3][1] + 3, 1, '#a98bff');
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
  const blink = q === 'ib';
  tpl(HEAD_TPL, hx, hy, { s: SK, S: SKD, L: blink ? SK : '#1e1210', i: blink ? SK : Pal.IR, p: blink ? SK : '#140c0a', w: blink ? SK : '#ffffff', m: '#8a3a2e', b: happy ? '#f4a3a3' : SK });
  if (R === 2) { // HD-Gesicht im Profil: zwei Augen (das ferne schmaler), Brauen, Mund
    pxFaceHD(c, [[hx + 4, hy + 4, true, 4], [hx + 7.5, hy + 4, true, 7]], [hx + 9.5, hy + 8.5], PXMOOD, happy, blink, pixHex(Pal.IR), SK, Pal.HRD, false);
  } else if (blink) { pr(hx + 4, hy + 6, 2, 1, '#1e1210'); pr(hx + 8, hy + 6, 3, 1, '#1e1210'); }
  const hat = !n.awakened && CONFIG.professions[n.profession] ? CONFIG.professions[n.profession].hat : null;
  if (!g.helmet && hat !== 'straw' && hat !== 'cap' && hat !== 'miner') { tpl(HAIR_TPL[HAIR_FRONT_OF[style]], hx - 1, hy - 2, { h: HR, H: HRD, l: HRL }); if (R === 2) pxHairShine(c, hx + 1, hx + 10, hy - 1, HRL); }
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


// Vorder- und Rückansicht
const HEAD_FRONT = [
  '...ssssss...',
  '..ssssssss..',
  '.ssssssssss.',
  '.ssssssssss.',
  '.sLLLssLLLs.',
  '.swiisswiis.',
  '.sipissipis.',
  '.siiissiiis.',
  '.sbssmmssbs.',
  '..ssssssss..',
  '...SssssS...',
];
const HAIR_FRONT_TPL = [
  '....HHHHHH....',
  '..HHhhhhhhHH..',
  '.HhhhllllhhhH.',
  'HhhhhhllhhhhhH',
  'HhhhhhhhhhhhhH',
  'Hhh.hhh.hhh.hH',
  'Hhh..h....h.hH',
  'Hh..........hH',
  'Hh..........hH',
  '.H..........H.',
];
const HAIR_BACK_TPL = [
  '....HHHHHH....',
  '..HHhhhhhhHH..',
  '.HhhhllllhhhH.',
  'HhhhhhllhhhhhH',
  'HhhhhhhhhhhhhH',
  'HhhhhhhhhhhhhH',
  'HhhhhhhhhhhhhH',
  'HhhhhhhhhhhhhH',
  'HHhhhhhhhhhhHH',
  '.HHhhhhhhhhHH.',
  '...HHHHHHHH...',
];

/** Farbpalette eines Siedlers mit farbverschobenen Schatten (violett) und Lichtern (gold). */
function pixPalette(n) {
  const sh = (rgb, d) => { const k = Math.min(1, Math.abs(d) / 120), tgt = d < 0 ? [45, 32, 80] : [255, 240, 205]; return `rgb(${rgb.map((v, i) => Math.round(v * (1 - k) + tgt[i] * k)).join(',')})`; };
  const rival = n.sim && n.sim.story && n.sim.story.rivalId === n.id; // der Rivale: silbernes Haar, dunkle Kleidung
  const skin = pixHex(SKIN[n.id % SKIN.length]), hair = pixHex(rival ? '#dfe4ee' : HAIR[(n.id * 7) % HAIR.length]), shirt = pixHex(rival ? '#2a2838' : n.color);
  const pants = pixHex(n.awakened ? '#2c2a33' : ['#5a4632', '#4a5236', '#3d4a5c'][n.id % 3]), iris = pixHex(EYES[(n.id * 3) % EYES.length]);
  return { SK: sh(skin, 0), SKD: sh(skin, -48), HR: sh(hair, 0), HRD: sh(hair, -60), HRL: sh(hair, 55), SH: sh(shirt, 0), SHD: sh(shirt, -55), SHL: sh(shirt, 40),
    PA: sh(pants, 0), PAD: sh(pants, -40), IR: sh(iris, 0), sh };
}

/** Klassen-Kleidung der Erwachten ohne Rüstung. */
function pixOutfit(n, g) { return n.awakened && !g.armor ? (n.cls || null) : null; }

function pixPaintFront(c, n, view, q, load) {
  const FX = PIX.FX, FY = PIX.FY, g = n.gear || {}, P = pixPalette(n), front = view === 'down';
  const style = HAIR_STYLES[(n.id * 5 + 1) % HAIR_STYLES.length], outfit = pixOutfit(n, g), R = PXR;
  const pr = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(pxq(x), pxq(y), Math.max(1 / R, pxq(w)), Math.max(1 / R, pxq(h))); };
  const tpl = (rows, ox, oy, pal) => pxTpl(c, rows, ox, oy, pal);
  const walking = q[0] === 'w', fr = +q.slice(1) || 0, s1 = walking ? Math.sin(fr / 8 * TAU) : 0;
  const cheer = q[0] === 'j', bob = walking ? Math.round(Math.abs(s1)) : cheer ? (q === 'j1' ? 3 : 0) : (q === 'i1' ? 1 : 0);
  const hipY = FY - 10 - bob, shY = hipY - 8, hx = FX - 6, hy = shY - 11;
  const boot = dark => g.boots ? P.sh(pixHex(METAL[g.boots.rarity]), dark ? -90 : -60) : (dark ? '#22170f' : '#3b2a1e');
  // Umhang hinten (Vorderansicht: an den Seiten sichtbar)
  if (g.cape && front) { const cc = P.sh(pixHex(n.cls ? CLASSES[n.cls].color : '#8a2e3a'), -45); pr(FX - 7, shY + 1, 14, FY - shY - 4, cc); }
  // Rückenwaffe in der Vorderansicht: Griff über der Schulter
  if (g.weapon && front) { pr(FX + 5, shY - 5, 1, 6, '#6b4526'); pr(FX + 4, shY - 6, 3, 1, RARITIES[g.weapon.rarity].color); }
  if (outfit === 'waldlaeufer' && front) { pr(FX - 6, shY - 4, 1, 4, '#e8e2d0'); pr(FX - 5, shY - 5, 1, 5, '#e8e2d0'); pr(FX - 7, shY - 5, 2, 1, '#c0392b'); }
  if (load && front) for (let j = 0; j < 2; j++) pr(FX - 8, shY - 2 - j * 2, 16, 2, n.inventory.stone ? '#8d897f' : '#7a5230');
  // Haare hinten (lang) in der Vorderansicht
  if (!g.helmet && front && (style === 'long' || style === 'braid')) pr(hx, hy + 5, 12, 12, P.HRD);
  // Beine (abwechselnd angehoben)
  const liftL = walking ? Math.round(Math.max(0, s1) * 2) : 0, liftR = walking ? Math.round(Math.max(0, -s1) * 2) : 0;
  pr(FX - 4, hipY, 3, FY - hipY - 1 - liftL, P.PAD); pr(FX + 1, hipY, 3, FY - hipY - 1 - liftR, P.PA);
  pr(FX - 4, FY - 2 - liftL, 3, 2, boot(true)); pr(FX + 1, FY - 2 - liftR, 3, 2, boot(false));
  // Rumpf
  c.fillStyle = P.SH; c.beginPath();
  for (let y = shY; y <= hipY + 1; y++) { const w = 5 + Math.round((y - shY) / (hipY - shY + 1) * 1); c.fillRect(FX - w, y, w * 2, 1); }
  pr(FX - 6, shY + 1, 2, hipY - shY, P.SHD); pr(FX + 3, shY + 1, 2, 2, P.SHL);
  if (outfit === 'hueter') pr(FX - 6, hipY - 1, 12, 7, P.SH), pr(FX - 6, hipY - 1, 2, 7, P.SHD); // Gewand bis zu den Knien
  pr(FX - 6, hipY - 1, 12, 1, '#4a2f1c'); pr(FX - 1, hipY - 1, 2, 1, '#d9b45a');
  if (front) {
    pr(FX - 1, shY, 2, 2, P.SKD); // Kragen
    if (!n.awakened && (n.profession === 'bauer' || n.profession === 'handwerker')) pr(FX - 3, hipY - 4, 6, 7, n.profession === 'bauer' ? '#e2d4b0' : '#6b4a2c');
    if (outfit === 'schmied' || outfit === 'sternenschmied') pr(FX - 3, shY + 2, 6, hipY - shY + 4, '#5e3b22');
    if (outfit === 'herold') pr(FX - 4, shY - 1, 8, 2, '#c0392b'), pr(FX + 2, shY + 1, 2, 4, '#c0392b');
    if (outfit === 'torwandler') pr(FX - 6, shY, 1, hipY - shY + 6, '#a98bff'), pr(FX + 5, shY, 1, hipY - shY + 6, '#a98bff');
  } else {
    if (g.cape) { const cc = P.sh(pixHex(n.cls ? CLASSES[n.cls].color : '#8a2e3a'), -20); pr(FX - 6, shY, 12, FY - shY - 3, cc); pr(FX - 6, FY - 4, 12, 1, RARITIES[g.cape.rarity].color); }
    if (g.weapon) { for (let k = 0; k < 10; k++) pr(FX - 4 + k, shY + 8 - k, 1, 1, k < 3 ? '#6b4526' : METAL[g.weapon.rarity]); }
    if (outfit === 'waldlaeufer') { pr(FX + 1, shY - 3, 3, 10, '#7a5230'); pr(FX + 1, shY - 4, 1, 2, '#e8e2d0'); pr(FX + 3, shY - 5, 1, 2, '#c0392b'); }
    if (load) for (let j = 0; j < 3; j++) pr(FX - 5, shY + 1 + j * 2, 10, 2, n.inventory.stone ? (j % 2 ? '#8d897f' : '#a39d91') : (j % 2 ? '#6b4526' : '#7a5230'));
  }
  if (g.armor) {
    const mc = pixHex(METAL[g.armor.rarity]);
    pr(FX - 5, shY + 1, 10, hipY - shY - 2, P.sh(mc, 0)); pr(FX - 5, shY + 1, 3, hipY - shY - 2, P.sh(mc, -60)); pr(FX + 1, shY + 2, 2, 2, '#ffffff');
    if (g.armor.rarity >= 2) pr(FX - 1, shY + 2, 2, hipY - shY - 4, RARITIES[g.armor.rarity].color);
    pr(FX - 8, shY - 1, 4, 3, P.sh(mc, 0)); pr(FX + 4, shY - 1, 4, 3, P.sh(mc, 0)); // Schulterplatten
  }
  // Arme an den Seiten, schwingen beim Gehen
  const swing = walking ? Math.round(s1 * 2) : 0;
  for (const [ax, sw, dark] of [[FX - 8, swing, true], [FX + 6, -swing, false]]) {
    if (cheer) { pr(ax, shY - 7, 2, 8, dark ? P.SHD : P.SH); pr(ax, shY - 9, 2, 2, dark ? P.SKD : P.SK); continue; } // Arme hoch!
    pr(ax, shY + 1, 2, 7 + sw, dark ? P.SHD : P.SH);
    pr(ax, shY + 8 + sw, 2, 2, dark ? P.SKD : P.SK);
  }
  // Kopf
  pr(FX - 1, shY - 1, 2, 2, P.SKD);
  const blink = q === 'ib', happy = n.mood > 55;
  if (front) {
    tpl(HEAD_FRONT, hx, hy, { s: P.SK, S: P.SKD, L: blink ? P.SK : '#1e1210', i: blink ? P.SK : P.IR, p: blink ? P.SK : '#140c0a', w: blink ? P.SK : '#ffffff', m: '#8a3a2e', b: happy ? '#f4a3a3' : P.SK });
    if (R === 2) { // HD-Gesicht von vorn: große Anime-Augen
      pxFaceHD(c, [[hx + 1.5, hy + 4, false, 7], [hx + 7, hy + 4, true, 7]], [hx + 6, hy + 8.5], PXMOOD, happy, blink, pixHex(P.IR), P.SK, P.HRD, true);
    } else if (blink) { pr(hx + 2, hy + 6, 3, 1, '#1e1210'); pr(hx + 7, hy + 6, 3, 1, '#1e1210'); }
  } else tpl(HAIR_BACK_TPL, hx - 1, hy - 2, { h: P.HR, H: P.HRD, l: P.HRL });
  const hat = !n.awakened && CONFIG.professions[n.profession] ? CONFIG.professions[n.profession].hat : null;
  if (!g.helmet && front && hat !== 'straw' && hat !== 'cap' && hat !== 'miner') { tpl(HAIR_FRONT_TPL, hx - 1, hy - 2, { h: P.HR, H: P.HRD, l: P.HRL }); if (R === 2) pxHairShine(c, hx + 0.5, hx + 11.5, hy - 1, P.HRL); }
  if (!g.helmet && !front) {
    if (style === 'ponytail') pr(FX - 1, hy + 9, 3, 6, P.HRD);
    if (style === 'bun') pr(FX - 2, hy - 4, 5, 3, P.HRD);
    if (style === 'long' || style === 'braid') pr(hx, hy + 8, 12, 7, P.HR);
  }
  if (g.helmet) {
    const r = g.helmet.rarity, mc = pixHex(METAL[r]);
    pr(hx - 1, hy - 2, 14, 6, P.sh(mc, 0)); pr(hx - 1, hy + 3, 14, 1, P.sh(mc, -60)); pr(hx + 2, hy - 1, 3, 1, '#ffffff');
    if (front && r >= 1) pr(FX - 1, hy + 3, 2, 3, P.sh(mc, -30));
    if (r >= 2) pr(FX - 1, hy - 6, 2, 4, r >= 3 ? RARITIES[r].color : '#b03a3a');
    if (r >= 3) { pr(hx - 3, hy - 1, 2, 3, '#ffe9a8'); pr(hx + 13, hy - 1, 2, 3, '#ffe9a8'); }
    if (r === 4 && front) pr(FX - 1, hy - 1, 2, 2, '#ff8fa3');
  } else if (hat === 'straw') { pr(hx - 3, hy + 1, 18, 2, '#e3c66b'); pr(hx + 1, hy - 3, 10, 4, '#e3c66b'); pr(hx + 1, hy, 10, 1, '#b0402f'); }
  else if (hat === 'cap') { pr(hx, hy - 2, 12, 5, '#b8342c'); pr(hx - 1, hy + 2, 14, 1, '#8f2620'); pr(FX - 1, hy - 4, 3, 2, '#e9e2d4'); }
  else if (hat === 'miner') { pr(hx, hy - 2, 12, 5, '#c9a43a'); pr(hx - 1, hy + 2, 14, 1, '#8a6e22'); if (front) pr(FX - 1, hy - 1, 2, 2, '#fff3b0'); }
  else if (hat === 'band') pr(hx, hy + 1, 12, 1, '#3f6fb0');
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
  const W = c.canvas.width, H = c.canvas.height, img = c.getImageData(0, 0, W, H), d = img.data, [r, g, b] = PIX.OUTLINE;
  const op = i => d[i * 4 + 3] > 40, add = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (op(i)) continue;
    if ((x > 0 && op(i - 1)) || (x < W - 1 && op(i + 1)) || (y > 0 && op(i - W)) || (y < H - 1 && op(i + W))) add.push(i);
  }
  for (const i of add) { d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = 255; }
  c.putImageData(img, 0, 0);
}

/* ---- HD-Figuren: Scale2x zweimal (40×40 → 160×160) mit runden Kanten, dazu Licht und Schatten ---- */
const pixHDCache = new WeakMap(), HD_FROM = 34; // ab dieser Kachelgröße werden HD-Figuren gezeigt
function scale2x(src, w, h) {
  const dst = new Uint32Array(w * h * 4), W2 = w * 2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const P = src[y * w + x], A = y > 0 ? src[(y - 1) * w + x] : P, B = x < w - 1 ? src[y * w + x + 1] : P, C = x > 0 ? src[y * w + x - 1] : P, D = y < h - 1 ? src[(y + 1) * w + x] : P;
    const o = y * 2 * W2 + x * 2;
    dst[o] = C === A && C !== D && A !== B ? A : P;
    dst[o + 1] = A === B && A !== C && B !== D ? B : P;
    dst[o + W2] = D === C && D !== B && C !== A ? C : P;
    dst[o + W2 + 1] = B === D && B !== A && D !== C ? D : P;
  }
  return dst;
}
/** Vierfache Auflösung mit geglätteten Kanten; Figur bekommt Licht von oben links und Schatten unten rechts. */
function pixHDRaw(cv) {
  const w0 = cv.width, h0 = cv.height, img = cv.getContext('2d').getImageData(0, 0, w0, h0);
  let d = new Uint32Array(img.data.buffer.slice(0));
  d = scale2x(d, w0, h0); d = scale2x(d, w0 * 2, h0 * 2);
  const hd = document.createElement('canvas'); hd.width = w0 * 4; hd.height = h0 * 4;
  const x = hd.getContext('2d');
  x.putImageData(new ImageData(new Uint8ClampedArray(d.buffer), w0 * 4, h0 * 4), 0, 0);
  x.globalCompositeOperation = 'source-atop';
  const g = x.createLinearGradient(hd.width * 0.25, hd.height * 0.2, hd.width * 0.7, hd.height);
  g.addColorStop(0, 'rgba(255,245,225,.16)'); g.addColorStop(0.45, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(30,15,50,.22)');
  x.fillStyle = g; x.fillRect(0, 0, hd.width, hd.height);
  x.globalCompositeOperation = 'source-over';
  return hd;
}
function pixHD(cv) { let hd = pixHDCache.get(cv); if (!hd) { hd = pixHDRaw(cv); pixHDCache.set(cv, hd); } return hd; }
/** Einmal glätten (für HD-Figuren, die schon im 80er-Raster gezeichnet sind). */
const pixHD1Cache = new WeakMap();
function pixHD1(cv) {
  let hd = pixHD1Cache.get(cv); if (hd) return hd;
  const w0 = cv.width, h0 = cv.height, d = scale2x(new Uint32Array(cv.getContext('2d').getImageData(0, 0, w0, h0).data.buffer.slice(0)), w0, h0);
  hd = document.createElement('canvas'); hd.width = w0 * 2; hd.height = h0 * 2;
  hd.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(d.buffer), w0 * 2, h0 * 2), 0, 0);
  pixHD1Cache.set(cv, hd); return hd;
}

/** Pixel-Figur ins Bild setzen (scharf vergrößert), plus Aura, Schimmer und Pfeile. */
Renderer.prototype.drawSettlerPixel = function (c, n, px, py, s, now, pose, phase) {
  const hd = s >= HD_FROM, base = pixFrame(n, pose, phase, now, hd ? 2 : 1), cv = s >= 110 ? pixHD1(base) : base, f = cv.width / PIX.W, k = (0.66 * s) / 26 / f, t = now / 1000 + n.id * 0.37;
  const fx = px, fy = py + s * 0.38;
  if (n.awakened && !n.sleeping) { // Aura
    const col = n.cls ? CLASSES[n.cls].color : '#8fd3ff', gr = c.createRadialGradient(fx, fy, 0, fx, fy, s * 0.36);
    gr.addColorStop(0, col + '99'); gr.addColorStop(1, col + '00');
    c.globalAlpha = 0.75 + Math.sin(t * 3) * 0.25; c.fillStyle = gr; c.beginPath(); c.ellipse(fx, fy, s * 0.36, s * 0.12, 0, 0, TAU); c.fill(); c.globalAlpha = 1;
  }
  const g = n.gear || {}, topR = SLOTS.reduce((m, sl) => Math.max(m, g[sl] ? g[sl].rarity : -1), -1);
  if (topR >= 3 && !n.sleeping) { const gc = RARITIES[topR].color, gr = c.createRadialGradient(fx, fy - s * 0.3, 0, fx, fy - s * 0.3, s * 0.5); gr.addColorStop(0, gc + '50'); gr.addColorStop(1, gc + '00'); c.fillStyle = gr; c.fillRect(fx - s * 0.5, fy - s * 0.85, s, s); }
  c.save(); c.imageSmoothingEnabled = hd; c.imageSmoothingQuality = 'high';
  c.translate(fx, fy); c.scale((pose.view && pose.view !== 'side' ? 1 : pose.facing) * k, k);
  c.drawImage(cv, -PIX.FX * f, -PIX.FY * f);
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

/* ---- Monster und Tiere in Pixel-Art ------------------------------------ */
function pixKit(c) {
  const pr = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
  const pl = (x0, y0, x1, y1, w, col) => {
    c.fillStyle = col; x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, o = Math.floor(w / 2);
    let err = dx + dy;
    for (let k = 0; k < 200; k++) { c.fillRect(x0 - o, y0 - o, w, w); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
  };
  const el = (cx, cy, rx, ry, col) => { c.fillStyle = col; for (let y = -ry; y <= ry; y++) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y / (ry + 0.5)) ** 2))); c.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2, 1); } };
  return { pr, pl, el };
}

function pixCreature(kind, frame, attack, flash, antlers) {
  const key = `${kind}|${frame}|${attack ? 1 : 0}|${flash ? 1 : 0}|${antlers ? 1 : 0}`;
  let cv = pixCache.get(key);
  if (cv) return cv;
  cv = document.createElement('canvas'); cv.width = PIX.W; cv.height = PIX.H;
  const c = cv.getContext('2d'), { pr, pl, el } = pixKit(c), FX = PIX.FX, FY = PIX.FY;
  const step = [0, 1, 0, -1][frame & 3];
  if (kind === 'rissling') { // kleiner Kobold aus dem Riss
    const hop = [0, 2, 3, 1][frame & 3], y = FY - hop;
    pl(FX - 5, y - 6, FX - 10, y - 11, 1, '#3a2350'); pr(FX - 11, y - 13, 2, 2, '#3a2350');
    pr(FX - 3, y - 2, 2, 2, '#2a1838'); pr(FX + 1, y - 2, 2, 2, '#2a1838');
    el(FX, y - 7, 6, 5, '#5b3a86'); el(FX - 1, y - 6, 5, 3, '#4a2d70'); pr(FX + 1, y - 11, 3, 1, '#8a5ac0');
    pr(FX - 4, y - 14, 1, 3, '#2a1838'); pr(FX - 3, y - 15, 1, 1, '#2a1838'); pr(FX + 3, y - 14, 1, 3, '#2a1838'); pr(FX + 4, y - 15, 1, 1, '#2a1838');
    pr(FX + 1, y - 9, 2, 2, '#ffe14a'); pr(FX + 4, y - 9, 2, 2, '#ffe14a'); pr(FX + 2, y - 9, 1, 1, '#140c0a'); pr(FX + 5, y - 9, 1, 1, '#140c0a');
    pr(FX + 2, y - 5, 3, 1, '#2a1838');
    pr(FX + 5 + (attack ? 3 : 0), y - 7, 3, 2, '#4a2d70'); pr(FX + 7 + (attack ? 3 : 0), y - 8, 1, 1, '#e8e2d0');
  } else if (kind === 'schattenwolf') { // dunkler Wolf mit roten Augen
    for (const [lx, o] of [[-7, 0], [-4, 2], [5, 2], [8, 0]]) { const off = [0, 2, 0, -2][(frame + o) & 3]; pl(FX + lx, FY - 6, FX + lx + off, FY - 1, 2, lx < 0 && o ? '#151820' : '#1b1f29'); }
    pl(FX - 10, FY - 10, FX - 15, FY - 14 + step, 2, '#2d3446');
    el(FX - 1, FY - 9, 10, 4, '#2d3446'); el(FX - 2, FY - 8, 9, 2, '#1b1f29'); pr(FX - 6, FY - 13, 9, 1, '#4a5570');
    const hx = FX + 10 + (attack ? 2 : 0);
    el(hx, FY - 12, 4, 3, '#2d3446'); pr(hx + 3, FY - 12, 4, 2, '#2d3446'); pr(hx - 2, FY - 17, 2, 3, '#1b1f29'); pr(hx + 1, FY - 17, 2, 3, '#1b1f29');
    pr(hx + 1, FY - 13, 2, 1, '#ff3b3b'); pr(hx + 6, FY - 12, 1, 1, '#0b0d12');
    if (attack) { pr(hx + 3, FY - 10, 4, 1, '#7a1a1a'); pr(hx + 4, FY - 10, 1, 1, '#ffffff'); pr(hx + 6, FY - 10, 1, 1, '#ffffff'); }
  } else if (kind === 'aschegolem') { // Steinriese mit Lavarissen
    const st = [0, 1, 0, 1][frame & 3];
    pr(FX - 8, FY - 6, 6, 6 - st, '#3e3833'); pr(FX + 2, FY - 6, 6, 6 - (1 - st), '#3e3833');
    c.fillStyle = '#5a534c'; for (let y = FY - 25; y < FY - 5; y++) { const w = 9 + Math.round((y - (FY - 25)) / 20 * 2); c.fillRect(FX - w, y, w * 2, 1); }
    pr(FX - 11, FY - 25, 5, 20, '#45403a');
    pr(FX - 4, FY - 31, 8, 7, '#4a443e'); pr(FX - 4, FY - 31, 3, 7, '#3a3530');
    pr(FX + 1, FY - 29, 2, 2, '#ff9a2a');
    for (const [a, b, d, e] of [[-4, -22, 1, -16], [1, -16, -3, -10], [5, -20, 3, -12]]) pl(FX + a, FY + b, FX + d, FY + e, 1, '#ff7a1a');
    pr(FX - 14, FY - 24, 4, 14, '#3e3833');
    if (attack) pr(FX + 10, FY - 34, 4, 12, '#3e3833'); else pr(FX + 10, FY - 24, 4, 14, '#3e3833');
  } else if (kind === 'deer') {
    for (const [lx, o] of [[-6, 0], [-4, 2], [4, 2], [6, 0]]) { const off = [0, 1, 0, -1][(frame + o) & 3]; pl(FX + lx, FY - 7, FX + lx + off, FY - 1, 1, '#6b4a2c'); }
    el(FX, FY - 10, 8, 3, '#9a6a3c'); el(FX - 1, FY - 9, 7, 1, '#7a5230'); pr(FX - 9, FY - 11, 2, 2, '#f3e6d0');
    pl(FX + 6, FY - 12, FX + 9, FY - 17, 2, '#9a6a3c'); el(FX + 10, FY - 18, 3, 2, '#a06e40'); pr(FX + 8, FY - 21, 1, 2, '#7a5230');
    pr(FX + 11, FY - 19, 1, 1, '#1d1410'); pr(FX + 13, FY - 18, 1, 1, '#2a1d14');
    if (antlers) { pl(FX + 9, FY - 21, FX + 7, FY - 26, 1, '#d9c39a'); pl(FX + 8, FY - 24, FX + 5, FY - 25, 1, '#d9c39a'); pl(FX + 11, FY - 21, FX + 13, FY - 26, 1, '#d9c39a'); }
  } else if (kind === 'rabbit') {
    const hop = [0, 2, 3, 1][frame & 3], y = FY - hop;
    el(FX, y - 4, 4, 3, '#9c8a76'); el(FX - 1, y - 3, 3, 1, '#857462'); el(FX + 4, y - 7, 2, 2, '#9c8a76');
    pr(FX + 3, y - 12, 1, 4, '#9c8a76'); pr(FX + 5, y - 12, 1, 4, '#8a7864'); pr(FX + 5, y - 8, 1, 1, '#1d1410');
    pr(FX - 5, y - 5, 2, 2, '#ffffff');
  } else if (kind === 'ritter' || kind === 'feldherr') { // Heer des Nachbarreichs: Rüstung, Wappenrock, Helm
    const boss = kind === 'feldherr', sw = [0, 2, 0, -2][frame & 3], atk = attack ? 3 : 0;
    const steel = '#9aa3ad', dark = '#5c646e', tab = '#7a1e3a', skin = '#e0b08a';
    if (boss) pr(FX - 6, FY - 18, 3, 14, '#5a1428');
    pl(FX - 2, FY - 7, FX - 2 - sw / 2, FY - 1, 2, dark); pl(FX + 2, FY - 7, FX + 2 + sw / 2, FY - 1, 2, dark);
    pr(FX - 4 - sw / 2, FY - 1, 3, 1, '#2a2a30'); pr(FX + 1 + sw / 2, FY - 1, 3, 1, '#2a2a30');
    pr(FX - 4, FY - 16, 8, 9, steel); pr(FX - 3, FY - 15, 6, 8, tab); pr(FX - 1, FY - 13, 2, 3, '#f0c35a');
    pl(FX - 3, FY - 15, FX - 5, FY - 10, 2, steel); pr(FX - 7, FY - 13, 3, 5, '#7a5a3a'); // Schild
    pl(FX + 3, FY - 15, FX + 6 + atk, FY - 11, 2, steel); pr(FX + 6 + atk, FY - 12, 2, 2, skin);
    if (boss) { pl(FX + 7 + atk, FY - 11, FX + 13 + atk, FY - 19, 1, '#e8eef2'); pr(FX + 6 + atk, FY - 12, 3, 1, '#c9a032'); }
    else pl(FX + 7 + atk, FY - 6, FX + 9 + atk, FY - 24, 1, '#6b4426'), pr(FX + 9 + atk, FY - 26, 1, 3, '#d8dde2');
    el(FX, FY - 21, 4, 4, steel); pr(FX - 4, FY - 25, 8, 2, dark); pr(FX + 1, FY - 21, 4, 1, '#1a1a20'); // Helm mit Sehschlitz
    if (boss) { pr(FX - 1, FY - 29, 2, 4, '#c8302a'); pr(FX - 3, FY - 27, 6, 1, '#c9a032'); }
    else pr(FX - 1, FY - 27, 2, 2, tab);
  } else if (kind === 'bandit' || kind === 'banditenboss') { // Rotschal-Bande: Schal, Maske, Dolch / Hauptmann mit Axt
    const boss = kind === 'banditenboss', sw = [0, 2, 0, -2][frame & 3], atk = attack ? 3 : 0;
    const coat = boss ? '#4a2a22' : '#5a4632', dark = '#2a2018', scarf = '#c8302a', skin = '#e0b08a', hood = boss ? '#2a1e18' : '#3a3228';
    if (boss) pr(FX - 6, FY - 17, 3, 13, '#8a1a1a');
    pl(FX - 2, FY - 7, FX - 2 - sw / 2, FY - 1, 2, dark); pl(FX + 2, FY - 7, FX + 2 + sw / 2, FY - 1, 2, dark);
    pr(FX - 4 - sw / 2, FY - 1, 3, 1, '#1a1410'); pr(FX + 1 + sw / 2, FY - 1, 3, 1, '#1a1410');
    pr(FX - 4, FY - 16, 8, 9, coat); pr(FX - 4, FY - 9, 8, 1, '#6b4a2a'); pr(FX - 1, FY - 9, 2, 1, '#c9a032');
    pl(FX - 3, FY - 15, FX - 5, FY - 10, 2, coat); pr(FX - 6, FY - 10, 2, 2, skin);
    pl(FX + 3, FY - 15, FX + 6 + atk, FY - 11, 2, coat); pr(FX + 6 + atk, FY - 12, 2, 2, skin);
    if (boss) { pl(FX + 7 + atk, FY - 8, FX + 7 + atk, FY - 21, 1, '#6b4426'); pr(FX + 8 + atk, FY - 22, 3, 5, '#aab4bc'); pr(FX + 10 + atk, FY - 21, 1, 3, '#e8eef2'); }
    else pl(FX + 7 + atk, FY - 12, FX + 11 + atk, FY - 15, 1, '#d8dde2');
    pr(FX - 4, FY - 17, 8, 2, scarf); pr(FX - 5, FY - 16, 2, 5, scarf);
    el(FX, FY - 21, 4, 4, skin);
    pr(FX - 4, FY - 26, 8, 4, hood); pr(FX - 5, FY - 24, 2, 5, hood); pr(FX + 3, FY - 25, 2, 1, hood);
    pr(FX - 1, FY - 20, 6, 2, scarf);
    pr(FX + 3, FY - 22, 1, 1, '#1a1410');
    if (boss) { pr(FX, FY - 23, 3, 2, '#1a1410'); pl(FX - 4, FY - 24, FX + 4, FY - 22, 1, '#1a1410'); pr(FX - 3, FY - 28, 7, 2, '#8a1a1a'); }
    else pr(FX, FY - 22, 1, 1, '#1a1410');
  } else if (kind.startsWith('pet_') || kind === 'huhn' || kind === 'kuh') pixPet(kind.replace('pet_', ''), frame, pr, pl, el, FX, FY);
  pixOutline(c);
  if (flash) { c.globalCompositeOperation = 'source-atop'; c.fillStyle = 'rgba(255,255,255,.75)'; c.fillRect(0, 0, PIX.W, PIX.H); c.globalCompositeOperation = 'source-over'; }
  if (pixCache.size > 1500) pixCache.delete(pixCache.keys().next().value);
  pixCache.set(key, cv);
  return cv;
}

/** Pixel-Kreatur zeichnen: Füße bei (x, y), Blickrichtung facing. */
/** Haustiere und Hoftiere: kleine, runde Pixel-Figuren. */
const PET_PAL = { wolf: ['#9aa3ad', '#6c747e', '#e6e9ec'], fuchs: ['#e0782e', '#a8521c', '#fff4e6'], hund: ['#a77a4e', '#7a5434', '#f0dcc0'], katze: ['#7c7c88', '#55555f', '#d8d8e0'] };
function pixPet(kind, frame, pr, pl, el, FX, FY) {
  const f = frame & 3, step = [0, 1, 0, -1][f];
  if (PET_PAL[kind]) { // Vierbeiner
    const [b, d, l] = PET_PAL[kind];
    for (const [lx, o] of [[-4, 0], [-2, 2], [2, 2], [4, 0]]) { const off = [0, 1, 0, -1][(f + o) & 3]; pl(FX + lx, FY - 4, FX + lx + off, FY - 1, 1, d); }
    if (kind === 'katze') pl(FX - 5, FY - 6, FX - 8, FY - 11 - step, 1, b); // Schwanz nach oben
    else if (kind === 'fuchs') { el(FX - 7, FY - 6 + step, 3, 2, b); pr(FX - 10, FY - 6 + step, 2, 2, l); }
    else pl(FX - 5, FY - 6, FX - 8, FY - 8 + step, 2, b);
    el(FX, FY - 6, 5, 2, b); el(FX, FY - 5, 3, 1, l);
    const hx = FX + 5, hy = FY - 9;
    el(hx, hy, 3, 3, b); pr(hx + 2, hy, 3, 2, kind === 'katze' ? b : l);
    pr(hx - 2, hy - 4, 2, 2, kind === 'hund' ? d : b); pr(hx + 1, hy - 4, 2, 2, kind === 'hund' ? d : b);
    if (kind === 'hund') { pr(hx - 3, hy - 2, 1, 3, d); }
    pr(hx + 1, hy - 1, 1, 1, '#1a1410'); pr(hx + 4, hy, 1, 1, '#1a1410');
    if (kind === 'wolf') pr(hx + 1, hy - 1, 1, 1, '#4ab0ff');
  } else if (kind === 'eule') { // schwebt und flattert
    const up = [0, -1, -2, -1][f], y = FY - 8 + up;
    const wing = f % 2 ? 3 : 1;
    pr(FX - 6, y - 3, 2, wing + 2, '#6b4a2e'); pr(FX + 4, y - 3, 2, wing + 2, '#6b4a2e');
    el(FX, y - 3, 4, 4, '#8a6440'); el(FX, y - 2, 2, 2, '#e8d6b4');
    pr(FX - 2, y - 6, 2, 2, '#fff2a0'); pr(FX + 1, y - 6, 2, 2, '#fff2a0'); pr(FX - 1, y - 6, 1, 1, '#1a1410'); pr(FX + 2, y - 6, 1, 1, '#1a1410');
    pr(FX, y - 4, 1, 1, '#e0a030'); pr(FX - 3, y - 8, 1, 1, '#6b4a2e'); pr(FX + 3, y - 8, 1, 1, '#6b4a2e');
  } else if (kind === 'hase') { // Kristallhase mit leuchtendem Stein
    const hop = [0, 2, 3, 1][f], y = FY - hop;
    el(FX, y - 4, 4, 3, '#bfe8ff'); el(FX + 4, y - 7, 2, 2, '#bfe8ff');
    pr(FX + 3, y - 12, 1, 4, '#bfe8ff'); pr(FX + 5, y - 12, 1, 4, '#9fd4f5'); pr(FX + 5, y - 8, 1, 1, '#1d1410');
    pr(FX - 1, y - 8, 2, 2, '#5ad0ff'); pr(FX - 1, y - 8, 1, 1, '#ffffff');
  } else if (kind === 'drache') { // kleiner roter Drache mit Flügeln
    const up = [0, -1, -2, -1][f], y = FY - 7 + up, wing = f % 2 ? -4 : -1;
    pl(FX - 1, y - 4, FX - 6, y - 4 + wing, 2, '#7a1e1e'); pl(FX + 1, y - 4, FX - 3, y - 6 + wing, 2, '#9a2a2a');
    pl(FX - 4, y - 1, FX - 9, y + 1 - step, 1, '#b8332a');
    el(FX, y - 2, 4, 2, '#c8402e'); el(FX, y - 1, 2, 1, '#f0b060');
    el(FX + 5, y - 5, 2, 2, '#c8402e'); pr(FX + 6, y - 5, 2, 1, '#c8402e');
    pr(FX + 4, y - 8, 1, 2, '#f0d080'); pr(FX + 6, y - 6, 1, 1, '#ffe14a');
  } else if (kind === 'huhn') {
    const peck = f === 2 ? 2 : 0;
    el(FX, FY - 4, 3, 2, '#f4f0e6'); pr(FX - 4, FY - 6, 2, 2, '#e8e2d0');
    pr(FX + 2, FY - 8 + peck, 2, 3, '#f4f0e6'); pr(FX + 2, FY - 9 + peck, 2, 1, '#d83a2a'); pr(FX + 4, FY - 7 + peck, 1, 1, '#e8a030'); pr(FX + 3, FY - 8 + peck, 1, 1, '#1a1410');
    pr(FX - 1, FY - 2, 1, 2, '#e8a030'); pr(FX + 1, FY - 2, 1, 2, '#e8a030');
  } else if (kind === 'kuh') {
    for (const lx of [-6, -3, 4, 7]) pr(FX + lx, FY - 5, 2, 5, '#e8e4dc');
    el(FX, FY - 9, 9, 4, '#f4f0e8'); el(FX - 3, FY - 10, 3, 2, '#2a2420'); el(FX + 3, FY - 8, 2, 2, '#2a2420');
    pl(FX - 9, FY - 10, FX - 11, FY - 5 + (f % 2), 1, '#d8d0c4');
    const hx = FX + 10 + (f === 2 ? 1 : 0), hy = FY - 10 + (f === 2 ? 3 : 0);
    el(hx, hy, 3, 3, '#f4f0e8'); pr(hx + 1, hy + 1, 3, 2, '#f0b8b0'); pr(hx - 2, hy - 4, 1, 2, '#d8c8a0'); pr(hx + 2, hy - 4, 1, 2, '#d8c8a0'); pr(hx, hy - 1, 1, 1, '#1a1410');
  }
}

function drawPixelCreature(c, kind, x, y, s, facing, frame, attack, flash, antlers) {
  const base = pixCreature(kind, frame, attack, flash, antlers), hd = s >= HD_FROM, cv = hd ? pixHD(base) : base, f = cv.width / PIX.W, k = (0.66 * s) / 26 / f;
  c.save(); c.imageSmoothingEnabled = hd; c.imageSmoothingQuality = 'high'; c.translate(x, y); c.scale(facing * k, k); c.drawImage(cv, -PIX.FX * f, -PIX.FY * f); c.restore();
}
