#!/usr/bin/env python3
"""Baut index.html aus den Teilen in src/.

Aufruf: python3 build.py          -> schreibt index.html
        python3 build.py --check  -> baut und prüft zusätzlich die JavaScript-Syntax (braucht node)
"""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PARTS = ['head.html', 'core.js', 'logic.js', 'render.js', 'pixel.js', 'sound.js', 'ui.js']

out = ''.join((ROOT / 'src' / p).read_text(encoding='utf-8') for p in PARTS) + '</script>\n</body>\n</html>\n'
(ROOT / 'index.html').write_text(out, encoding='utf-8')
print(f'index.html gebaut ({len(out.splitlines())} Zeilen)')

if '--check' in sys.argv:
    js = out[out.index('<script>') + 8: out.rindex('</script>')]
    r = subprocess.run(['node', '-e', 'new Function(require("fs").readFileSync(0, "utf8"))'], input=js, text=True, capture_output=True)
    if r.returncode:
        print('SYNTAXFEHLER:\n' + r.stderr)
        sys.exit(1)
    print('Syntax ok')
