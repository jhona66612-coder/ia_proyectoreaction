import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
test('HTTP game lifecycle, hidden map, isolation, persistence and input validation',async()=>{
 const child=spawn(process.execPath,['server/server.mjs'],{env:{...process.env,PORT:'3187',SUPABASE_URL:'',SUPABASE_PUBLISHABLE_KEY:''},stdio:'ignore'});
 try{
  let ready=false;for(let i=0;i<50;i++){try{const r=await fetch('http://localhost:3187/health');if(r.ok){ready=true;break;}}catch{}await delay(100);}assert(ready);
  const base='http://localhost:3187';let response=await fetch(base+'/api/new',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({size:4,mode:'human-human'})});assert.equal(response.status,200);const cookie=response.headers.get('set-cookie').split(';')[0],g=await response.json();assert(g.game.cells.every(c=>c.event===null));assert(!('seed'in g.game));
  const send=(endpoint,data,extra={})=>fetch(base+'/api/'+endpoint,{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie,...extra},body:JSON.stringify(data)});
  response=await send('move',{index:0,revision:g.revision});assert.equal(response.status,200);const moved=await response.json();assert.equal(moved.game.moves,1);
  assert.equal((await send('move',{index:1,revision:g.revision})).status,409);
  assert.equal((await send('ai',{revision:moved.revision})).status,400);
  assert.equal((await send('move',{index:-1,revision:moved.revision})).status,400);
  assert.equal((await send('new',{}, {Origin:'https://attacker.example'})).status,403);
  const restored=await (await fetch(base+'/api/session',{headers:{Cookie:cookie}})).json();assert.equal(restored.game.moves,1);
  assert.equal((await (await fetch(base+'/api/session')).json()).game,null);
  assert.equal((await fetch(base+'/server/server.mjs')).status,404);
  assert.equal((await fetch(base+'/')).status,200);assert.equal((await fetch(base+'/app.js')).status,200);
  assert.equal((await fetch(base+'/play')).status,200);assert.equal((await fetch(base+'/animation.js')).status,200);
  assert.equal(moved.timeline[0].kind,'place');assert.equal(moved.timeline[0].receipt.before.event,null);
  const rect=await (await send('new',{rows:8,cols:6,rules:'classic',mode:'human-human'})).json();assert.equal(rect.game.cells.length,48);assert.equal(rect.game.rules,'classic');assert(rect.game.cells.every(c=>c.event===0));
  assert.equal((await send('new',{rows:13,cols:6})).status,400);
 }finally{child.kill();}
});
