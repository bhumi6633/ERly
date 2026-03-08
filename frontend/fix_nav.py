"""One-shot patch: ambulance + user-loc pitchAlignment, hide MapControls/Toolbar during nav."""
import re

path = 'app/map/page.tsx'
content = open(path, encoding='utf-8').read()

# ── 1. Fix pitchAlignment: 'map' / "map"  →  'viewport' / "viewport" ──
before = content.count("pitchAlignment")
content = content.replace("pitchAlignment: 'map'",  "pitchAlignment: 'viewport'")
content = content.replace("pitchAlignment: \"map\"", "pitchAlignment: \"viewport\"")
content = content.replace("rotationAlignment: 'map'",  "rotationAlignment: 'viewport'")
content = content.replace("rotationAlignment: \"map\"", "rotationAlignment: \"viewport\"")
after  = content.count("pitchAlignment: 'viewport'") + content.count('pitchAlignment: "viewport"')
print(f"Step 1 (pitchAlignment fix): {after} viewport markers, "
      f"{content.count('pitchAlignment: \\'map\\'')+content.count('pitchAlignment: \"map\"')} map markers remaining")

# ── 2. Hide MapControls during navigation (add navPhase === 'idle' guard) ──
old_mapctrl = "{mapReady && <MapControls map={mapRef.current} />}"
new_mapctrl = "{mapReady && navPhase === 'idle' && <MapControls map={mapRef.current} />}"
if old_mapctrl in content:
    content = content.replace(old_mapctrl, new_mapctrl, 1)
    print("Step 2 (MapControls hidden during nav): OK")
else:
    print("Step 2: ANCHOR NOT FOUND -", repr(content[content.find('MapControls'):content.find('MapControls')+80]))

# ── 3. Hide Toolbar during navigation (add && !isNavigating guard) ──
old_toolbar = "{showToolbar && flowStep === \"map\" && !!triageResult && ("
new_toolbar = "{showToolbar && flowStep === \"map\" && !!triageResult && !isNavigating && ("
if old_toolbar in content:
    content = content.replace(old_toolbar, new_toolbar, 1)
    print("Step 3 (Toolbar hidden during nav): OK")
else:
    # Try single-quote variant
    old_toolbar2 = "{showToolbar && flowStep === 'map' && !!triageResult && ("
    new_toolbar2 = "{showToolbar && flowStep === 'map' && !!triageResult && !isNavigating && ("
    if old_toolbar2 in content:
        content = content.replace(old_toolbar2, new_toolbar2, 1)
        print("Step 3 (Toolbar hidden during nav, single-quote variant): OK")
    else:
        idx = content.find('showToolbar && flowStep')
        print("Step 3: ANCHOR NOT FOUND -", repr(content[idx:idx+100]))

open(path, 'w', encoding='utf-8').write(content)
print("Done - file written")
