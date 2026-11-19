import {createHash} from 'node:crypto';
export const persistent=Boolean(process.env.SUPABASE_URL&&process.env.SUPABASE_PUBLISHABLE_KEY);
const memory=new Map();
export const sessionId=token=>createHash('sha256').update(token).digest('hex');
async function request(token,method,body) {
  const url=new URL('/rest/v1/reaction_sessions',process.env.SUPABASE_URL);
  if(method==='GET'){url.searchParams.set('id',`eq.${sessionId(token)}`);url.searchParams.set('select','payload');}
  if(method==='POST')url.searchParams.set('on_conflict','id');
  const response=await fetch(url,{method,signal:AbortSignal.timeout(8000),headers:{apikey:process.env.SUPABASE_PUBLISHABLE_KEY,'x-session-token':token,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},...(body?{body:JSON.stringify(body)}:{})});
  if(!response.ok)throw new Error(`Almacenamiento no disponible (${response.status}). Reintenta en unos segundos.`);
  return method==='GET'?response.json():null;
}
export async function read(token) {if(!token)return null;if(!persistent)return memory.get(sessionId(token))?.payload??null;const rows=await request(token,'GET');return rows[0]?.payload??null;}
export async function save(token,payload) {
  if(persistent)await request(token,'POST',{id:sessionId(token),payload,updated_at:new Date().toISOString()});
  else {memory.set(sessionId(token),{payload,updated:Date.now()});if(memory.size>1000)memory.delete(memory.keys().next().value);}
}
