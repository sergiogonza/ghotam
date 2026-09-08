export async function handler(event){
  if(event.httpMethod!=='GET')return{statusCode:405,headers:{'content-type':'application/json'},body:JSON.stringify({error:'GET only'})};
  const q=String(event.queryStringParameters?.q||'').trim();
  if(!q)return{statusCode:400,headers:{'content-type':'application/json'},body:JSON.stringify({error:'q is required'})};
  const url=`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&addressdetails=1&q=${encodeURIComponent(q)}`;
  try{
    const r=await fetch(url,{headers:{'user-agent':'GHOTAM-Live-Intelligence/1.0 (manual event geocoding)','accept':'application/json'}});
    if(!r.ok)throw new Error(`Geocoder ${r.status}`);
    const data=await r.json();
    const results=Array.isArray(data)?data.map(x=>({displayName:String(x.display_name||''),lat:Number(x.lat),lng:Number(x.lon),type:String(x.type||''),importance:Number(x.importance||0),country:String(x.address?.country||''),city:String(x.address?.city||x.address?.town||x.address?.village||x.address?.municipality||''),state:String(x.address?.state||'')})).filter(x=>Number.isFinite(x.lat)&&Number.isFinite(x.lng)):[];
    return{statusCode:200,headers:{'content-type':'application/json','cache-control':'public, max-age=86400'},body:JSON.stringify({query:q,results})};
  }catch(error){return{statusCode:502,headers:{'content-type':'application/json'},body:JSON.stringify({error:String(error)})}}
}
