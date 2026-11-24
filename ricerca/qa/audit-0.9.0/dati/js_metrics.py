# runs the APP's own metrics.js via node, to know what the app would display (not used as independent value)
import json, subprocess, tempfile
def app_dd_pct(close):
    f = tempfile.NamedTemporaryFile('w', suffix='.json', delete=False); json.dump(close, f); f.close()
    js = f"import {{drawdown, depthPercentile}} from '/home/user/rrg/js/metrics.js'; import fs from 'node:fs'; const c=JSON.parse(fs.readFileSync('{f.name}')); const dd=drawdown(c); const dp=depthPercentile(dd); console.log(JSON.stringify([dd.at(-1), dp.at(-1)]));"
    out = subprocess.run(['node', '--input-type=module', '-e', js], capture_output=True, text=True)
    return json.loads(out.stdout)
