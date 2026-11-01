const toArray=v=>!v?[]:Array.isArray(v)?v:[v];
const reply=(statusCode,data)=>({statusCode,headers:{"content-type":"application/json","cache-control":"no-store"},body:JSON.stringify(data)});
exports.handler=async event=>{
const q=event.queryStringParameters||{}, league=String(q.league||''),year=Number(q.year||2026);
if(!/^\d{4,6}$/.test(league)||!Number.isInteger(year)||year<2020||year>2030)return reply(400,{error:"Invalid league ID or season"});
try{
async function get(type){const url=new URL('https://api.myfantasyleague.com/'+year+'/export');url.searchParams.set('TYPE',type);url.searchParams.set('L',league);url.searchParams.set('JSON','1');const r=await fetch(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(17000)});if(!r.ok)throw Error(type+' request failed (HTTP '+r.status+')');const d=await r.json();if(d.error)throw Error(typeof d.error==='string'?d.error:JSON.stringify(d.error));return d}
const [info,rosters,players,injuries]=await Promise.all([get('league'),get('rosters'),get('players'),get('injuries').catch(()=>({}))]);
const franchises=toArray(info.league?.franchises?.franchise).map(f=>({id:String(f.id||''),name:String(f.name||f.id||'Unknown team')}));
const teamRosters=toArray(rosters.rosters?.franchise).map(f=>({id:String(f.id||''),players:toArray(f.player).map(p=>({id:String(p.id||''),status:String(p.status||'')}))}));
const playerMap=Object.fromEntries(toArray(players.players?.player).map(p=>[String(p.id),{name:p.name,position:p.position,team:p.team}]));
const injuryMap=Object.fromEntries(toArray(injuries.injuries?.injury).map(p=>[String(p.id),{status:p.status||p.injury||p.description||'',practice:p.practice||''}]));
return reply(200,{leagueName:info.league?.name||'MyFantasyLeague',franchises,rosters:teamRosters,players:playerMap,injuries:injuryMap});
}catch(e){return reply(502,{error:'MFL roster import unavailable: '+e.message+'. Some private leagues require authorized access.'})}
};