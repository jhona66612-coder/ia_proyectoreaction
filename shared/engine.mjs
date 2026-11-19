// Pure, authoritative rules. Nothing in this module depends on the UI or a model API.
export const NORMAL = 0, TRAP = 1, BONUS = 2;
export function rng(seed = 1) {
  let x = Number(seed) >>> 0;
  return () => { x += 0x6D2B79F5; let t = x; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function shuffle(a, random) { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export function neighbors(i, rows, cols) { const a = [], r = Math.floor(i / cols), c = i % cols; if (r) a.push(i-cols); if (r<rows-1) a.push(i+cols); if(c) a.push(i-1); if(c<cols-1) a.push(i+1); return a; }
export function distance(a,b,cols) { return Math.abs(Math.floor(a/cols)-Math.floor(b/cols))+Math.abs(a%cols-b%cols); }
export function capacity(i, rows, cols) { return neighbors(i,rows,cols).length - 1; }
export function legalMoves(s, player=s.turn) { return s.cells.flatMap((c,i)=> c.owner === 0 || c.owner === player ? [i] : []); }
export function clone(s) { return {...s, cells:s.cells.map(c=>({...c})), played:[...s.played]}; }
export function counts(s) { const cells=[0,0,0], orbs=[0,0,0]; for(const c of s.cells) if(c.owner) { cells[c.owner]++; orbs[c.owner]+=c.charge; } return {cells,orbs}; }
export function fairness(events,rows,cols) {
  let score=0;
  for(const t of [TRAP,BONUS]) for(const axis of [0,1]) {
    let d=0;
    events.forEach((v,i)=>{if(v===t){const x=axis ? i%cols : Math.floor(i/cols), n=axis?cols:rows; d+= x < n/2 ? 1 : -1;}});
    score+=d*d;
  }
  return score;
}
export function validMap(events,rows,cols) {
  return events.filter(Boolean).length<=Math.floor(rows*cols*.25) && events.every((v,i)=>v!==TRAP || neighbors(i,rows,cols).every(j=>events[j]!==TRAP));
}
export function ac3(variables,cols) {
  const queue=[];let revisions=0;
  variables.forEach((_,i)=>variables.forEach((__,j)=>{if(i!==j)queue.push([i,j]);}));
  while(queue.length) {
    const [i,j]=queue.shift(),a=variables[i],b=variables[j],length=a.domain.length;
    a.domain=a.domain.filter(x=>b.domain.some(y=>x!==y&&(a.type!==TRAP||b.type!==TRAP||distance(x,y,cols)>=2)));
    if(a.domain.length!==length){revisions++;if(!a.domain.length)return {valid:false,revisions};for(let k=0;k<variables.length;k++)if(k!==i&&k!==j)queue.push([k,i]);}
  }
  return {valid:true,revisions};
}
// CSP: event slots are variables; positions are domains. MRV + forward checking + LCV.
export function generateMap(rows,cols,seed) {
  const random=rng(seed), n=rows*cols, k=Math.floor(n*.125), v=Math.floor(n*.125);
  const slots=[...Array(k).fill(TRAP),...Array(v).fill(BONUS)], events=Array(n).fill(0);
  let nodes=0, backtracks=0, arcRevisions=0;
  const domains=type=>shuffle(Array.from({length:n},(_,i)=>i).filter(i=>!events[i] && (type!==TRAP || neighbors(i,rows,cols).every(j=>events[j]!==TRAP))),random);
  function solve(todo) {
    nodes++; if(!todo.length) return true;
    const choices=todo.map((type,j)=>({type,j,domain:domains(type)}));
    const arcs=ac3(choices,cols);arcRevisions+=arcs.revisions;if(!arcs.valid)return false;
    choices.sort((a,b)=>a.domain.length-b.domain.length || (b.type===TRAP)-(a.type===TRAP));
    const {type,j,domain}=choices[0]; if(!domain.length) return false;
    domain.sort((a,b)=>neighbors(a,rows,cols).length-neighbors(b,rows,cols).length);
    for(const pos of domain) {
      events[pos]=type;
      const rest=todo.filter((_,q)=>q!==j);
      const forward=rest.every(t=>domains(t).length>=rest.filter(z=>z===t).length);
      if(forward && solve(rest)) return true;
      events[pos]=0; backtracks++;
    }
    return false;
  }
  if(!solve(slots)) throw new Error('No existe mapa válido para esta configuración');
  const before=fairness(events,rows,cols); let cost=before, improvements=0;
  // Local search over complete, valid assignments; retain only non-worsening swaps.
  for(let step=0;step<600 && cost>0;step++) {
    const a=Math.floor(random()*n),b=Math.floor(random()*n);
    if(events[a]===events[b]) continue;
    [events[a],events[b]]=[events[b],events[a]];
    const next=fairness(events,rows,cols);
    if(validMap(events,rows,cols) && next<=cost) {if(next<cost)improvements++;cost=next;}
    else [events[a],events[b]]=[events[b],events[a]];
  }
  return {events,report:{method:'PSR · MRV · grado · LCV · AC-3 · forward checking + búsqueda local',nodes,backtracks,arcRevisions,improvements,before,after:cost,traps:k,bonuses:v,density:(k+v)/n}};
}
export function createGame({rows=6,cols=6,seed=1,mode='human-ai',difficulty='tactical'}={}) {
  if(![4,6,8].includes(rows)||![4,6,8].includes(cols)) throw new Error('Dimensiones no admitidas');
  const map=generateMap(rows,cols,seed);
  return {rows,cols,seed,mode,difficulty,turn:1,moves:0,played:[false,false,false],winner:null,reason:null,cells:map.events.map(event=>({owner:0,charge:0,event,revealed:false})),generator:map.report};
}
export function terminal(s) {
  if(!s.played[1] || !s.played[2]) return null;
  const {cells}=counts(s);
  if(!cells[1]&&!cells[2]) return 0;
  if(!cells[1]) return 2;
  if(!cells[2]) return 1;
  return null;
}
export function applyMove(state,index,{trace=false,deadline=Infinity}={}) {
  if(state.winner!==null) throw new Error('La partida terminó');
  if(!Number.isInteger(index)||index<0||index>=state.cells.length) throw new Error('Casilla inválida');
  if(state.cells[index].owner && state.cells[index].owner!==state.turn) throw new Error('Esa casilla pertenece al rival');
  const s=clone(state), player=s.turn, log=[]; s.moves++;s.played[player]=true;
  const queue=[], seen=new Set(); let explosions=0, processed=0;
  function add(i) {
    const c=s.cells[i];c.owner=player;c.charge++;
    if(!c.revealed) {
      c.revealed=true;
      if(trace)log.push({kind:'reveal',index:i,event:c.event});
      if(c.event===TRAP) {c.charge=0;c.owner=0;return;}
      if(c.event===BONUS)c.charge++;
    }
    if(c.charge>capacity(i,s.rows,s.cols))queue.push(i);
  }
  add(index);
  // An opening trap can eliminate the acting player; terminality is checked before cascades.
  let win=terminal(s);
  while(queue.length && win===null) {
    if(++processed>12000) {win=0;s.reason='Límite de seguridad de cascada';break;}
    if(processed%16===0 && performance.now()>deadline) throw new Error('SEARCH_TIMEOUT');
    const i=queue.shift(),c=s.cells[i], adjacent=neighbors(i,s.rows,s.cols);
    if(c.charge<adjacent.length)continue;
    c.charge-=adjacent.length;c.owner=c.charge?player:0;explosions++;
    for(const j of adjacent)add(j);
    if(c.charge>=adjacent.length)queue.push(i);
    if(trace)log.push({kind:'explode',index:i,targets:adjacent});
    win=terminal(s);
    if(processed%24===0) {
      const signature=s.cells.map(x=>`${x.owner},${x.charge},${+x.revealed}`).join(';')+'|'+queue.join(',');
      if(seen.has(signature)){win=0;s.reason='Ciclo de propagación detectado';break;}seen.add(signature);
    }
  }
  s.winner=win;
  if(s.winner!==null) s.reason??=s.winner===0?'Ambos jugadores quedaron sin cargas':'Eliminación total';
  if(s.winner===null && s.moves>=300){s.winner=0;s.reason='Límite de 300 jugadas';}
  s.turn=3-player;
  return {state:s,events:log,explosions};
}
export function observe(s,{reveal=false}={}) {
  const {seed,...publicState}=s;
  return {...publicState,cells:s.cells.map(c=>({...c,event:c.revealed||reveal?c.event:null})),...(reveal?{seed}: {})};
}
