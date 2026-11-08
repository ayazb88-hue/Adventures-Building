
/* =====================================================================
 * 13) ANIME-MODUS: Szenen mit Porträt-Dialogen, Folgen, Regisseur,
 *     Persönlichkeiten. Die Simulation liefert die Ereignisse, hier werden
 *     sie inszeniert (nur Anzeige – die Welt pausiert während einer Szene).
 * ===================================================================== */
const scn = { q: [], cur: null, on: true, lastAt: -1e9 };

/* ---- Persönlichkeiten: wer wie spricht ---------------------------------- */
const LINES = {
  held: {
    morgen: ['Neuer Tag, neue Chance. Heute werde ich stärker als gestern.', 'Ich bin vielleicht nicht die stärkste Person hier … aber ich gebe nicht auf!', 'Noch {XP} EP bis Level {L1}. Das schaffe ich heute.'],
    antwort: ['Lach nur. Irgendwann lachst du nicht mehr.', 'Ich weiß, dass ich noch schwach bin. Noch.', 'Rede nicht. Kämpfe.'],
    sieg: ['Ich … habe gewonnen? Ich habe wirklich gewonnen!', 'Siehst du? Ich habe nie aufgehört zu trainieren.'],
    niederlage: ['Verdammt … nicht genug. Noch nicht.', 'Ich stehe wieder auf. Immer.', 'Nächstes Mal. Ganz sicher.'],
    schmiede: ['Hör zu, Hammer. Heute erschaffen wir etwas, das die Welt nicht vergisst.', 'Jeder Schlag ist ein Versprechen.'],
    kampf: ['Hinter mir sind Menschen, die ich beschütze. Ich weiche nicht!', 'Nicht in meinem Dorf!', 'Komm nur her!'],
    lager: ['Weißt du noch, als wir nur zu zweit am Feuer saßen?', 'Morgen wird es hart. Aber gemeinsam schaffen wir das.', 'Manchmal habe ich Angst. Aber dann sehe ich euch alle – und es geht wieder.'],
    entschlossen: ['Ich werde stärker. Für alle hier.', 'Das ist erst der Anfang.'],
  },
  rivale: {
    spott: ['Du schon wieder? Wie langweilig.', 'Level {L}? Wie niedlich.', 'Geh zurück zu deinem Holzhaufen, {H}.', 'Die Leute nennen dich eine Hoffnung? Lächerlich.'],
    sieg: ['Wie erwartet.', 'Du bist hundert Jahre zu früh, {H}.', 'Steh auf, wenn du kannst.'],
    niederlage: ['Unmöglich … das war nur Glück!', 'Tch. Diesmal … überlasse ich dir den Sieg.', 'Du … bist stärker geworden.'],
    respekt: ['Du gibst wirklich nie auf, was?', 'Ich habe mich in dir geirrt. Ein bisschen.'],
    lager: ['Ich sitze nicht hier, weil ich euch mag. Das Feuer ist nur warm.', 'Pff. Morgen trainieren wir. Früh. Komm nicht zu spät.'],
  },
  froh: {
    morgen: ['Guten Morgen! Ich hab Brot mitgebracht – noch warm!', 'Heute wird ein guter Tag, ich spür das!'],
    lager: ['Hey, wer hat den letzten Brotlaib gegessen?!', 'Erzähl nochmal, wie du gegen das Monster gekämpft hast!', 'Auf uns! Und auf das, was noch kommt!'],
    jubel: ['Jaaa! Wir haben es geschafft!', 'Ich wusste es! Ich wusste es die ganze Zeit!'],
    angst: ['D-da kommen welche! Was machen wir jetzt?!'],
    arbeit: ['Komm, gleich ist Pause – ich hab Brot dabei!', 'Wer zuerst zehn Stämme hat, gewinnt!'],
    lachen: ['Level 1? Hahaha! Du bist wieder ganz am Anfang!'],
  },
  neugierig: {
    arbeit: ['Wusstest du, dass Eichen hundert Jahre alt werden können?'],
    morgen: ['Hast du gesehen? Der Riss im Osten leuchtet heute anders.', 'Ich frage mich, was hinter den Ruinen liegt …'],
    lager: ['Glaubst du, hinter den Rissen gibt es auch Dörfer wie unseres?', 'Ich habe ein seltsames Zeichen im Wald gefunden. Morgen zeige ich es dir.'],
    jubel: ['Unglaublich! Das muss ich aufschreiben!'],
    angst: ['Das sind keine Monster … das sind Menschen?!'],
    lachen: ['Ein Buch hat dich auf Level 1 zurückgeworfen? Was stand denn da drin?'],
  },
  ernst: {
    arbeit: ['Nicht reden. Arbeiten. Die Sonne wartet nicht.'],
    morgen: ['Die Arbeit macht sich nicht von allein. Los geht’s.', 'Wir brauchen mehr Holz vor dem Winter.'],
    lager: ['Ruh dich aus. Morgen brauchen wir dich.', 'Ich habe die Wachen eingeteilt. Schlaft ruhig.'],
    jubel: ['Gut gemacht. Wirklich gut gemacht.'],
    angst: ['Alle in die Häuser! Sofort!'],
    lachen: ['Level 1 … Das ist hart. Aber du stehst wieder auf. Das weiß ich.'],
  },
  ruhig: {
    arbeit: ['Schön gleichmäßig. Kein Grund zur Eile.'],
    morgen: ['Der Wind riecht nach Regen.', 'Schön ruhig heute. Noch.'],
    lager: ['Hör mal … die Grillen. So friedlich.', 'Egal was kommt – wir sind hier zuhause.'],
    jubel: ['Ich bin stolz auf dich.'],
    angst: ['Bleibt ruhig. Wir schaffen das.'],
    lachen: ['Ganz von vorn also. Das kenne ich.'],
  },
  hauptmann: {
    drohung: ['Hübsches Lager habt ihr da. Wäre doch schade drum.', 'Die Rotschals nehmen, was sie wollen. Heute: alles.', 'Schnappt euch die Kristalle, Jungs! Und wer sich wehrt …'],
    niederlage: ['Das … wirst du bereuen …', 'Rückzug! RÜCKZUG!'],
  },
};
const pickL = arr => arr[Math.floor(Math.random() * arr.length)];
function personaOf(n) {
  const st = sim.story;
  if (!n) return 'ruhig';
  if (n === st.hero) return 'held';
  if (n === st.rival) return 'rivale';
  const t = n.traits;
  return t.gesellig > 0.6 ? 'froh' : t.neugier > 0.6 ? 'neugierig' : t.fleiss > 0.6 ? 'ernst' : 'ruhig';
}
function fillVars(text, n) {
  const st = sim.story, h = st.hero;
  return text.replace(/\{H\}/g, st.H).replace(/\{R\}/g, st.rival ? st.rival.name : 'der Fremde')
    .replace(/\{L\}/g, h ? h.level : 1).replace(/\{L1\}/g, h ? h.level + 1 : 2)
    .replace(/\{XP\}/g, h ? Math.max(1, Math.ceil(xpForLevel(h.level) - h.xp)) : 10);
}
function voice(n, sit, fallback = 'lager') {
  const p = LINES[personaOf(n)] || LINES.ruhig, arr = p[sit] || p[fallback] || LINES.ruhig.lager;
  return fillVars(pickL(arr), n);
}

/* ---- Bausteine für Drehbücher ------------------------------------------- */
const T = (top, main, sub = '') => ({ title: { top, main, sub } });
const S = (who, text, mood = 'normal', kind = null) => ({ say: { who, text, mood, kind } });
const N = text => ({ say: { who: null, text, mood: 'normal' } });
const FX = (fx, ms = 900) => ({ fx, ms });
const SHOUT = (text, color = '#ffe14a') => ({ shout: { text, color } });
const SYS = text => ({ sys: text });
const BG = bg => ({ bg });
const CAST = (...actors) => ({ cast: actors });
const ACT = (i, o) => ({ act: { i, ...o } });
const SND = kind => ({ snd: kind });
const friendOf = n => {
  if (!n) return null;
  return sim.npcs.filter(o => o !== n && o !== sim.story.rival && !o.inside).sort((a, b) => (n.relations[b.id] || 0) - (n.relations[a.id] || 0))[0] || null;
};
const others = (n, k) => sim.npcs.filter(o => o !== n && !o.inside).sort((a, b) => (n && n.relations[b.id] || 0) - (n && n.relations[a.id] || 0)).slice(0, k);
const skillShout = n => { const sk = n && n.unlocked.map(id => SKILLS[id]).filter(Boolean).pop(); return sk ? sk.name.toUpperCase() + '!' : 'JETZT!'; };

/** Folgen-Titel aus dem, was heute wahrscheinlich passiert. */
function episodeTitle(st) {
  if (st.bossNight && !st.bossDead) return st.bossSpawned ? 'Die Nacht der roten Augen' : 'Ein Riss so rot wie Blut';
  if (st.rival && !st.done.bund) return pickL([`${st.rival.name} lacht zuletzt?`, 'Das Duell am Feuer', 'Noch einmal aufstehen']);
  if (sim.day >= CONFIG.bandits.fromDay && !st.captainKills) return pickL(['Rote Schals am Waldrand', 'Wer stiehlt, verliert']);
  if (!st.hero) return pickL(['Zwei Funken im Wald', 'Holz, Beeren und ein Traum', 'Das erste Dach']);
  if (!sim.tomeFound) return pickL(['Das Flüstern unter den Säulen', 'Wer schwach ist, sucht weiter']);
  return pickL(['Ein ganz gewöhnlicher Tag?', 'Funken über der Esse', 'Was Freunde ausmacht', 'Der Preis der Stärke']);
}

/** Der letzte Satz einer Folge: Was kommt als Nächstes? */
function cliffhanger(st) {
  const h = st.hero;
  if (st.bossNight && !st.bossDead) return st.bossSpawned ? 'Der Kronenfresser ist verwundet – aber er kommt wieder. Heute Nacht.' : `Der rote Riss pulsiert wie ein Herz. Noch ${Math.max(0, st.bossNight - sim.day)} Nächte …`;
  if (h && !h.awakened) return 'Und hoch über dem Lager sammelt sich ein seltsames, blaues Licht …';
  if (!sim.tomeFound) return `In den alten Ruinen flüstert etwas einen Namen. Es klingt wie „${st.H}“ …`;
  if (!st.rivalId && sim.day >= 4) return 'Und weit im Norden schärft jemand eine Klinge – mit einem Namen darauf.';
  if (st.rival && !st.done.bund) return `${st.rival.name} sitzt allein im Dunkeln und lächelt. „Morgen. Morgen zeige ich es dir.“`;
  if (sim.day >= CONFIG.bandits.fromDay - 1 && !st.captainKills) return 'Am Waldrand blitzen rote Schals im Mondlicht. Sie beobachten das Lager.';
  return 'Niemand ahnt, was der nächste Tag bringt …';
}

/* ---- Szenen-Drehbücher -------------------------------------------------- */
const SCENES = {
  episode(day) {
    const st = sim.story, h = st.hero, f = friendOf(h) || sim.npcs[1];
    const recap = st.highlights.slice(-3).map(x => x.text).join(' ');
    const steps = [T(`FOLGE ${day}`, episodeTitle(st), st.hint || '')];
    if (recap) steps.push(BG('dorf'), N(`Was bisher geschah: ${recap}`));
    if (h) steps.push(BG('dorf'), CAST({ n: h, x: 0.32 }, ...(f ? [{ n: f, x: 0.68, face: -1 }] : [])),
      ...(f ? [S(f, voice(f, 'morgen'), 'lachen')] : []), S(h, voice(h, 'morgen'), 'entschlossen'));
    return steps;
  },
  campfire() {
    const st = sim.story, h = st.hero; if (!h) return null;
    const f = friendOf(h), r = st.rival && st.done.rivale ? st.rival : null;
    const cast = [{ n: h, x: 0.3 }]; if (f) cast.push({ n: f, x: 0.7, face: -1 }); if (r && r !== f) cast.push({ n: r, x: 0.85, face: -1 });
    const steps = [BG('lager'), CAST(...cast), SND('lager')];
    if (f) steps.push(S(f, voice(f, 'lager'), 'lachen'));
    steps.push(S(h, voice(h, 'lager'), 'normal'));
    if (r) steps.push(S(r, voice(r, 'lager'), st.done.bund ? 'normal' : 'spott'));
    steps.push(N(cliffhanger(st)), SND('spannung'), T('FORTSETZUNG FOLGT', `Folge ${sim.day + 1}`, episodeTitle(st)));
    return steps;
  },
  training() {
    const st = sim.story, h = st.hero; if (!h || h.inside) return null;
    if (!h.awakened) { // vor dem Erwachen: einfache Arbeit, große Träume
      const f = friendOf(h);
      return [BG('wald'), CAST({ n: h, x: 0.35, pose: 'chop' }, ...(f ? [{ n: f, x: 0.7, face: -1 }] : [])), N(`${h.name} schlägt Holz, Stamm um Stamm. Niemand ahnt, was in dieser Person steckt.`),
        S(h, pickL(['Noch ein Baum … dann reicht es fürs Dach!', 'Eines Tages bauen wir hier eine ganze Stadt. Wirst schon sehen.', 'Meine Arme brennen. Egal. Weiter!']), 'entschlossen'),
        ...(f ? [S(f, voice(f, 'arbeit', 'morgen'), 'lachen')] : [])];
    }
    const r = st.rival && !st.done.bund ? st.rival : null;
    const steps = [BG('wald'), CAST({ n: h, x: 0.35, pose: 'fight' }, ...(r ? [{ n: r, x: 0.75, face: -1 }] : [])), N(`${h.name} trainiert allein im Wald. Schlag um Schlag.`), FX('speed'), SND('skill'), SHOUT(skillShout(h))];
    if (r) steps.push(S(r, voice(r, 'spott'), 'spott'), S(h, voice(h, 'antwort'), 'wut'));
    else steps.push(S(h, voice(h, 'entschlossen'), 'entschlossen'));
    const xp = 10 + h.level * 2; h.addXp(sim, xp);
    steps.push(SYS(`Training abgeschlossen · +${xp} EP`));
    return steps;
  },
  duel({ a: win, b: lose }) {
    const st = sim.story, h = st.hero, r = st.rival; if (!h || !r) return null;
    const heroWon = win === h;
    return [BG('lager'), CAST({ n: h, x: 0.3 }, { n: r, x: 0.7, face: -1 }), SND('kampf'),
      S(r, voice(r, 'spott'), 'spott'), S(h, voice(h, 'antwort'), 'wut'),
      ACT(0, { pose: 'fight', tx: 0.42 }), ACT(1, { pose: 'fight', tx: 0.58 }), FX('speed', 1400), SHOUT(skillShout(heroWon ? h : r), heroWon ? '#8fd3ff' : '#ff8a8a'),
      FX('shake'), FX('flash'), ACT(heroWon ? 1 : 0, { pose: 'none', hit: true, tx: heroWon ? 0.75 : 0.25 }),
      S(win, voice(win, 'sieg'), heroWon ? 'lachen' : 'spott'), S(lose, voice(lose, 'niederlage'), heroWon ? 'schock' : 'traurig'),
      ...(heroWon ? [SND('triumph'), SYS('Duell gewonnen!')] : [SND('traurig'), SYS('Duell verloren … aber die Erfahrung bleibt.')])];
  },
  legend({ n, item }) {
    const R = RARITIES[item.rarity], f = friendOf(n);
    return [BG('schmiede'), CAST({ n, x: 0.45, pose: 'build' }, ...(f ? [{ n: f, x: 0.8, face: -1 }] : [])), N('Die Esse glüht heißer als je zuvor. Funken regnen wie Sterne.'),
      S(n, voice(n, 'schmiede'), 'entschlossen'), FX('speed', 1200), FX('shake'), FX('flash'), SND('triumph'),
      SHOUT(item.name, R.color), SYS(`${R.name.toUpperCase()}ER GEGENSTAND ERSCHAFFEN`),
      ...(f ? [S(f, voice(f, 'jubel'), 'lachen')] : [])];
  },
  raid({ town }) {
    const st = sim.story, h = st.hero, f = friendOf(h);
    const steps = [BG('dorf'), CAST(...(h ? [{ n: h, x: 0.25 }] : []), { kind: 'banditenboss', x: 0.68, face: -1, name: 'Hauptmann Varn' }, { kind: 'bandit', x: 0.82, face: -1 }, { kind: 'bandit', x: 0.92, face: -1 }), SND('kampf'),
      N(`Rote Schals am Waldrand von ${town.name}. Die Rotschal-Bande ist da.`), S('Hauptmann Varn', fillVars(pickL(LINES.hauptmann.drohung)), 'spott')];
    if (f) steps.push(S(f, voice(f, 'angst'), 'schock'));
    if (h) steps.push(S(h, voice(h, 'kampf'), 'wut'), ACT(0, { pose: 'fight', tx: 0.4 }), FX('speed'), SHOUT('VERTEIDIGT DAS LAGER!', '#ff8a8a'));
    return steps;
  },
  boss() {
    const st = sim.story, h = st.hero, team = sim.npcs.filter(n => n.awakened && n !== h && !n.inside).slice(0, 2);
    return [BG('riss'), CAST({ kind: 'kronenfresser', x: 0.75, face: -1, scale: 2.2 }, ...(h ? [{ n: h, x: 0.22 }] : []), ...team.map((n, i) => ({ n, x: 0.36 + i * 0.1 }))), SND('spannung'),
      N('Mitternacht. Die Erde bebt. Aus dem roten Riss schiebt sich etwas, das größer ist als jedes Haus.'), FX('shake', 1400),
      S('Kronenfresser', 'Kleine Krone … kleines Reich … ich habe Hunger.', 'wut'),
      ...(h ? [S(h, 'Dann komm und hol es dir – wenn du an uns vorbeikommst!', 'entschlossen'), ACT(1, { pose: 'fight', tx: 0.4 })] : []),
      FX('speed', 1400), SND('kampf'), SHOUT('ALLE ZUSAMMEN!', '#ffe14a')];
  },
  awaken(n) {
    return [BG('lager'), CAST({ n, x: 0.5, pose: 'cheer' }), FX('flash'), SND('triumph'), N('Ein blauer Lichtstrahl fällt vom Himmel – mitten auf eine einzige Person.'),
      SYS(`[ ${n.name} ist erwacht ]`), S(n, 'W-was ist das? Ein Fenster … mitten in der Luft?!', 'schock'), S(n, 'Level 1 … Stärke … Aufgaben … Ist das alles echt?', 'entschlossen')];
  },
  book(n) {
    const laugh = others(n, 2);
    return [BG('ruine'), CAST({ n, x: 0.3 }, ...laugh.map((o, i) => ({ n: o, x: 0.65 + i * 0.15, face: -1 }))), N('Unter den Säulen liegt ein Buch, das nach Glut und Sternen riecht.'),
      FX('flash'), SND('skill'), SYS('LEGENDÄRE KLASSE: STERNENSCHMIED'), SYS('Level auf 1 zurückgesetzt.'),
      ...laugh.map(o => S(o, voice(o, 'lachen'), 'lachen')), S(n, 'Lacht nur. Mit diesem Hammer schmiede ich eines Tages Legenden.', 'entschlossen'), SND('spannung')];
  },
  classUp(n) {
    const c = CLASSES[n.cls];
    return [BG('wald'), CAST({ n, x: 0.5, pose: 'cheer' }), FX('flash'), SND('triumph'), SYS(`KLASSE ERHALTEN: ${c.icon} ${c.name}`), SHOUT(c.name.toUpperCase(), c.color), S(n, voice(n, 'entschlossen', 'jubel'), 'entschlossen')];
  },
  bossWin() {
    const st = sim.story, k = sim.npcs.find(n => n.id === st.bossKiller) || st.hero, f = friendOf(k);
    return [BG('riss'), CAST(...(k ? [{ n: k, x: 0.4, pose: 'cheer' }] : []), ...(f ? [{ n: f, x: 0.65, face: -1, pose: 'cheer' }] : [])), FX('flash'), FX('shake'), SND('triumph'),
      SHOUT('KRONENBRECHER!', '#ffd76a'), N('Der Kronenfresser zerfällt zu glühender Asche. Der rote Riss schließt sich mit einem Seufzer.'),
      ...(f ? [S(f, voice(f, 'jubel'), 'lachen')] : []), ...(k ? [S(k, 'Wir … haben es wirklich geschafft. Zusammen.', 'lachen')] : [])];
  },
  loyal({ who, smith, item }) {
    return [BG('schmiede'), CAST({ n: smith, x: 0.35 }, { n: who, x: 0.68, face: -1 }), N(`${smith.name} reicht ${who.name} ${item.name}. Das Metall ist noch warm.`),
      S(who, `Das … hast du für mich geschmiedet? Für mich?`, 'schock'), ACT(1, { pose: 'pray' }), FX('flash', 500), SND('triumph'),
      S(who, `Ab heute folge ich dir, ${smith.name}. Wohin du auch gehst.`, 'entschlossen'), S(smith, 'Steh auf. Wir sind Gefährten – keine Diener.', 'lachen'),
      SYS(`TREUE GEWONNEN: ${who.name} → ${smith.name}`)];
  },
  guild() {
    const g = sim.guild, team = sim.npcs.filter(n => n.awakened && !n.inside).sort((a, b) => b.level - a.level).slice(0, 4); if (!g || team.length < 2) return null;
    const [lead, ...rest] = team, gate = sim.world.gates.filter(t => !t.gate.red).sort((a, b) => b.gate.tier - a.gate.tier)[0];
    return [BG('halle'), CAST(...team.map((n, i) => ({ n, x: 0.2 + i * 0.2, face: i ? -1 : 1 }))), N(`Abend in der Gildenhalle der „${g.name}“. Kerzen flackern über der langen Tafel.`),
      S(lead, gate ? `Morgen gehen wir zusammen in den ${gate.gate.name}. Niemand geht allein.` : 'Wir sind stärker geworden. Aber das reicht noch nicht.', 'entschlossen'),
      ...rest.slice(0, 2).map(n => S(n, voice(n, personaOf(n) === 'rivale' ? 'lager' : 'jubel', 'lager'), personaOf(n) === 'rivale' ? 'spott' : 'lachen')),
      SYS(`Gilden-Stufe ${g.level || 1} · Mitglieder: ${sim.npcs.filter(n => n.awakened).length}`)];
  },
  guildLevel(g) {
    const lead = sim.npcs.filter(n => n.awakened && !n.inside).sort((a, b) => b.level - a.level)[0]; if (!lead) return null;
    return [BG('halle'), CAST({ n: lead, x: 0.5, pose: 'cheer' }), FX('flash'), SND('triumph'), SHOUT(`GILDE STUFE ${g.level}!`, '#8fd3ff'), SYS('Alle Mitglieder erhalten mehr Erfahrung.'), S(lead, `Die „${g.name}“ wächst. Und wir mit ihr!`, 'lachen')];
  },
  diary() {
    const h = sim.story.hero; if (!h || !h.diary || !h.diary.length || h.diary[0].day !== sim.day) return null;
    const mood = h.mood >= 70 ? 'lachen' : h.mood >= 45 ? 'normal' : 'traurig';
    return [BG('nacht'), CAST({ n: h, x: 0.3 }), N(`Spät in der Nacht. ${h.name} schreibt im Kerzenschein.`), S(h, `„Tag ${sim.day}. ${h.diary[0].text}“`, mood), SND('lager')];
  },
  tamed({ n, pet }) {
    const P = PETS[pet.kind];
    return [BG('wald'), CAST({ n, x: 0.35 }, { kind: 'pet_' + pet.kind, x: 0.62, face: -1, scale: 1.4 }), N(`Im Unterholz raschelt es. Zwei leuchtende Augen beobachten ${n.name}.`),
      S(n, 'Ganz ruhig … ich tu dir nichts. Komm her.', 'normal'), FX('flash', 400), SND('triumph'), SYS(`ZÄHMUNG ERFOLGREICH: ${P.icon} ${P.name}`),
      S(n, `Ich nenne dich „${pet.name}“. Ab jetzt sind wir ein Team!`, 'lachen')];
  },
  gateReturn({ n, gate, ok, crystals }) {
    const f = friendOf(n);
    if (ok) return [BG('riss'), CAST({ n, x: 0.4, pose: 'cheer' }, ...(f ? [{ n: f, x: 0.7, face: -1 }] : [])), N(`Der ${gate.name} spuckt eine erschöpfte Gestalt aus – mit leuchtender Beute.`), SND('triumph'),
      SYS(`RISS BEZWUNGEN · +${crystals} 💎`), S(n, voice(n, 'sieg', 'jubel'), 'lachen'), ...(f ? [S(f, voice(f, 'jubel'), 'lachen')] : [])];
    return [BG('riss'), CAST({ n, x: 0.45, pose: 'none' }, ...(f ? [{ n: f, x: 0.72, face: -1 }] : [])), FX('shake'), N(`${n.name} taumelt aus dem ${gate.name}. Blut, Staub – und keine Beute.`), SND('traurig'),
      ...(f ? [S(f, voice(f, 'angst'), 'schock')] : []), S(n, voice(n, 'niederlage'), 'traurig'), S(n, 'Aber ich komme wieder. Stärker.', 'entschlossen')];
  },
  crown() {
    const k = sim.kingdom, r = sim.npcs.find(n => n.id === k.regentId) || sim.story.hero, crowd = others(r, 4);
    return [BG('burg'), CAST({ n: r, x: 0.5 }, ...crowd.map((n, i) => ({ n, x: [0.15, 0.3, 0.7, 0.85][i], face: i < 2 ? 1 : -1, pose: 'cheer' }))),
      N(`Der ganze Ort hat sich versammelt. Alle Augen ruhen auf ${r.name}.`), S(r, `Von heute an sind wir nicht mehr nur ein Dorf. Wir sind ${k.name}!`, 'entschlossen'),
      FX('flash'), SND('triumph'), SHOUT(`ES LEBE ${k.name.toUpperCase()}!`, '#ffd76a'), ...crowd.slice(0, 2).map(n => S(n, voice(n, 'jubel'), 'lachen'))];
  },
  captainFall() {
    const st = sim.story, k = sim.npcs.find(n => n.id === st.captainKiller) || st.hero; if (!k) return null;
    return [BG('dorf'), CAST({ n: k, x: 0.35, pose: 'fight' }, { kind: 'banditenboss', x: 0.68, face: -1 }), FX('speed'), SHOUT(skillShout(k)), FX('shake'), FX('flash'),
      ACT(1, { hit: true, tx: 0.75 }), S('Hauptmann Varn', pickL(LINES.hauptmann.niederlage), 'wut'), S(k, 'Sag deinen Leuten: Dieses Lager gehört dem Volk.', 'entschlossen'), SND('triumph')];
  },
  milestone(n) {
    return [BG('wald'), CAST({ n, x: 0.5, pose: 'cheer' }), FX('flash'), FX('speed'), SND('triumph'), SHOUT(`LEVEL ${n.level}!`, '#8fd3ff'), SYS(`Alle Werte steigen · ${n.titles[n.titles.length - 1] || 'Erwachte Seele'}`), S(n, voice(n, 'entschlossen', 'jubel'), 'entschlossen')];
  },
  diplo(e) {
    const r = e.realm, k = sim.kingdom, reg = (k && sim.npcs.find(n => n.id === k.regentId)) || sim.story.hero, h = sim.story.hero, envoy = `Gesandter aus ${r.name}`;
    const cast = [...(reg ? [{ n: reg, x: 0.28 }] : []), { kind: 'ritter', x: 0.7, face: -1, name: envoy }];
    switch (e.kind) {
      case 'contact': return [BG('burg'), CAST(...cast), N(`Ein Reiter mit fremdem Banner hält vor ${sim.capital.name}. Das Wappen: ${r.name}.`),
        S(envoy, `${r.ruler} grüßt ${k.name}. Mein Reich liegt hinter den östlichen Wäldern. Seid ihr Freunde … oder Beute?`, 'normal', 'ritter'),
        ...(reg ? [S(reg, 'Das hängt ganz von euch ab.', 'entschlossen')] : []), N('Was antwortet ihr? Wähle unten – sonst entscheidet die Regentschaft.')];
      case 'offer': return sim.minutes - scn.lastAt > 200 ? [BG('burg'), CAST(...cast), S(envoy, r.pending ? r.pending.text : 'Meine Herrschaft erwartet eine Antwort.', 'normal', 'ritter'), N('Wähle unten eine Antwort.')] : null;
      case 'war': return [BG('burg'), CAST(...cast), SND('spannung'), S(envoy, `${r.ruler} hat genug von euch. Morgen marschiert unser Heer. Bereitet euch vor – oder flieht.`, 'wut', 'ritter'),
        ...(h ? [S(h, voice(h, 'kampf'), 'wut')] : []), FX('shake'), SHOUT('KRIEG!', '#ff6b6b')];
      case 'siege': return [BG('dorf'), CAST(...(h ? [{ n: h, x: 0.22 }] : []), { kind: 'feldherr', x: 0.62, face: -1, scale: 1.2 }, { kind: 'ritter', x: 0.78, face: -1 }, { kind: 'ritter', x: 0.9, face: -1 }), SND('kampf'),
        N(`Trommeln. Banner von ${r.name} am Waldrand. Ein ganzes Heer zieht auf die Stadt zu.`), S('Feldherr', 'Öffnet die Tore – oder wir reißen sie ein!', 'wut', 'feldherr'),
        ...(h ? [S(h, voice(h, 'kampf'), 'entschlossen'), ACT(0, { pose: 'fight', tx: 0.35 })] : []), FX('speed'), SHOUT('ZU DEN WAFFEN!', '#ffd166')];
      case 'siegeWon': return [BG('burg'), CAST(...others(null, 4).map((n, i) => ({ n, x: 0.2 + i * 0.2, pose: 'cheer' }))), FX('flash'), SND('triumph'), SHOUT('SIEG!', '#ffd76a'),
        N(`Das Heer von ${r.name} ist zerschlagen. ${sim.capital.name} hält stand!`), ...(h ? [S(h, voice(h, 'sieg', 'jubel'), 'lachen')] : [])];
      case 'siegeLost': return [BG('burg'), CAST(...(h ? [{ n: h, x: 0.4 }] : [])), SND('traurig'), N(`Die Belagerer plündern die Schatzkammer und ziehen ab.`), ...(h ? [S(h, voice(h, 'niederlage'), 'traurig'), S(h, 'Das nächste Mal halten wir stand. Wir brauchen eine Mauer.', 'entschlossen')] : [])];
      case 'vassal': return [BG('burg'), CAST(...cast), S(envoy, `${r.ruler} beugt sich. ${r.name} zahlt ab heute Abgaben an ${k.name}.`, 'traurig', 'ritter'), FX('flash'), SND('triumph'), SHOUT(`${r.name.toUpperCase()} UNTERWIRFT SICH`, '#ffd76a')];
      case 'alliance': return [BG('burg'), CAST(...cast), S(envoy, `${r.ruler} nimmt euer Bündnis an. Unsere Wege sind ab heute eure Wege.`, 'lachen', 'ritter'), ...(reg ? [S(reg, 'Auf eine lange Freundschaft!', 'lachen')] : []), SND('triumph'), SHOUT('BÜNDNIS!', '#8fd3ff')];
    }
    return null;
  },
  wall() {
    const h = sim.story.hero, f = friendOf(h);
    return [BG('burg'), CAST(...(h ? [{ n: h, x: 0.35, pose: 'cheer' }] : []), ...(f ? [{ n: f, x: 0.65, face: -1, pose: 'cheer' }] : [])), FX('flash'), SND('triumph'), SHOUT('DIE MAUER STEHT!', '#d8d4cc'),
      N(`Stein auf Stein, Tag für Tag – nun umschließt eine Mauer ${sim.capital.name}.`), ...(f ? [S(f, voice(f, 'jubel'), 'lachen')] : [])];
  },
  srift(e) {
    const h = sim.story.hero, aw = sim.npcs.filter(n => n.awakened && n !== h).sort((a, b) => b.level - a.level).slice(0, 2);
    if (e.phase === 'open') return [BG('riss'), CAST({ kind: e.kind, x: 0.75, face: -1, scale: 2 }, ...(h ? [{ n: h, x: 0.25 }] : [])), FX('shake'), SND('spannung'),
      SYS(`[ WARNUNG ] Der Riss „${e.gate.name}“ hat RANG S erreicht.`), SHOUT('RANG S', '#ffd34a'), N(`Gold und Schwärze wirbeln im Riss. Dahinter: „${e.name}“. Wird er nicht in drei Tagen bezwungen, bricht er aus.`),
      ...(h ? [S(h, 'Rang S … das ist kein Riss mehr. Das ist eine Kriegserklärung.', 'schock'), S(h, 'Wir gehen zusammen. Die ganze Gilde.', 'entschlossen')] : [])];
    if (e.phase === 'break') return [BG('nacht'), CAST({ kind: e.kind, x: 0.7, face: -1, scale: 2.2 }, ...aw.map((n, i) => ({ n, x: 0.2 + i * 0.16, pose: 'fight' }))), FX('flash'), FX('shake'), SND('kampf'),
      SHOUT('AUSBRUCH!', '#ff5a5a'), N(`Der Riss zerreißt. „${e.name}“ tritt in unsere Welt – und das Morgenlicht kann ihm nichts anhaben.`), ...aw.slice(0, 1).map(n => S(n, 'Alle zu den Waffen! Schützt die Häuser!', 'wut'))];
    const w = e.hero; if (!w) return null;
    return [BG('riss'), CAST({ n: w, x: 0.4, pose: 'fight' }), FX('flash'), SND('triumph'), SYS(`S-RANG-RISS GESCHLOSSEN · „${e.name}“ BEZWUNGEN`), SHOUT('S-RANG-BEZWINGER', '#ffd34a'), S(w, voice(w, 'sieg', 'jubel'), 'lachen')];
  },
  groupRaid(e) {
    const party = e.party.filter(n => !n.inside || e.phase !== 'start'), lead = party[0]; if (!lead) return null;
    if (e.phase === 'start') return [BG('halle'), CAST(...party.slice(0, 4).map((n, i) => ({ n, x: 0.2 + i * 0.2, face: i ? -1 : 1 }))), N(`Morgengrauen in der Gildenhalle. Heute geht niemand allein in den Riss.`),
      S(lead, `Im Riss „${e.gate.name}“ wartet „${e.boss}“. Wir holen ihn uns – zusammen!`, 'entschlossen'), ...party.slice(1, 3).map(n => S(n, voice(n, personaOf(n) === 'rivale' ? 'lager' : 'jubel', 'lager'), 'lachen')), SND('kampf'), SHOUT('AUFBRUCH!', '#8fd3ff')];
    if (e.phase === 'win') return [BG('riss'), CAST({ kind: bossKindOf(e.boss) || 'aschegolem', x: 0.78, face: -1, scale: 1.8 }, ...party.slice(0, 3).map((n, i) => ({ n, x: 0.2 + i * 0.15, pose: 'fight' }))), FX('speed'), SHOUT(`${skillShout(lead)}`), FX('shake'), FX('flash'), ACT(0, { hit: true }),
      SND('triumph'), SYS(`RISS-BOSS „${e.boss}“ BESIEGT · +${e.crystals} 💎`), S(lead, voice(lead, 'sieg', 'jubel'), 'lachen'), ...(e.item ? [SHOUT(e.item.name, RARITIES[e.item.rarity].color)] : [])];
    return [BG('riss'), CAST(...party.slice(0, 3).map((n, i) => ({ n, x: 0.25 + i * 0.2 }))), FX('shake'), SND('traurig'), N(`„${e.boss}“ war zu stark. Blutend und erschöpft taumelt die Gruppe zurück ans Tageslicht.`), S(lead, voice(lead, 'niederlage'), 'traurig'), S(lead, 'Wir trainieren. Und dann kommen wir wieder.', 'entschlossen')];
  },
  bund() {
    const st = sim.story, h = st.hero, r = st.rival; if (!h || !r) return null;
    return [BG('lager'), CAST({ n: h, x: 0.35 }, { n: r, x: 0.65, face: -1 }), S(r, voice(r, 'respekt'), 'normal'), S(h, 'Heißt das … wir sind jetzt Freunde?', 'lachen'),
      S(r, 'Werd nicht übermütig. Gefährten. Mehr nicht.', 'spott'), SND('triumph'), SYS(`${r.name} schließt sich euch an`)];
  },
};

/** Kapitel der Chronik → Szene (mit Titelkarte vorneweg). */
function chapterScene(ch) {
  const st = sim.story, h = st.hero, head = [T(ch.label ? ch.label.toUpperCase() : ch.num.toUpperCase(), ch.title)];
  switch (ch.id) {
    case 'licht': return h ? [...head, ...SCENES.awaken(h)] : null;
    case 'buch': { const f = sim.npcs.find(n => n.id === st.smithId) || h; return f ? [...head, ...SCENES.book(f)] : null; }
    case 'bund': { const b = SCENES.bund(); return b ? [...head, ...b] : null; }
    case 'sieg': return [...head, ...SCENES.bossWin()];
    case 'krone': return sim.kingdom ? [...head, ...SCENES.crown()] : null;
    case 'hauptmann': { const c = SCENES.captainFall(); return c ? [...head, ...c] : null; }
    case 'treue': case 'nachbarn': case 'krieg': case 'vasall': case 'freunde': case 'mauer': return null; // eigene Szenen über die Ereignisse
    case 'kronenfresser': case 'banditen': return null; // eigene Szenen kommen über die Ereignisse
  }
  const steps = [...head, BG(ch.id === 'krone' ? 'burg' : ch.id === 'roterRiss' ? 'riss' : ch.id === 'legende' ? 'schmiede' : ch.id === 'fluestern' ? 'ruine' : ch.id === 'rissnacht' ? 'riss' : 'dorf')];
  if (h) steps.push(CAST({ n: h, x: 0.4 }, ...(friendOf(h) ? [{ n: friendOf(h), x: 0.7, face: -1 }] : [])));
  steps.push(N(ch.text));
  if (h && ch.id !== 'prolog') steps.push(S(h, voice(h, 'entschlossen'), 'entschlossen'));
  if (ch.id === 'roterRiss' || ch.id === 'rissnacht') steps.push(SND('spannung'));
  return steps;
}

/* ---- Abspielen ---------------------------------------------------------- */
function playScene(steps, prio = 1) {
  if (!steps || !scn.on || ui.catchingUp) return;
  if (scn.q.length >= 3) { if (prio < 2) return; scn.q.shift(); }
  scn.q.push(steps);
  scn.lastAt = sim.minutes;
  if (!scn.cur) nextScene();
}
function highlight(text) { const st = sim.story; st.highlights.push({ day: sim.day, text }); if (st.highlights.length > 8) st.highlights.shift(); }

function nextScene() {
  const steps = scn.q.shift();
  if (!steps) { scn.cur = null; $('scene').hidden = true; return; }
  const r = $('mapWrap').getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1), cv = $('sceneCv');
  cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px';
  scn.cur = { steps, i: -1, dpr, bg: 'dorf', actors: [], fx: {}, shout: null, typing: null, until: 0, floats: [] };
  $('scene').hidden = false; $('sceneTitle').hidden = true; $('sceneBox').hidden = true; $('sceneSys').hidden = true;
  advance();
}
function advance() {
  const S0 = scn.cur, now = performance.now();
  while (S0 && ++S0.i < S0.steps.length) {
    const st = S0.steps[S0.i];
    if (st.bg) { S0.bg = st.bg; continue; }
    if (st.cast) { S0.actors = st.cast.map(a => ({ ...a, x: a.x, tx: a.x, face: a.face || 1, pose: a.pose || 'none' })); continue; }
    if (st.act) { const a = S0.actors[st.act.i]; if (a) { if (st.act.pose) a.pose = st.act.pose; if (st.act.tx != null) a.tx = st.act.tx; if (st.act.hit) { a.hitAt = now; S0.floats.push({ x: a.tx, text: `-${30 + Math.floor(Math.random() * 60)}`, born: now }); } } continue; }
    if (st.fx) { S0.fx[st.fx] = now + (st.ms || 900); if (st.fx === 'shake' || st.fx === 'flash') sceneSound('hit'); continue; }
    if (st.snd) { sceneSound(st.snd); continue; }
    $('sceneTitle').hidden = true; $('sceneSys').hidden = true;
    if (st.title) {
      const tEl = $('sceneTitle'); tEl.querySelector('.st-top').textContent = st.title.top; tEl.querySelector('.st-main').textContent = st.title.main; tEl.querySelector('.st-sub').textContent = st.title.sub || '';
      tEl.hidden = false; tEl.classList.remove('in'); void tEl.offsetWidth; tEl.classList.add('in'); $('sceneBox').hidden = true;
      S0.until = now + 3800; return;
    }
    if (st.sys) { const el = $('sceneSys'); el.innerHTML = `<div class="sys-title">[ SYSTEM ]</div><div>${esc(st.sys)}</div>`; el.hidden = false; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); sceneSound('sys'); S0.until = now + 1900; return; }
    if (st.shout) { S0.shout = { ...st.shout, born: now }; S0.until = now + 1300; return; }
    if (st.wait) { S0.until = now + st.wait; return; }
    if (st.say) { showSay(st.say); return; }
  }
  if (S0) nextScene();
}
function showSay({ who, text, mood, kind }) {
  const S0 = scn.cur, n = who && typeof who === 'object' ? who : null, name = n ? n.name : who || 'Erzähler';
  $('sceneBox').hidden = false;
  $('sceneName').textContent = name; $('sceneName').style.color = n ? (n.color.startsWith('#') ? shadeHex(n.color, 45) : n.color) : who ? '#ff9a9a' : '#f0b54a'; // dunkle Farben aufhellen
  $('sceneText').textContent = '';
  $('sceneBox').classList.toggle('narr', !who);
  drawFace($('sceneFace'), n, who, mood, kind);
  S0.typing = { text, shown: 0, t0: performance.now() };
  // wer spricht, rückt leicht nach vorn
  for (const a of S0.actors) a.speaking = !!(n && a.n === n) || (!n && who && a.name === who);
}
/** Porträt mit Gefühls-Zeichen (Anime-Symbole) und farbigem Hintergrund. */
const MOOD = { normal: ['#1b2a3a', ''], wut: ['#4a1414', '💢'], lachen: ['#3a3014', '✨'], traurig: ['#14223a', '💧'], entschlossen: ['#3a2410', '🔥'], spott: ['#2a1a3a', '😏'], schock: ['#1a3a3a', '❗'] };
function drawFace(cv, n, who, mood, faceKind = null) {
  const c = cv.getContext('2d'), [bg, sym] = MOOD[mood] || MOOD.normal, W = cv.width;
  const g = c.createRadialGradient(W / 2, W / 2, 4, W / 2, W / 2, W * 0.7); g.addColorStop(0, shadeHex(bg, 40)); g.addColorStop(1, bg);
  c.fillStyle = g; c.fillRect(0, 0, W, W);
  c.imageSmoothingEnabled = false;
  if (n) {
    const f = pixFrame(n, { arms: 'none', moving: false, facing: 1, view: 'down', mood: mood && mood !== 'normal' ? mood : null }, 0, performance.now(), 2); // HD-Gesicht mit Gefühl
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.drawImage(pixHD1(f), 36, 12, 88, 88, 0, 0, W, W);
  } else if (who) {
    const kind = faceKind || (who === 'Kronenfresser' ? 'aschegolem' : 'banditenboss');
    c.save(); if (who === 'Kronenfresser') c.filter = 'hue-rotate(-30deg) saturate(1.5)';
    const cvC = pixCreature(kind, 0, false, false, false); c.drawImage(cvC, 10, kind === 'aschegolem' ? 4 : 8, 20, 20, 0, 0, W, W); c.restore();
  } else { c.font = `${W * 0.55}px serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('📖', W / 2, W / 2 + 2); }
  if (sym) { c.font = `${W * 0.32}px serif`; c.textAlign = 'right'; c.textBaseline = 'top'; c.fillText(sym, W - 2, 2); }
  if (mood === 'traurig') { c.fillStyle = 'rgba(120,180,255,.5)'; for (let k = 0; k < 6; k++) c.fillRect(k * W / 6 + 3, (performance.now() / 20 + k * 13) % W, 1.5, 7); }
}

/** Gefühle direkt im Pixel-Gesicht: Brauen, Augen, Mund, Tränen, Röte (Gesicht liegt bei x 14…25, y 8…18). */
function drawExpression(c, n, mood, k) {
  if (!mood || mood === 'normal') return;
  const P = pixPalette(n), px = (x, y, col, w = 1, h = 1) => { c.fillStyle = col; c.fillRect((x - 9) * k, (y - 3) * k, w * k, h * k); };
  const ink = '#2a1810', blush = 'rgba(255,90,110,.55)';
  const closeEyes = () => { px(16, 12, P.SK, 3, 4); px(21, 12, P.SK, 3, 4); };
  const mouthClear = () => px(18, 16, P.SK, 4, 2);
  if (mood === 'wut') {
    px(15, 10, ink); px(16, 11, ink, 2); px(18, 12, ink); px(21, 12, ink); px(22, 11, ink, 2); px(24, 10, ink);
    mouthClear(); px(18, 17, ink); px(19, 16, ink, 2); px(21, 17, ink);
  } else if (mood === 'lachen') {
    closeEyes(); px(16, 14, ink); px(17, 13, ink); px(18, 14, ink); px(21, 14, ink); px(22, 13, ink); px(23, 14, ink);
    mouthClear(); px(18, 16, '#7a1a1a', 4); px(19, 17, '#ff8a9a', 2); px(15, 15, blush, 2); px(23, 15, blush, 2);
  } else if (mood === 'traurig') {
    px(16, 11, ink); px(17, 11, ink); px(18, 10, ink); px(21, 10, ink); px(22, 11, ink); px(23, 11, ink);
    mouthClear(); px(19, 17, ink, 2); px(18, 16, ink); px(21, 16, ink);
    const t = (performance.now() / 120) % 4; px(17, 16 + Math.floor(t) * 0.5, '#7ac8ff', 1, 2); px(22, 16 + Math.floor(t) * 0.5, '#7ac8ff', 1, 2);
  } else if (mood === 'entschlossen') {
    px(15, 11, ink, 4); px(21, 11, ink, 4); px(16, 12, P.SK, 3); px(21, 12, P.SK, 3); // halb geschlossene, scharfe Augen
    mouthClear(); px(18, 16, ink, 4);
  } else if (mood === 'spott') {
    px(16, 11, ink, 3); px(21, 10, ink, 2); px(23, 11, ink);
    px(16, 12, P.SK, 3); mouthClear(); px(19, 16, ink, 2); px(21, 15, ink);
  } else if (mood === 'schock') {
    px(16, 10, ink, 3); px(21, 10, ink, 3);
    px(16, 13, '#ffffff', 3, 3); px(21, 13, '#ffffff', 3, 3); px(17, 14, ink); px(22, 14, ink);
    mouthClear(); px(19, 16, ink, 2, 2);
  }
}

function sceneTap() {
  const S0 = scn.cur; if (!S0) return;
  if (S0.typing && S0.typing.shown < S0.typing.text.length) { S0.typing.shown = S0.typing.text.length; return; }
  S0.typing = null; S0.until = 0; advance();
}

/* ---- Bühne zeichnen ----------------------------------------------------- */
function drawScene(now) {
  const S0 = scn.cur; if (!S0) return;
  if (S0.typing) {
    const tp = S0.typing, n = Math.min(tp.text.length, Math.floor((now - tp.t0) / 28));
    if (n !== tp.shown && n > tp.shown) { tp.shown = n; }
    $('sceneText').textContent = tp.text.slice(0, tp.shown);
    if (tp.shown >= tp.text.length && !tp.doneAt) tp.doneAt = now;
    if (tp.doneAt && now - tp.doneAt > 1500 + tp.text.length * 18) { S0.typing = null; advance(); }
  } else if (S0.until && now > S0.until) { S0.until = 0; advance(); }
  if (!scn.cur) return;
  const cv = $('sceneCv'), c = cv.getContext('2d'), dpr = S0.dpr, W = cv.width / dpr, H = cv.height / dpr;
  const shake = S0.fx.shake > now ? (Math.random() - 0.5) * 14 : 0, gy = H * 0.66, s = Math.min(W * 0.42, H * 0.5);
  c.setTransform(dpr, 0, 0, dpr, shake * dpr, (Math.random() - 0.5) * (S0.fx.shake > now ? 10 : 0) * dpr);
  drawStage(c, S0.bg, W, H, gy, s, now);
  // Darsteller
  for (const a of S0.actors) a.x += (a.tx - a.x) * 0.08;
  const order = [...S0.actors].sort((p, q) => (p.speaking ? 1 : 0) - (q.speaking ? 1 : 0));
  for (const a of order) {
    const px = a.x * W, sc = (a.scale || 1) * (a.speaking ? 1.08 : 1), ss = s * sc;
    c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(px, gy + 2, ss * 0.28, ss * 0.06, 0, 0, TAU); c.fill();
    const hurt = a.hitAt && now - a.hitAt < 250;
    if (hurt) c.filter = 'brightness(2) saturate(.3)';
    if (a.n) {
      const pose = { moving: Math.abs(a.tx - a.x) > 0.005, arms: a.pose, facing: a.face, step: null, tool: null, view: a.pose === 'cheer' || (a.pose === 'none' && !a.speaking) ? 'down' : 'side' };
      const foe = a.n.foe, inv = a.n.inventory, cheer = a.n.cheerUntil; a.n.foe = null; a.n.inventory = { wood: 0, stone: 0 };
      if (a.pose === 'cheer') a.n.cheerUntil = 0;
      renderer.drawSettler(c, a.n, px, gy - ss * 0.38, ss, now, pose, now / 1000 * 3);
      a.n.foe = foe; a.n.inventory = inv; a.n.cheerUntil = cheer;
    } else if (a.kind) {
      if (a.kind === 'kronenfresser') c.filter = (hurt ? 'brightness(2) ' : '') + 'hue-rotate(-30deg) saturate(1.5)';
      drawPixelCreature(c, a.kind === 'kronenfresser' ? 'aschegolem' : a.kind, px, gy, ss, a.face, Math.floor(now / 160) & 3, a.speaking, hurt);
    }
    c.filter = 'none';
  }
  // Schadenszahlen
  c.font = 'bold 22px sans-serif'; c.textAlign = 'center';
  for (const f of S0.floats) { const t = (now - f.born) / 1000; if (t > 1.2) continue; c.globalAlpha = 1 - t / 1.2; c.fillStyle = '#000'; c.fillText(f.text, f.x * W + 2, gy - s * 1.1 - t * 50 + 2); c.fillStyle = '#ffd166'; c.fillText(f.text, f.x * W, gy - s * 1.1 - t * 50); }
  c.globalAlpha = 1;
  // Effekte
  if (S0.fx.speed > now) {
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2;
    for (let k = 0; k < 40; k++) { const a = rh(k, Math.floor(now / 60)) * TAU, r0 = Math.min(W, H) * (0.3 + rh(k, 7) * 0.2), r1 = Math.max(W, H); c.beginPath(); c.moveTo(W / 2 + Math.cos(a) * r0, H / 2 + Math.sin(a) * r0); c.lineTo(W / 2 + Math.cos(a) * r1, H / 2 + Math.sin(a) * r1); c.stroke(); }
  }
  if (S0.fx.flash > now) { c.fillStyle = `rgba(255,255,255,${Math.min(0.85, (S0.fx.flash - now) / 900)})`; c.fillRect(0, 0, W, H); }
  if (S0.shout && now - S0.shout.born < 1300) {
    const t = (now - S0.shout.born) / 1300, k = t < 0.15 ? 0.5 + t / 0.15 * 0.7 : 1.2 - (t - 0.15) * 0.15;
    c.save(); c.translate(W / 2, H * 0.32); c.rotate(-0.06); c.scale(k, k); c.globalAlpha = t > 0.85 ? (1 - t) / 0.15 : 1;
    const fs = Math.min(46, W / Math.max(6, S0.shout.text.length) * 1.5);
    c.font = `900 ${fs}px Georgia, serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineWidth = 7; c.strokeStyle = '#000'; c.strokeText(S0.shout.text, 0, 0); c.fillStyle = S0.shout.color; c.fillText(S0.shout.text, 0, 0);
    c.restore(); c.globalAlpha = 1;
  }
  // Kinobalken
  c.fillStyle = '#000'; c.fillRect(0, 0, W, H * 0.06);
}

function drawStage(c, bg, W, H, gy, s, now) {
  const hour = sim.hourFloat, inside = bg === 'schmiede' || bg === 'halle' || bg === 'nacht', night = bg === 'lager' || bg === 'riss' || (!inside && sim.isNight), eve = !night && !inside && hour > 17;
  const sky = c.createLinearGradient(0, 0, 0, gy);
  if (bg === 'schmiede') { sky.addColorStop(0, '#1a0e0a'); sky.addColorStop(1, '#3a1c10'); }
  else if (bg === 'riss') { sky.addColorStop(0, '#12040a'); sky.addColorStop(1, '#4a0c18'); }
  else if (night) { sky.addColorStop(0, '#060a1a'); sky.addColorStop(1, '#1c2440'); }
  else if (eve) { sky.addColorStop(0, '#2a3a6a'); sky.addColorStop(1, '#f0a060'); }
  else { sky.addColorStop(0, '#5aa0e0'); sky.addColorStop(1, '#cfe8f6'); }
  c.fillStyle = sky; c.fillRect(-20, -20, W + 40, H + 40);
  if (night && !inside) for (let k = 0; k < 60; k++) { c.fillStyle = `rgba(255,255,255,${0.4 + Math.sin(now / 500 + k) * 0.3})`; c.fillRect(rh(k, 1) * W, rh(k, 2) * gy * 0.7, 1.5, 1.5); }
  const hill = (col, h0, amp, seed) => { c.fillStyle = col; c.beginPath(); c.moveTo(0, gy); for (let x = 0; x <= W; x += 20) c.lineTo(x, gy - h0 - Math.sin(x / 90 + seed) * amp - Math.sin(x / 37 + seed * 2) * amp * 0.4); c.lineTo(W, gy); c.fill(); };
  if (bg === 'schmiede') {
    c.fillStyle = '#2a1810'; c.fillRect(0, 0, W, gy);
    c.strokeStyle = 'rgba(0,0,0,.35)'; for (let y = 0; y < gy; y += 18) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); for (let x = (y / 18) % 2 * 20; x < W; x += 40) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 18); c.stroke(); } }
    const fx = W * 0.12, fl = 0.7 + Math.sin(now / 90) * 0.15, gl = c.createRadialGradient(fx, gy - s * 0.4, 0, fx, gy - s * 0.4, s * 1.4);
    gl.addColorStop(0, `rgba(255,170,60,${fl})`); gl.addColorStop(1, 'rgba(255,90,20,0)'); c.fillStyle = gl; c.fillRect(0, 0, W, H);
    c.fillStyle = '#4a3a30'; c.fillRect(fx - s * 0.35, gy - s * 0.9, s * 0.7, s * 0.9); c.fillStyle = '#ff9a3a'; c.fillRect(fx - s * 0.2, gy - s * 0.5, s * 0.4, s * 0.3);
    c.fillStyle = '#3a3a40'; c.fillRect(W * 0.62, gy - s * 0.32, s * 0.4, s * 0.12); c.fillRect(W * 0.62 + s * 0.12, gy - s * 0.2, s * 0.16, s * 0.2);
    for (let k = 0; k < 12; k++) { const t = (now / 900 + rh(k, 3)) % 1; c.fillStyle = `rgba(255,${180 + k * 5},80,${1 - t})`; c.fillRect(fx + (rh(k, 4) - 0.5) * s * 0.6, gy - s * 0.5 - t * s * 1.5, 2, 2); }
  } else if (bg === 'halle' || bg === 'nacht') {
    const hall = bg === 'halle';
    c.fillStyle = hall ? '#3a2a1c' : '#1a1622'; c.fillRect(0, 0, W, gy);
    c.strokeStyle = 'rgba(0,0,0,.35)'; for (let x = 0; x < W; x += 26) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, gy); c.stroke(); }
    if (hall) {
      for (const x of [0.15, 0.5, 0.85]) { c.fillStyle = '#2c4fa8'; c.fillRect(W * x - s * 0.12, gy * 0.12, s * 0.24, s * 0.7); c.fillStyle = '#f0c35a'; star5(c, W * x, gy * 0.12 + s * 0.3, s * 0.08); }
      c.fillStyle = '#6b4526'; c.fillRect(W * 0.08, gy - s * 0.32, W * 0.84, s * 0.08); c.fillRect(W * 0.12, gy - s * 0.24, s * 0.06, s * 0.24); c.fillRect(W * 0.86, gy - s * 0.24, s * 0.06, s * 0.24);
      for (const x of [0.25, 0.5, 0.75]) { const f = 0.7 + Math.sin(now / 90 + x * 10) * 0.2; c.fillStyle = '#efe4cc'; c.fillRect(W * x - 3, gy - s * 0.45, 6, s * 0.13); c.fillStyle = `rgba(255,200,90,${f})`; c.beginPath(); c.ellipse(W * x, gy - s * 0.48, 4, 7, 0, 0, TAU); c.fill();
        const gl = c.createRadialGradient(W * x, gy - s * 0.48, 0, W * x, gy - s * 0.48, s * 0.6); gl.addColorStop(0, `rgba(255,190,90,${f * 0.35})`); gl.addColorStop(1, 'rgba(255,190,90,0)'); c.fillStyle = gl; c.fillRect(0, 0, W, H); }
    } else { // Kammer bei Nacht: Fenster mit Mond, Kerze auf dem Tisch
      c.fillStyle = '#0a1028'; c.fillRect(W * 0.62, gy * 0.18, s * 0.6, s * 0.6); c.fillStyle = '#f0f0d8'; c.beginPath(); c.arc(W * 0.62 + s * 0.4, gy * 0.18 + s * 0.2, s * 0.09, 0, TAU); c.fill();
      c.strokeStyle = '#4a3a2a'; c.lineWidth = 4; c.strokeRect(W * 0.62, gy * 0.18, s * 0.6, s * 0.6); c.beginPath(); c.moveTo(W * 0.62 + s * 0.3, gy * 0.18); c.lineTo(W * 0.62 + s * 0.3, gy * 0.18 + s * 0.6); c.stroke();
      c.fillStyle = '#5a3a20'; c.fillRect(W * 0.08, gy - s * 0.3, W * 0.4, s * 0.06);
      const f = 0.75 + Math.sin(now / 70) * 0.2, cx = W * 0.4, cy = gy - s * 0.42;
      c.fillStyle = '#efe4cc'; c.fillRect(cx - 3, cy + 4, 6, s * 0.08); c.fillStyle = `rgba(255,200,90,${f})`; c.beginPath(); c.ellipse(cx, cy, 4, 7, 0, 0, TAU); c.fill();
      const gl = c.createRadialGradient(cx, cy, 0, cx, cy, s * 1.1); gl.addColorStop(0, `rgba(255,180,80,${f * 0.4})`); gl.addColorStop(1, 'rgba(255,180,80,0)'); c.fillStyle = gl; c.fillRect(0, 0, W, H);
      c.fillStyle = '#e8dcc0'; c.fillRect(W * 0.18, gy - s * 0.34, s * 0.22, s * 0.04); // offenes Tagebuch
    }
  } else if (bg === 'riss') {
    hill('#1a0a12', s * 0.5, s * 0.15, 2);
    const rx = W * 0.75, ry = gy - s * 0.9, pulse = 1 + Math.sin(now / 200) * 0.06, gl = c.createRadialGradient(rx, ry, 0, rx, ry, s * 1.4 * pulse);
    gl.addColorStop(0, 'rgba(255,240,240,.95)'); gl.addColorStop(0.25, 'rgba(255,40,40,.8)'); gl.addColorStop(1, 'rgba(120,0,40,0)'); c.fillStyle = gl; c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(255,80,80,.7)'; c.lineWidth = 3; for (let k = 0; k < 3; k++) { const r0 = now / (400 + k * 200) * (k % 2 ? -1 : 1); c.beginPath(); c.ellipse(rx, ry, s * (0.5 - k * 0.12) * pulse, s * (0.9 - k * 0.2) * pulse, 0, r0, r0 + 4.3); c.stroke(); }
  } else {
    hill(night ? '#141c30' : eve ? '#6a5a7a' : '#8ab0c8', s * 0.9, s * 0.25, 1);
    hill(night ? '#1a2a24' : '#5a8a50', s * 0.45, s * 0.12, 4);
    if (bg === 'dorf' || bg === 'lager') for (let k = 0; k < 6; k++) { // Häuser-Silhouetten
      const x = (k + 0.3) * W / 6, w = s * 0.5, h = s * (0.45 + rh(k, 9) * 0.25), y = gy - s * 0.05;
      c.fillStyle = night ? '#1a1a24' : '#a8907a'; c.fillRect(x - w / 2, y - h, w, h);
      c.fillStyle = night ? '#24202c' : ['#a8432f', '#56606e', '#7d4a2b'][k % 3]; c.beginPath(); c.moveTo(x - w * 0.6, y - h); c.lineTo(x, y - h - w * 0.5); c.lineTo(x + w * 0.6, y - h); c.fill();
      c.fillStyle = night ? 'rgba(255,200,100,.85)' : '#2d3b4a'; c.fillRect(x - w * 0.2, y - h * 0.6, w * 0.15, w * 0.15); c.fillRect(x + w * 0.08, y - h * 0.6, w * 0.15, w * 0.15);
    }
    if (bg === 'wald') for (let k = 0; k < 9; k++) { const x = rh(k, 5) * W, h = s * (0.8 + rh(k, 6) * 0.8); c.fillStyle = night ? '#0e1a14' : ['#2f6a3a', '#3f7a40', '#24502c'][k % 3]; c.beginPath(); c.moveTo(x - s * 0.25, gy); c.lineTo(x, gy - h); c.lineTo(x + s * 0.25, gy); c.fill(); }
    if (bg === 'ruine') for (let k = 0; k < 5; k++) { const x = (k + 0.5) * W / 5, h = s * (0.5 + rh(k, 8) * 0.9); c.fillStyle = '#8a8478'; c.fillRect(x - s * 0.08, gy - h, s * 0.16, h); c.fillStyle = '#a49e92'; c.fillRect(x - s * 0.12, gy - h - s * 0.05, s * 0.24, s * 0.06); c.fillStyle = '#3f7a3a'; c.fillRect(x - s * 0.08, gy - h * 0.4, s * 0.05, h * 0.3); }
    if (bg === 'burg') { c.fillStyle = night ? '#2a2a34' : '#b8b4aa'; c.fillRect(W * 0.3, gy - s * 1.4, W * 0.4, s * 1.4); for (const x of [0.28, 0.66]) { c.fillRect(W * x, gy - s * 1.9, W * 0.08, s * 1.9); c.fillStyle = '#3d4a66'; c.beginPath(); c.moveTo(W * x - 4, gy - s * 1.9); c.lineTo(W * (x + 0.04), gy - s * 2.3); c.lineTo(W * (x + 0.08) + 4, gy - s * 1.9); c.fill(); c.fillStyle = night ? '#2a2a34' : '#b8b4aa'; } }
  }
  c.fillStyle = bg === 'schmiede' ? '#1e120c' : bg === 'riss' ? '#20080e' : bg === 'halle' ? '#4a3220' : bg === 'nacht' ? '#2a1e18' : night ? '#14201a' : '#4a8a40'; c.fillRect(-20, gy, W + 40, H - gy + 20);
  if (bg === 'lager') { // Lagerfeuer in der Mitte
    const fx = W * 0.5, fl = 0.75 + Math.sin(now / 80) * 0.15, gl = c.createRadialGradient(fx, gy, 0, fx, gy, s * 1.6);
    gl.addColorStop(0, `rgba(255,170,60,${fl * 0.6})`); gl.addColorStop(1, 'rgba(255,90,20,0)'); c.fillStyle = gl; c.fillRect(0, 0, W, H);
    c.fillStyle = '#3a2416'; c.fillRect(fx - s * 0.2, gy + 2, s * 0.4, s * 0.06);
    for (let k = 0; k < 3; k++) { const h = s * (0.25 + Math.sin(now / 70 + k) * 0.05); c.fillStyle = ['#ff7a2a', '#ffb040', '#ffe36b'][k]; c.beginPath(); c.moveTo(fx - s * (0.12 - k * 0.03), gy + 2); c.quadraticCurveTo(fx, gy - h * (1 - k * 0.2), fx + s * (0.12 - k * 0.03), gy + 2); c.fill(); }
  }
}

function sceneSound(kind) {
  if (!sound.on) return;
  const t = sound.ctx.currentTime, tone = (f, d, dur, v, ty) => sound.tone(f, t + d, dur, v, ty);
  if (kind === 'kampf') [110, 110, 146.8, 110, 164.8].forEach((f, i) => tone(f, i * 0.16, 0.35, 0.12, 'sawtooth'));
  else if (kind === 'triumph') [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, i * 0.11, 1.2, 0.07, i % 2 ? 'triangle' : 'sine'));
  else if (kind === 'traurig') [440, 392, 349.2, 329.6].forEach((f, i) => tone(f, i * 0.45, 1.6, 0.06, 'sine'));
  else if (kind === 'spannung') for (let i = 0; i < 10; i++) tone(i % 2 ? 233 : 220, i * 0.12, 0.2, 0.05, 'square');
  else if (kind === 'lager') [392, 440, 523.25, 440, 392, 329.6].forEach((f, i) => tone(f, i * 0.35, 1.4, 0.045, 'triangle'));
  else if (kind === 'skill') { for (let i = 0; i < 6; i++) tone(300 + i * 140, i * 0.03, 0.3, 0.05, 'sawtooth'); }
  else if (kind === 'hit') tone(70, 0, 0.25, 0.2, 'square');
  else if (kind === 'sys') { tone(1318.5, 0, 0.15, 0.05, 'sine'); tone(1760, 0.08, 0.2, 0.05, 'sine'); }
}

/* ---- Der Regisseur: wählt Momente aus und sorgt für eine Folge pro Tag -- */
function directorTick() {
  if (!scn.on || !sim) return;
  const st = sim.story, m = sim.minutes % 1440;
  if (m === 6 * 60 + 5 && st.episode !== sim.day) { st.episode = sim.day; playScene(SCENES.episode(sim.day), 2); }
  if (m === 13 * 60 && sim.minutes - scn.lastAt > 300) playScene(SCENES.training()); // ruhiger Tag → Trainingsszene
  if (m === 19 * 60 + 30 && sim.capital.gildenhalle && sim.day % 3 === 0) playScene(SCENES.guild());
  if (m === 21 * 60 + 30) playScene(SCENES.campfire(), 2);
  if (m === 23 * 60 && sim.day % 2 === 0) playScene(SCENES.diary());
}
function directorEvents(s) {
  s.on('chapter', ch => { if (!ch.recap) { highlight(`${ch.title}.`); playScene(chapterScene(ch), 2); } });
  s.on('duel', e => { if (!e.start) { highlight(`${e.a.name} besiegte ${e.b.name} im Duell.`); playScene(SCENES.duel(e), 2); } });
  s.on('legendary', e => { highlight(`${e.n.name} schmiedete ${e.item.name}.`); playScene(SCENES.legend(e), 2); });
  s.on('raid', e => { highlight(`Die Rotschal-Bande überfiel ${e.town.name}.`); playScene(SCENES.raid(e), 2); });
  s.on('boss', () => playScene(SCENES.boss(), 2));
  s.on('levelup', n => {
    if (n !== s.story.hero) return;
    if (n.level === CONFIG.levels.classLevel && n.cls) playScene(SCENES.classUp(n));
    else if (n.level % 5 === 0) { highlight(`${n.name} erreichte Level ${n.level}.`); playScene(SCENES.milestone(n)); }
  });
  s.on('loyal', e => { highlight(`${e.who.name} schwor ${e.smith.name} die Treue.`); playScene(SCENES.loyal(e), 2); });
  s.on('guildLevel', g => playScene(SCENES.guildLevel(g)));
  s.on('srift', e => { highlight({ open: `Ein Riss erwachte zum S-Rang: „${e.name}“.`, break: `„${e.name}“ brach aus dem Riss aus.`, cleared: `„${e.name}“ wurde bezwungen.` }[e.phase]); playScene(SCENES.srift(e), 2); });
  s.on('groupRaid', e => { if (e.phase !== 'start') highlight(e.phase === 'win' ? `Die Gilde besiegte „${e.boss}“.` : `Die Gilde floh vor „${e.boss}“.`); playScene(SCENES.groupRaid(e), 2); });
  s.on('diplo', e => { if (['war', 'siegeWon', 'vassal', 'alliance'].includes(e.kind)) highlight({ war: `${e.realm.name} erklärte den Krieg.`, siegeWon: `Die Belagerung durch ${e.realm.name} wurde gebrochen.`, vassal: `${e.realm.name} unterwarf sich.`, alliance: `Bündnis mit ${e.realm.name}.` }[e.kind]); playScene(SCENES.diplo(e), e.kind === 'offer' ? 1 : 2); });
  s.on('wallDone', () => { highlight('Die Stadtmauer wurde vollendet.'); playScene(SCENES.wall(), 2); });
  s.on('tamed', e => { if (e.n === s.story.hero || sim.minutes - scn.lastAt > 240) { highlight(`${e.n.name} zähmte ${PETS[e.pet.kind].name} „${e.pet.name}“.`); playScene(SCENES.tamed(e)); } });
  s.on('gateDone', e => { if (e.n === s.story.hero) { highlight(`${e.n.name} ${e.ok ? 'bezwang' : 'floh aus'} dem ${e.gate.name}.`); playScene(SCENES.gateReturn(e)); } });
}
