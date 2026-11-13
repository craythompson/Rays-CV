import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import handler from './dist/worker.mjs';
const routes=JSON.parse(await readFile(new URL('./dist/routes.json',import.meta.url),'utf8'));
let checks=0;const check=(condition,message)=>{assert(condition,message);checks++;};
for(const route of routes){
 const r=await handler.fetch(new Request('https://preview.example'+route),{ALLOW_INDEXING:'true'});
 check(r.status===200,route+' returns 200');
 check(r.headers.get('X-Robots-Tag').includes('noindex'),route+' preview protected');
 if(r.headers.get('Content-Type').startsWith('text/html')){
 const html=await r.text();check(html.includes('width=device-width, initial-scale=1'),route+' viewport');
 check(html.includes('noindex, nofollow, noarchive'),route+' meta protection');
 check((html.match(/<h1[ >]/g)||[]).length===1,route+' exactly one H1');
 for(const [,target] of html.matchAll(/(?:href|src)="(\/[^"#?]*)/g))check(routes.includes(target)||['/sitemap.xml','/robots.txt'].includes(target),route+' internal target exists: '+target);
 }
}
for(const host of ['www.raythompson.info','raythompson.info']){
 const safe=await handler.fetch(new Request('https://'+host+'/'),{});check(safe.headers.get('X-Robots-Tag').includes('noindex'),'Indexing remains opt-in');
 const prod=await handler.fetch(new Request('https://'+host+'/'),{ALLOW_INDEXING:'true'});check(prod.headers.get('X-Robots-Tag')==='index, follow','Production can be indexed');
 check((await prod.text()).includes('content="index, follow"'),'Production meta indexing');
 const robots=await handler.fetch(new Request('https://'+host+'/robots.txt'),{ALLOW_INDEXING:'true'});check((await robots.text()).includes('Allow: /'),'Production robots allows crawling');
}
const previewRobots=await handler.fetch(new Request('https://raythompson-preview.ray-350.workers.dev/robots.txt'),{ALLOW_INDEXING:'true'});check((await previewRobots.text()).includes('Disallow: /'),'Preview robots disallows crawling');
check((await handler.fetch(new Request('https://preview.example/not-a-page'))).status===404,'Unknown paths return 404');
check((await handler.fetch(new Request('https://preview.example/background/'))).status===308,'Trailing slash redirect');
check((await handler.fetch(new Request('https://preview.example/',{method:'POST'}))).status===405,'Unsupported methods blocked');
check((await handler.fetch(new Request('https://preview.example/',{method:'HEAD'}))).status===200,'HEAD supported');
console.log(JSON.stringify({passed:true,checks,routes:routes.length}));
