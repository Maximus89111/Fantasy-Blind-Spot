const respond=(statusCode,obj)=>({statusCode,headers:{"content-type":"application/json","cache-control":"no-store"},body:JSON.stringify(obj)});
exports.handler=async event=>{const q=event.queryStringParameters||{},id=String(q.league||''),year=Number(q.year||2026);
if(!/^\d{1,12}$/.test(id)||!Number.isInteger(year)||year<2018||year>2035)return respond(400,{error:"Enter a valid ESPN league ID and season."});
try{
 const url=new URL("https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/"+year+"/segments/0/leagues/"+id);
 url.searchParams.append("view","mTeam");url.searchParams.append("view","mRoster");
 const r=await fetch(url,{headers:{accept:"application/json"},signal:AbortSignal.timeout(18000)});
 if(r.status===401||r.status===403)return respond(403,{error:"ESPN league is private or access-restricted. Secure access is not implemented; do not enter ESPN cookies or passwords."});
 if(!r.ok)return respond(502,{error:"ESPN returned HTTP "+r.status+". Check your league ID and season."});
 const d=await r.json();if(!Array.isArray(d.teams))throw Error("ESPN returned no team roster information.");
 const members=Object.fromEntries((d.members||[]).map(m=>[m.id,m]));
 const teams=d.teams.map(t=>({id:String(t.id),name:(t.name||[t.location,t.nickname].filter(Boolean).join(' ')||"Team "+t.id),owner:(t.owners||[]).map(id=>members[id]?[members[id].firstName,members[id].lastName].filter(Boolean).join(" "):"").filter(Boolean).join(", "),players:(t.roster?.entries||[]).map(e=>{const p=e.playerPoolEntry?.player||e.player||{};return {id:String(p.id||e.playerId||""),name:p.fullName||[p.firstName,p.lastName].filter(Boolean).join(" ")||"Player "+(e.playerId||""),position:p.defaultPositionId===1?"QB":p.defaultPositionId===2?"RB":p.defaultPositionId===3?"WR":p.defaultPositionId===4?"TE":p.defaultPositionId===5?"K":"IDP/Other",nflTeam:String(p.proTeamId||""),injury:p.injuryStatus&&p.injuryStatus!=="ACTIVE"?p.injuryStatus:"",practice:"",starter:![20,21,22,23,24].includes(e.lineupSlotId)}})}));
 return respond(200,{leagueName:d.settings?.name||"ESPN Fantasy League",leagueId:id,teams});
}catch(e){return respond(502,{error:"ESPN import unavailable: "+e.message})}
};