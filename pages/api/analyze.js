export const config = {
  maxDuration: 30
};
export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  try{
    const{context,question}=req.body;
    const r=await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",
      headers:{"Content-Type":"application/json","x-api-key":process.env.ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01"},
      body:JSON.stringify({model:"claude-sonnet-4-5",max_tokens:1000,messages:[{role:"user",content:context+"\n\n分析してください: "+question}]})
    });
    if(!r.ok){const e=await r.text();return res.status(r.status).json({error:e.slice(0,100)});}
    const d=await r.json();
    const t=d.content.map(i=>i.type==="text"?i.text:"").filter(Boolean).join("\n").trim();
    const m=t.replace(/```json|```/g,"").trim().match(/\{[\s\S]*\}/);
    if(!m)return res.status(200).json({signal:"WATCH",target:"分析中",confidence:50,rule:"解析エラー",action:"再試行",reason:t.slice(0,100),risk:"LOW",urgency:1});

    return res.status(200).json(JSON.parse(m[0]));
  }catch(e){
    return res.status(500).json({error:e.message||"server error"});
  }
}

