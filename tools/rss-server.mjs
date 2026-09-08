import http from 'node:http';
import { handler } from '../netlify/functions/rss.mjs';

const server=http.createServer(async (req,res)=>{
  if(req.url==='/api/rss'){
    const r=await handler();
    res.writeHead(r.statusCode,r.headers); res.end(r.body); return;
  }
  res.writeHead(404,{'content-type':'application/json'});res.end('{"error":"not found"}');
});
server.listen(8788,()=>console.log('RSS API http://localhost:8788/api/rss'));
