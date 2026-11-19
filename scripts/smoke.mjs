// HTTP smoke test: no cookies or API keys are printed. Use against local or deployed service.
import assert from 'node:assert/strict';
const base=process.argv[2]??'http://localhost:3000';let cookie='';
async function request(endpoint,data){const r=await fetch(base+endpoint,{...(data?{method:'POST',body:JSON.stringify(data)}:{}),headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),Origin:base}});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const payload=await r.json();assert(r.ok,JSON.stringify(payload));return payload;}
const health=await request('/health');assert(health.ok);
let session=await request('/api/new',{size:4,mode:'ai-ai',difficulty:'tactical'});assert.equal(session.game.moves,0);assert(session.game.cells.every(c=>c.event===null));
let turns=0;while(session.game.winner===null&&turns<8){session=await request('/api/ai',{revision:session.revision});turns++;assert(session.analysis);assert(session.analysis.metrics.timeMs<=1500);}
const restored=await request('/api/session');assert.equal(restored.game.moves,session.game.moves);
const anonymous=await (await fetch(base+'/api/session')).json();assert.equal(anonymous.game,null);
for(const url of ['/','/app.js','/styles.css','/docs/guia-uso.pdf','/docs/guia-agentes.pdf'])assert.equal((await fetch(base+url)).status,200,url);
await request('/api/lab',{kind:'benchmark'});let job;
for(let i=0;i<120;i++){job=await request('/api/lab');if(job.status!=='running')break;await new Promise(resolve=>setTimeout(resolve,500));}
assert.equal(job.status,'done',job.error);assert.equal(job.result.games,12);
console.log(JSON.stringify({ok:true,base,storage:health.storage,turns,movesRestored:restored.game.moves,lastAI:session.analysis.metrics,labGames:job.result.games,documents:'both HTTP 200',sessionIsolation:true},null,2));
