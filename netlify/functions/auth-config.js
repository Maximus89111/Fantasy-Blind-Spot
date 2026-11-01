exports.handler=async ()=>{
 const url=process.env.SUPABASE_URL||"", key=process.env.SUPABASE_ANON_KEY||"";
 if(!/^https:\/\/[a-z0-9.-]+\.supabase\.co\/?$/i.test(url)||!key)return {statusCode:503,headers:{"content-type":"application/json"},body:JSON.stringify({configured:false})};
 return {statusCode:200,headers:{"content-type":"application/json","cache-control":"no-store"},body:JSON.stringify({configured:true,url,anonKey:key})};
};
