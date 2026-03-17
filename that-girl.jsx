import { useState, useEffect, useRef, useCallback } from "react";

// ─── Theme System ─────────────────────────────────────────────────────────────
const PALETTE = [
  { name:"pink",    main:"#F5E0E8", deep:"#D4A0B0", text:"#8B5060", accent:"#C47080" },
  { name:"blue",    main:"#C1DAE8", deep:"#7AAEC4", text:"#3A6880", accent:"#5A9AB5" },
  { name:"yellow",  main:"#F5EDD6", deep:"#C4A870", text:"#7A6030", accent:"#B09050" },
  { name:"purple",  main:"#DBD8ED", deep:"#9A90C8", text:"#504880", accent:"#7870B0" },
  { name:"matcha",  main:"#D4DEC4", deep:"#8AAA70", text:"#405030", accent:"#70944A" },
];

const buildTheme = (mainHex) => {
  const preset = PALETTE.find(p => p.main === mainHex);
  if (preset) return {
    main: preset.main,
    light: lightenHex(preset.main, 60),
    mid: lightenHex(preset.main, 30),
    deep: preset.deep,
    text: preset.text,
    accent: preset.accent,
    cardBg: lightenHex(preset.main, 55),
    navBg: preset.main,
    navActive: preset.text,
    navInactive: lightenHex(preset.text, 30),
  };
  // custom
  return {
    main: mainHex,
    light: lightenHex(mainHex, 65),
    mid: lightenHex(mainHex, 35),
    deep: darkenHex(mainHex, 20),
    text: darkenHex(mainHex, 45),
    accent: darkenHex(mainHex, 25),
    cardBg: lightenHex(mainHex, 55),
    navBg: mainHex,
    navActive: darkenHex(mainHex, 45),
    navInactive: darkenHex(mainHex, 20),
  };
};

function hexToRgb(hex) {
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return [r,g,b];
}
function rgbToHex(r,g,b) {
  return "#"+[r,g,b].map(x=>Math.round(Math.max(0,Math.min(255,x))).toString(16).padStart(2,"0")).join("");
}
function lightenHex(hex, pct) {
  if (!hex||hex.length<7) return "#fff";
  const [r,g,b]=hexToRgb(hex);
  const f=pct/100;
  return rgbToHex(r+(255-r)*f, g+(255-g)*f, b+(255-b)*f);
}
function darkenHex(hex, pct) {
  if (!hex||hex.length<7) return "#333";
  const [r,g,b]=hexToRgb(hex);
  const f=1-pct/100;
  return rgbToHex(r*f, g*f, b*f);
}

// ─── Constants ────────────────────────────────────────────────────────────────
const FONT_SERIF = "'Cormorant Garamond','Georgia',serif";
const FONT_SANS  = "system-ui,-apple-system,sans-serif";
const gStyle = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&display=swap');*{box-sizing:border-box;}`;

const PHASES = [
  { name:"Root",    range:[1,30],  desc:"build your foundation" },
  { name:"Rise",    range:[31,60], desc:"take action" },
  { name:"Radiate", range:[61,90], desc:"become her" },
];
const MOODS = ["low","tired","neutral","good","great","peak"];
const SELF_OPTIONS = ["a work in progress","finding my way","ready to change","lost but hopeful","stronger than I think","just starting"];
const HAPPY_OPTIONS = ["my relationships","my health","my growth","my creativity","my independence","my ambition","my resilience"];
const CHANGE_OPTIONS = ["my mindset","my body & health","my finances","my confidence","my relationships","my career","my daily habits"];
const TASK_CATS = [
  { id:"wellness",  label:"wellness",  emoji:"" },
  { id:"work",      label:"work",      emoji:"" },
  { id:"self-care", label:"self-care", emoji:"" },
  { id:"fitness",   label:"fitness",   emoji:"" },
  { id:"mindset",   label:"mindset",   emoji:"" },
  { id:"other",     label:"other",     emoji:"" },
];
const DAY_LABELS = ["Mo","Tu","We","Th","Fr","Sa","Su"];

const sv = (k,v) => { try { localStorage.setItem("tgr_"+k,JSON.stringify(v)); } catch(e){} };
const ld = (k,d) => { try { const v=localStorage.getItem("tgr_"+k); return v?JSON.parse(v):d; } catch(e){ return d; } };
const getPhase = (day) => PHASES.find(p=>day>=p.range[0]&&day<=p.range[1])||PHASES[0];
const getCurrentDay = (startDate) => {
  if (!startDate) return null;
  const start=new Date(startDate+"T00:00:00"), now=new Date(); now.setHours(0,0,0,0);
  const d=Math.floor((now-start)/(1000*60*60*24));
  return d>=0&&d<90?d+1:d>=90?90:null;
};
const getDateForDay = (startDate, dayNum) => {
  if (!startDate) return null;
  const d = new Date(startDate+"T00:00:00");
  d.setDate(d.getDate() + dayNum - 1);
  return d;
};
const makeDK = (d) => { const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),dd=String(d.getDate()).padStart(2,"0"); return `${y}-${m}-${dd}`; };
const getTodayKey = () => makeDK(new Date());
const breakdownGoal = (target) => { const m=Math.ceil(target/3),w=Math.ceil(m/4),d=Math.ceil(w/7); return { monthly:[Math.min(m,target),Math.min(m*2,target),target],weekly:w,daily:d }; };

const suggestHabits = (goals) => {
  return goals.filter(g=>g.text.trim()&&g.target&&g.unit).map(g=>{
    const text = g.text.toLowerCase();
    const daily = g.breakdown ? g.breakdown.daily : Math.ceil(parseFloat(g.target)/90);
    const unit = g.unit.toLowerCase();
    let habitName = "";
    if (text.includes("book")||unit.includes("book")||unit.includes("page")) habitName = `Read ${Math.max(10,daily*8)}–${Math.max(20,daily*15)} pages`;
    else if (text.includes("run")||text.includes("km")||unit.includes("km")||unit.includes("mile")) habitName = `Run or walk ${daily} ${g.unit}`;
    else if (text.includes("workout")||text.includes("gym")||text.includes("exercise")) habitName = `Train — ${daily} ${g.unit} session`;
    else if (text.includes("water")||unit.includes("l")||unit.includes("litre")) habitName = `Drink ${daily} ${g.unit} water`;
    else if (text.includes("meditat")||text.includes("mindful")) habitName = `Meditate ${Math.max(5,daily*5)} min`;
    else if (text.includes("journal")||text.includes("write")||text.includes("writ")) habitName = `Write ${daily} ${g.unit}`;
    else if (text.includes("sav")||text.includes("€")||text.includes("$")||unit.includes("€")||unit.includes("$")) habitName = `Save ${daily} ${g.unit} daily`;
    else habitName = `Daily: ${g.text} (${daily} ${g.unit}/day)`;
    return { id: Date.now()+Math.random(), name: habitName, streak:0, days:{}, startDate:"", fromGoal: g.text };
  });
};

// ─── Shared UI Components ─────────────────────────────────────────────────────
const SerifH = ({children, size, style}) => <div style={{fontFamily:FONT_SERIF,fontStyle:"italic",fontSize:size||22,color:"#3A3A3A",fontWeight:400,lineHeight:1.2,...style}}>{children}</div>;
const Label = ({children, style}) => <div style={{fontFamily:FONT_SANS,fontSize:9,letterSpacing:2.5,textTransform:"uppercase",color:"#8A8A8A",marginBottom:8,...style}}>{children}</div>;
const HR = ({theme}) => <div style={{height:"0.5px",background:theme.mid,margin:"20px 0"}}/>;

const Card = ({children, theme, style}) => (
  <div style={{background:theme.cardBg,border:`0.5px solid ${theme.mid}`,borderRadius:14,padding:"14px 16px",...style}}>{children}</div>
);
const BlushCard = ({children, theme, style}) => (
  <div style={{background:theme.main,border:`0.5px solid ${theme.mid}`,borderRadius:14,padding:"14px 16px",...style}}>{children}</div>
);

const TxtInp = ({theme, style, ...props}) => (
  <input style={{width:"100%",padding:"10px 13px",borderRadius:10,border:`0.5px solid ${theme.mid}`,fontSize:12,outline:"none",background:"#FAFAF8",color:"#3A3A3A",fontFamily:FONT_SANS,...style}} {...props}/>
);
const TxtArea = ({theme, style, ...props}) => (
  <textarea style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`0.5px solid ${theme.mid}`,fontSize:12,outline:"none",background:"#FAFAF8",color:"#3A3A3A",fontFamily:FONT_SANS,resize:"none",lineHeight:1.7,...style}} {...props}/>
);
const PrimaryBtn = ({children, theme, style, ...props}) => (
  <button style={{border:"none",cursor:"pointer",fontFamily:FONT_SANS,background:"#3A3A3A",color:"#FAFAF8",padding:"11px 20px",fontSize:11,letterSpacing:1,borderRadius:10,...style}} {...props}>{children}</button>
);
const GhostBtn = ({children, theme, style, ...props}) => (
  <button style={{border:`0.5px solid ${theme.mid}`,cursor:"pointer",fontFamily:FONT_SANS,background:"transparent",color:"#8A8A8A",padding:"9px 14px",fontSize:10,borderRadius:10,...style}} {...props}>{children}</button>
);

const Ring = ({pct, size, stroke, color}) => {
  const sz=size||56, st=stroke||3, r=sz/2-st, c=2*Math.PI*r, p=Math.min(pct||0,100);
  return (
    <svg width={sz} height={sz} style={{transform:"rotate(-90deg)"}}>
      <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke="#E8E0E0" strokeWidth={st}/>
      <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={color} strokeWidth={st} strokeDasharray={c} strokeDashoffset={c*(1-p/100)} strokeLinecap="round"/>
    </svg>
  );
};

// ─── Color Picker Modal ───────────────────────────────────────────────────────
function ColorPickerModal({ current, onSave, onClose }) {
  const [hex, setHex] = useState(current);
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#FAFAF8",borderRadius:20,padding:24,width:300,maxWidth:"92vw"}}>
        <SerifH size={20} style={{marginBottom:20,textAlign:"center"}}>choose your colour</SerifH>
        <Label style={{marginBottom:10}}>presets</Label>
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:20}}>
          {PALETTE.map(p=>(
            <div key={p.name} onClick={()=>setHex(p.main)} style={{aspectRatio:"1",borderRadius:10,background:p.main,border:`2.5px solid ${hex===p.main?"#3A3A3A":"transparent"}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
              {hex===p.main&&<div style={{width:8,height:8,borderRadius:50,background:"#3A3A3A"}}/>}
            </div>
          ))}
        </div>
        <Label style={{marginBottom:8}}>custom colour</Label>
        <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:16}}>
          <input type="color" value={hex} onChange={e=>setHex(e.target.value)} style={{width:48,height:44,border:"none",borderRadius:10,cursor:"pointer",padding:2}}/>
          <input value={hex} onChange={e=>{if(/^#[0-9a-fA-F]{0,6}$/.test(e.target.value))setHex(e.target.value);}} style={{flex:1,padding:"10px",borderRadius:10,border:"0.5px solid #DDD",fontSize:13,outline:"none",fontFamily:"monospace",color:"#3A3A3A"}}/>
        </div>
        <div style={{height:36,borderRadius:10,background:hex,marginBottom:16,border:"0.5px solid rgba(0,0,0,0.08)"}}/>
        <button onClick={()=>onSave(hex)} style={{width:"100%",padding:"12px",borderRadius:11,background:"#3A3A3A",color:"#FAFAF8",border:"none",cursor:"pointer",fontSize:12,fontFamily:FONT_SANS,letterSpacing:1,marginBottom:8}}>apply</button>
        <button onClick={onClose} style={{width:"100%",padding:"9px",borderRadius:10,background:"transparent",border:"0.5px solid #DDD",cursor:"pointer",fontSize:11,fontFamily:FONT_SANS,color:"#8A8A8A"}}>cancel</button>
      </div>
    </div>
  );
}

// ─── Setup Flow ───────────────────────────────────────────────────────────────
function SetupFlow({ onComplete }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [colorHex, setColorHex] = useState(PALETTE[0].main);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [selfView, setSelfView] = useState("");
  const [wins, setWins] = useState("");
  const [happyFor, setHappyFor] = useState([]);
  const [wantToChange, setWantToChange] = useState([]);
  const [vision90, setVision90] = useState("");
  const [goals, setGoals] = useState([{id:1,text:"",target:"",unit:"",breakdown:null}]);
  const [suggestedHabits, setSuggestedHabits] = useState([]);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const T = buildTheme(colorHex);

  const steps = [
    {label:"No 1 / WELCOME", title:"welcome, beautiful", sub:"your 90-day journey begins here"},
    {label:"No 2 / TODAY", title:"today's snapshot", sub:"how are you really, right now?"},
    {label:"No 3 / VISION", title:"your vision", sub:"who will you become?"},
    {label:"No 4 / GOALS", title:"your goals", sub:"what will you accomplish?"},
    {label:"No 5 / PLAN", title:"your plan", sub:"here is the breakdown"},
  ];

  const Chip = ({label, selected, onClick}) => (
    <button onClick={onClick} style={{padding:"7px 14px",borderRadius:20,border:`0.5px solid ${selected?T.accent:T.mid}`,background:selected?T.main:"#FAFAF8",color:selected?T.text:"#8A8A8A",cursor:"pointer",fontSize:11,fontFamily:FONT_SANS,transition:"all 0.15s",marginBottom:4}}>
      {label}
    </button>
  );

  const genBreakdowns = () => {
    const updated = goals.map(g=>(!g.text.trim()||!g.target||!g.unit)?g:{...g,breakdown:breakdownGoal(parseFloat(g.target))});
    setGoals(updated);
    setSuggestedHabits(suggestHabits(updated));
    setShowBreakdown(true);
  };

  const finish = () => {
    const finalGoals=goals.filter(g=>g.text.trim()&&g.target&&g.unit).map(g=>({id:Date.now()+Math.random(),text:g.text,target:parseFloat(g.target),unit:g.unit,current:0,breakdown:g.breakdown}));
    sv("habits", suggestedHabits.filter(h=>h.name.trim()));
    onComplete({name,colorHex,startDate,snapshot:{selfView,wins,happyFor,wantToChange},vision90,goals:finalGoals});
  };

  return (
    <div style={{minHeight:"100vh",background:"#FAFAF8"}}>
      <style>{gStyle}</style>
      {showColorPicker && <ColorPickerModal current={colorHex} onSave={h=>{setColorHex(h);setShowColorPicker(false);}} onClose={()=>setShowColorPicker(false)}/>}
      <div style={{maxWidth:480,margin:"0 auto",padding:"2.5rem 1.5rem 5rem"}}>
        <div style={{display:"flex",gap:3,marginBottom:32}}>
          {steps.map((_,i)=><div key={i} style={{flex:1,height:1,background:i<=step?"#3A3A3A":T.mid,transition:"background 0.4s"}}/>)}
        </div>
        <div style={{marginBottom:28}}>
          <Label>{steps[step].label}</Label>
          <SerifH size={32}>{steps[step].title}</SerifH>
          <div style={{fontSize:12,color:"#8A8A8A",marginTop:6,fontFamily:FONT_SANS}}>{steps[step].sub}</div>
        </div>

        {step===0&&(
          <div>
            <div style={{marginBottom:14}}>
              <Label>your name</Label>
              <TxtInp theme={T} value={name} onChange={e=>setName(e.target.value)} placeholder="what shall we call you?"/>
            </div>
            <div style={{marginBottom:14}}>
              <Label>journey start date</Label>
              <TxtInp theme={T} type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} style={{color:"#3A3A3A"}}/>
            </div>
            <div style={{marginBottom:14}}>
              <Label>choose your colour</Label>
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:10}}>
                {PALETTE.map(p=>(
                  <div key={p.name} onClick={()=>setColorHex(p.main)} style={{aspectRatio:"1",borderRadius:10,background:p.main,border:`2.5px solid ${colorHex===p.main?"#3A3A3A":"transparent"}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {colorHex===p.main&&<div style={{width:8,height:8,borderRadius:50,background:"#3A3A3A"}}/>}
                  </div>
                ))}
              </div>
              <button onClick={()=>setShowColorPicker(true)} style={{width:"100%",padding:"10px",borderRadius:10,border:`0.5px dashed ${T.mid}`,background:"transparent",color:"#8A8A8A",cursor:"pointer",fontSize:10,fontFamily:FONT_SANS,letterSpacing:1}}>+ custom colour</button>
            </div>
            <BlushCard theme={T} style={{marginTop:20}}>
              <SerifH size={15} style={{marginBottom:6}}>90 days from now, everything is different.</SerifH>
              <div style={{fontSize:11,color:T.text,fontFamily:FONT_SANS,lineHeight:1.7}}>this planner will guide you every single day. you don't have to think — just act.</div>
            </BlushCard>
          </div>
        )}

        {step===1&&(
          <div>
            <div style={{marginBottom:18}}><Label>right now, I see myself as...</Label><div style={{display:"flex",flexWrap:"wrap",gap:7}}>{SELF_OPTIONS.map(o=><Chip key={o} label={o} selected={selfView===o} onClick={()=>setSelfView(o)}/>)}</div></div>
            <div style={{marginBottom:18}}><Label>one win I'm proud of</Label><TxtArea theme={T} value={wins} onChange={e=>setWins(e.target.value)} placeholder="it doesn't have to be huge..." style={{minHeight:70}}/></div>
            <div style={{marginBottom:18}}><Label>I'm grateful for...</Label><div style={{display:"flex",flexWrap:"wrap",gap:7}}>{HAPPY_OPTIONS.map(o=><Chip key={o} label={o} selected={happyFor.includes(o)} onClick={()=>setHappyFor(h=>h.includes(o)?h.filter(x=>x!==o):[...h,o])}/>)}</div></div>
            <div><Label>I want to change...</Label><div style={{display:"flex",flexWrap:"wrap",gap:7}}>{CHANGE_OPTIONS.map(o=><Chip key={o} label={o} selected={wantToChange.includes(o)} onClick={()=>setWantToChange(h=>h.includes(o)?h.filter(x=>x!==o):[...h,o])}/>)}</div></div>
          </div>
        )}

        {step===2&&(
          <div>
            <BlushCard theme={T} style={{marginBottom:18}}>
              <SerifH size={14} style={{marginBottom:6}}>close your eyes.</SerifH>
              <div style={{fontSize:11,color:T.text,fontFamily:FONT_SANS,lineHeight:1.8}}>it's 90 days from now. you woke up as the woman you've been working to become. what does her life look like?</div>
            </BlushCard>
            <Label>in 90 days, I am...</Label>
            <TxtArea theme={T} value={vision90} onChange={e=>setVision90(e.target.value)} placeholder="she wakes early, her body is strong..." style={{minHeight:140}}/>
          </div>
        )}

        {step===3&&!showBreakdown&&(
          <div>
            <div style={{fontSize:11,color:"#8A8A8A",marginBottom:18,fontFamily:FONT_SANS,lineHeight:1.7}}>add your goals. the planner will break them into monthly, weekly and daily actions.</div>
            {goals.map((g,i)=>(
              <Card key={g.id} theme={T} style={{marginBottom:12}}>
                <Label>goal No {i+1}</Label>
                <TxtInp theme={T} value={g.text} onChange={e=>setGoals(gs=>gs.map((x,idx)=>idx===i?{...x,text:e.target.value}:x))} placeholder="e.g. read 6 books, run 50km..." style={{marginBottom:8}}/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <TxtInp theme={T} value={g.target} onChange={e=>setGoals(gs=>gs.map((x,idx)=>idx===i?{...x,target:e.target.value}:x))} placeholder="target (e.g. 6)" type="number"/>
                  <TxtInp theme={T} value={g.unit} onChange={e=>setGoals(gs=>gs.map((x,idx)=>idx===i?{...x,unit:e.target.value}:x))} placeholder="unit (books, km, €...)"/>
                </div>
                {goals.length>1&&<button onClick={()=>setGoals(gs=>gs.filter((_,idx)=>idx!==i))} style={{marginTop:8,background:"none",border:"none",color:"#CCC",cursor:"pointer",fontSize:10,fontFamily:FONT_SANS}}>remove</button>}
              </Card>
            ))}
            <button onClick={()=>setGoals(gs=>[...gs,{id:Date.now(),text:"",target:"",unit:"",breakdown:null}])} style={{width:"100%",padding:"10px",borderRadius:10,background:"transparent",border:`0.5px dashed ${T.mid}`,color:"#8A8A8A",cursor:"pointer",fontSize:10,fontFamily:FONT_SANS,letterSpacing:1}}>+ add another goal</button>
          </div>
        )}

        {step===3&&showBreakdown&&(
          <div>
            <div style={{fontSize:11,color:"#8A8A8A",marginBottom:18,fontFamily:FONT_SANS}}>here's how your goals break down across 90 days.</div>
            {goals.filter(g=>g.breakdown).map(g=>(
              <Card key={g.id} theme={T} style={{marginBottom:14}}>
                <SerifH size={16} style={{marginBottom:14}}>{g.text}</SerifH>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
                  {["Month 1","Month 2","Month 3"].map((m,mi)=>(
                    <div key={m} style={{background:"#FAFAF8",borderRadius:10,padding:"10px 8px",textAlign:"center",border:`0.5px solid ${T.mid}`}}>
                      <div style={{fontSize:8,color:"#8A8A8A",marginBottom:4,letterSpacing:1,textTransform:"uppercase",fontFamily:FONT_SANS}}>{m}</div>
                      <div style={{fontFamily:FONT_SERIF,fontSize:22,color:"#3A3A3A",fontWeight:300}}>{g.breakdown.monthly[mi]}</div>
                      <div style={{fontSize:9,color:"#8A8A8A",fontFamily:FONT_SANS}}>{g.unit}</div>
                    </div>
                  ))}
                </div>
                <div style={{display:"flex",gap:8}}>
                  <div style={{flex:1,background:T.main,borderRadius:10,padding:"8px",textAlign:"center"}}><div style={{fontSize:8,color:T.text,marginBottom:3,fontFamily:FONT_SANS,letterSpacing:1,textTransform:"uppercase"}}>weekly</div><div style={{fontFamily:FONT_SERIF,fontSize:18,color:"#3A3A3A"}}>{g.breakdown.weekly} {g.unit}</div></div>
                  <div style={{flex:1,background:T.main,borderRadius:10,padding:"8px",textAlign:"center"}}><div style={{fontSize:8,color:T.text,marginBottom:3,fontFamily:FONT_SANS,letterSpacing:1,textTransform:"uppercase"}}>daily aim</div><div style={{fontFamily:FONT_SERIF,fontSize:18,color:"#3A3A3A"}}>{g.breakdown.daily} {g.unit}</div></div>
                </div>
              </Card>
            ))}
            <GhostBtn theme={T} style={{width:"100%",marginBottom:8}} onClick={()=>setShowBreakdown(false)}>← adjust goals</GhostBtn>
            <HR theme={T}/>
            <SerifH size={18} style={{marginBottom:4,marginTop:4}}>suggested habits</SerifH>
            <div style={{fontSize:11,color:"#8A8A8A",marginBottom:14,fontFamily:FONT_SANS,lineHeight:1.7}}>based on your goals — edit or remove as you like.</div>
            {suggestedHabits.map((h,i)=>(
              <div key={h.id} style={{display:"flex",gap:7,alignItems:"center",marginBottom:8}}>
                <input value={h.name} onChange={e=>setSuggestedHabits(hs=>hs.map((x,xi)=>xi===i?{...x,name:e.target.value}:x))} style={{flex:1,padding:"9px 12px",borderRadius:10,border:`0.5px solid ${T.mid}`,fontSize:11,outline:"none",background:"#FAFAF8",color:"#3A3A3A",fontFamily:FONT_SANS}}/>
                <button onClick={()=>setSuggestedHabits(hs=>hs.filter((_,xi)=>xi!==i))} style={{background:"none",border:"none",color:"#CCC",cursor:"pointer",fontSize:16}}>×</button>
              </div>
            ))}
            <button onClick={()=>setSuggestedHabits(hs=>[...hs,{id:Date.now(),name:"",streak:0,days:{},startDate:""}])} style={{width:"100%",padding:"9px",borderRadius:10,background:"transparent",border:`0.5px dashed ${T.mid}`,color:"#8A8A8A",cursor:"pointer",fontSize:10,fontFamily:FONT_SANS,letterSpacing:1,marginBottom:8}}>+ add another habit</button>
          </div>
        )}

        {step===4&&(
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:32,marginBottom:16}}>✦</div>
            <SerifH size={28} style={{marginBottom:8}}>you're ready.</SerifH>
            <div style={{fontSize:11,color:"#8A8A8A",marginBottom:28,fontFamily:FONT_SANS,lineHeight:1.8}}>your journey begins {new Date(startDate).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}.</div>
            <div style={{display:"flex",justifyContent:"center",gap:28,marginBottom:24}}>
              {PHASES.map(p=><div key={p.name} style={{textAlign:"center"}}><SerifH size={15} style={{marginBottom:2}}>{p.name}</SerifH><div style={{fontSize:8,color:"#8A8A8A",fontFamily:FONT_SANS,letterSpacing:1}}>days {p.range[0]}–{p.range[1]}</div></div>)}
            </div>
            {goals.filter(g=>g.text).map(g=>(
              <div key={g.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:T.cardBg,borderRadius:12,marginBottom:8,border:`0.5px solid ${T.mid}`,textAlign:"left"}}>
                <span style={{color:T.accent,fontSize:10}}>✦</span>
                <span style={{fontSize:12,color:"#3A3A3A",fontFamily:FONT_SANS,flex:1}}>{g.text}</span>
                <span style={{fontSize:10,color:"#8A8A8A",fontFamily:FONT_SANS}}>{g.target} {g.unit}</span>
              </div>
            ))}
            {suggestedHabits.filter(h=>h.name.trim()).length>0&&(
              <div style={{marginTop:16,textAlign:"left"}}>
                <div style={{fontFamily:FONT_SANS,fontSize:9,letterSpacing:2,textTransform:"uppercase",color:"#8A8A8A",marginBottom:8}}>daily habits</div>
                {suggestedHabits.filter(h=>h.name.trim()).map(h=>(
                  <div key={h.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px",background:T.cardBg,borderRadius:12,marginBottom:6,border:`0.5px solid ${T.mid}`}}>
                    <span style={{color:T.mid,fontSize:10}}>·</span>
                    <span style={{fontSize:11,color:"#3A3A3A",fontFamily:FONT_SANS,flex:1}}>{h.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{marginTop:32,display:"flex",gap:8}}>
          {step>0&&<GhostBtn theme={T} style={{flex:1}} onClick={()=>{if(showBreakdown)setShowBreakdown(false);else setStep(s=>s-1);}}>← back</GhostBtn>}
          {step<4?(
            <PrimaryBtn theme={T} style={{flex:2}} disabled={step===0&&!name.trim()} onClick={()=>{if(step===3&&!showBreakdown){genBreakdowns();return;}if(step===3&&showBreakdown){setStep(4);return;}setStep(s=>s+1);}}>
              {step===3&&!showBreakdown?"show me the breakdown →":step===3&&showBreakdown?"looks good →":"continue →"}
            </PrimaryBtn>
          ):(
            <PrimaryBtn theme={T} style={{flex:2}} onClick={finish}>begin my journey ✦</PrimaryBtn>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Today Tab ─────────────────────────────────────────────────────────────────
function TodayTab({ data, T }) {
  const currentDay = getCurrentDay(data.startDate)||1;
  const [viewDay, setViewDay] = useState(currentDay);
  const phase = getPhase(viewDay);
  const tasks = ld("todos",[]);
  const [dayData, setDayData] = useState(()=>ld("daydata_"+viewDay,{}));
  useEffect(()=>{ setDayData(ld("daydata_"+viewDay,{})); },[viewDay]);
  const save = (u) => { const n={...dayData,...u}; setDayData(n); sv("daydata_"+viewDay,n); };
  const [newP, setNewP] = useState("");
  const [showSuggest, setShowSuggest] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const addP = (text) => { if(!text.trim())return; save({priorities:[...(dayData.priorities||[]),{id:Date.now(),text,done:false}]}); setNewP(""); setShowSuggest(false); };
  const goals = data.goals||[];
  const pendingTasks = tasks.filter(t=>!t.done);

  const dayDate = data.startDate ? getDateForDay(data.startDate, viewDay) : null;
  const dayDateStr = dayDate ? dayDate.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"}) : "";
  const isToday = viewDay === currentDay;

  return (
    <div style={{padding:"1.5rem 1rem 3rem"}}>
      <div style={{marginBottom:24}}>
        <Label>{phase.name} phase · {phase.desc}</Label>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
          <button onClick={()=>setViewDay(d=>Math.max(1,d-1))} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:T.mid,padding:"0 4px",fontFamily:FONT_SANS}}>‹</button>
          <div style={{textAlign:"center"}}>
            <SerifH size={38} style={{marginBottom:2}}>day {viewDay}</SerifH>
            <div style={{fontFamily:FONT_SANS,fontSize:10,color:"#8A8A8A"}}>{dayDateStr}</div>
            {!isToday&&<div style={{fontFamily:FONT_SANS,fontSize:9,color:T.accent,letterSpacing:1,marginTop:2}}>{viewDay<currentDay?"past day":"future day"}</div>}
          </div>
          <button onClick={()=>setViewDay(d=>Math.min(90,d+1))} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:T.mid,padding:"0 4px",fontFamily:FONT_SANS}}>›</button>
        </div>
        <div style={{height:1,background:T.mid,borderRadius:10}}>
          <div style={{height:1,width:`${Math.round((viewDay/90)*100)}%`,background:T.accent,borderRadius:10}}/>
        </div>
        <div style={{fontFamily:FONT_SANS,fontSize:9,color:"#AAAAAA",marginTop:4,textAlign:"right",letterSpacing:0.5}}>{Math.round((viewDay/90)*100)}% of your journey</div>
      </div>

      <div style={{marginBottom:18}}>
        <Label>today's focus</Label>
        <TxtArea theme={T} value={dayData.morningNote||""} onChange={e=>save({morningNote:e.target.value})} placeholder="today I intend to..." style={{minHeight:70,background:T.cardBg}}/>
      </div>

      <div style={{marginBottom:18}}>
        <Label>Priorities</Label>
        <div style={{background:T.cardBg,borderRadius:12,padding:"10px 12px",border:`0.5px solid ${T.mid}`,marginBottom:6}}>
        {(dayData.priorities||[]).map(p=>(
          <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",background:p.done?"rgba(255,255,255,0.5)":"rgba(255,255,255,0.7)",borderRadius:10,marginBottom:6,border:`0.5px solid ${T.mid}`}}>
            <div onClick={()=>{
              const updated=(dayData.priorities||[]).map(x=>x.id===p.id?{...x,done:!x.done}:x);
              save({priorities:updated});
              // sync with to-do list
              const todos=ld("todos",[]);
              const match=todos.find(t=>t.text===p.text);
              if(match){sv("todos",todos.map(t=>t.text===p.text?{...t,done:!p.done}:t));}
            }} style={{width:16,height:16,borderRadius:50,border:`1px solid ${p.done?T.accent:T.mid}`,background:p.done?T.accent:"transparent",cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
              {p.done&&<div style={{width:5,height:5,borderRadius:50,background:"#FAFAF8"}}/>}
            </div>
            <span style={{flex:1,fontSize:12,color:p.done?"#AAAAAA":"#3A3A3A",textDecoration:p.done?"line-through":"none",fontFamily:FONT_SANS}}>{p.text}</span>
            <button onClick={()=>save({priorities:(dayData.priorities||[]).filter(x=>x.id!==p.id)})} style={{background:"none",border:"none",color:"#CCC",cursor:"pointer",fontSize:14,padding:0}}>×</button>
          </div>
        ))}
        <div style={{display:"flex",gap:6,marginBottom:6}}>
          <input value={newP} onChange={e=>setNewP(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")addP(newP);}} placeholder="add a priority..." style={{flex:1,padding:"9px 12px",borderRadius:10,border:`0.5px solid ${T.mid}`,fontSize:11,outline:"none",background:"rgba(255,255,255,0.7)",color:"#3A3A3A",fontFamily:FONT_SANS}}/>
          <PrimaryBtn theme={T} onClick={()=>addP(newP)} style={{padding:"9px 14px",fontSize:16}}>+</PrimaryBtn>
          <GhostBtn theme={T} onClick={()=>setShowSuggest(s=>!s)} style={{fontSize:10}}>from list</GhostBtn>
        </div>
        {showSuggest&&(
          <Card theme={T} style={{marginBottom:6}}>
            <Label>pick from to-do list</Label>
            {pendingTasks.length===0&&<div style={{fontSize:11,color:"#AAAAAA",fontStyle:"italic",fontFamily:FONT_SANS}}>no pending tasks ✦</div>}
            {pendingTasks.slice(0,6).map(t=>{const tc=TASK_CATS.find(c=>c.id===t.cat)||TASK_CATS[0];return(
              <div key={t.id} onClick={()=>addP(t.text)} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderRadius:8,marginBottom:4,cursor:"pointer",border:`0.5px solid ${T.mid}`,background:"#FAFAF8"}}>
                <span style={{fontSize:11,color:"#3A3A3A",flex:1,fontFamily:FONT_SANS}}>{t.text}</span><span style={{fontSize:9,color:T.accent,fontFamily:FONT_SANS}}>+ add</span>
              </div>
            );})}
          </Card>
        )}
        </div>
      </div>

      <div style={{marginBottom:18}}>
        <Label>Evening reflection</Label>
        <TxtArea theme={T} value={dayData.eveningNote||""} onChange={e=>save({eveningNote:e.target.value})} placeholder="how did today go? what shifted?" style={{minHeight:70,marginBottom:8}}/>
        <input value={dayData.win||""} onChange={e=>save({win:e.target.value})} placeholder="today's win: I'm proud that I..." style={{width:"100%",padding:"9px 12px",borderRadius:10,border:`0.5px solid ${T.mid}`,fontSize:11,outline:"none",color:"#3A3A3A",fontFamily:FONT_SANS,background:"#FAFAF8"}}/>
      </div>

      <div style={{marginBottom:28}}>
        <Label>Energy today</Label>
        <div style={{display:"flex",gap:14}}>
          {MOODS.map((m,i)=><button key={i} onClick={()=>save({mood:i})} style={{padding:"5px 10px",borderRadius:20,border:`0.5px solid ${(dayData.mood??3)===i?"#3A3A3A":"#E0D8D8"}`,background:(dayData.mood??3)===i?"#3A3A3A":"transparent",color:(dayData.mood??3)===i?"#FAFAF8":"#AAAAAA",cursor:"pointer",fontSize:9,fontFamily:FONT_SANS,letterSpacing:1,transition:"all 0.15s"}}>{m}</button>)}
        </div>
      </div>

      <PrimaryBtn theme={T} style={{width:"100%",padding:"13px",letterSpacing:1.5,background:"#3A3A3A"}} onClick={()=>{setSavedOk(true);setTimeout(()=>setSavedOk(false),2000);}}>
        {savedOk?"saved ✓":"save day"}
      </PrimaryBtn>
    </div>
  );
}

// ─── Journey Tab ───────────────────────────────────────────────────────────────
function JourneyTab({ data, T }) {
  const currentDay=getCurrentDay(data.startDate)||1;
  const [selectedDay,setSelectedDay]=useState(null);
  const goals=data.goals||[];
  const habits=ld("habits",[]);
  const todayK=getTodayKey();
  const totalGoalPct=goals.length?Math.round(goals.reduce((s,g)=>s+Math.min(100,(g.current/g.target)*100),0)/goals.length):0;
  const topStreak=habits.length?Math.max(...habits.map(h=>h.streak||0)):0;
  const habitsDoneToday=habits.filter(h=>h.days&&h.days[todayK]).length;
  const daysLogged=Array.from({length:currentDay},(_,i)=>ld("daydata_"+(i+1),{})).filter(d=>d.morningNote||d.win).length;
  const daysWithWin=Array.from({length:currentDay},(_,i)=>ld("daydata_"+(i+1),{})).filter(d=>d.win).length;

  return (
    <div style={{padding:"1.5rem 1rem 3rem"}}>
      <SerifH size={28} style={{marginBottom:4}}>your journey</SerifH>
      <div style={{fontFamily:FONT_SANS,fontSize:10,color:"#8A8A8A",marginBottom:24}}>day {currentDay} of 90 · {Math.round((currentDay/90)*100)}% complete</div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
        <Card theme={T}>
          <Label>Goals</Label>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <Ring pct={totalGoalPct} color={T.accent} size={52} stroke={3}/>
            <div><div style={{fontFamily:FONT_SERIF,fontSize:26,color:"#3A3A3A"}}>{totalGoalPct}%</div><div style={{fontSize:9,color:"#8A8A8A",fontFamily:FONT_SANS}}>overall</div></div>
          </div>
        </Card>
        <Card theme={T}>
          <Label>Habits</Label>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <Ring pct={habits.length?Math.round(habitsDoneToday/habits.length*100):0} color={T.deep} size={52} stroke={3}/>
            <div><div style={{fontFamily:FONT_SERIF,fontSize:26,color:"#3A3A3A"}}>{topStreak}</div><div style={{fontSize:9,color:"#8A8A8A",fontFamily:FONT_SANS}}>top streak</div></div>
          </div>
        </Card>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
        <div style={{background:T.cardBg,borderRadius:12,padding:"12px",border:`0.5px solid ${T.mid}`,textAlign:"center"}}><div style={{fontFamily:FONT_SERIF,fontSize:28,color:"#3A3A3A"}}>{daysLogged}</div><div style={{fontSize:9,color:"#8A8A8A",fontFamily:FONT_SANS,letterSpacing:1,textTransform:"uppercase"}}>days logged</div></div>
        <div style={{background:T.cardBg,borderRadius:12,padding:"12px",border:`0.5px solid ${T.mid}`,textAlign:"center"}}><div style={{fontFamily:FONT_SERIF,fontSize:28,color:"#3A3A3A"}}>{daysWithWin}</div><div style={{fontSize:9,color:"#8A8A8A",fontFamily:FONT_SANS,letterSpacing:1,textTransform:"uppercase"}}>wins recorded</div></div>
      </div>

      {goals.length>0&&(
        <Card theme={T} style={{marginBottom:20}}>
          <Label>Goals progress</Label>
          {goals.map(g=>{const pct=Math.min(100,Math.round((g.current/g.target)*100));return(
            <div key={g.id} style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:11,color:"#3A3A3A",fontFamily:FONT_SANS}}>{g.text}</span><span style={{fontSize:10,color:T.accent,fontFamily:FONT_SANS}}>{g.current}/{g.target} {g.unit}</span></div>
              <div style={{height:1,background:T.mid,borderRadius:10}}><div style={{height:1,width:`${pct}%`,background:T.accent,borderRadius:10}}/></div>
            </div>
          );})}
        </Card>
      )}

      {habits.length>0&&(
        <Card theme={T} style={{marginBottom:20}}>
          <Label>Habit streaks</Label>
          {habits.map(h=>(
            <div key={h.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <span style={{fontSize:11,color:"#3A3A3A",fontFamily:FONT_SANS,flex:1}}>{h.name}</span>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{height:1,width:70,background:T.mid,borderRadius:10}}><div style={{height:1,width:`${Math.min(100,Math.round((h.streak/90)*100))}%`,background:T.accent,borderRadius:10}}/></div>
                <span style={{fontSize:9,color:"#8A8A8A",fontFamily:FONT_SANS,minWidth:28}}>{h.streak}d</span>
              </div>
            </div>
          ))}
        </Card>
      )}

      <HR theme={T}/>
      <Label style={{marginBottom:16}}>90-day map</Label>
      {PHASES.map(phase=>(
        <div key={phase.name} style={{marginBottom:20}}>
          <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:10}}>
            <SerifH size={16}>{phase.name}</SerifH>
            <span style={{fontFamily:FONT_SANS,fontSize:9,color:"#8A8A8A",letterSpacing:1}}>days {phase.range[0]}–{phase.range[1]}</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(10,1fr)",gap:3,marginBottom:6}}>
            {Array.from({length:phase.range[1]-phase.range[0]+1},(_,i)=>phase.range[0]+i).map(day=>{
              const s=ld("daydata_"+day,{}); const hasLog=!!(s.win||s.morningNote); const isToday=day===currentDay; const isPast=day<currentDay;
              return(
                <button key={day} onClick={()=>setSelectedDay(day===selectedDay?null:day)}
                  style={{aspectRatio:"1",borderRadius:6,border:"0.5px solid "+(isPast||isToday?"#3A3A3A":"#E8E0E0"),background:isPast||isToday?"#3A3A3A":"#FAFAF8",color:isPast||isToday?"#FAFAF8":"#CCC",fontSize:9,cursor:"pointer",fontFamily:FONT_SANS,padding:0,fontWeight:selectedDay===day?600:400,boxShadow:selectedDay===day?"0 0 0 2px #3A3A3A":"none"}}>
                  {day}
                </button>
              );
            })}
          </div>
          {selectedDay&&selectedDay>=phase.range[0]&&selectedDay<=phase.range[1]&&(()=>{
            const s=ld("daydata_"+selectedDay,{}); const p=s.priorities||[]; const pct=p.length?Math.round(p.filter(x=>x.done).length/p.length*100):0;
            const sd=data.startDate?getDateForDay(data.startDate,selectedDay):null;
            const sdStr=sd?sd.toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"}):"";
            return(
              <div style={{background:T.cardBg,borderRadius:12,padding:"13px 15px",marginTop:6,border:`0.5px solid ${T.mid}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:10}}>
                  <SerifH size={15}>day {selectedDay}</SerifH>
                  <div style={{fontFamily:FONT_SANS,fontSize:9,color:"#8A8A8A"}}>{sdStr}</div>
                </div>
                {s.win&&<div style={{marginBottom:8}}><Label>win</Label><div style={{fontSize:12,color:"#3A3A3A",fontFamily:FONT_SANS,lineHeight:1.6}}>{s.win}</div></div>}
                {p.length>0&&<div><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><Label style={{marginBottom:0}}>priorities</Label><span style={{fontSize:9,color:T.accent,fontFamily:FONT_SANS}}>{pct}%</span></div><div style={{height:1,background:T.mid,borderRadius:10}}><div style={{height:1,width:`${pct}%`,background:T.accent,borderRadius:10}}/></div></div>}
                {s.mood!==undefined&&<div style={{fontSize:9,color:"#8A8A8A",marginTop:8,fontFamily:FONT_SANS,letterSpacing:1}}>{MOODS[s.mood]}</div>}
                {!s.win&&!p.length&&<div style={{fontSize:11,color:"#AAAAAA",fontStyle:"italic",fontFamily:FONT_SANS}}>nothing logged yet</div>}
              </div>
            );
          })()}
        </div>
      ))}
    </div>
  );
}

// ─── Goals Tab ─────────────────────────────────────────────────────────────────
function GoalsTab({ data, setData, T }) {
  const goals=data.goals||[]; const [newGoal,setNewGoal]=useState(""); const [newTarget,setNewTarget]=useState(""); const [newUnit,setNewUnit]=useState("");
  const currentDay=getCurrentDay(data.startDate)||1; const monthNum=currentDay<=30?1:currentDay<=60?2:3;
  const updateGoal=(id,v)=>{const u=goals.map(g=>g.id===id?{...g,current:v}:g);const nd={...data,goals:u};setData(nd);sv("plannerdata",nd);};
  const addGoal=()=>{if(!newGoal.trim()||!newTarget||!newUnit)return;const bd=breakdownGoal(parseFloat(newTarget));const ng={id:Date.now(),text:newGoal,target:parseFloat(newTarget),unit:newUnit,current:0,breakdown:bd};const u=[...goals,ng];const nd={...data,goals:u};setData(nd);sv("plannerdata",nd);setNewGoal("");setNewTarget("");setNewUnit("");};
  return(
    <div style={{padding:"1.5rem 1rem 3rem"}}>
      <SerifH size={28} style={{marginBottom:4}}>goals</SerifH>
      <div style={{fontFamily:FONT_SANS,fontSize:10,color:"#8A8A8A",marginBottom:20}}>month {monthNum} of 3</div>
      {goals.map(g=>{const pct=Math.min(100,Math.round((g.current/g.target)*100));const mt=g.breakdown?g.breakdown.monthly[monthNum-1]:g.target;return(
        <Card key={g.id} theme={T} style={{marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
            <SerifH size={17} style={{flex:1}}>{g.text}</SerifH>
            <div style={{fontFamily:FONT_SERIF,fontSize:22,color:T.accent,marginLeft:10}}>{pct}%</div>
          </div>
          <div style={{fontSize:10,color:"#8A8A8A",fontFamily:FONT_SANS,marginBottom:10}}>month {monthNum} target: {mt} {g.unit} · total: {g.target} {g.unit}</div>
          <div style={{height:1,background:T.mid,borderRadius:10,marginBottom:12}}><div style={{height:1,width:`${pct}%`,background:T.accent,borderRadius:10,transition:"width 0.4s"}}/></div>
          {g.breakdown&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:12}}>{["M1","M2","M3"].map((m,mi)=><div key={m} style={{background:mi<monthNum?T.main:"#FAFAF8",borderRadius:9,padding:"7px 8px",textAlign:"center",border:`0.5px solid ${mi<monthNum?T.mid:"#E8E0E0"}`}}><div style={{fontSize:8,color:"#8A8A8A",fontFamily:FONT_SANS,marginBottom:2}}>{m}</div><div style={{fontFamily:FONT_SERIF,fontSize:17,color:"#3A3A3A"}}>{g.breakdown.monthly[mi]}</div><div style={{fontSize:8,color:"#8A8A8A",fontFamily:FONT_SANS}}>{g.unit}</div></div>)}</div>}
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:10,color:"#8A8A8A",fontFamily:FONT_SANS}}>update:</span>
            <button onClick={()=>updateGoal(g.id,Math.max(0,g.current-1))} style={{padding:"3px 12px",borderRadius:8,border:`0.5px solid ${T.mid}`,background:"#FAFAF8",color:"#3A3A3A",cursor:"pointer",fontSize:14}}>−</button>
            <button onClick={()=>updateGoal(g.id,Math.min(g.target,g.current+1))} style={{padding:"3px 12px",borderRadius:8,border:`0.5px solid ${T.mid}`,background:"#FAFAF8",color:"#3A3A3A",cursor:"pointer",fontSize:14}}>+</button>
            <input type="number" value={g.current} onChange={e=>updateGoal(g.id,Math.min(g.target,Math.max(0,parseFloat(e.target.value)||0)))} style={{width:60,padding:"4px 8px",borderRadius:8,border:`0.5px solid ${T.mid}`,fontSize:12,outline:"none",textAlign:"center",fontFamily:FONT_SANS}}/>
            <span style={{fontSize:10,color:"#8A8A8A",fontFamily:FONT_SANS}}>/ {g.target} {g.unit}</span>
          </div>
        </Card>
      );})}
      <HR theme={T}/>
      <Card theme={T}>
        <Label>add a new goal</Label>
        <TxtInp theme={T} value={newGoal} onChange={e=>setNewGoal(e.target.value)} placeholder="goal name..." style={{marginBottom:8}}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:8}}><TxtInp theme={T} value={newTarget} onChange={e=>setNewTarget(e.target.value)} placeholder="target" type="number"/><TxtInp theme={T} value={newUnit} onChange={e=>setNewUnit(e.target.value)} placeholder="unit (books, km...)"/></div>
        <PrimaryBtn theme={T} style={{width:"100%"}} onClick={addGoal}>+ add goal</PrimaryBtn>
      </Card>
    </div>
  );
}

// ─── Todo Tab ──────────────────────────────────────────────────────────────────
function TodoTab({ T }) {
  const [tasks,setTasksRaw]=useState(()=>ld("todos",[]));
  const setTasks=v=>{const n=typeof v==="function"?v(tasks):v;setTasksRaw(n);sv("todos",n);};
  const [newTask,setNewTask]=useState(""); const [newCat,setNewCat]=useState("wellness");
  const addTask=()=>{if(!newTask.trim())return;setTasks(ts=>[...ts,{id:Date.now(),text:newTask,cat:newCat,done:false}]);setNewTask("");};
  return(
    <div style={{padding:"1.5rem 1rem 3rem"}}>
      <SerifH size={28} style={{marginBottom:18}}>to-do list</SerifH>
      <div style={{display:"flex",gap:6,marginBottom:20}}>
        <input value={newTask} onChange={e=>setNewTask(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addTask()} placeholder="add a to-do..." style={{flex:1,padding:"10px 13px",borderRadius:10,border:`0.5px solid ${T.mid}`,fontSize:11,outline:"none",fontFamily:FONT_SANS,color:"#3A3A3A",background:"#FAFAF8"}}/>
        <select value={newCat} onChange={e=>setNewCat(e.target.value)} style={{padding:"10px 8px",borderRadius:10,border:`0.5px solid ${T.mid}`,fontSize:10,background:"#FAFAF8",color:"#8A8A8A",fontFamily:FONT_SANS}}>{TASK_CATS.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select>
        <PrimaryBtn theme={T} onClick={addTask} style={{padding:"10px 16px",fontSize:16}}>+</PrimaryBtn>
      </div>
      {TASK_CATS.filter(c=>tasks.some(t=>t.cat===c.id)).map(cat=>(
        <div key={cat.id} style={{marginBottom:16}}>
          <Label style={{display:"flex",alignItems:"center",gap:6}}>{cat.label}</Label>
          {tasks.filter(t=>t.cat===cat.id).map(t=>(
            <div key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 13px",background:t.done?T.cardBg:"#FAFAF8",borderRadius:10,marginBottom:5,border:`0.5px solid ${T.mid}`}}>
              <div onClick={()=>setTasks(ts=>ts.map(x=>x.id===t.id?{...x,done:!x.done}:x))} style={{width:15,height:15,borderRadius:50,border:`1px solid ${t.done?T.accent:T.mid}`,background:t.done?T.accent:"transparent",cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>{t.done&&<div style={{width:5,height:5,borderRadius:50,background:"#FAFAF8"}}/>}</div>
              <span style={{flex:1,fontSize:11,color:t.done?"#AAAAAA":"#3A3A3A",textDecoration:t.done?"line-through":"none",fontFamily:FONT_SANS}}>{t.text}</span>
              <button onClick={()=>setTasks(ts=>ts.filter(x=>x.id!==t.id))} style={{background:"none",border:"none",color:"#CCC",cursor:"pointer",fontSize:13}}>×</button>
            </div>
          ))}
        </div>
      ))}
      {tasks.length===0&&<div style={{textAlign:"center",fontFamily:FONT_SERIF,fontStyle:"italic",color:"#AAAAAA",marginTop:32,fontSize:16}}>nothing here yet ✦</div>}
    </div>
  );
}

// ─── Habits Tab ────────────────────────────────────────────────────────────────
function HabitsTab({ T }) {
  const [habits,setHabitsRaw]=useState(()=>{const s=ld("habits",[{id:0,name:"Drink 2L water",streak:0,days:{},startDate:""},{id:1,name:"Morning workout",streak:0,days:{},startDate:""},{id:2,name:"Skincare routine",streak:0,days:{},startDate:""}]);return s.map(h=>({...h,days:h.days||h.weekDays||{}}));});
  const setHabits=v=>{const n=typeof v==="function"?v(habits):v;setHabitsRaw(n);sv("habits",n);};
  const [newH,setNewH]=useState(""); const [newD,setNewD]=useState(""); const [weekOffset,setWeekOffset]=useState(0);
  const getToday=()=>{const d=new Date();d.setHours(0,0,0,0);return d;};
  const mDK=(d)=>{const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),dd=String(d.getDate()).padStart(2,"0");return `${y}-${m}-${dd}`;};
  const todayDate=getToday(); const todayKey=mDK(todayDate);
  const getWeekDays=(off)=>{const base=getToday();const dow=base.getDay();const mon=new Date(base);mon.setDate(base.getDate()-(dow===0?6:dow-1)+off*7);return Array.from({length:7},(_,i)=>{const d=new Date(mon);d.setDate(mon.getDate()+i);return d;});};
  const weekDays=getWeekDays(weekOffset);
  const weekLabel=weekOffset===0?"this week":weekOffset===-1?"last week":`${Math.abs(weekOffset)} weeks ago`;
  const toggle=(habitId,key)=>{
    if(key>todayKey)return;
    setHabits(hs=>hs.map(h=>{
      if(h.id!==habitId)return h;
      const days={...h.days,[key]:!h.days[key]};
      let streak=0;const cur=new Date(todayDate);
      while(true){const k=mDK(cur);if(days[k]){streak++;cur.setDate(cur.getDate()-1);}else break;}
      return{...h,days,streak};
    }));
  };
  const addHabit=()=>{if(!newH.trim())return;setHabits(hs=>[...hs,{id:Date.now(),name:newH,streak:0,days:{},startDate:newD}]);setNewH("");setNewD("");};
  return(
    <div style={{padding:"1.5rem 1rem 3rem"}}>
      <SerifH size={28} style={{marginBottom:18}}>habits</SerifH>
      <Card theme={T} style={{marginBottom:20}}>
        <TxtInp theme={T} value={newH} onChange={e=>setNewH(e.target.value)} placeholder="new habit..." style={{marginBottom:8}}/>
        <div style={{display:"flex",gap:7}}>
          <TxtInp theme={T} type="date" value={newD} onChange={e=>setNewD(e.target.value)} style={{flex:1,color:"#3A3A3A"}}/>
          <PrimaryBtn theme={T} onClick={addHabit} style={{padding:"10px 16px",fontSize:16}}>+</PrimaryBtn>
        </div>
      </Card>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <button onClick={()=>setWeekOffset(w=>w-1)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:T.mid,fontFamily:FONT_SANS}}>‹</button>
        <Label style={{marginBottom:0,letterSpacing:2}}>{weekLabel}</Label>
        <button onClick={()=>setWeekOffset(w=>Math.min(0,w+1))} disabled={weekOffset===0} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:weekOffset===0?T.cardBg:T.mid,fontFamily:FONT_SANS}}>›</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr repeat(7,30px)",gap:4,marginBottom:10,alignItems:"center"}}>
        <div/>
        {weekDays.map((d,i)=>{const k=mDK(d);const isToday=k===todayKey;return(
          <div key={i} style={{textAlign:"center"}}>
            <div style={{fontSize:8,color:isToday?T.accent:"#8A8A8A",fontFamily:FONT_SANS,marginBottom:2,fontWeight:isToday?600:400}}>{DAY_LABELS[i]}</div>
            <div style={{fontSize:8,color:isToday?T.accent:"#AAAAAA",fontFamily:FONT_SANS,fontWeight:isToday?600:400}}>{d.getDate()}</div>
          </div>
        );})}
      </div>
      {habits.map(h=>(
        <div key={h.id} style={{display:"grid",gridTemplateColumns:"1fr repeat(7,30px)",gap:4,alignItems:"center",padding:"10px 0",borderBottom:`0.5px solid ${T.cardBg}`}}>
          <div style={{paddingRight:6}}>
            <div style={{fontSize:12,color:"#3A3A3A",fontFamily:FONT_SANS,marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.name}</div>
            <div style={{fontSize:9,color:T.accent,fontFamily:FONT_SANS}}>✦ {h.streak}d</div>
          </div>
          {weekDays.map((d,i)=>{const k=mDK(d);const done=!!(h.days&&h.days[k]);const notAllowed=k>todayKey;return(
            <div key={i} onClick={()=>{if(!notAllowed)toggle(h.id,k);}}
              style={{width:26,height:26,borderRadius:7,background:done?T.text:notAllowed?"#F5F5F5":T.cardBg,border:`0.5px solid ${done?T.text:notAllowed?"#E8E8E8":T.mid}`,cursor:notAllowed?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto",opacity:notAllowed?0.3:1}}>
              {done&&<div style={{width:7,height:7,borderRadius:50,background:"#FAFAF8"}}/>}
            </div>
          );})}
        </div>
      ))}
      <div style={{marginTop:12,fontFamily:FONT_SANS,fontSize:9,color:"#AAAAAA",textAlign:"center",letterSpacing:1}}>tap today or any past day · ‹ › to navigate</div>
    </div>
  );
}

// ─── Journal Tab ───────────────────────────────────────────────────────────────
function JournalTab({ T }) {
  const [notes,setNotesRaw]=useState(()=>ld("journal_notes",[]));
  const setNotes=v=>{const n=typeof v==="function"?v(notes):v;setNotesRaw(n);sv("journal_notes",n);};
  const [text,setText]=useState(""); const [tag,setTag]=useState("mindset");
  const TAGS=["mindset","wellness","work","fitness","self-care","other"];
  const add=()=>{if(!text.trim())return;setNotes(ns=>[...ns,{id:Date.now(),text,tag,date:new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}]);setText("");};
  return(
    <div style={{padding:"1.5rem 1rem 3rem"}}>
      <SerifH size={28} style={{marginBottom:18}}>journal</SerifH>
      <Card theme={T} style={{marginBottom:20}}>
        <TxtArea theme={T} value={text} onChange={e=>setText(e.target.value)} placeholder="thoughts, reflections, gratitude..." style={{minHeight:90,marginBottom:8}}/>
        <div style={{display:"flex",gap:6,justifyContent:"flex-end",alignItems:"center"}}>
          <select value={tag} onChange={e=>setTag(e.target.value)} style={{padding:"7px 10px",borderRadius:8,border:`0.5px solid ${T.mid}`,fontSize:10,background:"#FAFAF8",color:"#8A8A8A",fontFamily:FONT_SANS}}>{TAGS.map(t=><option key={t}>{t}</option>)}</select>
          <PrimaryBtn theme={T} onClick={add} style={{padding:"8px 18px"}}>save</PrimaryBtn>
        </div>
      </Card>
      {notes.slice().reverse().map(n=>(
        <div key={n.id} style={{padding:"14px 16px",background:"#FAFAF8",borderRadius:12,marginBottom:10,border:`0.5px solid ${T.mid}`,borderLeft:`2px solid ${T.main}`}}>
          {n.date&&<div style={{fontSize:9,color:"#8A8A8A",fontFamily:FONT_SANS,letterSpacing:1,marginBottom:6,textTransform:"uppercase"}}>{n.date}</div>}
          <div style={{fontSize:13,color:"#3A3A3A",lineHeight:1.8,fontFamily:FONT_SANS,marginBottom:8}}>{n.text}</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:9,padding:"3px 10px",borderRadius:20,border:`0.5px solid ${T.mid}`,color:T.text,fontFamily:FONT_SANS,letterSpacing:0.5}}>{n.tag}</span>
            <button onClick={()=>setNotes(ns=>ns.filter(x=>x.id!==n.id))} style={{background:"none",border:"none",color:"#CCC",cursor:"pointer",fontSize:12}}>×</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Timer Tab ──────────────────────────────────────────────────────────────────
function TimerTab({ T }) {
  const [pomo,setPomo]=useState({running:false,mode:"focus",secs:25*60,sessions:0});
  const timerRef=useRef(null);
  useEffect(()=>{if(pomo.running){timerRef.current=setInterval(()=>setPomo(p=>{if(p.secs<=1){const nm=p.mode==="focus"?"break":"focus";return{...p,secs:nm==="focus"?25*60:5*60,mode:nm,running:false,sessions:p.mode==="focus"?p.sessions+1:p.sessions};}return{...p,secs:p.secs-1};}),1000);}else clearInterval(timerRef.current);return()=>clearInterval(timerRef.current);},[pomo.running]);
  const fmt=s=>`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  return(
    <div style={{padding:"1.5rem 1rem 3rem",textAlign:"center"}}>
      <SerifH size={28} style={{marginBottom:24,textAlign:"left"}}>focus timer</SerifH>
      <div style={{background:pomo.mode==="focus"?T.cardBg:lightenHex("#D4DEC4",40),borderRadius:20,padding:"36px 24px",marginBottom:16,border:`0.5px solid ${T.mid}`}}>
        <Label>{pomo.mode==="focus"?"focus time":"break time"}</Label>
        <div style={{fontFamily:FONT_SERIF,fontSize:72,fontWeight:300,color:"#3A3A3A",letterSpacing:4,marginBottom:24,fontVariantNumeric:"tabular-nums"}}>{fmt(pomo.secs)}</div>
        <div style={{display:"flex",gap:10,justifyContent:"center",marginBottom:20}}>
          <PrimaryBtn theme={T} onClick={()=>setPomo(p=>({...p,running:!p.running}))} style={{padding:"12px 32px",letterSpacing:1.5}}>{pomo.running?"pause":"start"}</PrimaryBtn>
          <GhostBtn theme={T} onClick={()=>setPomo({running:false,mode:"focus",secs:25*60,sessions:pomo.sessions})}>reset</GhostBtn>
        </div>
        <div style={{display:"flex",justifyContent:"center",gap:6}}>{Array.from({length:Math.min(pomo.sessions,8)}).map((_,i)=><div key={i} style={{width:6,height:6,borderRadius:50,background:T.accent}}/>)}</div>
        {pomo.sessions>0&&<div style={{fontFamily:FONT_SANS,fontSize:10,color:"#8A8A8A",marginTop:8}}>{pomo.sessions} session{pomo.sessions!==1?"s":""} today</div>}
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"center"}}>{[["focus",25],["short break",5],["long break",15]].map(([label,mins])=><GhostBtn key={label} theme={T} onClick={()=>setPomo(p=>({...p,running:false,mode:mins===25?"focus":"break",secs:mins*60}))} style={{fontSize:10,letterSpacing:0.5}}>{label}</GhostBtn>)}</div>
    </div>
  );
}

// ─── Vision Tab ─────────────────────────────────────────────────────────────────
function VisionTab({ T }) {
  const [images,setImagesRaw]=useState(()=>ld("vision_imgs",[]));
  const [label,setLabel]=useState("");
  const fileRef=useRef(null);const boardRef=useRef(null);const dragging=useRef(null);const offset=useRef({x:0,y:0});
  const setImages=v=>{const n=typeof v==="function"?v(images):v;setImagesRaw(n);sv("vision_imgs",n);};
  const upload=e=>{Array.from(e.target.files).forEach(file=>{const r=new FileReader();r.onload=ev=>setImages(imgs=>[...imgs,{id:Date.now()+Math.random(),src:ev.target.result,label:label||"",x:Math.random()*80,y:Math.random()*60,w:160,z:imgs.length}]);r.readAsDataURL(file);});setLabel("");};
  const onDown=(e,id)=>{e.preventDefault();const board=boardRef.current.getBoundingClientRect();const img=images.find(i=>i.id===id);dragging.current=id;const cx=e.touches?e.touches[0].clientX:e.clientX;const cy=e.touches?e.touches[0].clientY:e.clientY;offset.current={x:cx-board.left-img.x,y:cy-board.top-img.y};setImages(imgs=>imgs.map(i=>i.id===id?{...i,z:Math.max(...imgs.map(x=>x.z))+1}:i));};
  const onMove=useCallback(e=>{if(!dragging.current)return;const board=boardRef.current.getBoundingClientRect();const cx=e.touches?e.touches[0].clientX:e.clientX;const cy=e.touches?e.touches[0].clientY:e.clientY;setImages(imgs=>imgs.map(i=>i.id!==dragging.current?i:{...i,x:cx-board.left-offset.current.x,y:cy-board.top-offset.current.y}));},[images]);
  const onUp=()=>{dragging.current=null;};
  useEffect(()=>{window.addEventListener("mousemove",onMove);window.addEventListener("mouseup",onUp);window.addEventListener("touchmove",onMove,{passive:false});window.addEventListener("touchend",onUp);return()=>{window.removeEventListener("mousemove",onMove);window.removeEventListener("mouseup",onUp);window.removeEventListener("touchmove",onMove);window.removeEventListener("touchend",onUp);};},[onMove]);
  const resize=(id,d)=>setImages(imgs=>imgs.map(i=>i.id===id?{...i,w:Math.max(80,Math.min(300,i.w+d))}:i));
  const [letters,setLettersRaw]=useState(()=>ld("letters",[]));
  const setLetters=v=>{const n=typeof v==="function"?v(letters):v;setLettersRaw(n);sv("letters",n);};
  const [lText,setLText]=useState("");const [lDelivery,setLDelivery]=useState("");const [opened,setOpened]=useState(null);
  const addLetter=()=>{if(!lText.trim()||!lDelivery)return;setLetters(ls=>[...ls,{id:Date.now(),text:lText,deliveryDate:lDelivery,written:new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}]);setLText("");setLDelivery("");};
  const shortDate=m=>{const d=new Date();d.setMonth(d.getMonth()+m);return d.toISOString().split("T")[0];};
  return(
    <div style={{padding:"1.5rem 1rem 3rem"}}>
      {opened&&(
        <div onClick={()=>setOpened(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#FAFAF8",borderRadius:16,padding:28,maxWidth:420,width:"100%",maxHeight:"80vh",overflowY:"auto",border:`0.5px solid ${T.mid}`}}>
            <Label>written {opened.written}</Label>
            <div style={{fontFamily:FONT_SERIF,fontStyle:"italic",fontSize:18,color:"#3A3A3A",lineHeight:1.9,whiteSpace:"pre-wrap",marginBottom:20}}>{opened.text}</div>
            <PrimaryBtn theme={T} style={{width:"100%"}} onClick={()=>setOpened(null)}>close</PrimaryBtn>
          </div>
        </div>
      )}
      <SerifH size={28} style={{marginBottom:4}}>vision board</SerifH>
      <div style={{fontFamily:FONT_SANS,fontSize:10,color:"#8A8A8A",marginBottom:18}}>visualise the life you're creating</div>
      <BlushCard theme={T} style={{marginBottom:12}}>
        <TxtInp theme={T} value={label} onChange={e=>setLabel(e.target.value)} placeholder="label (optional)" style={{marginBottom:8}}/>
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={upload} style={{display:"none"}}/>
        <button onClick={()=>fileRef.current.click()} style={{width:"100%",padding:"10px",borderRadius:10,background:"#FAFAF8",border:`0.5px dashed ${T.mid}`,color:T.text,cursor:"pointer",fontSize:11,fontFamily:FONT_SANS,letterSpacing:0.5}}>+ upload image(s)</button>
      </BlushCard>
      {images.length===0?(
        <div style={{textAlign:"center",padding:"36px 20px",color:"#8A8A8A",marginBottom:20}}><SerifH size={18} style={{marginBottom:6}}>your board awaits</SerifH><div style={{fontSize:11,fontFamily:FONT_SANS}}>upload images and arrange them freely</div></div>
      ):(
        <div style={{marginBottom:24}}>
          <div style={{fontSize:9,color:"#8A8A8A",marginBottom:8,textAlign:"center",fontFamily:FONT_SANS,letterSpacing:1}}>drag to move · − + to resize</div>
          <div ref={boardRef} style={{position:"relative",minHeight:360,background:"#FAFAF8",borderRadius:16,border:`0.5px solid ${T.mid}`,overflow:"hidden",userSelect:"none"}}>
            {images.map(img=>(
              <div key={img.id} style={{position:"absolute",left:img.x,top:img.y,width:img.w,zIndex:img.z,cursor:"grab"}} onMouseDown={e=>onDown(e,img.id)} onTouchStart={e=>onDown(e,img.id)}>
                <div style={{borderRadius:8,overflow:"hidden",border:"1px solid #FAFAF8",boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}><img src={img.src} alt={img.label} style={{width:"100%",display:"block",pointerEvents:"none"}}/>{img.label&&<div style={{background:"rgba(58,58,58,0.7)",padding:"3px 8px",fontSize:9,color:"#FAFAF8",fontFamily:FONT_SANS}}>{img.label}</div>}</div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:3}}>
                  <div style={{display:"flex",gap:2}}>
                    <button onMouseDown={e=>e.stopPropagation()} onClick={()=>resize(img.id,-20)} style={{padding:"1px 7px",fontSize:10,borderRadius:4,border:`0.5px solid ${T.mid}`,background:"#FAFAF8",color:"#8A8A8A",cursor:"pointer",fontFamily:FONT_SANS}}>−</button>
                    <button onMouseDown={e=>e.stopPropagation()} onClick={()=>resize(img.id,20)} style={{padding:"1px 7px",fontSize:10,borderRadius:4,border:`0.5px solid ${T.mid}`,background:"#FAFAF8",color:"#8A8A8A",cursor:"pointer",fontFamily:FONT_SANS}}>+</button>
                  </div>
                  <button onMouseDown={e=>e.stopPropagation()} onClick={()=>setImages(imgs=>imgs.filter(x=>x.id!==img.id))} style={{padding:"1px 7px",fontSize:10,borderRadius:4,border:`0.5px solid ${T.mid}`,background:"#FAFAF8",color:"#CCC",cursor:"pointer",fontFamily:FONT_SANS}}>×</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <HR theme={T}/>
      <SerifH size={22} style={{marginBottom:4}}>letter to future self</SerifH>
      <div style={{fontFamily:FONT_SANS,fontSize:10,color:"#8A8A8A",marginBottom:16}}>write a letter — it unlocks on the day you choose.</div>
      {letters.map(l=>{const due=new Date(l.deliveryDate),ready=new Date()>=due,daysLeft=Math.ceil((due-new Date())/(1000*60*60*24));return(
        <div key={l.id} style={{padding:"12px 14px",background:"#FAFAF8",borderRadius:12,marginBottom:8,border:`0.5px solid ${ready?T.accent:T.mid}`,borderLeft:`2px solid ${ready?T.accent:T.mid}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><SerifH size={14} style={{marginBottom:2}}>{ready?"ready to open ✦":`opens in ${daysLeft} day${daysLeft!==1?"s":""}`}</SerifH><div style={{fontSize:9,color:"#8A8A8A",fontFamily:FONT_SANS,letterSpacing:1}}>written {l.written}</div></div>
            <div style={{display:"flex",gap:6}}>{ready&&<PrimaryBtn theme={T} onClick={()=>setOpened(l)} style={{fontSize:10,padding:"5px 12px"}}>open</PrimaryBtn>}<button onClick={()=>setLetters(ls=>ls.filter(x=>x.id!==l.id))} style={{background:"none",border:"none",color:"#CCC",cursor:"pointer",fontSize:13}}>×</button></div>
          </div>
        </div>
      );})}
      <BlushCard theme={T}>
        <TxtArea theme={T} value={lText} onChange={e=>setLText(e.target.value)} placeholder={"dear future me,\n\nright now I am..."} style={{minHeight:120,marginBottom:10}}/>
        <div style={{display:"flex",gap:8,alignItems:"flex-end",marginBottom:10}}>
          <div style={{flex:1}}><Label>deliver on</Label><TxtInp theme={T} type="date" value={lDelivery} onChange={e=>setLDelivery(e.target.value)} style={{color:"#3A3A3A"}}/></div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>{[["+ 3m",3],["+ 6m",6],["+ 1y",12]].map(([lb,mo])=><GhostBtn key={lb} theme={T} onClick={()=>setLDelivery(shortDate(mo))} style={{fontSize:9,padding:"4px 8px"}}>{lb}</GhostBtn>)}</div>
        </div>
        <PrimaryBtn theme={T} style={{width:"100%",letterSpacing:1.5}} disabled={!lText.trim()||!lDelivery} onClick={addLetter}>seal & save ✦</PrimaryBtn>
      </BlushCard>
    </div>
  );
}

// ─── Wishlist Tab ──────────────────────────────────────────────────────────────
function WishlistTab({ T }) {
  const [wishlist,setWishlistRaw]=useState(()=>ld("wishlist",[]));
  const setWishlist=v=>{const n=typeof v==="function"?v(wishlist):v;setWishlistRaw(n);sv("wishlist",n);};
  const [newW,setNewW]=useState("");const [newP,setNewP]=useState("");const [newPri,setNewPri]=useState("medium");const [pendingImg,setPendingImg]=useState(null);
  const fileRef=useRef(null);
  const editImgRef=useRef(null);
  const [editingId,setEditingId]=useState(null);
  const [editDraft,setEditDraft]=useState(null);
  const add=()=>{if(!newW.trim())return;setWishlist(ws=>[...ws,{id:Date.now(),text:newW,price:newP,priority:newPri,bought:false,img:pendingImg}]);setNewW("");setNewP("");setPendingImg(null);};
  const priDot={high:T.deep,medium:T.accent,low:T.mid};
  const openEdit=(w)=>{setEditDraft({...w});setEditingId(w.id);};
  const saveEdit=()=>{setWishlist(ws=>ws.map(x=>x.id===editingId?{...editDraft}:x));setEditingId(null);setEditDraft(null);};
  return(
    <div style={{padding:"1.5rem 1rem 3rem"}}>

      {/* Edit Modal */}
      {editingId&&editDraft&&(
        <div onClick={()=>{setEditingId(null);setEditDraft(null);}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#FAFAF8",borderRadius:20,padding:24,width:"100%",maxWidth:380,maxHeight:"90vh",overflowY:"auto",border:`0.5px solid ${T.mid}`}}>
            <SerifH size={20} style={{marginBottom:18,textAlign:"center"}}>edit item</SerifH>
            <Label>item name</Label>
            <TxtInp theme={T} value={editDraft.text} onChange={e=>setEditDraft(d=>({...d,text:e.target.value}))} style={{marginBottom:10}}/>
            <Label>price</Label>
            <TxtInp theme={T} value={editDraft.price||""} onChange={e=>setEditDraft(d=>({...d,price:e.target.value}))} style={{marginBottom:10}}/>
            <Label>priority</Label>
            <select value={editDraft.priority} onChange={e=>setEditDraft(d=>({...d,priority:e.target.value}))} style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`0.5px solid ${T.mid}`,fontSize:11,background:"#FAFAF8",color:"#3A3A3A",fontFamily:FONT_SANS,marginBottom:14,outline:"none"}}>
              <option value="high">high</option><option value="medium">medium</option><option value="low">low</option>
            </select>
            <Label>image</Label>
            <input ref={editImgRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setEditDraft(d=>({...d,img:ev.target.result}));r.readAsDataURL(f);}}/>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <button onClick={()=>editImgRef.current.click()} style={{padding:"7px 14px",borderRadius:9,background:"#FAFAF8",border:`0.5px dashed ${T.mid}`,color:T.text,cursor:"pointer",fontSize:10,fontFamily:FONT_SANS}}>{editDraft.img?"change image":"+ add image"}</button>
              {editDraft.img&&<><div style={{width:36,height:36,background:"#F5F5F3",borderRadius:6,border:`0.5px solid ${T.mid}`,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}><img src={editDraft.img} alt="" style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain"}}/></div><button onClick={()=>setEditDraft(d=>({...d,img:null}))} style={{background:"none",border:"none",color:"#CCC",cursor:"pointer",fontSize:13}}>×</button></>}
            </div>
            <PrimaryBtn theme={T} style={{width:"100%",marginBottom:8}} onClick={saveEdit}>save changes</PrimaryBtn>
            <GhostBtn theme={T} style={{width:"100%"}} onClick={()=>{setEditingId(null);setEditDraft(null);}}>cancel</GhostBtn>
          </div>
        </div>
      )}

      <SerifH size={28} style={{marginBottom:18}}>wish list</SerifH>
      <BlushCard theme={T} style={{marginBottom:20}}>
        <TxtInp theme={T} value={newW} onChange={e=>setNewW(e.target.value)} placeholder="item name..." style={{marginBottom:8}}/>
        <div style={{display:"flex",gap:7,marginBottom:8}}>
          <TxtInp theme={T} value={newP} onChange={e=>setNewP(e.target.value)} placeholder="price (optional)"/>
          <select value={newPri} onChange={e=>setNewPri(e.target.value)} style={{padding:"10px 8px",borderRadius:10,border:`0.5px solid ${T.mid}`,fontSize:10,background:"#FAFAF8",color:"#8A8A8A",fontFamily:FONT_SANS}}><option value="high">high</option><option value="medium">medium</option><option value="low">low</option></select>
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setPendingImg(ev.target.result);r.readAsDataURL(f);}}/>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
          <button onClick={()=>fileRef.current.click()} style={{padding:"7px 14px",borderRadius:9,background:"#FAFAF8",border:`0.5px dashed ${T.mid}`,color:T.text,cursor:"pointer",fontSize:10,fontFamily:FONT_SANS}}>{pendingImg?"✓ image added":"+ add product image"}</button>
          {pendingImg&&<><div style={{width:36,height:36,background:"#F5F5F3",borderRadius:6,border:`0.5px solid ${T.mid}`,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}><img src={pendingImg} alt="preview" style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain"}}/></div><button onClick={()=>setPendingImg(null)} style={{background:"none",border:"none",color:"#CCC",cursor:"pointer",fontSize:13}}>×</button></>}
        </div>
        <PrimaryBtn theme={T} style={{width:"100%",letterSpacing:1}} onClick={add}>+ add to list</PrimaryBtn>
      </BlushCard>

      {wishlist.length===0&&<div style={{textAlign:"center",fontFamily:FONT_SERIF,fontStyle:"italic",color:"#AAAAAA",marginTop:32,fontSize:16}}>your wish list is empty ✦</div>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
        {wishlist.map(w=>(
          <div key={w.id} style={{background:"#FFFFFF",borderRadius:14,overflow:"hidden",border:`0.5px solid ${T.mid}`,opacity:w.bought?0.5:1}}>
            <div style={{width:"100%",background:"#FFFFFF",display:"flex",alignItems:"center",justifyContent:"center",padding:"10px 0",minHeight:80}}>
              {w.img
                ? <img src={w.img} alt={w.text} style={{width:"70%",maxHeight:100,objectFit:"contain",display:"block"}}/>
                : <div style={{width:6,height:6,borderRadius:50,background:priDot[w.priority]}}/>
              }
            </div>
            <div style={{padding:"8px 9px"}}>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:3}}>
                <span style={{fontSize:10,color:"#3A3A3A",fontFamily:FONT_SANS,flex:1,textDecoration:w.bought?"line-through":"none",lineHeight:1.4}}>{w.text}</span>
                <div style={{width:5,height:5,borderRadius:50,background:priDot[w.priority],marginTop:3,flexShrink:0,marginLeft:4}}/>
              </div>
              {w.price&&<div style={{fontSize:9,color:"#8A8A8A",fontFamily:FONT_SANS,marginBottom:5}}>{w.price}</div>}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:4}}>
                <div style={{display:"flex",gap:3}}>
                  <button onClick={()=>openEdit(w)} style={{fontSize:8,padding:"3px 7px",borderRadius:7,border:`0.5px solid ${T.mid}`,cursor:"pointer",background:"transparent",color:"#8A8A8A",fontFamily:FONT_SANS}}>edit</button>
                  <button onClick={()=>setWishlist(ws=>ws.map(x=>x.id===w.id?{...x,bought:!x.bought}:x))} style={{fontSize:8,padding:"3px 7px",borderRadius:7,border:`0.5px solid ${T.mid}`,cursor:"pointer",background:w.bought?T.cardBg:"#3A3A3A",color:w.bought?"#8A8A8A":"#FAFAF8",fontFamily:FONT_SANS}}>{w.bought?"✓":"bought"}</button>
                </div>
                <button onClick={()=>setWishlist(ws=>ws.filter(x=>x.id!==w.id))} style={{background:"none",border:"none",color:"#CCC",cursor:"pointer",fontSize:12}}>×</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Books Tab ──────────────────────────────────────────────────────────────────
function BooksTab({ T }) {
  const [books,setBooksRaw]=useState(()=>ld("books",[]));
  const setBooks=v=>{const n=typeof v==="function"?v(books):v;setBooksRaw(n);sv("books",n);};
  const [newB,setNewB]=useState("");const [newA,setNewA]=useState("");const [status,setStatus]=useState("want to read");
  const [pendingCover,setPendingCover]=useState(null);
  const coverRef=useRef(null);
  const editCoverRef=useRef(null);
  const [editingId,setEditingId]=useState(null);
  const [notesId,setNotesId]=useState(null);
  const [editDraft,setEditDraft]=useState(null);

  const add=()=>{if(!newB.trim())return;setBooks(bs=>[...bs,{id:Date.now(),title:newB,author:newA,status,current:0,total:0,cover:pendingCover,rating:0,notes:""}]);setNewB("");setNewA("");setPendingCover(null);};

  const openEdit=(b)=>{setEditDraft({...b});setEditingId(b.id);};
  const saveEdit=()=>{setBooks(bs=>bs.map(x=>x.id===editingId?{...editDraft}:x));setEditingId(null);setEditDraft(null);};

  const Stars=({rating,onChange})=>(
    <div style={{display:"flex",gap:3}}>
      {[1,2,3,4,5].map(i=>(
        <button key={i} onClick={()=>onChange&&onChange(i===rating?0:i)} style={{background:"none",border:"none",cursor:onChange?"pointer":"default",padding:0,fontSize:14,lineHeight:1}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill={i<=rating?"#3A3A3A":"none"} stroke="#3A3A3A" strokeWidth="1.5">
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
          </svg>
        </button>
      ))}
    </div>
  );

  const bkStatusColor={"reading":T.accent,"want to read":T.mid,"finished":T.deep,"dropped":"#E0E0E0"};

  return(
    <div style={{padding:"1.5rem 1rem 3rem"}}>

      {/* Edit Modal */}
      {editingId&&editDraft&&(
        <div onClick={()=>{setEditingId(null);setEditDraft(null);}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#FAFAF8",borderRadius:20,padding:24,width:"100%",maxWidth:380,maxHeight:"90vh",overflowY:"auto",border:`0.5px solid ${T.mid}`}}>
            <SerifH size={20} style={{marginBottom:18,textAlign:"center"}}>edit book</SerifH>
            <Label>title</Label>
            <TxtInp theme={T} value={editDraft.title} onChange={e=>setEditDraft(d=>({...d,title:e.target.value}))} style={{marginBottom:10}}/>
            <Label>author</Label>
            <TxtInp theme={T} value={editDraft.author||""} onChange={e=>setEditDraft(d=>({...d,author:e.target.value}))} style={{marginBottom:10}}/>
            <Label>status</Label>
            <select value={editDraft.status} onChange={e=>setEditDraft(d=>({...d,status:e.target.value}))} style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`0.5px solid ${T.mid}`,fontSize:11,background:"#FAFAF8",color:"#3A3A3A",fontFamily:FONT_SANS,marginBottom:10,outline:"none"}}><option>want to read</option><option>reading</option><option>finished</option><option>dropped</option></select>
            {(editDraft.status==="reading"||editDraft.status==="finished")&&(
              <div style={{display:"flex",gap:8,marginBottom:10}}>
                <div style={{flex:1}}><Label>current page</Label><input type="number" value={editDraft.current||""} onChange={e=>setEditDraft(d=>({...d,current:parseInt(e.target.value)||0}))} style={{width:"100%",padding:"9px 12px",borderRadius:10,border:`0.5px solid ${T.mid}`,fontSize:11,outline:"none",fontFamily:FONT_SANS,background:"#FAFAF8"}}/></div>
                <div style={{flex:1}}><Label>total pages</Label><input type="number" value={editDraft.total||""} onChange={e=>setEditDraft(d=>({...d,total:parseInt(e.target.value)||0}))} style={{width:"100%",padding:"9px 12px",borderRadius:10,border:`0.5px solid ${T.mid}`,fontSize:11,outline:"none",fontFamily:FONT_SANS,background:"#FAFAF8"}}/></div>
              </div>
            )}
            <Label>rating</Label>
            <div style={{marginBottom:14}}><Stars rating={editDraft.rating||0} onChange={v=>setEditDraft(d=>({...d,rating:v}))}/></div>
            <Label>cover image</Label>
            <input ref={editCoverRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setEditDraft(d=>({...d,cover:ev.target.result}));r.readAsDataURL(f);}}/>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <button onClick={()=>editCoverRef.current.click()} style={{padding:"7px 14px",borderRadius:9,background:"#FAFAF8",border:`0.5px dashed ${T.mid}`,color:T.text,cursor:"pointer",fontSize:10,fontFamily:FONT_SANS}}>{editDraft.cover?"change cover":"+ add cover"}</button>
              {editDraft.cover&&<><img src={editDraft.cover} alt="cover" style={{height:50,width:35,objectFit:"cover",borderRadius:4,border:`0.5px solid ${T.mid}`}}/><button onClick={()=>setEditDraft(d=>({...d,cover:null}))} style={{background:"none",border:"none",color:"#CCC",cursor:"pointer",fontSize:13}}>×</button></>}
            </div>
            <Label>notes</Label>
            <TxtArea theme={T} value={editDraft.notes||""} onChange={e=>setEditDraft(d=>({...d,notes:e.target.value}))} placeholder="your thoughts, quotes, reflections..." style={{minHeight:80,marginBottom:16}}/>
            <PrimaryBtn theme={T} style={{width:"100%",marginBottom:8}} onClick={saveEdit}>save changes</PrimaryBtn>
            <GhostBtn theme={T} style={{width:"100%"}} onClick={()=>{setEditingId(null);setEditDraft(null);}}>cancel</GhostBtn>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {notesId&&(()=>{const b=books.find(x=>x.id===notesId);if(!b)return null;return(
        <div onClick={()=>setNotesId(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#FAFAF8",borderRadius:20,padding:24,width:"100%",maxWidth:400,maxHeight:"80vh",overflowY:"auto",border:`0.5px solid ${T.mid}`}}>
            <SerifH size={18} style={{marginBottom:4}}>{b.title}</SerifH>
            {b.author&&<div style={{fontSize:10,color:"#8A8A8A",fontFamily:FONT_SANS,marginBottom:16}}>{b.author}</div>}
            {b.rating>0&&<div style={{marginBottom:16}}><Stars rating={b.rating}/></div>}
            <div style={{fontFamily:FONT_SANS,fontSize:12,color:"#3A3A3A",lineHeight:1.9,whiteSpace:"pre-wrap"}}>{b.notes||<span style={{color:"#AAAAAA",fontStyle:"italic"}}>no notes yet ✦</span>}</div>
            <PrimaryBtn theme={T} style={{width:"100%",marginTop:20}} onClick={()=>setNotesId(null)}>close</PrimaryBtn>
          </div>
        </div>
      );})()||null}

      <SerifH size={28} style={{marginBottom:18}}>books</SerifH>

      {/* Add form */}
      <BlushCard theme={T} style={{marginBottom:20}}>
        <TxtInp theme={T} value={newB} onChange={e=>setNewB(e.target.value)} placeholder="book title..." style={{marginBottom:8}}/>
        <div style={{display:"flex",gap:7,marginBottom:8}}>
          <TxtInp theme={T} value={newA} onChange={e=>setNewA(e.target.value)} placeholder="author"/>
          <select value={status} onChange={e=>setStatus(e.target.value)} style={{padding:"10px 8px",borderRadius:10,border:`0.5px solid ${T.mid}`,fontSize:10,background:"#FAFAF8",color:"#8A8A8A",fontFamily:FONT_SANS}}><option>want to read</option><option>reading</option><option>finished</option><option>dropped</option></select>
          <PrimaryBtn theme={T} onClick={add} style={{padding:"10px 14px",fontSize:16}}>+</PrimaryBtn>
        </div>
        <input ref={coverRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setPendingCover(ev.target.result);r.readAsDataURL(f);}}/>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={()=>coverRef.current.click()} style={{padding:"7px 14px",borderRadius:9,background:"#FAFAF8",border:`0.5px dashed ${T.mid}`,color:T.text,cursor:"pointer",fontSize:10,fontFamily:FONT_SANS,letterSpacing:0.5}}>{pendingCover?"✓ cover added":"+ add cover (optional)"}</button>
          {pendingCover&&<><img src={pendingCover} alt="cover preview" style={{height:44,width:30,objectFit:"cover",borderRadius:4,border:`0.5px solid ${T.mid}`}}/><button onClick={()=>setPendingCover(null)} style={{background:"none",border:"none",color:"#CCC",cursor:"pointer",fontSize:13}}>×</button></>}
        </div>
      </BlushCard>

      {/* Grid by status */}
      {["reading","want to read","finished","dropped"].map(s=>{
        const bks=books.filter(b=>b.status===s);if(!bks.length)return null;return(
        <div key={s} style={{marginBottom:24}}>
          <Label>{s}</Label>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
            {bks.map(b=>(
              <div key={b.id} style={{background:"transparent"}}>
                {b.cover
                  ? <div style={{display:"flex",justifyContent:"center",marginBottom:6}}><img src={b.cover} alt={b.title} style={{height:180,width:"auto",objectFit:"contain",display:"block",borderRadius:4}}/></div>
                  : <div style={{height:180,background:"#F0EDEA",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:6}}><span style={{fontFamily:FONT_SERIF,fontStyle:"italic",fontSize:11,color:"#AAAAAA"}}>no cover</span></div>
                }
                <div style={{background:"transparent",borderRadius:10,padding:"6px 2px",border:"none"}}>
                  <div style={{fontSize:11,color:"#3A3A3A",fontFamily:FONT_SERIF,fontStyle:"italic",lineHeight:1.3,marginBottom:2}}>{b.title}</div>
                  {b.author&&<div style={{fontSize:9,color:"#8A8A8A",fontFamily:FONT_SANS,marginBottom:6}}>{b.author}</div>}
                  {b.rating>0&&<div style={{marginBottom:6}}><Stars rating={b.rating}/></div>}
                  {(b.status==="reading"||b.status==="finished")&&b.total>0&&(
                    <div style={{marginBottom:6}}>
                      <div style={{height:1,background:T.mid,borderRadius:10,marginBottom:3}}><div style={{height:1,width:`${Math.min(100,Math.round((b.current||0)/b.total*100))}%`,background:T.accent,borderRadius:10}}/></div>
                      <div style={{fontSize:9,color:"#8A8A8A",fontFamily:FONT_SANS}}>{b.current||0} / {b.total} p.</div>
                    </div>
                  )}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:4}}>
                    <div style={{display:"flex",gap:3}}>
                      <button onClick={()=>openEdit(b)} style={{fontSize:8,padding:"3px 7px",borderRadius:7,border:`0.5px solid ${T.mid}`,cursor:"pointer",background:"transparent",color:"#8A8A8A",fontFamily:FONT_SANS}}>edit</button>
                      {(b.notes||(b.rating>0))&&<button onClick={()=>setNotesId(b.id)} style={{fontSize:8,padding:"3px 7px",borderRadius:7,border:`0.5px solid ${T.mid}`,cursor:"pointer",background:"#3A3A3A",color:"#FAFAF8",fontFamily:FONT_SANS}}>notes</button>}
                      {!(b.notes)&&b.rating===0&&<button onClick={()=>setNotesId(b.id)} style={{fontSize:8,padding:"3px 7px",borderRadius:7,border:`0.5px solid ${T.mid}`,cursor:"pointer",background:"transparent",color:"#8A8A8A",fontFamily:FONT_SANS}}>notes</button>}
                    </div>
                    <button onClick={()=>setBooks(bs=>bs.filter(x=>x.id!==b.id))} style={{background:"none",border:"none",color:"#CCC",cursor:"pointer",fontSize:13}}>×</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );})}
      {books.length===0&&<div style={{textAlign:"center",fontFamily:FONT_SERIF,fontStyle:"italic",color:"#AAAAAA",marginTop:32,fontSize:16}}>your reading list awaits ✦</div>}
    </div>
  );
}

// ─── Me Tab ────────────────────────────────────────────────────────────────────
function MeTab({ data, setData, T, onReset, onSoftReset }) {
  const [showPicker, setShowPicker] = useState(false);
  const [showReset, setShowReset] = useState(false);
  return(
    <div style={{padding:"1.5rem 1rem 3rem"}}>
      {showPicker&&<ColorPickerModal current={data.colorHex||PALETTE[0].main} onSave={h=>{const nd={...data,colorHex:h};setData(nd);sv("plannerdata",nd);setShowPicker(false);}} onClose={()=>setShowPicker(false)}/>}
      {showReset&&(
        <div onClick={()=>setShowReset(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#FAFAF8",borderRadius:20,padding:24,width:"100%",maxWidth:360,border:`0.5px solid ${T.mid}`}}>
            <SerifH size={22} style={{marginBottom:6,textAlign:"center"}}>reset journey</SerifH>
            <div style={{fontFamily:FONT_SANS,fontSize:11,color:"#8A8A8A",marginBottom:20,textAlign:"center",lineHeight:1.7}}>choose what to keep</div>
            <button onClick={()=>{onSoftReset();setShowReset(false);}} style={{width:"100%",padding:"14px 16px",borderRadius:14,background:T.cardBg,border:`0.5px solid ${T.mid}`,color:"#3A3A3A",cursor:"pointer",fontSize:12,textAlign:"left",marginBottom:10,fontFamily:FONT_SANS}}>
              <div style={{fontWeight:500,marginBottom:3}}>reset progress only</div>
              <div style={{fontSize:10,color:"#8A8A8A"}}>keep goals, habits & to-do list — restart from day 1</div>
            </button>
            <button onClick={()=>{onReset();setShowReset(false);}} style={{width:"100%",padding:"14px 16px",borderRadius:14,background:"#FFF5F5",border:"0.5px solid #F0D0D0",color:"#C47080",cursor:"pointer",fontSize:12,textAlign:"left",marginBottom:10,fontFamily:FONT_SANS}}>
              <div style={{fontWeight:500,marginBottom:3}}>full restart</div>
              <div style={{fontSize:10,color:"#D4A0B0"}}>start completely fresh — new profile, new goals</div>
            </button>
            <GhostBtn theme={T} style={{width:"100%"}} onClick={()=>setShowReset(false)}>cancel</GhostBtn>
          </div>
        </div>
      )}
      <div style={{textAlign:"center",marginBottom:28}}>
        <div style={{width:64,height:64,borderRadius:50,background:T.main,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px",border:`0.5px solid ${T.mid}`}}>
          <span style={{fontFamily:FONT_SERIF,fontStyle:"italic",fontSize:24,color:T.text}}>✦</span>
        </div>
        <SerifH size={26}>{data.name}</SerifH>
        <div style={{fontFamily:FONT_SANS,fontSize:10,color:"#8A8A8A",marginTop:4}}>started {data.startDate?new Date(data.startDate).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"}):"—"}</div>
      </div>
      {data.snapshot&&(
        <Card theme={T} style={{marginBottom:14}}>
          <Label>day 1 snapshot</Label>
          <div style={{fontFamily:FONT_SANS,fontSize:12,color:"#3A3A3A",marginBottom:5}}>I see myself as: <em style={{color:T.text}}>{data.snapshot.selfView}</em></div>
          {data.snapshot.wins&&<div style={{fontSize:11,color:"#8A8A8A",lineHeight:1.6,marginBottom:5}}>{data.snapshot.wins}</div>}
          {data.snapshot.wantToChange?.length>0&&<div style={{fontSize:10,color:"#8A8A8A"}}>changing: {data.snapshot.wantToChange.join(", ")}</div>}
        </Card>
      )}
      {data.vision90&&(
        <Card theme={T} style={{marginBottom:20}}>
          <Label>your 90-day vision</Label>
          <div style={{fontFamily:FONT_SERIF,fontStyle:"italic",fontSize:14,color:"#3A3A3A",lineHeight:1.8}}>"{data.vision90}"</div>
        </Card>
      )}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        <button onClick={()=>setShowPicker(true)} style={{padding:"14px 16px",borderRadius:13,background:T.cardBg,border:`0.5px solid ${T.mid}`,color:"#3A3A3A",cursor:"pointer",fontSize:12,textAlign:"left",display:"flex",alignItems:"center",gap:12,fontFamily:FONT_SANS}}>
          <div style={{width:18,height:18,borderRadius:50,background:T.main,border:`1px solid ${T.mid}`}}/> change colour
        </button>
        <button onClick={()=>setShowReset(true)} style={{padding:"14px 16px",borderRadius:13,background:"#FAFAF8",border:"0.5px solid #E8E0E0",color:"#8A8A8A",cursor:"pointer",fontSize:11,textAlign:"left",fontFamily:FONT_SANS}}>⚠ reset journey</button>
      </div>
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [plannerData, setPlannerDataRaw] = useState(() => ld("plannerdata", null));
  const [activeTab, setActiveTab] = useState("today");

  const setPlannerData = (v) => { const n=typeof v==="function"?v(plannerData):v; setPlannerDataRaw(n); sv("plannerdata",n); };
  const handleSetupComplete = (data) => { sv("plannerdata",data); setPlannerDataRaw(data); setActiveTab("today"); };
  const handleReset = () => { ["plannerdata","todos","habits","journal_notes","vision_imgs","letters","wishlist","books"].forEach(k=>localStorage.removeItem("tgr_"+k)); for(let i=1;i<=90;i++) localStorage.removeItem("tgr_daydata_"+i); setPlannerDataRaw(null); };
  const handleSoftReset = () => { const nd={...plannerData,startDate:new Date().toISOString().split("T")[0],goals:(plannerData.goals||[]).map(g=>({...g,current:0}))}; for(let i=1;i<=90;i++) localStorage.removeItem("tgr_daydata_"+i); const h=ld("habits",[]); sv("habits",h.map(x=>({...x,streak:0,days:{}}))); sv("plannerdata",nd); setPlannerDataRaw(nd); };

  if (!plannerData) return <SetupFlow onComplete={handleSetupComplete}/>;

  const T = buildTheme(plannerData.colorHex || PALETTE[0].main);
  const dayNum = getCurrentDay(plannerData.startDate);
  const today = new Date();

  const TABS = [
    {id:"today",label:"today"},{id:"journey",label:"journey"},{id:"goals",label:"goals"},
    {id:"todos",label:"to-do"},{id:"habits",label:"habits"},{id:"journal",label:"journal"},
    {id:"timer",label:"timer"},{id:"vision",label:"vision"},{id:"wishlist",label:"wish list"},
    {id:"books",label:"books"},{id:"me",label:"me"},
  ];

  return (
    <div style={{fontFamily:FONT_SANS, maxWidth:680, margin:"0 auto", minHeight:"100vh", background:"#FAFAF8"}}>
      <style>{gStyle}</style>

      {/* Header — white */}
      <div style={{background:"#FAFAF8", padding:"1rem 1rem 0.75rem", borderBottom:`0.5px solid #E8E0E0`}}>
        <div style={{textAlign:"center"}}>
          <div style={{fontFamily:FONT_SANS, fontSize:9, letterSpacing:2.5, textTransform:"uppercase", color:"#8A8A8A", marginBottom:4}}>
            {today.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"})} · {plannerData.name}
          </div>
          <div style={{fontFamily:FONT_SERIF, fontStyle:"italic", fontSize:30, color:"#3A3A3A", letterSpacing:1, lineHeight:1}}>that girl</div>
          <div style={{fontFamily:FONT_SANS, fontSize:9, letterSpacing:2, textTransform:"uppercase", color:"#8A8A8A", marginTop:4}}>
            {dayNum ? `No ${dayNum} / 90` : "journey complete ✦"}
          </div>
        </div>
      </div>

      {/* Nav — white bg, coloured category pill strip */}
      <div style={{background:"#FAFAF8", borderBottom:`0.5px solid #E8E0E0`}}>
        <div style={{margin:"6px 10px", borderRadius:20, padding:"2px 4px"}}>
          <div style={{display:"flex", justifyContent:"space-between"}}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                style={{padding:"7px 6px", border:"none", cursor:"pointer", fontSize:9, fontFamily:FONT_SANS, letterSpacing:0.8, textTransform:"uppercase", background: activeTab===t.id ? T.cardBg : "transparent", color: activeTab===t.id ? "#3A3A3A" : "#AAAAAA", borderRadius:16, transition:"all 0.2s", whiteSpace:"nowrap", flexShrink:0}}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div>
        {activeTab==="today"   && <TodayTab    data={plannerData} T={T}/>}
        {activeTab==="journey" && <JourneyTab  data={plannerData} T={T}/>}
        {activeTab==="goals"   && <GoalsTab    data={plannerData} setData={setPlannerData} T={T}/>}
        {activeTab==="todos"   && <TodoTab     T={T}/>}
        {activeTab==="habits"  && <HabitsTab   T={T}/>}
        {activeTab==="journal" && <JournalTab  T={T}/>}
        {activeTab==="timer"   && <TimerTab    T={T}/>}
        {activeTab==="vision"  && <VisionTab   T={T}/>}
        {activeTab==="wishlist"&& <WishlistTab T={T}/>}
        {activeTab==="books"   && <BooksTab    T={T}/>}
        {activeTab==="me"      && <MeTab       data={plannerData} setData={setPlannerData} T={T} onReset={handleReset} onSoftReset={handleSoftReset}/>}
      </div>
    </div>
  );
}
