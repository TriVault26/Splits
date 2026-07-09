/* ======================= SHARED ENGINE =======================
   Lifted from Splits. so paces, power and send-offs match the
   calculator exactly: Daniels VDOT (run), CSS (swim), Coggan (bike). */
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
// run, Daniels
const dPct=t=>0.8+0.1894393*Math.exp(-0.012778*t)+0.2989558*Math.exp(-0.1932605*t);
const dVO2=v=>-4.60+0.182258*v+0.000104*v*v;
const vdotFromRace=(d,s)=>{const t=s/60,v=d/t;return dVO2(v)/dPct(t);};
const velFromVO2=x=>{const a=0.000104,b=0.182258,c=-4.60-x;return(-b+Math.sqrt(b*b-4*a*c))/(2*a);};
const secPerKm=(vd,f)=>60000/velFromVO2(f*vd);
const timeForVdot=(d,vd)=>{let lo=d/8,hi=d/0.5;for(let i=0;i<60;i++){const mid=(lo+hi)/2;if(vdotFromRace(d,mid)>vd)lo=mid;else hi=mid;}return (lo+hi)/2;};
const FRAC={Easy:.70,Marathon:.84,Threshold:.88,Interval:.98,Rep:1.05};
// swim, CSS
const cssPer100=(t4,t2)=>(t4-t2)/2;
// bike, physics + Coggan
const ZONES=[['Z1','Active recovery',0,.55],['Z2','Endurance',.56,.75],['Z3','Tempo',.76,.90],['Z4','Threshold',.91,1.05],['Z5','VO₂max',1.06,1.20],['Z6','Anaerobic',1.21,1.50],['Z7','Neuromuscular',1.51,null]];
const powerFromSpeed=(v,m)=>{const g=9.80665,an=Math.atan(m.grade/100),va=v+m.windMs;return (g*Math.sin(an)*m.mass*v+g*Math.cos(an)*m.mass*m.Crr*v+0.5*m.rho*m.CdA*va*Math.abs(va)*v)/m.dt;};
const speedFromPower=(P,m)=>{let lo=.3,hi=30;for(let i=0;i<60;i++){const mid=(lo+hi)/2;if(powerFromSpeed(mid,m)<P)lo=mid;else hi=mid;}return (lo+hi)/2;};
// tri coupling: overbike ceilings, OTB run penalty, honest progress rates
const CEIL={Sprint:0.95,Olympic:0.88,'70.3':0.82,Ironman:0.70};
const ROB={Sprint:5,Olympic:8,'70.3':12,Ironman:18};
const runPenalty=(k,IF)=>ROB[k]+Math.min(36,Math.max(0,IF-CEIL[k])*100*6);
const RATE={swim:0.35,bike:0.35,run:0.17};   // per week: s/100, %FTP, VDOT pts
const CONSISTENCY=0.85;
const bikeModel=(mass=78)=>({CdA:.26,mass,grade:0,windMs:0,rho:1.225,Crr:0.005,dt:0.975});

/* ======================= RACE MODEL ======================= */
const TRI={
  Sprint :{swim:750, bike:20000, run:5000,    IF:.95, t1:60, t2:45, swimOff:-3, rf:1.00, peakHrs:6,  taper:1, peak:2},
  Olympic:{swim:1500,bike:40000, run:10000,   IF:.88, t1:90, t2:60, swimOff:0,  rf:1.02, peakHrs:8,  taper:1, peak:2},
  '70.3' :{swim:1900,bike:90000, run:21097.5, IF:.83, t1:180,t2:120,swimOff:3,  rf:1.05, peakHrs:11, taper:2, peak:3},
  Ironman:{swim:3800,bike:180000,run:42195,   IF:.72, t1:300,t2:240,swimOff:7,  rf:1.08, peakHrs:15, taper:2, peak:3},
};
const RUN={  // run-only blocks
  '10k'     :{run:10000,   rf:1.00, peakHrs:6,  taper:1, peak:2},
  'Half'    :{run:21097.5, rf:1.02, peakHrs:7,  taper:1, peak:2},
  'Marathon':{run:42195,   rf:1.05, peakHrs:9,  taper:2, peak:3},
};

/* ======================= ROSTER =======================
   Two Islands Endurance foundation crew. Numbers are the doc-known
   anchors; blanks are honest gaps to fill, estimates are flagged. */
const ROSTER=[
  {id:'ollie', name:'Ollie', full:'Oliver King', mode:'tri', dist:'70.3', days:6, priority:'A',
   run:'38:30', rund:10000, s400:'7:04', s200:'3:20', ftp:'255', pool:25, floor:3, shift:1,
   race:'70.3 New Zealand', raceDate:'',
   limiter:'Swim', note:'Firefighter, 8 day rotation (2 day, 2 night, 4 off). Swim limiter, CSS ~1:52. Swim 3x/week is non negotiable. Strong cyclist. Place Tue and Sat quality on off or day shift days, keep nights light. Run fitness likely understated: get a clean open benchmark before loading it (10k and FTP here are estimates).'},
  {id:'jacob', name:'Jacob', full:'Jacob Wall', mode:'tri', dist:'70.3', days:6, priority:'A',
   run:'1:37:00', rund:21097.5, s400:'', s200:'', ftp:'', pool:25, floor:2, shift:0,
   race:'70.3 New Zealand', raceDate:'',
   limiter:'Balanced', note:'Most reliable race execution in the group, genuine negative splitter with a progressive HR build. Trust his benchmarks for 70.3 run prediction. Add swim and FTP to complete the picture.'},
  {id:'chris', name:'Chris', full:'Chris Davies', mode:'tri', dist:'70.3', days:6, priority:'A',
   run:'1:22:00', rund:21097.5, s400:'', s200:'', ftp:'', pool:33, floor:2, shift:0,
   race:'70.3 New Zealand', raceDate:'',
   limiter:'Pacing', note:'Strongest open fitness in the tri group. Positive split tendency: a discipline issue, not a ceiling, so build negative split progressions into the sessions. Hamstring resolved. Trains in a 33m pool, reps convert by 1.32 to land on the wall.'},
  {id:'barney',name:'Barney',full:'Barney', mode:'run', dist:'Marathon', days:5, priority:'A',
   run:'18:30', rund:5000, s400:'', s200:'', ftp:'', pool:25, floor:0, shift:0,
   race:'Taupo Marathon', raceDate:'2026-08-01',
   limiter:'Fuelling / durability', note:'Marathon block for Taupo, 1 Aug 2026. Sub 2:50 off a 2:55 that faded on fuelling, not speed (first half only ~3 s/km off). VDOT 54 from a 1:19 HM PB. Emphasis: late race MP volume and fuelling rehearsal in every long run, threshold secondary. Re benchmark weeks 5 to 6 for a shift toward VDOT 56.'},
  {id:'phil',  name:'Phil', full:'Phil Cunningham', mode:'tri', dist:'70.3', days:5, priority:'B',
   run:'', rund:10000, s400:'', s200:'', ftp:'', pool:25, floor:2, shift:0,
   race:'Challenge Wānaka 100', raceDate:'2027-02-20',
   limiter:'Back half lift', note:'On a cycling block now (SCTC series), re engage ~Oct 2026 for Challenge Wānaka, 20 Feb 2027. Good aerobic control but does not shift gears late: build a deliberate mid race lift cue, for example km 6 to 8 in a 10k. Prioritise swim re entry and run durability, bike carries over.'},
  {id:'custom',name:'Custom',full:'Custom athlete', mode:'tri', dist:'70.3', days:6, priority:'A',
   run:'', rund:10000, s400:'', s200:'', ftp:'', pool:25, floor:2, shift:0,
   race:'', raceDate:'', limiter:'', note:'Blank slate. Enter fitness and a target to build any athlete.'},
];

/* ======================= STATE ======================= */
let sel='ollie';
const state={data:{}};   // per-athlete: {fields, planStart, done}
const FIELDS=['racedate','days','priority','hours','goal','cfrund','cf5k','cf400','cf200','cftp','pool','swimfloor','shift'];
const A=()=>ROSTER.find(a=>a.id===sel);
function distMap(){return A().mode==='run'?RUN:TRI;}
function curDist(){const seg=$('distseg').querySelector('[aria-selected="true"]');return seg?seg.dataset.d:A().dist;}

const store={
  save(){try{
    const d=state.data[sel]||(state.data[sel]={});
    d.fields=Object.fromEntries(FIELDS.map(id=>[id,$(id)?.value??'']));
    d.dist=curDist();
    localStorage.setItem('blocks.coach.v1',JSON.stringify({sel,data:state.data}));
  }catch(e){}},
  load(){try{return JSON.parse(localStorage.getItem('blocks.coach.v1'))||null;}catch(e){return null;}}
};

/* ======================= FITNESS ======================= */
function fitness(){
  const t=parseTime($('cf5k').value),rd=num($('cfrund').value)||5000;
  return {
    vdot:(isFinite(t)&&t>0)?vdotFromRace(rd,t):NaN,
    css :cssPer100(parseTime($('cf400').value),parseTime($('cf200').value)),
    ftp :num($('cftp').value)
  };
}
function project(F,weeks){
  const w=Math.max(0,weeks)*CONSISTENCY;
  return {
    vdot:isFinite(F.vdot)?Math.min(F.vdot+6, F.vdot+RATE.run*w):NaN,
    css :isFinite(F.css) ?Math.max(F.css*0.88, F.css-RATE.swim*w):NaN,
    ftp :isFinite(F.ftp) ?Math.min(F.ftp*1.15, F.ftp*(1+RATE.bike/100*w)):NaN
  };
}
function predictTri(F,key){
  const d=TRI[key],m=bikeModel();
  let sw=NaN,bk=NaN,rn=NaN;
  if(isFinite(F.css))sw=(F.css+d.swimOff)/100*d.swim;
  if(isFinite(F.ftp))bk=d.bike/speedFromPower(F.ftp*d.IF,m);
  if(isFinite(F.vdot)){const fresh=timeForVdot(d.run,F.vdot),pen=runPenalty(key,d.IF);rn=(fresh/(d.run/1000)+pen)*d.rf*(d.run/1000);}
  const parts=[sw,d.t1,bk,d.t2,rn];
  return {sw,bk,rn,total:parts.every(x=>isFinite(x))?parts.reduce((a,b)=>a+b,0):NaN};
}
function predictRun(F,key){
  const d=RUN[key];if(!isFinite(F.vdot))return {total:NaN};
  return {total:timeForVdot(d.run,F.vdot)*d.rf};
}

/* ======================= PERIODISATION ======================= */
function weeksToRace(){
  const raw=$('racedate').value;if(!raw)return NaN;
  const race=new Date(raw+'T00:00:00');if(isNaN(race))return NaN;
  const now=new Date();now.setHours(0,0,0,0);
  return Math.ceil((race-now)/(7*86400000));
}
function planStart(){const d=state.data[sel];return d&&d.planStart?d.planStart:null;}
function currentWeekIdx(total){
  const ps=planStart();if(!ps)return 1;
  const start=new Date(ps+'T00:00:00'),now=new Date();now.setHours(0,0,0,0);
  return Math.max(1,Math.min(total,Math.floor((now-start)/(7*86400000))+1));
}
function weekStartDate(i){const ps=planStart();const start=ps?new Date(ps+'T00:00:00'):new Date();
  const d=new Date(start);d.setDate(d.getDate()+(i-1)*7);return d;}
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const dateLbl=d=>`${d.getDate()} ${MON[d.getMonth()]}`;

function meta(){const key=curDist();return distMap()[key]||TRI['70.3'];}
function taperWeeks(){return $('priority').value==='B'?0:meta().taper;}  // B races train through
function phaseOf(i,total){
  const m=meta(),fromEnd=total-i,tp=taperWeeks();
  if(fromEnd===0)return 'Race';
  if(fromEnd<tp)return 'Taper';
  if(fromEnd<tp+m.peak)return 'Peak';
  const trainable=total-1-tp-m.peak;
  const buildW=Math.max(2,Math.round(trainable*0.42));
  if(fromEnd<tp+m.peak+buildW)return 'Build';
  return 'Base';
}
function isRecovery(i,total,phase){                 // 3:1 loading
  if(phase==='Peak'||phase==='Taper'||phase==='Race')return false;
  return i%4===0 && (total-i)>=3;
}
function loadFactor(i,total,phase,rec){
  let L;
  if(phase==='Race')L=0.30;
  else if(phase==='Taper')L=(total-i)<=1?0.42:0.62;
  else if(phase==='Peak')L=1.00;
  else if(phase==='Build')L=0.86+0.14*prog(i,firstOf('Build',total),lastOf('Build',total));
  else L=0.60+0.24*prog(i,firstOf('Base',total),lastOf('Base',total));
  if(rec)L*=0.62;
  return L;
}
const prog=(i,a,b)=>b>a?(i-a)/(b-a):1;
function firstOf(ph,total){for(let i=1;i<=total;i++)if(phaseOf(i,total)===ph)return i;return 1;}
function lastOf(ph,total){for(let i=total;i>=1;i--)if(phaseOf(i,total)===ph)return i;return total;}

/* ======================= SESSION LIBRARY =======================
   Weekly anchors are the real Two Islands fixtures:
   Tue = Track Tuesday (quality run), Wed = Zwift ride, Thu = squad swim.
   Quality run never stacks back-to-back with Track Tuesday. */
const DOW=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const fmtDur=min=>{min=Math.max(15,Math.round(min/5)*5);if(min>=60){const h=Math.floor(min/60),m=min%60;return m?`${h}h${String(m).padStart(2,'0')}`:`${h}h`;}return `${min}m`;};

function targets(F,pool){
  const conv=pool==33?1.32:1;                       // 33m pool: reps land on the wall
  const rep=d=>pool==33?`${Math.round(d*conv)} (${Math.round(d*conv/33)}×33m)`:`${d}`;
  return {
    pk:f=>isFinite(F.vdot)?fmt(secPerKm(F.vdot,f)):'–:––',
    zr:(lo,hi)=>isFinite(F.ftp)?`${Math.round(lo*F.ftp)}–${Math.round(hi*F.ftp)}w`:'—',
    racePow:k=>isFinite(F.ftp)?Math.round((TRI[k]?TRI[k].IF:.83)*F.ftp)+'w':'—',
    sc:o=>isFinite(F.css)?fmt(F.css+o):'—',
    send:()=>isFinite(F.css)?fmt(Math.ceil((F.css+10)/5)*5):'—',
    rep
  };
}

/* one prescription: {sport,int,name,set,key,brick} */
function prescribe(slot,phase,rec,F,ctx){
  const long=ctx.long,T=targets(F,ctx.pool),P=rec?'Recovery':phase;
  let name='',set='',int='Easy',brick=false,key=false;
  switch(slot){
    case 'runQual':   // Track Tuesday
      name='Track Tuesday';key=true;
      if(P==='Recovery'){int='Easy';set=`Easy ${T.pk(FRAC.Easy)}/km + 6×20s strides. Legs only.`;}
      else if(P==='Base'){int='Tempo';set=`Aerobic build: 8×20s strides after an easy run, or 20 min @ ${T.pk(FRAC.Marathon)}/km steady.`;}
      else if(P==='Build'){int='Threshold';set=`${long?'5×1 km':'4×1 km'} @ ${T.pk(FRAC.Threshold)}/km, 90s jog. Even to negative across reps.`;}
      else if(P==='Peak'){int='VO₂';set=`6×800 m @ ${T.pk(FRAC.Interval)}/km, 400 jog. Hold form on the last two.`;}
      else if(P==='Taper'){int='VO₂';set=`4×400 @ ${T.pk(FRAC.Interval)}/km, full recovery. Sharpen, do not dig.`;}
      break;
    case 'bikeRide':  // Wednesday Zwift
      name='Zwift ride';key=true;
      if(P==='Recovery'){int='Recovery';set=`Easy spin Z1–Z2 ${T.zr(.45,.65)}, high cadence.`;}
      else if(P==='Base'){int='Endurance';set=`Z2 ${T.zr(.56,.75)} with 3×8 min sweet spot ${T.zr(.88,.94)}, 4 min easy.`;}
      else if(P==='Build'){int='Threshold';set=`${long?'4×10':'4×8'} min @ ${T.zr(.95,1.05)}, 4 min easy. Group ride, hold the wheel at threshold.`;}
      else if(P==='Peak'){int='VO₂';set=`5×3 min @ ${T.zr(1.06,1.20)}, 3 min easy. Top end.`;}
      else if(P==='Taper'){int='Threshold';set=`3×4 min @ ${T.zr(.95,1.05)}, full recovery.`;}
      break;
    case 'swimThr':   // Thursday squad
      name='Squad swim';key=true;
      if(P==='Recovery'){int='Technique';set=`Easy 1500, drills. Feel not fatigue.`;}
      else if(P==='Base'){int='Threshold';set=`${long?'8':'6'}×${T.rep(150)} @ CSS ${T.sc(0)}/100 on ${T.send()}. Smooth.`;}
      else if(P==='Build'){int='Threshold';set=`${long?'10':'8'}×${T.rep(100)} @ CSS ${T.sc(0)}/100 on ${T.send()}. Hold every one.`;}
      else if(P==='Peak'){int='Race';set=`Race sim ${long?'3×'+T.rep(400):'4×'+T.rep(200)} @ CSS +2 ${T.sc(2)}/100, sight every 6 strokes.`;}
      else if(P==='Taper'){int='Race';set=`1200 with 6×${T.rep(50)} fast, long rest. Sharpen only.`;}
      break;
    case 'bikeLong':
      name='Long ride';key=true;
      if(P==='Recovery'){int='Endurance';set=`Steady Z2 ${T.zr(.56,.75)}, cut it short.`;}
      else if(P==='Base'){int='Endurance';set=`Aerobic Z2 ${T.zr(.56,.75)} throughout. Build the diesel.`;}
      else if(P==='Build'){int='Endurance';set=`Z2 base + ${long?'3×12':'2×10'} min sweet spot ${T.zr(.88,.94)}. Then 15 min run off the bike, easy.`;brick=true;}
      else if(P==='Peak'){int='Race';set=`${long?'3×20':'3×10'} min @ ${T.racePow(ctx.key)} race power, Z2 between. ${long?'25':'15'} min run @ race pace off the bike.`;brick=true;}
      else if(P==='Taper'){int='Endurance';set=`40 min easy + 4×3 min @ ${T.zr(.95,1.05)}.`;}
      break;
    case 'runLong':
      name='Long run';key=true;
      if(P==='Recovery'){int='Long';set=`Easy ${T.pk(FRAC.Easy)}/km, time on feet only.`;}
      else if(P==='Base'){int='Long';set=`Easy ${T.pk(FRAC.Easy)}/km the whole way. Conversational.`;}
      else if(P==='Build'){int='Long';set=`Easy ${T.pk(FRAC.Easy)}/km, last ${long?'20':'10'} min @ ${T.pk(FRAC.Marathon)}/km.`;}
      else if(P==='Peak'){int='Long';set=`Middle ${long?'30':'15'} min @ ${T.pk(FRAC.Marathon)}/km, hold form when it bites.`;}
      else if(P==='Taper'){int='Long';set=`Shorter easy ${T.pk(FRAC.Easy)}/km + 5×20s strides.`;}
      break;
    case 'swimEnd':
      name='Swim, endurance';
      if(P==='Peak'){int='Endurance';set=`${long?'2×'+T.rep(800):'3×'+T.rep(300)} @ CSS +3 ${T.sc(3)}/100, form when tired.`;}
      else if(P==='Taper'){int='Technique';set=`Easy 1200, drills.`;}
      else {int='Endurance';set=`${long?'4×'+T.rep(400):'3×'+T.rep(300)} @ CSS +5 ${T.sc(5)}/100, 20s rest. Aerobic.`;}
      break;
    case 'swimTech':
      name='Swim, technique';int='Technique';
      set=`Drills + 10×${T.rep(50)} builds. Third swim for the limiter, keep it light and clean.`;
      break;
    case 'runEasy':
      name='Easy run';int='Easy';
      set=`Easy recovery ${T.pk(FRAC.Easy)}/km, conversational. Brick off any ride if time is short.`;
      break;
    /* run-only block sessions */
    case 'mpLong':
      name='Long run';key=true;int='Long';
      if(P==='Recovery')set=`Easy ${T.pk(FRAC.Easy)}/km, shorter. Rehearse fuel anyway.`;
      else if(P==='Peak')set=`Big MP block: ${long?'2×30':'3×15'} min @ ${T.pk(FRAC.Marathon)}/km inside the long run. Full race fuelling, every gel on schedule.`;
      else if(P==='Taper')set=`Cut duration, keep 15 min @ ${T.pk(FRAC.Marathon)}/km + strides. Fuel as per race.`;
      else set=`Progressive: last ${long?'25':'15'} min @ ${T.pk(FRAC.Marathon)}/km. Fuelling rehearsal is the point, take a gel every 25 min.`;
      break;
    case 'mpQual':
      name='Track Tuesday';key=true;
      if(P==='Peak'||P==='Build'){int='Threshold';set=`${long?'6×1 km':'5×1 km'} @ ${T.pk(FRAC.Threshold)}/km, 75s jog. Threshold is secondary support here.`;}
      else if(P==='Taper'){int='VO₂';set=`4×400 @ ${T.pk(FRAC.Interval)}/km, full recovery.`;}
      else {int='Tempo';set=`20 min @ ${T.pk(FRAC.Marathon)}/km + 6×20s strides.`;}
      break;
  }
  return {sport:slot.startsWith('bike')?'bike':slot.startsWith('swim')?'swim':'run',int,name,set,key,brick};
}

/* build the ordered week for the selected athlete */
function weekTemplate(){
  const a=A(),floor=parseInt($('swimfloor').value)||0,days=Math.max(3,Math.min(7,parseInt($('days').value)||6));
  if(a.mode==='run'){
    // run block: Track Tuesday quality, long run Sunday, easy fillers, MP focus
    let t=[{d:'Tue',s:'mpQual',w:.20},{d:'Sun',s:'mpLong',w:.34},{d:'Thu',s:'runEasy',w:.16},{d:'Sat',s:'runEasy',w:.16},{d:'Mon',s:'runEasy',w:.14}];
    return t.slice(0,Math.max(3,days));
  }
  // tri: fixed anchors first, then fill, then enforce swim floor
  const anchors=[
    {d:'Tue',s:'runQual', w:.12},   // Track Tuesday
    {d:'Wed',s:'bikeRide',w:.16},   // Zwift
    {d:'Thu',s:'swimThr', w:.10},   // squad swim
    {d:'Sat',s:'bikeLong',w:.24},
    {d:'Sun',s:'runLong', w:.18},
  ];
  const fillers=[
    {d:'Mon',s:'swimEnd', w:.10},
    {d:'Fri',s:'runEasy', w:.06},
  ];
  let week=anchors.slice();
  for(const f of fillers){if(week.length>=days)break;week.push(f);}
  // swim floor: count swims, add a technique swim on Fri if short
  let swims=week.filter(x=>x.s.startsWith('swim')).length;
  if(swims<floor){
    const fri=week.find(x=>x.d==='Fri');
    if(fri){fri.s='swimTech';fri.w=.06;swims++;}
    else {week.push({d:'Fri',s:'swimTech',w:.06});swims++;}
  }
  return week;
}

function buildWeek(i,total){
  const phase=phaseOf(i,total),rec=isRecovery(i,total,phase),load=loadFactor(i,total,phase,rec);
  const key=curDist(),m=meta();
  const hours=(num($('hours').value)>0?num($('hours').value):m.peakHrs)*load;
  const F=fitness(),a=A(),pool=parseInt($('pool').value)||25;
  const long=(a.mode==='run')?(key==='Marathon'):(key==='70.3'||key==='Ironman');
  const tmpl=phase==='Race'?[]:weekTemplate();
  const sumW=tmpl.reduce((s,x)=>s+x.w,0)||1;
  const ctx={long,pool,key};
  const byDay={};let swims=0;
  tmpl.forEach(x=>{
    const pr=prescribe(x.s,phase,rec,F,ctx);
    if(pr.sport==='swim')swims++;
    byDay[x.d]={id:x.s,dow:x.d,min:hours*60*x.w/sumW,...pr};
  });
  return {i,phase,rec,load,hours,byDay,swims,start:weekStartDate(i)};
}

/* ======================= RENDER ======================= */
function render(){
  renderRoster();
  const a=A();
  $('athnote').innerHTML=a.id==='custom'?'':`<b>${a.full}</b> · ${a.limiter?a.limiter+' limiter · ':''}${a.mode==='run'?'run block':a.dist} · ${a.priority} priority${a.race?' · '+a.race:''}<span>${a.note}</span>`;
  const total=weeksToRace(),F=fitness();
  renderVerdict(F,total);renderZones(F);
  if(!isFinite(total)||total<1){
    $('phasebar').innerHTML='';$('weeks').innerHTML=`<div class="empty-note">Set a race date in the future and the block appears here, one week per row.</div>`;
    $('blocksub').textContent='set a race date';$('review').textContent=a.id==='custom'?'Enter a target and date.':'Set a race date to generate the week.';return;
  }
  if(!planStart()){(state.data[sel]=state.data[sel]||{}).planStart=isoToday();store.save();}
  const cur=currentWeekIdx(total);
  $('blocksub').textContent=`${total} weeks · in week ${cur}`;
  $('phasebar').innerHTML=Array.from({length:total},(_,k)=>{const wi=k+1,ph=phaseOf(wi,total),rc=isRecovery(wi,total,ph);
    return `<div class="phaseseg ph-${ph}${wi===cur?' now':''}${rc?' rec':''}" data-w="${wi}" title="Week ${wi} · ${ph}${rc?' (recovery)':''}"></div>`;}).join('');
  $('phasebar').querySelectorAll('.phaseseg').forEach(el=>el.addEventListener('click',()=>{const w=$('wk'+el.dataset.w);if(w){w.open=true;w.scrollIntoView({behavior:'smooth',block:'center'});}}));
  let html='';for(let i=1;i<=total;i++)html+=weekHtml(buildWeek(i,total),cur);
  $('weeks').innerHTML=html;wireWeeks(total,cur);
  renderReview(buildWeek(cur,total),cur,total);
}
function renderRoster(){
  $('roster').innerHTML=ROSTER.map(a=>`<button class="rpill${a.id===sel?' on':''}" data-a="${a.id}">${a.name}</button>`).join('');
  $('roster').querySelectorAll('.rpill').forEach(b=>b.addEventListener('click',()=>selectAthlete(b.dataset.a)));
}
const INTC={Recovery:'#B9B7AC',Easy:'#6E8B3D',Endurance:'#0E7C86',Technique:'#0E7C86',Tempo:'#C96A1B',Threshold:'#A66B00','VO₂':'#D8331F',Long:'#3A3F45',Race:'#14171A',Strength:'#7A7E76'};
function weekHtml(W,cur){
  const isNow=W.i===cur,pct=Math.round(W.load*100);
  const dn=Object.keys(W.byDay).filter(d=>isDone(W.i,W.byDay[d].id)).length,tot=Object.keys(W.byDay).length;
  let days='';
  for(const dow of DOW){
    const s=W.byDay[dow];
    if(!s){days+=`<div class="day rest"><span class="tk"></span><span class="dow">${dow}</span><div><div class="snm">Rest / mobility</div></div><span class="sdur"></span></div>`;continue;}
    const pressed=isDone(W.i,s.id),shiftFlag=(+$('shift').value&&s.key)?'<span class="shiftn">shift: on off/day only</span>':'';
    days+=`<div class="day ${s.sport}"><span class="tk"></span><span class="dow">${dow}</span>
      <div><div class="snm">${s.name}${s.key?'<span class="kbadge">Key</span>':''}${s.brick?'<span class="kbadge brk">Brick</span>':''}<span class="intt" style="background:${INTC[s.int]||'#7A7E76'}">${s.int}</span></div>
      <div class="sset">${s.set}${shiftFlag}</div>
      <div class="done"><button class="done-btn" data-w="${W.i}" data-k="${s.id}" aria-pressed="${pressed}"><span class="bx"></span>${pressed?'Done':'Mark done'}</button></div></div>
      <span class="sdur">${fmtDur(s.min)}</span></div>`;
  }
  const rc=W.rec?'<span class="rc">Recovery</span>':'';
  const end=new Date(W.start);end.setDate(end.getDate()+6);
  return `<details class="wk ${isNow?'now':''}" id="wk${W.i}" ${isNow?'open':''}>
    <summary><span class="wtag ph-${W.phase}"></span>
      <div class="wk-t">Week ${W.i} · ${W.phase}${rc} ${isNow?'<span class="nowtag">This week</span>':''}</div>
      <div class="wk-hrs">${W.hours.toFixed(1)}<small>hrs · ${pct}% · ${W.swims} swim${W.swims===1?'':'s'}</small></div>
      <div class="wk-sub">${dateLbl(W.start)}–${dateLbl(end)} · ${rationale(W)}</div>
      <div class="loadbar"><i style="width:${pct}%"></i></div>
    </summary>
    <div class="wk-body">${days}
      <div class="wk-foot"><span>Week done</span><span class="prog" id="prog${W.i}">${dn}/${tot}</span></div>
    </div>
  </details>`;
}
function rationale(W){
  const p=W.phase;
  if(p==='Race')return 'race week, open the taps';
  if(p==='Taper')return 'taper, volume down, keep it sharp';
  if(W.rec)return '3:1 recovery week, absorb the block';
  if(p==='Base')return 'aerobic base, build the engine';
  if(p==='Build')return 'build, threshold and race power on';
  if(p==='Peak')return 'peak, race specific and sharp';
  return '';
}
function wireWeeks(total,cur){
  $('weeks').querySelectorAll('.done-btn').forEach(btn=>btn.addEventListener('click',()=>{
    const wi=+btn.dataset.w,k=btn.dataset.k,now=!isDone(wi,k);
    setDone(wi,k,now);
    btn.setAttribute('aria-pressed',now);btn.innerHTML=`<span class="bx"></span>${now?'Done':'Mark done'}`;
    const W=buildWeek(wi,total),tot=Object.keys(W.byDay).length,dn=Object.keys(W.byDay).filter(d=>isDone(wi,W.byDay[d].id)).length;
    const p=$('prog'+wi);if(p)p.textContent=`${dn}/${tot}`;store.save();
  }));
}
function renderVerdict(F,total){
  const a=A(),anyFit=isFinite(F.vdot)||isFinite(F.css)||isFinite(F.ftp);
  if(!isFinite(total)||total<1){$('projgrid').innerHTML='';$('predict').style.display='none';$('vnote').innerHTML='';
    $('synth').textContent=a.id==='custom'?'Enter a target and date to build the block.':'Set a race date to build the block.';return;}
  const wk=Math.max(1,total-1),P=project(F,wk);
  const col=(cls,name,rows)=>`<div class="col ${cls}"><h4><span class="dt"></span>${name}</h4>${rows}</div>`;
  const ln=(k,v,up)=>`<div class="ln"><span class="k">${k}</span><span class="v ${up?'up':''}">${v}</span></div>`;
  const cols=[];
  cols.push(col('r','Run',isFinite(F.vdot)?ln('VDOT now',F.vdot.toFixed(1))+ln('Race wk',P.vdot.toFixed(1),true)+ln('5k now',fmt(timeForVdot(5000,F.vdot))):'<div class="empty">Add a run race.</div>'));
  if(a.mode!=='run'){
    cols.unshift(col('b','Bike',isFinite(F.ftp)?ln('FTP now',Math.round(F.ftp)+'w')+ln('Race wk',Math.round(P.ftp)+'w',true)+ln('Race power',Math.round((TRI[curDist()]?.IF||.83)*F.ftp)+'w'):'<div class="empty">Add FTP.</div>'));
    cols.unshift(col('s','Swim',isFinite(F.css)?ln('CSS now',fmt(F.css)+'/100')+ln('Race wk',fmt(P.css)+'/100',true)+ln('5k @ CSS',fmt(F.css*15)):'<div class="empty">Add 400 &amp; 200.</div>'));
  }
  $('projgrid').innerHTML=cols.join('');
  const goal=parseTime($('goal').value),pred=a.mode==='run'?predictRun(P,curDist()):predictTri(P,curDist());
  if(isFinite(pred.total)){
    $('predict').style.display='';$('predv').textContent=fmt(pred.total);
    $('predict').querySelector('.chip')?.remove();let note='';
    if(isFinite(goal)&&goal>=600){
      const diff=pred.total-goal,pc=diff/goal;let chip;
      if(diff<=0){chip='<span class="chip ok">On track</span>';note=`<div class="vnote ok">Projects <span class="cmono">${fmt(pred.total)}</span> at ~85% consistency, inside the <span class="cmono">${fmt(goal)}</span> goal. Hold the key sessions.</div>`;}
      else if(pc<=0.05){chip='<span class="chip warn">Stretch</span>';note=`<div class="vnote warn">Projects <span class="cmono">${fmt(pred.total)}</span> vs <span class="cmono">${fmt(goal)}</span>, about <span class="cmono">${fmt(diff)}</span> short. Reachable if the peak block lands and no weeks get missed.</div>`;}
      else{chip='<span class="chip bad">Fantasy</span>';note=`<div class="vnote bad">Projects <span class="cmono">${fmt(pred.total)}</span> vs <span class="cmono">${fmt(goal)}</span>, <span class="cmono">${fmt(diff)}</span> off in ${total} weeks. Push the date or soften the goal. The honest number is above.</div>`;}
      $('predict').insertAdjacentHTML('beforeend',chip);$('vnote').innerHTML=note;
    } else $('vnote').innerHTML=`<div class="vnote ok">Add a goal finish to reality check it against this projection.</div>`;
  } else {$('predict').style.display='none';$('vnote').innerHTML=`<div class="vnote warn">Add fitness to project a finish.</div>`;}
  $('synth').innerHTML=anyFit
    ? `<b>${total}</b> weeks to <b>${a.name}</b>'s ${a.mode==='run'?curDist().toLowerCase()+' block':curDist()}. Base to build the engine, ${$('priority').value==='B'?'trained through as a B race (no full taper)':'a peak block then taper'}. Sessions use current fitness, the read shows where consistent work lands by race week.`
    : `<b>${total}</b> weeks to ${a.name}'s target. Add fitness above and every session and the projection fill in.`;
}
function renderZones(F){
  const a=A(),parts=[];
  if(a.mode!=='run'&&isFinite(F.css)){const c=F.css,so=Math.ceil((c+10)/5)*5;
    parts.push(`<div class="seclabel">Swim <span class="n">CSS · /100</span></div><div class="band">${zrow('Threshold','race pace engine',fmt(c))}${zrow('Endurance','CSS +5',fmt(c+5))}${zrow('VO₂ / speed','CSS −4',fmt(c-4))}${zrow('Send-off','threshold reps on',fmt(so))}</div>`);}
  if(a.mode!=='run'&&isFinite(F.ftp)){parts.push(`<div class="seclabel">Bike <span class="n">Coggan · watts</span></div><div class="band">${ZONES.map(([z,name,lo,hi],i)=>{const w=hi?`${Math.round(lo*F.ftp)}–${Math.round(hi*F.ftp)}`:`${Math.round(lo*F.ftp)}+`,op=(0.28+i*0.11).toFixed(2);return `<div class="zone"><span class="zbar" style="background:var(--bike);opacity:${op}"></span><span class="zname"><b>${z}</b><span>${name}</span></span><span class="zw">${w}<small> w</small></span></div>`;}).join('')}</div>`);}
  if(isFinite(F.vdot)){const paces=[['Easy','recovery / aerobic',FRAC.Easy],['Marathon','long steady',FRAC.Marathon],['Threshold','tempo / cruise',FRAC.Threshold],['Interval','VO₂ effort',FRAC.Interval],['Rep','speed',FRAC.Rep]];
    parts.push(`<div class="seclabel">Run <span class="n">VDOT ${F.vdot.toFixed(1)} · /km</span></div><div class="band">${paces.map(([n,d,f])=>zrow(n,d,fmt(secPerKm(F.vdot,f))+' /km')).join('')}</div>`);}
  $('zones').innerHTML=parts.length?parts.join(''):`<div class="empty-note">Add fitness above and the zones appear here.</div>`;
}
const zrow=(n,d,v)=>`<div class="row"><div class="lab"><b>${n}</b><span>${d}</span></div><div class="val">${v}</div></div>`;

/* ---------- coach review sheet ---------- */
function renderReview(W,cur,total){
  const a=A(),end=new Date(W.start);end.setDate(end.getDate()+6);
  const L=[];
  L.push(`${a.full.toUpperCase()} — Week ${cur} of ${total} · ${W.phase}${W.rec?' (recovery)':''}`);
  L.push(`${a.mode==='run'?curDist()+' block':curDist()} · ${$('priority').value} priority${a.race?' · '+a.race:''}`);
  L.push(`${dateLbl(W.start)} to ${dateLbl(end)} · ${W.hours.toFixed(1)} hrs · ${Math.round(W.load*100)}% of peak · ${W.swims} swim${W.swims===1?'':'s'}`);
  L.push(`Rationale: ${rationale(W)}.`);
  L.push('');
  for(const dow of DOW){
    const s=W.byDay[dow];
    if(!s){L.push(`${dow}  Rest / mobility`);continue;}
    L.push(`${dow}  [${s.int}] ${s.name}  (${fmtDur(s.min)})`);
    L.push(`      ${stripHtml(s.set)}`);
  }
  L.push('');
  const flags=[];
  if(+$('shift').value)flags.push('Shift: place Tue and Sat quality on off or day shift days, keep sessions light around nights.');
  if(parseInt($('pool').value)===33)flags.push('Pool: 33m, swim reps shown at converted distances so they land on the wall (base ×1.32).');
  if(a.limiter==='Pacing')flags.push('Pacing: build negative split progressions, do not let the interval sets drift positive.');
  if(a.limiter==='Back half lift')flags.push('Race craft: rehearse a deliberate mid race lift cue in the harder sets.');
  if(a.mode==='run')flags.push('Fuelling: rehearse race fuel in every long run, a gel on schedule, durability is the target.');
  if($('priority').value==='B')flags.push('B race: trained through, no full taper, hold the block.');
  if(flags.length){L.push('Notes:');flags.forEach(f=>L.push('  - '+f));}
  $('review').textContent=L.join('\n');
  $('reviewsub').textContent=`week ${cur}, coach to coach`;
}
const stripHtml=h=>h.replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();

/* ======================= DONE STATE ======================= */
function doneMap(){const d=state.data[sel]=state.data[sel]||{};return d.done=d.done||{};}
const isDone=(w,k)=>!!doneMap()[`w${w}-${k}`];
function setDone(w,k,v){const m=doneMap();if(v)m[`w${w}-${k}`]=1;else delete m[`w${w}-${k}`];}

/* ======================= WIRING ======================= */
function isoToday(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function buildDistSeg(){
  const keys=Object.keys(distMap());
  $('distseg').innerHTML=keys.map(k=>`<button role="tab" data-d="${k}">${k}</button>`).join('');
  $('distseg').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{
    $('distseg').querySelectorAll('button').forEach(x=>x.setAttribute('aria-selected',x===b?'true':'false'));render();store.save();}));
}
function setDist(k){const btns=$('distseg').querySelectorAll('button');let hit=false;
  btns.forEach(b=>{const on=b.dataset.d===k;b.setAttribute('aria-selected',on?'true':'false');if(on)hit=true;});
  if(!hit&&btns[0])btns[0].setAttribute('aria-selected','true');}

function selectAthlete(id){
  if(state.data[sel]&&state.data[sel].fields)store.save();   // persist current athlete only if seeded
  sel=id;const a=A();
  buildDistSeg();
  const saved=state.data[id];
  if(saved&&saved.fields){
    for(const f of FIELDS)if($(f)&&f in saved.fields)$(f).value=saved.fields[f];
    setDist(saved.dist||a.dist);
  } else {
    // seed from preset
    $('racedate').value=a.raceDate||defaultDate(a);
    $('days').value=a.days;$('priority').value=a.priority;$('hours').value='';$('goal').value='';
    $('cfrund').value=a.rund;$('cf5k').value=a.run;$('cf400').value=a.s400;$('cf200').value=a.s200;$('cftp').value=a.ftp;
    $('pool').value=a.pool;$('swimfloor').value=a.floor;$('shift').value=a.shift;
    setDist(a.dist);
    (state.data[id]=state.data[id]||{}).planStart=isoToday();
  }
  render();store.save();
}
function defaultDate(a){const d=new Date();d.setDate(d.getDate()+(a.mode==='run'?12:16)*7);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}

$('racedate').addEventListener('input',()=>{(state.data[sel]=state.data[sel]||{}).planStart=isoToday();render();store.save();});
['days','priority','hours','goal','cfrund','cftp','pool','swimfloor','shift'].forEach(id=>$(id).addEventListener('input',()=>{render();store.save();}));
['goal','cf5k','cf400','cf200'].forEach(id=>bindTime($(id),()=>{render();store.save();}));
$('copybtn').addEventListener('click',()=>{const t=$('review').textContent;
  navigator.clipboard?.writeText(t).then(()=>{$('copybtn').textContent='Copied';setTimeout(()=>$('copybtn').textContent='Copy review sheet',1400);}).catch(()=>{});});
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{});

/* ======================= INIT ======================= */
(function(){
  const s=store.load();
  if(s){state.data=s.data||{};sel=s.sel||'ollie';}
  buildDistSeg();
  const saved=state.data[sel];
  if(saved&&saved.fields){for(const f of FIELDS)if($(f)&&f in saved.fields)$(f).value=saved.fields[f];setDist(saved.dist||A().dist);}
  else selectAthlete(sel);
  render();
})();
