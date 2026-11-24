const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const out=process.argv[2];
for(const [n,w,h,t] of [['1440-scuro',1440,700,'dark'],['1440-chiaro',1440,700,'light'],['390-scuro',390,1100,'dark']]){
const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:2});await p.goto('http://127.0.0.1:8793/ricerca/bolle-rotazione/prototipo/proto.html');
await p.evaluate(t=>document.documentElement.setAttribute('data-theme',t),t);await p.waitForTimeout(300);
await p.screenshot({path:`${out}/proto-${n}.png`,fullPage:true});await p.close();}
await b.close();})();
