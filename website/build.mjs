import {readFile,writeFile,mkdir,readdir,copyFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.dirname(fileURLToPath(import.meta.url));
const pages=JSON.parse(await readFile(path.join(root,'content/pages.json'),'utf8'));
const sources=JSON.parse(await readFile(path.join(root,'content/source-pages.json'),'utf8'));
const media=JSON.parse(await readFile(path.join(root,'content/asset-manifest.json'),'utf8'));
const byKey=Object.fromEntries(pages.map(p=>[p.key,p]));
const posts=pages.filter(p=>p.key.startsWith('post-'));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const local=u=>{try{const x=new URL(u);return x.hostname==='www.raythompson.info'||x.hostname==='raythompson.info'?x.pathname+x.search+x.hash:u;}catch{return u;}};
const pathname=p=>new URL(p.url).pathname;
const navPages=pages.filter(p=>!p.key.startsWith('post-'));
const navLabel=p=>p.key==='mvp'?'MVP':p.key==='personality-profile'?'Personality Profiles':p.key[0].toUpperCase()+p.key.slice(1);
function nav(current){return navPages.map(p=>`<a href="${esc(pathname(p))}"${p.key===current?' aria-current="page"':''}>${esc(navLabel(p))}</a>`).join('');}
const contact=`<a href="mailto:ray@emailray.com">Ray@EmailRay.com</a><a href="tel:+13036481449">303-648-1449</a><a class="linkedin" href="https://www.linkedin.com/in/ray-thompson/" aria-label="Ray Thompson on LinkedIn">in</a>`;
function text(value,key){
 const links=(sources[key]?.links||[]).filter(l=>l.text&&l.href&&!/^(mailto:|tel:)/.test(l.href)&&!(key==='testimonials'&&l.href.startsWith('https://www.azquotes.com/'))&&!['Overview','Background','MVP','Stats','Personality Profiles','Testimonials','Blog','Post','linkedin'].includes(l.text));
 const unique=[...new Map(links.map(l=>[l.text,l])).values()].sort((a,b)=>b.text.length-a.text.length);
 let result=esc(value);const tokens=[];
 for(const l of unique){const label=esc(l.text);if(!result.includes(label))continue;const token='\u0001LINK'+tokens.length+'\u0002';tokens.push(`<a href="${esc(local(l.href))}">${label}</a>`);result=result.replaceAll(label,token);}
 return result.replace(/\u0001LINK(\d+)\u0002/g,(_,i)=>tokens[+i]);
}
function renderBlock(b,key){
 if(b.type==='heading'){const tag=b.level===3?'h3':'h2';return `<${tag}>${text(b.text,key)}</${tag}>`;}
 if(b.type==='list'){const tag=b.ordered?'ol':'ul';return `<${tag}>${b.items.map(x=>`<li>${text(x,key)}</li>`).join('')}</${tag}>`;}
 if(b.type==='link')return `<p class="reference-link"><a href="${esc(b.href)}">${esc(b.text)}</a></p>`;
 if(b.type==='quote')return `<blockquote><p>${text(b.text,key)}</p></blockquote>`;
 const t=b.text||'';if(key==='stats'&&t.includes(' | ')){const [a,...rest]=t.split(' | ');return `<p><strong>${esc(a)}</strong> | ${text(rest.join(' | '),key)}</p>`;}
 return `<p>${text(t,key)}</p>`;
}
const blocks=(bs,key)=>bs.map(b=>renderBlock(b,key)).join('\n');
function imageFor(src){const base=src?.split('/v1/')[0];const im=media.find(m=>m.base===base);return im?'/assets/'+im.id+'.webp':null;}
function photoByPage(key){return (sources[key]?.images||[]).map(im=>({...im,local:imageFor(im.src)})).filter(im=>im.local&&im.alt!=='linkedin');}
function img(src,alt,cls='',eager=false){return `<img src="${esc(src)}" alt="${esc(alt)}" class="${esc(cls)}" loading="${eager?'eager':'lazy'}" decoding="async">`;}
const portrait=photoByPage('overview').find(im=>im.src.includes('d70b58_87f199'));
function quotes(bs,key){
 const groups=[];let group=[];
 for(const b of bs){group.push(b);const s=b.text||'';const attribution=/^(?:Dr\. )?[A-Z][\w.'’-]+(?: [A-Z][\w.'’-]+){1,3}(?:,.*)?$/.test(s)&&s.length<110;
  if(attribution&&group.length>1){const cite=group.pop();groups.push(`<blockquote class="quote-card">${group.map(x=>`<p>${text(x.text,key)}</p>`).join('')}<cite>${esc(cite.text)}</cite></blockquote>`);group=[];}}
 if(group.length)groups.push(`<blockquote class="quote-card">${blocks(group,key)}</blockquote>`);
 return groups.join('');
}
function overview(p){
 const b=p.blocks;const skillStart=b.findIndex(x=>x.text==='KEY SKILLS');const quoteStart=b.findIndex(x=>x.text?.startsWith('Thanks Ray.'));
 const skillNames=['OPERATIONS','REVENUE','TALENT MANAGEMENT'];
 const skillImgs=photoByPage('overview').filter(x=>['Discussing the Numbers','handshake isolated on business background','New Hires'].includes(x.alt));
 const cards=skillNames.map((name,i)=>{const start=b.findIndex(x=>x.text===name);const end=i<2?b.findIndex(x=>x.text===skillNames[i+1]):quoteStart;const body=b.slice(start+2,end);return `<section class="skill">${skillImgs[i]?img(skillImgs[i].local,skillImgs[i].alt):''}<h3>${esc(name)}</h3><p class="subheading">${esc(b[start+1]?.text)}</p>${blocks(body,p.key)}</section>`;}).join('');
 return `<section class="hero"><div class="hero-copy"><h1>${b.slice(0,2).map(x=>`<span>${esc(x.text)}</span>`).join('')}</h1>${blocks(b.slice(2,skillStart),p.key)}<a class="button" href="mailto:ray@emailray.com?subject=Let%27s%20Meet%20(rt.info%20site)">Let's Meet</a></div>${img(portrait.local,'Ray Thompson, revenue and operations executive','hero-photo',true)}</section><section class="section"><h2 class="section-title">KEY SKILLS</h2><div class="skills">${cards}</div></section><section class="quotes"><div class="section"><h2 class="section-title">What colleagues say</h2><div class="quote-grid">${quotes(b.slice(quoteStart),p.key)}</div><a class="button" href="/testimonials">More testimonials</a></div></section>`;
}
function interior(p){
 let bs=[...p.blocks];let heading=bs[0]?.text||navLabel(p);if(bs[0]?.type==='heading'||['testimonials'].includes(p.key))bs.shift();
 const photos=photoByPage(p.key);const lead=photos[0];
 let body=blocks(bs,p.key);
 if(p.key==='testimonials'){
   const start=bs.findIndex(x=>x.text?.includes('Thanks Ray.'));
   body=blocks(bs.slice(0,start),p.key)+quotes(bs.slice(start),p.key);
 }
 if(p.key==='personality-profile'){
   const split=bs.findIndex(b=>b.text?.includes('Knowing thyself'));
   if(split<0)throw Error('Personality column boundary missing');
   body=`<div class="profile-panel"><h1>${esc(heading)}</h1><div class="profile-columns"><section class="profile-column" aria-label="Summary, StrengthFinders, and DISC">${blocks(bs.slice(0,split),p.key)}</section><section class="profile-column" aria-label="Predictive Index, core motivations, and 5 Voices">${blocks(bs.slice(split),p.key)}</section></div></div>`;
 }
 else body=`<h1>${esc(heading)}</h1>${body}`;
 return `<section class="page-surface ${esc(p.key)}"><div class="page-content">${lead?img(lead.local,p.key==='background'?'Ray and family enjoying a day skiing':'Ray enjoying the outdoors with a friend','lead-photo',true):''}${body}</div></section>`;
}
function postTitle(p){return p.blocks[0]?.text||p.title.split(' | Ray Thompson')[0];}
function postExcerpt(p){return p.blocks.find(x=>x.type==='paragraph')?.text.slice(0,190)||'';}
function blog(){return `<section class="blog-intro"><h1>Blog</h1><p>Thoughts on leadership, operations, and making a positive impact.</p></section><div class="blog-grid">${posts.map(p=>`<a class="post-card" href="${esc(pathname(p))}"><span class="post-meta">Ray Thompson · ${esc(p.articleDate||'')}</span><h2>${esc(postTitle(p))}</h2><p>${esc(postExcerpt(p))}${postExcerpt(p).length>=190?'…':''}</p><span class="read-more">Read article</span></a>`).join('')}</div>`;}
function article(p){return `<article class="article"><a class="back-link" href="/blog">← All posts</a><div class="post-meta">Ray Thompson · <time>${esc(p.articleDate||'')}</time></div><h1>${esc(postTitle(p))}</h1><div class="body-copy">${blocks(p.blocks.slice(1),p.key)}</div><section class="related"><h2>More posts</h2>${posts.filter(x=>x.key!==p.key).map(x=>`<a href="${esc(pathname(x))}">${esc(postTitle(x))}</a>`).join('')}</section></article>`;}
function layout(p,body){
 const title=p.key==='mvp'?'Mission, Value-Drivers, Purpose | Ray Thompson':p.key==='stats'?'Career Highlights & Outcomes | Ray Thompson':p.key==='overview'?'Ray Thompson | Revenue & Operations Executive':p.title;
 const description=(p.key==='overview'?p.blocks[2]?.text:p.blocks.find(x=>x.type==='paragraph'&&(x.text||'').length>100)?.text||postTitle(p)).slice(0,160);
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><meta name="robots" content="%%ROBOTS%%"><link rel="canonical" href="${esc(p.url)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:type" content="${p.key.startsWith('post-')?'article':'website'}"><meta property="og:url" content="${esc(p.url)}"><meta property="og:image" content="https://www.raythompson.info${portrait.local}"><meta name="twitter:card" content="summary_large_image"><link rel="stylesheet" href="/style.css"><link rel="icon" href="/favicon.svg" type="image/svg+xml"></head><body><a class="skip" href="#main">Skip to main content</a><div class="preview-note" %%PREVIEW_HIDDEN%%>Website preview — the live Wix site is unchanged.</div><header class="site-header"><p class="tagline">Leading Business Evolution to Sustainable Growth &amp; Innovation</p><div class="nav-row"><nav class="desktop-nav" aria-label="Main navigation">${nav(p.key)}</nav><div class="header-contact">${contact}</div></div><details class="mobile-nav"><summary>Ray Thompson · Menu</summary><nav aria-label="Mobile navigation">${nav(p.key)}${contact}</nav></details></header><main id="main">${body}</main><footer class="site-footer"><div class="footer-links">${contact}</div><p>Boulder | Denver, Colorado</p><p class="copyright">©2022–2026 Ray Thompson</p></footer></body></html>`;
}
const files={};
await mkdir(path.join(root,'dist'),{recursive:true});
for(const p of pages){const body=p.key==='overview'?overview(p):p.key==='blog'?blog():p.key.startsWith('post-')?article(p):interior(p);const html=layout(p,body);files[pathname(p)]={type:'text/html; charset=utf-8',body:html};}
const fallback={key:'not-found',url:'https://www.raythompson.info/404',title:'Page not found | Ray Thompson',blocks:[{type:'paragraph',text:'The page you requested could not be found.'}]};
files['/404']={type:'text/html; charset=utf-8',body:layout(fallback,'<section class="not-found"><h1>Page not found</h1><p>That address doesn’t match a page on this site.</p><a href="/">Return to the overview</a></section>')};
files['/style.css']={type:'text/css; charset=utf-8',body:await readFile(path.join(root,'style.css'),'utf8')};
files['/favicon.svg']={type:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="10" fill="#191919"/><text x="32" y="43" text-anchor="middle" font-family="Arial,sans-serif" font-size="32" fill="white">RT</text></svg>'};
for(const f of await readdir(path.join(root,'assets'))){if(!f.endsWith('.webp'))continue;files['/assets/'+f]={type:'image/webp',encoding:'base64',body:(await readFile(path.join(root,'assets',f))).toString('base64')};}
const sitemap='<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+pages.map(p=>`<url><loc>${esc(p.url)}</loc></url>`).join('')+'</urlset>';
const runtime=await readFile(path.join(root,'runtime.mjs'),'utf8');
const output=runtime+'\nconst files='+JSON.stringify(files)+';\nconst sitemap='+JSON.stringify(sitemap)+';\nexport default createHandler(files,sitemap);\n';
await writeFile(path.join(root,'dist/worker.mjs'),output);
await writeFile(path.join(root,'dist/routes.json'),JSON.stringify(Object.keys(files),null,2));
console.log(JSON.stringify({pages:pages.length,assets:Object.keys(files).length-pages.length-3,workerBytes:Buffer.byteLength(output),routes:pages.map(pathname)},null,2));
