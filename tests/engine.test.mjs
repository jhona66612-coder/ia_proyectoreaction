import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,generateMap,validMap,capacity,applyMove,observe,neighbors,legalMoves,rng,counts} from '../shared/engine.mjs';
function empty(){const s=createGame({rows:4,cols:4});s.cells.forEach(c=>{c.event=0;});return s;}
test('critical capacities are 1, 2 and 3',()=>{assert.equal(capacity(0,4,4),1);assert.equal(capacity(1,4,4),2);assert.equal(capacity(5,4,4),3);});
test('vertical boards preserve event constraints and classic boards contain no hidden events',()=>{
 for(const [cols,rows] of [[4,6],[5,7],[6,8],[6,10],[7,9],[8,10],[8,12],[10,12]]){
  const s=createGame({rows,cols,seed:91});assert.equal(s.cells.length,rows*cols);assert(validMap(s.cells.map(c=>c.event),rows,cols));
  const classic=createGame({rows,cols,rules:'classic'});assert(classic.cells.every(c=>c.event===0&&c.revealed));assert.equal(classic.generator.traps,0);
 }
 for(const dims of [{rows:13},{cols:11},{rows:4.5},{rows:NaN},{cols:0}])assert.throws(()=>createGame(dims),/Dimensiones/);
 assert.throws(()=>createGame({rules:'unknown'}),/Reglas/);
});
test('public animation receipts reconstruct the exact cascade, capture and event order',()=>{
 const s=empty();s.played=[false,true,true];
 s.cells[0]={owner:1,charge:1,event:0,revealed:true};s.cells[1]={owner:2,charge:2,event:0,revealed:true};s.cells[15]={owner:2,charge:1,event:0,revealed:true};s.cells[4].event=2;s.cells[5].event=1;
 const result=applyMove(s,0,{animate:true,trace:true}),replayed=observe(s).cells;
 const receipt=r=>{assert.deepEqual(replayed[r.index],r.before);assert.equal(r.charged.charge,r.before.charge+1);assert.equal(r.charged.owner,1);replayed[r.index]=r.after;};
 for(const frame of result.timeline){if(frame.kind==='place')receipt(frame.receipt);else{assert.deepEqual(replayed[frame.index],frame.before);assert.equal(frame.before.charge-frame.after.charge,neighbors(frame.index,4,4).length);replayed[frame.index]=frame.after;for(const r of frame.targets)receipt(r);}}
 assert.deepEqual(replayed,observe(result.state).cells);assert.deepEqual(result.state,applyMove(s,0).state);
 assert(result.timeline.some(f=>f.targets?.some(r=>r.captured===2&&r.charged.charge===3)));
 assert(result.timeline.some(f=>f.targets?.some(r=>r.reveal===1&&r.after.charge===0)));
 assert(result.timeline.some(f=>f.targets?.some(r=>r.reveal===2&&r.after.charge===r.charged.charge+1)));
 assert.equal(result.animationTruncated,false);
});
test('animation does not disclose unused secret events and classic captures conserve charge',()=>{
 let s=createGame({rows:6,cols:5,seed:13}),r=applyMove(s,7,{animate:true});
 assert.equal(r.timeline[0].receipt.before.event,null);assert.equal(r.timeline[0].receipt.charged.event,null);
 assert(!JSON.stringify(r.timeline).includes('seed'));
 s=createGame({rows:8,cols:6,rules:'classic'});s.played=[false,true,true];s.cells[0].owner=1;s.cells[0].charge=1;s.cells[1].owner=2;s.cells[1].charge=2;s.cells[47].owner=2;s.cells[47].charge=1;
 const before=counts(s).orbs.reduce((a,b)=>a+b,0);r=applyMove(s,0,{animate:true});assert.equal(counts(r.state).orbs.reduce((a,b)=>a+b,0),before+1);
});
test('CSP and local search preserve every hard constraint across 120 maps',()=>{for(const size of [4,6,8])for(let seed=1;seed<=40;seed++){const {events,report}=generateMap(size,size,seed);assert(validMap(events,size,size));assert.equal(events.filter(e=>e===1).length,report.traps);assert.equal(events.filter(e=>e===2).length,report.bonuses);assert(report.after<=report.before);assert.deepEqual(generateMap(size,size,seed).events,events);}});
test('corner detonates on second charge and captures both orthogonal neighbors',()=>{const s=empty();s.cells[0]={owner:1,charge:1,event:0,revealed:true};s.cells[1]={owner:2,charge:1,event:0,revealed:true};s.cells[15]={owner:2,charge:1,event:0,revealed:true};s.played=[false,true,true];const r=applyMove(s,0);assert.equal(r.explosions,1);assert.equal(r.state.cells[0].charge,0);assert.equal(r.state.cells[0].owner,0);assert.equal(r.state.cells[1].owner,1);assert.equal(r.state.cells[1].charge,2);assert.equal(r.state.cells[4].owner,1);assert.equal(r.state.cells[15].owner,2);assert.equal(s.cells[0].charge,1,'input remains immutable');});
test('trap clears all charges once; later placement is normal',()=>{const s=empty();s.cells[5].event=1;const a=applyMove(s,5).state;assert.equal(a.cells[5].charge,0);assert.equal(a.cells[5].revealed,true);a.turn=1;const b=applyMove(a,5).state;assert.equal(b.cells[5].charge,1);});
test('bonus triggers immediately and only once, including cascade discoveries',()=>{const s=empty();s.cells[0].event=2;const a=applyMove(s,0,{trace:true});assert.equal(a.explosions,1);assert.equal(a.state.cells[1].charge,1);assert.equal(a.state.cells[4].charge,1);assert(a.events.some(e=>e.kind==='reveal'&&e.index===0&&e.event===2));});
test('cannot move on opponent, out of bounds or after completion',()=>{const s=empty();s.cells[3].owner=2;s.cells[3].charge=1;assert.throws(()=>applyMove(s,3),/rival/);for(const value of [-1,16,1.5,'0'])assert.throws(()=>applyMove(s,value));s.winner=1;assert.throws(()=>applyMove(s,0),/terminó/);});
test('no victory before both have played, including a first-turn trap',()=>{const s=empty();s.cells[0].event=1;const a=applyMove(s,0).state;assert.equal(a.winner,null);const b=applyMove(a,15).state;assert.equal(b.winner,2);});
test('both players trapped on first moves produces a draw',()=>{const s=empty();s.cells[0].event=1;s.cells[15].event=1;const a=applyMove(s,0).state;assert.equal(applyMove(a,15).state.winner,0);});
test('cascades stop on elimination without cycling',()=>{const s=empty();s.played=[false,true,true];s.cells[0]={owner:1,charge:1,event:0,revealed:true};s.cells[1]={owner:2,charge:1,event:0,revealed:true};const a=applyMove(s,0);assert.equal(a.state.winner,1);assert.equal(a.explosions,1);});
test('perception never exposes seed or unrevealed event values',()=>{const s=createGame();const p=observe(s);assert.equal(p.seed,undefined);assert(p.cells.every(c=>c.event===null));assert(observe(s,{reveal:true}).cells.every(c=>c.event!==null));});
test('random legal games preserve nonterminal ownership and stability invariants',()=>{for(let seed=1;seed<=20;seed++){let s=createGame({rows:4,cols:4,seed}),random=rng(seed);for(let step=0;step<120&&s.winner===null;step++){const moves=legalMoves(s);s=applyMove(s,moves[Math.floor(random()*moves.length)]).state;if(s.winner===null)for(let i=0;i<s.cells.length;i++){const c=s.cells[i];assert.equal(c.owner===0,c.charge===0);assert(c.charge<=capacity(i,4,4));assert(c.charge>=0);}}}});
