export default async function handler(req,res){
  const url=process.env.SSUL_SUPABASE_URL||process.env.SUPABASE_URL;
  const key=process.env.SSUL_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)return res.status(500).json({ok:false,error:'SUPABASE_CONFIG_MISSING'});
  try{
    const r=await fetch(`${url}/functions/v1/ssul_bootstrap`,{method:'POST',headers:{authorization:`Bearer ${key}`,apikey:key,'content-type':'application/json'},body:'{}'});
    const data=await r.json().catch(()=>({}));
    return res.status(r.ok?200:r.status).json(data);
  }catch(e){return res.status(500).json({ok:false,error:e?.message||String(e)})}
}
