// Preview-safe routing. Indexing needs BOTH an approved production hostname and
// ALLOW_INDEXING=true. A workers.dev preview can never become indexable.
export function createHandler(files, sitemap) {
  return {
    async fetch(request, env = {}) {
      const url = new URL(request.url);
      const production = ['www.raythompson.info','raythompson.info'].includes(url.hostname);
      const indexable = production && env.ALLOW_INDEXING === 'true';
      const headers = new Headers({
        'X-Content-Type-Options':'nosniff',
        'Referrer-Policy':'strict-origin-when-cross-origin',
        'X-Frame-Options':'DENY',
        'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
        'Content-Security-Policy':"default-src 'self'; img-src 'self'; style-src 'self'; script-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'",
        'Cache-Control':'public, max-age=300',
        'X-Robots-Tag':indexable ? 'index, follow' : 'noindex, nofollow, noarchive'
      });
      if (!['GET','HEAD'].includes(request.method)) return new Response(null,{status:405,headers:{...Object.fromEntries(headers),'Allow':'GET, HEAD'}});
      let path;try {path=decodeURIComponent(url.pathname);}catch {return new Response('Bad request',{status:400,headers});}
      if (path === '/robots.txt') {
        headers.set('Content-Type','text/plain; charset=utf-8');
        const body=indexable ? 'User-agent: *\nAllow: /\nSitemap: https://www.raythompson.info/sitemap.xml\n' : 'User-agent: *\nDisallow: /\n';
        return new Response(request.method==='HEAD'?null:body,{headers});
      }
      if (path === '/sitemap.xml') {
        headers.set('Content-Type','application/xml; charset=utf-8');
        return new Response(request.method==='HEAD'?null:sitemap,{headers});
      }
      if(path.endsWith('/')&&path!=='/')return new Response(null,{status:308,headers:{...Object.fromEntries(headers),'Location':url.pathname.slice(0,-1)+url.search}});
      const notFound = !files[path] || path === '/404';
      const pageIndexable = indexable && !notFound;
      if(notFound) headers.set('X-Robots-Tag','noindex, nofollow, noarchive');
      const entry = files[path] || files['/404'];
      let body=entry.body;
      headers.set('Content-Type',entry.type);
      if(entry.type.startsWith('text/html')){
        body=body.replaceAll('%%ROBOTS%%',pageIndexable?'index, follow':'noindex, nofollow, noarchive')
          .replace('%%PREVIEW_HIDDEN%%',production?'hidden':'');
      }
      if(entry.encoding==='base64'){
        const bytes=Uint8Array.from(atob(body),c=>c.charCodeAt(0));
        body=bytes;headers.set('Cache-Control','public, max-age=86400');
      }
      return new Response(request.method==='HEAD'?null:body,{status:notFound?404:200,headers});
    }
  };
}
