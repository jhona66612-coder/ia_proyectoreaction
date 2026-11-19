import {createGame,applyMove,observe,legalMoves,rng} from './engine.mjs';
import {chooseMove,DEFAULT_WEIGHTS} from './ai.mjs';
import {infer,brier} from './belief.mjs';
export function playMatch({seed=1,weights=DEFAULT_WEIGHTS,opponent='random',side=1,maxMoves=100,depth=1,budget=12}={}) {
  let s=createGame({rows:4,cols:4,seed}),random=rng(seed+991),nodes=0,prunes=0,ms=0,maxMs=0,decisions=0,errors=[],explosions=0;
  while(s.winner===null && s.moves<maxMoves) {
    const p=observe(s),belief=infer(p);let index;
    if(s.turn!==side&&opponent==='random'){const legal=legalMoves(s);index=legal[Math.floor(random()*legal.length)];}
    else {const d=chooseMove(p,{weights:s.turn===side?weights:DEFAULT_WEIGHTS,depth,budget,samples:1,seed:seed+s.moves});index=d.index;nodes+=d.metrics.nodes;prunes+=d.metrics.prunes;ms+=d.metrics.timeMs;maxMs=Math.max(maxMs,d.metrics.timeMs);decisions++;}
    const result=applyMove(s,index,{trace:true});
    for(const event of result.events)if(event.kind==='reveal')errors.push(brier(belief.cells[event.index],event.event));
    s=result.state;explosions+=result.explosions;
  }
  return {seed,side,winner:s.winner??0,truncated:s.winner===null,moves:s.moves,nodes,prunes,timeMs:ms,meanMs:decisions?ms/decisions:0,maxMs,decisions,brier:errors.length?errors.reduce((a,b)=>a+b,0)/errors.length:null,reveals:errors.length,explosions};
}
export function benchmark({games=12,seed=2026,opponent='random',onProgress=()=>{}}={}) {
  const matches=[];
  for(let i=0;i<games;i++){matches.push(playMatch({seed:seed+Math.floor(i/2),side:i%2+1,opponent}));onProgress({current:i+1,total:games});}
  const wins=matches.filter(m=>m.winner===m.side).length,draws=matches.filter(m=>m.winner===0).length;
  const measured=matches.reduce((s,m)=>s+m.decisions,0),reveals=matches.reduce((s,m)=>s+m.reveals,0);
  return {kind:'benchmark',seed,games,opponent,board:'4 × 4',depth:1,budgetMs:12,wins,losses:games-wins-draws,draws,winRate:wins/games,meanMs:matches.reduce((s,m)=>s+m.timeMs,0)/(measured||1),maxMs:Math.max(...matches.map(m=>m.maxMs)),nodes:matches.reduce((s,m)=>s+m.nodes,0),prunes:matches.reduce((s,m)=>s+m.prunes,0),brier:matches.reduce((s,m)=>s+(m.brier??0)*m.reveals,0)/(reveals||1),matches,note:'Muestra exploratoria, no prueba de superioridad. Semillas emparejadas y lados alternados. Empates por límite incluidos.'};
}
export function evolve({seed=7331,generations=4,population=6,onProgress=()=>{}}={}) {
  const random=rng(seed),make=()=>DEFAULT_WEIGHTS.map(w=>Math.max(.25,w*(.4+random()*1.2)));
  let pop=[DEFAULT_WEIGHTS,...Array.from({length:population-1},make)],history=[],best=DEFAULT_WEIGHTS,bestFitness=-1;
  function fitness(w,g) {
    let points=0;
    // Everyone in a generation faces the same paired maps and baseline, on both sides.
    for(let pair=0;pair<2;pair++)for(let side=1;side<=2;side++) {
      const m=playMatch({seed:seed+g*100+pair,weights:w,side,opponent:'baseline',maxMoves:70,budget:5});
      points+=m.winner===side?1:m.winner===0?.5:0;
    }
    return points/4;
  }
  for(let g=0;g<generations;g++) {
    const scored=pop.map((w,i)=>{const f=fitness(w,g);onProgress({current:g*population+i+1,total:generations*population,generation:g+1});return {weights:w,fitness:f};}).sort((a,b)=>b.fitness-a.fitness);
    best=scored[0].weights;bestFitness=scored[0].fitness;
    history.push({generation:g+1,best:bestFitness,mean:scored.reduce((a,b)=>a+b.fitness,0)/population,weights:best});
    const tournament=()=>{const a=scored[Math.floor(random()*population)],b=scored[Math.floor(random()*population)];return a.fitness>=b.fitness?a:b;};
    pop=[best];
    while(pop.length<population){const a=tournament().weights,b=tournament().weights;pop.push(a.map((w,i)=>{let value=random()<.5?w:b[i];if(random()<.25)value+=(random()-.5)*3;return +Math.max(.25,Math.min(15,value)).toFixed(3);}));}
  }
  const holdout=[0,1,2,3].map(i=>playMatch({seed:seed+10000+Math.floor(i/2),weights:best,side:i%2+1,opponent:'baseline',budget:8,maxMoves:100}));
  return {kind:'genetic',seed,generations,population,weights:best,fitness:bestFitness,history,holdout,trainingMatches:generations*population*4,operators:{selection:'Torneo de 2',crossover:'Uniforme',mutation:.25,elitism:1},note:'Aptitud de 4 partidas por candidato frente al agente base. Validación separada de 4 partidas; no garantiza una mejora general.'};
}
