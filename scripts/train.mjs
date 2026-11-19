import {writeFile,mkdir} from 'node:fs/promises';
import {evolve} from '../shared/evolution.mjs';
const result=evolve({seed:2026,onProgress:p=>process.stderr.write(`\rCandidatos ${p.current}/${p.total}`)});
await mkdir('results',{recursive:true});await writeFile('results/training.json',JSON.stringify(result,null,2));console.log('\n'+JSON.stringify({...result,holdout:undefined},null,2));
