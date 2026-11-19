import {parentPort,workerData} from 'node:worker_threads';
import {chooseMove} from '../shared/ai.mjs';
import {benchmark,evolve} from '../shared/evolution.mjs';
try {
  const progress=p=>parentPort.postMessage({progress:p});
  const result=workerData.kind==='ai'?chooseMove(workerData.state,workerData.options):workerData.kind==='genetic'?evolve({...workerData.options,onProgress:progress}):benchmark({...workerData.options,onProgress:progress});
  parentPort.postMessage({result});
} catch(e) {parentPort.postMessage({error:e.message});}
