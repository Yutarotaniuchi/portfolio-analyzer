import{useState,useEffect,useRef}from"react";
const CTX=`あなたは投資アナリストです。ポートフォリオ: S&P500(50%)/日経高配当50(15%)/ゴールド(10%)/AI半導体(5%)/防衛JP(5%)/防衛GL(5%)/J-REIT(5%) NISA月30万: S&P500(12万)/オルカン(5万)/日経(8万)/全世界高配当(5万) 売りルール: 日本株=配当2期連続減配+GDP悪化, S&P崩壊=FRB年3回利上げ/テック決算2期下振れ/米GDP2四半期マイナスのうち2つ以上 暴落: -15%→現金150万/-25%→ゴールド200万売/-35%→ゴールド+REIT売 鉄の掟: 感情で売らない/NISA死守/S&P500売らない/J-REIT最後まで 必ずJSON形式のみ: {"signal":"HOLD","target":"銘柄","confidence":75,"rule":"ルール","action":"行動","reason":"理由","risk":"LOW","urgency":3} signalはBUY/SELL/HOLD/ALERT/WATCH riskはLOW/MEDIUM/HIGH/CRITICAL`;
async function ai(q){
  const r=await fetch("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({context:CTX,question:q})});
  if(!r.ok)throw new Error("error");
  const p=await r.json();
  if(p.error)throw new Error(p.error);
  const S=["BUY","SELL","HOLD","ALERT","WATCH"],R=["LOW","MEDIUM","HIGH","CRITICAL"];
  return{signal:S.includes(p.signal)?p.signal:"HOLD",target:p.target||"不明",confidence:isFinite(+p.confidence)?Math.max(0,Math.min(100,+p.confidence)):50,rule:p.rule||"—",action:p.action||"確認",reason:p.reason||"完了",risk:R.includes(p.risk)?p.risk:"LOW",urgency:isFinite(+p.urgency)?Math.max(1,Math.min(10,+p.urgency)):3};
}
const TH=[
  {label:"日経平均",icon:"JP",q:"2026年の日経平均と日本株の最新状況を分析。このポートフォリオへの影響をJSONで。"},
  {label:"S&P500",icon:"US",q:"2026年のS&P500と米国株の最新状況を分析。このポートフォリオへの影響をJSONで。"},
  {label:"FRB動向",icon:"FRB",q:"2026年のFRB金融政策を分析。S&P500崩壊条件Bへの影響をJSONで。"},
  {label:"日本GDP",icon:"GDP",q:"2026年の日本GDPを分析。日本株売りトリガーへの影響をJSONで。"},
  {label:"AI半導体",icon:"AI",q:"2026年のAI半導体セクターを分析。S&P500崩壊条件Aへの影響をJSONで。"},
  {label:"ゴールド",icon:"AU",q:"2026年のゴールド価格動向を分析。暴落プロトコルへの影響をJSONで。"},
  {label:"地政学",icon:"GEO",q:"2026年の地政学リスクを分析。防衛ETFへの影響をJSONで。"},
  {label:"外国人動向",icon:"FOR",q:"2026年の外国人の日本株売買を分析。日本株売りトリガーへの影響をJSONで。"}
];
const SG={BUY:{c:"#00FF88",bg:"rgba(0,255,136,0.07)",bd:"rgba(0,255,136,0.3)"},SELL:{c:"#FF4466",bg:"rgba(255,68,102,0.07)",bd:"rgba(255,68,102,0.3)"},HOLD:{c:"#C8A96E",bg:"rgba(200,169,110,0.07)",bd:"rgba(200,169,110,0.3)"},ALERT:{c:"#FF8C00",bg:"rgba(255,140,0,0.07)",bd:"rgba(255,140,0,0.3)"},WATCH:{c:"#00CFFF",bg:"rgba(0,207,255,0.07)",bd:"rgba(0,207,255,0.3)"}};
const RC={LOW:"#00FF88",MEDIUM:"#C8A96E",HIGH:"#FF8C00",CRITICAL:"#FF4466"};

function Card({item}){
  const{result:r,source,time}=item;
  const s=SG[r.signal]||SG.HOLD;
  return(
    <div style={{border:"1px solid "+s.bd,background:s.bg,borderRadius:4,padding:"10px 12px",marginBottom:8}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,flexWrap:"wrap"}}>
        <span style={{padding:"2px 10px",background:s.c,color:"#000",fontSize:12,fontWeight:900}}>{r.signal}</span>
        <span style={{color:s.c,fontSize:13,fontWeight:700}}>{r.target}</span>
        <span style={{marginLeft:"auto",color:RC[r.risk],fontSize:9}}>{r.risk}</span>
        <span style={{color:"#1A3A1A",fontSize:9}}>{source} {time}</span>
      </div>
      <div style={{marginBottom:7}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
          <span style={{color:"#1A4A1A",fontSize:9}}>CONFIDENCE</span>
          <span style={{color:s.c,fontSize:9}}>{r.confidence}%</span>
        </div>
        <div style={{height:3,background:"#0A1A0A"}}>
          <div style={{height:"100%",width:r.confidence+"%",background:s.c}}/>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:6}}>
        <div style={{background:"rgba(0,0,0,0.3)",padding:"4px 7px"}}>
          <div style={{color:"#1A4A1A",fontSize:9}}>RULE</div>
          <div style={{color:"#C8A96E",fontSize:10}}>{r.rule}</div>
        </div>
        <div style={{background:"rgba(0,0,0,0.3)",padding:"4px 7px"}}>
          <div style={{color:"#1A4A1A",fontSize:9}}>ACTION</div>
          <div style={{color:"#00FF88",fontSize:10}}>{r.action}</div>
        </div>
      </div>
      <div style={{color:"#3A7A3A",fontSize:10}}>{"> "}{r.reason}</div>
    </div>
  );
}
export default function App(){
  const[signals,setSignals]=useState([]);
  const[scanning,setScanning]=useState(false);
  const[curScan,setCurScan]=useState(null);
  const[manual,setManual]=useState("");
  const[manBusy,setManBusy]=useState(false);
  const[scanCnt,setScanCnt]=useState(0);
  const[clock,setClock]=useState(new Date());
  const scanRef=useRef(false);
  const feedEnd=useRef(null);
  useEffect(()=>{const t=setInterval(()=>setClock(new Date()),1000);return()=>clearInterval(t);},[]);
  useEffect(()=>{feedEnd.current?.scrollIntoView({behavior:"smooth"});},[signals]);
  const push=(result,source)=>{
    setScanCnt(n=>n+1);
    setSignals(prev=>[{result,source,time:new Date().toLocaleTimeString("ja-JP"),id:Date.now()+Math.random()},...prev].slice(0,100));
  };
  const runScan=async(targets)=>{
    if(scanRef.current)return;
    scanRef.current=true;setScanning(true);
    const list=targets||TH;
    for(const t of list){
      setCurScan(t.label);
      try{const result=await ai(t.q);push(result,t.icon+" "+t.label);}
      catch{push({signal:"WATCH",target:t.label,confidence:0,rule:"エラー",action:"再試行",reason:"接続エラー",risk:"LOW",urgency:1},t.icon+" "+t.label);}
      await new Promise(r=>setTimeout(r,1500));
    }
    setCurScan(null);setScanning(false);scanRef.current=false;
  };
  const runManual=async()=>{
    const text=manual.trim();
    if(!text||manBusy)return;
    setManual("");setManBusy(true);
    try{const result=await ai(text);push(result,"手動入力");}
    catch{push({signal:"WATCH",target:"手動",confidence:0,rule:"エラー",action:"再入力",reason:"エラー",risk:"LOW",urgency:1},"手動入力");}
    setManBusy(false);
  };
  return(
    <div style={{minHeight:"100vh",background:"#030508",color:"#00FF88",fontFamily:"monospace",fontSize:12,display:"flex",flexDirection:"column"}}>
      <style>{"*{box-sizing:border-box}input::placeholder{color:#1A3A1A}input:focus{outline:none}button{cursor:pointer}"}</style>
      <div style={{borderBottom:"1px solid #0A2A0A",padding:"7px 14px",display:"flex",justifyContent:"space-between",background:"rgba(0,10,0,0.98)"}}>
        <span style={{fontSize:11,letterSpacing:"0.1em"}}>PORTFOLIO ANALYZER</span>
        <div style={{display:"flex",gap:12}}>
          <span style={{color:"#C8A96E",fontSize:9}}>SCAN:{scanCnt}</span>
          <span style={{color:"#00CFFF",fontSize:9}}>{clock.toLocaleTimeString("ja-JP")}</span>
        </div>
      </div>
      {scanning&&curScan&&<div style={{padding:"4px 14px",background:"rgba(0,255,136,0.02)",color:"#2A6A2A",fontSize:9}}>ANALYZING: {curScan}...</div>}
      <div style={{flex:1,overflowY:"auto",padding:"10px 12px"}}>
        {signals.length===0&&!scanning&&(
          <div style={{padding:"50px 0",textAlign:"center"}}>
            <div style={{fontSize:28,color:"#1A5A1A",marginBottom:12}}>◎</div>
            <div style={{color:"#1A5A1A",fontSize:11,marginBottom:20}}>READY FOR SCAN</div>
            <button onClick={()=>runScan()} style={{padding:"9px 22px",background:"rgba(0,255,136,0.08)",border:"1px solid #00FF8833",color:"#00FF88",fontSize:11,fontFamily:"inherit"}}>▶ 今すぐ全スキャン</button>
          </div>
        )}
        {signals.map(s=><Card key={s.id} item={s}/>)}
        <div ref={feedEnd}/>
      </div>
      <div style={{padding:"8px 14px",borderTop:"1px solid #0A2A0A",background:"rgba(0,6,0,0.98)"}}>
        <div style={{display:"flex",gap:6,marginBottom:7,flexWrap:"wrap"}}>
          {TH.map(t=><button key={t.label} onClick={()=>runScan([t])} disabled={scanning} style={{fontSize:9,padding:"3px 8px",background:"transparent",border:"1px solid #0A2A0A",color:"#2A5A2A",fontFamily:"inherit"}}>{t.label}</button>)}
        </div>
        <div style={{display:"flex",gap:8}}>
          <span style={{color:"#1A5A1A"}}>{">"}</span>
          <input value={manual} onChange={e=>setManual(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")runManual();}} placeholder="ニュースを入力してEnter..." disabled={manBusy} style={{flex:1,background:"transparent",border:"none",color:"#00FF88",fontSize:11,fontFamily:"inherit",caretColor:"#00FF88"}}/>
          <button onClick={runManual} disabled={manBusy||!manual.trim()} style={{padding:"4px 10px",background:"rgba(0,255,136,0.08)",border:"1px solid #00FF8833",color:"#00FF88",fontSize:10,fontFamily:"inherit"}}>{manBusy?"…":"SCAN"}</button>
        </div>
      </div>
    </div>
  );
}
