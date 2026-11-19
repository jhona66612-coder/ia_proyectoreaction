// Playback of public, authoritative motor receipts. Never computes game rules.
export class ReactionAnimator {
  constructor({board,paint,caption,speed}) {Object.assign(this,{board,paint,caption,speed});this.active=new Set();this.skipped=false;}
  skip(){this.skipped=true;for(const a of this.active)a.finish();}
  async effect(element,keyframes,duration){
    if(!element||this.skipped)return;
    const a=element.animate(keyframes,{duration:Math.max(20,duration*this.factor),easing:'ease-in-out',fill:'none'});this.active.add(a);
    try{await a.finished;}catch{}finally{this.active.delete(a);}
  }
  cell(index){return this.board.querySelector(`[data-index="${index}"]`);}
  async receive(r){
    const el=this.cell(r.index),old=el.querySelector('.molecule');
    if(r.captured){
      el.classList.add('absorbing');
      await this.effect(old,[{transform:'scale(1)',filter:'brightness(1)'},{transform:'scale(.3)',filter:'brightness(2)',opacity:.25}],210);
      el.classList.remove('absorbing');
    }
    this.paint(r.index,r.charged);
    await this.effect(el.querySelector('.molecule'),[{transform:'scale(.45)'},{transform:'scale(1.2)',offset:.65},{transform:'scale(1)'}],250);
    if(r.reveal===1){
      el.classList.add('trap-active');
      await this.effect(el.querySelector('.molecule'),[{transform:'scale(1)',opacity:1},{transform:'scale(.05) rotate(180deg)',opacity:0}],330);
      el.classList.remove('trap-active');
    }else if(r.reveal===2){
      this.paint(r.index,r.after);
      await this.effect(el.querySelector('.molecule'),[{transform:'scale(.7)',filter:'brightness(2)'},{transform:'scale(1)'}],300);
    }
    this.paint(r.index,r.after);
  }
  async fly(from,to,player,drop=false){
    if(this.skipped)return;
    const origin=this.cell(from),target=this.cell(to),particle=document.createElement('span');
    const x=origin.offsetLeft+origin.offsetWidth/2,y=origin.offsetTop+origin.offsetHeight/2;
    const tx=target.offsetLeft+target.offsetWidth/2,ty=target.offsetTop+target.offsetHeight/2;
    particle.className=`flying-charge p${player}`;particle.style.left=x+'px';particle.style.top=(drop?y-26:y)+'px';
    this.board.append(particle);
    try{await this.effect(particle,[{transform:'translate(-50%,-50%) scale(.65)',opacity:.4},{transform:`translate(calc(-50% + ${tx-x}px),calc(-50% + ${drop?26:ty-y}px)) scale(1)`,opacity:1}],drop?230:300);}finally{particle.remove();}
  }
  receiptText(r,cols){
    const name=`${String.fromCharCode(65+r.index%cols)}${Math.floor(r.index/cols)+1}`;
    if(r.reveal===1)return `${name}: trampa. Absorbe y elimina las ${r.charged.charge} cargas; queda vacía.`;
    if(r.reveal===2)return `${name}: ventaja. La carga que llegó recibe otra extra: ${r.after.charge} en total.`;
    if(r.captured)return `${name}: captura. ${r.captured} del rival + 1 entrante = ${r.after.charge} de tu color.`;
    return `${name}: ${r.before.charge} + 1 = ${r.after.charge} carga${r.after.charge===1?'':'s'} unidas.`;
  }
  async play(result){
    this.skipped=false;
    const frames=result.timeline??[],reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const base={slow:1.6,normal:1,fast:.45}[this.speed()]??1;
    this.factor=base*Math.min(1,12/Math.max(frames.length,1));
    if(reduced||this.speed()==='none'){this.caption('Jugada resuelta. Las cargas se conservan al capturar; las trampas las eliminan.');return;}
    for(const frame of frames){
      if(this.skipped)break;
      if(frame.kind==='place'){
        this.caption(this.receiptText(frame.receipt,result.game.cols));
        await this.fly(frame.receipt.index,frame.receipt.index,frame.player,true);
        await this.receive(frame.receipt);
      }else{
        const label=`${String.fromCharCode(65+frame.index%result.game.cols)}${Math.floor(frame.index/result.game.cols) + 1}`;
        this.caption(`${label}: ${frame.before.charge} cargas alcanzan el límite de ${frame.targets.length}. Sale una hacia cada vecino, sin diagonales.`);
        const el=this.cell(frame.index);el.classList.add('exploding');
        await this.effect(el.querySelector('.molecule'),[{transform:'scale(1)'},{transform:'scale(1.3)',filter:'brightness(2)'}],160);
        this.paint(frame.index,frame.after);
        await Promise.all(frame.targets.map(r=>this.fly(frame.index,r.index,frame.player)));
        el.classList.remove('exploding');
        const interesting=frame.targets.filter(r=>r.captured||r.reveal===1||r.reveal===2);
        if(interesting.length)this.caption(interesting.map(r=>this.receiptText(r,result.game.cols)).join(' '));
        await Promise.all(frame.targets.map(r=>this.receive(r)));
      }
    }
    if(result.animationTruncated)this.caption('Cascada extensa: se muestra el resultado completo calculado por el motor.');
  }
}
