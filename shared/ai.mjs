import {rng,shuffle,neighbors,capacity,legalMoves,clone,applyMove,distance,counts,TRAP,BONUS} from './engine.mjs';
import {infer} from './belief.mjs';
export const DEFAULT_WEIGHTS=[7,4,3,2,6];
export const LEVELS={explorer:{depth:2,budget:180,samples:2},tactical:{depth:3,budget:650,samples:3},expert:{depth:5,budget:1100,samples:3}};
// A* on a relaxed spatial graph; admissible Manhattan lower bound (all edges cost >=1).
export function astar(s,start,goal,belief) {
  const open=[start],g=new Map([[start,0]]),from=new Map(),closed=new Set();let expanded=0;
  while(open.length) {
    open.sort((a,b)=>(g.get(a)+distance(a,goal,s.cols))-(g.get(b)+distance(b,goal,s.cols)));
    const u=open.shift();if(closed.has(u))continue;expanded++;
    if(u===goal) {const path=[u];while(from.has(path[0]))path.unshift(from.get(path[0]));return {path,cost:g.get(u),expanded};}
    closed.add(u);
    for(const v of neighbors(u,s.rows,s.cols)) {
      const missing=Math.max(1,capacity(v,s.rows,s.cols)+1-s.cells[v].charge);
      const candidate=g.get(u)+missing+(belief?.cells[v].known?0:(belief?.cells[v].trap??0)*2);
      if(candidate<(g.get(v)??Infinity)) {g.set(v,candidate);from.set(v,u);open.push(v);}
    }
  }
  return {path:[],cost:Infinity,expanded};
}
export function features(s,player,belief) {
  let mass=0,critical=0,position=0,benefit=0,risk=0;
  s.cells.forEach((c,i)=>{if(!c.owner)return;const sign=c.owner===player?1:-1, cap=capacity(i,s.rows,s.cols);mass+=sign*c.charge;critical+=sign*(c.charge>=cap?1:0);position+=sign*(3-cap);if(!c.revealed){benefit+=sign*(belief?.cells[i].bonus??0);risk+=sign*(belief?.cells[i].trap??0);}});
  return [mass,critical,position,benefit,-risk];
}
export function evaluate(s,player,weights=DEFAULT_WEIGHTS,belief) {
  if(s.winner!==null)return s.winner===0?0:s.winner===player?1000:-1000;
  return Math.max(-900,Math.min(900,features(s,player,belief).reduce((sum,f,i)=>sum+f*weights[i],0)));
}
function publicSeed(s) {return s.cells.reduce((a,c,i)=>(Math.imul(a,31)+c.charge*7+c.owner*13+i)>>>0, s.moves+71);}
// Sample worlds only from public perceptions. Never receives the actual hidden events.
export function determinize(publicState,belief,random) {
  const s=clone(publicState),unknown=[];
  s.cells.forEach((c,i)=>{if(!c.revealed){c.event=0;unknown.push(i);}});
  let k=belief.trapsLeft,v=belief.bonusLeft;
  const candidates=shuffle(unknown,random).filter(i=>belief.cells[i].trap>0);
  for(const i of candidates)if(k && neighbors(i,s.rows,s.cols).every(j=>s.cells[j].event!==TRAP)){s.cells[i].event=TRAP;k--;}
  for(const i of shuffle(unknown.filter(i=>s.cells[i].event===0),random))if(v){s.cells[i].event=BONUS;v--;}
  return s;
}
export function chooseMove(perception,{weights=DEFAULT_WEIGHTS,depth,budget,samples,style=[.5,.5],usePruning=true,seed}={}) {
  if(perception.winner!==null)throw new Error('Partida terminada');
  // Strip hidden fields again at the module boundary to enforce an information firewall.
  const s={...perception,cells:perception.cells.map(c=>({...c,event:c.revealed?c.event:null}))};
  const level=LEVELS[s.difficulty]??LEVELS.tactical;
  depth??=level.depth;budget??=level.budget;samples??=level.samples;
  const start=performance.now(),deadline=start+Math.min(1200,budget), player=s.turn, belief=infer(s,style),random=rng(seed??publicSeed(s));
  let nodes=0,prunes=0,prunedBranches=0,completedDepth=0,timeLimited=false;
  const legal=legalMoves(s),enemy=s.cells.flatMap((c,i)=>c.owner===3-player?[i]:[]);
  const critical=legal.filter(i=>s.cells[i].owner===player&&s.cells[i].charge===capacity(i,s.rows,s.cols));
  let route={path:[],cost:null,expanded:0};
  if(critical.length&&enemy.length) {
    const origin=critical[0],target=enemy.reduce((a,b)=>distance(origin,a,s.cols)<=distance(origin,b,s.cols)?a:b);
    route=astar(s,origin,target,belief);
  }
  const routeStart=route.path[0];
  const moveScore=(state,i)=>{const c=state.cells[i];return (c.charge===capacity(i,state.rows,state.cols)?8:0)+(3-capacity(i,state.rows,state.cols))*2+(i===routeStart?2:0);};
  const ordered=state=>legalMoves(state).sort((a,b)=>moveScore(state,b)-moveScore(state,a));
  function check(){if(performance.now()>=deadline)throw new Error('SEARCH_TIMEOUT');}
  function search(state,remaining,alpha,beta) {
    check();nodes++;
    if(!remaining||state.winner!==null)return evaluate(state,player,weights,belief);
    const max=state.turn===player,moves=ordered(state);let best=max?-Infinity:Infinity;
    for(let j=0;j<moves.length;j++) {
      const child=applyMove(state,moves[j],{deadline}).state;
      const val=search(child,remaining-1,alpha,beta);
      best=max?Math.max(best,val):Math.min(best,val);
      if(max)alpha=Math.max(alpha,best);else beta=Math.min(beta,best);
      if(usePruning&&beta<=alpha){prunes++;prunedBranches+=moves.length-j-1;break;}
    }
    return Number.isFinite(best)?best:0;
  }
  const worlds=Array.from({length:samples},()=>determinize(s,belief,random));
  let ranked=ordered(s).map(i=>({index:i,value:moveScore(s,i)}));
  for(let d=1;d<=depth;d++) {
    const next=[];
    try {
      for(const {index} of ranked) {
        check();let score=0;
        for(const world of worlds)score+=search(applyMove(world,index,{deadline}).state,d-1,-Infinity,Infinity);
        // Expected local event utility complements sampled tactical continuations.
        const p=belief.cells[index];const eventUtility=p.known?0:weights[3]*p.bonus-weights[4]*p.trap*(1+style[0]*.2);
        next.push({index,value:score/samples+eventUtility});
      }
      ranked=next.sort((a,b)=>b.value-a.value||a.index-b.index);completedDepth=d;
    }catch(e){if(e.message!=='SEARCH_TIMEOUT')throw e;timeLimited=true;break;}
  }
  const move=ranked[0].index, elapsed=performance.now()-start;
  return {index:move,belief,metrics:{nodes,prunes,prunedBranches,depth:completedDepth,requestedDepth:depth,timeMs:+elapsed.toFixed(2),samples,timeLimited,score:+ranked[0].value.toFixed(3)},route,alternatives:ranked.slice(0,5),weights,explanation:`Seleccioné ${String.fromCharCode(65+move%s.cols)}${Math.floor(move/s.cols)+1}: utilidad estimada ${ranked[0].value.toFixed(1)}, riesgo ${(belief.cells[move].trap*100).toFixed(0)}%. Evalué ${nodes} nodos a profundidad ${completedDepth}; ${prunes} cortes alfa-beta. ${route.path.length?'A* orientó el orden de exploración hacia una celda rival.':'Sin ruta explosiva inmediata.'}`};
}
