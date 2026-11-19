import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {randomBytes,randomInt} from 'node:crypto';
import {Worker} from 'node:worker_threads';
import {createGame,applyMove,observe,legalMoves,counts,capacity} from '../shared/engine.mjs';
import {infer,updateStyle,brier} from '../shared/belief.mjs';
import {DEFAULT_WEIGHTS} from '../shared/ai.mjs';
import training from '../results/training.json' with {type:'json'};
import {read,save,persistent,sessionId} from './storage.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const locks=new Set(), jobs=new Map(), rates=new Map();let activeAI=0,activeLab=0;
const tokenFrom=req=>{const token=req.headers.cookie?.split(';').map(v=>v.trim()).find(v=>v.startsWith('reaction_session='))?.split('=')[1];return /^[a-f0-9]{64}$/.test(token??'')?token:null;};
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
function fail(message,status=400){throw Object.assign(new Error(message),{status});}
async function body(req){let text='';for await(const chunk of req){text+=chunk;if(text.length>8192)fail('Solicitud demasiado grande',413);}try{return JSON.parse(text||'{}');}catch{fail('JSON inválido');}}
function limit(req){const ip=(req.headers['x-forwarded-for']??req.socket.remoteAddress).toString().split(',')[0];const now=Date.now();let entry=rates.get(ip);if(!entry||entry.until<now){entry={n:0,until:now+60000};rates.set(ip,entry);}if(++entry.n>180)fail('Demasiadas solicitudes. Espera un minuto.',429);if(rates.size>5000)for(const [k,v]of rates)if(v.until<now)rates.delete(k);}
function view(record){return {game:observe(record.game,{reveal:record.game.winner!==null}),revision:record.revision,belief:infer(observe(record.game),record.styles?.[record.game.turn]??[.5,.5]),history:record.history,analysis:record.analysis??null,weights:record.weights,persistence:persistent?'Supabase':'Memoria local',stats:record.stats};}
function execute(record,index,analysis=null) {
  const before=record.game,belief=infer(observe(before),record.styles?.[before.turn]??[.5,.5]),player=before.turn;
  const result=applyMove(before,index,{trace:true,animate:true});
  for(const e of result.events)if(e.kind==='reveal'){record.stats.brierSum+=brier(belief.cells[e.index],e.event);record.stats.reveals++;}
  record.styles??={1:[.5,.5],2:[.5,.5]};record.styles[3-player]=updateStyle(record.styles[3-player],capacity(index,before.rows,before.cols)<=2?'cautious':'bold');
  record.game=result.state;record.revision++;record.stats.explosions+=result.explosions;
  if(analysis){record.analysis=analysis;record.stats.nodes+=analysis.metrics.nodes;record.stats.prunes+=analysis.metrics.prunes;record.stats.aiTimes.push(analysis.metrics.timeMs);}
  record.history.push({turn:before.moves+1,player,index,events:result.events,explosions:result.explosions,metrics:analysis?.metrics??null});
  return {events:result.events,timeline:result.timeline,animationTruncated:result.animationTruncated};
}
async function ai(state,options) {
  if(activeAI>=2)fail('La IA está atendiendo otra partida. Intenta de nuevo.',429);activeAI++;
  return new Promise((resolve,reject)=>{
    const worker=new Worker(new URL('./worker.mjs',import.meta.url),{workerData:{kind:'ai',state:observe(state),options}});let done=false;
    const finish=(error,result)=>{if(done)return;done=true;clearTimeout(timer);activeAI--;worker.terminate();error?reject(error):resolve(result);};
    const timer=setTimeout(()=>finish(null,{index:legalMoves(state)[0],belief:infer(observe(state)),route:{path:[]},alternatives:[],weights:options.weights,metrics:{nodes:0,prunes:0,prunedBranches:0,depth:0,timeMs:1400,samples:0,timeLimited:true,fallback:true},explanation:'El supervisor agotó el presupuesto de cómputo. Se ejecuta una jugada legal de respaldo.'}),1400);
    worker.on('message',m=>{if(m.error)finish(new Error(m.error));else if(m.result)finish(null,m.result);});worker.on('error',e=>finish(e));worker.on('exit',code=>{if(!done)finish(new Error(`El proceso de IA terminó (${code})`));});
  });
}
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.pdf':'application/pdf','.json':'application/json','.md':'text/plain; charset=utf-8','.ico':'image/x-icon'};
export const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  let lock=null;
  try {
    const url=new URL(req.url,'http://localhost');
    if(url.pathname==='/health')return json(res,200,{ok:true,app:'TacticReaction',version:'2.0.0',storage:persistent?'supabase':'memory'});
    if(!url.pathname.startsWith('/api/')) {
      if(req.method!=='GET'&&req.method!=='HEAD')fail('Método no admitido',405);
      let relative=['/','/play','/play/'].includes(url.pathname)?'public/index.html':url.pathname.startsWith('/docs/')?'docs/'+url.pathname.slice(6):'public/'+url.pathname.slice(1);
      const target=path.resolve(root,relative);
      if(!target.startsWith(root+path.sep)||relative.includes('..'))fail('No encontrado',404);
      let content;try{content=await readFile(target);}catch{fail('No encontrado',404);}
      res.writeHead(200,{'Content-Type':types[path.extname(target)]??'application/octet-stream','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:content);return;
    }
    limit(req);
    if(req.method==='POST') {
      const origin=req.headers.origin, expected=process.env.APP_ORIGIN;
      if(origin && (expected?origin!==expected:new URL(origin).host!==req.headers.host))fail('Origen no autorizado',403);
      if(req.headers['sec-fetch-site']==='cross-site')fail('Origen no autorizado',403);
      if(!req.headers['content-type']?.startsWith('application/json'))fail('Se requiere JSON',415);
    }
    let token=tokenFrom(req);
    if(req.method==='POST'&&!token&&url.pathname==='/api/new') {
      token=randomBytes(32).toString('hex');res.setHeader('Set-Cookie',`reaction_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000${process.env.RENDER?' ;Secure':''}`);
    }
    if(req.method==='GET'&&url.pathname==='/api/session'){const record=await read(token);return json(res,200,record?view(record):{game:null,persistence:persistent?'Supabase':'Memoria local'});}
    if(!token)fail('Inicia una partida primero',401);
    const id=sessionId(token);
    if(req.method==='GET'&&url.pathname==='/api/lab'){const job=jobs.get(id);return json(res,200,job?{status:job.status,kind:job.kind,progress:job.progress,result:job.result,error:job.error}:{status:'idle'});}
    if(req.method!=='POST')fail('No encontrado',404);
    if(locks.has(id))fail('Hay una jugada en curso',409);locks.add(id);lock=id;
    const data=await body(req);let record=await read(token);
    if(url.pathname==='/api/new') {
      const mode=['human-ai','human-human','ai-ai'].includes(data.mode)?data.mode:'human-ai',rows=Number(data.rows??data.size??8),cols=Number(data.cols??data.size??6);
      const difficulty=['explorer','tactical','expert'].includes(data.difficulty)?data.difficulty:'tactical';
      const rules=data.rules??'tactical';
      record={game:createGame({rows,cols,seed:randomInt(1,2147483647),mode,difficulty,rules}),revision:(record?.revision??0)+1,styles:{1:[.5,.5],2:[.5,.5]},history:[],weights:record?.weights??training.weights??DEFAULT_WEIGHTS,stats:{nodes:0,prunes:0,explosions:0,brierSum:0,reveals:0,aiTimes:[]}};
      await save(token,record);return json(res,200,view(record));
    }
    if(!record)fail('Tu partida no está disponible. Crea una nueva.',404);
    if(url.pathname==='/api/lab') {
      if(activeLab>=1)fail('Hay un experimento en curso. Espera a que termine.',429);
      const kind=data.kind==='genetic'?'genetic':'benchmark';activeLab++;
      const job={kind,status:'running',progress:{current:0,total:kind==='genetic'?24:12}};jobs.set(id,job);
      const worker=new Worker(new URL('./worker.mjs',import.meta.url),{workerData:{kind,options:{seed:2026}}});
      const complete=()=>{if(job.status!=='running')return;activeLab--;clearTimeout(timer);};
      const timer=setTimeout(()=>{complete();job.status='error';job.error='El experimento alcanzó el límite de 3 minutos. Puedes ejecutarlo localmente.';worker.terminate();},180000);
      worker.on('message',m=>{if(m.progress)job.progress=m.progress;else{complete();job.status=m.error?'error':'done';job.error=m.error;job.result=m.result;worker.terminate();}});
      worker.on('error',()=>{complete();job.status='error';job.error='El experimento no pudo completarse.';});
      setTimeout(()=>{if(jobs.get(id)===job)jobs.delete(id);},3600000).unref();
      return json(res,202,{status:'running',kind});
    }
    if(url.pathname==='/api/weights') {
      const result=jobs.get(id)?.result;
      if(!result||result.kind!=='genetic')fail('Primero completa el entrenamiento genético.');
      record.weights=result.weights;record.revision++;await save(token,record);return json(res,200,view(record));
    }
    if(url.pathname!=='/api/move'&&url.pathname!=='/api/ai')fail('No encontrado',404);
    if(data.revision!==record.revision)fail('La partida cambió. Recarga el tablero.',409);
    if(record.game.winner!==null)fail('La partida terminó');
    const isAI=record.game.mode==='ai-ai'||(record.game.mode==='human-ai'&&record.game.turn===2);
    if(url.pathname==='/api/move'&&isAI)fail('Es el turno de la IA');
    if(url.pathname==='/api/ai'&&!isAI)fail('Es el turno de una persona');
    // Work on a detached copy; failed writes never mutate an in-memory committed record.
    record=structuredClone(record);
    const analysis=isAI?await ai(record.game,{weights:record.weights,style:record.styles?.[record.game.turn]??[.5,.5]}):null;
    const animation=execute(record,analysis?.index??data.index,analysis);
    await save(token,record);return json(res,200,{...view(record),...animation});
  }catch(e){const status=e.status??(/Almacenamiento|fetch failed|timeout|aborted/i.test(e.message)?503:400);json(res,status,{error:status===503?'No se pudo guardar o recuperar la partida. Reintenta; tu última jugada guardada se conserva.':e.message});}
  finally{if(lock)locks.delete(lock);}
});
server.listen(Number(process.env.PORT??3000),'0.0.0.0',()=>console.log(`TacticReaction disponible en http://localhost:${process.env.PORT??3000} (${persistent?'Supabase':'memoria local'})`));
process.on('SIGTERM',()=>{server.close(()=>process.exit(0));setTimeout(()=>process.exit(0),5000).unref();});
