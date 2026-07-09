/* ======================= SHARED ENGINE =======================
   Lifted verbatim from Splits. so paces, power and send-offs match
   the calculator exactly — Daniels VDOT (run), CSS (swim), Coggan (bike). */
const $=id=>document.getElementById(id);
const parseTime=str=>{if(str==null)return NaN;str=String(str).trim();if(!str)return NaN;
  const p=str.split(':').map(Number);if(p.some(n=>isNaN(n)||n<0))return NaN;
  if(p.length===1)return p[0];if(p.length===2)return p[0]*60+p[1];if(p.length===3)return p[0]*3600+p[1]*60+p[2];return NaN;};
const num=v=>{const n=parseFloat(v);return isFinite(n)?n:NaN;};
const maskTime=raw=>{const d=String(raw).replace(/\D/g,'').slice(0,6);if(d.length<=2)return d;
  const g=[];let s=d;while(s.length>2){g.unshift(s.slice(-2));s=s.slice(0,-2);}g.unshift(s);return g.join(':');};
const bindTime=(el,cb)=>el.addEventListener('input',()=>{el.value=maskTime(el.value);cb();});
const fmt=s=>{if(!isFinite(s)||s<0)return '–';s=Math.round(s);const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;
  return h>0?`${h}:${String(m).padStart(2,'0')}:${String(x).padStart(2,'0')}`:`${m}:${String(x).padStart(2,'0')}`;};
const kmLbl=m=>m>=1000?(m%1000?(m/1000).toFixed(1):m/1000)+' km':m+' m';
// run — Daniels
const dPct=t=>0.8+0.1894393*Math.exp(-0.012778*t)+0.2989558*Math.exp(-0.1932605*t);
const dVO2=v=>-4.60+0.182258*v+0.000104*v*v;
const vdotFromRace=(d,s)=>{const t=s/60,v=d/t;return dVO2(v)/dPct(t);};
const velFromVO2=x=>{const a=0.000104,b=0.182258,c=-4.60-x;return(-b+Math.sqrt(b*b-4*a*c))/(2*a);};
const secPerKm=(vd,f)=>60000/velFromVO2(f*vd);
const timeForVdot=(d,vd)=>{let lo=d/8,hi=d/0.5;for(let i=0;i<60;i++){const mid=(lo+hi)/2;if(vdotFromRace(d,mid)>vd)lo=mid;else hi=mid;}return (lo+hi)/2;};
const FRAC={Easy:.70,Marathon:.84,Threshold:.88,Interval:.98,Rep:1.05};
// swim — CSS
const cssPer100=(t4,t2)=>(t4-t2)/2;
const swimOffFromCSS=dm=>dm<=100?-7:dm<=200?-4:dm<=400?-2:dm<=800?0:dm<=1000?0:2;
// bike — physics + Coggan
const CDA={'Tri aero':.26};
const ZONES=[['Z1','Active recovery',0,.55],['Z2','Endurance',.56,.75],['Z3','Tempo',.76,.90],['Z4','Threshold',.91,1.05],['Z5','VO₂max',1.06,1.20],['Z6','Anaerobic',1.21,1.50],['Z7','Neuromuscular',1.51,null]];
const powerFromSpeed=(v,m)=>{const g=9.80665,an=Math.atan(m.grade/100),va=v+m.windMs;return (g*Math.sin(an)*m.mass*v+g*Math.cos(an)*m.mass*m.Crr*v+0.5*m.rho*m.CdA*va*Math.abs(va)*v)/m.dt;};
const speedFromPower=(P,m)=>{let lo=.3,hi=30;for(let i=0;i<60;i++){const mid=(lo+hi)/2;if(powerFromSpeed(mid,m)<P)lo=mid;else hi=mid;}return (lo+hi)/2;};
// tri coupling — overbike ceilings, run-off-bike penalty, honest progress rates
const CEIL={Sprint:0.95,Olympic:0.88,'70.3':0.82,Ironman:0.70};
const ROB={Sprint:5,Olympic:8,'70.3':12,Ironman:18};
const runPenalty=(k,IF)=>ROB[k]+Math.min(36,Math.max(0,IF-CEIL[k])*100*6);
const RATE={swim:0.35,bike:0.35,run:0.17};  // per week: s/100, %FTP, VDOT pts

/* ======================= RACE MODEL ======================= */
const TRI={
  Sprint :{swim:750, bike:20000, run:5000,    IF:.95, t1:60, t2:45, swimOff:-3, rf:1.00, peakHrs:6,  taper:1, peak:2},
  Olympic:{swim:1500,bike:40000, run:10000,   IF:.88, t1:90, t2:60, swimOff:0,  rf:1.02, peakHrs:8,  taper:1, peak:2},
  '70.3' :{swim:1900,bike:90000, run:21097.5, IF:.83, t1:180,t2:120,swimOff:3,  rf:1.05, peakHrs:11, taper:2, peak:3},
  Ironman:{swim:3800,bike:180000,run:42195,   IF:.72, t1:300,t2:240,swimOff:7,  rf:1.08, peakHrs:15, taper:2, peak:3},
};
const CONSISTENCY=0.85;
const bikeModel=(mass=78)=>({CdA:CDA['Tri aero'],mass,grade:0,windMs:0,rho:1.225,Crr:0.005,dt:0.975});

/* ======================= STATE ======================= */
let dist='70.3';
const FIELDS=['racedate','days','hours','goal','cfrund','cf5k','cf400','cf200','cftp'];
const store={
  save(){try{localStorage.setItem('blocks.v1',JSON.stringify({
    dist, fields:Object.fromEntries(FIELDS.map(id=>[id,$(id)?.value??''])),
    planStart:state.planStart, done:state.done
  }));}catch(e){}},
  load(){try{return JSON.parse(localStorage.getItem('blocks.v1'))||null;}catch(e){return null;}}
};
const state={planStart:null,done:{}};

/* current fitness read straight from the inputs */
function fitness(){
  const t5=parseTime($('cf5k').value),rd=num($('cfrund').value)||5000;
  return {
    vdot:(isFinite(t5)&&t5>0)?vdotFromRace(rd,t5):NaN,
    css :cssPer100(parseTime($('cf400').value),parseTime($('cf200').value)),
    ftp :num($('cftp').value)
  };
}
/* project fitness forward over the weeks remaining, capped and honest */
function project(F,weeks){
  const w=weeks*CONSISTENCY;
  return {
    vdot:isFinite(F.vdot)?Math.min(F.vdot+6, F.vdot+RATE.run*w):NaN,
    css :isFinite(F.css) ?Math.max(F.css*0.88, F.css-RATE.swim*w):NaN,
    ftp :isFinite(F.ftp) ?Math.min(F.ftp*1.15, F.ftp*(1+RATE.bike/100*w)):NaN
  };
}
function predictFinish(F,key){
  const d=TRI[key],m=bikeModel();
  let swimT=NaN,bikeT=NaN,runT=NaN;
  if(isFinite(F.css)){const p100=F.css+d.swimOff;swimT=p100/100*d.swim;}
  if(isFinite(F.ftp)){const v=speedFromPower(F.ftp*d.IF,m);bikeT=d.bike/v;}
  if(isFinite(F.vdot)){const fresh=timeForVdot(d.run,F.vdot),pen=runPenalty(key,d.IF);
    const paceKm=(fresh/(d.run/1000)+pen)*d.rf;runT=paceKm*(d.run/1000);}
  const parts=[swimT,d.t1,bikeT,d.t2,runT];
  const total=parts.every(x=>isFinite(x))?parts.reduce((a,b)=>a+b,0):NaN;
  return {swimT,bikeT,runT,total};
}

/* ======================= PERIODISATION ======================= */
function weeksToRace(){
  const raw=$('racedate').value;if(!raw)return NaN;
  const race=new Date(raw+'T00:00:00');if(isNaN(race))return NaN;
  const now=new Date();now.setHours(0,0,0,0);
  const d=Math.ceil((race-now)/(7*86400000));
  return d;
}
function currentWeekIdx(total){
  if(!state.planStart)return 1;
  const start=new Date(state.planStart+'T00:00:00');const now=new Date();now.setHours(0,0,0,0);
  const i=Math.floor((now-start)/(7*86400000))+1;
  return Math.max(1,Math.min(total,i));
}
function weekStartDate(i){
  const start=state.planStart?new Date(state.planStart+'T00:00:00'):new Date();
  const d=new Date(start);d.setDate(d.getDate()+(i-1)*7);return d;
}
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const dateLbl=d=>`${d.getDate()} ${MON[d.getMonth()]}`;

function phaseOf(i,total){
  const d=TRI[dist],fromEnd=total-i;                 // 0 = race week
  if(fromEnd===0)return 'Race';
  if(fromEnd<d.taper)return 'Taper';
  if(fromEnd<d.taper+d.peak)return 'Peak';
  const trainable=total-1-d.taper-d.peak;            // weeks of base+build
  const buildW=Math.max(2,Math.round(trainable*0.42));
  if(fromEnd<d.taper+d.peak+buildW)return 'Build';
  return 'Base';
}
// deload every 4th week, but never in the final peak/taper run-in
function isDeload(i,total,phase){
  if(phase==='Peak'||phase==='Taper'||phase==='Race')return false;
  return i%4===0 && (total-i)>=3;
}
function loadFactor(i,total,phase,deload){
  const d=TRI[dist];
  let L;
  if(phase==='Race')L=0.30;
  else if(phase==='Taper'){const pos=(total-i);L=pos<=1?0.42:0.62;}   // closer = lighter
  else if(phase==='Peak')L=1.00;
  else if(phase==='Build'){const first=firstOf('Build',total),last=lastOf('Build',total);
    L=0.86+0.14*prog(i,first,last);}
  else {const first=firstOf('Base',total),last=lastOf('Base',total);
    L=0.60+0.24*prog(i,first,last);}
  if(deload)L*=0.62;
  return L;
}
function prog(i,a,b){return b>a?(i-a)/(b-a):1;}
function firstOf(ph,total){for(let i=1;i<=total;i++)if(phaseOf(i,total)===ph)return i;return 1;}
function lastOf(ph,total){for(let i=total;i>=1;i--)if(phaseOf(i,total)===ph)return i;return total;}

/* ======================= SESSION LIBRARY ======================= */
/* priority-ordered week: fewer days trims from the bottom */
const SLOTS=[
  {id:'bikeLong', w:0.28, day:'Sat', sport:'bike', key:true },
  {id:'runLong',  w:0.20, day:'Sun', sport:'run',  key:true },
  {id:'swimThr',  w:0.12, day:'Tue', sport:'swim', key:true },
  {id:'bikeQual', w:0.15, day:'Wed', sport:'bike', key:true },
  {id:'runQual',  w:0.13, day:'Thu', sport:'run',  key:true },
  {id:'swimEnd',  w:0.09, day:'Fri', sport:'swim', key:false},
  {id:'runEasy',  w:0.08, day:'Mon', sport:'run',  key:false},
];
const DOW=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const fmtDur=min=>{min=Math.max(15,Math.round(min/5)*5);if(min>=60){const h=Math.floor(min/60),m=min%60;return m?`${h}h${String(m).padStart(2,'0')}`:`${h}h`;}return `${min}m`;};

function targets(F){
  const pk=f=>isFinite(F.vdot)?fmt(secPerKm(F.vdot,f)):'–:––';
  const zc=f=>isFinite(F.ftp)?Math.round(f*F.ftp):'—';
  const zr=(lo,hi)=>isFinite(F.ftp)?`${Math.round(lo*F.ftp)}–${Math.round(hi*F.ftp)}w`:'—';
  const sc=o=>isFinite(F.css)?fmt(F.css+o):'—';
  const send=()=>isFinite(F.css)?fmt(Math.ceil((F.css+10)/5)*5):'—';
  const racePow=()=>isFinite(F.ftp)?Math.round(TRI[dist].IF*F.ftp)+'w':'—';
  return {pk,zc,zr,sc,send,racePow};
}

/* build the concrete prescription for one slot given phase */
function prescribe(slot,phase,deload,F){
  const long=dist==='70.3'||dist==='Ironman';
  const T=targets(F);
  const P=deload?'Deload':phase;
  let name='',set='',brick=false;
  switch(slot.id){
    case 'bikeLong':
      name='Long ride';
      if(P==='Deload')set=`Steady <b>Z2 ${T.zr(.56,.75)}</b> — cut it short, spin the legs out.`;
      else if(P==='Base')set=`Aerobic <b>Z2 ${T.zr(.56,.75)}</b> throughout. Build the diesel.`;
      else if(P==='Build'){set=`Z2 base with <b>${long?'3×12':'2×10'} min @ sweet spot ${T.zr(.88,.94)}</b>, 5 min easy between. Then a <b>15 min</b> run off the bike, easy.`;brick=true;}
      else if(P==='Peak'){set=`Race-effort blocks: <b>${long?'3×20':'3×10'} min @ ${T.racePow()}</b> (race power), Z2 between. <b>${long?'25':'15'} min</b> run @ race pace off the bike.`;brick=true;}
      else if(P==='Taper')set=`Short: 40 min easy + <b>4×3 min @ ${T.zr(.95,1.05)}</b> to keep the legs sharp.`;
      break;
    case 'runLong':
      name='Long run';
      if(P==='Deload')set=`Easy <b>${T.pk(FRAC.Easy)}/km</b>, time on feet only.`;
      else if(P==='Base')set=`Easy <b>${T.pk(FRAC.Easy)}/km</b> the whole way. Conversational.`;
      else if(P==='Build')set=`Easy <b>${T.pk(FRAC.Easy)}/km</b>, last <b>${long?'20':'10'} min @ ${T.pk(FRAC.Marathon)}/km</b> (steady).`;
      else if(P==='Peak')set=`Race-specific: middle <b>${long?'30':'15'} min @ ${T.pk(FRAC.Marathon)}/km</b>, hold form when it bites.`;
      else if(P==='Taper')set=`Easy and shorter <b>${T.pk(FRAC.Easy)}/km</b> + 5×20s strides.`;
      break;
    case 'swimThr':
      name='Swim · threshold';
      if(P==='Deload')set=`Easy 1500 with drills — feel, not fatigue.`;
      else if(P==='Base')set=`Threshold <b>${long?'8':'6'}×150 @ CSS ${T.sc(0)}/100</b> on ${T.send()}. Smooth.`;
      else if(P==='Build')set=`Threshold <b>${long?'10':'8'}×100 @ CSS ${T.sc(0)}/100</b> on ${T.send()}. Hold every one.`;
      else if(P==='Peak')set=`Race sim <b>${long?'3×400':'4×200'} @ CSS +2 ${T.sc(2)}/100</b>, sighting every 6 strokes.`;
      else if(P==='Taper')set=`1200 total with <b>6×50 fast</b>, long rest. Sharpen only.`;
      break;
    case 'bikeQual':
      name='Bike · intervals';
      if(P==='Deload')set=`Easy spin <b>Z1–Z2 ${T.zr(.45,.65)}</b>, high cadence.`;
      else if(P==='Base')set=`Sweet spot <b>3×8 min @ ${T.zr(.88,.94)}</b>, 4 min easy.`;
      else if(P==='Build')set=`Threshold <b>${long?'4×10':'4×8'} min @ ${T.zr(.95,1.05)}</b>, 4 min easy.`;
      else if(P==='Peak')set=`VO₂ <b>5×3 min @ ${T.zr(1.06,1.20)}</b>, 3 min easy. Big top end.`;
      else if(P==='Taper')set=`<b>3×4 min @ ${T.zr(.95,1.05)}</b>, full recovery. Legs primed.`;
      break;
    case 'runQual':
      name='Run · intervals';
      if(P==='Deload')set=`Easy <b>${T.pk(FRAC.Easy)}/km</b> + 6×20s strides.`;
      else if(P==='Base')set=`Hills / strides: <b>8×20s @ ${T.pk(FRAC.Rep)}/km</b> effort after an easy run.`;
      else if(P==='Build')set=`Threshold <b>${long?'5×1 km':'4×1 km'} @ ${T.pk(FRAC.Threshold)}/km</b>, 90s jog.`;
      else if(P==='Peak')set=`VO₂ <b>6×800 m @ ${T.pk(FRAC.Interval)}/km</b>, 400 jog.`;
      else if(P==='Taper')set=`<b>4×400 @ ${T.pk(FRAC.Interval)}/km</b>, full recovery. Stay sharp.`;
      break;
    case 'swimEnd':
      name='Swim · endurance';
      if(P==='Peak')set=`<b>${long?'2×800':'3×300'} @ CSS +3 ${T.sc(3)}/100</b>, hold form tired.`;
      else if(P==='Taper')set=`Easy 1200, drills and feel.`;
      else set=`<b>${long?'4×400':'3×300'} @ CSS +5 ${T.sc(5)}/100</b>, 20s rest. Aerobic.`;
      break;
    case 'runEasy':
      name='Easy run';
      set=`Easy recovery <b>${T.pk(FRAC.Easy)}/km</b>, conversational. Brick it off any ride if you're short on time.`;
      break;
  }
  return {name,set,brick};
}

function buildWeek(i,total){
  const phase=phaseOf(i,total),deload=isDeload(i,total,phase),load=loadFactor(i,total,phase,deload);
  const days=Math.max(3,Math.min(7,parseInt($('days').value)||6));
  const hours=(num($('hours').value)>0?num($('hours').value):TRI[dist].peakHrs)*load;
  const F=fitness();
  const chosen=phase==='Race'?[]:SLOTS.slice(0,days);
  const sumW=chosen.reduce((a,s)=>a+s.w,0)||1;
  const byDay={};
  chosen.forEach(slot=>{
    const min=hours*60*slot.w/sumW;
    const pr=prescribe(slot,phase,deload,F);
    byDay[slot.day]={dow:slot.day,sport:slot.sport,key:slot.key,brick:pr.brick,name:pr.name,set:pr.set,min,id:slot.id};
  });
  return {i,phase,deload,load,hours,days,byDay,start:weekStartDate(i)};
}

/* ======================= RENDER ======================= */
function render(){
  const total=weeksToRace();
  const F=fitness();
  renderVerdict(F,total);
  renderZones(F);
  if(!isFinite(total)||total<1){
    $('phasebar').innerHTML='';
    $('weeks').innerHTML=`<div class="empty-note">Set a race date in the future and your block appears here — one week per row, race day at the bottom.</div>`;
    $('blocksub').textContent='week by week to race day';
    return;
  }
  if(!state.planStart){state.planStart=isoToday();store.save();}
  const cur=currentWeekIdx(total);
  $('blocksub').textContent=`${total} weeks · you're in week ${cur}`;
  // phase timeline
  $('phasebar').innerHTML=Array.from({length:total},(_,k)=>{const wi=k+1,ph=phaseOf(wi,total),dl=isDeload(wi,total,ph);
    return `<div class="phaseseg ph-${ph}${wi===cur?' now':''}${dl?' rec':''}" data-w="${wi}" title="Week ${wi} · ${ph}${dl?' (deload)':''}"></div>`;}).join('');
  $('phasebar').querySelectorAll('.phaseseg').forEach(el=>el.addEventListener('click',()=>{
    const w=$('wk'+el.dataset.w);if(w){w.open=true;w.scrollIntoView({behavior:'smooth',block:'center'});}}));
  // weeks
  let html='';
  for(let i=1;i<=total;i++)html+=weekHtml(buildWeek(i,total),cur);
  $('weeks').innerHTML=html;
  wireWeeks(total,cur);
}
function weekHtml(W,cur){
  const isNow=W.i===cur,pct=Math.round(W.load*100);
  const done=Object.keys(W.byDay).filter(d=>state.done[`w${W.i}-${W.byDay[d].id}`]).length;
  const totalS=Object.keys(W.byDay).length;
  let days='';
  for(const dow of DOW){
    const s=W.byDay[dow];
    if(!s){days+=`<div class="day rest"><span class="tk"></span><span class="dow">${dow}</span><div><div class="snm">Rest / mobility</div></div><span class="sdur"></span></div>`;continue;}
    const pressed=!!state.done[`w${W.i}-${s.id}`];
    days+=`<div class="day ${s.sport}"><span class="tk"></span><span class="dow">${dow}</span>
      <div><div class="snm">${s.name}${s.key?'<span class="kbadge">Key</span>':''}${s.brick?'<span class="kbadge brk">Brick</span>':''}</div>
      <div class="sset">${s.set}</div>
      <div class="done"><button class="done-btn" data-k="w${W.i}-${s.id}" aria-pressed="${pressed}"><span class="bx"></span>${pressed?'Done':'Mark done'}</button></div></div>
      <span class="sdur">${fmtDur(s.min)}</span></div>`;
  }
  const rc=W.deload?'<span class="rc">Deload</span>':'';
  const end=new Date(W.start);end.setDate(end.getDate()+6);
  return `<details class="wk ${isNow?'now':''}" id="wk${W.i}" ${isNow?'open':''}>
    <summary><span class="wtag ph-${W.phase}"></span>
      <div class="wk-t">Week ${W.i} · ${W.phase}${rc} ${isNow?'<span class="nowtag">This week</span>':''}</div>
      <div class="wk-hrs">${W.hours.toFixed(1)}<small>hrs · ${pct}%</small></div>
      <div class="wk-sub">${dateLbl(W.start)}–${dateLbl(end)} · ${totalS} sessions</div>
      <div class="loadbar"><i style="width:${pct}%"></i></div>
    </summary>
    <div class="wk-body">${days}
      <div class="wk-foot"><span>Week done</span><span class="prog" id="prog${W.i}">${done}/${totalS}</span></div>
    </div>
  </details>`;
}
function wireWeeks(total,cur){
  $('weeks').querySelectorAll('.done-btn').forEach(btn=>btn.addEventListener('click',()=>{
    const k=btn.dataset.k,now=!state.done[k];
    if(now)state.done[k]=1;else delete state.done[k];
    btn.setAttribute('aria-pressed',now);btn.innerHTML=`<span class="bx"></span>${now?'Done':'Mark done'}`;
    const wi=k.split('-')[0].slice(1);
    const W=buildWeek(+wi,total),tot=Object.keys(W.byDay).length;
    const done=Object.keys(W.byDay).filter(d=>state.done[`w${wi}-${W.byDay[d].id}`]).length;
    const p=$('prog'+wi);if(p)p.textContent=`${done}/${tot}`;
    store.save();
  }));
}
function renderVerdict(F,total){
  const anyFit=isFinite(F.vdot)||isFinite(F.css)||isFinite(F.ftp);
  if(!isFinite(total)||total<1){$('projgrid').innerHTML='';$('predict').style.display='none';$('vnote').innerHTML='';
    $('synth').textContent='Pick a race distance and date to build your block.';return;}
  const wk=Math.max(1,total-1);
  const P=project(F,wk);
  const col=(cls,name,rows)=>`<div class="col ${cls}"><h4><span class="dt"></span>${name}</h4>${rows}</div>`;
  const ln=(k,v,up)=>`<div class="ln"><span class="k">${k}</span><span class="v ${up?'up':''}">${v}</span></div>`;
  const swimC=isFinite(F.css)
    ? ln('CSS now',fmt(F.css)+'/100')+ln('Race wk',fmt(P.css)+'/100',true)+ln('5k @ CSS',fmt(F.css*15))
    : '<div class="empty">Add 400 &amp; 200 swim times.</div>';
  const bikeC=isFinite(F.ftp)
    ? ln('FTP now',Math.round(F.ftp)+'w')+ln('Race wk',Math.round(P.ftp)+'w',true)+ln('Race power',Math.round(TRI[dist].IF*F.ftp)+'w')
    : '<div class="empty">Add your FTP.</div>';
  const runC=isFinite(F.vdot)
    ? ln('VDOT now',F.vdot.toFixed(1))+ln('Race wk',P.vdot.toFixed(1),true)+ln('5k now',fmt(timeForVdot(5000,F.vdot)))
    : '<div class="empty">Add a recent run race.</div>';
  $('projgrid').innerHTML=col('s','Swim',swimC)+col('b','Bike',bikeC)+col('r','Run',runC);
  // prediction vs goal
  const goal=parseTime($('goal').value);
  const pred=predictFinish(P,dist);
  if(isFinite(pred.total)){
    $('predict').style.display='';
    $('predv').textContent=fmt(pred.total);
    let chip='',note='';
    if(isFinite(goal)&&goal>=600){
      const diff=pred.total-goal,pct=diff/goal;
      if(diff<=0){chip='<span class="chip ok">On track</span>';
        note=`<div class="vnote ok">At ~85% consistency this block projects <span class="cmono">${fmt(pred.total)}</span> — inside your <span class="cmono">${fmt(goal)}</span> goal. Hold the key sessions and it's yours.</div>`;}
      else if(pct<=0.05){chip='<span class="chip warn">Stretch</span>';
        note=`<div class="vnote warn">Projects <span class="cmono">${fmt(pred.total)}</span> vs goal <span class="cmono">${fmt(goal)}</span> — about <span class="cmono">${fmt(diff)}</span> short. Reachable, but it needs the peak weeks to land and no missed blocks.</div>`;}
      else{chip='<span class="chip bad">Fantasy</span>';
        note=`<div class="vnote bad">Projects <span class="cmono">${fmt(pred.total)}</span> vs goal <span class="cmono">${fmt(goal)}</span> — <span class="cmono">${fmt(diff)}</span> off in ${total} weeks. Either push the race out or soften the goal; the honest number is above.</div>`;}
      $('predict').querySelector('.chip')?.remove();
      $('predict').insertAdjacentHTML('beforeend',chip);
    } else {
      $('predict').querySelector('.chip')?.remove();
      note=`<div class="vnote ok">Add a goal finish above to reality-check it against this projection.</div>`;
    }
    $('vnote').innerHTML=note;
  } else {
    $('predict').style.display='none';
    $('vnote').innerHTML=`<div class="vnote warn">Add your swim, bike and run fitness to project a finish and check your goal.</div>`;
  }
  const F2=TRI[dist];
  $('synth').innerHTML=anyFit
    ? `<b>${total}</b> weeks to your <b>${dist}</b>: base to build the engine, a peak block to sharpen it, then taper. Sessions below use your fitness <b>today</b> — the projection shows where consistent work lands you by race week.`
    : `<b>${total}</b> weeks to your <b>${dist}</b>. Add your fitness above and every session fills in with real paces, power and send-offs.`;
}
function renderZones(F){
  const box=$('zones');const parts=[];
  if(isFinite(F.css)){const c=F.css,so=Math.ceil((c+10)/5)*5;
    parts.push(`<div class="seclabel">Swim <span class="n">CSS · /100</span></div><div class="band">
      ${zrow('Threshold','race-pace engine',fmt(c))}${zrow('Endurance','CSS +5 · long sets',fmt(c+5))}${zrow('VO₂ / speed','CSS −4 · sharpen',fmt(c-4))}${zrow('Send-off','threshold reps on',fmt(so))}</div>`);}
  if(isFinite(F.ftp)){parts.push(`<div class="seclabel">Bike <span class="n">Coggan · watts</span></div><div class="band">${ZONES.map(([z,name,lo,hi],idx)=>{
    const w=hi?`${Math.round(lo*F.ftp)}–${Math.round(hi*F.ftp)}`:`${Math.round(lo*F.ftp)}+`,op=(0.28+idx*0.11).toFixed(2);
    return `<div class="zone"><span class="zbar" style="background:var(--bike);opacity:${op}"></span><span class="zname"><b>${z}</b><span>${name}</span></span><span class="zw">${w}<small> w</small></span></div>`;}).join('')}</div>`);}
  if(isFinite(F.vdot)){const paces=[['Easy','recovery / aerobic',FRAC.Easy],['Marathon','long steady',FRAC.Marathon],['Threshold','tempo / cruise',FRAC.Threshold],['Interval','VO₂ effort',FRAC.Interval],['Rep','speed / economy',FRAC.Rep]];
    parts.push(`<div class="seclabel">Run <span class="n">VDOT ${F.vdot.toFixed(1)} · /km</span></div><div class="band">${paces.map(([n,d,f])=>zrow(n,d,fmt(secPerKm(F.vdot,f))+' /km')).join('')}</div>`);}
  box.innerHTML=parts.length?parts.join(''):`<div class="empty-note">Add your fitness above and your paces, power and send-offs appear here.</div>`;
}
const zrow=(n,d,v)=>`<div class="row"><div class="lab"><b>${n}</b><span>${d}</span></div><div class="val">${v}</div></div>`;

/* ======================= WIRING ======================= */
function isoToday(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function selectDist(k){dist=k;Array.from($('distseg').children).forEach(b=>b.setAttribute('aria-selected',b.dataset.d===k));render();store.save();}
Array.from($('distseg').children).forEach(b=>b.addEventListener('click',()=>selectDist(b.dataset.d)));
$('racedate').addEventListener('input',()=>{state.planStart=isoToday();render();store.save();});
['days','hours','cfrund','cftp','goal'].forEach(id=>$(id).addEventListener('input',()=>{render();store.save();}));
['goal','cf5k','cf400','cf200'].forEach(id=>bindTime($(id),()=>{render();store.save();}));
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{});

/* ======================= INIT ======================= */
(function(){
  const s=store.load();
  if(s){
    dist=s.dist||dist;
    if(s.fields)for(const id of FIELDS)if($(id)&&id in s.fields)$(id).value=s.fields[id];
    state.planStart=s.planStart||null;state.done=s.done||{};
  }
  if(!$('racedate').value){const d=new Date();d.setDate(d.getDate()+16*7);
    $('racedate').value=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if(!state.planStart)state.planStart=isoToday();}
  Array.from($('distseg').children).forEach(b=>b.setAttribute('aria-selected',b.dataset.d===dist));
  render();
})();
