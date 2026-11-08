
/* =====================================================================
 * 14) ISOMETRISCHE GEBÄUDE: echte Rautenansicht mit zwei sichtbaren Wänden
 *     (L = Wand vorne links, R = Wand vorne rechts) und Dach im Rautenwinkel.
 *     Ursprung jedes Sprites = Mitte der Grundfläche auf dem Boden.
 *     Koordinaten: x, y in Kacheln (relativ zur Mitte), z = Höhe in Kacheln.
 * ===================================================================== */
const ISO_OL = 'rgba(30,22,16,.55)';
function isoKit(c, s) {
  const P = (x, y, z = 0) => [(x - y) * ISO_X * s, (x + y) * ISO_Y * s - z * s];
  const lw = Math.max(1, s * 0.014);
  const poly = (pts, fill, stroke = ISO_OL, w = lw) => {
    c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = w; c.stroke(); }
  };
  const line = (p0, p1, col, w = lw) => { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]); c.stroke(); };
  // Punkt auf einer Wand: L-Wand liegt bei y = oy + b (u läuft entlang x), R-Wand bei x = ox + a (u läuft entlang y, von hinten −b nach vorn +b)
  const onWall = (B, face, u, v) => face === 'L' ? P(B.ox + u, B.oy + B.b, B.z + v) : P(B.ox + B.a, B.oy + u, B.z + v);
  const wallQuad = (B, face, u0, v0, u1, v1) => [onWall(B, face, u0, v0), onWall(B, face, u1, v0), onWall(B, face, u1, v1), onWall(B, face, u0, v1)];
  /** Quader: zwei sichtbare Wände (links hell, rechts dunkler), optional Deckel. */
  const box = (B, colL, colR, colTop) => {
    const { ox, oy, a, b, z, H } = B;
    poly([P(ox - a, oy + b, z), P(ox + a, oy + b, z), P(ox + a, oy + b, z + H), P(ox - a, oy + b, z + H)], colL);
    poly([P(ox + a, oy + b, z), P(ox + a, oy - b, z), P(ox + a, oy - b, z + H), P(ox + a, oy + b, z + H)], colR);
    if (colTop) poly([P(ox - a, oy - b, z + H), P(ox + a, oy - b, z + H), P(ox + a, oy + b, z + H), P(ox - a, oy + b, z + H)], colTop);
  };
  /** Satteldach. dir 'x': First entlang x (Giebel rechts), 'y': First entlang y (Giebel links vorne). */
  const gable = (B, R, roof, gableCol, dir = 'x', o = 0.06, opts = {}) => {
    const { ox, oy, a, b, z, H } = B, top = z + H, lit = shadeHex(roof, 22), dark = shadeHex(roof, -28);
    if (dir === 'x') {
      poly([P(ox - a - o, oy - b - o, top), P(ox + a + o, oy - b - o, top), P(ox + a + o, oy, top + R), P(ox - a - o, oy, top + R)], dark);
      poly([P(ox + a, oy + b, top), P(ox + a, oy - b, top), P(ox + a, oy, top + R)], gableCol);
      poly([P(ox - a - o, oy + b + o, top), P(ox + a + o, oy + b + o, top), P(ox + a + o, oy, top + R), P(ox - a - o, oy, top + R)], lit);
      if (!opts.plain) for (let k = 1; k < 5; k++) { const f = k / 5; line(P(ox - a - o, oy + (b + o) * (1 - f), top + R * f), P(ox + a + o, oy + (b + o) * (1 - f), top + R * f), 'rgba(0,0,0,.18)'); }
      line(P(ox - a - o, oy, top + R), P(ox + a + o, oy, top + R), shadeHex(roof, -45), lw * 2.2);
      return { ridge: [P(ox - a, oy, top + R), P(ox + a, oy, top + R)] };
    }
    poly([P(ox - a - o, oy - b - o, top), P(ox - a - o, oy + b + o, top), P(ox, oy + b + o, top + R), P(ox, oy - b - o, top + R)], dark);
    poly([P(ox - a, oy + b, top), P(ox + a, oy + b, top), P(ox, oy + b, top + R)], gableCol);
    poly([P(ox + a + o, oy - b - o, top), P(ox + a + o, oy + b + o, top), P(ox, oy + b + o, top + R), P(ox, oy - b - o, top + R)], shadeHex(roof, 8));
    if (!opts.plain) for (let k = 1; k < 5; k++) { const f = k / 5; line(P(ox + (a + o) * (1 - f), oy - b - o, top + R * f), P(ox + (a + o) * (1 - f), oy + b + o, top + R * f), 'rgba(0,0,0,.18)'); }
    line(P(ox, oy - b - o, top + R), P(ox, oy + b + o, top + R), shadeHex(roof, -45), lw * 2.2);
    return { ridge: [P(ox, oy - b, top + R), P(ox, oy + b, top + R)] };
  };
  /** Walmdach: First kürzer als das Haus, alle vier Flächen geneigt. */
  const hip = (B, R, roof, o = 0.06) => {
    const { ox, oy, a, b, z, H } = B, top = z + H, r = Math.min(a, b) * 0.9;
    const e = [P(ox - a - o, oy + b + o, top), P(ox + a + o, oy + b + o, top), P(ox + a + o, oy - b - o, top), P(ox - a - o, oy - b - o, top)];
    const r0 = P(ox - a + r, oy, top + R), r1 = P(ox + a - r, oy, top + R);
    poly([e[3], e[2], r1, r0], shadeHex(roof, -30));
    poly([e[0], e[1], r1, r0], shadeHex(roof, 20));
    poly([e[1], e[2], r1], shadeHex(roof, -12));
    line(r0, r1, shadeHex(roof, -45), lw * 2);
    return { ridge: [r0, r1] };
  };
  /** Fenster auf einer Wand, mit Fensterläden und Blumenkasten. */
  const win = (B, face, u, v, w, h, opts = {}) => {
    const q = wallQuad(B, face, u - w / 2, v - h / 2, u + w / 2, v + h / 2);
    poly(q, '#2d3b4a', '#3a2614');
    const gl = wallQuad(B, face, u - w / 2 + 0.01, v, u, v + h / 2 - 0.01); poly(gl, 'rgba(170,210,240,.35)', null);
    line(onWall(B, face, u, v - h / 2), onWall(B, face, u, v + h / 2), '#3a2614');
    if (opts.shutters) { poly(wallQuad(B, face, u - w / 2 - 0.035, v - h / 2, u - w / 2 - 0.005, v + h / 2), opts.shutters, null); poly(wallQuad(B, face, u + w / 2 + 0.005, v - h / 2, u + w / 2 + 0.035, v + h / 2), opts.shutters, null); }
    if (opts.flowers) {
      poly(wallQuad(B, face, u - w / 2 - 0.02, v - h / 2 - 0.035, u + w / 2 + 0.02, v - h / 2), '#6b4526', null);
      for (let k = 0; k < 3; k++) { const [px, py] = onWall(B, face, u - w * 0.3 + k * w * 0.3, v - h / 2 + 0.005); c.fillStyle = ['#e5484d', '#ffd166', '#f78fb3'][k]; c.beginPath(); c.arc(px, py, Math.max(1, s * 0.018), 0, TAU); c.fill(); }
    }
    const [cx, cy] = onWall(B, face, u, v);
    return [cx / s, cy / s, w * 0.9, h * 0.9];
  };
  const door = (B, face, u, w, h, col = '#5e3a20') => {
    poly(wallQuad(B, face, u - w / 2, 0, u + w / 2, h), col, '#2a180c');
    line(onWall(B, face, u, 0), onWall(B, face, u, h), 'rgba(0,0,0,.35)');
    const [kx, ky] = onWall(B, face, u + w * 0.3, h * 0.45); c.fillStyle = '#e0b85a'; c.beginPath(); c.arc(kx, ky, Math.max(1, s * 0.012), 0, TAU); c.fill();
  };
  /** Fachwerk: Rahmen, Stützen, Riegel und Streben auf einer Wand. */
  const timber = (B, face, len, col = '#5b3a22') => {
    const w = Math.max(1.2, s * 0.028), L = face === 'L' ? B.a : B.b, n = Math.max(2, Math.round(len));
    for (let k = 0; k <= n; k++) { const u = -L + k * 2 * L / n; line(onWall(B, face, u, 0.06), onWall(B, face, u, B.H), col, w); }
    line(onWall(B, face, -L, B.H * 0.5), onWall(B, face, L, B.H * 0.5), col, w);
    line(onWall(B, face, -L, B.H - 0.01), onWall(B, face, L, B.H - 0.01), col, w);
    line(onWall(B, face, -L, 0.06), onWall(B, face, -L + 2 * L / n, B.H * 0.5), col, w);
    line(onWall(B, face, L, 0.06), onWall(B, face, L - 2 * L / n, B.H * 0.5), col, w);
  };
  /** Mauerwerk: versetzte Steinfugen auf einer Wand. */
  const stones = (B, face, col = 'rgba(40,34,28,.28)') => {
    const L = face === 'L' ? B.a : B.b, rows = Math.max(3, Math.round(B.H / 0.09));
    for (let r = 1; r < rows; r++) {
      const v = r * B.H / rows; line(onWall(B, face, -L, v), onWall(B, face, L, v), col, Math.max(1, s * 0.008));
      for (let u = -L + ((r % 2) ? 0.06 : 0.12); u < L; u += 0.14) line(onWall(B, face, u, v), onWall(B, face, u, v - B.H / rows), col, Math.max(1, s * 0.008));
    }
  };
  const logs = (B, face) => {
    const L = face === 'L' ? B.a : B.b, rows = 6;
    for (let r = 1; r < rows; r++) line(onWall(B, face, -L, r * B.H / rows), onWall(B, face, L, r * B.H / rows), 'rgba(40,22,10,.5)', Math.max(1, s * 0.016));
    if (face === 'L') for (let r = 0; r < rows; r++) { const [px, py] = onWall(B, face, -L, (r + 0.5) * B.H / rows); c.fillStyle = '#c99a62'; c.beginPath(); c.arc(px, py, B.H / rows * s * 0.45, 0, TAU); c.fill(); c.strokeStyle = ISO_OL; c.lineWidth = lw; c.stroke(); }
  };
  const planks = (B, face) => { const L = face === 'L' ? B.a : B.b; for (let u = -L + 0.07; u < L; u += 0.07) line(onWall(B, face, u, 0), onWall(B, face, u, B.H), 'rgba(40,22,10,.35)', Math.max(1, s * 0.008)); };
  /** Kamin als kleiner Quader auf dem Dach. */
  const chimney = (x, y, z, h, col = '#8a5a48') => { box({ ox: x, oy: y, a: 0.05, b: 0.05, z, H: h }, col, shadeHex(col, -30), shadeHex(col, -45)); const [px, py] = P(x, y, z + h); return [px / s, py / s]; };
  /** Rundturm (Zylinder) mit Kegeldach. */
  const tower = (x, y, r, z, H, wall, roof, R) => {
    const [cx, cy] = P(x, y, z), rx = Math.SQRT2 * r * ISO_X * s, ry = Math.SQRT2 * r * ISO_Y * s, ty = cy - H * s;
    const g = c.createLinearGradient(cx - rx, 0, cx + rx, 0); g.addColorStop(0, shadeHex(wall, 15)); g.addColorStop(0.45, wall); g.addColorStop(1, shadeHex(wall, -40));
    c.fillStyle = g; c.beginPath(); c.moveTo(cx - rx, ty); c.lineTo(cx - rx, cy); c.ellipse(cx, cy, rx, ry, 0, Math.PI, 0, true); c.lineTo(cx + rx, ty); c.closePath(); c.fill(); c.strokeStyle = ISO_OL; c.lineWidth = lw; c.stroke();
    c.strokeStyle = 'rgba(40,34,28,.25)'; for (let k = 1; k < H / 0.12; k++) { c.beginPath(); c.ellipse(cx, cy - k * 0.12 * s, rx, ry, 0, 0.15, Math.PI - 0.15); c.stroke(); }
    if (roof) {
      const rg = c.createLinearGradient(cx - rx, 0, cx + rx, 0); rg.addColorStop(0, shadeHex(roof, 20)); rg.addColorStop(1, shadeHex(roof, -35));
      c.fillStyle = rg; c.beginPath(); c.ellipse(cx, ty, rx * 1.12, ry * 1.12, 0, 0, Math.PI); c.lineTo(cx, ty - R * s); c.closePath(); c.fill(); c.strokeStyle = ISO_OL; c.stroke();
    } else { c.fillStyle = shadeHex(wall, -15); c.beginPath(); c.ellipse(cx, ty, rx, ry, 0, 0, TAU); c.fill(); c.stroke(); }
    return { top: [cx / s, (ty - (R || 0) * s) / s], rx: rx / s };
  };
  /** Zinnen entlang der beiden vorderen Mauerkanten. */
  const battlements = (B, col) => {
    const { ox, oy, a, b, z, H } = B, m = 0.07;
    for (let u = -a + 0.04; u < a; u += 0.16) box({ ox: ox + u + m / 2, oy: oy + b - m / 2, a: m / 2, b: m / 2, z: z + H, H: 0.07 }, col, shadeHex(col, -25), shadeHex(col, 10));
    for (let u = b - 0.04; u > -b; u -= 0.16) box({ ox: ox + a - m / 2, oy: oy + u - m / 2, a: m / 2, b: m / 2, z: z + H, H: 0.07 }, col, shadeHex(col, -25), shadeHex(col, 10));
  };
  return { P, poly, line, onWall, wallQuad, box, gable, hip, win, door, timber, stones, logs, planks, chimney, tower, battlements, lw };
}

/* ---- Wohnhäuser: vier Formen × sechs Farben, dazu das Stadthaus ---- */
function isoHouse(c, s, v, shape) {
  const K = isoKit(c, s), roof = ROOFS[v], sh = SHUTTERS[v];
  const plaster = ['#f1e4c6', '#eadcc0', '#f3e9d6', '#e8d6b4', '#ecd2c4', '#dce4e8'][v];
  const wins = [];
  if (shape === 'cottage') { // Kate: Bruchstein, dickes Strohdach
    const B = { ox: 0, oy: 0, a: 0.36, b: 0.3, z: 0, H: 0.42 }, wall = ['#b9ad98', '#c4b49a', '#a9a294', '#bfb39e', '#c9b7a6', '#b0b4b0'][v];
    K.box(B, wall, shadeHex(wall, -35)); K.stones(B, 'L', 'rgba(60,50,40,.3)'); K.stones(B, 'R', 'rgba(60,50,40,.3)');
    K.door(B, 'L', -0.08, 0.13, 0.27); wins.push(K.win(B, 'L', 0.18, 0.24, 0.11, 0.1, { flowers: true })); wins.push(K.win(B, 'R', 0.05, 0.24, 0.11, 0.1));
    K.gable({ ...B }, 0.42, '#c8a24a', '#b49040', 'y', 0.1, { plain: true });
    for (let k = 0; k < 7; k++) K.line(K.P(0.46 - k * 0.07, -0.4, 0.42 + k * 0.06), K.P(0.46 - k * 0.07, 0.4, 0.42 + k * 0.06), 'rgba(120,80,30,.35)');
    return { windows: wins, chimney: K.chimney(-0.2, -0.1, 0.62, 0.22, '#8f877a') };
  }
  if (shape === 'stoneh') { // Steinhaus: Quader, steiles Schieferdach, Efeu
    const B = { ox: 0, oy: 0, a: 0.32, b: 0.32, z: 0, H: 0.62 }, slate = ['#4a5262', '#556070', '#3e4656', '#5a5060', '#405a50', '#4e4a44'][v];
    K.box(B, '#b8b2a6', '#8f8a80'); K.stones(B, 'L'); K.stones(B, 'R');
    K.door(B, 'L', 0, 0.14, 0.3); wins.push(K.win(B, 'L', -0.2, 0.36, 0.1, 0.16)); wins.push(K.win(B, 'R', 0.15, 0.36, 0.1, 0.16)); wins.push(K.win(B, 'R', -0.15, 0.36, 0.1, 0.16));
    K.gable(B, 0.55, slate, '#a9a398', 'y');
    for (let k = 0; k < 10; k++) { const [px, py] = K.onWall(B, 'R', 0.3 - (k % 3) * 0.03, 0.05 + k * 0.05); c.fillStyle = '#3f7a3a'; c.beginPath(); c.arc(px, py, s * 0.028, 0, TAU); c.fill(); }
    return { windows: wins, chimney: K.chimney(0.15, -0.05, 0.92, 0.2, '#7d776c') };
  }
  if (shape === 'hip') { // Walmdachhaus: farbiger Putz, Eckbetonung, Gaube
    const B = { ox: 0, oy: 0, a: 0.36, b: 0.3, z: 0, H: 0.66 }, wall = ['#f2d7b0', '#e9e1cf', '#f0c9b8', '#dfe6d4', '#f4e6c2', '#d8dde8'][v];
    K.box(B, wall, shadeHex(wall, -40));
    for (const f of ['L', 'R']) { const L = f === 'L' ? B.a : B.b; K.poly(K.wallQuad(B, f, -L, 0, -L + 0.04, B.H), shadeHex(wall, -15), null); K.line(K.onWall(B, f, -L, 0.33), K.onWall(B, f, L, 0.33), shadeHex(wall, -25), K.lw * 1.6); }
    K.door(B, 'L', -0.15, 0.13, 0.28); wins.push(K.win(B, 'L', 0.15, 0.18, 0.1, 0.12, { shutters: sh }));
    for (const u of [-0.18, 0.15]) wins.push(K.win(B, 'L', u, 0.5, 0.1, 0.12, { shutters: sh, flowers: true }));
    for (const u of [-0.12, 0.14]) wins.push(K.win(B, 'R', u, 0.5, 0.1, 0.12, { shutters: sh })); wins.push(K.win(B, 'R', 0, 0.18, 0.1, 0.12, { shutters: sh }));
    K.hip(B, 0.36, roof);
    const gB = { ox: 0, oy: 0.18, a: 0.08, b: 0.05, z: 0.7, H: 0.12 }; K.box(gB, wall, shadeHex(wall, -40)); K.gable(gB, 0.1, roof, wall, 'y', 0.02, { plain: true }); K.win(gB, 'L', 0, 0.06, 0.08, 0.07);
    return { windows: wins, chimney: K.chimney(0.18, -0.12, 0.85, 0.2) };
  }
  const big = shape === 'town', B = { ox: 0, oy: 0, a: 0.36, b: 0.32, z: 0, H: big ? 1.0 : 0.62 }; // Fachwerk
  K.box(B, plaster, shadeHex(plaster, -45));
  K.poly(K.wallQuad(B, 'L', -B.a, 0, B.a, 0.07), '#7d766b', null); K.poly(K.wallQuad(B, 'R', -B.b, 0, B.b, 0.07), '#5f5a52', null);
  K.timber(B, 'L', big ? 3 : 3); K.timber(B, 'R', 3);
  K.door(B, 'L', 0, 0.13, 0.3);
  wins.push(K.win(B, 'L', -0.22, 0.32, 0.11, 0.12, { shutters: sh, flowers: true }), K.win(B, 'L', 0.22, 0.32, 0.11, 0.12, { shutters: sh, flowers: true }), K.win(B, 'R', 0.12, 0.32, 0.11, 0.12, { shutters: sh }), K.win(B, 'R', -0.14, 0.32, 0.11, 0.12, { shutters: sh }));
  if (big) for (const u of [-0.22, 0, 0.22]) wins.push(K.win(B, 'L', u, 0.78, 0.1, 0.12, { shutters: sh, flowers: true })), u && wins.push(K.win(B, 'R', u * 0.8, 0.78, 0.1, 0.12, { shutters: sh }));
  K.gable(B, big ? 0.5 : 0.46, roof, plaster, 'x');
  const [gx, gy] = K.onWall({ ...B, z: B.H }, 'R', 0, 0.16); c.fillStyle = '#2d3b4a'; c.beginPath(); c.arc(gx, gy, s * 0.04, 0, TAU); c.fill();
  return { windows: wins, chimney: K.chimney(-0.12, -0.12, B.H + 0.32, 0.22) };
}

/* ---- Wichtige Gebäude ---- */
function isoSmithy(c, s) {
  const K = isoKit(c, s), B = { ox: 0, oy: 0, a: 0.38, b: 0.32, z: 0, H: 0.56 };
  K.box(B, '#9a948a', '#77726a'); K.stones(B, 'L'); K.stones(B, 'R');
  K.poly(K.wallQuad(B, 'L', -0.3, 0, 0.06, 0.36), '#1a100c', '#2a180c'); // offene Werkstatt mit Esse
  const [fx, fy] = K.onWall(B, 'L', -0.12, 0.14); const g = c.createRadialGradient(fx, fy, 0, fx, fy, s * 0.2); g.addColorStop(0, '#ffd27a'); g.addColorStop(0.5, '#ff7a2a'); g.addColorStop(1, 'rgba(255,90,20,0)');
  c.fillStyle = g; c.fillRect(fx - s * 0.2, fy - s * 0.2, s * 0.4, s * 0.4);
  K.door(B, 'L', 0.24, 0.13, 0.3, '#4a2c16');
  K.gable(B, 0.4, '#5a4a44', '#8a847a', 'y');
  const ch = K.chimney(-0.22, -0.2, 0.62, 0.42, '#6e6862');
  K.box({ ox: 0.12, oy: 0.52, a: 0.09, b: 0.05, z: 0, H: 0.1 }, '#3a3a40', '#2a2a30', '#55555c'); // Amboss vor der Tür
  K.box({ ox: 0.12, oy: 0.52, a: 0.03, b: 0.03, z: 0, H: 0.06 }, '#2a2a30', '#1a1a20');
  return { forge: [fx / s, fy / s], chimney: ch, windows: [] };
}

function isoLagerhaus(c, s) {
  const K = isoKit(c, s), B = { ox: 0, oy: 0, a: 0.42, b: 0.34, z: 0, H: 0.6 };
  K.box(B, '#8a5e36', '#6a4528'); K.planks(B, 'L'); K.planks(B, 'R');
  K.poly(K.wallQuad(B, 'L', -0.26, 0, 0.18, 0.42), '#2a1a10', '#4a2e18'); // großes offenes Tor
  for (const [u, v, w] of [[-0.18, 0, 0.1], [-0.05, 0, 0.08], [0.08, 0, 0.09], [-0.12, 0.1, 0.08]]) {
    const q = K.wallQuad(B, 'L', u, v, u + w, v + w); K.poly(q, '#b0834e', '#5a3a20');
  }
  K.gable(B, 0.4, '#6e4a2c', '#8a5e36', 'x');
  const [hx, hy] = K.onWall({ ...B, z: B.H }, 'R', 0, 0.2); K.line([hx, hy], [hx + s * 0.18, hy - s * 0.04], '#4a2e18', K.lw * 2.5); K.line([hx + s * 0.16, hy - s * 0.035], [hx + s * 0.16, hy + s * 0.25], '#d8c49a');
  K.poly([[hx + s * 0.11, hy + s * 0.25], [hx + s * 0.21, hy + s * 0.25], [hx + s * 0.21, hy + s * 0.34], [hx + s * 0.11, hy + s * 0.34]], '#c0935e');
  return { windows: [] };
}

function isoTavern(c, s) {
  const K = isoKit(c, s), B0 = { ox: 0, oy: 0, a: 0.44, b: 0.34, z: 0, H: 0.4 }, B1 = { ox: 0, oy: 0, a: 0.47, b: 0.37, z: 0.4, H: 0.42 };
  K.box(B0, '#a39a8a', '#7a7264'); K.stones(B0, 'L'); K.stones(B0, 'R');
  K.door(B0, 'L', -0.12, 0.15, 0.3, '#4e2e18');
  const wins = [K.win(B0, 'L', 0.22, 0.22, 0.14, 0.12), K.win(B0, 'R', 0.1, 0.22, 0.14, 0.12), K.win(B0, 'R', -0.18, 0.22, 0.14, 0.12)];
  K.box(B1, '#f1e2c2', '#c9b48e'); K.timber(B1, 'L', 4); K.timber(B1, 'R', 3);
  for (const u of [-0.3, -0.05, 0.25]) wins.push(K.win(B1, 'L', u, 0.24, 0.1, 0.12, { flowers: true }));
  for (const u of [-0.18, 0.15]) wins.push(K.win(B1, 'R', u, 0.24, 0.1, 0.12));
  K.gable(B1, 0.42, '#7a3a22', '#f1e2c2', 'x');
  K.chimney(-0.25, -0.1, 1.1, 0.25); K.chimney(0.25, -0.1, 1.1, 0.25);
  const [sx, sy] = K.onWall(B1, 'L', -0.47, 0.1); K.line([sx, sy], [sx - s * 0.2, sy], '#3a2414', K.lw * 2); // Wirtshausschild
  K.poly([[sx - s * 0.22, sy + s * 0.02], [sx - s * 0.04, sy + s * 0.02], [sx - s * 0.04, sy + s * 0.17], [sx - s * 0.22, sy + s * 0.17]], '#7a5230');
  c.fillStyle = '#e8c45a'; c.fillRect(sx - s * 0.17, sy + s * 0.06, s * 0.08, s * 0.08);
  for (const [x, y] of [[0.55, 0.15], [0.62, 0.0]]) K.box({ ox: x, oy: y, a: 0.05, b: 0.05, z: 0, H: 0.12 }, '#7a5230', '#5a3a20', '#9a6a40');
  return { windows: wins };
}

function isoGildenhalle(c, s) {
  const K = isoKit(c, s), B = { ox: 0, oy: 0, a: 0.52, b: 0.36, z: 0, H: 0.8 };
  K.box(B, '#c4beb2', '#8e887c'); K.stones(B, 'L'); K.stones(B, 'R');
  for (const u of [-0.5, -0.06, 0.44]) K.poly(K.wallQuad(B, 'L', u, 0, u + 0.07, B.H), '#a49e92', null);
  const q = K.wallQuad(B, 'L', 0.06, 0, 0.3, 0.42); K.poly(q, '#3a2214', '#c9a032', K.lw * 1.5); // großes Tor
  for (const u of [-0.32, -0.18]) K.win(B, 'L', u, 0.42, 0.08, 0.22);
  for (const u of [-0.15, 0.15]) K.win(B, 'R', u, 0.42, 0.08, 0.22);
  for (const u of [-0.42, 0.4]) { // hängende Banner
    K.poly(K.wallQuad(B, 'L', u - 0.05, 0.38, u + 0.05, 0.72), '#2c4fa8', '#1a2c60');
    const [bx, by] = K.onWall(B, 'L', u, 0.6); c.fillStyle = '#f0c35a'; star5(c, bx, by, s * 0.035);
  }
  K.gable(B, 0.62, '#3d4a66', '#b8b2a6', 'x');
  const [rx, ry] = K.onWall({ ...B, z: B.H }, 'R', 0, 0.22), rr = s * 0.09; // Rosettenfenster im Giebel
  c.fillStyle = '#2a2236'; c.beginPath(); c.ellipse(rx, ry, rr * 0.75, rr, 0, 0, TAU); c.fill(); c.strokeStyle = '#c9a032'; c.lineWidth = K.lw; c.stroke();
  for (let k = 0; k < 6; k++) { c.fillStyle = ['#e5484d', '#4a7dff', '#ffd166'][k % 3]; const a = k * TAU / 6; c.beginPath(); c.arc(rx + Math.cos(a) * rr * 0.4, ry + Math.sin(a) * rr * 0.55, rr * 0.22, 0, TAU); c.fill(); }
  const T = K.tower(-0.1, 0, 0.11, B.H + 0.5, 0.32, '#a49e92', '#3d4a66', 0.32); // Glockenturm auf dem First
  c.fillStyle = '#f0c35a'; star5(c, T.top[0] * s, T.top[1] * s - s * 0.06, s * 0.045);
  return { windows: [], glow: [rx / s, ry / s] };
}

function isoTemple(c, s) {
  const K = isoKit(c, s), B = { ox: 0, oy: 0, a: 0.38, b: 0.32, z: 0.08, H: 0.62 };
  K.box({ ox: 0, oy: 0, a: 0.48, b: 0.42, z: 0, H: 0.08 }, '#ddd6c6', '#bdb5a4', '#ece6d8'); // Sockel
  K.box(B, '#f6f2e8', '#d4ccba');
  for (const u of [-0.34, -0.17, 0.17, 0.34]) { K.poly(K.wallQuad(B, 'L', u - 0.03, 0, u + 0.03, B.H), '#ffffff', 'rgba(120,110,90,.35)'); }
  for (const u of [-0.22, 0.22]) K.poly(K.wallQuad(B, 'R', u - 0.03, 0, u + 0.03, B.H), '#e8e2d4', 'rgba(120,110,90,.35)');
  K.poly(K.wallQuad(B, 'L', -0.08, 0, 0.08, 0.34), '#3a2f26', '#c9a032');
  K.box({ ox: 0, oy: 0, a: 0.4, b: 0.34, z: B.z + B.H, H: 0.06 }, '#efe9dc', '#cfc7b4', '#f6f2e8');
  const [cx, cy] = K.P(0, 0, B.z + B.H + 0.06), r = s * 0.3; // goldene Kuppel
  const dg = c.createRadialGradient(cx - r * 0.3, cy - r * 0.7, r * 0.1, cx, cy - r * 0.3, r); dg.addColorStop(0, '#fff3b0'); dg.addColorStop(0.5, '#f0c35a'); dg.addColorStop(1, '#a8781e');
  c.fillStyle = dg; c.beginPath(); c.ellipse(cx, cy, r, r * 0.5, 0, 0, Math.PI); c.ellipse(cx, cy, r, r * 1.05, 0, Math.PI, TAU); c.fill(); c.strokeStyle = ISO_OL; c.lineWidth = K.lw; c.stroke();
  K.line([cx, cy - r * 1.05], [cx, cy - r * 1.4], '#f0c35a', K.lw * 2); c.fillStyle = '#ffe28a'; c.beginPath(); c.arc(cx, cy - r * 1.48, s * 0.04, 0, TAU); c.fill();
  return { glow: [cx / s, (cy - r) / s] };
}

function isoTower(c, s) {
  const K = isoKit(c, s);
  const T = K.tower(0, 0, 0.24, 0, 1.45, '#b8b2a6', '#a8432f', 0.45);
  const [wx, wy] = K.P(0.17, 0.17, 0.9); c.fillStyle = '#26323e'; c.fillRect(wx - s * 0.035, wy - s * 0.07, s * 0.07, s * 0.12);
  const [dx, dy] = K.P(0.17, 0.17, 0); c.fillStyle = '#4a2c16'; c.fillRect(dx - s * 0.06, dy - s * 0.26, s * 0.12, s * 0.24);
  const [tx, ty] = K.P(0.24, 0.24, 1.25);
  return { torch: [tx / s, ty / s], top: T.top };
}

function isoMarket(c, s) {
  const K = isoKit(c, s), stalls = [[-0.22, -0.18, '#e5484d'], [0.22, -0.12, '#4a7dff'], [0, 0.24, '#f0b54a']];
  for (const [x, y, col] of stalls) {
    for (const [px, py] of [[-0.13, -0.1], [0.13, -0.1], [-0.13, 0.1], [0.13, 0.1]]) K.box({ ox: x + px, oy: y + py, a: 0.012, b: 0.012, z: 0, H: 0.36 }, '#6b4526', '#4a2e18');
    K.box({ ox: x, oy: y, a: 0.14, b: 0.11, z: 0, H: 0.16 }, '#9a6a40', '#7a5230', '#b0834e'); // Tresen
    for (let k = 0; k < 3; k++) { const [px, py] = K.P(x - 0.08 + k * 0.08, y, 0.17); c.fillStyle = ['#e5484d', '#7ac74f', '#ffd166'][k]; c.beginPath(); c.arc(px, py, s * 0.025, 0, TAU); c.fill(); }
    const A = { ox: x, oy: y, a: 0.16, b: 0.13, z: 0.32, H: 0.02 };
    const pts = [K.P(x - 0.17, y + 0.15, 0.34), K.P(x + 0.17, y + 0.15, 0.34), K.P(x + 0.17, y - 0.02, 0.46), K.P(x - 0.17, y - 0.02, 0.46)];
    K.poly(pts, col); for (let k = 0; k < 4; k++) { const f = (k + 0.5) / 4; K.poly([K.P(x - 0.17 + f * 0.34 - 0.03, y + 0.15, 0.34), K.P(x - 0.17 + f * 0.34 + 0.03, y + 0.15, 0.34), K.P(x - 0.17 + f * 0.34 + 0.03, y - 0.02, 0.46), K.P(x - 0.17 + f * 0.34 - 0.03, y - 0.02, 0.46)], '#ffffff', null); }
  }
  return {};
}

function isoForsthaus(c, s) {
  const K = isoKit(c, s), B = { ox: 0, oy: 0, a: 0.38, b: 0.3, z: 0, H: 0.5 };
  K.box(B, '#7a4e2a', '#5a3820'); K.logs(B, 'L'); K.logs(B, 'R');
  K.door(B, 'L', 0.05, 0.13, 0.3, '#4a2c16'); const wins = [K.win(B, 'L', -0.22, 0.28, 0.1, 0.1, { shutters: '#2f6a34' }), K.win(B, 'R', 0, 0.28, 0.1, 0.1, { shutters: '#2f6a34' })];
  K.gable(B, 0.42, '#4f8a3a', '#6b4424', 'y', 0.08, { plain: true });
  for (let k = 0; k < 8; k++) { const [px, py] = K.P(0.3 - k * 0.035, -0.3 + k * 0.08, 0.5 + k * 0.05); c.fillStyle = '#6fae4a'; c.beginPath(); c.moveTo(px - s * 0.025, py); c.lineTo(px, py - s * 0.05); c.lineTo(px + s * 0.025, py); c.fill(); }
  const [ax, ay] = K.onWall(B, 'L', 0.05, 0.42); c.strokeStyle = '#efe4cc'; c.lineWidth = Math.max(1.5, s * 0.02); c.lineCap = 'round';
  c.beginPath(); for (const d of [-1, 1]) { c.moveTo(ax, ay); c.quadraticCurveTo(ax + d * s * 0.09, ay - s * 0.02, ax + d * s * 0.12, ay - s * 0.12); } c.stroke(); c.lineCap = 'butt';
  for (let r = 0; r < 3; r++) for (let k = 0; k < 3 - r; k++) { const [px, py] = K.P(0.5, -0.2 + k * 0.1 + r * 0.05, 0.05 + r * 0.08); c.fillStyle = '#8a5a32'; c.beginPath(); c.arc(px, py, s * 0.045, 0, TAU); c.fill(); c.strokeStyle = ISO_OL; c.stroke(); c.fillStyle = '#d8b07a'; c.beginPath(); c.arc(px, py, s * 0.025, 0, TAU); c.fill(); }
  return { windows: wins, chimney: K.chimney(-0.3, 0.1, 0.55, 0.45, '#7d776c') };
}

function isoBauernhof(c, s) {
  const K = isoKit(c, s), B = { ox: 0, oy: 0, a: 0.44, b: 0.34, z: 0, H: 0.55 };
  K.box(B, '#c84a3a', '#9a3428'); K.planks(B, 'L'); K.planks(B, 'R');
  const q = K.wallQuad(B, 'L', -0.15, 0, 0.15, 0.42); K.poly(q, '#3a1a14', '#f2ebe0', K.lw * 2);
  K.line(K.onWall(B, 'L', -0.15, 0), K.onWall(B, 'L', 0.15, 0.42), '#f2ebe0', K.lw * 2); K.line(K.onWall(B, 'L', 0.15, 0), K.onWall(B, 'L', -0.15, 0.42), '#f2ebe0', K.lw * 2);
  K.gable(B, 0.5, '#5a2a20', '#c84a3a', 'x');
  K.win({ ...B, z: B.H }, 'R', 0, 0.18, 0.12, 0.12);
  for (const [x, y] of [[-0.55, 0.2], [-0.45, 0.4]]) { const [px, py] = K.P(x, y, 0.07); c.fillStyle = '#e8c45a'; c.beginPath(); c.ellipse(px, py, s * 0.08, s * 0.06, 0, 0, TAU); c.fill(); c.strokeStyle = '#b08a30'; c.stroke(); }
  return { windows: [] };
}

/* ---- Burg (3×3 Kacheln): Ringmauer mit Ecktürmen, Tor, Bergfried ---- */
function isoCastle(c, s, pal = {}) {
  const K = isoKit(c, s), wall = pal.wall || '#bdb8ae', roof = pal.roof || '#3d4a66', keepC = pal.keep || '#c9c4b8', R = 1.35, H = 0.7;
  K.tower(-R, -R, 0.28, 0, 1.1, wall, roof, 0.5); // hinterer Turm zuerst
  const back = { ox: 0, oy: 0, a: R, b: R, z: 0, H };
  K.poly([K.P(-R, -R, H), K.P(R, -R, H), K.P(R, R, H), K.P(-R, R, H)], '#8e9a7a', null); // Burghof
  // Bergfried in der Mitte
  const keep = { ox: -0.2, oy: -0.2, a: 0.45, b: 0.45, z: 0, H: 2.1 };
  K.box(keep, keepC, '#9a958a'); K.stones(keep, 'L'); K.stones(keep, 'R'); K.battlements(keep, keepC);
  const wins = [];
  for (const v of [0.8, 1.3, 1.75]) { wins.push(K.win(keep, 'L', -0.15, v, 0.08, 0.16)); wins.push(K.win(keep, 'L', 0.18, v, 0.08, 0.16)); wins.push(K.win(keep, 'R', 0, v, 0.08, 0.16)); }
  K.tower(R, -R, 0.28, 0, 1.1, wall, roof, 0.5); K.tower(-R, R, 0.28, 0, 1.1, wall, roof, 0.5);
  // vordere Mauern mit Zinnen und Tor
  const wl = { ox: 0, oy: R - 0.1, a: R, b: 0.1, z: 0, H }, wr = { ox: R - 0.1, oy: 0, a: 0.1, b: R, z: 0, H };
  K.box(wr, wall, shadeHex(wall, -30), shadeHex(wall, 10)); K.stones(wr, 'R'); K.battlements(wr, wall);
  K.box(wl, wall, shadeHex(wall, -30), shadeHex(wall, 10)); K.stones(wl, 'L'); K.battlements(wl, wall);
  const gq = K.wallQuad(wl, 'L', -0.22, 0, 0.22, 0.5); K.poly(gq, '#2a1e16', '#4a3a2a', K.lw * 2);
  for (let u = -0.18; u <= 0.18; u += 0.09) K.line(K.onWall(wl, 'L', u, 0), K.onWall(wl, 'L', u, 0.48), '#6a6a70');
  const T = K.tower(R, R, 0.3, 0, 1.2, wall, roof, 0.55);
  const flags = [K.P(-0.2, -0.2, 2.2), K.P(R, R, 1.75), K.P(-R, R, 1.6), K.P(R, -R, 1.6)].map(([x, y], i) => [x / s, y / s, i ? 0.4 : 0.6]);
  return { windows: wins, flags };
}

/** Brücke über eine Furt: Holzdeck mit Geländer, quer über das Wasser. */
function drawBridge(c, s, alongX, stone) {
  const K = isoKit(c, s), a = alongX ? 0.52 : 0.22, b = alongX ? 0.22 : 0.52, deck = stone ? '#a49e92' : '#8a6239';
  K.box({ ox: 0, oy: 0, a, b, z: 0.04, H: 0.06 }, shadeHex(deck, -10), shadeHex(deck, -35), deck);
  for (let k = -4; k <= 4; k++) { const f = k / 4 * 0.48; K.line(alongX ? K.P(f, -b, 0.1) : K.P(-a, f, 0.1), alongX ? K.P(f, b, 0.1) : K.P(a, f, 0.1), 'rgba(40,24,12,.35)'); }
  for (const side of [-1, 1]) {
    const p0 = alongX ? K.P(-a, side * b, 0.1) : K.P(side * a, -b, 0.1), p1 = alongX ? K.P(a, side * b, 0.1) : K.P(side * a, b, 0.1);
    K.line([p0[0], p0[1] - s * 0.12], [p1[0], p1[1] - s * 0.12], stone ? '#c9c4b8' : '#6b4526', Math.max(1.5, s * 0.025));
    for (let k = 0; k <= 4; k++) { const f = k / 4; const x = p0[0] + (p1[0] - p0[0]) * f, y = p0[1] + (p1[1] - p0[1]) * f; K.line([x, y], [x, y - s * 0.12], stone ? '#c9c4b8' : '#6b4526', Math.max(1, s * 0.02)); }
  }
}

/** Kleines Boot mit Segel, schaukelt auf dem Wasser. */
function drawBoat(c, s, facing, now, seed) {
  const bob = Math.sin(now / 600 + seed) * s * 0.03, tilt = Math.sin(now / 900 + seed) * 0.05;
  c.save(); c.translate(0, bob); c.rotate(tilt); c.scale(facing, 1);
  c.fillStyle = 'rgba(0,30,60,.25)'; c.beginPath(); c.ellipse(0, s * 0.06, s * 0.36, s * 0.08, 0, 0, TAU); c.fill();
  c.fillStyle = '#7a4e2a'; c.beginPath(); c.moveTo(-s * 0.32, -s * 0.04); c.lineTo(s * 0.34, -s * 0.06); c.lineTo(s * 0.22, s * 0.06); c.lineTo(-s * 0.24, s * 0.06); c.closePath(); c.fill();
  c.strokeStyle = ISO_OL; c.lineWidth = Math.max(1, s * 0.015); c.stroke();
  c.fillStyle = '#a8784a'; c.fillRect(-s * 0.28, -s * 0.06, s * 0.58, s * 0.03);
  c.strokeStyle = '#4a2e18'; c.lineWidth = Math.max(1, s * 0.02); c.beginPath(); c.moveTo(0, -s * 0.05); c.lineTo(0, -s * 0.55); c.stroke();
  c.fillStyle = '#f2ebe0'; c.beginPath(); c.moveTo(s * 0.02, -s * 0.53); c.quadraticCurveTo(s * 0.26, -s * 0.32, s * 0.02, -s * 0.1); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#c84a3a'; c.fillRect(s * 0.03, -s * 0.36, s * 0.12, s * 0.04);
  c.restore();
}

/** Ein Stück Stadtmauer (tangential zum Ring), wahlweise mit Turm oder Tor. */
function drawWallPiece(c, s, tx, ty, kind) {
  const K = isoKit(c, s), L = 0.48, th = 0.09, H = 0.5, col = '#b8b2a6';
  const pt = (u, v, z) => K.P(tx * u - ty * v, ty * u + tx * v, z); // u entlang der Mauer, v quer dazu
  const face = v => [pt(-L, v, 0), pt(L, v, 0), pt(L, v, H), pt(-L, v, H)];
  const front = (tx * 1 + ty * 1) * 0 + (-ty + tx) > 0 ? th : -th; // die zum Betrachter zeigende Seite
  if (kind === 'tor') {
    for (const u of [-L * 0.8, L * 0.8]) K.box({ ox: tx * u, oy: ty * u, a: 0.1, b: 0.1, z: 0, H: H + 0.25 }, col, shadeHex(col, -30), shadeHex(col, 10));
    K.line(pt(-L * 0.7, 0, H + 0.12), pt(L * 0.7, 0, H + 0.12), '#6b4526', Math.max(2, s * 0.04));
    return;
  }
  K.poly(face(-front), shadeHex(col, -30)); K.poly(face(front), col);
  K.poly([pt(-L, -th, H), pt(L, -th, H), pt(L, th, H), pt(-L, th, H)], shadeHex(col, 12));
  for (let u = -L + 0.08; u < L; u += 0.2) K.poly([pt(u, front, H), pt(u + 0.1, front, H), pt(u + 0.1, front, H + 0.08), pt(u, front, H + 0.08)], col);
  for (let r = 1; r < 4; r++) K.line(pt(-L, front, r * H / 4), pt(L, front, r * H / 4), 'rgba(40,34,28,.25)');
  if (kind === 'turm') K.tower(0, 0, 0.17, 0, H + 0.35, col, '#3d4a66', 0.3);
}
