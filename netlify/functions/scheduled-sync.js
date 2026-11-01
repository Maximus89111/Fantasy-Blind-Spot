// Opt-in background refresh: activates ONLY after administrator configures secure variables.
// Schedule: every 3 hours (UTC). Source injury data is the platform-provided field, NOT an official practice feed.
// A licensed practice-feed integration and push provider are needed before reliable push alerts.
exports.config={schedule:"0 */3 * * *"};
exports.handler=async()=>{
const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(process.env.ENABLE_BACKGROUND_SYNC!=="true"||!url||!key)return {statusCode:200,body:"Background synchronization not configured"};
const headers={apikey:key,Authorization:"Bearer "+key,"content-type":"application/json"};
async function api(path,options={}){const response=await fetch(url+"/rest/v1/"+path,{...options,headers:{...headers,...(options.headers||{})},signal:AbortSignal.timeout(22000)});if(!response.ok)throw Error("DB "+response.status+" "+(await response.text()).slice(0,200));return response.status===204?null:response.json()}
const {handler:fetchMFL}=require("./mfl");const {handler:fetchSleeper}=require("./sleeper");const {handler:fetchESPN}=require("./espn");
let processed=0,changed=0,failed=0;
try{
const rows=await api("fantasy_teams?select=id,user_id,platform,league_id,franchise_id,season,roster&limit=150");
for(const row of rows){
try{
if(!["mfl","sleeper","espn"].includes(row.platform))continue;
const fn=row.platform==="mfl"?fetchMFL:row.platform==="sleeper"?fetchSleeper:fetchESPN;
const raw=await fn({queryStringParameters:{league:row.league_id,year:String(row.season)}});if(raw.statusCode!==200)throw Error("Provider unavailable");
const result=JSON.parse(raw.body);
let next=[];
if(row.platform==="mfl"){
const rr=result.rosters.find(x=>x.id===row.franchise_id);if(!rr)throw Error("Franchise absent");
next=rr.players.map(p=>{const meta=result.players[p.id]||{},inj=result.injuries?.[p.id]||{};return {id:p.id,name:meta.name||p.id,position:meta.position||"?",nflTeam:meta.team||"FA",injury:inj.status||"",practice:inj.practice||""}});
}else{
const t=result.teams.find(x=>x.id===row.franchise_id);if(!t)throw Error("Franchise absent");
next=t.players;
}
const prev=Object.fromEntries((row.roster||[]).map(p=>[String(p.id),p]));
const events=[];
for(const p of next){const old=prev[String(p.id)];if(!old)continue;
const a=String(old.injury||""),b=String(p.injury||""),c=String(old.practice||""),d=String(p.practice||"");
if(a!==b||c!==d){events.push({user_id:row.user_id,team_id:row.id,player_id:String(p.id),player_name:p.name||String(p.id),old_status:a,new_status:b,old_practice:c,new_practice:d})}
}
if(events.length)await api("injury_events",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify(events)});
await api("fantasy_teams?id=eq."+encodeURIComponent(row.id),{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({roster:next,updated_at:new Date().toISOString()})});
processed++;changed+=events.length;
}catch(e){failed++;console.error("Sync failure",row.id,String(e.message||e))}
}
return {statusCode:200,body:JSON.stringify({processed,changed,failed})};
}catch(e){console.error("Sync error",e);return {statusCode:500,body:"Background sync failed"}}
};
