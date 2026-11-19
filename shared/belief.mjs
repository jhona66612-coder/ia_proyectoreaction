import {neighbors,TRAP,BONUS} from './engine.mjs';
export const BAYES_NETWORK={
  nodes:['remainingEvents','adjacentRevealedTrap','cellEvent','revelation'],
  edges:[['remainingEvents','cellEvent'],['adjacentRevealedTrap','cellEvent'],['cellEvent','revelation']],
  cellStates:['normal','trap','bonus'],
  transition:[[1,0,0],[0,1,0],[0,0,1]],
  observation:[[1,0,0],[0,1,0],[0,0,1]]
};
// Bayes update using identity transition and a noiseless categorical observation.
export function filterCell(prior,event=null) {
  if(event===null)return [...prior];
  const likelihood=BAYES_NETWORK.observation[event],posterior=prior.map((p,i)=>p*likelihood[i]);
  const z=posterior.reduce((a,b)=>a+b,0);
  // A revelation is authoritative, even when an approximate prior assigned zero mass.
  return z?posterior.map(p=>p/z):likelihood;
}
// Static cell identity: transition matrix is I3. Discoveries are noiseless observations.
// A separate two-state HMM estimates opponent style, never the actual hidden map.
export function updateStyle(previous=[.5,.5],observation=null) {
  const predicted=[previous[0]*.85+previous[1]*.20,previous[0]*.15+previous[1]*.80];
  const likelihood=observation===null?[1,1]:observation==='cautious'?[.75,.30]:[.25,.70];
  const unnormalized=predicted.map((p,i)=>p*likelihood[i]), z=unnormalized[0]+unnormalized[1];
  return unnormalized.map(p=>p/z);
}
export function infer(s,style=[.5,.5]) {
  const unknown=s.cells.flatMap((c,i)=>!c.revealed?[i]:[]);
  const trapsLeft=Math.max(0,s.generator.traps-s.cells.filter(c=>c.revealed&&c.event===TRAP).length);
  const bonusLeft=Math.max(0,s.generator.bonuses-s.cells.filter(c=>c.revealed&&c.event===BONUS).length);
  const candidates=unknown.filter(i=>neighbors(i,s.rows,s.cols).every(j=>!s.cells[j].revealed||s.cells[j].event!==TRAP));
  const pTrap=candidates.length?Math.min(1,trapsLeft/candidates.length):0;
  const allowed=new Set(candidates);
  const cells=s.cells.map((c,i)=>{
    if(c.revealed){const p=filterCell([1/3,1/3,1/3],c.event);return {normal:p[0],trap:p[1],bonus:p[2],known:true};}
    const trap=allowed.has(i)?pTrap:0, bonus=Math.min(1-trap,unknown.length?bonusLeft/unknown.length:0);
    return {normal:1-trap-bonus,trap,bonus,known:false};
  });
  return {cells,style,trapsLeft,bonusLeft,unknown:unknown.length,model:'Conteos restantes + exclusión por vecindad; filtrado temporal de identidad estática',approximate:true};
}
export function brier(prediction,event) { return ['normal','trap','bonus'].reduce((sum,k,i)=>sum+(prediction[k]-(event===i?1:0))**2,0)/3; }
