const reply=(s,x)=>({statusCode:s,headers:{"content-type":"application/json","cache-control":"no-store"},body:JSON.stringify(x)});
exports.handler=async event=>{
const q=event.queryStringParameters||{},id=String(q.league||'').trim(),username=String(q.username||'').trim();
if(!(/^\d{8,25}$/.test(id)||/^[a-zA-Z0-9_.-]{2,40}$/.test(username)))return reply(400,{error:"Enter a Sleeper league ID or username"});
try{const get=async path=>{const res=await fetch("https://api.sleeper.app/v1/"+path,{signal:AbortSignal.timeout(20000)});if(!res.ok)throw Error("Sleeper returned "+res.status);return await res.json()};
let leagueId=id, user=null, available=[];
if(!leagueId){user=await get("user/"+encodeURIComponent(username));if(!user?.user_id)throw Error("Sleeper username not found");available=await get("user/"+encodeURIComponent(user.user_id)+"/leagues/nfl/"+(q.year||2026));if(q.mode==="list")return reply(200,{leagues:(available||[]).map(x=>({id:String(x.league_id),name:x.name})),userId:String(user.user_id)});if(!Array.isArray(available)||!available.length)throw Error("No Sleeper NFL leagues found for that season");if(available.length>1 && !q.selected)return reply(200,{chooseLeague:available.map(x=>({id:x.league_id,name:x.name}))});leagueId=String(q.selected||available[0].league_id)}
if(!/^\d{8,25}$/.test(leagueId))throw Error("Invalid Sleeper league ID");
const [league,rosters,users,players]=await Promise.all([get("league/"+leagueId),get("league/"+leagueId+"/rosters"),get("league/"+leagueId+"/users"),get("players/nfl")]);
if(!league||!Array.isArray(rosters)||!Array.isArray(users))throw Error("Sleeper returned incomplete league data");
const owners=Object.fromEntries(users.map(u=>[String(u.user_id),u]));
const teams=rosters.map(r=>{const u=owners[String(r.owner_id)]||{};return {id:String(r.roster_id),name:String(u.metadata?.team_name||u.display_name||u.username||"Roster "+r.roster_id),owner:String(u.username||""),ownerId:String(r.owner_id||""),players:(r.players||[]).map(id=>{let p=players[id]||{};return {id,name:p.full_name||p.first_name+" "+p.last_name||id,position:p.position||"?",nflTeam:p.team||"FA",injury:p.injury_status||"",practice:p.practice_participation||"",starter:(r.starters||[]).includes(id)}})}});return reply(200,{leagueName:league.name||"Sleeper",teams,leagueId,userId:user?.user_id?String(user.user_id):null});
}catch(e){return reply(502,{error:"Sleeper import failed: "+e.message})}
};