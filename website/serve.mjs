import http from 'node:http';
import handler from './dist/worker.mjs';
const server=http.createServer(async (req,res)=>{
  try{const r=await handler.fetch(new Request('http://localhost:4173'+req.url,{method:req.method}),{});
  res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()));}
  catch(e){console.error(e);res.writeHead(500);res.end('Server error');}
});
server.listen(4173,'0.0.0.0',()=>console.log('Preview: http://localhost:4173'));
