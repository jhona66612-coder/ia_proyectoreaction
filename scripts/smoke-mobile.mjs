import assert from 'node:assert/strict';
const base=(process.argv[2]??'http://localhost:3000').replace(/\/$/,'');
let cookie='';
async function api(path,data){const r=await fetch(base+'/api/'+path,{method:data?'POST':'GET',headers:{...(data?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},...(data?{body:JSON.stringify(data)}:{})});if(r.headers.has('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const body=await r.json();assert.equal(r.status,200,body.error);return body;}
for(const path of ['/play','/animation.js','/mobile.css','/docs/guia-uso.pdf','/docs/guia-agentes.pdf'])assert.equal((await fetch(base+path)).status,200,path);
const health=await(await fetch(base+'/health')).json();assert.equal(health.version,'2.0.0');
let result=await api('new',{rows:8,cols:6,rules:'classic',mode:'human-human'});assert.equal(result.game.cells.length,48);
for(const index of [0,1,7,47,0])result=await api('move',{index,revision:result.revision});
assert.equal(result.game.cells[1].owner,1);assert.equal(result.game.cells[1].charge,2);
assert(result.timeline.some(f=>f.targets?.some(r=>r.captured===1&&r.after.charge===2)));
const restored=await api('session');assert.equal(restored.game.moves,5);assert.equal(restored.revision,result.revision);
cookie='';assert.equal((await api('session')).game,null);
result=await api('new',{rows:7,cols:5,rules:'classic',mode:'human-ai',difficulty:'tactical'});
result=await api('move',{index:6,revision:result.revision});result=await api('ai',{revision:result.revision});
assert.equal(result.game.moves,2);assert(result.analysis.metrics);assert(result.timeline.length>0);
console.log(JSON.stringify({health:health.ok,version:health.version,storage:result.persistence,rectangularBoard:true,captureAnimation:true,restored:true,isolated:true,aiNodes:result.analysis.metrics.nodes,aiTimeMs:result.analysis.metrics.timeMs}));
