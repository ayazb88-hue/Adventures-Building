/* =====================================================================
 * 8) DARSTELLUNG (Canvas 2D)
 * Pipeline pro Bild: Boden (zwischengespeichert) → Wasseranimation →
 * Sonnenschatten → Objekte & Siedler (Reihe für Reihe) → Partikel →
 * Wolkenschatten → Regen → Farbstimmung → Nacht-Lichtkarte → Leuchten →
 * Beschriftung → Vignette.
 * Bäume und Häuser werden einmal pro Zoomstufe als Sprites vorgerendert.
 * ===================================================================== */
const SKIN = ['#ffe3cf', '#f9d6bd', '#f1c7a0', '#e0ac7e', '#b97f55'];
const HAIR = ['#2a2a3c', '#f2cf6f', '#e8638a', '#4f8fe0', '#c8ccd8', '#c0522f', '#8a63d6', '#4a2f22', '#3fbf9a'];
const EYES = ['#3a7bd5', '#2e9e6a', '#9b4fd1', '#d0453a', '#d4a017', '#6b4a30', '#1fa3b5'];
const ROOFS = ['#a8432f', '#7d4a2b', '#56606e', '#8e3d55'];
const HAIR_STYLES = ['short', 'long', 'ponytail', 'bun', 'spiky', 'braid'];
const SHUTTERS = ['#4f6b5a', '#6b5a4f', '#4f5f6b', '#6b4f5a'];
const BERRY_SPOTS = [[-0.2, -0.24], [0.17, -0.3], [0.02, -0.16], [-0.07, -0.44], [0.25, -0.17], [0.07, -0.5]];
const TAU = Math.PI * 2;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const rand = (a, b) => a + Math.random() * (b - a);
function shadeHex(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = v => clamp(v + amt, 0, 255);
  return `rgb(${f(n >> 16)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`;
}

/* ---- Sprite-Zeichnungen (Ursprung = Fußpunkt, y nach oben negativ) ---- */
function drawCanopy(c, s, blobs, hue, L, rng) {
  c.fillStyle = `hsl(${hue}, 38%, ${L - 14}%)`;
  for (const [x, y, r] of blobs) { c.beginPath(); c.arc(x * s, (y + 0.05) * s, r * s, 0, TAU); c.fill(); }
  for (const [x, y, r] of blobs) {
    const g = c.createRadialGradient((x - r * 0.35) * s, (y - r * 0.4) * s, r * 0.1 * s, x * s, y * s, r * s);
    g.addColorStop(0, `hsl(${hue - 8}, 52%, ${L + 16}%)`);
    g.addColorStop(0.55, `hsl(${hue}, 45%, ${L + 3}%)`);
    g.addColorStop(1, `hsl(${hue + 4}, 40%, ${L - 7}%)`);
    c.fillStyle = g; c.beginPath(); c.arc(x * s, y * s, r * s, 0, TAU); c.fill();
  }
  c.fillStyle = `hsla(${hue - 15}, 60%, ${L + 26}%, .5)`;
  const cy = blobs[0][1];
  for (let i = 0; i < 14; i++) {
    const a = rng() * TAU, d = rng() * 0.36;
    c.beginPath(); c.arc(Math.cos(a) * d * s - s * 0.08, (cy - 0.08 + Math.sin(a) * d * 0.8) * s, s * (0.018 + rng() * 0.022), 0, TAU); c.fill();
  }
}

function drawOak(c, s, v) {
  const rng = mulberry32(v * 977 + 3);
  const tg = c.createLinearGradient(-s * 0.1, 0, s * 0.1, 0);
  tg.addColorStop(0, '#8a5d3a'); tg.addColorStop(0.6, '#5e3b22'); tg.addColorStop(1, '#3f2716');
  c.fillStyle = tg;
  c.beginPath(); c.moveTo(-s * 0.14, 0); c.quadraticCurveTo(-s * 0.06, -s * 0.05, -s * 0.06, -s * 0.62);
  c.lineTo(s * 0.06, -s * 0.62); c.quadraticCurveTo(s * 0.06, -s * 0.05, s * 0.14, 0); c.closePath(); c.fill();
  drawCanopy(c, s, [[0, -1.0, 0.44], [-0.3, -0.85, 0.3], [0.3, -0.86, 0.3], [-0.16, -1.28, 0.3], [0.18, -1.25, 0.29],
    [0, -0.78, 0.32], [-0.38, -1.05, 0.22], [0.38, -1.08, 0.22]], 100 + v * 9, 30 + (v % 2) * 4, rng);
}

function drawPine(c, s, v) {
  c.fillStyle = '#4e3220'; c.fillRect(-s * 0.05, -s * 0.4, s * 0.1, s * 0.4);
  const dark = v ? 22 : 17;
  for (let i = 0; i < 4; i++) {
    const yb = -0.3 - i * 0.33, wdt = 0.5 - i * 0.09, top = yb - 0.55;
    const g = c.createLinearGradient(-wdt * s, 0, wdt * s, 0);
    g.addColorStop(0, `hsl(140, 35%, ${dark + 15}%)`); g.addColorStop(0.5, `hsl(145, 38%, ${dark + 6}%)`); g.addColorStop(1, `hsl(150, 40%, ${dark - 3}%)`);
    c.fillStyle = g; c.beginPath(); c.moveTo(0, top * s); c.lineTo(wdt * s, yb * s);
    for (let k = 0; k <= 6; k++) c.lineTo((wdt - k * (2 * wdt / 6)) * s, (yb + (k % 2 ? 0.06 : 0)) * s);
    c.closePath(); c.fill();
  }
}

function drawStump(c, s) {
  c.fillStyle = '#5e3b22';
  c.beginPath(); c.moveTo(-s * 0.16, 0); c.lineTo(-s * 0.13, -s * 0.16); c.lineTo(s * 0.13, -s * 0.16); c.lineTo(s * 0.16, 0); c.fill();
  c.fillStyle = '#c99c66'; c.beginPath(); c.ellipse(0, -s * 0.16, s * 0.13, s * 0.055, 0, 0, TAU); c.fill();
  c.strokeStyle = '#a87b4a'; c.lineWidth = Math.max(1, s * 0.012);
  c.beginPath(); c.ellipse(0, -s * 0.16, s * 0.07, s * 0.028, 0, 0, TAU); c.stroke();
}

function drawBush(c, s) {
  drawCanopy(c, s, [[0, -0.34, 0.25], [-0.2, -0.2, 0.22], [0.2, -0.2, 0.22], [-0.08, -0.12, 0.2], [0.1, -0.13, 0.2]], 122, 30, mulberry32(42));
}

/** Wohnhaus in Schrägansicht (Giebel vorn, Seitenwand und Dachfläche rechts). big = zweistöckiges Stadthaus. */
function drawHouseSprite(c, s, v, big = false) {
  const roof = ROOFS[v], H = (big ? 1.08 : 0.7) * s, L = -0.42 * s, R = 0.36 * s, D = 0.3 * s, DY = 0.2 * s;
  const plaster = ['#f1e4c6', '#eadcc0', '#f3e9d6', '#e8d6b4'][v];
  const ol = 'rgba(40,28,20,.55)', lw = Math.max(1, s * 0.014);
  c.lineJoin = 'round';
  // Seitenwand (rechts, im Schatten)
  c.beginPath(); c.moveTo(R, 0); c.lineTo(R + D, -DY); c.lineTo(R + D, -DY - H); c.lineTo(R, -H); c.closePath();
  const sg = c.createLinearGradient(R, 0, R + D, 0); sg.addColorStop(0, shadeHex(plaster.length === 7 ? plaster : '#e8d6b4', -55)); sg.addColorStop(1, shadeHex('#e8d6b4', -75));
  c.fillStyle = sg; c.fill(); c.strokeStyle = ol; c.lineWidth = lw; c.stroke();
  // Sockel
  c.fillStyle = '#7d766b'; c.fillRect(L - 0.02 * s, -0.1 * s, R - L + 0.02 * s, 0.1 * s);
  c.beginPath(); c.moveTo(R, 0); c.lineTo(R + D, -DY); c.lineTo(R + D, -DY - 0.1 * s); c.lineTo(R, -0.1 * s); c.closePath(); c.fillStyle = '#5f5a52'; c.fill();
  c.strokeStyle = 'rgba(0,0,0,.25)'; for (let i = 1; i < 6; i++) { const x = L + i * (R - L) / 6; c.beginPath(); c.moveTo(x, -0.1 * s); c.lineTo(x, 0); c.stroke(); }
  // Vorderwand
  const wg = c.createLinearGradient(0, -H, 0, 0); wg.addColorStop(0, '#fffaf0'); wg.addColorStop(0.2, plaster); wg.addColorStop(1, shadeHex('#e0cda6', -15));
  c.fillStyle = wg; c.fillRect(L, -H, R - L, H - 0.1 * s);
  // Fachwerk
  c.strokeStyle = '#5b3a22'; c.lineWidth = s * 0.035; c.lineCap = 'square';
  c.strokeRect(L, -H, R - L, H - 0.1 * s);
  c.beginPath();
  const floors = big ? [-0.55 * s] : [];
  for (const fy of floors) { c.moveTo(L, fy); c.lineTo(R, fy); }
  for (const x of [L + (R - L) * 0.33, L + (R - L) * 0.67]) { c.moveTo(x, -H); c.lineTo(x, big ? -0.55 * s : -0.1 * s); }
  if (big) { c.moveTo(L, -H); c.lineTo(L + (R - L) * 0.33, -0.55 * s); c.moveTo(R, -H); c.lineTo(L + (R - L) * 0.67, -0.55 * s); }
  c.stroke(); c.lineCap = 'butt';
  // Fenster
  const wins = [];
  const win = (cx, cy, w, h) => {
    c.fillStyle = '#2d3b4a'; c.fillRect(cx - w / 2, cy - h / 2, w, h);
    c.fillStyle = 'rgba(170,210,240,.35)'; c.fillRect(cx - w / 2, cy - h / 2, w * 0.45, h * 0.45);
    c.strokeStyle = '#4b2f1c'; c.lineWidth = Math.max(1, s * 0.018); c.strokeRect(cx - w / 2, cy - h / 2, w, h);
    c.beginPath(); c.moveTo(cx, cy - h / 2); c.lineTo(cx, cy + h / 2); c.moveTo(cx - w / 2, cy); c.lineTo(cx + w / 2, cy); c.stroke();
    c.fillStyle = SHUTTERS[v]; c.fillRect(cx - w / 2 - 0.04 * s, cy - h / 2, 0.035 * s, h); c.fillRect(cx + w / 2 + 0.005 * s, cy - h / 2, 0.035 * s, h);
    c.fillStyle = '#6b4526'; c.fillRect(cx - w * 0.6, cy + h / 2, w * 1.2, 0.03 * s);
    for (let k = 0; k < 3; k++) { c.fillStyle = ['#e5484d', '#ffd166', '#f78fb3'][(k + v) % 3]; c.beginPath(); c.arc(cx - w * 0.35 + k * w * 0.35, cy + h / 2, 0.02 * s, 0, TAU); c.fill(); }
    wins.push([cx / s, cy / s, w / s, h / s]);
  };
  const wy = big ? -0.3 * s : -0.38 * s;
  win(L + (R - L) * 0.17, wy, 0.13 * s, 0.14 * s); win(L + (R - L) * 0.83, wy, 0.13 * s, 0.14 * s);
  if (big) for (const fx of [0.17, 0.5, 0.83]) win(L + (R - L) * fx, -0.82 * s, 0.12 * s, 0.14 * s);
  // Seitenfenster (schräg)
  c.fillStyle = '#26323e';
  const sw = (fy) => { c.beginPath(); c.moveTo(R + 0.09 * s, fy - 0.06 * DY / 0.2 * 0.3); c.lineTo(R + 0.2 * s, fy - 0.13 * s * 0.67); c.lineTo(R + 0.2 * s, fy - 0.13 * s * 0.67 - 0.13 * s); c.lineTo(R + 0.09 * s, fy - 0.06 * s - 0.13 * s); c.closePath(); c.fill(); };
  sw(-0.3 * s); if (big) sw(-0.78 * s);
  // Tür mit Vordach und Laterne
  const dx = L + (R - L) * 0.5, dh = 0.32 * s;
  const dg = c.createLinearGradient(dx - 0.08 * s, 0, dx + 0.08 * s, 0); dg.addColorStop(0, '#83532e'); dg.addColorStop(1, '#4e301a');
  c.fillStyle = dg; c.beginPath(); c.moveTo(dx - 0.08 * s, -0.1 * s); c.lineTo(dx - 0.08 * s, -0.1 * s - dh + 0.08 * s); c.arc(dx, -0.1 * s - dh + 0.08 * s, 0.08 * s, Math.PI, 0); c.lineTo(dx + 0.08 * s, -0.1 * s); c.fill();
  c.strokeStyle = '#3a2414'; c.lineWidth = lw; c.stroke();
  c.fillStyle = '#e0b85a'; c.beginPath(); c.arc(dx + 0.045 * s, -0.24 * s, Math.max(1, s * 0.012), 0, TAU); c.fill();
  c.fillStyle = '#9b958a'; c.fillRect(dx - 0.12 * s, -0.02 * s, 0.24 * s, 0.04 * s);
  c.fillStyle = shadeHex(roof, -20); c.beginPath(); c.moveTo(dx - 0.14 * s, -0.44 * s); c.lineTo(dx + 0.14 * s, -0.44 * s); c.lineTo(dx + 0.1 * s, -0.5 * s); c.lineTo(dx - 0.1 * s, -0.5 * s); c.fill();
  c.fillStyle = '#2b2b2b'; c.fillRect(dx + 0.13 * s, -0.36 * s, 0.035 * s, 0.06 * s);
  // Dach
  const peak = { x: (L + R) / 2, y: -H - 0.48 * s }, eL = { x: L - 0.07 * s, y: -H + 0.03 * s }, eR = { x: R + 0.05 * s, y: -H + 0.03 * s };
  // Giebeldreieck
  c.beginPath(); c.moveTo(L, -H); c.lineTo(peak.x, peak.y + 0.04 * s); c.lineTo(R, -H); c.closePath();
  c.fillStyle = plaster; c.fill();
  c.strokeStyle = '#5b3a22'; c.lineWidth = s * 0.03; c.beginPath(); c.moveTo(peak.x, peak.y + 0.04 * s); c.lineTo(peak.x, -H); c.stroke();
  c.fillStyle = '#2d3b4a'; c.beginPath(); c.arc(peak.x, -H - 0.18 * s, 0.06 * s, 0, TAU); c.fill();
  c.strokeStyle = '#4b2f1c'; c.lineWidth = Math.max(1, s * 0.016); c.stroke();
  // rechte Dachfläche
  const bp = { x: peak.x + D, y: peak.y - DY }, bR = { x: eR.x + D, y: eR.y - DY };
  c.save(); c.beginPath(); c.moveTo(peak.x, peak.y); c.lineTo(bp.x, bp.y); c.lineTo(bR.x, bR.y); c.lineTo(eR.x, eR.y); c.closePath();
  const rg = c.createLinearGradient(peak.x, peak.y, eR.x, eR.y); rg.addColorStop(0, shadeHex(roof, 30)); rg.addColorStop(1, shadeHex(roof, -25));
  c.fillStyle = rg; c.fill(); c.clip();
  c.strokeStyle = 'rgba(0,0,0,.22)'; c.lineWidth = Math.max(1, s * 0.014);
  for (let k = 1; k < 9; k++) { const f = k / 9; c.beginPath(); c.moveTo(peak.x + (eR.x - peak.x) * f, peak.y + (eR.y - peak.y) * f); c.lineTo(bp.x + (bR.x - bp.x) * f, bp.y + (bR.y - bp.y) * f); c.stroke(); }
  for (let k = 1; k < 6; k++) { const f = k / 6; c.beginPath(); c.moveTo(peak.x + D * f, peak.y - DY * f); c.lineTo(eR.x + D * f, eR.y - DY * f); c.stroke(); }
  c.restore();
  c.strokeStyle = ol; c.lineWidth = lw; c.beginPath(); c.moveTo(peak.x, peak.y); c.lineTo(bp.x, bp.y); c.lineTo(bR.x, bR.y); c.lineTo(eR.x, eR.y); c.closePath(); c.stroke();
  // Ortgang (Dachkante vorn)
  c.strokeStyle = shadeHex(roof, -45); c.lineWidth = s * 0.05; c.lineCap = 'round';
  c.beginPath(); c.moveTo(eL.x, eL.y); c.lineTo(peak.x, peak.y); c.lineTo(eR.x, eR.y); c.stroke(); c.lineCap = 'butt';
  // Schornstein auf der Dachfläche
  const chx = peak.x + D * 0.6 + (eR.x - peak.x) * 0.35, chy = peak.y - DY * 0.6 + (eR.y - peak.y) * 0.35;
  c.fillStyle = '#8a5a48'; c.fillRect(chx - 0.05 * s, chy - 0.22 * s, 0.1 * s, 0.24 * s);
  c.fillStyle = shadeHex('#8a5a48', -30); c.fillRect(chx + 0.02 * s, chy - 0.22 * s, 0.03 * s, 0.24 * s);
  c.fillStyle = '#5c574f'; c.fillRect(chx - 0.065 * s, chy - 0.25 * s, 0.13 * s, 0.04 * s);
  return { windows: wins, chimney: [chx / s, (chy - 0.26 * s) / s], lamp: [(dx + 0.15 * s) / s, -0.33] };
}

/** Burg (3×3 Kacheln): Ringmauer mit Toren und Türmen, dahinter der Bergfried. */
function drawCastleSprite(c, s) {
  const stone = (x0, y0, x1, y1, light) => { const g = c.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, light ? '#d6d1c6' : '#b3ada2'); g.addColorStop(1, light ? '#9d978c' : '#7d776d'); return g; };
  const ol = 'rgba(30,26,22,.5)', lw = Math.max(1, s * 0.015);
  const bricks = (x0, y0, w, h) => {
    c.save(); c.beginPath(); c.rect(x0, y0, w, h); c.clip(); c.strokeStyle = 'rgba(40,36,30,.25)'; c.lineWidth = Math.max(1, s * 0.01);
    for (let r = 0, y = y0 + h; y > y0; y -= 0.09 * s, r++) { c.beginPath(); c.moveTo(x0, y); c.lineTo(x0 + w, y); c.stroke();
      for (let x = x0 + (r % 2) * 0.08 * s; x < x0 + w; x += 0.16 * s) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 0.09 * s); c.stroke(); } }
    c.restore();
  };
  const crenel = (x0, y, w, col) => { c.fillStyle = col; for (let x = x0; x < x0 + w - 0.05 * s; x += 0.14 * s) c.fillRect(x, y - 0.08 * s, 0.08 * s, 0.08 * s); };
  const flags = [];
  // Bergfried hinten
  const kx = -0.62 * s, kw = 1.24 * s, kTop = -2.75 * s, kBot = -0.9 * s;
  c.fillStyle = stone(kx, 0, kx + kw, 0, true); c.fillRect(kx, kTop, kw, kBot - kTop); bricks(kx, kTop, kw, kBot - kTop);
  c.beginPath(); c.moveTo(kx + kw, kBot); c.lineTo(kx + kw + 0.3 * s, kBot - 0.2 * s); c.lineTo(kx + kw + 0.3 * s, kTop - 0.2 * s); c.lineTo(kx + kw, kTop); c.closePath(); c.fillStyle = '#7d776d'; c.fill();
  crenel(kx, kTop, kw, '#c8c2b6'); c.strokeStyle = ol; c.lineWidth = lw; c.strokeRect(kx, kTop, kw, kBot - kTop);
  for (const [wx, wy] of [[-0.3, -2.2], [0.3, -2.2], [0, -1.65], [-0.3, -1.25], [0.3, -1.25]]) {
    c.fillStyle = '#26323e'; c.beginPath(); c.moveTo(wx * s - 0.05 * s, wy * s + 0.1 * s); c.lineTo(wx * s - 0.05 * s, wy * s); c.arc(wx * s, wy * s, 0.05 * s, Math.PI, 0); c.lineTo(wx * s + 0.05 * s, wy * s + 0.1 * s); c.fill();
  }
  flags.push([0, kTop / s - 0.08, 0.7]);
  // Ringmauer vorn
  const wx0 = -1.35 * s, ww = 2.7 * s, wTop = -0.95 * s;
  c.fillStyle = stone(wx0, 0, wx0 + ww, 0, false); c.fillRect(wx0, wTop, ww, -wTop); bricks(wx0, wTop, ww, -wTop);
  c.beginPath(); c.moveTo(wx0 + ww, 0); c.lineTo(wx0 + ww + 0.3 * s, -0.2 * s); c.lineTo(wx0 + ww + 0.3 * s, wTop - 0.2 * s); c.lineTo(wx0 + ww, wTop); c.closePath(); c.fillStyle = '#6e685f'; c.fill();
  crenel(wx0, wTop, ww, '#a9a397'); c.strokeStyle = ol; c.lineWidth = lw; c.strokeRect(wx0, wTop, ww, -wTop);
  // Tor
  c.fillStyle = '#1c1612'; c.beginPath(); c.moveTo(-0.26 * s, 0); c.lineTo(-0.26 * s, -0.42 * s); c.arc(0, -0.42 * s, 0.26 * s, Math.PI, 0); c.lineTo(0.26 * s, 0); c.fill();
  c.strokeStyle = '#5a4a3a'; c.lineWidth = Math.max(1, s * 0.02);
  for (let x = -0.2; x <= 0.21; x += 0.1) { c.beginPath(); c.moveTo(x * s, -0.05 * s); c.lineTo(x * s, -0.6 * s); c.stroke(); }
  for (let y = -0.12; y > -0.6; y -= 0.12) { c.beginPath(); c.moveTo(-0.24 * s, y * s); c.lineTo(0.24 * s, y * s); c.stroke(); }
  c.strokeStyle = '#8f897c'; c.lineWidth = s * 0.05; c.beginPath(); c.arc(0, -0.42 * s, 0.29 * s, Math.PI, 0); c.stroke();
  // Ecktürme
  for (const tx of [-1.35, 1.35]) {
    const x = tx * s, r = 0.3 * s, top = -1.55 * s;
    c.fillStyle = stone(x - r, 0, x + r, 0, true); c.fillRect(x - r, top, r * 2, -top); bricks(x - r, top, r * 2, -top);
    c.beginPath(); c.ellipse(x, 0, r, r * 0.35, 0, 0, Math.PI); c.fill();
    c.fillStyle = '#26323e'; c.fillRect(x - 0.035 * s, -1.0 * s, 0.07 * s, 0.16 * s);
    c.strokeStyle = ol; c.lineWidth = lw; c.strokeRect(x - r, top, r * 2, -top);
    // Kegeldach
    c.beginPath(); c.moveTo(x - r - 0.06 * s, top + 0.02 * s); c.lineTo(x, top - 0.62 * s); c.lineTo(x + r + 0.06 * s, top + 0.02 * s); c.closePath();
    const rg = c.createLinearGradient(x - r, 0, x + r, 0); rg.addColorStop(0, '#5d6c86'); rg.addColorStop(1, '#2f3746');
    c.fillStyle = rg; c.fill(); c.strokeStyle = ol; c.stroke();
    flags.push([tx, (top / s) - 0.62, 0.45]);
  }
  return { flags, windows: [[-0.3, -2.2, 0.1, 0.12], [0.3, -2.2, 0.1, 0.12], [0, -1.65, 0.1, 0.12], [-0.3, -1.25, 0.1, 0.12], [0.3, -1.25, 0.1, 0.12], [-1.35, -0.92, 0.07, 0.16], [1.35, -0.92, 0.07, 0.16]] };
}

function drawRock(c, s, v) {
  const rng = mulberry32(v * 31 + 7);
  const stones = v === 0 ? [[-0.16, 0, 0.28, 0.14], [0.2, 0.02, 0.2, 0.1], [0.02, -0.04, 0.22, 0.17]] : [[0, 0, 0.34, 0.16], [-0.26, 0.04, 0.15, 0.08], [0.28, 0.05, 0.13, 0.07]];
  for (const [x, y, rx, ry] of stones) {
    const g = c.createLinearGradient((x - rx) * s, (y - ry * 2) * s, (x + rx) * s, y * s);
    g.addColorStop(0, '#c2beb4'); g.addColorStop(0.55, '#8d897f'); g.addColorStop(1, '#5c5952');
    c.fillStyle = g; c.beginPath();
    for (let i = 0; i <= 7; i++) { const a = Math.PI + i / 7 * Math.PI, rr = 0.85 + rng() * 0.3; c.lineTo((x + Math.cos(a) * rx * rr) * s, (y + Math.sin(a) * ry * 2 * rr) * s); }
    c.closePath(); c.fill();
    c.strokeStyle = 'rgba(40,38,34,.35)'; c.lineWidth = Math.max(1, s * 0.015); c.stroke();
    c.fillStyle = 'rgba(110,150,70,.55)'; c.beginPath(); c.ellipse((x - rx * 0.3) * s, (y - ry * 1.5) * s, rx * 0.4 * s, ry * 0.3 * s, 0, 0, TAU); c.fill();
  }
}

function drawRuin(c, s, v) {
  const h = [0.95, 0.55, 1.2][v];
  c.fillStyle = '#8f8a80'; c.fillRect(-0.3 * s, -0.12 * s, 0.6 * s, 0.12 * s);
  const g = c.createLinearGradient(-0.16 * s, 0, 0.16 * s, 0); g.addColorStop(0, '#ddd6c8'); g.addColorStop(1, '#8f897c');
  c.fillStyle = g;
  c.beginPath(); c.moveTo(-0.16 * s, -0.12 * s); c.lineTo(-0.16 * s, -h * s); c.lineTo(-0.05 * s, -(h - 0.08) * s);
  c.lineTo(0.04 * s, -(h + 0.04) * s); c.lineTo(0.16 * s, -(h - 0.1) * s); c.lineTo(0.16 * s, -0.12 * s); c.fill();
  c.strokeStyle = 'rgba(0,0,0,.15)'; c.lineWidth = Math.max(1, s * 0.012);
  for (const x of [-0.08, 0, 0.08]) { c.beginPath(); c.moveTo(x * s, -0.14 * s); c.lineTo(x * s, -(h - 0.12) * s); c.stroke(); }
  c.fillStyle = 'rgba(80,130,60,.85)';
  for (let i = 0; i < 6; i++) { c.beginPath(); c.arc((-0.12 + (i % 3) * 0.05) * s, -(0.2 + i * 0.1) * s, s * 0.035, 0, TAU); c.fill(); }
  if (v === 1) { c.fillStyle = '#b8b2a5'; c.beginPath(); c.ellipse(0.32 * s, -0.06 * s, 0.2 * s, 0.07 * s, 0.2, 0, TAU); c.fill(); }
}

const METAL = ['#a3a9ae', '#7fb0e6', '#a87ce0', '#f0c35a', '#f06a7e'];

function drawSmithySprite(c, s) {
  const L = -0.55 * s, R = 0.55 * s, top = -0.62 * s;
  // Steinmauer
  const wg = c.createLinearGradient(0, top, 0, 0); wg.addColorStop(0, '#9c968c'); wg.addColorStop(1, '#6f6a62');
  c.fillStyle = wg; c.fillRect(L, top, R - L, -top);
  c.strokeStyle = 'rgba(30,28,25,.35)'; c.lineWidth = Math.max(1, s * 0.012);
  for (let r = 0, y = -0.1 * s; y > top; y -= 0.1 * s, r++) {
    c.beginPath(); c.moveTo(L, y); c.lineTo(R, y); c.stroke();
    for (let x = L + (r % 2) * 0.08 * s; x < R; x += 0.16 * s) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 0.1 * s); c.stroke(); }
  }
  // offene Esse (Torbogen)
  c.fillStyle = '#1d1512'; c.beginPath(); c.moveTo(-0.22 * s, 0); c.lineTo(-0.22 * s, -0.3 * s); c.arc(0, -0.3 * s, 0.22 * s, Math.PI, 0); c.lineTo(0.22 * s, 0); c.fill();
  c.strokeStyle = '#4e4840'; c.lineWidth = s * 0.04; c.beginPath(); c.arc(0, -0.3 * s, 0.24 * s, Math.PI, 0); c.stroke();
  // Dach (Schiefer)
  c.save(); c.beginPath(); c.moveTo(L - 0.06 * s, top + 0.04 * s); c.lineTo(-0.1 * s, -1.08 * s); c.lineTo(R + 0.06 * s, top + 0.04 * s); c.closePath();
  const rg = c.createLinearGradient(0, -1.08 * s, 0, top); rg.addColorStop(0, '#5d6670'); rg.addColorStop(1, '#3a4048');
  c.fillStyle = rg; c.fill(); c.clip();
  c.strokeStyle = 'rgba(0,0,0,.3)'; c.lineWidth = Math.max(1, s * 0.015);
  for (let y = top; y > -1.1 * s; y -= 0.07 * s) { c.beginPath(); c.moveTo(L - s, y); c.lineTo(R + s, y); c.stroke(); }
  c.restore();
  // großer Schornstein
  c.fillStyle = '#7a746b'; c.fillRect(-0.48 * s, -1.25 * s, 0.2 * s, 0.7 * s);
  c.fillStyle = '#5c574f'; c.fillRect(-0.51 * s, -1.29 * s, 0.26 * s, 0.07 * s);
  // Amboss draußen
  c.fillStyle = '#2f3338'; c.beginPath(); c.moveTo(0.3 * s, -0.12 * s); c.lineTo(0.62 * s, -0.12 * s); c.lineTo(0.55 * s, -0.06 * s); c.lineTo(0.37 * s, -0.06 * s); c.fill();
  c.fillRect(0.42 * s, -0.06 * s, 0.08 * s, 0.06 * s);
  c.fillStyle = '#5a6068'; c.fillRect(0.3 * s, -0.135 * s, 0.3 * s, 0.02 * s);
  // Schild mit Hammer
  c.fillStyle = '#6b4526'; c.fillRect(-0.5 * s, -0.5 * s, 0.2 * s, 0.14 * s);
  c.strokeStyle = '#e0c48a'; c.lineWidth = Math.max(1, s * 0.02);
  c.beginPath(); c.moveTo(-0.44 * s, -0.38 * s); c.lineTo(-0.36 * s, -0.47 * s); c.stroke(); c.fillStyle = '#e0c48a'; c.fillRect(-0.4 * s, -0.49 * s, 0.07 * s, 0.035 * s);
}

/** Waffe entlang der lokalen y-Achse zeichnen (Griff bei 0). */
function drawWeapon(c, kind, rarity, U, len, ow, accent) {
  const mc = METAL[rarity], rc = RARITIES[rarity].color;
  c.lineCap = 'round';
  const shaft = (w, col, from, to) => { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(0, from); c.lineTo(0, to); c.stroke(); };
  switch (kind) {
    case 'sword': case 'blade': {
      shaft(0.035 * U, '#5a3a22', -0.02 * U, 0.08 * U);
      c.fillStyle = rc; c.fillRect(-0.06 * U, 0.075 * U, 0.12 * U, 0.025 * U);
      const g = c.createLinearGradient(-0.03 * U, 0, 0.03 * U, 0); g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, mc); g.addColorStop(1, '#55595e');
      c.fillStyle = g; c.beginPath(); c.moveTo(-0.025 * U, 0.1 * U);
      if (kind === 'blade') c.quadraticCurveTo(-0.05 * U, len * 0.6, 0.01 * U, len); else c.lineTo(-0.022 * U, len - 0.05 * U);
      c.lineTo(0, len); c.lineTo(0.025 * U, 0.1 * U); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = ow; c.stroke();
      if (rarity >= 2) { c.strokeStyle = rc; c.globalAlpha = 0.8; c.lineWidth = Math.max(1, 0.012 * U); c.beginPath(); c.moveTo(0, 0.13 * U); c.lineTo(0, len - 0.08 * U); c.stroke(); c.globalAlpha = 1; }
      break;
    }
    case 'hammer': {
      shaft(0.03 * U, '#6b4526', 0, len);
      const g = c.createLinearGradient(-0.08 * U, 0, 0.08 * U, 0); g.addColorStop(0, '#fff'); g.addColorStop(0.4, mc); g.addColorStop(1, '#44484d');
      c.fillStyle = g; c.fillRect(-0.085 * U, len - 0.07 * U, 0.17 * U, 0.1 * U);
      c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = ow; c.strokeRect(-0.085 * U, len - 0.07 * U, 0.17 * U, 0.1 * U);
      if (rarity >= 2) { c.fillStyle = rc; c.fillRect(-0.085 * U, len - 0.03 * U, 0.17 * U, 0.018 * U); }
      break;
    }
    case 'staff': {
      shaft(0.03 * U, '#7a5230', 0, len);
      const g = c.createRadialGradient(0, len, 0, 0, len, 0.07 * U); g.addColorStop(0, '#fff'); g.addColorStop(0.5, rc); g.addColorStop(1, rc + '00');
      c.fillStyle = g; c.beginPath(); c.arc(0, len, 0.07 * U, 0, TAU); c.fill();
      c.strokeStyle = '#4e7a3a'; c.lineWidth = 0.02 * U; c.beginPath(); c.arc(0, len - 0.04 * U, 0.04 * U, 0.2, Math.PI - 0.2); c.stroke();
      break;
    }
    case 'spear': {
      shaft(0.025 * U, '#7a5230', -0.05 * U, len);
      c.fillStyle = mc; c.beginPath(); c.moveTo(-0.03 * U, len); c.lineTo(0, len + 0.1 * U); c.lineTo(0.03 * U, len); c.closePath(); c.fill();
      c.fillStyle = accent; c.beginPath(); c.moveTo(0.01 * U, len - 0.04 * U); c.lineTo(0.1 * U, len - 0.08 * U); c.lineTo(0.01 * U, len - 0.14 * U); c.fill();
      break;
    }
    case 'bow': {
      c.strokeStyle = '#6b4526'; c.lineWidth = 0.03 * U;
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(0.14 * U, len / 2, 0, len); c.stroke();
      c.strokeStyle = 'rgba(240,240,240,.8)'; c.lineWidth = Math.max(1, 0.008 * U); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, len); c.stroke();
      if (rarity >= 2) { c.fillStyle = rc; c.beginPath(); c.arc(0.07 * U, len / 2, 0.02 * U, 0, TAU); c.fill(); }
      break;
    }
  }
}

function drawMonsterShape(c, m, s, now) {
  const M = MONSTERS[m.kind], t = now / 1000 + m.id;
  const moving = Math.hypot(m.x - m.prevX, m.y - m.prevY) > 0.001, ph = t * (m.kind === 'aschegolem' ? 4 : 10);
  const attack = m.attackAt && now - m.attackAt < 300 ? Math.sin((now - m.attackAt) / 300 * Math.PI) : 0;
  const flash = m.hitAt && now - m.hitAt < 140;
  c.save(); c.scale(m.facing, 1); c.lineCap = 'round';
  if (m.kind === 'rissling') {
    const hop = moving ? Math.abs(Math.sin(ph)) * 0.08 * s : 0, U = s * 0.8;
    c.translate(attack * 0.1 * s, -hop);
    c.fillStyle = '#3a2350'; c.beginPath(); c.moveTo(-0.15 * U, -0.25 * U); c.quadraticCurveTo(-0.38 * U, -0.2 * U, -0.32 * U, -0.42 * U); c.lineWidth = 0.03 * U; c.strokeStyle = '#3a2350'; c.stroke();
    const g = c.createRadialGradient(-0.03 * U, -0.32 * U, 0, 0, -0.25 * U, 0.2 * U); g.addColorStop(0, '#8a5ac0'); g.addColorStop(1, '#3a2350');
    c.fillStyle = g; c.beginPath(); c.ellipse(0, -0.24 * U, 0.15 * U, 0.17 * U, 0, 0, TAU); c.fill();
    c.fillStyle = '#2a1838'; for (const hx of [-0.07, 0.07]) { c.beginPath(); c.moveTo(hx * U, -0.38 * U); c.lineTo((hx + 0.03) * U, -0.52 * U); c.lineTo((hx + 0.06) * U, -0.37 * U); c.fill(); }
    c.fillStyle = '#ffe14a'; for (const ex of [0.02, 0.09]) { c.beginPath(); c.arc(ex * U, -0.3 * U, 0.025 * U, 0, TAU); c.fill(); }
    c.strokeStyle = '#2a1838'; c.lineWidth = 0.04 * U; c.beginPath(); c.moveTo(0.1 * U, -0.2 * U); c.lineTo((0.2 + attack * 0.1) * U, -0.25 * U); c.stroke();
    c.beginPath(); c.moveTo(-0.05 * U, -0.08 * U); c.lineTo(-0.07 * U, 0); c.moveTo(0.05 * U, -0.08 * U); c.lineTo(0.07 * U, 0); c.stroke();
  } else if (m.kind === 'schattenwolf') {
    const U = s;
    for (const [lx, o] of [[-0.18, 0], [-0.12, Math.PI], [0.12, Math.PI], [0.18, 0]]) {
      const a = moving ? Math.sin(ph + o) * 0.5 : 0;
      c.strokeStyle = '#151820'; c.lineWidth = 0.05 * U; c.beginPath(); c.moveTo(lx * U, -0.2 * U); c.lineTo(lx * U + Math.sin(a) * 0.2 * U, 0); c.stroke();
    }
    const g = c.createLinearGradient(0, -0.38 * U, 0, -0.15 * U); g.addColorStop(0, '#3b4458'); g.addColorStop(1, '#12151c');
    c.fillStyle = g; c.beginPath(); c.ellipse(0, -0.26 * U, 0.26 * U, 0.12 * U, 0, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(-0.24 * U, -0.3 * U); c.quadraticCurveTo(-0.42 * U, -0.38 * U, -0.4 * U, -0.22 * U); c.lineWidth = 0.06 * U; c.strokeStyle = '#1b1f29'; c.stroke();
    const hx = (0.26 + attack * 0.1) * U;
    c.fillStyle = '#1e2330'; c.beginPath(); c.ellipse(hx, -0.36 * U, 0.11 * U, 0.08 * U, -0.2, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(hx + 0.05 * U, -0.38 * U); c.lineTo(hx + 0.2 * U, -0.33 * U); c.lineTo(hx + 0.05 * U, -0.3 * U); c.fill();
    c.beginPath(); c.moveTo(hx - 0.05 * U, -0.42 * U); c.lineTo(hx - 0.02 * U, -0.54 * U); c.lineTo(hx + 0.03 * U, -0.43 * U); c.fill();
    c.fillStyle = '#ff3b3b'; c.beginPath(); c.arc(hx + 0.05 * U, -0.38 * U, 0.02 * U, 0, TAU); c.fill();
    if (attack > 0.3) { c.fillStyle = '#eee'; c.beginPath(); c.moveTo(hx + 0.12 * U, -0.32 * U); c.lineTo(hx + 0.14 * U, -0.29 * U); c.lineTo(hx + 0.16 * U, -0.32 * U); c.fill(); }
  } else {
    const U = s * 1.3, stomp = moving ? Math.abs(Math.sin(ph)) * 0.03 * U : 0;
    c.translate(0, -stomp);
    const g = c.createLinearGradient(-0.3 * U, 0, 0.3 * U, 0); g.addColorStop(0, '#6a625a'); g.addColorStop(1, '#2e2a27');
    c.fillStyle = '#2e2a27'; c.fillRect(-0.16 * U, -0.18 * U, 0.1 * U, 0.18 * U); c.fillRect(0.06 * U, -0.18 * U, 0.1 * U, 0.18 * U);
    c.fillStyle = g; c.beginPath(); c.moveTo(-0.24 * U, -0.18 * U); c.lineTo(-0.28 * U, -0.55 * U); c.lineTo(0, -0.66 * U); c.lineTo(0.28 * U, -0.55 * U); c.lineTo(0.24 * U, -0.18 * U); c.closePath(); c.fill();
    c.fillStyle = '#4a443e'; c.beginPath(); c.arc(0.04 * U, -0.72 * U, 0.12 * U, 0, TAU); c.fill();
    const arm = attack * 1.2;
    c.save(); c.translate(0.26 * U, -0.52 * U); c.rotate(-0.3 - arm); c.fillStyle = '#3e3833'; c.fillRect(-0.05 * U, 0, 0.1 * U, 0.38 * U); c.restore();
    c.fillStyle = '#3e3833'; c.fillRect(-0.34 * U, -0.52 * U, 0.1 * U, 0.36 * U);
    const glowA = 0.6 + Math.sin(t * 4) * 0.3;
    c.strokeStyle = `rgba(255,120,30,${glowA})`; c.lineWidth = Math.max(1, 0.02 * U);
    c.beginPath(); c.moveTo(-0.1 * U, -0.6 * U); c.lineTo(0.02 * U, -0.45 * U); c.lineTo(-0.05 * U, -0.3 * U); c.moveTo(0.12 * U, -0.55 * U); c.lineTo(0.08 * U, -0.38 * U); c.stroke();
    c.fillStyle = `rgba(255,150,40,${glowA})`; c.beginPath(); c.arc(0.09 * U, -0.73 * U, 0.025 * U, 0, TAU); c.fill();
  }
  if (flash) { c.globalAlpha = 0.55; c.fillStyle = '#fff'; c.beginPath(); c.ellipse(0, -0.3 * s, 0.3 * s, 0.25 * s, 0, 0, TAU); c.fill(); c.globalAlpha = 1; }
  c.restore();
}

/** Marktplatz: drei Stände mit gestreiften Sonnendächern, Waren, Kisten und Fässern. */
function drawMarketSprite(c, s) {
  const ol = 'rgba(40,28,20,.5)', lw = Math.max(1, s * 0.013);
  // Pflaster
  c.fillStyle = '#b9ad98'; c.beginPath(); c.ellipse(0.05 * s, -0.12 * s, 0.75 * s, 0.24 * s, 0, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(0,0,0,.12)'; c.lineWidth = Math.max(1, s * 0.01);
  for (let k = -3; k <= 3; k++) { c.beginPath(); c.moveTo(k * 0.2 * s, -0.32 * s); c.lineTo(k * 0.2 * s + 0.08 * s, 0.08 * s); c.stroke(); }
  const stall = (x, y, cols, goods) => {
    // Pfosten
    c.fillStyle = '#6b4526'; for (const px of [-0.2, 0.2]) c.fillRect(x + px * s - 0.015 * s, y - 0.5 * s, 0.03 * s, 0.5 * s);
    // Tisch (Vorderseite + Platte)
    c.fillStyle = '#8a5a34'; c.fillRect(x - 0.24 * s, y - 0.22 * s, 0.48 * s, 0.22 * s);
    c.fillStyle = '#a9744a'; c.beginPath(); c.moveTo(x - 0.24 * s, y - 0.22 * s); c.lineTo(x + 0.24 * s, y - 0.22 * s); c.lineTo(x + 0.3 * s, y - 0.3 * s); c.lineTo(x - 0.18 * s, y - 0.3 * s); c.fill();
    c.strokeStyle = ol; c.lineWidth = lw; c.strokeRect(x - 0.24 * s, y - 0.22 * s, 0.48 * s, 0.22 * s);
    // Waren
    for (let k = 0; k < 5; k++) {
      const gx = x - 0.17 * s + k * 0.085 * s, gy = y - 0.27 * s;
      c.fillStyle = goods[k % goods.length];
      if (goods === GOODS_BREAD) { c.beginPath(); c.ellipse(gx, gy, 0.04 * s, 0.025 * s, 0, 0, TAU); c.fill(); }
      else if (goods === GOODS_CLOTH) { c.fillRect(gx - 0.03 * s, gy - 0.03 * s, 0.06 * s, 0.05 * s); }
      else { c.beginPath(); c.arc(gx, gy, 0.028 * s, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.arc(gx - 0.008 * s, gy - 0.01 * s, 0.008 * s, 0, TAU); c.fill(); }
    }
    // Sonnendach mit Streifen und Zackenkante
    const top = y - 0.62 * s, bot = y - 0.47 * s;
    c.save(); c.beginPath(); c.moveTo(x - 0.3 * s, bot); c.lineTo(x - 0.22 * s, top); c.lineTo(x + 0.28 * s, top); c.lineTo(x + 0.34 * s, bot); c.closePath(); c.clip();
    for (let k = 0; k < 8; k++) { c.fillStyle = cols[k % 2]; c.fillRect(x - 0.32 * s + k * 0.085 * s, top - 0.02 * s, 0.085 * s, 0.2 * s); }
    c.restore();
    c.fillStyle = cols[0];
    for (let k = 0; k < 8; k++) { const ex = x - 0.3 * s + k * 0.08 * s; c.beginPath(); c.moveTo(ex, bot); c.lineTo(ex + 0.04 * s, bot + 0.05 * s); c.lineTo(ex + 0.08 * s, bot); c.fill(); }
    c.strokeStyle = ol; c.lineWidth = lw; c.beginPath(); c.moveTo(x - 0.3 * s, bot); c.lineTo(x - 0.22 * s, top); c.lineTo(x + 0.28 * s, top); c.lineTo(x + 0.34 * s, bot); c.stroke();
  };
  stall(-0.38 * s, -0.2 * s, ['#d94b3d', '#f4efe2'], GOODS_FRUIT);
  stall(0.45 * s, -0.24 * s, ['#3d7bd9', '#f4efe2'], GOODS_CLOTH);
  stall(0.05 * s, 0.02 * s, ['#e0b03a', '#2f8f5b'], GOODS_BREAD);
  // Fass und Kisten
  c.fillStyle = '#7a5230'; c.beginPath(); c.ellipse(-0.72 * s, -0.08 * s, 0.07 * s, 0.1 * s, 0, 0, TAU); c.fill();
  c.strokeStyle = '#3b2a1e'; c.lineWidth = lw; c.stroke(); c.beginPath(); c.moveTo(-0.79 * s, -0.1 * s); c.lineTo(-0.65 * s, -0.1 * s); c.stroke();
  c.fillStyle = '#a07a4f'; c.fillRect(0.6 * s, -0.08 * s, 0.14 * s, 0.11 * s); c.strokeRect(0.6 * s, -0.08 * s, 0.14 * s, 0.11 * s);
  c.fillRect(0.64 * s, -0.17 * s, 0.1 * s, 0.09 * s); c.strokeRect(0.64 * s, -0.17 * s, 0.1 * s, 0.09 * s);
}
const GOODS_FRUIT = ['#d63a3a', '#f0a030', '#7cc04a'], GOODS_BREAD = ['#d9a456', '#c08440'], GOODS_CLOTH = ['#7b3fb0', '#2e6fbf', '#c0392b', '#e8c45a'];

/** Händlerkarren mit Esel (oder Planwagen des fahrenden Händlers). */
function drawCart(c, cart, s, now, px, py) {
  const merchant = cart.kind === 'merchant', U = s, wob = Math.sin(cart.phase * 6) * 0.01 * U;
  c.save(); c.translate(px, py); c.scale(cart.facing, 1); c.lineCap = 'round';
  c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(0, 0.02 * U, 0.55 * U, 0.1 * U, 0, 0, TAU); c.fill();
  // Esel vorn
  const ex = 0.38 * U, leg = Math.sin(cart.phase * 9) * 0.3;
  c.strokeStyle = '#5e5348'; c.lineWidth = 0.035 * U;
  for (const [lx, o] of [[-0.08, 0], [-0.04, Math.PI], [0.08, Math.PI], [0.12, 0]]) { const a = Math.sin(cart.phase * 9 + o) * 0.35; c.beginPath(); c.moveTo(ex + lx * U, -0.15 * U); c.lineTo(ex + lx * U + Math.sin(a) * 0.15 * U, 0); c.stroke(); }
  c.fillStyle = '#8b7d6f'; c.beginPath(); c.ellipse(ex + 0.02 * U, -0.2 * U + wob, 0.15 * U, 0.07 * U, 0, 0, TAU); c.fill();
  c.beginPath(); c.ellipse(ex + 0.19 * U, -0.3 * U + wob, 0.065 * U, 0.045 * U, -0.5, 0, TAU); c.fill();
  c.beginPath(); c.moveTo(ex + 0.16 * U, -0.33 * U); c.lineTo(ex + 0.15 * U, -0.44 * U); c.lineTo(ex + 0.19 * U, -0.34 * U); c.fill();
  c.fillStyle = '#e8e2d8'; c.beginPath(); c.ellipse(ex + 0.24 * U, -0.28 * U + wob, 0.025 * U, 0.02 * U, 0, 0, TAU); c.fill();
  c.fillStyle = '#1d1410'; c.beginPath(); c.arc(ex + 0.2 * U, -0.32 * U + wob, Math.max(0.7, 0.01 * U), 0, TAU); c.fill();
  // Deichsel
  c.strokeStyle = '#6b4526'; c.lineWidth = 0.025 * U; c.beginPath(); c.moveTo(0.12 * U, -0.18 * U); c.lineTo(ex - 0.05 * U, -0.2 * U); c.stroke();
  // Wagen
  c.fillStyle = '#8a5a34'; c.fillRect(-0.36 * U, -0.3 * U + wob, 0.5 * U, 0.14 * U);
  c.strokeStyle = 'rgba(40,28,20,.6)'; c.lineWidth = Math.max(1, 0.012 * U); c.strokeRect(-0.36 * U, -0.3 * U + wob, 0.5 * U, 0.14 * U);
  if (merchant) { // Plane
    c.fillStyle = '#7b3fb0'; c.beginPath(); c.moveTo(-0.37 * U, -0.3 * U + wob); c.quadraticCurveTo(-0.11 * U, -0.62 * U, 0.15 * U, -0.3 * U + wob); c.closePath(); c.fill();
    c.strokeStyle = '#e8c45a'; c.lineWidth = Math.max(1, 0.015 * U); c.beginPath(); c.moveTo(-0.3 * U, -0.36 * U); c.quadraticCurveTo(-0.11 * U, -0.56 * U, 0.08 * U, -0.36 * U); c.stroke();
  } else { // Ladung: Säcke und Kisten
    if (cart.cargo && (cart.cargo.food || cart.cargo.wood)) {
      c.fillStyle = '#d9c48f'; c.beginPath(); c.ellipse(-0.24 * U, -0.34 * U + wob, 0.08 * U, 0.06 * U, 0, 0, TAU); c.fill();
      c.beginPath(); c.ellipse(-0.1 * U, -0.36 * U + wob, 0.08 * U, 0.065 * U, 0, 0, TAU); c.fill();
      c.fillStyle = '#a07a4f'; c.fillRect(0.0 * U, -0.42 * U + wob, 0.11 * U, 0.11 * U);
    }
  }
  // Rad mit Speichen
  const wx = -0.12 * U, wy = -0.1 * U, wr = 0.1 * U;
  c.fillStyle = '#5a3a22'; c.beginPath(); c.arc(wx, wy, wr, 0, TAU); c.fill();
  c.strokeStyle = '#c99c66'; c.lineWidth = Math.max(1, 0.015 * U);
  for (let k = 0; k < 4; k++) { const a = cart.phase * 4 + k * Math.PI / 4; c.beginPath(); c.moveTo(wx - Math.cos(a) * wr, wy - Math.sin(a) * wr); c.lineTo(wx + Math.cos(a) * wr, wy + Math.sin(a) * wr); c.stroke(); }
  c.strokeStyle = '#3b2a1e'; c.lineWidth = Math.max(1, 0.02 * U); c.beginPath(); c.arc(wx, wy, wr, 0, TAU); c.stroke();
  // Kutscher
  const dx = 0.08 * U, dy = -0.42 * U + wob;
  c.fillStyle = merchant ? '#5a2a7a' : '#3d7bd9'; c.fillRect(dx - 0.04 * U, dy, 0.08 * U, 0.12 * U);
  c.fillStyle = '#f5d3b8'; c.beginPath(); c.arc(dx, dy - 0.05 * U, 0.045 * U, 0, TAU); c.fill();
  c.fillStyle = merchant ? '#c0392b' : '#e3c66b'; c.beginPath(); c.ellipse(dx, dy - 0.08 * U, 0.07 * U, 0.02 * U, 0, 0, TAU); c.fill(); c.beginPath(); c.arc(dx, dy - 0.09 * U, 0.035 * U, Math.PI, 0); c.fill();
  c.restore();
}

/** Wachturm: runder Steinturm mit Holz-Wehrgang, Dach und Fackel. */
function drawTowerSprite(c, s) {
  const ol = 'rgba(30,26,22,.5)', lw = Math.max(1, s * 0.014), r = 0.26 * s, top = -1.45 * s;
  const g = c.createLinearGradient(-r, 0, r, 0); g.addColorStop(0, '#d4cec2'); g.addColorStop(0.6, '#a39d91'); g.addColorStop(1, '#76716a');
  c.fillStyle = g; c.beginPath(); c.moveTo(-r * 1.1, 0); c.lineTo(-r, top); c.lineTo(r, top); c.lineTo(r * 1.1, 0); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(40,36,30,.25)'; c.lineWidth = Math.max(1, s * 0.01);
  for (let y = -0.12 * s, k = 0; y > top; y -= 0.11 * s, k++) { c.beginPath(); c.moveTo(-r * 1.08, y); c.lineTo(r * 1.08, y); c.stroke(); for (let x = -r + (k % 2) * 0.07 * s; x < r; x += 0.14 * s) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 0.11 * s); c.stroke(); } }
  c.strokeStyle = ol; c.lineWidth = lw; c.beginPath(); c.moveTo(-r * 1.1, 0); c.lineTo(-r, top); c.lineTo(r, top); c.lineTo(r * 1.1, 0); c.stroke();
  c.fillStyle = '#26323e'; c.fillRect(-0.04 * s, -0.75 * s, 0.08 * s, 0.16 * s);
  c.fillStyle = '#4e301a'; c.beginPath(); c.moveTo(-0.08 * s, 0); c.lineTo(-0.08 * s, -0.2 * s); c.arc(0, -0.2 * s, 0.08 * s, Math.PI, 0); c.lineTo(0.08 * s, 0); c.fill();
  // Wehrgang aus Holz
  c.fillStyle = '#7a5230'; c.fillRect(-r * 1.45, top - 0.05 * s, r * 2.9, 0.1 * s);
  c.fillStyle = '#8a6239'; for (let x = -r * 1.4; x < r * 1.4; x += 0.09 * s) c.fillRect(x, top - 0.2 * s, 0.035 * s, 0.16 * s);
  c.fillStyle = '#6b4526'; c.fillRect(-r * 1.45, top - 0.22 * s, r * 2.9, 0.035 * s);
  // Dach
  c.beginPath(); c.moveTo(-r * 1.6, top - 0.22 * s); c.lineTo(0, top - 0.75 * s); c.lineTo(r * 1.6, top - 0.22 * s); c.closePath();
  const rg = c.createLinearGradient(-r, 0, r, 0); rg.addColorStop(0, '#b0503a'); rg.addColorStop(1, '#6e2a1e'); c.fillStyle = rg; c.fill();
  c.strokeStyle = ol; c.lineWidth = lw; c.stroke();
  // Fackelhalter
  c.fillStyle = '#3a2414'; c.fillRect(r * 1.0, -1.0 * s, 0.03 * s, 0.14 * s);
  return { torch: [0.27, -1.04], top: -1.5 };
}

/** Taverne: breites Fachwerkhaus mit Schild, Fässern und Bank. */
function drawTavernSprite(c, s) {
  const meta = drawHouseSprite(c, s, 1, false);
  const ol = 'rgba(40,28,20,.55)', lw = Math.max(1, s * 0.014);
  // Wirtshausschild am Ausleger
  c.strokeStyle = '#3a2414'; c.lineWidth = Math.max(1.5, s * 0.025); c.beginPath(); c.moveTo(-0.42 * s, -0.62 * s); c.lineTo(-0.66 * s, -0.62 * s); c.stroke();
  c.fillStyle = '#7a5230'; c.fillRect(-0.68 * s, -0.6 * s, 0.22 * s, 0.17 * s); c.strokeStyle = ol; c.lineWidth = lw; c.strokeRect(-0.68 * s, -0.6 * s, 0.22 * s, 0.17 * s);
  c.fillStyle = '#e8c45a'; c.fillRect(-0.62 * s, -0.56 * s, 0.09 * s, 0.1 * s); c.fillStyle = '#fff'; c.fillRect(-0.62 * s, -0.57 * s, 0.09 * s, 0.025 * s);
  c.strokeStyle = '#e8c45a'; c.lineWidth = Math.max(1, s * 0.015); c.beginPath(); c.arc(-0.52 * s, -0.51 * s, 0.025 * s, -1.4, 1.4); c.stroke();
  // Fässer und Bank
  for (const [bx, by] of [[0.48, -0.02], [0.6, 0.0]]) { c.fillStyle = '#7a5230'; c.beginPath(); c.ellipse(bx * s, (by - 0.08) * s, 0.065 * s, 0.09 * s, 0, 0, TAU); c.fill(); c.strokeStyle = '#3b2a1e'; c.lineWidth = lw; c.stroke(); c.beginPath(); c.moveTo((bx - 0.065) * s, (by - 0.1) * s); c.lineTo((bx + 0.065) * s, (by - 0.1) * s); c.stroke(); }
  c.fillStyle = '#8a6239'; c.fillRect(-0.4 * s, -0.08 * s, 0.22 * s, 0.035 * s); c.fillRect(-0.38 * s, -0.05 * s, 0.025 * s, 0.05 * s); c.fillRect(-0.21 * s, -0.05 * s, 0.025 * s, 0.05 * s);
  return meta;
}

/** Tempel: weißer Stein, Treppe, Säulen und goldene Kuppel mit Sonnenzeichen. */
function drawTempleSprite(c, s) {
  const ol = 'rgba(40,36,30,.45)', lw = Math.max(1, s * 0.014);
  // Treppe
  for (let k = 0; k < 3; k++) { c.fillStyle = ['#e9e4d8', '#ddd6c6', '#cfc7b4'][k]; c.fillRect((-0.6 + k * 0.05) * s, (-0.06 - k * 0.06) * s, (1.2 - k * 0.1) * s, 0.06 * s); }
  // Cella
  const g = c.createLinearGradient(-0.5 * s, 0, 0.5 * s, 0); g.addColorStop(0, '#fbf8f0'); g.addColorStop(1, '#d9d2c2');
  c.fillStyle = g; c.fillRect(-0.45 * s, -0.95 * s, 0.9 * s, 0.77 * s);
  c.fillStyle = '#3a2f26'; c.beginPath(); c.moveTo(-0.11 * s, -0.18 * s); c.lineTo(-0.11 * s, -0.48 * s); c.arc(0, -0.48 * s, 0.11 * s, Math.PI, 0); c.lineTo(0.11 * s, -0.18 * s); c.fill();
  // Säulen
  for (const x of [-0.5, -0.3, 0.3, 0.5]) {
    const cg = c.createLinearGradient((x - 0.04) * s, 0, (x + 0.04) * s, 0); cg.addColorStop(0, '#ffffff'); cg.addColorStop(1, '#bdb5a4');
    c.fillStyle = cg; c.fillRect((x - 0.04) * s, -0.98 * s, 0.08 * s, 0.8 * s);
    c.fillStyle = '#e9e4d8'; c.fillRect((x - 0.06) * s, -1.0 * s, 0.12 * s, 0.04 * s); c.fillRect((x - 0.06) * s, -0.2 * s, 0.12 * s, 0.03 * s);
  }
  // Giebel
  c.fillStyle = '#efe9dc'; c.beginPath(); c.moveTo(-0.62 * s, -1.0 * s); c.lineTo(0, -1.25 * s); c.lineTo(0.62 * s, -1.0 * s); c.closePath(); c.fill(); c.strokeStyle = ol; c.lineWidth = lw; c.stroke();
  // goldene Kuppel
  const dg = c.createRadialGradient(-0.08 * s, -1.55 * s, 0.02 * s, 0, -1.4 * s, 0.32 * s); dg.addColorStop(0, '#fff3b0'); dg.addColorStop(0.5, '#f0c35a'); dg.addColorStop(1, '#a8781e');
  c.fillStyle = '#e9e4d8'; c.fillRect(-0.24 * s, -1.32 * s, 0.48 * s, 0.1 * s);
  c.fillStyle = dg; c.beginPath(); c.arc(0, -1.32 * s, 0.26 * s, Math.PI, 0); c.fill(); c.strokeStyle = ol; c.stroke();
  c.strokeStyle = '#f0c35a'; c.lineWidth = Math.max(1, s * 0.02); c.beginPath(); c.moveTo(0, -1.58 * s); c.lineTo(0, -1.72 * s); c.stroke();
  c.fillStyle = '#ffe28a'; c.beginPath(); c.arc(0, -1.76 * s, 0.05 * s, 0, TAU); c.fill();
  return { glow: [0, -1.4] };
}

class Renderer {
  constructor(canvas, sim) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.chunks = new Map();  // Boden in Blöcken zu 16×16 Kacheln
    this.anim = new Map(); this.effects = []; this.animals = [];
    this.shadowCv = document.createElement('canvas');
    this.lightCv = document.createElement('canvas');
    this.vignetteCv = document.createElement('canvas');
    this.sprites = {}; this.spriteTs = 0; this.groundTs = 0; this.zoomAt = 0;
    this.particles = [];
    this.camX = 0; this.camY = 0; this.ts = 0;
    this.follow = null;   // Siedler, dem die Kamera folgt
    this.onTap = null;
    this.last = performance.now();
    this.attachInput();
    this.setSim(sim);
  }

  setSim(sim) {
    this.sim = sim; this.follow = null; this.ts = 0; this.particles = []; this.groundTs = 0;
    this.chunks.clear(); this.anim.clear(); this.effects = []; this.miniBase = null;
    this.buildDecor(); this.spawnAnimals();
    this.resize();
    this.centerOn(sim.world.camp.x + 0.5, sim.world.camp.y + 0.5);
  }

  /** Zufällige, aber feste Details pro Welt: Grashalme, Blumen, Farbflecken, Wassertiefe, Wolken. */
  buildDecor() {
    const { w, h, tiles } = this.sim.world, rng = mulberry32(this.sim.seed * 7 + 13);
    this.blades = tiles.map(() => Array.from({ length: 9 }, () => [rng(), rng(), 0.04 + rng() * 0.05, rng() - 0.5, rng()]));
    this.flowers = tiles.map(() => rng() < 0.16 ? Array.from({ length: 2 + Math.floor(rng() * 3) }, () => [rng(), rng()]) : null);
    this.flowerColor = tiles.map(() => ['#fff3c4', '#f4a7c6', '#c9b6ff', '#ffd166'][Math.floor(rng() * 4)]);
    this.blotches = tiles.map(() => []);
    for (let i = 0; i < w * h * 1.3; i++) {
      const b = { x: rng() * w, y: rng() * h, r: 0.35 + rng() * 0.9, l: rng() < 0.5 ? 1 : -1, a: 0.05 + rng() * 0.07 };
      for (let ty = Math.floor(b.y - b.r); ty <= Math.floor(b.y + b.r); ty++)
        for (let tx = Math.floor(b.x - b.r); tx <= Math.floor(b.x + b.r); tx++)
          if (tx >= 0 && ty >= 0 && tx < w && ty < h) this.blotches[ty * w + tx].push(b);
    }
    const world = this.sim.world;
    this.depth = tiles.map(t => {
      if (t.type !== 'water') return 0;
      for (let r = 1; r <= 3; r++)
        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
          const n = world.tile(t.x + dx, t.y + dy);
          if (n && n.type !== 'water') return r;
        }
      return 4;
    });
    this.clouds = Array.from({ length: 7 }, () => ({ x: rng() * (w + 12) - 6, y: rng() * h, r: 2.5 + rng() * 3.5, v: 0.12 + rng() * 0.1 }));
    this.rain = Array.from({ length: 150 }, () => ({ x: rng(), y: rng(), l: 0.6 + rng() * 0.6, v: 0.9 + rng() * 0.5 }));
  }

  resize() {
    const wrap = this.canvas.parentElement;
    this.viewW = Math.floor(wrap.clientWidth || window.innerWidth);
    this.viewH = Math.floor(clamp(window.innerHeight * 0.62, 260, this.viewW * 1.4));
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = Math.round(this.viewW * this.dpr), H = Math.round(this.viewH * this.dpr);
    for (const cv of [this.canvas, this.shadowCv, this.lightCv, this.vignetteCv]) { cv.width = W; cv.height = H; }
    this.canvas.style.width = this.viewW + 'px';
    this.canvas.style.height = this.viewH + 'px';
    const vc = this.vignetteCv.getContext('2d');
    const g = vc.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.4)');
    vc.fillStyle = g; vc.fillRect(0, 0, W, H);
    this.spriteTs = 0; this.chunks.clear();
    this.setZoom(this.ts || clamp(Math.floor(this.viewW / 8), 34, 64));
  }

  setZoom(z, fx = this.viewW / 2, fy = this.viewH / 2) {
    const { w, h } = this.sim.world;
    const minZ = Math.min(this.viewW / w, this.viewH / h);
    const old = this.ts || z;
    const wx = (this.camX + fx) / old, wy = (this.camY + fy) / old; // Punkt unter dem Finger bleibt stehen
    this.ts = clamp(z, minZ, 80);
    this.camX = wx * this.ts - fx; this.camY = wy * this.ts - fy;
    this.clampCam();
    this.zoomAt = performance.now();
  }

  centerOn(tx, ty) { this.camX = tx * this.ts - this.viewW / 2; this.camY = ty * this.ts - this.viewH / 2; this.clampCam(); }

  clampCam() {
    const mw = this.sim.world.w * this.ts, mh = this.sim.world.h * this.ts;
    this.camX = mw <= this.viewW ? (mw - this.viewW) / 2 : clamp(this.camX, 0, mw - this.viewW);
    this.camY = mh <= this.viewH ? (mh - this.viewH) / 2 : clamp(this.camY, 0, mh - this.viewH);
  }

  attachInput() {
    const cv = this.canvas, pts = new Map();
    let moved = 0, pinch = null;
    const pinchState = () => {
      const [a, b] = [...pts.values()];
      return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, z: this.ts };
    };
    cv.style.touchAction = 'none';
    cv.addEventListener('pointerdown', e => {
      cv.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1) moved = 0;
      if (pts.size === 2) pinch = pinchState();
    });
    cv.addEventListener('pointermove', e => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      if (pts.size === 1) {
        moved += Math.abs(dx) + Math.abs(dy);
        if (moved > 6) { this.follow = null; this.camX -= dx; this.camY -= dy; this.clampCam(); }
      } else if (pts.size === 2 && pinch) {
        const now = pinchState(), r = cv.getBoundingClientRect();
        this.setZoom(pinch.z * now.d / pinch.d, now.mx - r.left, now.my - r.top);
        moved = 99;
      }
    });
    const end = e => {
      const had = pts.delete(e.pointerId);
      if (pts.size < 2) pinch = null;
      if (had && e.type === 'pointerup' && pts.size === 0 && moved <= 6 && this.onTap) this.onTap(this.npcAt(e.clientX, e.clientY), this.tileAt(e.clientX, e.clientY));
    };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);
    cv.addEventListener('wheel', e => {
      e.preventDefault();
      const r = cv.getBoundingClientRect();
      this.setZoom(this.ts * (e.deltaY < 0 ? 1.15 : 1 / 1.15), e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });
  }

  npcAt(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    const tx = (clientX - r.left + this.camX) / this.ts - 0.5;
    const ty = (clientY - r.top + this.camY) / this.ts - 0.15;
    let best = null, bd = 1.2;
    for (const n of this.sim.npcs) {
      if (n.inside) continue;
      const d = Math.hypot(n.x - tx, n.y - ty);
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  }

  // ------------------------------------------------------ Zwischenspeicher
  makeSprite(wT, hT, axT, ayT, draw) {
    const s = this.ts, k = this.dpr;
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(wT * s * k); cv.height = Math.ceil(hT * s * k);
    const c = cv.getContext('2d');
    c.scale(k, k); c.translate(axT * s, ayT * s); c.lineJoin = 'round';
    const meta = draw(c, s) || {};
    const sh = document.createElement('canvas'); sh.width = cv.width; sh.height = cv.height;
    const d = sh.getContext('2d');
    d.drawImage(cv, 0, 0); d.globalCompositeOperation = 'source-in'; d.fillStyle = '#000'; d.fillRect(0, 0, sh.width, sh.height);
    return { cv, sh, w: wT * s, h: hT * s, ax: axT * s, ay: ayT * s, meta };
  }

  buildSprites() {
    const S = {};
    for (let v = 0; v < 4; v++) S['oak' + v] = this.makeSprite(1.4, 2.0, 0.7, 1.9, (c, s) => drawOak(c, s, v));
    for (let v = 0; v < 2; v++) S['pine' + v] = this.makeSprite(1.2, 2.1, 0.6, 2.0, (c, s) => drawPine(c, s, v));
    S.stump = this.makeSprite(0.6, 0.5, 0.3, 0.4, drawStump);
    S.bush = this.makeSprite(1.0, 0.95, 0.5, 0.85, drawBush);
    for (let v = 0; v < 2; v++) S['rock' + v] = this.makeSprite(1.0, 0.8, 0.5, 0.7, (c, s) => drawRock(c, s, v));
    for (let v = 0; v < 3; v++) S['ruin' + v] = this.makeSprite(1.0, 1.5, 0.45, 1.4, (c, s) => drawRuin(c, s, v));
    S.tower = this.makeSprite(1.0, 2.3, 0.5, 2.2, drawTowerSprite);
    S.tavern = this.makeSprite(1.7, 1.8, 0.75, 1.62, drawTavernSprite);
    S.temple = this.makeSprite(1.5, 2.0, 0.75, 1.88, drawTempleSprite);
    S.market = this.makeSprite(1.8, 1.0, 0.85, 0.75, drawMarketSprite);
    S.smithy = this.makeSprite(1.5, 2.0, 0.75, 1.85, drawSmithySprite);
    for (let v = 0; v < ROOFS.length; v++) {
      S['house' + v] = this.makeSprite(1.5, 1.75, 0.58, 1.6, (c, s) => drawHouseSprite(c, s, v, false));
      S['town' + v] = this.makeSprite(1.5, 2.15, 0.58, 2.0, (c, s) => drawHouseSprite(c, s, v, true));
    }
    S.castle = this.makeSprite(3.5, 3.85, 1.7, 3.6, drawCastleSprite);
    this.sprites = S; this.spriteTs = this.ts;
  }

  /** Bodenblock holen oder (neu) zeichnen. Nach dem Zoomen höchstens ein paar Blöcke pro Bild neu. */
  chunk(cx, cy) {
    const key = cx + ',' + cy, now = performance.now();
    let ch = this.chunks.get(key);
    if (ch) { ch.used = now; if (ch.ts === this.ts || now - this.zoomAt < 180 || this.chunkBudget <= 0) return ch; }
    this.chunkBudget--;
    const CH = 16, s = this.ts, k = Math.min(this.dpr, 2048 / (CH * s));
    const cv = ch ? ch.cv : document.createElement('canvas');
    cv.width = Math.ceil(CH * s * k); cv.height = Math.ceil(CH * s * k);
    ch = { cv, ts: s, k, cx, cy, used: now };
    this.chunks.set(key, ch);
    this.paintChunk(ch, null);
    if (this.chunks.size > 48) {
      const old = [...this.chunks.entries()].sort((p, q) => p[1].used - q[1].used).slice(0, this.chunks.size - 48);
      for (const [kk] of old) this.chunks.delete(kk);
    }
    return ch;
  }

  paintChunk(ch, only) {
    const CH = 16, s = ch.ts, c = ch.cv.getContext('2d'), w = this.sim.world;
    c.setTransform(ch.k, 0, 0, ch.k, -ch.cx * CH * s * ch.k, -ch.cy * CH * s * ch.k); c.lineCap = 'round';
    if (only) { for (const t of only) this.drawGroundTile(c, t, s); return; }
    for (let y = ch.cy * CH; y < Math.min(w.h, (ch.cy + 1) * CH); y++)
      for (let x = ch.cx * CH; x < Math.min(w.w, (ch.cx + 1) * CH); x++) this.drawGroundTile(c, w.tile(x, y), s);
  }

  refreshDirtyGround() {
    const world = this.sim.world;
    if (!world.dirtyTiles.size) return;
    const CH = 16, todo = new Map();
    for (const t of world.dirtyTiles)
      for (const n of [t, ...DIRS.map(([dx, dy]) => world.tile(t.x + dx, t.y + dy))]) {
        if (!n) continue;
        const key = Math.floor(n.x / CH) + ',' + Math.floor(n.y / CH);
        (todo.get(key) || todo.set(key, new Set()).get(key)).add(n);
      }
    for (const [key, set] of todo) { const ch = this.chunks.get(key); if (ch && ch.ts === this.ts) this.paintChunk(ch, set); else this.chunks.delete(key); }
    world.dirtyTiles.clear();
  }

  pathLevel(t) {
    if (!t) return 0;
    if (t.type === 'camp' || t.type === 'house' || t.type === 'site' || t.type === 'smithy' || t.type === 'castle' || t.type === 'market' || t.type === 'tower' || t.type === 'tavern' || t.type === 'temple') return 1;
    return t.type === 'grass' ? Math.min(1, t.traffic / 50) : 0;
  }

  /** Boden einer Kachel (wird nur bei Änderungen neu gezeichnet). */
  drawGroundTile(c, t, s) {
    const world = this.sim.world, x = t.x * s, y = t.y * s, i = t.y * world.w + t.x;
    const e = 0.75; // leicht überlappen, damit keine Kanten sichtbar werden
    c.save(); c.beginPath(); c.rect(x - e, y - e, s + 2 * e, s + 2 * e); c.clip();
    if (t.type === 'field') { // gepflügte Erde mit Furchen
      const g = c.createLinearGradient(x, y, x, y + s); g.addColorStop(0, '#7a5a3a'); g.addColorStop(1, '#5e4329');
      c.fillStyle = 'hsl(100, 40%, 35%)'; c.fillRect(x - e, y - e, s + 2 * e, s + 2 * e);
      c.fillStyle = g; c.fillRect(x + s * 0.05, y + s * 0.08, s * 0.9, s * 0.86);
      c.strokeStyle = 'rgba(40,25,12,.45)'; c.lineWidth = Math.max(1, s * 0.025);
      for (let k = 0; k < 4; k++) { const yy = y + s * (0.22 + k * 0.2); c.beginPath(); c.moveTo(x + s * 0.09, yy); c.lineTo(x + s * 0.91, yy); c.stroke(); }
      c.strokeStyle = '#8a6a42'; c.lineWidth = Math.max(1, s * 0.03); c.strokeRect(x + s * 0.05, y + s * 0.08, s * 0.9, s * 0.86);
    } else if (t.type === 'ford') { // flaches Wasser mit Trittsteinen
      c.fillStyle = 'hsl(195, 45%, 52%)'; c.fillRect(x - e, y - e, s + 2 * e, s + 2 * e);
      c.fillStyle = '#9b958a';
      for (const [fx, fy] of [[0.25, 0.3], [0.62, 0.45], [0.35, 0.72], [0.75, 0.8]]) { c.beginPath(); c.ellipse(x + fx * s, y + fy * s, s * 0.1, s * 0.07, 0, 0, TAU); c.fill(); }
    } else if (t.type === 'water') {
      c.fillStyle = 'hsl(204, 55%, 37%)'; // Tiefe kommt aus dem hellen Ufer-Verlauf
      c.fillRect(x - e, y - e, s + 2 * e, s + 2 * e);
      for (const [dx, dy] of DIRS) {
        const nb = world.tile(t.x + dx, t.y + dy);
        if (!nb || nb.type === 'water' || nb.type === 'ford') continue;
        const ex = dx === 1 ? x + s : x, ey = dy === 1 ? y + s : y;
        const g = dx ? c.createLinearGradient(ex, 0, ex - dx * s * 0.9, 0) : c.createLinearGradient(0, ey, 0, ey - dy * s * 0.9);
        g.addColorStop(0, 'rgba(140, 215, 200, .6)'); g.addColorStop(1, 'rgba(140, 215, 200, 0)');
        c.fillStyle = g; c.fillRect(x, y, s, s);
      }
    } else {
      // einheitliche Grundfarbe; Abwechslung kommt aus den weichen Flecken (keine Kachelkanten)
      c.fillStyle = 'hsl(100, 40%, 35%)'; c.fillRect(x - e, y - e, s + 2 * e, s + 2 * e);
      for (const b of this.blotches[i]) { // weiche Farbflecken
        const col = b.l > 0 ? '190, 230, 120' : '10, 40, 10';
        const g = c.createRadialGradient(b.x * s, b.y * s, 0, b.x * s, b.y * s, b.r * s);
        g.addColorStop(0, `rgba(${col}, ${b.a * 1.2})`); g.addColorStop(1, `rgba(${col}, 0)`);
        c.fillStyle = g; c.fillRect((b.x - b.r) * s, (b.y - b.r) * s, b.r * 2 * s, b.r * 2 * s);
      }
      if (t.type === 'tree') {
        const g = c.createRadialGradient(x + s / 2, y + s * 0.7, 0, x + s / 2, y + s * 0.7, s * 0.7);
        g.addColorStop(0, 'rgba(10,35,10,.22)'); g.addColorStop(1, 'rgba(10,35,10,0)');
        c.fillStyle = g; c.fillRect(x - s * 0.2, y, s * 1.4, s * 1.4);
      }
      // Sandufer
      for (const [dx, dy] of DIRS) {
        const nb = world.tile(t.x + dx, t.y + dy);
        if (!nb || nb.type !== 'water') continue;
        const ex = dx === 1 ? x + s : x, ey = dy === 1 ? y + s : y;
        const g = dx ? c.createLinearGradient(ex, 0, ex - dx * s * 0.4, 0) : c.createLinearGradient(0, ey, 0, ey - dy * s * 0.4);
        g.addColorStop(0, 'rgba(222, 204, 150, 1)'); g.addColorStop(0.5, 'rgba(222, 204, 150, .7)'); g.addColorStop(1, 'rgba(222, 204, 150, 0)');
        c.fillStyle = g; c.fillRect(x, y, s, s);
      }
      // Wege und Höfe
      const p = this.pathLevel(t);
      if (p > 0.15) {
        const cx = x + s / 2, cy = y + s / 2;
        const dirt = q => `rgb(${Math.round(92 + 56 * q)}, ${Math.round(124 - 8 * q)}, ${Math.round(58 + 18 * q)})`; // Gras → Erde
        for (const [dx, dy] of DIRS) {
          const q = Math.min(p, this.pathLevel(world.tile(t.x + dx, t.y + dy)));
          if (q <= 0.15) continue;
          c.strokeStyle = dirt(q); c.lineWidth = s * (0.22 + q * 0.2);
          c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + dx * s * 0.5, cy + dy * s * 0.5); c.stroke();
        }
        c.fillStyle = dirt(p);
        c.beginPath(); c.arc(cx, cy, s * (t.type === 'grass' ? 0.11 + p * 0.1 : 0.46), 0, TAU); c.fill();
      }
      // Grashalme und Blumen
      if (t.type === 'grass' && p < 0.5 && s >= 14) {
        c.lineWidth = Math.max(1, s * 0.025);
        for (const [bx, by, bh, lean, tone] of this.blades[i]) {
          c.strokeStyle = tone > 0.5 ? 'rgba(150, 200, 95, .35)' : 'rgba(25, 65, 25, .3)';
          const px = x + bx * s, py = y + by * s;
          c.beginPath(); c.moveTo(px, py); c.quadraticCurveTo(px + lean * s * 0.05, py - bh * s * 0.6, px + lean * s * 0.1, py - bh * s); c.stroke();
        }
        const fl = this.flowers[i];
        if (fl) for (const [fx, fy] of fl) {
          const px = x + fx * s, py = y + fy * s, r = Math.max(1, s * 0.03);
          c.fillStyle = this.flowerColor[i];
          for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(px + Math.cos(k * TAU / 4) * r, py + Math.sin(k * TAU / 4) * r, r, 0, TAU); c.fill(); }
          c.fillStyle = '#f0b54a'; c.beginPath(); c.arc(px, py, r * 0.7, 0, TAU); c.fill();
        }
      }
    }
    c.restore();
  }

  // ---------------------------------------------------------- Umgebung
  sunInfo() {
    const h = this.sim.hourFloat;
    if (h < 6 || h > 20) return { alpha: 0, dx: 0, len: 0 };
    const t = (h - 6) / 14, elev = Math.sin(Math.PI * t);
    const weatherFactor = { klar: 1, 'bewölkt': 0.45, regen: 0.2 }[this.sim.weather] ?? 1;
    return { alpha: 0.3 * Math.min(1, elev * 4) * weatherFactor, dx: -Math.cos(Math.PI * t), len: 0.25 + (1 - elev) * 0.9 };
  }

  nightAlpha() {
    const h = this.sim.hourFloat;
    return 0.72 * (h < 12 ? 1 - smooth(5, 7, h) : smooth(19, 21.5, h));
  }

  // -------------------------------------------------------------- Siedler
  pose(n) {
    const a = n.action, step = n.task && n.task.steps[n.task.i];
    const moving = !!(step && step.kind === 'move' && step.path.length);
    let arms = n.inventory.wood > 0 ? 'carry' : 'none';
    if (!moving && a) {
      if (a.id === 'gatherWood') arms = 'chop';
      else if (a.id === 'build') arms = 'build';
      else if (a.id === 'eat') arms = 'eat';
      else if (a.id === 'socialize') arms = 'talk';
      else if (a.id === 'forge') arms = 'build';
      else if (a.id === 'plantField' || a.id === 'harvest' || a.id === 'searchRuin' || a.id === 'mineStone') arms = 'chop';
      else if (a.id === 'pray') arms = 'pray';
      else if (a.id === 'fight') arms = 'fight';
    }
    let facing = n.facing || 1;
    if (!moving && step && step.face) { const dx = step.face.x - n.x; if (Math.abs(dx) > 0.1) facing = dx > 0 ? 1 : -1; }
    // Ansicht: beim Laufen nach oben/unten Rücken/Gesicht, im Stand ohne Arbeit zum Betrachter
    const view = moving ? (n.dirV || 'side') : (arms === 'none' || arms === 'carry' || arms === 'pray' ? 'down' : 'side');
    return { moving, arms, facing, step, tool: step && step.tool, view };
  }

  drawSettler(c, n, px, py, s, now, pose, phase = 0) {
    if (this.pixelChars) return this.drawSettlerPixel(c, n, px, py, s, now, pose, phase);
    const skin = SKIN[n.id % SKIN.length], hair = HAIR[(n.id * 7) % HAIR.length], style = HAIR_STYLES[(n.id * 5 + 1) % HAIR_STYLES.length];
    const U = s * 0.8, ol = 'rgba(45,28,20,.6)', ow = Math.max(0.8, U * 0.013);
    const shirt = n.color, pants = n.awakened ? '#2c2a33' : ['#5a4632', '#4a5236', '#3d4a5c'][n.id % 3];
    if (n.sleeping) { // liegt draußen unter einer Decke
      const g = c.createLinearGradient(px - 0.3 * U, 0, px + 0.3 * U, 0); g.addColorStop(0, shirt); g.addColorStop(1, shadeHex('#6b5a4a', -10));
      c.fillStyle = g; c.beginPath(); c.ellipse(px + 0.04 * U, py + 0.24 * U, 0.3 * U, 0.1 * U, 0, 0, TAU); c.fill(); c.strokeStyle = ol; c.lineWidth = ow; c.stroke();
      c.fillStyle = skin; c.beginPath(); c.arc(px - 0.28 * U, py + 0.2 * U, 0.09 * U, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = hair; c.beginPath(); c.arc(px - 0.31 * U, py + 0.18 * U, 0.085 * U, Math.PI * 0.6, Math.PI * 1.7); c.fill();
      return;
    }
    const walking = pose.moving, t = now / 1000 + n.id * 0.37;
    const ease = x => x * x * (3 - 2 * x), lerp = (a, b, k) => a + (b - a) * k;
    const sw = walking ? Math.sin(phase) : 0, gear = n.gear || {}, wpn = gear.weapon;
    let lean = walking ? 0.07 : 0, bob = walking ? Math.abs(sw) * 0.02 : Math.sin(t * 2.2) * 0.004;
    const chopT = (t / 1.15) % 1, hamT = (t / 0.6) % 1, fightT = (t / 0.75) % 1;
    if (pose.arms === 'chop') lean = chopT < 0.55 ? -0.1 * ease(chopT / 0.55) : chopT < 0.68 ? lerp(-0.1, 0.2, (chopT - 0.55) / 0.13) : lerp(0.2, 0, ease((chopT - 0.68) / 0.32));
    if (pose.arms === 'build') lean = 0.12;
    if (pose.arms === 'carry') lean += 0.05;
    if (pose.arms === 'fight' && (!wpn || !['bow', 'staff', 'spear'].includes(wpn.kind))) lean = fightT < 0.45 ? -0.08 : fightT < 0.6 ? 0.22 : 0.1;

    c.save();
    c.translate(px, py + s * 0.38); c.scale(pose.facing, 1);
    c.lineCap = 'round'; c.lineJoin = 'round';
    if (n.awakened) { // Aura
      const col = n.cls ? CLASSES[n.cls].color : '#8fd3ff', g = c.createRadialGradient(0, 0, 0, 0, 0, U * 0.4);
      g.addColorStop(0, col + '99'); g.addColorStop(1, col + '00');
      c.globalAlpha = 0.75 + Math.sin(t * 3) * 0.25; c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, U * 0.4, U * 0.14, 0, 0, TAU); c.fill(); c.globalAlpha = 1;
    }
    // Skelett
    const hip = { x: 0, y: -(0.33 + bob) * U };
    const L1 = 0.17 * U, L2 = 0.165 * U, A1 = 0.14 * U, A2 = 0.13 * U, HR = 0.105 * U;
    const shoulder = { x: hip.x + Math.sin(lean) * 0.25 * U, y: hip.y - Math.cos(lean) * 0.25 * U };
    const head = { x: shoulder.x + Math.sin(lean * 1.2) * 0.16 * U + 0.012 * U, y: shoulder.y - Math.cos(lean * 1.2) * 0.16 * U };
    const fk = (a, bend) => { const e = { x: shoulder.x + Math.sin(a) * A1, y: shoulder.y + Math.cos(a) * A1 }; return { e, h: { x: e.x + Math.sin(a + bend) * A2, y: e.y + Math.cos(a + bend) * A2 } }; };
    const ik = target => {
      let dx = target.x - shoulder.x, dy = target.y - shoulder.y, d = Math.hypot(dx, dy);
      const maxD = (A1 + A2) * 0.999; if (d > maxD) { dx *= maxD / d; dy *= maxD / d; d = maxD; }
      const base = Math.atan2(dx, dy), al = Math.acos(clamp((A1 * A1 + d * d - A2 * A2) / (2 * A1 * Math.max(d, 0.001)), -1, 1)), ua = base - al;
      return { e: { x: shoulder.x + Math.sin(ua) * A1, y: shoulder.y + Math.cos(ua) * A1 }, h: { x: shoulder.x + dx, y: shoulder.y + dy } };
    };
    // verjüngte Gliedmaße mit Umriss und Glanzlicht
    const limb = (p0, p1, p2, w0, w1, col, dark) => {
      c.strokeStyle = ol; c.lineWidth = w0 + ow * 2; c.beginPath(); c.moveTo(p0.x, p0.y); c.lineTo(p1.x, p1.y); c.stroke();
      c.lineWidth = w1 + ow * 2; c.beginPath(); c.moveTo(p1.x, p1.y); c.lineTo(p2.x, p2.y); c.stroke();
      c.strokeStyle = dark ? shadeHex(col.startsWith('#') && col.length === 7 ? col : '#777777', -35) : col;
      if (!col.startsWith('#') || col.length !== 7) c.strokeStyle = col;
      c.lineWidth = w0; c.beginPath(); c.moveTo(p0.x, p0.y); c.lineTo(p1.x, p1.y); c.stroke();
      c.lineWidth = w1; c.beginPath(); c.moveTo(p1.x, p1.y); c.lineTo(p2.x, p2.y); c.stroke();
      if (dark) { c.strokeStyle = 'rgba(0,0,0,.22)'; c.lineWidth = w0; c.beginPath(); c.moveTo(p0.x, p0.y); c.lineTo(p1.x, p1.y); c.lineTo(p2.x, p2.y); c.stroke(); }
      else { c.strokeStyle = 'rgba(255,255,255,.16)'; c.lineWidth = w1 * 0.35; c.beginPath(); c.moveTo(p0.x - w0 * 0.2, p0.y); c.lineTo(p1.x - w1 * 0.2, p1.y); c.stroke(); }
    };
    const drawLeg = (ph, dark) => {
      const a1 = walking ? Math.sin(ph) * 0.5 : 0, knee = walking ? Math.max(0, Math.cos(ph)) * 0.95 + 0.05 : 0.04;
      const k = { x: hip.x + Math.sin(a1) * L1, y: hip.y + Math.cos(a1) * L1 }, a2 = a1 - knee;
      const f = { x: k.x + Math.sin(a2) * L2, y: Math.min(0, k.y + Math.cos(a2) * L2) };
      limb({ x: hip.x + (dark ? -0.03 : 0.03) * U, y: hip.y }, k, f, 0.085 * U, 0.07 * U, pants, dark);
      const bootCol = gear.boots ? shadeHex(METAL[gear.boots.rarity], -50) : '#3b2a1e';
      if (gear.boots) { c.strokeStyle = shadeHex(METAL[gear.boots.rarity], dark ? -60 : -30); c.lineWidth = 0.08 * U; c.beginPath(); c.moveTo(k.x + (f.x - k.x) * 0.5, k.y + (f.y - k.y) * 0.5); c.lineTo(f.x, f.y - 0.01 * U); c.stroke(); }
      c.fillStyle = dark ? shadeHex(bootCol, -25) : bootCol; c.beginPath(); c.ellipse(f.x + 0.035 * U, f.y - 0.015 * U, 0.06 * U, 0.03 * U, 0, 0, TAU); c.fill();
      c.strokeStyle = ol; c.lineWidth = ow; c.stroke();
    };
    const drawArm = (arm, dark) => {
      limb(shoulder, arm.e, arm.h, 0.07 * U, 0.058 * U, shirt, dark);
      c.fillStyle = dark ? shadeHex(skin, -25) : skin; c.beginPath(); c.arc(arm.h.x, arm.h.y, 0.034 * U, 0, TAU); c.fill();
      c.strokeStyle = ol; c.lineWidth = ow; c.stroke();
    };

    // Armhaltungen
    let front, back, tool = null;
    if (pose.arms === 'chop') {
      let ua, bend;
      if (chopT < 0.55) { const k = ease(chopT / 0.55); ua = lerp(0.5, 2.85, k); bend = lerp(0.3, 0.95, k); }
      else if (chopT < 0.68) { const k = (chopT - 0.55) / 0.13; ua = lerp(2.85, 0.75, k * k); bend = lerp(0.95, 0.05, k); }
      else if (chopT < 0.8) { ua = 0.75; bend = 0.05; }
      else { const k = ease((chopT - 0.8) / 0.2); ua = lerp(0.75, 0.5, k); bend = lerp(0.05, 0.3, k); }
      front = fk(ua, bend);
      const dir = ua + bend; tool = { kind: pose.tool || 'axe', x: front.h.x, y: front.h.y, a: dir };
      back = ik({ x: front.h.x - Math.sin(dir) * 0.06 * U, y: front.h.y - Math.cos(dir) * 0.06 * U });
    } else if (pose.arms === 'fight') {
      const kind = wpn ? wpn.kind : 'sword', foe = n.foe;
      if (kind === 'bow' || kind === 'staff') {
        front = ik({ x: shoulder.x + 0.25 * U, y: shoulder.y - 0.02 * U });
        back = ik({ x: shoulder.x + (kind === 'bow' ? 0.04 + (fightT < 0.7 ? 0 : 0.09) : 0.13) * U, y: shoulder.y + 0.02 * U });
        tool = { x: front.h.x, y: front.h.y, a: kind === 'bow' ? Math.PI : Math.PI * 0.85, held: kind };
        if (foe && fightT > 0.7) {
          const k = (fightT - 0.7) / 0.3, tx = (foe.x - n.x) * s * pose.facing, ty = (foe.y - n.y) * s - 0.3 * s;
          const ax = lerp(front.h.x, tx, k), ay = lerp(front.h.y, ty, k);
          if (kind === 'bow') { c.strokeStyle = '#e8e2d0'; c.lineWidth = Math.max(1, 0.016 * U); c.beginPath(); c.moveTo(ax - 0.13 * U, ay); c.lineTo(ax, ay); c.stroke(); }
          else { const g = c.createRadialGradient(ax, ay, 0, ax, ay, 0.09 * U); g.addColorStop(0, '#fff'); g.addColorStop(0.5, RARITIES[wpn.rarity].color); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.beginPath(); c.arc(ax, ay, 0.09 * U, 0, TAU); c.fill(); }
        }
      } else if (kind === 'spear') {
        const k = fightT < 0.5 ? ease(fightT / 0.5) * 0.3 : fightT < 0.65 ? 0.3 + (fightT - 0.5) / 0.15 * 0.7 : 1 - (fightT - 0.65) / 0.35;
        front = ik({ x: shoulder.x + (0.08 + 0.15 * k) * U, y: shoulder.y + 0.07 * U });
        back = ik({ x: shoulder.x + 0.1 * k * U, y: shoulder.y + 0.11 * U });
        tool = { x: back.h.x, y: back.h.y, a: Math.PI / 2 + 0.05, held: kind };
      } else {
        let ua, bend;
        if (fightT < 0.45) { const k = ease(fightT / 0.45); ua = lerp(0.6, 2.9, k); bend = lerp(0.3, 0.6, k); }
        else if (fightT < 0.6) { const k = (fightT - 0.45) / 0.15; ua = lerp(2.9, 0.9, k * k); bend = lerp(0.6, 0.1, k); }
        else { const k = ease((fightT - 0.6) / 0.4); ua = lerp(0.9, 0.6, k); bend = lerp(0.1, 0.3, k); }
        front = fk(ua, bend); back = fk(0.4, 0.6);
        tool = { x: front.h.x, y: front.h.y, a: ua + bend, held: kind };
        if (fightT > 0.45 && fightT < 0.66) {
          const k = (fightT - 0.45) / 0.21;
          c.save(); c.strokeStyle = wpn ? RARITIES[wpn.rarity].color : '#fff'; c.globalAlpha = 1 - k; c.lineWidth = 0.05 * U;
          c.beginPath(); c.arc(shoulder.x, shoulder.y, 0.46 * U, -1.9 + k * 1.2, -0.2 + k * 1.2); c.stroke(); c.restore();
        }
      }
    } else if (pose.arms === 'build') {
      const k = hamT < 0.6 ? ease(hamT / 0.6) : hamT < 0.72 ? 1 - (hamT - 0.6) / 0.12 : 0;
      front = fk(1.0, lerp(0.15, 1.9, k)); tool = { kind: 'hammer', x: front.h.x, y: front.h.y, a: 1.0 + lerp(0.15, 1.9, k) };
      back = fk(0.85, 0.5);
    } else if (pose.arms === 'pray') {
      front = ik({ x: shoulder.x + 0.1 * U, y: shoulder.y + 0.06 * U }); back = ik({ x: shoulder.x + 0.085 * U, y: shoulder.y + 0.07 * U });
    } else if (pose.arms === 'eat') {
      const m = ease((Math.sin(t * 2.4) + 1) / 2);
      front = ik({ x: lerp(shoulder.x + 0.1 * U, head.x + 0.07 * U, m), y: lerp(shoulder.y + 0.13 * U, head.y + 0.05 * U, m) }); back = fk(0.1, 0.2);
    } else if (pose.arms === 'talk') {
      front = fk(0.55 + Math.sin(t * 1.7) * 0.35, 0.9 + Math.sin(t * 2.6) * 0.45); back = fk(0.08, 0.15);
    } else if (pose.arms === 'carry') {
      front = ik({ x: shoulder.x + 0.05 * U, y: shoulder.y - 0.08 * U }); back = walking ? fk(Math.sin(phase) * 0.4, 0.3) : fk(0.08, 0.2);
    } else {
      front = walking ? fk(-Math.sin(phase) * 0.45, 0.25 + Math.max(0, -Math.sin(phase)) * 0.35) : fk(0.08 + Math.sin(t * 1.3) * 0.03, 0.15);
      back = walking ? fk(Math.sin(phase) * 0.45, 0.25 + Math.max(0, Math.sin(phase)) * 0.35) : fk(0.06, 0.15);
    }

    // Schimmer, Umhang, Rückenwaffe, lange Haare hinten
    const topR = SLOTS.reduce((m, sl) => Math.max(m, gear[sl] ? gear[sl].rarity : -1), -1);
    if (topR >= 3) { const gc = RARITIES[topR].color, g = c.createRadialGradient(0, -0.45 * U, 0, 0, -0.45 * U, 0.6 * U); g.addColorStop(0, gc + '50'); g.addColorStop(1, gc + '00'); c.fillStyle = g; c.fillRect(-0.6 * U, -1.1 * U, 1.2 * U, 1.15 * U); }
    if (gear.cape) {
      const flap = walking ? 0.06 + Math.sin(phase * 0.5) * 0.03 : Math.sin(t * 1.4) * 0.015, cc = n.cls ? CLASSES[n.cls].color : '#8a2e3a';
      c.beginPath(); c.moveTo(shoulder.x - 0.1 * U, shoulder.y); c.quadraticCurveTo(-0.2 * U, -0.3 * U, (-0.2 - flap * 2) * U, -0.06 * U);
      c.lineTo((0.03 - flap) * U, -0.08 * U); c.lineTo(shoulder.x + 0.07 * U, shoulder.y); c.closePath();
      c.fillStyle = cc; c.fill(); c.fillStyle = 'rgba(0,0,0,.35)'; c.fill();
      c.strokeStyle = RARITIES[gear.cape.rarity].color; c.lineWidth = Math.max(1, 0.02 * U); c.stroke();
    }
    if (wpn && pose.arms !== 'fight') { c.save(); c.translate(shoulder.x + 0.1 * U, shoulder.y - 0.11 * U); c.rotate(wpn.kind === 'bow' ? 0.35 : 0.55); drawWeapon(c, wpn.kind, wpn.rarity, U, 0.5 * U, ow, shirt); c.restore(); }
    drawArm(back, true);
    drawLeg(phase + Math.PI, true);
    drawLeg(phase, false);
    // Rumpf
    c.save(); c.translate(hip.x, hip.y); c.rotate(lean);
    c.beginPath(); c.moveTo(-0.11 * U, -0.235 * U); c.quadraticCurveTo(0, -0.27 * U, 0.11 * U, -0.235 * U);
    c.lineTo(0.135 * U, 0.03 * U); c.quadraticCurveTo(0, 0.07 * U, -0.135 * U, 0.03 * U); c.closePath();
    const bg = c.createLinearGradient(-0.14 * U, -0.25 * U, 0.14 * U, 0.05 * U);
    bg.addColorStop(0, 'rgba(255,255,255,.18)'); bg.addColorStop(0.3, 'rgba(255,255,255,0)'); bg.addColorStop(0.58, 'rgba(0,0,0,0)'); bg.addColorStop(0.6, 'rgba(0,0,0,.22)'); bg.addColorStop(1, 'rgba(0,0,0,.28)');
    c.fillStyle = shirt; c.fill(); c.fillStyle = bg; c.fill(); c.strokeStyle = ol; c.lineWidth = ow; c.stroke();
    // Kragen, Gürtel, Tasche
    c.fillStyle = shadeHex(skin, -10); c.beginPath(); c.moveTo(-0.035 * U, -0.25 * U); c.lineTo(0.035 * U, -0.25 * U); c.lineTo(0, -0.19 * U); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = ow; c.beginPath(); c.moveTo(-0.05 * U, -0.255 * U); c.lineTo(0, -0.185 * U); c.lineTo(0.05 * U, -0.255 * U); c.stroke();
    c.fillStyle = '#4a2f1c'; c.fillRect(-0.13 * U, -0.035 * U, 0.26 * U, 0.035 * U);
    c.fillStyle = '#d9b45a'; c.fillRect(-0.018 * U, -0.04 * U, 0.036 * U, 0.045 * U);
    c.fillStyle = '#6b4526'; c.beginPath(); c.roundRect ? c.roundRect(0.06 * U, -0.02 * U, 0.06 * U, 0.06 * U, 0.01 * U) : c.rect(0.06 * U, -0.02 * U, 0.06 * U, 0.06 * U); c.fill();
    if (gear.armor) {
      const r = gear.armor.rarity, mc = METAL[r];
      const ag = c.createLinearGradient(-0.13 * U, -0.24 * U, 0.13 * U, 0); ag.addColorStop(0, '#ffffff'); ag.addColorStop(0.35, mc); ag.addColorStop(1, shadeHex(mc, -75));
      c.beginPath(); c.moveTo(-0.105 * U, -0.235 * U); c.quadraticCurveTo(0, -0.26 * U, 0.105 * U, -0.235 * U); c.lineTo(0.125 * U, -0.05 * U); c.quadraticCurveTo(0, -0.01 * U, -0.125 * U, -0.05 * U); c.closePath();
      c.fillStyle = ag; c.fill(); c.strokeStyle = ol; c.lineWidth = ow; c.stroke();
      c.strokeStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.moveTo(0, -0.24 * U); c.lineTo(0, -0.04 * U); c.stroke();
      if (r >= 2) { c.strokeStyle = RARITIES[r].color; c.lineWidth = Math.max(1, 0.016 * U); c.beginPath(); c.moveTo(-0.06 * U, -0.19 * U); c.lineTo(0, -0.13 * U); c.lineTo(0.06 * U, -0.19 * U); c.stroke(); }
    } else if (!n.awakened && (n.profession === 'bauer' || n.profession === 'handwerker')) {
      c.fillStyle = n.profession === 'bauer' ? '#e2d4b0' : '#6b4a2c'; c.beginPath(); c.moveTo(-0.08 * U, -0.13 * U); c.lineTo(0.08 * U, -0.13 * U); c.lineTo(0.1 * U, 0.05 * U); c.lineTo(-0.1 * U, 0.05 * U); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = ow; c.stroke();
    }
    c.restore();
    // Hals und Kopf (Anime-Stil: spitzes Kinn, große Augen, fransiger Pony, Cel-Schatten)
    const hx = head.x, hy = head.y + (pose.arms === 'talk' ? Math.sin(t * 5) * 0.006 * U : 0), H = HR * 1.12;
    c.fillStyle = shadeHex(skin, -22); c.fillRect(hx - 0.026 * U, hy + 0.06 * U, 0.052 * U, 0.06 * U);
    const hat = !n.awakened && CONFIG.professions[n.profession] ? CONFIG.professions[n.profession].hat : null;
    const hairShine = shadeHex(hair, 70), hairDark = shadeHex(hair, -45);
    if (!gear.helmet) { // Haare hinten
      c.fillStyle = hairDark;
      c.beginPath(); c.ellipse(hx - 0.15 * H, hy - 0.12 * H, H * 1.08, H * 1.0, 0, 0, TAU); c.fill();
      if (style === 'long' || style === 'braid') {
        c.beginPath(); c.moveTo(hx - 1.05 * H, hy - 0.2 * H); c.lineTo(hx - 1.15 * H, hy + 1.3 * H); c.lineTo(hx - 0.8 * H, hy + 1.0 * H);
        c.lineTo(hx - 0.6 * H, hy + 1.45 * H); c.lineTo(hx - 0.35 * H, hy + 0.9 * H); c.lineTo(hx + 0.1 * H, hy + 0.5 * H); c.closePath(); c.fill();
      }
      if (style === 'ponytail') { c.beginPath(); c.moveTo(hx - 0.8 * H, hy - 0.6 * H); c.quadraticCurveTo(hx - 2.0 * H, hy - 0.4 * H + (walking ? sw * 0.15 * H : 0), hx - 1.6 * H, hy + 1.1 * H); c.lineTo(hx - 1.2 * H, hy + 0.5 * H); c.lineTo(hx - 0.95 * H, hy - 0.1 * H); c.closePath(); c.fill(); }
      if (style === 'bun') { c.beginPath(); c.arc(hx - 0.7 * H, hy - 0.95 * H, 0.42 * H, 0, TAU); c.fill(); }
    }
    // Gesicht
    c.beginPath();
    c.moveTo(hx - H * 0.92, hy - H * 0.15);
    c.quadraticCurveTo(hx - H * 0.98, hy - H * 1.02, hx + H * 0.02, hy - H * 1.02);
    c.quadraticCurveTo(hx + H * 0.95, hy - H * 1.0, hx + H * 0.93, hy - H * 0.1);
    c.quadraticCurveTo(hx + H * 0.9, hy + H * 0.5, hx + H * 0.5, hy + H * 0.88);
    c.quadraticCurveTo(hx + H * 0.28, hy + H * 1.04, hx - H * 0.12, hy + H * 0.74);
    c.quadraticCurveTo(hx - H * 0.82, hy + H * 0.42, hx - H * 0.92, hy - H * 0.15);
    c.closePath();
    c.fillStyle = skin; c.fill();
    c.save(); c.clip(); c.fillStyle = 'rgba(160,80,60,.16)'; c.fillRect(hx - H * 1.1, hy - H * 1.1, H * 0.75, H * 2.3); c.restore(); // Cel-Schatten
    c.strokeStyle = ol; c.lineWidth = ow; c.stroke();
    // Augen
    const blink = (now + n.id * 913) % 3900 < 120, iris = EYES[(n.id * 3) % EYES.length];
    const eye = (ex, sc) => {
      const x = hx + ex * H, y = hy + 0.1 * H, rx = 0.2 * H * sc, ry = 0.28 * H;
      if (blink) { c.strokeStyle = '#2a1a14'; c.lineWidth = Math.max(1, 0.06 * H); c.beginPath(); c.moveTo(x - rx, y); c.quadraticCurveTo(x, y + ry * 0.4, x + rx, y); c.stroke(); return; }
      c.fillStyle = '#fff'; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill();
      const ig = c.createLinearGradient(0, y - ry, 0, y + ry); ig.addColorStop(0, shadeHex(iris, -70)); ig.addColorStop(1, shadeHex(iris, 40));
      c.fillStyle = ig; c.beginPath(); c.ellipse(x + rx * 0.15, y + ry * 0.08, rx * 0.8, ry * 0.85, 0, 0, TAU); c.fill();
      c.fillStyle = '#140c0a'; c.beginPath(); c.ellipse(x + rx * 0.18, y + ry * 0.12, rx * 0.35, ry * 0.42, 0, 0, TAU); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(x - rx * 0.15, y - ry * 0.35, Math.max(0.7, rx * 0.38), 0, TAU); c.fill();
      c.beginPath(); c.arc(x + rx * 0.45, y + ry * 0.45, Math.max(0.5, rx * 0.18), 0, TAU); c.fill();
      c.strokeStyle = '#1e1210'; c.lineWidth = Math.max(1, 0.075 * H); c.beginPath(); c.ellipse(x, y, rx * 1.05, ry * 1.02, 0, Math.PI * 1.08, Math.PI * 1.95); c.stroke();
      c.beginPath(); c.moveTo(x + rx * 0.95, y - ry * 0.45); c.lineTo(x + rx * 1.35, y - ry * 0.75); c.stroke(); // Wimpernschwung
    };
    eye(-0.18, 0.72); eye(0.42, 1);
    c.strokeStyle = hairDark; c.lineWidth = Math.max(0.8, 0.045 * H);
    c.beginPath(); c.moveTo(hx - 0.32 * H, hy - 0.32 * H); c.lineTo(hx - 0.06 * H, hy - 0.36 * H); c.moveTo(hx + 0.22 * H, hy - 0.38 * H); c.lineTo(hx + 0.62 * H, hy - 0.32 * H); c.stroke();
    c.strokeStyle = shadeHex(skin, -55); c.lineWidth = Math.max(0.7, 0.035 * H); c.beginPath(); c.moveTo(hx + 0.66 * H, hy + 0.36 * H); c.lineTo(hx + 0.72 * H, hy + 0.44 * H); c.stroke(); // Nase
    const happy = n.mood > 55, talking = pose.arms === 'talk' && Math.sin(t * 9) > 0;
    if (talking) { c.fillStyle = '#7a2a28'; c.beginPath(); c.ellipse(hx + 0.38 * H, hy + 0.66 * H, 0.1 * H, 0.08 * H, 0, 0, TAU); c.fill(); }
    else { c.strokeStyle = '#7a3b2e'; c.lineWidth = Math.max(0.7, 0.04 * H); c.beginPath(); c.moveTo(hx + 0.26 * H, hy + 0.64 * H); c.quadraticCurveTo(hx + 0.38 * H, hy + (happy ? 0.74 : 0.64) * H, hx + 0.5 * H, hy + 0.62 * H); c.stroke(); }
    if (happy) { c.fillStyle = 'rgba(255,120,130,.35)'; for (const bx of [-0.2, 0.55]) { c.beginPath(); c.ellipse(hx + bx * H, hy + 0.45 * H, 0.14 * H, 0.06 * H, 0, 0, TAU); c.fill(); } }
    // Pony mit spitzen Strähnen
    if (!gear.helmet) {
      c.fillStyle = hair;
      c.beginPath();
      c.moveTo(hx - 1.04 * H, hy + 0.35 * H);
      c.quadraticCurveTo(hx - 1.2 * H, hy - 1.3 * H, hx + 0.08 * H, hy - 1.24 * H);
      c.quadraticCurveTo(hx + 1.18 * H, hy - 1.18 * H, hx + 1.02 * H, hy - 0.02 * H);
      for (const [tx, ty] of [[0.86, 0.22], [0.7, -0.3], [0.5, 0.12], [0.3, -0.38], [0.1, 0.02], [-0.12, -0.36], [-0.34, 0.0], [-0.56, -0.3], [-0.78, 0.2], [-0.9, -0.1]]) c.lineTo(hx + tx * H, hy + ty * H);
      c.closePath(); c.fill();
      c.strokeStyle = shadeHex(hair, -60); c.lineWidth = ow; c.stroke();
      if (style === 'spiky') { c.beginPath(); for (let k = 0; k < 5; k++) { const bx = hx + (-0.8 + k * 0.4) * H; c.moveTo(bx - 0.22 * H, hy - 1.0 * H); c.lineTo(bx + 0.05 * H, hy - 1.65 * H + (k % 2) * 0.2 * H); c.lineTo(bx + 0.25 * H, hy - 1.0 * H); } c.fill(); }
      c.strokeStyle = hairShine; c.globalAlpha = 0.55; c.lineWidth = Math.max(1, 0.1 * H);
      c.beginPath(); c.arc(hx - 0.05 * H, hy - 0.15 * H, 0.82 * H, Math.PI * 1.2, Math.PI * 1.55); c.stroke(); c.globalAlpha = 1; // Haarglanz
      // Seitensträhne vor dem Ohr
      c.fillStyle = hair; c.beginPath(); c.moveTo(hx - 0.95 * H, hy - 0.2 * H); c.lineTo(hx - 0.7 * H, hy + 0.9 * H); c.lineTo(hx - 0.55 * H, hy - 0.1 * H); c.fill();
      if (style === 'braid') { c.fillStyle = hairDark; for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(hx - 0.85 * H, hy + (0.9 + k * 0.32) * H, (0.2 - k * 0.025) * H, 0, TAU); c.fill(); } }
    }
    if (gear.helmet) {
      const r = gear.helmet.rarity, mc = METAL[r];
      const hg = c.createLinearGradient(hx - 0.12 * U, 0, hx + 0.12 * U, 0); hg.addColorStop(0, '#fff'); hg.addColorStop(0.35, mc); hg.addColorStop(1, shadeHex(mc, -70));
      c.fillStyle = hg; c.beginPath(); c.arc(hx - 0.005 * U, hy - 0.012 * U, HR * 1.12, Math.PI * 0.95, Math.PI * 2.05); c.closePath(); c.fill(); c.strokeStyle = ol; c.lineWidth = ow; c.stroke();
      c.fillStyle = shadeHex(mc, -40); c.fillRect(hx - HR * 1.15, hy - 0.025 * U, HR * 2.3, 0.03 * U);
      if (r >= 1) { c.fillStyle = shadeHex(mc, -20); c.fillRect(hx + 0.075 * U, hy - 0.02 * U, 0.022 * U, 0.07 * U); }
      if (r >= 2) { c.fillStyle = r >= 3 ? RARITIES[r].color : '#b03a3a'; c.beginPath(); c.moveTo(hx - 0.02 * U, hy - 0.12 * U); c.quadraticCurveTo(hx - 0.18 * U, hy - 0.24 * U, hx - 0.24 * U, hy - 0.07 * U); c.quadraticCurveTo(hx - 0.11 * U, hy - 0.15 * U, hx + 0.03 * U, hy - 0.11 * U); c.fill(); }
      if (r >= 3) { c.fillStyle = '#ffe9a8'; for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(hx + sx * 0.1 * U, hy - 0.05 * U); c.lineTo(hx + sx * 0.19 * U, hy - 0.15 * U); c.lineTo(hx + sx * 0.11 * U, hy - 0.1 * U); c.fill(); } }
      if (r === 4) { const g = c.createRadialGradient(hx + 0.04 * U, hy - 0.08 * U, 0, hx + 0.04 * U, hy - 0.08 * U, 0.045 * U); g.addColorStop(0, '#fff'); g.addColorStop(1, '#ff4f6a00'); c.fillStyle = g; c.beginPath(); c.arc(hx + 0.04 * U, hy - 0.08 * U, 0.045 * U, 0, TAU); c.fill(); }
    } else if (hat === 'straw') {
      c.fillStyle = '#e3c66b'; c.beginPath(); c.ellipse(hx, hy - 0.06 * U, 0.19 * U, 0.045 * U, 0, 0, TAU); c.fill(); c.strokeStyle = ol; c.lineWidth = ow; c.stroke();
      c.beginPath(); c.ellipse(hx, hy - 0.08 * U, 0.09 * U, 0.06 * U, 0, Math.PI, 0); c.fill();
      c.strokeStyle = '#b0402f'; c.lineWidth = 0.018 * U; c.beginPath(); c.moveTo(hx - 0.09 * U, hy - 0.08 * U); c.lineTo(hx + 0.09 * U, hy - 0.08 * U); c.stroke();
    } else if (hat === 'cap') {
      c.fillStyle = '#b8342c'; c.beginPath(); c.ellipse(hx - 0.005 * U, hy - 0.03 * U, HR * 1.05, HR * 0.95, 0, Math.PI * 1.02, Math.PI * 1.98); c.closePath(); c.fill(); c.strokeStyle = ol; c.lineWidth = ow; c.stroke();
      c.fillStyle = '#8f2620'; c.fillRect(hx - HR * 1.05, hy - 0.04 * U, HR * 2.1, 0.025 * U);
      c.fillStyle = '#e9e2d4'; c.beginPath(); c.arc(hx - 0.01 * U, hy - 0.13 * U, 0.028 * U, 0, TAU); c.fill();
    } else if (hat === 'miner') {
      c.fillStyle = '#c9a43a'; c.beginPath(); c.ellipse(hx - 0.005 * U, hy - 0.03 * U, HR * 1.12, HR * 1.0, 0, Math.PI * 1.02, Math.PI * 1.98); c.closePath(); c.fill(); c.strokeStyle = ol; c.lineWidth = ow; c.stroke();
      c.fillStyle = '#8a6e22'; c.fillRect(hx - HR * 1.15, hy - 0.04 * U, HR * 2.3, 0.022 * U);
      c.fillStyle = '#fff3b0'; c.beginPath(); c.arc(hx + 0.05 * U, hy - 0.08 * U, 0.022 * U, 0, TAU); c.fill();
    } else if (hat === 'band') {
      c.fillStyle = '#3f6fb0'; c.fillRect(hx - 0.1 * U, hy - 0.06 * U, 0.2 * U, 0.026 * U);
    }
    // Holz auf der Schulter
    if (pose.arms === 'carry') {
      for (let j = 0; j < Math.min(3, Math.ceil(n.inventory.wood / 2)); j++) {
        const ly = shoulder.y - (0.04 + j * 0.06) * U;
        c.fillStyle = '#7a5230'; c.fillRect(shoulder.x - 0.26 * U, ly - 0.028 * U, 0.44 * U, 0.056 * U);
        c.fillStyle = '#d6a76d'; c.beginPath(); c.arc(shoulder.x + 0.18 * U, ly, 0.029 * U, 0, TAU); c.fill();
      }
    }
    drawArm(front, false);
    if (gear.armor && gear.armor.rarity >= 1) {
      const mc = METAL[gear.armor.rarity];
      c.fillStyle = mc; c.beginPath(); c.ellipse(shoulder.x + 0.01 * U, shoulder.y + 0.01 * U, 0.07 * U, 0.047 * U, -0.3, 0, TAU); c.fill(); c.strokeStyle = ol; c.lineWidth = ow; c.stroke();
      if (gear.armor.rarity >= 3) { c.fillStyle = RARITIES[gear.armor.rarity].color; c.beginPath(); c.moveTo(shoulder.x - 0.02 * U, shoulder.y - 0.03 * U); c.lineTo(shoulder.x + 0.02 * U, shoulder.y - 0.11 * U); c.lineTo(shoulder.x + 0.05 * U, shoulder.y - 0.03 * U); c.fill(); }
    }
    if (pose.arms === 'eat') { c.fillStyle = '#b8325f'; c.beginPath(); c.arc(front.h.x + 0.02 * U, front.h.y - 0.02 * U, 0.03 * U, 0, TAU); c.fill(); }
    if (tool) {
      c.save(); c.translate(tool.x, tool.y); c.rotate(-tool.a);
      if (tool.held) { if (tool.held === 'bow') c.translate(0, -0.23 * U); drawWeapon(c, tool.held, wpn ? wpn.rarity : 0, U, 0.45 * U, ow, shirt); }
      else {
        c.strokeStyle = '#8a6239'; c.lineWidth = 0.032 * U; c.beginPath(); c.moveTo(0, -0.07 * U); c.lineTo(0, 0.25 * U); c.stroke();
        c.fillStyle = '#aab3bb'; c.strokeStyle = ol; c.lineWidth = ow;
        if (tool.kind === 'pick') { c.strokeStyle = '#8a8f96'; c.lineWidth = 0.035 * U; c.beginPath(); c.moveTo(-0.1 * U, 0.17 * U); c.quadraticCurveTo(0, 0.25 * U, 0.12 * U, 0.17 * U); c.stroke(); }
        else if (tool.kind === 'hoe') { c.beginPath(); c.moveTo(0, 0.21 * U); c.lineTo(0.12 * U, 0.25 * U); c.lineTo(0.11 * U, 0.28 * U); c.lineTo(0, 0.25 * U); c.fill(); }
        else if (tool.kind === 'sickle') { c.strokeStyle = '#c9ced4'; c.lineWidth = 0.025 * U; c.beginPath(); c.arc(0.06 * U, 0.21 * U, 0.08 * U, -2.6, 0.3); c.stroke(); }
        else if (tool.kind === 'axe') { c.beginPath(); c.moveTo(0, 0.13 * U); c.lineTo(0.13 * U, 0.09 * U); c.quadraticCurveTo(0.16 * U, 0.18 * U, 0.13 * U, 0.27 * U); c.lineTo(0, 0.23 * U); c.closePath(); c.fill(); c.stroke(); }
        else { c.fillRect(-0.05 * U, 0.18 * U, 0.14 * U, 0.07 * U); c.strokeRect(-0.05 * U, 0.18 * U, 0.14 * U, 0.07 * U); }
      }
      c.restore();
    }
    c.restore();
  }

  /** Wildtiere: Rehe und Hasen, rein zur Atmosphäre. */
  spawnAnimals() {
    const w = this.sim.world, rng = mulberry32(this.sim.seed * 3 + 1);
    this.animals = [];
    for (let i = 0, tries = 0; i < 28 && tries < 2000; tries++) {
      const x = Math.floor(rng() * w.w), y = Math.floor(rng() * w.h);
      if (!w.walkable(x, y) || Math.hypot(x - w.camp.x, y - w.camp.y) < 10) continue;
      const deer = rng() < 0.55;
      this.animals.push({ id: i++, kind: deer ? 'deer' : 'rabbit', x, y, tx: x, ty: y, wait: rng() * 4, facing: 1, phase: 0, antlers: rng() < 0.5 });
    }
  }

  updateAnimals(dt) {
    const w = this.sim.world;
    for (const a of this.animals) {
      let flee = null;
      for (const n of this.sim.npcs) if (!n.inside && Math.abs(n.x - a.x) < 3 && Math.abs(n.y - a.y) < 3) { flee = n; break; }
      if (flee && !a.fleeing) {
        const tx = Math.round(a.x + Math.sign(a.x - flee.x || 1) * 4), ty = Math.round(a.y + Math.sign(a.y - flee.y || 1) * 3);
        if (w.walkable(tx, ty)) { a.tx = tx; a.ty = ty; a.fleeing = true; a.wait = 0; }
      }
      const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy);
      if (d < 0.05) {
        a.fleeing = false; a.moving = false;
        if ((a.wait -= dt) > 0) continue;
        const nx = Math.round(a.x + (Math.random() - 0.5) * 6), ny = Math.round(a.y + (Math.random() - 0.5) * 6);
        if (w.walkable(nx, ny)) { a.tx = nx; a.ty = ny; a.wait = 1 + Math.random() * 5; }
        continue;
      }
      const sp = (a.kind === 'deer' ? 0.9 : 1.2) * (a.fleeing ? 3 : 1) * dt, st = Math.min(sp, d);
      const nx = a.x + dx / d * st, ny = a.y + dy / d * st;
      if (!w.walkable(Math.round(nx), Math.round(ny))) { a.tx = Math.round(a.x); a.ty = Math.round(a.y); continue; }
      a.x = nx; a.y = ny; a.moving = true; a.phase += st * 9;
      if (Math.abs(dx) > 0.05) a.facing = dx > 0 ? 1 : -1;
    }
  }

  drawAnimal(c, a, s) {
    const x = (a.x + 0.5) * s, y = (a.y + 0.8) * s;
    c.save(); c.translate(x, y); c.scale(a.facing, 1); c.lineCap = 'round';
    c.fillStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.ellipse(0, 0, s * 0.2, s * 0.05, 0, 0, TAU); c.fill();
    if (a.kind === 'deer') {
      const sw = a.moving ? Math.sin(a.phase) * 0.35 : 0, U = s;
      c.strokeStyle = '#6b4a2c'; c.lineWidth = U * 0.035;
      for (const [lx, ph] of [[-0.12, 0], [-0.08, Math.PI], [0.1, Math.PI], [0.14, 0]]) {
        const a1 = a.moving ? Math.sin(a.phase + ph) * 0.35 : 0;
        c.beginPath(); c.moveTo(lx * U, -0.22 * U); c.lineTo(lx * U + Math.sin(a1) * 0.22 * U, 0); c.stroke();
      }
      const g = c.createLinearGradient(0, -0.38 * U, 0, -0.2 * U); g.addColorStop(0, '#b07a48'); g.addColorStop(1, '#8a5a32');
      c.fillStyle = g; c.beginPath(); c.ellipse(0, -0.28 * U, 0.19 * U, 0.09 * U, 0, 0, TAU); c.fill();
      c.fillStyle = '#f3e6d0'; c.beginPath(); c.ellipse(-0.19 * U, -0.3 * U, 0.03 * U, 0.04 * U, 0, 0, TAU); c.fill();
      c.strokeStyle = '#9a6a3c'; c.lineWidth = U * 0.06; c.beginPath(); c.moveTo(0.14 * U, -0.32 * U); c.lineTo(0.2 * U, -0.46 * U - sw * 0.02 * U); c.stroke();
      c.fillStyle = '#a06e40'; c.beginPath(); c.ellipse(0.24 * U, -0.48 * U, 0.07 * U, 0.04 * U, 0.3, 0, TAU); c.fill();
      c.fillStyle = '#1d1410'; c.beginPath(); c.arc(0.26 * U, -0.49 * U, Math.max(0.8, 0.012 * U), 0, TAU); c.fill();
      if (a.antlers) { c.strokeStyle = '#d9c39a'; c.lineWidth = U * 0.018; c.beginPath(); c.moveTo(0.21 * U, -0.52 * U); c.lineTo(0.18 * U, -0.64 * U); c.moveTo(0.19 * U, -0.6 * U); c.lineTo(0.13 * U, -0.63 * U); c.moveTo(0.23 * U, -0.52 * U); c.lineTo(0.26 * U, -0.63 * U); c.stroke(); }
    } else {
      const hop = a.moving ? Math.abs(Math.sin(a.phase * 0.7)) * 0.12 * s : 0;
      c.translate(0, -hop);
      c.fillStyle = '#9c8a76'; c.beginPath(); c.ellipse(0, -0.09 * s, 0.1 * s, 0.07 * s, 0, 0, TAU); c.fill();
      c.beginPath(); c.arc(0.09 * s, -0.14 * s, 0.05 * s, 0, TAU); c.fill();
      c.beginPath(); c.ellipse(0.08 * s, -0.24 * s, 0.017 * s, 0.06 * s, -0.2, 0, TAU); c.fill();
      c.beginPath(); c.ellipse(0.11 * s, -0.24 * s, 0.017 * s, 0.06 * s, 0.2, 0, TAU); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(-0.1 * s, -0.1 * s, 0.03 * s, 0, TAU); c.fill();
    }
    c.restore();
  }

  /** Lichtsäule bei Level-Aufstieg oder Erwachen. */
  burst(n, kind) { this.effects.push({ n, kind, born: performance.now() }); }

  /** Getreide auf dem Feld: keimt, wächst, wird golden. */
  drawCrops(c, t, s, now) {
    const p = Math.min(1, t.timer / CONFIG.farming.growMinutes);
    if (p < 0.12) return;
    const stage = p < 0.45 ? 1 : p < 1 ? 2 : 3, h = [0, 0.14, 0.3, 0.4][stage] * s, ripe = stage === 3;
    c.lineCap = 'round';
    for (let row = 0; row < 4; row++) for (let col = 0; col < 5; col++) {
      const px = (t.x + 0.16 + col * 0.17) * s, py = (t.y + 0.28 + row * 0.2) * s;
      const sway = Math.sin(now / 700 + px * 0.05 + row) * 0.05 * s * (stage / 3);
      c.strokeStyle = ripe ? '#c9a94a' : stage === 2 ? '#6fae45' : '#8fd06a';
      c.lineWidth = Math.max(1, s * 0.022);
      c.beginPath(); c.moveTo(px, py); c.quadraticCurveTo(px + sway * 0.5, py - h * 0.6, px + sway, py - h); c.stroke();
      if (stage >= 2) { c.beginPath(); c.moveTo(px, py - h * 0.4); c.lineTo(px + s * 0.05, py - h * 0.55); c.stroke(); }
      if (ripe) { c.fillStyle = '#f2d27a'; c.beginPath(); c.ellipse(px + sway, py - h - s * 0.03, s * 0.022, s * 0.05, sway / s, 0, TAU); c.fill(); }
    }
  }

  drawGate(c, t, s, now) {
    const cx = (t.x + 0.5) * s, cy = (t.y + 0.5) * s, g = t.gate;
    const col = ['', '120,200,255', '190,130,255', '255,95,130'][g.tier];
    c.fillStyle = '#6f6a62';
    for (let k = 0; k < 9; k++) { const a = k / 9 * TAU; c.beginPath(); c.ellipse(cx + Math.cos(a) * s * 0.55, cy + 0.3 * s + Math.sin(a) * s * 0.2, s * 0.08, s * 0.055, 0, 0, TAU); c.fill(); }
    const rx = s * 0.32, ry = s * 0.55, pulse = 1 + Math.sin(now / 400 + t.x) * 0.05, py = cy - s * 0.2;
    const grad = c.createRadialGradient(cx, py, 0, cx, py, ry * 1.3 * pulse);
    grad.addColorStop(0, 'rgba(255,255,255,.95)'); grad.addColorStop(0.3, `rgba(${col},.85)`); grad.addColorStop(1, `rgba(${col},0)`);
    c.fillStyle = grad; c.beginPath(); c.ellipse(cx, py, rx * 1.35 * pulse, ry * 1.2 * pulse, 0, 0, TAU); c.fill();
    c.save(); c.translate(cx, py); c.lineWidth = Math.max(1, s * 0.03);
    for (let k = 0; k < 3; k++) {
      const r0 = now / (500 + k * 250) * (k % 2 ? -1 : 1) + k;
      c.strokeStyle = `rgba(${col},${0.85 - k * 0.2})`;
      c.beginPath(); c.ellipse(0, 0, rx * (1 - k * 0.25), ry * (1 - k * 0.25), 0, r0, r0 + 4.3); c.stroke();
    }
    c.restore();
    if (Math.random() < 0.12) this.emit('spark', t.x + 0.5 + rand(-0.25, 0.25), t.y + 0.3, { vx: rand(-0.1, 0.1), vy: -rand(0.2, 0.6), life: rand(0.8, 1.6), size: 0.025, rgb: col });
  }

  /** Was liegt unter dem Finger? Hohe Objekte (Häuser, Bäume) auch über ihrer Kachel antippbar. */
  tileAt(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect(), w = this.sim.world;
    const tx = Math.floor((clientX - r.left + this.camX) / this.ts), ty = Math.floor((clientY - r.top + this.camY) / this.ts);
    const here = w.tile(tx, ty), below = w.tile(tx, ty + 1);
    const tall = t => t && ['house', 'tree', 'site', 'ruin', 'gate', 'smithy', 'market', 'tower', 'tavern', 'temple'].includes(t.type);
    const pick = t => t && t.part ? t.part : t;
    for (let dy = 1; dy <= 3; dy++) { const t = w.tile(tx, ty + dy); if (t && t.type === 'castle' && (!here || here.type === 'grass')) return pick(t); }
    if (!tall(here) && tall(below)) return pick(below);
    return pick(here);
  }

  /** Minikarte: Gelände als 1 Pixel pro Kachel, darüber Siedler und Kameraausschnitt. */
  drawMinimap(mc, size) {
    const w = this.sim.world, now = performance.now();
    if (!this.miniBase || now - this.miniAt > 4000) {
      this.miniAt = now;
      const cv = this.miniBase || (this.miniBase = document.createElement('canvas'));
      cv.width = w.w; cv.height = w.h;
      const ctx = cv.getContext('2d'), img = ctx.createImageData(w.w, w.h);
      const COL = { grass: [77, 122, 58], tree: [36, 80, 44], stump: [90, 110, 60], water: [47, 111, 159], ford: [90, 159, 192], bush: [60, 125, 63],
        rock: [138, 134, 125], ruin: [184, 178, 165], field: [196, 160, 80], smithy: [230, 80, 40], market: [240, 200, 80], tower: [200, 195, 185], tavern: [190, 120, 60], temple: [250, 240, 200], castle: [235, 230, 215], camp: [255, 138, 42], house: [201, 106, 60], site: [180, 138, 88], gate: [169, 139, 255] };
      w.tiles.forEach((t, i) => {
        let col = COL[t.type] || COL.grass;
        if (t.type === 'grass' && t.traffic > 25) col = [138, 115, 80];
        img.data.set([col[0], col[1], col[2], 255], i * 4);
      });
      ctx.putImageData(img, 0, 0);
    }
    const k = size / Math.max(w.w, w.h);
    mc.imageSmoothingEnabled = false;
    mc.clearRect(0, 0, size, size);
    mc.drawImage(this.miniBase, 0, 0, w.w * k, w.h * k);
    for (const g of w.gates) { mc.fillStyle = `rgba(200,170,255,${0.6 + Math.sin(now / 300) * 0.4})`; mc.fillRect((g.x - 0.5) * k, (g.y - 0.5) * k, 2 * k, 2 * k); }
    for (const cart of this.sim.carts) { mc.fillStyle = cart.kind === 'merchant' ? '#c792ea' : '#ffd166'; mc.fillRect(cart.x * k, cart.y * k, 1.8 * k, 1.8 * k); }
    for (const m of this.sim.monsters) { mc.fillStyle = '#ff3b3b'; mc.fillRect(m.x * k, m.y * k, 1.6 * k, 1.6 * k); }
    for (const n of this.sim.npcs) {
      if (n.inside) continue;
      mc.fillStyle = n.awakened ? (n.cls ? CLASSES[n.cls].color : '#8fd3ff') : '#fff';
      const r = n.awakened ? 1.6 * k : 0.9 * k;
      mc.fillRect(n.x * k + k / 2 - r / 2, n.y * k + k / 2 - r / 2, r, r);
    }
    mc.strokeStyle = '#fff'; mc.lineWidth = 1;
    mc.strokeRect(this.camX / this.ts * k, this.camY / this.ts * k, this.viewW / this.ts * k, this.viewH / this.ts * k);
  }

  // ---------------------------------------------------- dynamische Objekte
  drawCamp(c, t, s, now) {
    const x = t.x * s, y = t.y * s, cx = x + s * 0.58, cy = y + s * 0.72;
    // Holzlager
    const town = t.town || this.sim.capital, kc = this.sim.kingdom ? this.sim.kingdom.color : town.color;
    { // Bannerstange mit wehender Fahne
      const fx = x + s * 0.12, top = y - s * 0.9, wave = Math.sin(now / 300 + t.x) * s * 0.03;
      c.strokeStyle = '#5a3a22'; c.lineWidth = Math.max(1.5, s * 0.03); c.beginPath(); c.moveTo(fx, y + s * 0.6); c.lineTo(fx, top); c.stroke();
      c.fillStyle = kc; c.beginPath(); c.moveTo(fx, top); c.quadraticCurveTo(fx + s * 0.2, top + wave, fx + s * 0.4, top + s * 0.04 + wave); c.lineTo(fx + s * 0.4, top + s * 0.24 + wave); c.quadraticCurveTo(fx + s * 0.2, top + s * 0.2 - wave, fx, top + s * 0.22); c.fill();
      c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.arc(fx + s * 0.18, top + s * 0.12 + wave * 0.5, s * 0.045, 0, TAU); c.fill();
    }
    const logs = Math.min(14, Math.ceil(town.stock.wood / 1.5));
    let i = 0;
    for (let row = 0; row < 4 && i < logs; row++)
      for (let k = 0; k < 5 - row && i < logs; k++, i++) {
        const lx = x - s * 0.22 + (k + row * 0.5) * s * 0.12, ly = y + s * (0.95 - row * 0.1);
        c.fillStyle = '#6b4526'; c.fillRect(lx - s * 0.055, ly - s * 0.24, s * 0.11, s * 0.24);
        const g = c.createRadialGradient(lx, ly, 0, lx, ly, s * 0.058);
        g.addColorStop(0, '#e2b77e'); g.addColorStop(1, '#a87b4a');
        c.fillStyle = g; c.beginPath(); c.arc(lx, ly, s * 0.058, 0, TAU); c.fill();
      }
    // Steinring und Glut
    for (let k = 0; k < 8; k++) {
      const a = k / 8 * TAU;
      c.fillStyle = k % 2 ? '#8f8d85' : '#77756e';
      c.beginPath(); c.ellipse(cx + Math.cos(a) * s * 0.25, cy + Math.sin(a) * s * 0.11, s * 0.065, s * 0.048, 0, 0, TAU); c.fill();
    }
    c.fillStyle = '#ff7a2a'; c.beginPath(); c.ellipse(cx, cy, s * 0.17, s * 0.07, 0, 0, TAU); c.fill();
    c.fillStyle = '#3a2416';
    c.save(); c.translate(cx, cy); c.rotate(0.35); c.fillRect(-s * 0.2, -s * 0.03, s * 0.4, s * 0.06); c.rotate(-0.7); c.fillRect(-s * 0.2, -s * 0.03, s * 0.4, s * 0.06); c.restore();
    // Flammen
    const flame = (h, w, col, ph) => {
      const fh = s * h * (0.82 + 0.18 * Math.sin(now / 85 + ph) + 0.06 * Math.sin(now / 37 + ph * 2));
      c.fillStyle = col; c.beginPath(); c.moveTo(cx - s * w, cy);
      c.quadraticCurveTo(cx - s * w * 1.1, cy - fh * 0.55, cx + Math.sin(now / 140 + ph) * s * 0.05, cy - fh);
      c.quadraticCurveTo(cx + s * w * 1.1, cy - fh * 0.55, cx + s * w, cy); c.fill();
    };
    flame(0.62, 0.16, '#d9481c', 0); flame(0.46, 0.12, '#ff8f2a', 1.7); flame(0.28, 0.07, '#ffe27a', 3.1);
  }

  drawSite(c, t, s, now, site) {
    const big = site.type === 'castle', p = Math.min(1, site.progress / site.work), bx = (t.x + 0.5) * s, by = (t.y + 0.95) * s, sc = big ? 2.6 : 1;
    c.fillStyle = 'rgba(150,118,78,.9)'; c.beginPath(); c.ellipse(bx, by - s * 0.05, s * 0.55 * sc, s * 0.18 * sc, 0, 0, TAU); c.fill();
    const sp = big ? this.sprites.castle : site.type === 'smithy' ? this.sprites.smithy : this.sprites['house' + (site.town ? site.town.buildings.length + 1 : 1) % ROOFS.length];
    const visTop = by + (sp.h - sp.ay) - sp.h * (0.05 + p * 0.95);
    c.save(); c.beginPath(); c.rect(bx - sp.ax, visTop, sp.w, by + sp.h); c.clip();
    c.drawImage(sp.cv, bx - sp.ax, by - sp.ay, sp.w, sp.h); c.restore();
    // Gerüst
    c.strokeStyle = '#b48a58'; c.lineWidth = Math.max(1.2, s * 0.035);
    const top = by - s * Math.max(0.35, 1.15 * p);
    c.beginPath();
    for (const gx of big ? [-1.5, -0.5, 0.5, 1.5] : [-0.52, 0.52]) { c.moveTo(bx + gx * s, by); c.lineTo(bx + gx * s, big ? by - s * Math.max(0.5, 3 * p) : top); }
    for (let yy = by - s * 0.3; yy > (big ? by - s * 3 * p : top); yy -= s * 0.3) { c.moveTo(bx - 0.55 * s * sc, yy); c.lineTo(bx + 0.55 * s * sc, yy); }
    c.stroke();
    // Bretterstapel
    c.fillStyle = '#c99c66'; for (let k = 0; k < 3; k++) c.fillRect(bx + s * 0.35, by - s * (0.04 + k * 0.05), s * 0.32, s * 0.04);
    // Fortschritt
    const bw = s * 0.9, bh = Math.max(4, s * 0.09), barY = top - s * 0.25;
    c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(bx - bw / 2, barY, bw, bh);
    c.fillStyle = '#f0b54a'; c.fillRect(bx - bw / 2, barY, bw * p, bh);
  }

  /** Häuser nahe der Ortsmitte werden zu Stadthäusern, sobald der Ort groß genug ist. */
  houseSprite(t) {
    const b = t.building, tw = (b && b.town) || this.sim.capital, id = b ? b.id : 0;
    const big = tw.houses.length >= 10 && Math.hypot(t.x - tw.camp.x, t.y - tw.camp.y) <= 4 + tw.houses.length / 6;
    return this.sprites[(big ? 'town' : 'house') + id % ROOFS.length];
  }

  treeSprite(t) {
    return t.shade < 0.3 ? this.sprites['pine' + (t.shade < 0.15 ? 0 : 1)] : this.sprites['oak' + Math.min(3, Math.floor((t.shade - 0.3) / 0.7 * 4))];
  }
  treeBase(t, s) { return [(t.x + 0.5 + (t.shade - 0.5) * 0.18) * s, (t.y + 0.86) * s]; }

  // --------------------------------------------------------------- Partikel
  emit(type, x, y, o = {}) {
    if (this.particles.length > 320) return;
    const life = o.life || 1;
    this.particles.push({ type, x, y, vx: 0, vy: 0, g: 0, size: 0.05, seed: Math.random() * 10, ...o, life, max: life });
  }

  updateParticles(dt) {
    for (const p of this.particles) {
      p.life -= dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.type === 'leaf') p.x += Math.sin(p.life * 3 + p.seed) * dt * 0.4;
      if (p.type === 'firefly') { p.vx = clamp(p.vx + (Math.random() - 0.5) * dt * 1.5, -0.4, 0.4); p.vy = clamp(p.vy + (Math.random() - 0.5) * dt * 1.5, -0.4, 0.4); }
    }
    this.particles = this.particles.filter(p => p.life > 0);
  }

  drawParticles(c, s, now, glow) {
    for (const p of this.particles) {
      const isGlow = p.type === 'spark' || p.type === 'firefly';
      if (isGlow !== glow) continue;
      const k = p.life / p.max, x = p.x * s, y = p.y * s;
      switch (p.type) {
        case 'chip':
          c.fillStyle = `rgba(214, 167, 109, ${k})`; c.fillRect(x, y, p.size * s, p.size * s * 0.6); break;
        case 'dust':
          c.fillStyle = `rgba(200, 175, 135, ${0.35 * k})`; c.beginPath(); c.arc(x, y, p.size * s * (1.6 - k), 0, TAU); c.fill(); break;
        case 'leaf':
          c.fillStyle = p.color; c.globalAlpha = Math.min(1, k * 2);
          c.beginPath(); c.ellipse(x, y, s * 0.04, s * 0.02, p.seed + now / 400, 0, TAU); c.fill(); c.globalAlpha = 1; break;
        case 'ripple':
          c.strokeStyle = `rgba(255,255,255,${0.5 * k})`; c.lineWidth = 1;
          c.beginPath(); c.ellipse(x, y, s * 0.3 * (1 - k), s * 0.12 * (1 - k), 0, 0, TAU); c.stroke(); break;
        case 'spark':
          c.fillStyle = p.rgb ? `rgba(${p.rgb},${k})` : `rgba(255, ${150 + 80 * k | 0}, 60, ${k})`; c.beginPath(); c.arc(x, y, Math.max(0.8, p.size * s), 0, TAU); c.fill(); break;
        case 'firefly': {
          const a = (0.5 + 0.5 * Math.sin(now / 280 + p.seed * 5)) * Math.min(1, k * 3, (p.max - p.life) * 2);
          const g = c.createRadialGradient(x, y, 0, x, y, s * 0.18);
          g.addColorStop(0, `rgba(220, 255, 140, ${a})`); g.addColorStop(1, 'rgba(220,255,140,0)');
          c.fillStyle = g; c.fillRect(x - s * 0.18, y - s * 0.18, s * 0.36, s * 0.36); break;
        }
      }
    }
  }

  emitAmbient(dt, x0, x1, y0, y1, na, drawn) {
    const sim = this.sim, w = sim.world, chance = r => Math.random() < r * dt;
    for (const tw of sim.towns) { const cp = tw.camp;
    if (cp.x >= x0 - 1 && cp.x <= x1 + 1 && cp.y >= y0 - 1 && cp.y <= y1 + 1 && chance(7))
      this.emit('spark', cp.x + 0.58 + rand(-0.1, 0.1), cp.y + 0.45, { vx: rand(-0.15, 0.15), vy: -rand(0.5, 1.1), life: rand(0.6, 1.4), size: 0.022 }); }
    for (const e of drawn) {
      const { n, pose } = e, f = pose.step && pose.step.face;
      const topR = n.gear ? SLOTS.reduce((m, sl) => Math.max(m, n.gear[sl] ? n.gear[sl].rarity : -1), -1) : -1;
      if (topR >= 3 && chance(4)) { const v = parseInt(RARITIES[topR].color.slice(1), 16); this.emit('spark', n.x + 0.5 + rand(-0.25, 0.25), n.y + rand(0.1, 0.8), { vy: -rand(0.2, 0.5), life: rand(0.6, 1.2), size: 0.022, rgb: `${v >> 16},${(v >> 8) & 255},${v & 255}` }); }
      if (n.awakened && chance(2.5)) { const col = n.cls ? CLASSES[n.cls].color : '#8fd3ff', v = parseInt(col.slice(1), 16); this.emit('spark', n.x + 0.5 + rand(-0.2, 0.2), n.y + 0.8, { vy: -rand(0.3, 0.6), life: rand(0.8, 1.4), size: 0.02, rgb: `${v >> 16},${(v >> 8) & 255},${v & 255}` }); }
      if (pose.arms === 'chop' && f && chance(2.5))
        for (let k = 0; k < 3; k++) this.emit('chip', f.x + 0.5, f.y + 0.55, { vx: rand(-1, 1), vy: -rand(0.8, 1.6), g: 5, life: 0.6, size: 0.05 });
      if (pose.arms === 'build' && f && chance(2)) this.emit('dust', f.x + rand(0.2, 0.8), f.y + 0.8, { vy: -0.15, life: 0.9, size: 0.1 });
      if (pose.moving && chance(1.2)) { const t = w.tile(Math.round(n.x), Math.round(n.y)); if (t && t.traffic > 15) this.emit('dust', n.x + 0.5, n.y + 0.88, { vy: -0.1, life: 0.8, size: 0.09 }); }
    }
    const rx = () => Math.floor(rand(x0, x1 + 1)), ry = () => Math.floor(rand(y0, y1 + 1));
    if (na < 0.2 && sim.weather !== 'regen' && chance(1.5)) {
      const t = w.tile(rx(), ry());
      if (t && t.type === 'tree') this.emit('leaf', t.x + 0.5 + rand(-0.3, 0.3), t.y - 0.4, { vx: 0.25, vy: 0.3, life: 3, color: Math.random() < 0.3 ? '#d9b44a' : '#7fb24a' });
    }
    if (sim.weather === 'regen') for (let k = 0; k < 3; k++) if (chance(5)) {
      const t = w.tile(rx(), ry());
      if (t && t.type === 'water') this.emit('ripple', t.x + rand(0.1, 0.9), t.y + rand(0.1, 0.9), { life: 0.7 });
    }
    if (na > 0.3 && sim.weather !== 'regen' && this.particles.filter(p => p.type === 'firefly').length < 24 && chance(5)) {
      const t = w.tile(rx(), ry());
      if (t && (t.type === 'tree' || t.type === 'bush' || t.type === 'water')) this.emit('firefly', t.x + rand(0, 1), t.y + rand(-0.3, 0.8), { life: rand(5, 9) });
    }
  }

  // ------------------------------------------------------------- Ein Bild
  render(alpha, selected, selTile = null) {
    const { ctx: c, sim } = this;
    const now = performance.now(), dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now; this.now = now;
    const settled = now - this.zoomAt > 180;
    if (this.spriteTs !== this.ts && (settled || !this.spriteTs)) this.buildSprites();
    this.chunkBudget = 4;
    this.refreshDirtyGround();
    this.updateAnimals(dt);
    const s = this.ts, sk = s / this.spriteTs; // während des Zoomens Sprites skalieren
    const { w, h } = sim.world, dpr = this.dpr, W = this.canvas.width, H = this.canvas.height;

    if (this.follow && !this.follow.inside) {
      const tx = (this.follow.x + 0.5) * s - this.viewW / 2, ty = (this.follow.y + 0.5) * s - this.viewH / 2;
      this.camX += (tx - this.camX) * 0.08; this.camY += (ty - this.camY) * 0.08; this.clampCam();
    }
    const world = () => c.setTransform(dpr, 0, 0, dpr, -this.camX * dpr, -this.camY * dpr);
    const screen = () => c.setTransform(1, 0, 0, 1, 0, 0);
    c.lineJoin = 'round'; c.lineCap = 'butt';
    screen(); c.fillStyle = '#16231a'; c.fillRect(0, 0, W, H);
    world();

    const x0 = Math.max(0, Math.floor(this.camX / s) - 1), x1 = Math.min(w - 1, Math.ceil((this.camX + this.viewW) / s));
    const y0 = Math.max(0, Math.floor(this.camY / s) - 1), y1 = Math.min(h - 1, Math.ceil((this.camY + this.viewH) / s) + 2);

    // 1) Boden aus Blöcken
    const CH = 16, detail = s >= 14; // weit herausgezoomt: weniger Details
    for (let cy = Math.floor(Math.max(0, y0) / CH); cy <= Math.floor(y1 / CH); cy++)
      for (let cx = Math.floor(Math.max(0, x0) / CH); cx <= Math.floor(x1 / CH); cx++) {
        const ch = this.chunk(cx, cy);
        c.drawImage(ch.cv, cx * CH * s, cy * CH * s, CH * s + 0.6, CH * s + 0.6);
      }

    // 2) Wasser in Bewegung
    c.lineWidth = Math.max(1, s * 0.03);
    if (detail) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const t = sim.world.tile(x, y);
      if (t.type !== 'water') continue;
      for (let k = 0; k < 2; k++) {
        const yy = (y + 0.3 + k * 0.4) * s + Math.sin(now / 900 + x * 1.3 + k * 2) * s * 0.04;
        c.strokeStyle = `rgba(255,255,255,${0.1 + 0.08 * Math.sin(now / 700 + x + y * 2 + k)})`;
        c.beginPath();
        for (let j = 0; j <= 4; j++) c.lineTo((x + j / 4) * s, yy + Math.sin(now / 600 + (x + j / 4) * 4 + k) * s * 0.03);
        c.stroke();
      }
    }

    // Siedler vorbereiten
    const rows = new Map(), drawn = [];
    for (const n of sim.npcs) {
      if (n.inside) continue;
      const fx = n.prevX + (n.x - n.prevX) * alpha, fy = n.prevY + (n.y - n.prevY) * alpha;
      const pose = this.pose(n);
      const off = pose.moving ? 0 : (n.id % 5 - 2) * 0.14; // Stehende etwas verteilen
      let an = this.anim.get(n.id);
      if (!an) { an = { x: fx, y: fy, dist: 0 }; this.anim.set(n.id, an); }
      const dd = Math.hypot(fx - an.x, fy - an.y);
      if (dd < 1) an.dist += dd;
      an.x = fx; an.y = fy;
      const e = { n, px: (fx + 0.5 + off) * s, py: (fy + 0.5) * s, fy, pose, phase: an.dist / 0.75 * TAU };
      const r = clamp(Math.round(fy), y0, y1);
      (rows.get(r) || rows.set(r, []).get(r)).push(e);
      drawn.push(e);
    }
    for (const cart of sim.carts) {
      if (cart.x < x0 - 2 || cart.x > x1 + 2 || cart.y < y0 - 1 || cart.y > y1) continue;
      const fy = cart.prevY + (cart.y - cart.prevY) * alpha, r = clamp(Math.round(fy), y0, y1);
      (rows.get(r) || rows.set(r, []).get(r)).push({ cart, fy, fx: cart.prevX + (cart.x - cart.prevX) * alpha });
    }
    for (const m of sim.monsters) {
      if (m.x < x0 - 1 || m.x > x1 + 1 || m.y < y0 - 1 || m.y > y1) continue;
      const fy = m.prevY + (m.y - m.prevY) * alpha, r = clamp(Math.round(fy), y0, y1);
      (rows.get(r) || rows.set(r, []).get(r)).push({ monster: m, fy, fx: m.prevX + (m.x - m.prevX) * alpha });
    }
    if (s >= 10) for (const a of this.animals) {
      if (a.x < x0 - 1 || a.x > x1 + 1 || a.y < y0 - 1 || a.y > y1) continue;
      const r = clamp(Math.round(a.y), y0, y1);
      (rows.get(r) || rows.set(r, []).get(r)).push({ animal: a, fy: a.y });
    }

    // 3) Sonnenschatten (in eigener Ebene, damit sich Schatten nicht doppelt abdunkeln)
    const sun = this.sunInfo();
    if (sun.alpha > 0.01 && this.spriteTs && detail) {
      const sc = this.shadowCv.getContext('2d');
      sc.setTransform(1, 0, 0, 1, 0, 0); sc.clearRect(0, 0, W, H);
      sc.setTransform(dpr, 0, 0, dpr, -this.camX * dpr, -this.camY * dpr);
      const shadow = (sp, bx, by) => {
        sc.save(); sc.translate(bx, by); sc.transform(sk, 0, -sun.dx * sun.len * sk, 0.3 * sk, 0, 0);
        sc.drawImage(sp.sh, -sp.ax, -sp.ay, sp.w, sp.h); sc.restore();
      };
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const t = sim.world.tile(x, y);
        if (t.type === 'tree') { const [bx, by] = this.treeBase(t, s); shadow(this.treeSprite(t), bx, by); }
        else if (t.type === 'tower' || t.type === 'tavern' || t.type === 'temple') shadow(this.sprites[t.type], (x + 0.5) * s, (y + 0.92) * s);
        else if (t.type === 'smithy') shadow(this.sprites.smithy, (x + 0.5) * s, (y + 0.95) * s);
        else if (t.type === 'house') shadow(this.houseSprite(t), (x + 0.45) * s, (y + 0.92) * s);
        else if (t.type === 'castle' && t.part && t.y === t.part.y + 1 && t.x === t.part.x) shadow(this.sprites.castle, (x + 0.5) * s, (y + 0.95) * s);
        else if (t.type === 'bush') shadow(this.sprites.bush, (x + 0.5) * s, (y + 0.86) * s);
        else if (t.type === 'rock') shadow(this.sprites['rock' + (t.shade < 0.5 ? 0 : 1)], (x + 0.5) * s, (y + 0.85) * s);
        else if (t.type === 'ruin') shadow(this.sprites['ruin' + Math.min(2, Math.floor(t.shade * 3))], (x + 0.5) * s, (y + 0.9) * s);
      }
      sc.fillStyle = '#000';
      for (const e of drawn) {
        if (e.n.sleeping) continue;
        sc.beginPath(); sc.ellipse(e.px + sun.dx * sun.len * s * 0.3, e.py + s * 0.36, s * (0.14 + sun.len * 0.14), s * 0.06, 0, 0, TAU); sc.fill();
      }
      screen(); c.globalAlpha = sun.alpha; c.drawImage(this.shadowCv, 0, 0); c.globalAlpha = 1; world();
    }
    // Kontaktschatten (immer)
    c.fillStyle = 'rgba(0,0,0,.25)';
    for (const e of drawn) if (!e.n.sleeping) { c.beginPath(); c.ellipse(e.px, e.py + s * 0.38, s * 0.15, s * 0.05, 0, 0, TAU); c.fill(); }

    // Gebiete der Siedlungen
    for (const tw of sim.towns) {
      const r = (5 + Math.sqrt(tw.houses.length) * 2.4) * s, cx = (tw.camp.x + 0.5) * s, cy = (tw.camp.y + 0.5) * s, col = sim.kingdom ? sim.kingdom.color : tw.color;
      c.save(); c.globalAlpha = detail ? 0.3 : 0.65; c.strokeStyle = col; c.lineWidth = Math.max(2, s * 0.07); c.setLineDash([s * 0.45, s * 0.3]);
      c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.stroke(); c.setLineDash([]);
      c.globalAlpha = detail ? 0.035 : 0.12; c.fillStyle = col; c.fill(); c.restore();
    }
    // ausgewähltes Objekt markieren
    if (selTile) {
      const pz = 0.5 + Math.sin(now / 250) * 0.15;
      c.strokeStyle = `rgba(240,181,74,${pz + 0.3})`; c.lineWidth = Math.max(2, s * 0.06);
      c.beginPath(); c.ellipse((selTile.x + 0.5) * s, (selTile.y + 0.85) * s, s * 0.6, s * 0.22, 0, 0, TAU); c.stroke();
    }
    // Weg des ausgewählten Siedlers
    const sel = drawn.find(e => e.n === selected);
    if (sel && sel.pose.moving) {
      c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = Math.max(1.5, s * 0.05); c.setLineDash([s * 0.15, s * 0.15]);
      c.beginPath(); c.moveTo(sel.px, sel.py + s * 0.35);
      for (const q of sel.pose.step.path) c.lineTo((q.x + 0.5) * s, (q.y + 0.85) * s);
      c.stroke(); c.setLineDash([]);
    }

    // 4) Objekte und Siedler Reihe für Reihe
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const t = sim.world.tile(x, y);
        switch (t.type) {
          case 'tree': {
            const [bx, by] = this.treeBase(t, s), sp = this.treeSprite(t);
            const sway = Math.sin(now / 1400 + x * 0.7 + y * 0.3) * 0.025 * (sim.weather === 'regen' ? 2 : 1);
            const hit = t.hitAt && now - t.hitAt < 300 ? Math.sin(now / 22) * 0.04 : 0;
            c.save(); c.translate(bx, by); c.transform(sk, 0, (sway + hit) * sk, sk, 0, 0);
            c.drawImage(sp.cv, -sp.ax, -sp.ay, sp.w, sp.h); c.restore();
            break;
          }
          case 'stump': { const sp = this.sprites.stump; c.drawImage(sp.cv, (x + 0.5) * s - sp.ax * sk, (y + 0.75) * s - sp.ay * sk, sp.w * sk, sp.h * sk); break; }
          case 'bush': {
            const sp = this.sprites.bush, bx = (x + 0.5) * s, by = (y + 0.86) * s;
            c.drawImage(sp.cv, bx - sp.ax * sk, by - sp.ay * sk, sp.w * sk, sp.h * sk);
            for (let i = 0; i < t.berries && i < BERRY_SPOTS.length; i++) {
              const qx = bx + BERRY_SPOTS[i][0] * s, qy = by + BERRY_SPOTS[i][1] * s, r = Math.max(1.5, s * 0.05);
              c.fillStyle = '#9e1f4f'; c.beginPath(); c.arc(qx, qy, r, 0, TAU); c.fill();
              c.fillStyle = '#e0457b'; c.beginPath(); c.arc(qx - r * 0.25, qy - r * 0.25, r * 0.6, 0, TAU); c.fill();
            }
            break;
          }
          case 'house': {
            const sp = this.houseSprite(t);
            c.drawImage(sp.cv, (x + 0.45) * s - sp.ax * sk, (y + 0.92) * s - sp.ay * sk, sp.w * sk, sp.h * sk);
            break;
          }
          case 'site': {
            const st = t.siteRef;
            if (!st) break;
            if (st.type === 'castle' ? (t.x === st.tile.x && t.y === st.tile.y + 1) : t === st.tile) this.drawSite(c, t, s, now, st);
            break;
          }
          case 'castle': {
            if (!t.part || t.y !== t.part.y + 1 || t.x !== t.part.x) break; // Burg wird an der unteren Mitte gezeichnet
            const sp = this.sprites.castle, bx = (x + 0.5) * s, by = (y + 0.95) * s;
            c.drawImage(sp.cv, bx - sp.ax * sk, by - sp.ay * sk, sp.w * sk, sp.h * sk);
            const kc = sim.kingdom ? sim.kingdom.color : '#c0392b';
            for (const [fx0, fy0, len] of sp.meta.flags) { // wehende Banner
              const fx = bx + fx0 * s, fy = by + fy0 * s, wave = Math.sin(now / 280 + fx0 * 3) * s * 0.04;
              c.strokeStyle = '#3a3a3a'; c.lineWidth = Math.max(1, s * 0.025); c.beginPath(); c.moveTo(fx, fy); c.lineTo(fx, fy - len * s); c.stroke();
              const top = fy - len * s;
              c.fillStyle = kc; c.beginPath(); c.moveTo(fx, top); c.quadraticCurveTo(fx + s * 0.25, top + wave, fx + s * 0.5, top + s * 0.05 + wave);
              c.lineTo(fx + s * 0.5, top + s * 0.27 + wave); c.quadraticCurveTo(fx + s * 0.25, top + s * 0.22 - wave, fx, top + s * 0.25); c.fill();
              c.fillStyle = '#ffd76a'; c.beginPath(); c.arc(fx + s * 0.22, top + s * 0.13 + wave * 0.5, s * 0.05, 0, TAU); c.fill();
            }
            break;
          }
          case 'camp': this.drawCamp(c, t, s, now); break;
          case 'rock': {
            const sp = this.sprites['rock' + (t.shade < 0.5 ? 0 : 1)], k = sk * (0.55 + 0.45 * Math.min(1, (t.wood || CONFIG.resources.rockStone) / CONFIG.resources.rockStone));
            const shake = t.hitAt && now - t.hitAt < 200 ? Math.sin(now / 20) * s * 0.02 : 0;
            c.drawImage(sp.cv, (x + 0.5) * s - sp.ax * k + shake, (y + 0.85) * s - sp.ay * k, sp.w * k, sp.h * k); break;
          }
          case 'ruin': { const sp = this.sprites['ruin' + Math.min(2, Math.floor(t.shade * 3))]; c.drawImage(sp.cv, (x + 0.5) * s - sp.ax * sk, (y + 0.9) * s - sp.ay * sk, sp.w * sk, sp.h * sk); break; }
          case 'gate': this.drawGate(c, t, s, now); break;
          case 'field': this.drawCrops(c, t, s, now); break;
          case 'tower': case 'tavern': case 'temple': {
            const sp = this.sprites[t.type], bx = (x + 0.5) * s, by = (y + 0.92) * s;
            c.drawImage(sp.cv, bx - sp.ax * sk, by - sp.ay * sk, sp.w * sk, sp.h * sk);
            if (t.type === 'tower') { // Fackel
              const [tx, ty] = sp.meta.torch, fx = bx + tx * s, fy = by + ty * s, fh = s * 0.12 * (0.85 + Math.sin(now / 80 + x) * 0.15);
              c.fillStyle = '#ff8a2a'; c.beginPath(); c.moveTo(fx - 0.03 * s, fy); c.quadraticCurveTo(fx, fy - fh * 1.4, fx + 0.03 * s, fy); c.fill();
              c.fillStyle = '#ffe36b'; c.beginPath(); c.moveTo(fx - 0.015 * s, fy); c.quadraticCurveTo(fx, fy - fh * 0.8, fx + 0.015 * s, fy); c.fill();
            }
            if (t.type === 'temple' && Math.random() < 0.03) this.emit('spark', x + 0.5 + rand(-0.2, 0.2), y + 0.92 - 1.5, { vy: -0.3, life: 1.5, size: 0.02, rgb: '255,230,140' });
            break;
          }
          case 'market': { const sp = this.sprites.market; c.drawImage(sp.cv, (x + 0.5) * s - sp.ax * sk, (y + 0.9) * s - sp.ay * sk, sp.w * sk, sp.h * sk); break; }
          case 'smithy': {
            const sp = this.sprites.smithy, bx = (x + 0.5) * s, by = (y + 0.95) * s;
            c.drawImage(sp.cv, bx - sp.ax * sk, by - sp.ay * sk, sp.w * sk, sp.h * sk);
            const busy = t.building && t.building.busy, fl = 0.6 + Math.sin(now / 90) * 0.15 + (busy ? 0.3 : 0);
            const g = c.createRadialGradient(bx, by - 0.2 * s, 0, bx, by - 0.2 * s, 0.25 * s);
            g.addColorStop(0, `rgba(255,190,90,${fl})`); g.addColorStop(1, 'rgba(255,90,20,0)');
            c.fillStyle = g; c.beginPath(); c.arc(bx, by - 0.25 * s, 0.22 * s, Math.PI, 0); c.lineTo(bx + 0.22 * s, by); c.lineTo(bx - 0.22 * s, by); c.fill();
            if (busy && Math.random() < 0.4) this.emit('spark', x + 0.5 + 0.45 + rand(-0.1, 0.1), y + 0.82, { vx: rand(-0.8, 0.8), vy: -rand(0.5, 1.4), g: 3, life: rand(0.3, 0.7), size: 0.02 });
            if (Math.random() < 0.08) this.emit('dust', x + 0.5 - 0.38, y + 0.95 - 1.3, { vy: -0.35, vx: 0.08, life: 2.5, size: 0.14 });
            break;
          }
        }
      }
      const list = rows.get(y);
      if (list) {
        list.sort((a, b) => a.fy - b.fy);
        for (const e of list) {
          if (e.animal) { this.drawAnimal(c, e.animal, s); continue; }
          if (e.cart) { drawCart(c, e.cart, s, now, (e.fx + 0.5) * s, (e.fy + 0.85) * s); continue; }
          if (e.monster) {
            const m = e.monster, mx = (e.fx + 0.5) * s, my = (e.fy + 0.85) * s;
            c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(mx, my, s * 0.3, s * 0.08, 0, 0, TAU); c.fill();
            c.save(); c.translate(mx, my); drawMonsterShape(c, m, s, now); c.restore();
            const bw = s * 0.7, by = my - s * (m.kind === 'aschegolem' ? 1.15 : 0.75);
            c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(mx - bw / 2, by, bw, Math.max(3, s * 0.07));
            c.fillStyle = '#e04848'; c.fillRect(mx - bw / 2, by, bw * Math.max(0, m.hp / m.maxHp), Math.max(3, s * 0.07));
            continue;
          }
          if (e.n === selected) { c.strokeStyle = '#f0b54a'; c.lineWidth = 2; c.beginPath(); c.ellipse(e.px, e.py + s * 0.38, s * 0.26, s * 0.09, 0, 0, TAU); c.stroke(); }
          this.drawSettler(c, e.n, e.px, e.py, s, now, e.pose, e.phase);
        }
      }
    }

    // Pfeile der Wachtürme
    this.shots = (this.shots || []).filter(sh => now - sh.born < 350);
    c.strokeStyle = '#f3e9d2'; c.lineWidth = Math.max(1.2, s * 0.025);
    for (const sh of this.shots) {
      const k = (now - sh.born) / 350, x0 = (sh.from.x + 0.5) * s, y0 = (sh.from.y - 0.55) * s, x1 = (sh.to.x + 0.5) * s, y1 = (sh.to.y + 0.5) * s;
      const ax = x0 + (x1 - x0) * k, ay = y0 + (y1 - y0) * k - Math.sin(k * Math.PI) * s * 0.6, a = Math.atan2(y1 - y0, x1 - x0);
      c.beginPath(); c.moveTo(ax - Math.cos(a) * s * 0.2, ay - Math.sin(a) * s * 0.2); c.lineTo(ax, ay); c.stroke();
    }
    // 5) Partikel, Rauch
    this.emitAmbient(dt, x0, x1, y0, y1, this.nightAlpha(), drawn);
    this.updateParticles(dt);
    this.drawParticles(c, s, now, false);
    // Lichtsäulen bei Level-Aufstieg / Erwachen
    this.effects = this.effects.filter(f => now - f.born < 2200);
    if (this.effects.length) {
      c.save(); c.globalCompositeOperation = 'lighter';
      for (const f of this.effects) {
        const k = (now - f.born) / 2200, n = f.n, bx = (n.x + 0.5) * s, by = (n.y + 0.88) * s;
        const col = f.kind === 'awaken' ? '120,200,255' : f.kind === 'legendary' ? '255,170,40' : '255,215,120', a = (1 - k) * (k < 0.1 ? k * 10 : 1);
        const g = c.createLinearGradient(0, by - 5 * s, 0, by);
        g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(1, `rgba(${col},${0.7 * a})`);
        c.fillStyle = g; c.fillRect(bx - s * 0.35 * (1 - k * 0.5), by - 5 * s, s * 0.7 * (1 - k * 0.5), 5 * s);
        c.strokeStyle = `rgba(${col},${a})`; c.lineWidth = Math.max(1.5, s * 0.05);
        c.beginPath(); c.ellipse(bx, by, s * (0.3 + k * 1.4), s * (0.1 + k * 0.5), 0, 0, TAU); c.stroke();
      }
      c.restore();
    }
    for (const b of sim.allHouses) {
      if (!b.residents.length) continue;
      const ch = this.houseSprite(b.tile).meta.chimney, sx = (b.tile.x + 0.45 + ch[0]) * s, sy = (b.tile.y + 0.92 + ch[1]) * s;
      for (let k = 0; k < 4; k++) {
        const q = (now / 3000 + k / 4 + b.id * 0.37) % 1;
        c.fillStyle = `rgba(225,225,225,${0.35 * (1 - q)})`;
        c.beginPath(); c.arc(sx + Math.sin(q * 5 + b.id) * s * 0.08 + q * s * 0.12, sy - q * s * 0.7, s * (0.04 + q * 0.08), 0, TAU); c.fill();
      }
    }

    // 6) Wolkenschatten
    const na = this.nightAlpha(), day = 1 - na / 0.72;
    const cloudA = ({ klar: 0.07, 'bewölkt': 0.15, regen: 0.18 }[sim.weather] ?? 0.07) * day;
    for (const cl of this.clouds) {
      cl.x += cl.v * dt * 0.5; if (cl.x - cl.r > w + 2) cl.x = -cl.r - 2;
      if (cloudA <= 0.005) continue;
      const g = c.createRadialGradient(cl.x * s, cl.y * s, 0, cl.x * s, cl.y * s, cl.r * s);
      g.addColorStop(0, `rgba(0,0,20,${cloudA})`); g.addColorStop(1, 'rgba(0,0,20,0)');
      c.fillStyle = g; c.fillRect((cl.x - cl.r) * s, (cl.y - cl.r) * s, cl.r * 2 * s, cl.r * 2 * s);
    }

    // 7) Farbstimmung je Tageszeit und Wetter
    screen();
    const hr = sim.hourFloat;
    const dawn = smooth(4.8, 6.2, hr) * (1 - smooth(6.6, 8.5, hr));
    const dusk = smooth(16.5, 18.8, hr) * (1 - smooth(20, 21.5, hr));
    if (dawn > 0.01) { c.fillStyle = `rgba(255,150,120,${0.16 * dawn})`; c.fillRect(0, 0, W, H); }
    if (dusk > 0.01) { c.fillStyle = `rgba(255,140,50,${0.2 * dusk})`; c.fillRect(0, 0, W, H); }
    if (sim.weather === 'bewölkt') { c.fillStyle = 'rgba(70,80,95,.12)'; c.fillRect(0, 0, W, H); }
    if (sim.weather === 'regen') {
      c.fillStyle = 'rgba(45,55,75,.25)'; c.fillRect(0, 0, W, H);
      c.strokeStyle = 'rgba(190,210,240,.45)'; c.lineWidth = Math.max(1, dpr * 0.8); c.beginPath();
      for (const d of this.rain) {
        d.y += d.v * dt * 1.4; d.x += dt * 0.08;
        if (d.y > 1) { d.y -= 1; d.x = Math.random(); }
        if (d.x > 1) d.x -= 1;
        const px = d.x * W, py = d.y * H;
        c.moveTo(px, py); c.lineTo(px - 3 * dpr, py + d.l * 16 * dpr);
      }
      c.stroke();
    }

    // 8) Nacht: Lichtkarte mit Löchern für Feuer und Fenster
    if (na > 0.01) {
      const lc = this.lightCv.getContext('2d');
      lc.setTransform(1, 0, 0, 1, 0, 0); lc.globalCompositeOperation = 'source-over'; lc.clearRect(0, 0, W, H);
      lc.fillStyle = `rgba(6, 10, 34, ${na})`; lc.fillRect(0, 0, W, H);
      lc.setTransform(dpr, 0, 0, dpr, -this.camX * dpr, -this.camY * dpr); lc.globalCompositeOperation = 'destination-out';
      const hole = (x, y, r, a) => {
        const g = lc.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(0.5, `rgba(0,0,0,${a * 0.6})`); g.addColorStop(1, 'rgba(0,0,0,0)');
        lc.fillStyle = g; lc.fillRect(x - r, y - r, r * 2, r * 2);
      };
      const fl = 1 + Math.sin(now / 110) * 0.04 + Math.sin(now / 47) * 0.03;
      for (const tw of sim.towns) hole((tw.camp.x + 0.58) * s, (tw.camp.y + 0.55) * s, s * 4.2 * fl, 0.95);
      for (const b of sim.allHouses) if (b.residents.length) hole((b.tile.x + 0.5) * s, (b.tile.y + 0.6) * s, s * 1.8, 0.65);
      for (const tw of sim.towns) for (const b of tw.buildings) {
        if (b.type === 'tower') hole((b.tile.x + 0.77) * s, (b.tile.y - 0.1) * s, s * 2.2, 0.8);
        else if (b.type === 'tavern') hole((b.tile.x + 0.5) * s, (b.tile.y + 0.6) * s, s * 2.4, 0.85);
        else if (b.type === 'temple') hole((b.tile.x + 0.5) * s, (b.tile.y - 0.3) * s, s * 2.2, 0.7);
      }
      const castle = sim.capital.castle; if (castle) hole((castle.tile.x + 0.5) * s, (castle.tile.y + 0.2) * s, s * 4, 0.85);
      for (const g of sim.world.gates) hole((g.x + 0.5) * s, (g.y + 0.3) * s, s * 2.6, 0.85);
      const sm = sim.capital.smithy; if (sm) hole((sm.tile.x + 0.5) * s, (sm.tile.y + 0.7) * s, s * 2, 0.8);
      for (const m of sim.monsters) hole((m.x + 0.5) * s, (m.y + 0.5) * s, s * 0.8, 0.4);
      for (const e of drawn) if (e.n.awakened) hole(e.px, e.py, s * 0.9, 0.5);
      screen(); c.drawImage(this.lightCv, 0, 0); world();
      // warmes Licht
      c.save(); c.globalCompositeOperation = 'lighter';
      const glow = (x, y, r, a) => {
        const g = c.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(255,150,50,${a})`); g.addColorStop(1, 'rgba(255,150,50,0)');
        c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
      };
      for (const tw of sim.towns) glow((tw.camp.x + 0.58) * s, (tw.camp.y + 0.55) * s, s * 3 * fl, na * 0.5);
      for (const b of sim.allHouses) if (b.residents.length) glow((b.tile.x + 0.5) * s, (b.tile.y + 0.5) * s, s, na * 0.3);
      for (const g of sim.world.gates) {
        const col = ['', '120,200,255', '190,130,255', '255,95,130'][g.gate.tier], gx = (g.x + 0.5) * s, gy = (g.y + 0.3) * s, r = s * 2.2;
        const gr = c.createRadialGradient(gx, gy, 0, gx, gy, r); gr.addColorStop(0, `rgba(${col},${na * 0.6})`); gr.addColorStop(1, `rgba(${col},0)`);
        c.fillStyle = gr; c.fillRect(gx - r, gy - r, r * 2, r * 2);
      }
      c.restore();
      c.fillStyle = `rgba(255, 210, 110, ${Math.min(1, na * 1.5)})`;
      for (const b of sim.allHouses) {
        if (!b.residents.length) continue;
        for (const [wx, wy, ww, wh] of this.houseSprite(b.tile).meta.windows) c.fillRect((b.tile.x + 0.45 + wx - ww / 2) * s, (b.tile.y + 0.92 + wy - wh / 2) * s, ww * s, wh * s);
      }
      const tav = sim.capital.tavern;
      if (tav) for (const [wx, wy, ww, wh] of this.sprites.tavern.meta.windows) c.fillRect((tav.tile.x + 0.5 + wx - ww / 2) * s, (tav.tile.y + 0.92 + wy - wh / 2) * s, ww * s, wh * s);
      if (castle) for (const [wx, wy, ww, wh] of this.sprites.castle.meta.windows) c.fillRect((castle.tile.x + 0.5 + wx - ww / 2) * s, (castle.tile.y + 1.95 + wy - wh / 2) * s, ww * s, wh * s);
    }
    world();
    // leuchtende Partikel (Funken, Glühwürmchen)
    c.save(); c.globalCompositeOperation = 'lighter'; this.drawParticles(c, s, now, true); c.restore();

    // 9) Beschriftung
    c.textAlign = 'center';
    c.font = `700 ${Math.max(10, Math.round(s * 0.3))}px system-ui`;
    for (const b of sim.allHouses) {
      if (!b.sleepers.size) continue;
      const q = (now / 1800 + b.id * 0.3) % 1;
      c.globalAlpha = 1 - q; c.fillStyle = '#fff';
      c.fillText('z', (b.tile.x + 0.25 + q * 0.2) * s, (b.tile.y - 0.4 - q * 0.4) * s);
      c.globalAlpha = 1;
    }
    const showNames = s >= 30, labelBoxes = [];
    const freeSpot = (x, y, w) => { if (labelBoxes.some(b => Math.abs(b.x - x) < (b.w + w) / 2 && Math.abs(b.y - y) < s * 0.28)) return false; labelBoxes.push({ x, y, w }); return true; }; // Namen nicht übereinander
    if (!detail) { for (const e of drawn) if (e.n.awakened) this.drawBadge(c, e.n, e.px, e.py - s * 0.6, Math.max(14, s)); }
    else
    for (const e of drawn) {
      const { n, px, pose } = e, top = e.py - s * 0.38;
      if (n.sleeping) {
        c.fillStyle = '#fff'; c.font = `700 ${Math.max(10, Math.round(s * 0.3))}px system-ui`;
        c.fillText('z', px + s * 0.1, e.py - s * 0.05 - ((now / 700) % 1) * s * 0.3); continue;
      }
      if (n === selected && n.thought) { this.drawThought(c, px, top - s * 0.05, n.thought, s); continue; }
      if (n.awakened) { if (freeSpot(px, top, s * 1.4)) this.drawBadge(c, n, px, top, s); }
      else if (showNames && freeSpot(px, top, s * 0.9)) {
        c.font = `600 ${Math.round(clamp(s * 0.26, 10, 16))}px system-ui`;
        c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.6)'; c.strokeText(n.name, px, top);
        c.fillStyle = '#fff'; c.fillText(n.name, px, top);
      }
      const a = n.action;
      if (a && a.icon && s >= 22 && !pose.moving) {
        const bx = px + s * 0.34, by = top - s * 0.3, br = Math.max(8, s * 0.19);
        c.fillStyle = 'rgba(255,255,255,.92)'; c.beginPath(); c.arc(bx, by, br, 0, TAU); c.fill();
        c.beginPath(); c.moveTo(bx - br * 0.5, by + br * 0.6); c.lineTo(px + s * 0.12, top + s * 0.02); c.lineTo(bx, by + br * 0.9); c.fill();
        c.font = `${Math.round(br * 1.1)}px system-ui`; c.textBaseline = 'middle';
        c.fillText(a.icon, bx, by + 1); c.textBaseline = 'alphabetic';
      }
    }
    // Ortsnamen (vor allem beim Herauszoomen)
    if (s < 30) for (const tw of sim.towns) {
      const label = `${tw.capital && sim.kingdom ? '👑 ' : tw.capital ? '🔥 ' : '🏕️ '}${tw.name} · ${tw.members.length}`;
      const fs = Math.max(11, Math.min(15, s * 0.5));
      c.font = `700 ${fs}px system-ui`;
      const tw2 = c.measureText(label).width + 14, lx = (tw.camp.x + 0.5) * s, ly = (tw.camp.y - 1.6) * s;
      c.fillStyle = 'rgba(15,20,18,.78)'; c.beginPath(); c.roundRect ? c.roundRect(lx - tw2 / 2, ly - fs, tw2, fs * 1.6, 6) : c.rect(lx - tw2 / 2, ly - fs, tw2, fs * 1.6); c.fill();
      c.strokeStyle = sim.kingdom ? sim.kingdom.color : tw.color; c.lineWidth = 2; c.stroke();
      c.fillStyle = '#fff'; c.textBaseline = 'middle'; c.fillText(label, lx, ly - fs * 0.2); c.textBaseline = 'alphabetic';
    }
    // schwebende Texte
    c.font = `700 ${Math.round(clamp(s * 0.34, 11, 24))}px system-ui`;
    sim.floats = sim.floats.filter(f => now - f.born < 1400);
    for (const f of sim.floats) {
      const k = (now - f.born) / 1400, fx = (f.x + 0.5) * s, fy = (f.y - k) * s;
      c.globalAlpha = 1 - k * k;
      c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.7)'; c.strokeText(f.text, fx, fy);
      c.fillStyle = f.color; c.fillText(f.text, fx, fy);
    }
    c.globalAlpha = 1; c.textAlign = 'start';

    // 10) Vignette
    screen(); c.drawImage(this.vignetteCv, 0, 0);
  }

  /** Namensschild der Erwachten: Level und Klassenfarbe. */
  drawBadge(c, n, px, top, s) {
    const col = n.cls ? CLASSES[n.cls].color : '#8fd3ff', fs = Math.round(clamp(s * 0.26, 10, 16));
    c.font = `700 ${fs}px system-ui`;
    const lv = `Lv ${n.level}`, lw = c.measureText(lv).width + 8, nw = c.measureText(n.name).width;
    const x0 = px - (lw + 4 + nw) / 2, y = top - fs * 0.85;
    c.fillStyle = col; c.beginPath(); c.roundRect ? c.roundRect(x0, y - 1, lw, fs + 3, 4) : c.rect(x0, y - 1, lw, fs + 3); c.fill();
    c.fillStyle = '#10141a'; c.textAlign = 'left'; c.fillText(lv, x0 + 4, top);
    c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.7)'; c.strokeText(n.name, x0 + lw + 4, top);
    c.fillStyle = col; c.fillText(n.name, x0 + lw + 4, top);
    c.textAlign = 'center';
  }

  /** Gedankenblase über dem ausgewählten Siedler. */
  drawThought(c, px, top, text, s) {
    const fs = Math.max(11, Math.min(14, Math.round(s * 0.3)));
    c.font = `italic 500 ${fs}px system-ui`;
    const maxW = Math.min(200, this.viewW - 40), words = text.split(' '), lines = [];
    let line = '';
    for (const wd of words) {
      const test = line ? line + ' ' + wd : wd;
      if (c.measureText(test).width > maxW && line) { lines.push(line); line = wd; } else line = test;
    }
    if (line) lines.push(line);
    if (lines.length > 4) { lines.length = 4; lines[3] += ' …'; }
    const bw = Math.max(...lines.map(l => c.measureText(l).width)) + 18, bh = lines.length * (fs + 3) + 12;
    let bx = clamp(px - bw / 2, this.camX + 112, this.camX + this.viewW - bw - 54); // nicht unter Minikarte und Knöpfe
    const by = Math.max(this.camY + 6, top - bh - s * 0.35);
    c.fillStyle = 'rgba(255,255,255,.95)';
    c.beginPath(); c.roundRect ? c.roundRect(bx, by, bw, bh, 10) : c.rect(bx, by, bw, bh); c.fill();
    c.beginPath(); c.arc(px + s * 0.05, top - s * 0.18, s * 0.07, 0, TAU); c.fill();
    c.beginPath(); c.arc(px + s * 0.1, top - s * 0.3, s * 0.045, 0, TAU); c.fill();
    c.fillStyle = '#2a2420'; c.textAlign = 'left'; c.textBaseline = 'top';
    lines.forEach((l, i) => c.fillText(l, bx + 9, by + 7 + i * (fs + 3)));
    c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  }
}

