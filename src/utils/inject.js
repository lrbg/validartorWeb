// Reads a bookmarklet payload from the URL hash: #inject=<base64json>
// Returns parsed data or null.

export function readHashPayload() {
  try {
    const hash = window.location.hash;
    if (!hash.startsWith('#inject=')) return null;
    const encoded = hash.slice('#inject='.length);
    const json = decodeURIComponent(escape(atob(encoded)));
    const data = JSON.parse(json);
    // Remove hash from URL without reloading
    history.replaceState(null, '', window.location.pathname + window.location.search);
    return data;
  } catch {
    return null;
  }
}

// Generates the bookmarklet javascript: URL from a template
export function buildBookmarklet({ validatorUrl, elementTypes, checkAttributes }) {
  // Self-contained ES5 snippet that runs on any page
  const code = `(function(){
var V=${JSON.stringify(validatorUrl)};
var ET=${JSON.stringify(elementTypes)};
var CA=${JSON.stringify(checkAttributes)};
var FT={input:1,select:1,textarea:1,button:1};
var ic={},nc={};
ET.forEach(function(t){document.querySelectorAll(t).forEach(function(el){var i=el.getAttribute('id'),n=el.getAttribute('name');if(i)ic[i]=(ic[i]||0)+1;if(n)nc[n]=(nc[n]||0)+1;});});
var els=[];
ET.forEach(function(tag){var idx=0;document.querySelectorAll(tag).forEach(function(el){
var e={tag:tag,index:idx++,issues:[]};
CA.forEach(function(attr){
var v=el.getAttribute(attr)||null;e[attr]=v;
if(attr==='id'){if(!v)e.issues.push({type:'missing',attr:'id',severity:'error',message:'<'+tag+'> sin id'});else if(ic[v]>1)e.issues.push({type:'duplicate',attr:'id',value:v,count:ic[v],severity:'error',message:'id="'+v+'" duplicado ('+ic[v]+')'});}
if(attr==='name'){var tp=el.getAttribute('type'),g=tp==='radio'||tp==='checkbox';if(!v&&FT[tag])e.issues.push({type:'missing',attr:'name',severity:'warning',message:'<'+tag+'> sin name'});else if(v&&nc[v]>1&&!g)e.issues.push({type:'duplicate',attr:'name',value:v,count:nc[v],severity:'warning',message:'name="'+v+'" duplicado ('+nc[v]+')'}); }
});
e.type=el.getAttribute('type')||null;
e.hasIssues=e.issues.length>0;
if(['button','a','label'].indexOf(tag)>-1)e.text=(el.textContent||'').trim().substring(0,80);
els.push(e);
});});
var byTag={};ET.forEach(function(t){byTag[t]=els.filter(function(e){return e.tag===t;}).length;});
var pn=location.pathname.split('/').filter(Boolean).pop()||'home';
var pay={url:location.href,pageName:pn,elements:els,summary:{total:els.length,withIssues:els.filter(function(e){return e.hasIssues;}).length,errors:els.reduce(function(a,e){return a+e.issues.filter(function(i){return i.severity==='error';}).length;},0),warnings:els.reduce(function(a,e){return a+e.issues.filter(function(i){return i.severity==='warning';}).length;},0),byTag:byTag},checkAttributes:CA,elementTypes:ET,timestamp:new Date().toISOString()};
try{var enc=btoa(unescape(encodeURIComponent(JSON.stringify(pay))));window.open(V+'#inject='+enc,'_blank');}catch(err){alert('ValidatorWeb error: '+err.message);}
})();`;

  return 'javascript:' + encodeURIComponent(code);
}
