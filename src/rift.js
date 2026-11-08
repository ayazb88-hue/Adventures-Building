
/* =====================================================================
 * 12) RISS-WELTEN: Wer in einem Riss ist, wird in einer eigenen Welt gezeigt
 *     (nur Anzeige – das Ergebnis der Expedition bestimmt die Simulation)
 * ===================================================================== */
const RIFT_THEMES = {
  'Smaragdriss':  { title: 'Kristallwald',  sky: ['#04201a', '#1d6a4c'], far: '#0b3527', mid: '#12503a', ground: '#173d2c', top: '#3fae7a', rgb: '93,255,176', deco: 'kristall' },
  'Aschetor':     { title: 'Aschefelder',   sky: ['#1c0805', '#7a2a12'], far: '#2a0f08', mid: '#3a150c', ground: '#22130e', top: '#5a2a18', rgb: '255,122,48', deco: 'lava' },
  'Sternenspalt': { title: 'Sternenmeer',   sky: ['#03031a', '#2a2478'], far: '#15124a', mid: '#2a2466', ground: '#262250', top: '#7a6ad8', rgb: '185,168,255', deco: 'sterne' },
  'Nebelpforte':  { title: 'Nebelsumpf',    sky: ['#141c22', '#56666e'], far: '#26343a', mid: '#2c3b36', ground: '#222d27', top: '#4a6252', rgb: '207,232,255', deco: 'nebel' },
  'Glutschlund':  { title: 'Glutkaverne',   sky: ['#160504', '#4a1408'], far: '#2a0a06', mid: '#3a1008', ground: '#2a0c07', top: '#7a2a10', rgb: '255,176,64', deco: 'hoehle' },
};
const RIFT_MOBS = ['', 'rissling', 'schattenwolf', 'aschegolem'];
const rh = (i, k) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); }; // fester Zufall je Stelle

function openRift(n) {
  if (!n || !n.inside || !n.inside.gate) return;
  ui.rift = { n, gate: n.inside.tile, scroll: 0, mob: null, nextMob: performance.now() + 900, nextHit: 0, heroHitAt: 0, kills: 0, floats: [], parts: [], bossDone: false, last: performance.now() };
  $('rift').hidden = false;
  const cv = $('riftCv'), r = $('mapWrap').getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px';
  ui.rift.dpr = dpr;
}
function closeRift(manual) {
  if (manual && ui.rift) ui.riftClosedFor = ui.rift.n;
  ui.rift = null; $('rift').hidden = true;
}

function drawRift(now) {
  const R = ui.rift;
  if (!R) return;
  const n = R.n;
  if (!n.inside || !n.inside.gate) { // zurück aus dem Riss
    closeRift(false);
    if (ui.selected === n) sim.log(`🌀 ${n.name} tritt aus dem Riss zurück in die Welt.`, null, false);
    return;
  }
  const cv = $('riftCv'), c = cv.getContext('2d'), dpr = R.dpr, W = cv.width / dpr, H = cv.height / dpr;
  const dt = Math.min(0.1, (now - R.last) / 1000); R.last = now;
  const g = R.gate.gate, T = RIFT_THEMES[g.name] || RIFT_THEMES['Smaragdriss'];
  const step = n.task && n.task.steps[n.task.i], p = step && step.kind === 'act' ? Math.min(1, step.t / CONFIG.gates.expeditionMinutes) : 0;
  const floor = Math.min(3, 1 + Math.floor(p * 3)), s = Math.min(W, H) * 0.42, gy = H * 0.8, hx = W * 0.3;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);

  // --- Kampf und Bewegung (nur Anzeige) ---
  const sp = ui.speed || 1;
  if (!R.mob && now > R.nextMob) {
    const boss = p > 0.8 && !R.bossDone, kind = RIFT_MOBS[Math.min(3, g.tier + (boss ? 1 : 0))] || 'aschegolem';
    R.mob = { x: W + s * 0.6, kind, boss, hp: boss ? 9 : 2 + g.tier, maxHp: boss ? 9 : 2 + g.tier, hitAt: 0, atkAt: 0, nextAtk: now + 900, dead: false };
  }
  const m = R.mob;
  let walking = !m || m.x > hx + s * 1.5, fighting = false;
  if (m) {
    if (m.dead) { if (now - m.deadAt > 700) { R.mob = null; R.nextMob = now + (1100 + rh(R.kills, 3) * 1600) / sp; } }
    else if (m.x > hx + s * (m.boss ? 0.95 : 0.6)) m.x -= s * 1.1 * dt * sp;
    else {
      fighting = true;
      if (now > R.nextHit) {
        R.nextHit = now + 520 / sp; m.hp--; m.hitAt = now;
        R.floats.push({ x: m.x, y: gy - s * 0.7, text: `-${Math.round(n.attack * (0.8 + rh(now, 1) * 0.4))}`, col: '#ffd166', born: now });
        for (let k = 0; k < 5; k++) R.parts.push({ x: m.x - s * 0.1, y: gy - s * 0.35, vx: (rh(now, k) - 0.3) * 160, vy: -rh(k, now) * 160, life: 0.5, col: T.rgb });
        if (m.hp <= 0) {
          m.dead = true; m.deadAt = now; R.kills++;
          if (m.boss) R.bossDone = true;
          R.floats.push({ x: m.x, y: gy - s * 1.0, text: m.boss ? '⭐ Wächter besiegt!' : `+${10 * g.tier} EP`, col: '#8fd3ff', born: now });
          for (let k = 0; k < 18; k++) R.parts.push({ x: m.x, y: gy - s * 0.3, vx: (rh(k, now) - 0.5) * 260, vy: -rh(now, k) * 240, life: 0.9, col: T.rgb });
        }
      }
      if (!m.dead && now > m.nextAtk) {
        m.nextAtk = now + (m.boss ? 1000 : 1500) / sp; m.atkAt = now; R.heroHitAt = now;
        R.floats.push({ x: hx, y: gy - s * 0.9, text: `-${Math.round((5 + g.tier * 4) * (m.boss ? 2 : 1))}`, col: '#ff6b6b', born: now });
      }
    }
  }
  if (walking) R.scroll += s * 1.0 * dt * sp;
  const sc = R.scroll;

  // --- Himmel und Hintergrund ---
  const sky = c.createLinearGradient(0, 0, 0, gy); sky.addColorStop(0, T.sky[0]); sky.addColorStop(1, T.sky[1]);
  c.fillStyle = sky; c.fillRect(0, 0, W, H);
  if (T.deco === 'sterne' || T.deco === 'kristall') for (let i = 0; i < 70; i++) { // Sterne / Funkeln
    const x = (rh(i, 1) * W * 1.5 - sc * 0.05) % (W * 1.5), y = rh(i, 2) * gy * 0.8, a = 0.4 + Math.sin(now / 400 + i) * 0.4;
    c.fillStyle = `rgba(255,255,255,${a})`; c.fillRect((x + W * 1.5) % (W * 1.5), y, 1.6, 1.6);
  }
  if (T.deco === 'sterne') { const mg = c.createRadialGradient(W * 0.78, H * 0.22, 0, W * 0.78, H * 0.22, s * 0.6); mg.addColorStop(0, 'rgba(220,200,255,.9)'); mg.addColorStop(0.25, 'rgba(160,140,255,.5)'); mg.addColorStop(1, 'rgba(120,100,255,0)'); c.fillStyle = mg; c.fillRect(0, 0, W, H); }
  if (T.deco === 'lava' || T.deco === 'hoehle') { const lg = c.createLinearGradient(0, gy - s * 0.6, 0, gy); lg.addColorStop(0, `rgba(${T.rgb},0)`); lg.addColorStop(1, `rgba(${T.rgb},.35)`); c.fillStyle = lg; c.fillRect(0, gy - s * 0.6, W, s * 0.6); }
  // ferne Silhouetten
  const layer = (factor, spacing, k, draw) => {
    const off = sc * factor, i0 = Math.floor(off / spacing) - 1;
    for (let i = i0; i < i0 + W / spacing + 3; i++) draw(i * spacing - off, i, rh(i, k));
  };
  c.fillStyle = T.far;
  layer(0.15, s * 0.9, 5, (x, i, r) => {
    if (T.deco === 'hoehle') { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + s * 0.45, 0); c.lineTo(x + s * 0.22, s * (0.3 + r * 0.5)); c.fill(); return; }
    c.beginPath(); c.moveTo(x - s * 0.6, gy); c.lineTo(x, gy - s * (0.9 + r * 1.1)); c.lineTo(x + s * 0.6, gy); c.fill();
  });
  if (T.deco === 'lava') { c.fillStyle = `rgba(${T.rgb},.8)`; layer(0.15, s * 0.9 * 4, 9, (x, i, r) => { if (r > 0.5) { c.beginPath(); c.arc(x, gy - s * 1.6, s * 0.05, 0, TAU); c.fill(); } }); }
  // mittlere Ebene: Kristalle, Inseln, tote Bäume, Säulen
  layer(0.45, s * 0.75, 7, (x, i, r) => {
    const hgt = s * (0.5 + r * 0.8);
    if (T.deco === 'kristall') {
      const cg = c.createLinearGradient(x, gy - hgt, x, gy); cg.addColorStop(0, `rgba(${T.rgb},.95)`); cg.addColorStop(1, T.mid);
      c.fillStyle = cg; c.beginPath(); c.moveTo(x, gy - hgt); c.lineTo(x + s * 0.12, gy - hgt * 0.6); c.lineTo(x + s * 0.08, gy); c.lineTo(x - s * 0.08, gy); c.lineTo(x - s * 0.12, gy - hgt * 0.6); c.fill();
      c.fillStyle = `rgba(${T.rgb},.25)`; c.beginPath(); c.arc(x, gy - hgt * 0.7, s * 0.25, 0, TAU); c.fill();
    } else if (T.deco === 'sterne') {
      const iy = gy - s * (0.9 + r * 0.9) + Math.sin(now / 900 + i) * s * 0.05;
      c.fillStyle = '#3b3260'; c.beginPath(); c.moveTo(x - s * 0.3, iy); c.lineTo(x + s * 0.3, iy); c.lineTo(x, iy + s * 0.35); c.fill();
      c.fillStyle = T.top; c.fillRect(x - s * 0.3, iy - s * 0.04, s * 0.6, s * 0.05);
    } else if (T.deco === 'nebel') {
      c.strokeStyle = T.mid; c.lineWidth = s * 0.05; c.beginPath(); c.moveTo(x, gy); c.lineTo(x + s * 0.03, gy - hgt);
      c.moveTo(x + s * 0.02, gy - hgt * 0.6); c.lineTo(x + s * 0.25, gy - hgt * 0.85); c.moveTo(x + s * 0.02, gy - hgt * 0.75); c.lineTo(x - s * 0.2, gy - hgt * 0.95); c.stroke();
    } else {
      c.fillStyle = T.mid; c.fillRect(x - s * 0.1, gy - hgt, s * 0.2, hgt);
      c.fillStyle = `rgba(${T.rgb},.7)`; c.fillRect(x - s * 0.02, gy - hgt * (0.3 + r * 0.5), s * 0.04, s * 0.12);
    }
  });
  // Boden
  c.fillStyle = T.ground; c.fillRect(0, gy, W, H - gy);
  c.fillStyle = T.top; c.fillRect(0, gy - 2, W, 4);
  layer(1, s * 0.35, 11, (x, i, r) => {
    c.fillStyle = r > 0.5 ? T.top : 'rgba(0,0,0,.25)'; c.fillRect(x, gy + s * (0.06 + r * 0.25), s * (0.08 + r * 0.12), s * 0.03);
    if ((T.deco === 'lava' || T.deco === 'hoehle') && r > 0.6) { c.fillStyle = `rgba(${T.rgb},${0.5 + Math.sin(now / 300 + i) * 0.3})`; c.fillRect(x, gy + s * 0.18, s * 0.25, s * 0.02); }
  });
  if (T.deco === 'nebel') for (let k = 0; k < 3; k++) { c.fillStyle = 'rgba(210,225,235,.10)'; const fx = ((now / (60 + k * 30)) % (W + 400)) - 200; c.beginPath(); c.ellipse(fx + k * W * 0.3, gy - s * 0.1 * k, W * 0.45, s * 0.25, 0, 0, TAU); c.fill(); }
  // Glut / Sporen in der Luft
  if (Math.random() < 0.3) R.parts.push({ x: Math.random() * W, y: T.deco === 'lava' || T.deco === 'hoehle' ? gy : Math.random() * gy, vx: -20, vy: T.deco === 'lava' || T.deco === 'hoehle' ? -60 : -8, life: 2.5, col: T.rgb, small: true });

  // --- Figuren ---
  const hurt = now - R.heroHitAt < 160;
  const pose = { moving: walking, arms: fighting ? 'fight' : 'none', facing: 1, step: null, tool: null, view: 'side' };
  c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(hx, gy + s * 0.02, s * 0.28, s * 0.07, 0, 0, TAU); c.fill();
  if (hurt) c.filter = 'brightness(1.8) saturate(.4)';
  const foe = n.foe, inv = n.inventory; n.foe = null; n.inventory = { wood: 0, stone: 0 }; // im Riss: Waffe statt Holz
  const party = sim.npcs.filter(o => o !== n && o.inside && o.inside.tile === R.gate).slice(0, 3);
  party.forEach((o, i) => { // Gefährten der Gilde hinter der ausgewählten Person
    const ox = hx - s * (0.45 + i * 0.38), oinv = o.inventory, of = o.foe; o.inventory = { wood: 0, stone: 0 }; o.foe = null;
    renderer.drawSettler(c, o, ox, gy - s * 0.42, s * 0.9, now + i * 170, pose, now / 1000 * 3 + i);
    o.inventory = oinv; o.foe = of;
  });
  renderer.drawSettler(c, n, hx, gy - s * 0.38, s, now, pose, now / 1000 * 3);
  n.foe = foe; n.inventory = inv; c.filter = 'none';
  if (n.pet) { const fly = n.pet.kind === 'eule' || n.pet.kind === 'drache'; drawPixelCreature(c, 'pet_' + n.pet.kind, hx - s * 0.55, gy - (fly ? s * 0.55 + Math.sin(now / 300) * s * 0.05 : 0), s * 0.85, 1, walking || fly ? Math.floor(now / 130) & 3 : 0, false, false); }
  if (fighting && n.gear.weapon && (n.gear.weapon.kind === 'bow' || n.gear.weapon.kind === 'staff')) { // Fernkampf
    const q = ((now - R.nextHit + 520 / sp) / (520 / sp)) % 1, ax = hx + s * 0.2 + (m.x - hx - s * 0.3) * q;
    c.fillStyle = RARITIES[n.gear.weapon.rarity].color; c.beginPath(); c.arc(ax, gy - s * 0.42, s * 0.04, 0, TAU); c.fill();
  }
  if (m) {
    const ms = m.boss ? s * 1.9 : s * (m.kind === 'aschegolem' ? 1.1 : 1);
    c.globalAlpha = m.dead ? Math.max(0, 1 - (now - m.deadAt) / 700) : 1;
    c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(m.x, gy + s * 0.02, ms * 0.3, ms * 0.07, 0, 0, TAU); c.fill();
    if (m.boss) c.filter = 'hue-rotate(-30deg) saturate(1.5)';
    drawPixelCreature(c, m.kind, m.x, gy, ms, -1, m.dead ? 0 : Math.floor(now / 150) & 3, now - m.atkAt < 300, now - m.hitAt < 120);
    c.filter = 'none'; c.globalAlpha = 1;
    if (!m.dead) {
      const bw = ms * 0.6, by = gy - ms * (m.kind === 'aschegolem' ? 1.25 : 0.8);
      c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(m.x - bw / 2, by, bw, 5); c.fillStyle = '#e04848'; c.fillRect(m.x - bw / 2, by, bw * m.hp / m.maxHp, 5);
      if (m.boss) { c.font = 'bold 12px sans-serif'; c.textAlign = 'center'; c.fillStyle = '#ff9a9a'; c.fillText('Wächter des Risses', m.x, by - 6); }
    }
  }
  // Partikel und Zahlen
  for (const q of R.parts) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; if (!q.small) q.vy += 300 * dt; c.fillStyle = `rgba(${q.col},${Math.max(0, Math.min(1, q.life))})`; c.fillRect(q.x, q.y, q.small ? 2 : 3, q.small ? 2 : 3); }
  R.parts = R.parts.filter(q => q.life > 0).slice(-160);
  c.textAlign = 'center'; c.font = 'bold 15px sans-serif';
  for (const f of R.floats) { const a = (now - f.born) / 1000; c.globalAlpha = Math.max(0, 1 - a); c.fillStyle = '#000'; c.fillText(f.text, f.x + 1, f.y - a * 40 + 1); c.fillStyle = f.col; c.fillText(f.text, f.x, f.y - a * 40); }
  c.globalAlpha = 1; R.floats = R.floats.filter(f => now - f.born < 1000);
  // Vignette
  const vg = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.6)');
  c.fillStyle = vg; c.fillRect(0, 0, W, H);

  // --- Anzeige ---
  if (now - (R.hudAt || 0) > 250) {
    R.hudAt = now;
    $('riftHud').innerHTML = `<div class="sys-title">[ RISS-WELT ] · Rang ${roman(g.tier)} · Etage ${floor}/3</div><b>🌀 ${esc(g.name)} – ${T.title}</b>`
      + `<div class="muted small">${esc(n.name)} · Lv ${n.level}${n.pet ? ` · ${PETS[n.pet.kind].icon} ${esc(n.pet.name)}` : ''}${p > 0.8 && !R.bossDone ? ' · ⚠️ Wächter naht' : ''}</div>`
      + `<div class="lbl"><span>Fortschritt</span><span>${Math.round(p * 100)} %</span></div><div class="bar"><i style="width:${p * 100}%;background:rgb(${T.rgb})"></i></div>`
      + `<div class="lbl"><span>Leben</span><span>${Math.round(n.hp)} / ${n.maxHp}</span></div><div class="bar"><i style="width:${n.hp / n.maxHp * 100}%;background:#e04848"></i></div>`
      + `<div class="muted small">⚔️ besiegt: ${R.kills} · ⚡ Energie ${Math.round(n.energy)}</div>`;
  }
}
