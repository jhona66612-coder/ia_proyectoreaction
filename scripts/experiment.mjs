import {writeFile,mkdir} from 'node:fs/promises';
import {benchmark} from '../shared/evolution.mjs';
const result=benchmark({games:Math.max(2,Math.min(200,Number(process.argv[2])||24)),seed:2026,onProgress:p=>process.stderr.write(`\rPartidas ${p.current}/${p.total}`)});
await mkdir('results',{recursive:true});await writeFile('results/benchmark.json',JSON.stringify(result,null,2));console.log('\n'+JSON.stringify({...result,matches:undefined},null,2));
