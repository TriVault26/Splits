/* ======================= SHARED ENGINE ======================= */
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
const rng=(t,p)=>fmt(t*(1-p))+'–'+fmt(t*(1+p));
const kmLbl=m=>m>=1000?(m%1000?(m/1000).toFixed(1):m/1000)+' km':m+' m';
/* units */
const MI=1609.344;
const UNITS={dist:'km',pool:'m'};
const paceUnit=()=>UNITS.dist==='mi'?'/mi':'/km';
const paceVal=spk=>UNITS.dist==='mi'?spk*1.609344:spk;      // sec-per-km -> display unit
const spdDisp=kmh=>UNITS.dist==='mi'?(kmh/1.609344).toFixed(1)+' mph':kmh.toFixed(1)+' km/h';
const poolLbl=d=>UNITS.pool==='yd'?Math.round(d)+' yd':kmLbl(d);
const SWIM_M={dists:[['100 m',100],['200 m',200],['400 m',400],['800 m',800],['1500 m',1500]],times:['1:30','3:15','7:00','14:30','28:00']};
const SWIM_Y={dists:[['100 yd',100],['200 yd',200],['500 yd',500],['1000 yd',1000],['1650 yd',1650]],times:['1:20','2:55','7:45','16:00','27:00']};
const clockSecs=str=>{if(!str)return null;const p=String(str).split(':').map(Number);if(p.some(n=>isNaN(n)))return null;
  return p.length>=2?p[0]*3600+p[1]*60+(p[2]||0):p[0]*3600;};
const fmtClock=s=>{s=Math.round(s)%86400;const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;
  return `${h}:${String(m).padStart(2,'0')}:${String(x).padStart(2,'0')}`;};
// run
const dPct=t=>0.8+0.1894393*Math.exp(-0.012778*t)+0.2989558*Math.exp(-0.1932605*t);
const dVO2=v=>-4.60+0.182258*v+0.000104*v*v;
const vdotFromRace=(d,s)=>{const t=s/60,v=d/t;return dVO2(v)/dPct(t);};
const velFromVO2=x=>{const a=0.000104,b=0.182258,c=-4.60-x;return(-b+Math.sqrt(b*b-4*a*c))/(2*a);};
const secPerKm=(vd,f)=>60000/velFromVO2(f*vd);
const timeForVdot=(d,vd)=>{let lo=d/8,hi=d/0.5;for(let i=0;i<60;i++){const mid=(lo+hi)/2;if(vdotFromRace(d,mid)>vd)lo=mid;else hi=mid;}return (lo+hi)/2;};
const FRAC={Easy:.70,Marathon:.84,Threshold:.88,Interval:.98,Rep:1.05};
// swim
const cssPer100=(t4,t2)=>(t4-t2)/2;
// piecewise power curve: sprint drop-off is steeper than distance drop-off
// (validated vs LCM world records + age-group curves; knot at 400)
const swimF=d=>d<=400?Math.pow(d,1.105):Math.pow(400,1.105)*Math.pow(d/400,1.04);
const swimEq=(g,gd,d)=>g*swimF(d)/swimF(gd);
const swimOffFromCSS=dm=>dm<=100?-7:dm<=200?-4:dm<=400?-2:dm<=800?0:dm<=1000?0:2;
const SWIMCOND={'Pool':0,'OW wetsuit':4,'OW skin':-6};
// bike
const CDA={'Road tops':.40,'Road hoods':.32,'Road drops':.30,'Tri aero':.26,'TT optimised':.24};
const ZONES=[['Z1','Active recovery',0,.55],['Z2','Endurance',.56,.75],['Z3','Tempo',.76,.90],['Z4','Threshold',.91,1.05],['Z5','VO₂max',1.06,1.20],['Z6','Anaerobic',1.21,1.50],['Z7','Neuromuscular',1.51,null]];
const BIKE_IF={10000:1.08,20000:1.04,40000:0.98,90000:0.85,180000:0.72};
const powerFromSpeed=(v,m)=>{const g=9.80665,an=Math.atan(m.grade/100),va=v+m.windMs;return (g*Math.sin(an)*m.mass*v+g*Math.cos(an)*m.mass*m.Crr*v+0.5*m.rho*m.CdA*va*Math.abs(va)*v)/m.dt;};
const speedFromPower=(P,m)=>{let lo=.3,hi=30;for(let i=0;i<60;i++){const mid=(lo+hi)/2;if(powerFromSpeed(mid,m)<P)lo=mid;else hi=mid;}return (lo+hi)/2;};
// tri
const CEIL={Sprint:0.95,Olympic:0.88,'70.3':0.82,Ironman:0.70};
const ROB={Sprint:5,Olympic:8,'70.3':12,Ironman:18};
const runPenalty=(k,IF)=>ROB[k]+Math.min(36,Math.max(0,IF-CEIL[k])*100*6);
const RATE={swim:0.35,bike:0.35,run:0.17};
const verdict=(gap,rate,weeks)=>{if(gap<=0)return{t:'On track',c:'ok'};const n=gap/rate;
  return n<=weeks*0.6?{t:'On track',c:'ok'}:n<=weeks?{t:'Stretch',c:'warn'}:{t:'Fantasy',c:'bad'};};

/* ======================= MODE SWITCH ======================= */
function switchMode(mode){
  Array.from($('modetoggle').children).forEach(b=>b.setAttribute('aria-selected',b.dataset.m===mode));
  $('mode-solo').classList.toggle('hide',mode!=='solo');
  $('mode-tri').classList.toggle('hide',mode!=='tri');
}

/* ======================= SINGLE SPORT ======================= */
const SPORTS={
  run :{label:'Goal race',fitK:'VDOT',eqnote:'equal fitness',
        dists:[['5 km',5000],['10 km',10000],['Half',21097.5],['Marathon',42195]],times:['22:00','46:00','1:45:00','3:40:00'],i:3},
  swim:{label:'Goal swim',fitK:'CSS',eqnote:'power curve',
        dists:SWIM_M.dists,times:SWIM_M.times.slice(),i:4},
  bike:{label:'Goal ride',fitK:'FTP',eqnote:'power curve',
        dists:[['10 km',10000],['20 km',20000],['40 km',40000],['90 km',90000],['180 km',180000]],times:['14:00','29:00','1:00:00','2:25:00','5:10:00'],i:2},
};
const applyPool=()=>{const src=UNITS.pool==='yd'?SWIM_Y:SWIM_M;SPORTS.swim.dists=src.dists;SPORTS.swim.times=src.times.slice();};
let sport='run';
const getModelSolo=()=>{const alt=num($('sbalt')?.value)||0;
  return {CdA:CDA[$('sbpos')?.value]||0.26,mass:num($('sbmass')?.value)||78,grade:num($('sbgrade')?.value)||0,
    windMs:(num($('sbwind')?.value)||0)/3.6,rho:1.225*Math.pow(1-2.25577e-5*alt,4.2559),Crr:0.005,dt:0.975};};

function switchSport(s){
  sport=s;$('mode-solo').classList.remove('sport-run','sport-swim','sport-bike');$('mode-solo').classList.add('sport-'+s);
  Array.from($('sportseg').children).forEach(b=>b.setAttribute('aria-selected',b.dataset.s===s));
  const S=SPORTS[s];$('goalt').textContent=S.label;$('badgek').textContent=S.fitK;$('eqnote').textContent=S.eqnote;
  $('chips').innerHTML=S.dists.map((d,i)=>`<button data-i="${i}" aria-selected="${i===S.i}">${d[0]}</button>`).join('');
  Array.from($('chips').children).forEach(b=>b.addEventListener('click',()=>{S.i=+b.dataset.i;syncGoal();renderSolo();}));
  $('modelwrap').innerHTML = s==='bike' ? `<details class="set"><summary><span>Bike model</span><span class="sum">flat · sea level</span></summary>
    <div class="set-body"><div class="pg">
      <div class="mf"><label>Position</label><select id="sbpos"><option>Road tops</option><option>Road hoods</option><option>Road drops</option><option selected>Tri aero</option><option>TT optimised</option></select></div>
      <div class="mf sm"><label>Rider+bike kg</label><input id="sbmass" value="78" inputmode="numeric"></div>
      <div class="mf sm"><label>Grade %</label><input id="sbgrade" value="0" inputmode="numeric"></div>
      <div class="mf sm"><label>Wind km/h</label><input id="sbwind" value="0" inputmode="numeric"></div>
      <div class="mf sm"><label>Altitude m</label><input id="sbalt" value="0" inputmode="numeric"></div>
    </div></div></details>` : '';
  if(s==='bike')['sbpos','sbmass','sbgrade','sbwind','sbalt'].forEach(id=>$(id).addEventListener('input',renderSolo));
  buildSplitsUI();
  syncGoal();renderSolo();
}
function syncGoal(){const S=SPORTS[sport];$('gtime').value=S.times[S.i];
  Array.from($('chips').children).forEach(b=>b.setAttribute('aria-selected',+b.dataset.i===S.i));}
function renderSolo(){sport==='run'?soloRun():sport==='swim'?soloSwim():soloBike();renderPaceBand();}

function soloRun(){
  const S=SPORTS.run,gd=S.dists[S.i][1],gt=parseTime($('gtime').value);
  if(!isFinite(gt)||gt<=0){$('badgev').textContent='–';return;}
  const vd=vdotFromRace(gd,gt);$('badgev').textContent=vd.toFixed(1);
  $('equiv').innerHTML=S.dists.map((d,i)=>{const t=timeForVdot(d[1],vd);
    return `<div class="erow ${i===S.i?'goal':''}"><div class="ed">${d[0]}${i===S.i?'<span class="tag">your goal</span>':''}</div><div class="et">${fmt(t)}</div><div class="ep">${fmt(paceVal(t/(d[1]/1000)))}${paceUnit()}</div></div>`;}).join('');
  const paces=[['Easy','recovery / aerobic',FRAC.Easy],['Marathon','long steady',FRAC.Marathon],['Threshold','tempo / cruise',FRAC.Threshold],['Interval','VO₂ effort',FRAC.Interval],['Rep','speed / economy',FRAC.Rep]];
  $('rvPaces').classList.remove('hide');$('rvPacesT').textContent='Training paces';
  $('secondary').innerHTML=`<div class="seclabel" style="border-top:0;margin-top:0;padding-top:0">Training paces <span class="n">${paceUnit().slice(1)}</span></div><div class="band">${paces.map(([n,dd,f])=>`<div class="row"><div class="lab"><b>${n}</b><span>${dd}</span></div><div class="val">${fmt(paceVal(secPerKm(vd,f)))}<small> ${paceUnit()}</small></div></div>`).join('')}</div>`;
  $('replabel').innerHTML='Rep targets <span class="n" style="font-weight:400;color:var(--muted)">what to hit in training</span>';
  const iP=secPerKm(vd,FRAC.Interval),rP=secPerKm(vd,FRAC.Rep),tP=secPerKm(vd,FRAC.Threshold);
  $('reps').innerHTML=`<div class="subh">Hard intervals <span style="font-weight:400;color:var(--muted)">· your classic 400s & 800s — 2–5 min hard, jog recovery</span></div><div class="reps">${[400,600,800,1000,1200].map(x=>`<div class="rep"><div class="d">${x} m</div><div class="t">${fmt(iP*x/1000)}</div></div>`).join('')}</div>
    <div class="subh mt">Short speed <span style="font-weight:400;color:var(--muted)">· fast strides for leg speed — full recovery between</span></div><div class="reps">${[200,300,400].map(x=>`<div class="rep"><div class="d">${x} m</div><div class="t">${fmt(rP*x/1000)}</div></div>`).join('')}</div>
    <div class="subh mt">Tempo reps <span style="font-weight:400;color:var(--muted)">· comfortably hard cruising — short rests, e.g. 4×1 km</span></div><div class="reps">${[1000,1600,2000].map(x=>`<div class="rep"><div class="d">${kmLbl(x)}</div><div class="t">${fmt(tP*x/1000)}</div></div>`).join('')}</div>`;
  $('soloFoot').innerHTML='Equivalents are equal-fitness times, not pace scaling.'+(gd<42195?' The marathon line assumes marathon-specific training — on modest mileage expect 3–8% slower.':'');
}
function soloSwim(){
  const S=SPORTS.swim,gd=S.dists[S.i][1],gt=parseTime($('gtime').value);
  if(!isFinite(gt)||gt<=0){$('badgev').textContent='–';return;}
  const css=(swimEq(gt,gd,400)-swimEq(gt,gd,200))/2;$('badgev').innerHTML=fmt(css)+'<span style="font-size:12px;color:var(--muted)">/100</span>';
  $('equiv').innerHTML=S.dists.map((d,i)=>{const t=swimEq(gt,gd,d[1]);
    return `<div class="erow ${i===S.i?'goal':''}"><div class="ed">${d[0]}${i===S.i?'<span class="tag">your goal</span>':''}</div><div class="et">${fmt(t)}</div><div class="ep">${fmt(t/(d[1]/100))}/100</div></div>`;}).join('');
  $('secondary').innerHTML='';$('rvPaces').classList.add('hide');
  $('replabel').innerHTML='Rep targets <span class="n" style="font-weight:400;color:var(--muted)">100 / 200 / 400 · send-off includes rest</span>';
  const sets=[['Threshold','at CSS · race-pace engine',0,10],['Fast reps','CSS −4 · sharpen speed',-4,18],['Endurance','CSS +5 · long steady sets',5,8]];
  const pu=UNITS.pool;
  $('reps').innerHTML=sets.map(([n,tag,off,rest],idx)=>{const p=css+off,so=Math.ceil((p+rest)/5)*5;
    return `<div class="subh${idx?' mt':''}">${n} <span style="font-weight:400;color:var(--muted)">· ${tag} · on ${fmt(so)}/100</span></div>
    <div class="reps">
      <div class="rep"><div class="d">100 ${pu}</div><div class="t">${fmt(p)}</div></div>
      <div class="rep"><div class="d">200 ${pu}</div><div class="t">${fmt(p*2)}</div></div>
      <div class="rep"><div class="d">400 ${pu}</div><div class="t">${fmt(p*4)}</div></div>
    </div>`;}).join('');
  $('soloFoot').innerHTML='CSS from the equivalent 200/400 — send-offs include rest.';
}
function soloBike(){
  const S=SPORTS.bike,gd=S.dists[S.i][1],gt=parseTime($('gtime').value),m=getModelSolo();
  if(!isFinite(gt)||gt<=0){$('badgev').textContent='–';return;}
  const avgP=powerFromSpeed(gd/gt,m),ftp=avgP/(BIKE_IF[gd]||0.95);$('badgev').innerHTML=Math.round(ftp)+'<span style="font-size:12px;color:var(--muted)">w</span>';
  $('equiv').innerHTML=S.dists.map((d,i)=>{const p=ftp*(BIKE_IF[d[1]]||0.95),v=speedFromPower(p,m),t=d[1]/v;
    return `<div class="erow ${i===S.i?'goal':''}"><div class="ed">${d[0]}${i===S.i?'<span class="tag">your goal</span>':''}</div><div class="et">${fmt(t)}</div><div class="ep">${spdDisp(v*3.6)} · ${Math.round(p)}w</div></div>`;}).join('');
  $('rvPaces').classList.remove('hide');$('rvPacesT').textContent='Power zones';
  $('secondary').innerHTML=`<div class="seclabel" style="border-top:0;margin-top:0;padding-top:0">Power zones <span class="n">Coggan</span></div><div class="band">${ZONES.map(([z,name,lo,hi],idx)=>{const wlo=Math.round(lo*ftp),whi=hi?Math.round(hi*ftp):null,w=hi?`${wlo}–${whi}`:`${wlo}+`,op=(0.28+idx*0.11).toFixed(2);
    return `<div class="zone"><span class="zbar" style="background:var(--bike);opacity:${op}"></span><span class="zname"><b>${z}</b><span>${name}</span></span><span class="zw">${w}<small style="font-weight:500;color:var(--muted)"> w</small></span></div>`;}).join('')}</div>`;
  $('replabel').innerHTML='Rep targets <span class="n" style="font-weight:400;color:var(--muted)">off FTP</span>';
  const reps=[['VO₂max','106–120%',1.06,1.20],['Threshold','95–105%',.95,1.05],['Sweet spot','88–94%',.88,.94]];
  $('reps').innerHTML=`<div class="band">${reps.map(([n,tag,lo,hi])=>`<div class="row"><div class="lab"><b>${n}</b><span>${tag} of FTP</span></div><div class="val">${Math.round(lo*ftp)}–${Math.round(hi*ftp)}<small> w</small></div></div>`).join('')}</div>`;
  $('soloFoot').innerHTML='Times solved through the flat-course physics model — tune it under Bike model.';
}

/* ---------- race splits / pace band ---------- */
const SPL={strat:'even',len:{},start:'',temp:''};
const STRATS=[['even','Even'],['n2','Negative 2%'],['n5','Negative 5%'],['p2','Positive 2%']];
const SFACT={even:0,n2:.02,n5:.05,p2:-.02};
const splitLenOpts=()=>{
  if(sport==='swim')return [[UNITS.pool==='yd'?'100 yd':'100 m',100]];
  if(sport==='bike')return UNITS.dist==='mi'?[['5 mi',5*MI],['10 mi',10*MI]]:[['5 km',5000],['10 km',10000]];
  return UNITS.dist==='mi'?[['1 mi',MI],['400 m',400],['1 km',1000]]:[['1 km',1000],['400 m',400],['1 mi',MI]];
};
function buildSplitsUI(){
  const opts=splitLenOpts();
  if(!opts.some(o=>o[1]===SPL.len[sport]))SPL.len[sport]=opts[0][1];
  $('splitsui').innerHTML=`
    <div class="mf"><label>Strategy</label><select id="sp_strat">${STRATS.map(([v,n])=>`<option value="${v}" ${v===SPL.strat?'selected':''}>${n}</option>`).join('')}</select></div>
    <div class="mf"><label>Split every</label><select id="sp_len">${opts.map(o=>`<option value="${o[1]}" ${o[1]===SPL.len[sport]?'selected':''}>${o[0]}</option>`).join('')}</select></div>
    <div class="mf"><label>Race start</label><input id="sp_start" value="${SPL.start}" placeholder="7:00" inputmode="numeric"></div>
    <div class="mf"><label>Race temp °C</label><input id="sp_temp" value="${SPL.temp}" placeholder="—" inputmode="numeric"></div>`;
  $('sp_strat').addEventListener('input',()=>{SPL.strat=$('sp_strat').value;renderPaceBand();});
  $('sp_len').addEventListener('input',()=>{SPL.len[sport]=+$('sp_len').value;renderPaceBand();});
  bindTime($('sp_start'),()=>{SPL.start=$('sp_start').value;renderPaceBand();});
  $('sp_temp').addEventListener('input',()=>{SPL.temp=$('sp_temp').value;renderPaceBand();});
}
function renderPaceBand(){
  const S=SPORTS[sport],gd=S.dists[S.i][1],gt=parseTime($('gtime').value);
  if(!isFinite(gt)||gt<=0){$('splitsum').innerHTML='';$('splitstbl').innerHTML='';return;}
  const tC=num(SPL.temp),hf=(isFinite(tC)&&tC>13)?(tC-13)*0.0027:0,adj=gt*(1+hf);
  const L=SPL.len[sport]||splitLenOpts()[0][1],sf=SFACT[SPL.strat]||0;
  const startS=clockSecs(SPL.start);
  const n=Math.ceil(gd/L-1e-9);
  const base=UNITS.dist==='mi'?MI:1000;
  let cum=0,rows='';
  for(let i=1;i<=n;i++){
    const dHere=Math.min(i*L,gd),segLen=dHere-(i-1)*L;
    const f=((i-1)*L+segLen/2)/gd;
    const pace=adj/gd*(1+sf*(1-2*f));                       // s per unit-distance
    const segT=pace*segLen;cum+=segT;
    let dLbl,pLbl;
    if(sport==='swim'){dLbl=Math.round(dHere)+' '+UNITS.pool;pLbl=fmt(pace*100)+'/100';}
    else if(sport==='bike'){dLbl=(dHere/base).toFixed(dHere<gd?0:1)+(UNITS.dist==='mi'?' mi':' km');pLbl=spdDisp(3.6/pace);}
    else{dLbl=L===400?Math.round(dHere)+' m':(dHere/base).toFixed(1)+(UNITS.dist==='mi'?' mi':' km');pLbl=fmt(pace*base)+paceUnit();}
    rows+=`<div class="sprow"><span class="mu">${i}</span><span>${dLbl}</span><span>${pLbl}</span><span>${fmt(segT)}</span><span><b>${fmt(cum)}</b></span><span class="mu">${startS!=null?fmtClock(startS+cum):'–'}</span></div>`;
  }
  $('splitstbl').innerHTML=`<div class="sphead"><span>#</span><span>At</span><span>Pace</span><span>Split</span><span>Cumul.</span><span>Clock</span></div>`+rows;
  const avgP=sport==='swim'?fmt(adj/gd*100)+'/100':sport==='bike'?spdDisp(3.6*gd/adj):fmt(paceVal(adj/(gd/1000)))+paceUnit();
  $('splitsum').innerHTML=`<span>Goal <b>${fmt(gt)}</b></span><span>Avg <b>${avgP}</b></span>`
    +(hf>0?`<span class="heat">Heat-adjusted ${fmt(adj)} (+${fmt(adj-gt)}) at ${tC}°C</span>`:'')
    +(startS!=null?`<span>Finish clock <b>${fmtClock(startS+cum)}</b></span>`:'');
}

/* ======================= TRIATHLON ======================= */
const DIST={
  Sprint : {legs:[['swim',750],['t1',null],['bike',20000],['t2',null],['run',5000]],     swimOff:-3, IF:.95, def:['11:30','1:00','33:00','0:45','23:00']},
  Olympic: {legs:[['swim',1500],['t1',null],['bike',40000],['t2',null],['run',10000]],   swimOff:0,  IF:.88, def:['24:00','1:30','1:08:00','1:00','48:00']},
  '70.3' : {legs:[['swim',1900],['t1',null],['bike',90000],['t2',null],['run',21097.5]], swimOff:3,  IF:.83, def:['34:00','3:00','2:35:00','2:00','1:40:00']},
  Ironman: {legs:[['swim',3800],['t1',null],['bike',180000],['t2',null],['run',42195]],  swimOff:7,  IF:.72, def:['1:10:00','5:00','5:30:00','4:00','3:45:00']},
};
const SWIMSUB=[100,400,1000], BIKESUB=[[20000,1.04],[40000,0.97],[90000,0.85]], RUNSUB=[5000,10000,21097.5];
const LEGNAME={swim:'Swim',t1:'T1',bike:'Bike',t2:'T2',run:'Run'};
let curDist='70.3';
const getModel=()=>{const alt=num($('bmalt').value)||0;
  return {CdA:CDA[$('bmpos').value]||0.26,mass:num($('bmmass').value)||78,grade:num($('bmgrade').value)||0,
    windMs:(num($('bmwind').value)||0)/3.6,rho:1.225*Math.pow(1-2.25577e-5*alt,4.2559),Crr:0.005,dt:0.975};};
const chipHtml=v=>`<span class="chip ${v.c}">${v.t}</span>`;

function buildLegs(key){
  curDist=key;const d=DIST[key];
  $('legs').innerHTML=d.legs.map((leg,i)=>{const [type,metres]=leg,isTr=type==='t1'||type==='t2';
    return `<div class="leg ${isTr?'tr':type}"><span class="tk"></span>
      <div class="leg-name"><b>${LEGNAME[type]}</b><span>${isTr?'transition':kmLbl(metres)}</span></div>
      <input class="leg-in" id="rg${i}" value="${d.def[i]}" inputmode="numeric">${isTr?'':`<div class="leg-req" id="rq${i}"></div>`}</div>`;}).join('')
    +`<div class="total"><div><span class="tl">Total</span><div id="tdelta" style="font-family:var(--mono);font-size:12px;font-weight:600;color:#9FB2BC;margin-top:2px"></div></div><span class="tv" id="rtotal">–</span></div>`;
  d.legs.forEach((_,i)=>bindTime($('rg'+i),computeRace));
  Array.from($('distseg').children).forEach(b=>b.setAttribute('aria-selected',b.dataset.d===key));
  const g=parseTime($('trigoal').value);
  if(isFinite(g)&&g>=1800)distributeGoal();else computeRace();
}
function distributeGoal(){
  const g=parseTime($('trigoal').value);if(!isFinite(g)||g<1800)return;
  const d=DIST[curDist],defs=d.def.map(parseTime),sum=defs.reduce((a,b)=>a+b,0);
  let legs=defs.map(t=>t/sum*g);
  legs=legs.map((t,i)=>{const tr=d.legs[i][0]==='t1'||d.legs[i][0]==='t2';return Math.max(tr?30:60,Math.round(t/(tr?5:15))*(tr?5:15));});
  const bi=d.legs.findIndex(l=>l[0]==='bike');
  legs[bi]+=g-legs.reduce((a,b)=>a+b,0);
  legs.forEach((t,i)=>{if($('rg'+i))$('rg'+i).value=fmt(t);});
  computeRace();
}
function computeRace(){
  const d=DIST[curDist],m=getModel(),weeks=num($('weeks').value)||16,cond=$('swimcond').value;
  $('setsum').textContent=`${cond} · ${$('bmpos').value} · ${weeks} wks`;
  const curCSS=cssPer100(parseTime($('cf400').value),parseTime($('cf200').value)),curFTP=num($('cftp').value);
  const t5=parseTime($('cf5k').value),rd=num($('cfrund').value)||5000,curVDOT=(isFinite(t5)&&t5>0)?vdotFromRace(rd,t5):NaN;
  let total=0,legD={},goalT={};
  d.legs.forEach((leg,i)=>{const [type,metres]=leg,t=parseTime($('rg'+i).value);if(isFinite(t))total+=t;
    if(type==='t1'||type==='t2'){if(isFinite(t)&&t>0)goalT[type]=t;return;}
    if(!isFinite(t)||t<=0){if($('rq'+i))$('rq'+i).innerHTML='';return;}
    legD[type]=metres;goalT[type]=t;const el=$('rq'+i);
    if(type==='swim'){el.innerHTML=`<em>race</em> <b>${fmt(t/(metres/100))}</b>/100`;}
    else if(type==='bike'){const v=metres/t;el.innerHTML=`<b>${(v*3.6).toFixed(1)}</b> km/h &nbsp;·&nbsp; <em>~</em><b>${Math.round(powerFromSpeed(v,m))}</b>w avg`;}
    else if(type==='run'){el.innerHTML=`<b>${fmt(t/(metres/1000))}</b>/km`;}});
  $('rtotal').textContent=fmt(total);
  const gg=parseTime($('trigoal').value);
  $('tdelta').innerHTML=(isFinite(gg)&&gg>=1800)?(Math.abs(total-gg)<1?'on goal':(total>gg?'+':'−')+fmt(Math.abs(total-gg))+' vs goal'):'';
  const req={};
  if(legD.swim){const rp=goalT.swim/(legD.swim/100);req.css=rp-d.swimOff+(SWIMCOND[cond]||0);}
  let actualIF=NaN;
  if(legD.bike){const v=legD.bike/goalT.bike,w=powerFromSpeed(v,m);req.ftp=w/d.IF;req.bikeW=w;actualIF=(isFinite(curFTP)&&curFTP>0)?w/curFTP:NaN;}
  if(legD.run){const gp=goalT.run/(legD.run/1000),pen=runPenalty(curDist,isFinite(actualIF)?actualIF:CEIL[curDist]);
    req.runPace=gp;req.pen=pen;req.freshPace=gp-pen;req.vdot=vdotFromRace(legD.run,(gp-pen)*(legD.run/1000));}
  const V=renderGap(req,{curCSS,curFTP,curVDOT},weeks);$('synth').textContent=synthLine(V);renderCouple(req,actualIF,curFTP,legD);renderCutoffs(goalT,total);renderSplits(req,legD,m);renderReq(req);
}
function renderGap(req,cur,weeks){
  const V={};
  const why=(v,gap,rate,what)=>{
    if(v.c==='ok')return '';
    const n=Math.ceil(gap/rate/4.33);  // months at sustainable progress
    const have=(weeks/4.33).toFixed(1);
    if(v.c==='warn')return `<div class="vnote warn">Why stretch: closing ${what} typically takes ~${n} month${n>1?'s':''} of consistent focus — you have ${have}. Doable, but no missed blocks.</div>`;
    return `<div class="vnote bad">Why fantasy: closing ${what} typically takes ~${n} month${n>1?'s':''} at realistic progress — you have ${have}. Soften this leg's split or push the race out.</div>`;
  };
  let s='<div class="empty">—</div>',sc='';
  if(isFinite(req.css)&&isFinite(cur.curCSS)){const gap=cur.curCSS-req.css,v=verdict(gap,RATE.swim,weeks);V.swim=v;sc=chipHtml(v);
    s=`<div class="ln"><span class="k">Now</span><span class="v">${fmt(cur.curCSS)}/100</span></div><div class="ln"><span class="k">Needs</span><span class="v">${fmt(req.css)}/100</span></div><div class="ln"><span class="k">Gap</span><span class="v ${gap>0?'':'mut'}">${gap>0?'+':''}${gap.toFixed(1)}s/100</span></div>`+why(v,gap,RATE.swim,`${gap.toFixed(1)}s/100 of swim speed`);}
  let b='<div class="empty">—</div>',bc='';
  if(isFinite(req.ftp)&&isFinite(cur.curFTP)){const gp=(req.ftp-cur.curFTP)/cur.curFTP*100,v=verdict(gp,RATE.bike,weeks);V.bike=v;bc=chipHtml(v);
    b=`<div class="ln"><span class="k">Now</span><span class="v">${Math.round(cur.curFTP)} w</span></div><div class="ln"><span class="k">Needs</span><span class="v">${Math.round(req.ftp)} w</span></div><div class="ln"><span class="k">Gap</span><span class="v ${gp>0?'':'mut'}">${gp>0?'+':''}${gp.toFixed(0)}%</span></div>`+why(v,gp,RATE.bike,`${Math.round(req.ftp-cur.curFTP)}w of FTP`);}
  let r='<div class="empty">—</div>',rc='';
  if(isFinite(req.vdot)&&isFinite(cur.curVDOT)){const gp=req.vdot-cur.curVDOT,v=verdict(gp,RATE.run,weeks);V.run=v;rc=chipHtml(v);
    const now5=timeForVdot(5000,cur.curVDOT),need5=timeForVdot(5000,req.vdot),diff=now5-need5;
    r=`<div class="ln"><span class="k">Your 5k now</span><span class="v">${fmt(now5)}</span></div><div class="ln"><span class="k">Needs 5k</span><span class="v">${fmt(need5)} <small style="color:var(--muted);font-weight:500">(${fmt(need5/5)}/km)</small></span></div><div class="ln"><span class="k">Gap</span><span class="v ${diff>0?'':'mut'}">${diff>0?fmt(diff)+' off 5k':'ahead'}</span></div>`+why(v,gp,RATE.run,`${fmt(Math.max(0,diff))} off your 5k`);}
  $('gapgrid').innerHTML=`<div class="col s"><h4><span class="dt"></span>Swim${sc}</h4>${s}</div><div class="col b"><h4><span class="dt"></span>Bike${bc}</h4>${b}</div><div class="col r"><h4><span class="dt"></span>Run${rc}</h4>${r}</div>`;
  return V;
}
function synthLine(V){
  const bads=[],warns=[],oks=[];
  for(const k of ['swim','bike','run']){const v=V[k];if(!v)continue;(v.c==='bad'?bads:v.c==='warn'?warns:oks).push(k);}
  if(!bads.length&&!warns.length&&oks.length===3)return 'All three legs check out — this goal is honest.';
  if(!bads.length&&!warns.length)return 'Add your numbers to check this goal.';
  const list=a=>a.join(' and ');
  if(bads.length)return `The ${list(bads)} doesn\u2019t add up${warns.length?`; ${list(warns)} is tight`:''} — here\u2019s why.`;
  return `The ${list(warns)} is a stretch — the rest is there.`;
}
function renderCouple(req,actualIF,curFTP,legD){
  if(!legD.bike||!legD.run||!isFinite(req.vdot)){$('couple').innerHTML='';return;}
  const ceil=CEIL[curDist],over=isFinite(actualIF)?actualIF-ceil:null;let cls,tag,body;
  const runLine=`Goal run <span class="cmono">${fmt(req.runPace)}</span>/km off the bike needs ~<span class="cmono">${fmt(req.freshPace)}</span>/km fresh — about a <span class="cmono">${fmt(timeForVdot(5000,req.vdot))}</span> open 5k.`;
  if(over===null){cls='warn';tag='Add your FTP';body=`Enter your current FTP above to see how hard this bike really is for you. ${runLine}`;}
  else if(over>0.02){cls='bad';tag='Overbiking risk';body=`This bike is <span class="cmono">IF ${actualIF.toFixed(2)}</span> of your FTP — above the <span class="cmono">${ceil.toFixed(2)}</span> ceiling for ${curDist}. Expect the run to fall apart; each 0.01 over adds ~6 s/km. ${runLine}`;}
  else if(over>-0.02){cls='warn';tag='Right at the limit';body=`Bike sits at <span class="cmono">IF ${actualIF.toFixed(2)}</span>, near the <span class="cmono">${ceil.toFixed(2)}</span> ceiling — doable but no margin for the run. ${runLine}`;}
  else{cls='ok';tag='Bike supports the run';body=`Bike is <span class="cmono">IF ${actualIF.toFixed(2)}</span>, comfortably under the <span class="cmono">${ceil.toFixed(2)}</span> ceiling — the run should hold. ${runLine}`;}
  $('couple').innerHTML=`<div class="callout ${cls}"><span class="ctag">Bike → run · ${tag}</span><div>${body} Ride it steady too — target VI ≤ 1.05; surging above plan costs the run even at the same average watts.</div></div>`;
}
const CUTOFF={'70.3':{swim:70*60,bikeCum:5.5*3600,total:8.5*3600},Ironman:{swim:140*60,bikeCum:10.5*3600,total:17*3600}};
function renderCutoffs(goalT,total){
  const c=CUTOFF[curDist];
  if(!c||!goalT.swim||!goalT.bike||!goalT.run){$('cutoffs').innerHTML='';return;}
  const swimCum=goalT.swim, bikeCum=goalT.swim+(goalT.t1||0)+goalT.bike;
  const checks=[['Swim',swimCum,c.swim],['Bike (cumul.)',bikeCum,c.bikeCum],['Finish',total,c.total]];
  const misses=checks.filter(([,v,lim])=>v>lim);
  if(misses.length){
    $('cutoffs').innerHTML=`<div class="callout bad"><span class="ctag">Cutoffs · at risk</span><div>${misses.map(([n,v,lim])=>`${n} <span class="cmono">${fmt(v)}</span> vs cutoff <span class="cmono">${fmt(lim)}</span>`).join(' · ')}. Standard ${curDist} cutoffs — check your race's specifics.</div></div>`;
  } else {
    const tight=checks.reduce((a,b)=>(a[2]-a[1])<(b[2]-b[1])?a:b);
    $('cutoffs').innerHTML=`<div class="callout ok"><span class="ctag">Cutoffs · clear</span><div>Clears standard ${curDist} cutoffs — tightest margin <span class="cmono">${fmt(tight[2]-tight[1])}</span> at the ${tight[0].toLowerCase()}. Always verify your race's specific cutoffs.</div></div>`;
  }
}
function renderSplits(req,legD,m){
  let s='<div class="empty">—</div>';
  if(isFinite(req.css)&&legD.swim){const rows=SWIMSUB.filter(x=>x<legD.swim).map(x=>{const p=req.css+swimOffFromCSS(x);
    return `<div class="srow"><span class="sd">${kmLbl(x)}</span><span class="sv"><b>${rng(p*x/100,0.015)}</b><span>${fmt(p)}/100</span></span></div>`;});if(rows.length)s=rows.join('');}
  let b='<div class="empty">—</div>';
  if(isFinite(req.ftp)&&legD.bike){const rows=BIKESUB.filter(([x])=>x<legD.bike).map(([x,int])=>{const P=int*req.ftp,v=speedFromPower(P,m);
    return `<div class="srow"><span class="sd">${kmLbl(x)}</span><span class="sv"><b>${rng(x/v,0.02)}</b><span>${(v*3.6).toFixed(1)} km/h · ${Math.round(P)}w</span></span></div>`;});if(rows.length)b=rows.join('');}
  let r='<div class="empty">—</div>';
  if(isFinite(req.vdot)&&legD.run){const rows=RUNSUB.filter(x=>x<legD.run).map(x=>{const t=timeForVdot(x,req.vdot);
    return `<div class="srow"><span class="sd">${kmLbl(x)}</span><span class="sv"><b>${rng(t,0.015)}</b><span>${fmt(t/(x/1000))}/km fresh</span></span></div>`;});if(rows.length)r=rows.join('');}
  $('splitgrid').innerHTML=`<div class="col s"><h4><span class="dt"></span>Swim</h4>${s}</div><div class="col b"><h4><span class="dt"></span>Bike</h4>${b}</div><div class="col r"><h4><span class="dt"></span>Run</h4>${r}</div>`;
}
function renderReq(req){
  let s='<div class="empty">—</div>';
  if(isFinite(req.css)){const c=req.css,so=Math.ceil((c+10)/5)*5;
    s=`<div class="ln"><span class="k">Threshold /100</span><span class="v">${fmt(c)}</span></div><div class="ln"><span class="k">on (send-off)</span><span class="v mut">${fmt(so)}</span></div><div class="ln"><span class="k">VO₂ /100 (−4)</span><span class="v">${fmt(c-4)}</span></div>`;}
  let b='<div class="empty">—</div>';
  if(isFinite(req.ftp)){const f=req.ftp;
    b=`<div class="ln"><span class="k">VO₂ reps</span><span class="v">${Math.round(1.06*f)}–${Math.round(1.20*f)}w</span></div><div class="ln"><span class="k">Threshold</span><span class="v">${Math.round(.95*f)}–${Math.round(1.05*f)}w</span></div><div class="ln"><span class="k">Sweet spot</span><span class="v">${Math.round(.88*f)}–${Math.round(.94*f)}w</span></div>`;}
  let r='<div class="empty">—</div>';
  if(isFinite(req.vdot)){const iP=secPerKm(req.vdot,FRAC.Interval),rP=secPerKm(req.vdot,FRAC.Rep);
    if((curDist==='70.3'||curDist==='Ironman')&&isFinite(req.runPace)){
      r=`<div class="ln"><span class="k">1 km @ race pace</span><span class="v">${fmt(req.runPace)}</span></div>
         <div class="ln"><span class="k">5 km @ race pace</span><span class="v">${fmt(req.runPace*5)}</span></div>
         <div class="ln"><span class="k">400 @ VO₂ (sharpen)</span><span class="v">${fmt(iP*.4)}</span></div>`;
    } else {
      r=`<div class="ln"><span class="k">400 @ VO₂</span><span class="v">${fmt(iP*.4)}</span></div><div class="ln"><span class="k">800 @ VO₂</span><span class="v">${fmt(iP*.8)}</span></div><div class="ln"><span class="k">400 @ speed</span><span class="v">${fmt(rP*.4)}</span></div>`;
    }}
  $('reqgrid').innerHTML=`<div class="col s"><h4><span class="dt"></span>Swim</h4>${s}</div><div class="col b"><h4><span class="dt"></span>Bike</h4>${b}</div><div class="col r"><h4><span class="dt"></span>Run</h4>${r}</div>`;
}
function computeConv(fromPow){const m=getModel();
  if(fromPow){const P=num($('cvpow').value);if(isFinite(P)&&P>0){const v=speedFromPower(P,m);$('cvspd').value=(v*3.6).toFixed(1);$('cvout').textContent='40 km in '+fmt(40000/v);}}
  else{const s=num($('cvspd').value);if(isFinite(s)&&s>0){const v=s/3.6;$('cvpow').value=Math.round(powerFromSpeed(v,m));$('cvout').textContent='40 km in '+fmt(40000/v);}}}
function renderBench(){
  const css=cssPer100(parseTime($('cf400').value),parseTime($('cf200').value));
  if(isFinite(css)&&css>0){$('css').innerHTML=fmt(css)+'<small> /100</small>';$('s1500').textContent=fmt(css*15);
    const sets=[['Endurance','CSS +5',5,8],['Threshold','CSS +0',0,10],['VO₂ / speed','CSS −4',-4,18]];
    $('swimreps').innerHTML=sets.map(([n,tag,off,rest])=>{const p=css+off,so=Math.ceil((p+rest)/5)*5;
      return `<div class="row"><div class="lab"><b>${n}</b><span>${tag} · on ${fmt(so)}</span></div><div class="val">${fmt(p)}<small> /100</small></div></div>`;}).join('');
  }else{$('css').innerHTML='–';$('s1500').textContent='–';$('swimreps').innerHTML='';}
  const ftp=num($('cftp').value);
  if(isFinite(ftp)&&ftp>0){
    $('bikezones').innerHTML=ZONES.map(([z,name,lo,hi],i)=>{const wlo=Math.round(lo*ftp),whi=hi?Math.round(hi*ftp):null,pct=hi?`${Math.round(lo*100)}–${Math.round(hi*100)}%`:`${Math.round(lo*100)}%+`,w=hi?`${wlo}–${whi}`:`${wlo}+`,op=(0.28+i*0.11).toFixed(2);
      return `<div class="zone"><span class="zbar" style="background:var(--bike);opacity:${op}"></span><span class="zname"><b>${z}</b><span>${name}</span></span><span class="zpct">${pct}</span><span class="zw">${w}<small style="font-weight:500;color:var(--muted)"> w</small></span></div>`;}).join('');
    const reps=[['VO₂max','106–120%',1.06,1.20],['Threshold','95–105%',.95,1.05],['Sweet spot','88–94%',.88,.94]];
    $('bikereps').innerHTML=reps.map(([n,tag,lo,hi])=>`<div class="row"><div class="lab"><b>${n}</b><span>${tag} of FTP</span></div><div class="val">${Math.round(lo*ftp)}–${Math.round(hi*ftp)}<small> w</small></div></div>`).join('');
  }else{$('bikezones').innerHTML='';$('bikereps').innerHTML='';}
  const t5=parseTime($('cf5k').value),rd=num($('cfrund').value)||5000;
  if(isFinite(t5)&&t5>0){const vd=vdotFromRace(rd,t5);
    const paces=[['Easy','recovery / aerobic',FRAC.Easy],['Marathon','long steady',FRAC.Marathon],['Threshold','tempo / cruise',FRAC.Threshold],['Interval','VO₂ effort',FRAC.Interval],['Rep','speed / economy',FRAC.Rep]];
    $('runpaces').innerHTML=paces.map(([n,dd,f])=>`<div class="row"><div class="lab"><b>${n}</b><span>${dd}</span></div><div class="val">${fmt(secPerKm(vd,f))}<small> /km</small></div></div>`).join('');
    const iP=secPerKm(vd,FRAC.Interval);$('runI').innerHTML=[400,600,800,1000,1200].map(x=>`<div class="rep"><div class="d">${x} m</div><div class="t">${fmt(iP*x/1000)}</div></div>`).join('');
    const rP=secPerKm(vd,FRAC.Rep);$('runR').innerHTML=[200,300,400].map(x=>`<div class="rep"><div class="d">${x} m</div><div class="t">${fmt(rP*x/1000)}</div></div>`).join('');
  }else{$('runpaces').innerHTML='';$('runI').innerHTML='';$('runR').innerHTML='';}
}


/* ======================= PERSISTENCE ======================= */
const FIELD_IDS=['cfrund','cf5k','cf400','cf200','cftp','weeks','swimcond','bmpos','bmmass','bmgrade','bmwind','bmalt','trigoal'];
const store={
  save(){try{
    const legs=[];document.querySelectorAll('.leg-in').forEach(el=>legs.push(el.value));
    const s={v:2,UNITS:{...UNITS},sport,curDist,mode:document.querySelector('#modetoggle [aria-selected="true"]')?.dataset.m||'solo',
      SPL:{strat:SPL.strat,len:{...SPL.len},start:SPL.start,temp:SPL.temp},
      times:{run:[...SPORTS.run.times],swim:[...SPORTS.swim.times],bike:[...SPORTS.bike.times]},
      idx:{run:SPORTS.run.i,swim:SPORTS.swim.i,bike:SPORTS.bike.i},
      fields:Object.fromEntries(FIELD_IDS.map(id=>[id,$(id)?.value??''])),legs};
    localStorage.setItem('splits.v1',JSON.stringify(s));
  }catch(e){}},
  load(){try{return JSON.parse(localStorage.getItem('splits.v1'))||null;}catch(e){return null;}}
};
let _saveT;document.addEventListener('input',()=>{clearTimeout(_saveT);_saveT=setTimeout(store.save,400);});
document.addEventListener('click',e=>{if(e.target.closest('button')){clearTimeout(_saveT);_saveT=setTimeout(store.save,400);}});
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{});

/* ======================= WIRING ======================= */
Array.from($('modetoggle').children).forEach(b=>b.addEventListener('click',()=>switchMode(b.dataset.m)));
Array.from($('sportseg').children).forEach(b=>b.addEventListener('click',()=>switchSport(b.dataset.s)));
$('gtime').addEventListener('input',()=>{$('gtime').value=maskTime($('gtime').value);SPORTS[sport].times[SPORTS[sport].i]=$('gtime').value;renderSolo();});
Array.from($('distseg').children).forEach(b=>b.addEventListener('click',()=>buildLegs(b.dataset.d)));
bindTime($('trigoal'),distributeGoal);
['bmpos','bmmass','bmgrade','bmwind','bmalt'].forEach(id=>$(id).addEventListener('input',()=>{computeRace();computeConv(true);}));
['swimcond','weeks'].forEach(id=>$(id).addEventListener('input',computeRace));
$('cfrund').addEventListener('input',()=>{computeRace();renderBench();});
bindTime($('cf5k'),()=>{computeRace();renderBench();});
bindTime($('cf400'),()=>{computeRace();renderBench();});
bindTime($('cf200'),()=>{computeRace();renderBench();});
$('cftp').addEventListener('input',()=>{computeRace();renderBench();});
$('cvpow').addEventListener('input',()=>computeConv(true));
$('cvspd').addEventListener('input',()=>computeConv(false));
// units
document.querySelectorAll('.upills').forEach(g=>Array.from(g.children).forEach(b=>b.addEventListener('click',()=>{
  if(UNITS[g.dataset.k]===b.dataset.v)return;
  UNITS[g.dataset.k]=b.dataset.v;
  Array.from(g.children).forEach(x=>x.setAttribute('aria-selected',x===b?'true':'false'));
  applyPool();switchSport(sport);
})));
// init both modes (restore saved state if present)
(function(){
  const s=store.load();
  if(s){
    try{
      // v1 shipped example fitness values as real input values — drop any still untouched
      if(s.v===1&&s.fields){const D={cf5k:'22:30',cf400:'6:24',cf200:'3:00',cftp:'225'};
        for(const k in D)if(s.fields[k]===D[k])s.fields[k]='';}
      Object.assign(UNITS,s.UNITS||{});applyPool();
      document.querySelectorAll('.upills').forEach(g=>Array.from(g.children).forEach(x=>x.setAttribute('aria-selected',x.dataset.v===UNITS[g.dataset.k]?'true':'false')));
      for(const k of ['run','swim','bike']){if(s.times?.[k])SPORTS[k].times=s.times[k];if(Number.isInteger(s.idx?.[k]))SPORTS[k].i=Math.min(s.idx[k],SPORTS[k].dists.length-1);}
      if(s.SPL){SPL.strat=s.SPL.strat||SPL.strat;Object.assign(SPL.len,s.SPL.len||{});SPL.start=s.SPL.start||'';SPL.temp=s.SPL.temp||'';}
      for(const id of FIELD_IDS){if($(id)&&s.fields&&id in s.fields)$(id).value=s.fields[id];}
    }catch(e){}
  }
  switchSport(s?.sport||'run');
  buildLegs(s?.curDist||'70.3');
  if(s?.legs?.length){const els=document.querySelectorAll('.leg-in');if(els.length===s.legs.length){els.forEach((el,i)=>el.value=s.legs[i]);computeRace();}}
  renderBench();computeConv(true);
  switchMode(s?.mode==='tri'?'tri':'solo');
})();
