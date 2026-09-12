"""Brand an existing Godot web export without modifying its engine boot logic.
Usage: python3 scripts/brand_ironflame_export.py /absolute/export/index.html
Run after Godot export and before browser tests/hash verification.
"""
from pathlib import Path
import sys
path=Path(sys.argv[1]).resolve()
s=path.read_text()
marker='<!-- Ember Dash branded loading shell v1 -->'
if marker not in s:
    assert s.count('<div id="status">')==1
    assert 'const GODOT_THREADS_ENABLED = false;' in s
    style='''
<!-- Ember Dash branded loading shell v1 -->
<meta name="theme-color" content="#10232b">
<meta name="description" content="Ember Dash: Ironflame. A fox platformer with randomized chambers, spirit experience, evolving powers and one precious life.">
<style>
body{background:#10232b}
#status{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;background:radial-gradient(ellipse at 50% 35%,#244a50,#08151f 70%);z-index:4;font-family:system-ui,sans-serif;color:#eae8d9;padding:20px;box-sizing:border-box}
#status-splash{display:none!important}
#ember-loading-mark{font-family:Georgia,serif;letter-spacing:5px;font-size:clamp(24px,5vw,42px);text-align:center}
#ember-loading-mark small{display:block;font:10px system-ui,sans-serif;letter-spacing:4px;color:#e8c790;margin-top:13px}
#ember-loading-copy{font-size:13px;line-height:1.8;text-align:center;color:#b0c5c2;max-width:350px;margin:0}
#status-progress{position:static;width:min(350px,80vw);height:6px;accent-color:#e8c790;margin:15px 0;border:none;border-radius:4px;overflow:hidden}
#status-notice{position:static;margin:8px;max-width:650px;font:13px/1.6 system-ui;background:#132d37;border:1px solid #9e885955;color:#edc5a7}
</style>
'''
    s=s.replace('</head>',style+'</head>')
    s=s.replace('<div id="status">','<div id="status"><div id="ember-loading-mark">EMBER DASH<small>IRONFLAME · GODOT PLAYTEST</small></div><p id="ember-loading-copy">Your next life is taking shape.<br>One life. Six bloodlines. Every spirit counts.</p>')
    path.write_text(s)
print('BRANDED_GODOT_EXPORT',path.name,path.stat().st_size)
