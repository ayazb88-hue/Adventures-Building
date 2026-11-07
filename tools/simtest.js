// Schnelltest: simuliert mehrere Welten im Hintergrund und meldet Fehler und Kennzahlen.
// Aufruf: node tools/simtest.js [Tage=14] [Seeds=7,42]
// Braucht Playwright (in Claude-Code-Cloud-Sitzungen vorinstalliert).
const { chromium } = require('playwright');
const path = require('path');
const days = Number(process.argv[2] || 14), seeds = (process.argv[3] || '7,42').split(',').map(Number);
(async () => {
  const b = await chromium.launch(), p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const url = 'file://' + path.resolve(__dirname, '..', 'index.html');
  for (const seed of seeds) {
    await p.goto(`${url}?seed=${seed}`);
    const r = await p.evaluate(d => {
      const s = SIM, t0 = performance.now();
      for (let i = 0; i < 1440 * d; i++) s.step();
      const w = s.world, cut = s.towns.map(tw => { const reach = new Set(); w.bfs(tw.camp.x, tw.camp.y + 1, (x, y) => { reach.add(y * w.w + x); return null; });
        return tw.members.filter(n => !n.inside && !reach.has(Math.round(n.y) * w.w + Math.round(n.x))).length; });
      return { ms: Math.round(performance.now() - t0), pop: s.npcs.length, towns: s.towns.map(t => `${t.name}:${t.members.length}/${t.houses.length}h`).join(' '),
        kingdom: s.kingdom && s.kingdom.name, castle: !!s.capital.castle, awakened: s.npcs.filter(n => n.awakened).map(n => `${n.name} L${n.level} ${n.cls || '-'}`).join(', '),
        avgHunger: Math.round(s.npcs.reduce((a, n) => a + n.hunger, 0) / s.npcs.length), cutOff: cut.join('/') };
    }, days);
    console.log(`Welt ${seed}:`, JSON.stringify(r));
  }
  console.log(errs.length ? 'FEHLER: ' + errs.join(' | ') : 'keine Fehler');
  await b.close();
  process.exit(errs.length ? 1 : 0);
})();
