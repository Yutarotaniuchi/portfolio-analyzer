import nodemailer from "nodemailer";
const CONTEXT = `あなたは投資アナリストです。ポートフォリオ: S&P500(50%)/日経高配当50(15%)/ゴールド(10%)/AI半導体(5%)/防衛JP(5%)/防衛GL(5%)/J-REIT(5%) NISA月30万: S&P500(12万)/オルカン(5万)/日経(8万)/全世界高配当(5万) 売りルール: 日本株=配当2期連続減配+GDP悪化, S&P崩壊=FRB年3回利上げ/テック決算2期下振れ/米GDP2四半期マイナスのうち2つ以上 暴落: -15%→現金150万/-25%→ゴールド200万売/-35%→ゴールド+REIT売 鉄の掟: 感情で売らない/NISA死守/S&P500売らない/J-REIT最後まで 必ずJSON形式のみで回答: {"signal":"HOLD","target":"銘柄","confidence":75,"rule":"ルール","action":"行動","reason":"理由","risk":"LOW","urgency":3} signalはBUY/SELL/HOLD/ALERT/WATCH riskはLOW/MEDIUM/HIGH/CRITICAL`;
const THEMES = [
  {label:"日経平均",icon:"JP",q:"2026年の日経平均と日本株の最新状況を分析。このポートフォリオへの影響をJSONで。"},
  {label:"S&P500",icon:"US",q:"2026年のS&P500と米国株の最新状況を分析。このポートフォリオへの影響をJSONで。"},
  {label:"FRB動向",icon:"FRB",q:"2026年のFRB金融政策を分析。S&P500崩壊条件Bへの影響をJSONで。"},
  {label:"日本GDP",icon:"GDP",q:"2026年の日本GDPを分析。日本株売りトリガーへの影響をJSONで。"},
  {label:"AI半導体",icon:"AI",q:"2026年のAI半導体セクターを分析。S&P500崩壊条件Aへの影響をJSONで。"},
  {label:"ゴールド",icon:"AU",q:"2026年のゴールド価格動向を分析。暴落プロトコルへの影響をJSONで。"},
  {label:"地政学",icon:"GEO",q:"2026年の地政学リスクを分析。防衛ETFへの影響をJSONで。"},
  {label:"外国人動向",icon:"FOR",q:"2026年の外国人の日本株売買を分析。日本株売りトリガーへの影響をJSONで。"}
];
async function analyze(q) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{"Content-Type":"application/json","x-api-key":process.env.ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01"},
    body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:500,messages:[{role:"user",content:CONTEXT+"\n\n分析: "+q}]})
  });
  if(!r.ok) throw new Error("API error");
  const d = await r.json();
  const t = d.content.map(c=>c.type==="text"?c.text:"").join("").trim();
  const m = t.replace(/```json|```/g,"").trim().match(/\{[\s\S]*\}/);
  if(!m) throw new Error("parse failed");
  return JSON.parse(m[0]);
}
function buildEmail(results,date) {
  const alerts = results.filter(r=>r.result&&["SELL","ALERT"].includes(r.result.signal)).length;
  const sig = s=>({BUY:"🟢",SELL:"🔴",HOLD:"🟡",ALERT:"🟠",WATCH:"🔵"}[s]||"⚪");
  const rows = results.map(r=>{
    if(!r.result) return "<tr><td>"+r.icon+" "+r.label+"</td><td colspan=4>取得失敗</td></tr>";
    const {signal,target,confidence,rule,action,reason,risk,urgency} = r.result;
    const bg = urgency>=7?"background:#1a0a0a;":"";
    return "<tr style='border-bottom:1px solid #1a2a1a;"+bg+"'><td style='padding:8px;color:#888'>"+r.icon+" "+r.label+"</td><td style='padding:8px;font-weight:bold'>"+sig(signal)+" "+signal+"</td><td style='padding:8px;color:#c8a96e'>"+rule+"</td><td style='padding:8px;color:#00ff88'>"+action+"</td><td style='padding:8px;font-size:11px'>"+risk+" "+confidence+"%</td></tr><tr><td colspan=5 style='padding:2px 8px 8px;color:#4a7a4a;font-size:11px'>"+reason+"</td></tr>";
  }).join("");
  return "<!DOCTYPE html><html><head><meta charset='UTF-8'></head><body style='background:#030508;color:#00ff88;font-family:monospace;padding:20px'><h2>PORTFOLIO AUTO ANALYZER</h2><p style='color:#1a4a1a'>"+date+"</p>"+(alerts>0?"<p style='color:#ff4466'>⚠ "+alerts+"件のアラートあり</p>":"<p style='color:#2a6a2a'>✅ 異常なし。本日もルール通りに。</p>")+"<table style='width:100%;border-collapse:collapse;font-size:12px'><tr style='border-bottom:2px solid #0a3a0a'><th>対象</th><th>判定</th><th>ルール</th><th>行動</th><th>リスク</th></tr>"+rows+"</table><p style='color:#0a2a0a;font-size:10px;margin-top:20px'>※投資助言ではありません</p></body></html>";
}

export default async function handler(req,res) {
  if(req.headers.authorization !== "Bearer "+process.env.CRON_SECRET) {
    return res.status(401).json({error:"Unauthorized"});
  }
  const results = [];
  for(const t of THEMES) {
    try { results.push({...t,result:await analyze(t.q)}); }
    catch { results.push({...t,result:null}); }
    await new Promise(r=>setTimeout(r,1000));
  }
  const transporter = nodemailer.createTransport({
    service:"gmail",
    auth:{user:process.env.GMAIL_USER,pass:process.env.GMAIL_APP_PASSWORD}
  });
  const date = new Date().toLocaleDateString("ja-JP",{year:"numeric",month:"long",day:"numeric",weekday:"short"});
  const alerts = results.filter(r=>r.result&&["SELL","ALERT"].includes(r.result.signal)).length;
  const subject = alerts>0 ? "🚨 [要確認] ポートフォリオ朝次レポート "+date : "✅ [異常なし] ポートフォリオ朝次レポート "+date;
  await transporter.sendMail({from:process.env.GMAIL_USER,to:process.env.GMAIL_USER,subject,html:buildEmail(results,date)});
  return res.status(200).json({success:true,alerts});
}
