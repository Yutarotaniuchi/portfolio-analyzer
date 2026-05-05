export const config = { maxDuration: 30 };
export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  try{
    const{context,question}=req.body;
    const r=await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",
      headers:{"Content-Type":"application/json","x-api-key":process.env.ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01"},
      body:JSON.stringify({model:"claude-haiku-4-5-20251001",max_tokens:500,messages:[{role:"user",content:context+"\n\n"+question+"\n\nJSON形式のみで回答。"}]})
    });
    if(!r.ok){const e=await r.text();return res.status(r.status).json({error:e.slice(0,200)});}
    const d=await r.json();
    const t=d.content?.[0]?.text||"";
    const clean=t.replace(/```json|```/g,"").trim();
    const m=clean.match(/\{[\s\S]*\}/);
    if(!m)return res.status(200).json({signal:"WATCH",target:"分析中",confidence:50,rule:"解析エラー",action:"再試行",reason:clean.slice(0,100)||"レスポンスなし",risk:"LOW",urgency:1});
    return res.status(200).json(JSON.parse(m[0]));
  }catch(e){
    return res.status(500).json({error:e.message||"server error"});
  }
}
