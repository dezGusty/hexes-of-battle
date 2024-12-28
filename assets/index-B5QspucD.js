const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/browserAll-CiDMhh8C.js","assets/webworkerAll-OYa0Luw0.js","assets/colorToUniform-KTpA7KSL.js","assets/WebGPURenderer-BdjS5krr.js","assets/SharedSystems-D4YrBcIG.js","assets/WebGLRenderer-1pZBDciL.js"])))=>i.map(i=>d[i]);
(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))n(r);new MutationObserver(r=>{for(const s of r)if(s.type==="childList")for(const o of s.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&n(o)}).observe(document,{childList:!0,subtree:!0});function e(r){const s={};return r.integrity&&(s.integrity=r.integrity),r.referrerPolicy&&(s.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?s.credentials="include":r.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function n(r){if(r.ep)return;r.ep=!0;const s=e(r);fetch(r.href,s)}})();const gu="modulepreload",xu=function(i){return"/hexes-of-battle/"+i},rs={},en=function(t,e,n){let r=Promise.resolve();if(e&&e.length>0){document.getElementsByTagName("link");const o=document.querySelector("meta[property=csp-nonce]"),a=o?.nonce||o?.getAttribute("nonce");r=Promise.allSettled(e.map(l=>{if(l=xu(l),l in rs)return;rs[l]=!0;const u=l.endsWith(".css"),h=u?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${l}"]${h}`))return;const c=document.createElement("link");if(c.rel=u?"stylesheet":gu,u||(c.as="script"),c.crossOrigin="",c.href=l,a&&c.setAttribute("nonce",a),document.head.appendChild(c),u)return new Promise((d,f)=>{c.addEventListener("load",d),c.addEventListener("error",()=>f(new Error(`Unable to preload CSS for ${l}`)))})}))}function s(o){const a=new Event("vite:preloadError",{cancelable:!0});if(a.payload=o,window.dispatchEvent(a),!a.defaultPrevented)throw o}return r.then(o=>{for(const a of o||[])a.status==="rejected"&&s(a.reason);return t().catch(s)})};var U=(i=>(i.Application="application",i.WebGLPipes="webgl-pipes",i.WebGLPipesAdaptor="webgl-pipes-adaptor",i.WebGLSystem="webgl-system",i.WebGPUPipes="webgpu-pipes",i.WebGPUPipesAdaptor="webgpu-pipes-adaptor",i.WebGPUSystem="webgpu-system",i.CanvasSystem="canvas-system",i.CanvasPipesAdaptor="canvas-pipes-adaptor",i.CanvasPipes="canvas-pipes",i.Asset="asset",i.LoadParser="load-parser",i.ResolveParser="resolve-parser",i.CacheParser="cache-parser",i.DetectionParser="detection-parser",i.MaskEffect="mask-effect",i.BlendMode="blend-mode",i.TextureSource="texture-source",i.Environment="environment",i.ShapeBuilder="shape-builder",i.Batcher="batcher",i))(U||{});const or=i=>{if(typeof i=="function"||typeof i=="object"&&i.extension){if(!i.extension)throw new Error("Extension class must have an extension object");i={...typeof i.extension!="object"?{type:i.extension}:i.extension,ref:i}}if(typeof i=="object")i={...i};else throw new Error("Invalid extension type");return typeof i.type=="string"&&(i.type=[i.type]),i},Ai=(i,t)=>or(i).priority??t,It={_addHandlers:{},_removeHandlers:{},_queue:{},remove(...i){return i.map(or).forEach(t=>{t.type.forEach(e=>this._removeHandlers[e]?.(t))}),this},add(...i){return i.map(or).forEach(t=>{t.type.forEach(e=>{const n=this._addHandlers,r=this._queue;n[e]?n[e]?.(t):(r[e]=r[e]||[],r[e]?.push(t))})}),this},handle(i,t,e){const n=this._addHandlers,r=this._removeHandlers;if(n[i]||r[i])throw new Error(`Extension type ${i} already has a handler`);n[i]=t,r[i]=e;const s=this._queue;return s[i]&&(s[i]?.forEach(o=>t(o)),delete s[i]),this},handleByMap(i,t){return this.handle(i,e=>{e.name&&(t[e.name]=e.ref)},e=>{e.name&&delete t[e.name]})},handleByNamedList(i,t,e=-1){return this.handle(i,n=>{t.findIndex(s=>s.name===n.name)>=0||(t.push({name:n.name,value:n.ref}),t.sort((s,o)=>Ai(o.value,e)-Ai(s.value,e)))},n=>{const r=t.findIndex(s=>s.name===n.name);r!==-1&&t.splice(r,1)})},handleByList(i,t,e=-1){return this.handle(i,n=>{t.includes(n.ref)||(t.push(n.ref),t.sort((r,s)=>Ai(s,e)-Ai(r,e)))},n=>{const r=t.indexOf(n.ref);r!==-1&&t.splice(r,1)})}},_u={extension:{type:U.Environment,name:"browser",priority:-1},test:()=>!0,load:async()=>{await en(()=>import("./browserAll-CiDMhh8C.js"),__vite__mapDeps([0,1,2]))}},vu={extension:{type:U.Environment,name:"webworker",priority:0},test:()=>typeof self<"u"&&self.WorkerGlobalScope!==void 0,load:async()=>{await en(()=>import("./webworkerAll-OYa0Luw0.js"),__vite__mapDeps([1,2]))}};class Mt{constructor(t,e,n){this._x=e||0,this._y=n||0,this._observer=t}clone(t){return new Mt(t??this._observer,this._x,this._y)}set(t=0,e=t){return(this._x!==t||this._y!==e)&&(this._x=t,this._y=e,this._observer._onUpdate(this)),this}copyFrom(t){return(this._x!==t.x||this._y!==t.y)&&(this._x=t.x,this._y=t.y,this._observer._onUpdate(this)),this}copyTo(t){return t.set(this._x,this._y),t}equals(t){return t.x===this._x&&t.y===this._y}toString(){return`[pixi.js/math:ObservablePoint x=0 y=0 scope=${this._observer}]`}get x(){return this._x}set x(t){this._x!==t&&(this._x=t,this._observer._onUpdate(this))}get y(){return this._y}set y(t){this._y!==t&&(this._y=t,this._observer._onUpdate(this))}}function Br(i){return i&&i.__esModule&&Object.prototype.hasOwnProperty.call(i,"default")?i.default:i}var yn={exports:{}},ss;function yu(){return ss||(ss=1,function(i){var t=Object.prototype.hasOwnProperty,e="~";function n(){}Object.create&&(n.prototype=Object.create(null),new n().__proto__||(e=!1));function r(l,u,h){this.fn=l,this.context=u,this.once=h||!1}function s(l,u,h,c,d){if(typeof h!="function")throw new TypeError("The listener must be a function");var f=new r(h,c||l,d),x=e?e+u:u;return l._events[x]?l._events[x].fn?l._events[x]=[l._events[x],f]:l._events[x].push(f):(l._events[x]=f,l._eventsCount++),l}function o(l,u){--l._eventsCount===0?l._events=new n:delete l._events[u]}function a(){this._events=new n,this._eventsCount=0}a.prototype.eventNames=function(){var u=[],h,c;if(this._eventsCount===0)return u;for(c in h=this._events)t.call(h,c)&&u.push(e?c.slice(1):c);return Object.getOwnPropertySymbols?u.concat(Object.getOwnPropertySymbols(h)):u},a.prototype.listeners=function(u){var h=e?e+u:u,c=this._events[h];if(!c)return[];if(c.fn)return[c.fn];for(var d=0,f=c.length,x=new Array(f);d<f;d++)x[d]=c[d].fn;return x},a.prototype.listenerCount=function(u){var h=e?e+u:u,c=this._events[h];return c?c.fn?1:c.length:0},a.prototype.emit=function(u,h,c,d,f,x){var v=e?e+u:u;if(!this._events[v])return!1;var g=this._events[v],y=arguments.length,S,w;if(g.fn){switch(g.once&&this.removeListener(u,g.fn,void 0,!0),y){case 1:return g.fn.call(g.context),!0;case 2:return g.fn.call(g.context,h),!0;case 3:return g.fn.call(g.context,h,c),!0;case 4:return g.fn.call(g.context,h,c,d),!0;case 5:return g.fn.call(g.context,h,c,d,f),!0;case 6:return g.fn.call(g.context,h,c,d,f,x),!0}for(w=1,S=new Array(y-1);w<y;w++)S[w-1]=arguments[w];g.fn.apply(g.context,S)}else{var T=g.length,I;for(w=0;w<T;w++)switch(g[w].once&&this.removeListener(u,g[w].fn,void 0,!0),y){case 1:g[w].fn.call(g[w].context);break;case 2:g[w].fn.call(g[w].context,h);break;case 3:g[w].fn.call(g[w].context,h,c);break;case 4:g[w].fn.call(g[w].context,h,c,d);break;default:if(!S)for(I=1,S=new Array(y-1);I<y;I++)S[I-1]=arguments[I];g[w].fn.apply(g[w].context,S)}}return!0},a.prototype.on=function(u,h,c){return s(this,u,h,c,!1)},a.prototype.once=function(u,h,c){return s(this,u,h,c,!0)},a.prototype.removeListener=function(u,h,c,d){var f=e?e+u:u;if(!this._events[f])return this;if(!h)return o(this,f),this;var x=this._events[f];if(x.fn)x.fn===h&&(!d||x.once)&&(!c||x.context===c)&&o(this,f);else{for(var v=0,g=[],y=x.length;v<y;v++)(x[v].fn!==h||d&&!x[v].once||c&&x[v].context!==c)&&g.push(x[v]);g.length?this._events[f]=g.length===1?g[0]:g:o(this,f)}return this},a.prototype.removeAllListeners=function(u){var h;return u?(h=e?e+u:u,this._events[h]&&o(this,h)):(this._events=new n,this._eventsCount=0),this},a.prototype.off=a.prototype.removeListener,a.prototype.addListener=a.prototype.on,a.prefixed=e,a.EventEmitter=a,i.exports=a}(yn)),yn.exports}var bu=yu();const Ot=Br(bu),Su=Math.PI*2,wu=180/Math.PI,Ve=Math.PI/180;class Ft{constructor(t=0,e=0){this.x=0,this.y=0,this.x=t,this.y=e}clone(){return new Ft(this.x,this.y)}copyFrom(t){return this.set(t.x,t.y),this}copyTo(t){return t.set(this.x,this.y),t}equals(t){return t.x===this.x&&t.y===this.y}set(t=0,e=t){return this.x=t,this.y=e,this}toString(){return`[pixi.js/math:Point x=${this.x} y=${this.y}]`}static get shared(){return bn.x=0,bn.y=0,bn}}const bn=new Ft;class Q{constructor(t=1,e=0,n=0,r=1,s=0,o=0){this.array=null,this.a=t,this.b=e,this.c=n,this.d=r,this.tx=s,this.ty=o}fromArray(t){this.a=t[0],this.b=t[1],this.c=t[3],this.d=t[4],this.tx=t[2],this.ty=t[5]}set(t,e,n,r,s,o){return this.a=t,this.b=e,this.c=n,this.d=r,this.tx=s,this.ty=o,this}toArray(t,e){this.array||(this.array=new Float32Array(9));const n=e||this.array;return t?(n[0]=this.a,n[1]=this.b,n[2]=0,n[3]=this.c,n[4]=this.d,n[5]=0,n[6]=this.tx,n[7]=this.ty,n[8]=1):(n[0]=this.a,n[1]=this.c,n[2]=this.tx,n[3]=this.b,n[4]=this.d,n[5]=this.ty,n[6]=0,n[7]=0,n[8]=1),n}apply(t,e){e=e||new Ft;const n=t.x,r=t.y;return e.x=this.a*n+this.c*r+this.tx,e.y=this.b*n+this.d*r+this.ty,e}applyInverse(t,e){e=e||new Ft;const n=this.a,r=this.b,s=this.c,o=this.d,a=this.tx,l=this.ty,u=1/(n*o+s*-r),h=t.x,c=t.y;return e.x=o*u*h+-s*u*c+(l*s-a*o)*u,e.y=n*u*c+-r*u*h+(-l*n+a*r)*u,e}translate(t,e){return this.tx+=t,this.ty+=e,this}scale(t,e){return this.a*=t,this.d*=e,this.c*=t,this.b*=e,this.tx*=t,this.ty*=e,this}rotate(t){const e=Math.cos(t),n=Math.sin(t),r=this.a,s=this.c,o=this.tx;return this.a=r*e-this.b*n,this.b=r*n+this.b*e,this.c=s*e-this.d*n,this.d=s*n+this.d*e,this.tx=o*e-this.ty*n,this.ty=o*n+this.ty*e,this}append(t){const e=this.a,n=this.b,r=this.c,s=this.d;return this.a=t.a*e+t.b*r,this.b=t.a*n+t.b*s,this.c=t.c*e+t.d*r,this.d=t.c*n+t.d*s,this.tx=t.tx*e+t.ty*r+this.tx,this.ty=t.tx*n+t.ty*s+this.ty,this}appendFrom(t,e){const n=t.a,r=t.b,s=t.c,o=t.d,a=t.tx,l=t.ty,u=e.a,h=e.b,c=e.c,d=e.d;return this.a=n*u+r*c,this.b=n*h+r*d,this.c=s*u+o*c,this.d=s*h+o*d,this.tx=a*u+l*c+e.tx,this.ty=a*h+l*d+e.ty,this}setTransform(t,e,n,r,s,o,a,l,u){return this.a=Math.cos(a+u)*s,this.b=Math.sin(a+u)*s,this.c=-Math.sin(a-l)*o,this.d=Math.cos(a-l)*o,this.tx=t-(n*this.a+r*this.c),this.ty=e-(n*this.b+r*this.d),this}prepend(t){const e=this.tx;if(t.a!==1||t.b!==0||t.c!==0||t.d!==1){const n=this.a,r=this.c;this.a=n*t.a+this.b*t.c,this.b=n*t.b+this.b*t.d,this.c=r*t.a+this.d*t.c,this.d=r*t.b+this.d*t.d}return this.tx=e*t.a+this.ty*t.c+t.tx,this.ty=e*t.b+this.ty*t.d+t.ty,this}decompose(t){const e=this.a,n=this.b,r=this.c,s=this.d,o=t.pivot,a=-Math.atan2(-r,s),l=Math.atan2(n,e),u=Math.abs(a+l);return u<1e-5||Math.abs(Su-u)<1e-5?(t.rotation=l,t.skew.x=t.skew.y=0):(t.rotation=0,t.skew.x=a,t.skew.y=l),t.scale.x=Math.sqrt(e*e+n*n),t.scale.y=Math.sqrt(r*r+s*s),t.position.x=this.tx+(o.x*e+o.y*r),t.position.y=this.ty+(o.x*n+o.y*s),t}invert(){const t=this.a,e=this.b,n=this.c,r=this.d,s=this.tx,o=t*r-e*n;return this.a=r/o,this.b=-e/o,this.c=-n/o,this.d=t/o,this.tx=(n*this.ty-r*s)/o,this.ty=-(t*this.ty-e*s)/o,this}isIdentity(){return this.a===1&&this.b===0&&this.c===0&&this.d===1&&this.tx===0&&this.ty===0}identity(){return this.a=1,this.b=0,this.c=0,this.d=1,this.tx=0,this.ty=0,this}clone(){const t=new Q;return t.a=this.a,t.b=this.b,t.c=this.c,t.d=this.d,t.tx=this.tx,t.ty=this.ty,t}copyTo(t){return t.a=this.a,t.b=this.b,t.c=this.c,t.d=this.d,t.tx=this.tx,t.ty=this.ty,t}copyFrom(t){return this.a=t.a,this.b=t.b,this.c=t.c,this.d=t.d,this.tx=t.tx,this.ty=t.ty,this}equals(t){return t.a===this.a&&t.b===this.b&&t.c===this.c&&t.d===this.d&&t.tx===this.tx&&t.ty===this.ty}toString(){return`[pixi.js:Matrix a=${this.a} b=${this.b} c=${this.c} d=${this.d} tx=${this.tx} ty=${this.ty}]`}static get IDENTITY(){return Tu.identity()}static get shared(){return Cu.identity()}}const Cu=new Q,Tu=new Q,me=[1,1,0,-1,-1,-1,0,1,1,1,0,-1,-1,-1,0,1],ge=[0,1,1,1,0,-1,-1,-1,0,1,1,1,0,-1,-1,-1],xe=[0,-1,-1,-1,0,1,1,1,0,1,1,1,0,-1,-1,-1],_e=[1,1,0,-1,-1,-1,0,1,-1,-1,0,1,1,1,0,-1],ar=[],Bo=[],Pi=Math.sign;function Au(){for(let i=0;i<16;i++){const t=[];ar.push(t);for(let e=0;e<16;e++){const n=Pi(me[i]*me[e]+xe[i]*ge[e]),r=Pi(ge[i]*me[e]+_e[i]*ge[e]),s=Pi(me[i]*xe[e]+xe[i]*_e[e]),o=Pi(ge[i]*xe[e]+_e[i]*_e[e]);for(let a=0;a<16;a++)if(me[a]===n&&ge[a]===r&&xe[a]===s&&_e[a]===o){t.push(a);break}}}for(let i=0;i<16;i++){const t=new Q;t.set(me[i],ge[i],xe[i],_e[i],0,0),Bo.push(t)}}Au();const dt={E:0,SE:1,S:2,SW:3,W:4,NW:5,N:6,NE:7,MIRROR_VERTICAL:8,MAIN_DIAGONAL:10,MIRROR_HORIZONTAL:12,REVERSE_DIAGONAL:14,uX:i=>me[i],uY:i=>ge[i],vX:i=>xe[i],vY:i=>_e[i],inv:i=>i&8?i&15:-i&7,add:(i,t)=>ar[i][t],sub:(i,t)=>ar[i][dt.inv(t)],rotate180:i=>i^4,isVertical:i=>(i&3)===2,byDirection:(i,t)=>Math.abs(i)*2<=Math.abs(t)?t>=0?dt.S:dt.N:Math.abs(t)*2<=Math.abs(i)?i>0?dt.E:dt.W:t>0?i>0?dt.SE:dt.SW:i>0?dt.NE:dt.NW,matrixAppendRotationInv:(i,t,e=0,n=0)=>{const r=Bo[dt.inv(t)];r.tx=e,r.ty=n,i.append(r)}},Mi=[new Ft,new Ft,new Ft,new Ft];class _t{constructor(t=0,e=0,n=0,r=0){this.type="rectangle",this.x=Number(t),this.y=Number(e),this.width=Number(n),this.height=Number(r)}get left(){return this.x}get right(){return this.x+this.width}get top(){return this.y}get bottom(){return this.y+this.height}isEmpty(){return this.left===this.right||this.top===this.bottom}static get EMPTY(){return new _t(0,0,0,0)}clone(){return new _t(this.x,this.y,this.width,this.height)}copyFromBounds(t){return this.x=t.minX,this.y=t.minY,this.width=t.maxX-t.minX,this.height=t.maxY-t.minY,this}copyFrom(t){return this.x=t.x,this.y=t.y,this.width=t.width,this.height=t.height,this}copyTo(t){return t.copyFrom(this),t}contains(t,e){return this.width<=0||this.height<=0?!1:t>=this.x&&t<this.x+this.width&&e>=this.y&&e<this.y+this.height}strokeContains(t,e,n,r=.5){const{width:s,height:o}=this;if(s<=0||o<=0)return!1;const a=this.x,l=this.y,u=n*(1-r),h=n-u,c=a-u,d=a+s+u,f=l-u,x=l+o+u,v=a+h,g=a+s-h,y=l+h,S=l+o-h;return t>=c&&t<=d&&e>=f&&e<=x&&!(t>v&&t<g&&e>y&&e<S)}intersects(t,e){if(!e){const D=this.x<t.x?t.x:this.x;if((this.right>t.right?t.right:this.right)<=D)return!1;const R=this.y<t.y?t.y:this.y;return(this.bottom>t.bottom?t.bottom:this.bottom)>R}const n=this.left,r=this.right,s=this.top,o=this.bottom;if(r<=n||o<=s)return!1;const a=Mi[0].set(t.left,t.top),l=Mi[1].set(t.left,t.bottom),u=Mi[2].set(t.right,t.top),h=Mi[3].set(t.right,t.bottom);if(u.x<=a.x||l.y<=a.y)return!1;const c=Math.sign(e.a*e.d-e.b*e.c);if(c===0||(e.apply(a,a),e.apply(l,l),e.apply(u,u),e.apply(h,h),Math.max(a.x,l.x,u.x,h.x)<=n||Math.min(a.x,l.x,u.x,h.x)>=r||Math.max(a.y,l.y,u.y,h.y)<=s||Math.min(a.y,l.y,u.y,h.y)>=o))return!1;const d=c*(l.y-a.y),f=c*(a.x-l.x),x=d*n+f*s,v=d*r+f*s,g=d*n+f*o,y=d*r+f*o;if(Math.max(x,v,g,y)<=d*a.x+f*a.y||Math.min(x,v,g,y)>=d*h.x+f*h.y)return!1;const S=c*(a.y-u.y),w=c*(u.x-a.x),T=S*n+w*s,I=S*r+w*s,A=S*n+w*o,M=S*r+w*o;return!(Math.max(T,I,A,M)<=S*a.x+w*a.y||Math.min(T,I,A,M)>=S*h.x+w*h.y)}pad(t=0,e=t){return this.x-=t,this.y-=e,this.width+=t*2,this.height+=e*2,this}fit(t){const e=Math.max(this.x,t.x),n=Math.min(this.x+this.width,t.x+t.width),r=Math.max(this.y,t.y),s=Math.min(this.y+this.height,t.y+t.height);return this.x=e,this.width=Math.max(n-e,0),this.y=r,this.height=Math.max(s-r,0),this}ceil(t=1,e=.001){const n=Math.ceil((this.x+this.width-e)*t)/t,r=Math.ceil((this.y+this.height-e)*t)/t;return this.x=Math.floor((this.x+e)*t)/t,this.y=Math.floor((this.y+e)*t)/t,this.width=n-this.x,this.height=r-this.y,this}enlarge(t){const e=Math.min(this.x,t.x),n=Math.max(this.x+this.width,t.x+t.width),r=Math.min(this.y,t.y),s=Math.max(this.y+this.height,t.y+t.height);return this.x=e,this.width=n-e,this.y=r,this.height=s-r,this}getBounds(t){return t||(t=new _t),t.copyFrom(this),t}toString(){return`[pixi.js/math:Rectangle x=${this.x} y=${this.y} width=${this.width} height=${this.height}]`}}const Sn={default:-1};function St(i="default"){return Sn[i]===void 0&&(Sn[i]=-1),++Sn[i]}const os={},pt="8.0.0",Pu="8.3.4";function B(i,t,e=3){if(os[t])return;let n=new Error().stack;typeof n>"u"?console.warn("PixiJS Deprecation Warning: ",`${t}
Deprecated since v${i}`):(n=n.split(`
`).splice(e).join(`
`),console.groupCollapsed?(console.groupCollapsed("%cPixiJS Deprecation Warning: %c%s","color:#614108;background:#fffbe6","font-weight:normal;color:#614108;background:#fffbe6",`${t}
Deprecated since v${i}`),console.warn(n),console.groupEnd()):(console.warn("PixiJS Deprecation Warning: ",`${t}
Deprecated since v${i}`),console.warn(n))),os[t]=!0}const Do=()=>{};function nn(i){return i+=i===0?1:0,--i,i|=i>>>1,i|=i>>>2,i|=i>>>4,i|=i>>>8,i|=i>>>16,i+1}function as(i){return!(i&i-1)&&!!i}function Mu(i){const t={};for(const e in i)i[e]!==void 0&&(t[e]=i[e]);return t}const ls=Object.create(null);function Fu(i){const t=ls[i];return t===void 0&&(ls[i]=St("resource")),t}const No=class Go extends Ot{constructor(t={}){super(),this._resourceType="textureSampler",this._touched=0,this._maxAnisotropy=1,this.destroyed=!1,t={...Go.defaultOptions,...t},this.addressMode=t.addressMode,this.addressModeU=t.addressModeU??this.addressModeU,this.addressModeV=t.addressModeV??this.addressModeV,this.addressModeW=t.addressModeW??this.addressModeW,this.scaleMode=t.scaleMode,this.magFilter=t.magFilter??this.magFilter,this.minFilter=t.minFilter??this.minFilter,this.mipmapFilter=t.mipmapFilter??this.mipmapFilter,this.lodMinClamp=t.lodMinClamp,this.lodMaxClamp=t.lodMaxClamp,this.compare=t.compare,this.maxAnisotropy=t.maxAnisotropy??1}set addressMode(t){this.addressModeU=t,this.addressModeV=t,this.addressModeW=t}get addressMode(){return this.addressModeU}set wrapMode(t){B(pt,"TextureStyle.wrapMode is now TextureStyle.addressMode"),this.addressMode=t}get wrapMode(){return this.addressMode}set scaleMode(t){this.magFilter=t,this.minFilter=t,this.mipmapFilter=t}get scaleMode(){return this.magFilter}set maxAnisotropy(t){this._maxAnisotropy=Math.min(t,16),this._maxAnisotropy>1&&(this.scaleMode="linear")}get maxAnisotropy(){return this._maxAnisotropy}get _resourceId(){return this._sharedResourceId||this._generateResourceId()}update(){this.emit("change",this),this._sharedResourceId=null}_generateResourceId(){const t=`${this.addressModeU}-${this.addressModeV}-${this.addressModeW}-${this.magFilter}-${this.minFilter}-${this.mipmapFilter}-${this.lodMinClamp}-${this.lodMaxClamp}-${this.compare}-${this._maxAnisotropy}`;return this._sharedResourceId=Fu(t),this._resourceId}destroy(){this.destroyed=!0,this.emit("destroy",this),this.emit("change",this),this.removeAllListeners()}};No.defaultOptions={addressMode:"clamp-to-edge",scaleMode:"linear"};let Iu=No;const Vo=class Wo extends Ot{constructor(t={}){super(),this.options=t,this.uid=St("textureSource"),this._resourceType="textureSource",this._resourceId=St("resource"),this.uploadMethodId="unknown",this._resolution=1,this.pixelWidth=1,this.pixelHeight=1,this.width=1,this.height=1,this.sampleCount=1,this.mipLevelCount=1,this.autoGenerateMipmaps=!1,this.format="rgba8unorm",this.dimension="2d",this.antialias=!1,this._touched=0,this._batchTick=-1,this._textureBindLocation=-1,t={...Wo.defaultOptions,...t},this.label=t.label??"",this.resource=t.resource,this.autoGarbageCollect=t.autoGarbageCollect,this._resolution=t.resolution,t.width?this.pixelWidth=t.width*this._resolution:this.pixelWidth=this.resource?this.resourceWidth??1:1,t.height?this.pixelHeight=t.height*this._resolution:this.pixelHeight=this.resource?this.resourceHeight??1:1,this.width=this.pixelWidth/this._resolution,this.height=this.pixelHeight/this._resolution,this.format=t.format,this.dimension=t.dimensions,this.mipLevelCount=t.mipLevelCount,this.autoGenerateMipmaps=t.autoGenerateMipmaps,this.sampleCount=t.sampleCount,this.antialias=t.antialias,this.alphaMode=t.alphaMode,this.style=new Iu(Mu(t)),this.destroyed=!1,this._refreshPOT()}get source(){return this}get style(){return this._style}set style(t){this.style!==t&&(this._style?.off("change",this._onStyleChange,this),this._style=t,this._style?.on("change",this._onStyleChange,this),this._onStyleChange())}get addressMode(){return this._style.addressMode}set addressMode(t){this._style.addressMode=t}get repeatMode(){return this._style.addressMode}set repeatMode(t){this._style.addressMode=t}get magFilter(){return this._style.magFilter}set magFilter(t){this._style.magFilter=t}get minFilter(){return this._style.minFilter}set minFilter(t){this._style.minFilter=t}get mipmapFilter(){return this._style.mipmapFilter}set mipmapFilter(t){this._style.mipmapFilter=t}get lodMinClamp(){return this._style.lodMinClamp}set lodMinClamp(t){this._style.lodMinClamp=t}get lodMaxClamp(){return this._style.lodMaxClamp}set lodMaxClamp(t){this._style.lodMaxClamp=t}_onStyleChange(){this.emit("styleChange",this)}update(){if(this.resource){const t=this._resolution;if(this.resize(this.resourceWidth/t,this.resourceHeight/t))return}this.emit("update",this)}destroy(){this.destroyed=!0,this.emit("destroy",this),this.emit("change",this),this._style&&(this._style.destroy(),this._style=null),this.uploadMethodId=null,this.resource=null,this.removeAllListeners()}unload(){this._resourceId=St("resource"),this.emit("change",this),this.emit("unload",this)}get resourceWidth(){const{resource:t}=this;return t.naturalWidth||t.videoWidth||t.displayWidth||t.width}get resourceHeight(){const{resource:t}=this;return t.naturalHeight||t.videoHeight||t.displayHeight||t.height}get resolution(){return this._resolution}set resolution(t){this._resolution!==t&&(this._resolution=t,this.width=this.pixelWidth/t,this.height=this.pixelHeight/t)}resize(t,e,n){n||(n=this._resolution),t||(t=this.width),e||(e=this.height);const r=Math.round(t*n),s=Math.round(e*n);return this.width=r/n,this.height=s/n,this._resolution=n,this.pixelWidth===r&&this.pixelHeight===s?!1:(this._refreshPOT(),this.pixelWidth=r,this.pixelHeight=s,this.emit("resize",this),this._resourceId=St("resource"),this.emit("change",this),!0)}updateMipmaps(){this.autoGenerateMipmaps&&this.mipLevelCount>1&&this.emit("updateMipmaps",this)}set wrapMode(t){this._style.wrapMode=t}get wrapMode(){return this._style.wrapMode}set scaleMode(t){this._style.scaleMode=t}get scaleMode(){return this._style.scaleMode}_refreshPOT(){this.isPowerOfTwo=as(this.pixelWidth)&&as(this.pixelHeight)}static test(t){throw new Error("Unimplemented")}};Vo.defaultOptions={resolution:1,format:"bgra8unorm",alphaMode:"premultiply-alpha-on-upload",dimensions:"2d",mipLevelCount:1,autoGenerateMipmaps:!1,sampleCount:1,antialias:!1,autoGarbageCollect:!1};let zt=Vo;class Dr extends zt{constructor(t){const e=t.resource||new Float32Array(t.width*t.height*4);let n=t.format;n||(e instanceof Float32Array?n="rgba32float":e instanceof Int32Array||e instanceof Uint32Array?n="rgba32uint":e instanceof Int16Array||e instanceof Uint16Array?n="rgba16uint":(e instanceof Int8Array,n="bgra8unorm")),super({...t,resource:e,format:n}),this.uploadMethodId="buffer"}static test(t){return t instanceof Int8Array||t instanceof Uint8Array||t instanceof Uint8ClampedArray||t instanceof Int16Array||t instanceof Uint16Array||t instanceof Int32Array||t instanceof Uint32Array||t instanceof Float32Array}}Dr.extension=U.TextureSource;const us=new Q;class Ou{constructor(t,e){this.mapCoord=new Q,this.uClampFrame=new Float32Array(4),this.uClampOffset=new Float32Array(2),this._textureID=-1,this._updateID=0,this.clampOffset=0,typeof e>"u"?this.clampMargin=t.width<10?0:.5:this.clampMargin=e,this.isSimple=!1,this.texture=t}get texture(){return this._texture}set texture(t){this.texture!==t&&(this._texture?.removeListener("update",this.update,this),this._texture=t,this._texture.addListener("update",this.update,this),this.update())}multiplyUvs(t,e){e===void 0&&(e=t);const n=this.mapCoord;for(let r=0;r<t.length;r+=2){const s=t[r],o=t[r+1];e[r]=s*n.a+o*n.c+n.tx,e[r+1]=s*n.b+o*n.d+n.ty}return e}update(){const t=this._texture;this._updateID++;const e=t.uvs;this.mapCoord.set(e.x1-e.x0,e.y1-e.y0,e.x3-e.x0,e.y3-e.y0,e.x0,e.y0);const n=t.orig,r=t.trim;r&&(us.set(n.width/r.width,0,0,n.height/r.height,-r.x/r.width,-r.y/r.height),this.mapCoord.append(us));const s=t.source,o=this.uClampFrame,a=this.clampMargin/s._resolution,l=this.clampOffset/s._resolution;return o[0]=(t.frame.x+a+l)/s.width,o[1]=(t.frame.y+a+l)/s.height,o[2]=(t.frame.x+t.frame.width-a+l)/s.width,o[3]=(t.frame.y+t.frame.height-a+l)/s.height,this.uClampOffset[0]=this.clampOffset/s.pixelWidth,this.uClampOffset[1]=this.clampOffset/s.pixelHeight,this.isSimple=t.frame.width===s.width&&t.frame.height===s.height&&t.rotate===0,!0}}class k extends Ot{constructor({source:t,label:e,frame:n,orig:r,trim:s,defaultAnchor:o,defaultBorders:a,rotate:l,dynamic:u}={}){if(super(),this.uid=St("texture"),this.uvs={x0:0,y0:0,x1:0,y1:0,x2:0,y2:0,x3:0,y3:0},this.frame=new _t,this.noFrame=!1,this.dynamic=!1,this.isTexture=!0,this.label=e,this.source=t?.source??new zt,this.noFrame=!n,n)this.frame.copyFrom(n);else{const{width:h,height:c}=this._source;this.frame.width=h,this.frame.height=c}this.orig=r||this.frame,this.trim=s,this.rotate=l??0,this.defaultAnchor=o,this.defaultBorders=a,this.destroyed=!1,this.dynamic=u||!1,this.updateUvs()}set source(t){this._source&&this._source.off("resize",this.update,this),this._source=t,t.on("resize",this.update,this),this.emit("update",this)}get source(){return this._source}get textureMatrix(){return this._textureMatrix||(this._textureMatrix=new Ou(this)),this._textureMatrix}get width(){return this.orig.width}get height(){return this.orig.height}updateUvs(){const{uvs:t,frame:e}=this,{width:n,height:r}=this._source,s=e.x/n,o=e.y/r,a=e.width/n,l=e.height/r;let u=this.rotate;if(u){const h=a/2,c=l/2,d=s+h,f=o+c;u=dt.add(u,dt.NW),t.x0=d+h*dt.uX(u),t.y0=f+c*dt.uY(u),u=dt.add(u,2),t.x1=d+h*dt.uX(u),t.y1=f+c*dt.uY(u),u=dt.add(u,2),t.x2=d+h*dt.uX(u),t.y2=f+c*dt.uY(u),u=dt.add(u,2),t.x3=d+h*dt.uX(u),t.y3=f+c*dt.uY(u)}else t.x0=s,t.y0=o,t.x1=s+a,t.y1=o,t.x2=s+a,t.y2=o+l,t.x3=s,t.y3=o+l}destroy(t=!1){this._source&&t&&(this._source.destroy(),this._source=null),this._textureMatrix=null,this.destroyed=!0,this.emit("destroy",this),this.removeAllListeners()}update(){this.noFrame&&(this.frame.width=this._source.width,this.frame.height=this._source.height),this.updateUvs(),this.emit("update",this)}get baseTexture(){return B(pt,"Texture.baseTexture is now Texture.source"),this._source}}k.EMPTY=new k({label:"EMPTY",source:new zt({label:"EMPTY"})});k.EMPTY.destroy=Do;k.WHITE=new k({source:new Dr({resource:new Uint8Array([255,255,255,255]),width:1,height:1,alphaMode:"premultiply-alpha-on-upload",label:"WHITE"}),label:"WHITE"});k.WHITE.destroy=Do;function Ru(i,t,e,n){const{width:r,height:s}=e.orig,o=e.trim;if(o){const a=o.width,l=o.height;i.minX=o.x-t._x*r-n,i.maxX=i.minX+a,i.minY=o.y-t._y*s-n,i.maxY=i.minY+l}else i.minX=-t._x*r-n,i.maxX=i.minX+r,i.minY=-t._y*s-n,i.maxY=i.minY+s}const hs=new Q;class te{constructor(t=1/0,e=1/0,n=-1/0,r=-1/0){this.minX=1/0,this.minY=1/0,this.maxX=-1/0,this.maxY=-1/0,this.matrix=hs,this.minX=t,this.minY=e,this.maxX=n,this.maxY=r}isEmpty(){return this.minX>this.maxX||this.minY>this.maxY}get rectangle(){this._rectangle||(this._rectangle=new _t);const t=this._rectangle;return this.minX>this.maxX||this.minY>this.maxY?(t.x=0,t.y=0,t.width=0,t.height=0):t.copyFromBounds(this),t}clear(){return this.minX=1/0,this.minY=1/0,this.maxX=-1/0,this.maxY=-1/0,this.matrix=hs,this}set(t,e,n,r){this.minX=t,this.minY=e,this.maxX=n,this.maxY=r}addFrame(t,e,n,r,s){s||(s=this.matrix);const o=s.a,a=s.b,l=s.c,u=s.d,h=s.tx,c=s.ty;let d=this.minX,f=this.minY,x=this.maxX,v=this.maxY,g=o*t+l*e+h,y=a*t+u*e+c;g<d&&(d=g),y<f&&(f=y),g>x&&(x=g),y>v&&(v=y),g=o*n+l*e+h,y=a*n+u*e+c,g<d&&(d=g),y<f&&(f=y),g>x&&(x=g),y>v&&(v=y),g=o*t+l*r+h,y=a*t+u*r+c,g<d&&(d=g),y<f&&(f=y),g>x&&(x=g),y>v&&(v=y),g=o*n+l*r+h,y=a*n+u*r+c,g<d&&(d=g),y<f&&(f=y),g>x&&(x=g),y>v&&(v=y),this.minX=d,this.minY=f,this.maxX=x,this.maxY=v}addRect(t,e){this.addFrame(t.x,t.y,t.x+t.width,t.y+t.height,e)}addBounds(t,e){this.addFrame(t.minX,t.minY,t.maxX,t.maxY,e)}addBoundsMask(t){this.minX=this.minX>t.minX?this.minX:t.minX,this.minY=this.minY>t.minY?this.minY:t.minY,this.maxX=this.maxX<t.maxX?this.maxX:t.maxX,this.maxY=this.maxY<t.maxY?this.maxY:t.maxY}applyMatrix(t){const e=this.minX,n=this.minY,r=this.maxX,s=this.maxY,{a:o,b:a,c:l,d:u,tx:h,ty:c}=t;let d=o*e+l*n+h,f=a*e+u*n+c;this.minX=d,this.minY=f,this.maxX=d,this.maxY=f,d=o*r+l*n+h,f=a*r+u*n+c,this.minX=d<this.minX?d:this.minX,this.minY=f<this.minY?f:this.minY,this.maxX=d>this.maxX?d:this.maxX,this.maxY=f>this.maxY?f:this.maxY,d=o*e+l*s+h,f=a*e+u*s+c,this.minX=d<this.minX?d:this.minX,this.minY=f<this.minY?f:this.minY,this.maxX=d>this.maxX?d:this.maxX,this.maxY=f>this.maxY?f:this.maxY,d=o*r+l*s+h,f=a*r+u*s+c,this.minX=d<this.minX?d:this.minX,this.minY=f<this.minY?f:this.minY,this.maxX=d>this.maxX?d:this.maxX,this.maxY=f>this.maxY?f:this.maxY}fit(t){return this.minX<t.left&&(this.minX=t.left),this.maxX>t.right&&(this.maxX=t.right),this.minY<t.top&&(this.minY=t.top),this.maxY>t.bottom&&(this.maxY=t.bottom),this}fitBounds(t,e,n,r){return this.minX<t&&(this.minX=t),this.maxX>e&&(this.maxX=e),this.minY<n&&(this.minY=n),this.maxY>r&&(this.maxY=r),this}pad(t,e=t){return this.minX-=t,this.maxX+=t,this.minY-=e,this.maxY+=e,this}ceil(){return this.minX=Math.floor(this.minX),this.minY=Math.floor(this.minY),this.maxX=Math.ceil(this.maxX),this.maxY=Math.ceil(this.maxY),this}clone(){return new te(this.minX,this.minY,this.maxX,this.maxY)}scale(t,e=t){return this.minX*=t,this.minY*=e,this.maxX*=t,this.maxY*=e,this}get x(){return this.minX}set x(t){const e=this.maxX-this.minX;this.minX=t,this.maxX=t+e}get y(){return this.minY}set y(t){const e=this.maxY-this.minY;this.minY=t,this.maxY=t+e}get width(){return this.maxX-this.minX}set width(t){this.maxX=this.minX+t}get height(){return this.maxY-this.minY}set height(t){this.maxY=this.minY+t}get left(){return this.minX}get right(){return this.maxX}get top(){return this.minY}get bottom(){return this.maxY}get isPositive(){return this.maxX-this.minX>0&&this.maxY-this.minY>0}get isValid(){return this.minX+this.minY!==1/0}addVertexData(t,e,n,r){let s=this.minX,o=this.minY,a=this.maxX,l=this.maxY;r||(r=this.matrix);const u=r.a,h=r.b,c=r.c,d=r.d,f=r.tx,x=r.ty;for(let v=e;v<n;v+=2){const g=t[v],y=t[v+1],S=u*g+c*y+f,w=h*g+d*y+x;s=S<s?S:s,o=w<o?w:o,a=S>a?S:a,l=w>l?w:l}this.minX=s,this.minY=o,this.maxX=a,this.maxY=l}containsPoint(t,e){return this.minX<=t&&this.minY<=e&&this.maxX>=t&&this.maxY>=e}toString(){return`[pixi.js:Bounds minX=${this.minX} minY=${this.minY} maxX=${this.maxX} maxY=${this.maxY} width=${this.width} height=${this.height}]`}copyFrom(t){return this.minX=t.minX,this.minY=t.minY,this.maxX=t.maxX,this.maxY=t.maxY,this}}var Eu={grad:.9,turn:360,rad:360/(2*Math.PI)},ie=function(i){return typeof i=="string"?i.length>0:typeof i=="number"},Tt=function(i,t,e){return t===void 0&&(t=0),e===void 0&&(e=Math.pow(10,t)),Math.round(e*i)/e+0},Nt=function(i,t,e){return t===void 0&&(t=0),e===void 0&&(e=1),i>e?e:i>t?i:t},$o=function(i){return(i=isFinite(i)?i%360:0)>0?i:i+360},cs=function(i){return{r:Nt(i.r,0,255),g:Nt(i.g,0,255),b:Nt(i.b,0,255),a:Nt(i.a)}},wn=function(i){return{r:Tt(i.r),g:Tt(i.g),b:Tt(i.b),a:Tt(i.a,3)}},Uu=/^#([0-9a-f]{3,8})$/i,Fi=function(i){var t=i.toString(16);return t.length<2?"0"+t:t},Ho=function(i){var t=i.r,e=i.g,n=i.b,r=i.a,s=Math.max(t,e,n),o=s-Math.min(t,e,n),a=o?s===t?(e-n)/o:s===e?2+(n-t)/o:4+(t-e)/o:0;return{h:60*(a<0?a+6:a),s:s?o/s*100:0,v:s/255*100,a:r}},Xo=function(i){var t=i.h,e=i.s,n=i.v,r=i.a;t=t/360*6,e/=100,n/=100;var s=Math.floor(t),o=n*(1-e),a=n*(1-(t-s)*e),l=n*(1-(1-t+s)*e),u=s%6;return{r:255*[n,a,o,o,l,n][u],g:255*[l,n,n,a,o,o][u],b:255*[o,o,l,n,n,a][u],a:r}},fs=function(i){return{h:$o(i.h),s:Nt(i.s,0,100),l:Nt(i.l,0,100),a:Nt(i.a)}},ds=function(i){return{h:Tt(i.h),s:Tt(i.s),l:Tt(i.l),a:Tt(i.a,3)}},ps=function(i){return Xo((e=(t=i).s,{h:t.h,s:(e*=((n=t.l)<50?n:100-n)/100)>0?2*e/(n+e)*100:0,v:n+e,a:t.a}));var t,e,n},di=function(i){return{h:(t=Ho(i)).h,s:(r=(200-(e=t.s))*(n=t.v)/100)>0&&r<200?e*n/100/(r<=100?r:200-r)*100:0,l:r/2,a:t.a};var t,e,n,r},zu=/^hsla?\(\s*([+-]?\d*\.?\d+)(deg|rad|grad|turn)?\s*,\s*([+-]?\d*\.?\d+)%\s*,\s*([+-]?\d*\.?\d+)%\s*(?:,\s*([+-]?\d*\.?\d+)(%)?\s*)?\)$/i,ku=/^hsla?\(\s*([+-]?\d*\.?\d+)(deg|rad|grad|turn)?\s+([+-]?\d*\.?\d+)%\s+([+-]?\d*\.?\d+)%\s*(?:\/\s*([+-]?\d*\.?\d+)(%)?\s*)?\)$/i,Lu=/^rgba?\(\s*([+-]?\d*\.?\d+)(%)?\s*,\s*([+-]?\d*\.?\d+)(%)?\s*,\s*([+-]?\d*\.?\d+)(%)?\s*(?:,\s*([+-]?\d*\.?\d+)(%)?\s*)?\)$/i,Bu=/^rgba?\(\s*([+-]?\d*\.?\d+)(%)?\s+([+-]?\d*\.?\d+)(%)?\s+([+-]?\d*\.?\d+)(%)?\s*(?:\/\s*([+-]?\d*\.?\d+)(%)?\s*)?\)$/i,lr={string:[[function(i){var t=Uu.exec(i);return t?(i=t[1]).length<=4?{r:parseInt(i[0]+i[0],16),g:parseInt(i[1]+i[1],16),b:parseInt(i[2]+i[2],16),a:i.length===4?Tt(parseInt(i[3]+i[3],16)/255,2):1}:i.length===6||i.length===8?{r:parseInt(i.substr(0,2),16),g:parseInt(i.substr(2,2),16),b:parseInt(i.substr(4,2),16),a:i.length===8?Tt(parseInt(i.substr(6,2),16)/255,2):1}:null:null},"hex"],[function(i){var t=Lu.exec(i)||Bu.exec(i);return t?t[2]!==t[4]||t[4]!==t[6]?null:cs({r:Number(t[1])/(t[2]?100/255:1),g:Number(t[3])/(t[4]?100/255:1),b:Number(t[5])/(t[6]?100/255:1),a:t[7]===void 0?1:Number(t[7])/(t[8]?100:1)}):null},"rgb"],[function(i){var t=zu.exec(i)||ku.exec(i);if(!t)return null;var e,n,r=fs({h:(e=t[1],n=t[2],n===void 0&&(n="deg"),Number(e)*(Eu[n]||1)),s:Number(t[3]),l:Number(t[4]),a:t[5]===void 0?1:Number(t[5])/(t[6]?100:1)});return ps(r)},"hsl"]],object:[[function(i){var t=i.r,e=i.g,n=i.b,r=i.a,s=r===void 0?1:r;return ie(t)&&ie(e)&&ie(n)?cs({r:Number(t),g:Number(e),b:Number(n),a:Number(s)}):null},"rgb"],[function(i){var t=i.h,e=i.s,n=i.l,r=i.a,s=r===void 0?1:r;if(!ie(t)||!ie(e)||!ie(n))return null;var o=fs({h:Number(t),s:Number(e),l:Number(n),a:Number(s)});return ps(o)},"hsl"],[function(i){var t=i.h,e=i.s,n=i.v,r=i.a,s=r===void 0?1:r;if(!ie(t)||!ie(e)||!ie(n))return null;var o=function(a){return{h:$o(a.h),s:Nt(a.s,0,100),v:Nt(a.v,0,100),a:Nt(a.a)}}({h:Number(t),s:Number(e),v:Number(n),a:Number(s)});return Xo(o)},"hsv"]]},ms=function(i,t){for(var e=0;e<t.length;e++){var n=t[e][0](i);if(n)return[n,t[e][1]]}return[null,void 0]},Du=function(i){return typeof i=="string"?ms(i.trim(),lr.string):typeof i=="object"&&i!==null?ms(i,lr.object):[null,void 0]},Cn=function(i,t){var e=di(i);return{h:e.h,s:Nt(e.s+100*t,0,100),l:e.l,a:e.a}},Tn=function(i){return(299*i.r+587*i.g+114*i.b)/1e3/255},gs=function(i,t){var e=di(i);return{h:e.h,s:e.s,l:Nt(e.l+100*t,0,100),a:e.a}},ur=function(){function i(t){this.parsed=Du(t)[0],this.rgba=this.parsed||{r:0,g:0,b:0,a:1}}return i.prototype.isValid=function(){return this.parsed!==null},i.prototype.brightness=function(){return Tt(Tn(this.rgba),2)},i.prototype.isDark=function(){return Tn(this.rgba)<.5},i.prototype.isLight=function(){return Tn(this.rgba)>=.5},i.prototype.toHex=function(){return t=wn(this.rgba),e=t.r,n=t.g,r=t.b,o=(s=t.a)<1?Fi(Tt(255*s)):"","#"+Fi(e)+Fi(n)+Fi(r)+o;var t,e,n,r,s,o},i.prototype.toRgb=function(){return wn(this.rgba)},i.prototype.toRgbString=function(){return t=wn(this.rgba),e=t.r,n=t.g,r=t.b,(s=t.a)<1?"rgba("+e+", "+n+", "+r+", "+s+")":"rgb("+e+", "+n+", "+r+")";var t,e,n,r,s},i.prototype.toHsl=function(){return ds(di(this.rgba))},i.prototype.toHslString=function(){return t=ds(di(this.rgba)),e=t.h,n=t.s,r=t.l,(s=t.a)<1?"hsla("+e+", "+n+"%, "+r+"%, "+s+")":"hsl("+e+", "+n+"%, "+r+"%)";var t,e,n,r,s},i.prototype.toHsv=function(){return t=Ho(this.rgba),{h:Tt(t.h),s:Tt(t.s),v:Tt(t.v),a:Tt(t.a,3)};var t},i.prototype.invert=function(){return Zt({r:255-(t=this.rgba).r,g:255-t.g,b:255-t.b,a:t.a});var t},i.prototype.saturate=function(t){return t===void 0&&(t=.1),Zt(Cn(this.rgba,t))},i.prototype.desaturate=function(t){return t===void 0&&(t=.1),Zt(Cn(this.rgba,-t))},i.prototype.grayscale=function(){return Zt(Cn(this.rgba,-1))},i.prototype.lighten=function(t){return t===void 0&&(t=.1),Zt(gs(this.rgba,t))},i.prototype.darken=function(t){return t===void 0&&(t=.1),Zt(gs(this.rgba,-t))},i.prototype.rotate=function(t){return t===void 0&&(t=15),this.hue(this.hue()+t)},i.prototype.alpha=function(t){return typeof t=="number"?Zt({r:(e=this.rgba).r,g:e.g,b:e.b,a:t}):Tt(this.rgba.a,3);var e},i.prototype.hue=function(t){var e=di(this.rgba);return typeof t=="number"?Zt({h:t,s:e.s,l:e.l,a:e.a}):Tt(e.h)},i.prototype.isEqual=function(t){return this.toHex()===Zt(t).toHex()},i}(),Zt=function(i){return i instanceof ur?i:new ur(i)},xs=[],Nu=function(i){i.forEach(function(t){xs.indexOf(t)<0&&(t(ur,lr),xs.push(t))})};function Gu(i,t){var e={white:"#ffffff",bisque:"#ffe4c4",blue:"#0000ff",cadetblue:"#5f9ea0",chartreuse:"#7fff00",chocolate:"#d2691e",coral:"#ff7f50",antiquewhite:"#faebd7",aqua:"#00ffff",azure:"#f0ffff",whitesmoke:"#f5f5f5",papayawhip:"#ffefd5",plum:"#dda0dd",blanchedalmond:"#ffebcd",black:"#000000",gold:"#ffd700",goldenrod:"#daa520",gainsboro:"#dcdcdc",cornsilk:"#fff8dc",cornflowerblue:"#6495ed",burlywood:"#deb887",aquamarine:"#7fffd4",beige:"#f5f5dc",crimson:"#dc143c",cyan:"#00ffff",darkblue:"#00008b",darkcyan:"#008b8b",darkgoldenrod:"#b8860b",darkkhaki:"#bdb76b",darkgray:"#a9a9a9",darkgreen:"#006400",darkgrey:"#a9a9a9",peachpuff:"#ffdab9",darkmagenta:"#8b008b",darkred:"#8b0000",darkorchid:"#9932cc",darkorange:"#ff8c00",darkslateblue:"#483d8b",gray:"#808080",darkslategray:"#2f4f4f",darkslategrey:"#2f4f4f",deeppink:"#ff1493",deepskyblue:"#00bfff",wheat:"#f5deb3",firebrick:"#b22222",floralwhite:"#fffaf0",ghostwhite:"#f8f8ff",darkviolet:"#9400d3",magenta:"#ff00ff",green:"#008000",dodgerblue:"#1e90ff",grey:"#808080",honeydew:"#f0fff0",hotpink:"#ff69b4",blueviolet:"#8a2be2",forestgreen:"#228b22",lawngreen:"#7cfc00",indianred:"#cd5c5c",indigo:"#4b0082",fuchsia:"#ff00ff",brown:"#a52a2a",maroon:"#800000",mediumblue:"#0000cd",lightcoral:"#f08080",darkturquoise:"#00ced1",lightcyan:"#e0ffff",ivory:"#fffff0",lightyellow:"#ffffe0",lightsalmon:"#ffa07a",lightseagreen:"#20b2aa",linen:"#faf0e6",mediumaquamarine:"#66cdaa",lemonchiffon:"#fffacd",lime:"#00ff00",khaki:"#f0e68c",mediumseagreen:"#3cb371",limegreen:"#32cd32",mediumspringgreen:"#00fa9a",lightskyblue:"#87cefa",lightblue:"#add8e6",midnightblue:"#191970",lightpink:"#ffb6c1",mistyrose:"#ffe4e1",moccasin:"#ffe4b5",mintcream:"#f5fffa",lightslategray:"#778899",lightslategrey:"#778899",navajowhite:"#ffdead",navy:"#000080",mediumvioletred:"#c71585",powderblue:"#b0e0e6",palegoldenrod:"#eee8aa",oldlace:"#fdf5e6",paleturquoise:"#afeeee",mediumturquoise:"#48d1cc",mediumorchid:"#ba55d3",rebeccapurple:"#663399",lightsteelblue:"#b0c4de",mediumslateblue:"#7b68ee",thistle:"#d8bfd8",tan:"#d2b48c",orchid:"#da70d6",mediumpurple:"#9370db",purple:"#800080",pink:"#ffc0cb",skyblue:"#87ceeb",springgreen:"#00ff7f",palegreen:"#98fb98",red:"#ff0000",yellow:"#ffff00",slateblue:"#6a5acd",lavenderblush:"#fff0f5",peru:"#cd853f",palevioletred:"#db7093",violet:"#ee82ee",teal:"#008080",slategray:"#708090",slategrey:"#708090",aliceblue:"#f0f8ff",darkseagreen:"#8fbc8f",darkolivegreen:"#556b2f",greenyellow:"#adff2f",seagreen:"#2e8b57",seashell:"#fff5ee",tomato:"#ff6347",silver:"#c0c0c0",sienna:"#a0522d",lavender:"#e6e6fa",lightgreen:"#90ee90",orange:"#ffa500",orangered:"#ff4500",steelblue:"#4682b4",royalblue:"#4169e1",turquoise:"#40e0d0",yellowgreen:"#9acd32",salmon:"#fa8072",saddlebrown:"#8b4513",sandybrown:"#f4a460",rosybrown:"#bc8f8f",darksalmon:"#e9967a",lightgoldenrodyellow:"#fafad2",snow:"#fffafa",lightgrey:"#d3d3d3",lightgray:"#d3d3d3",dimgray:"#696969",dimgrey:"#696969",olivedrab:"#6b8e23",olive:"#808000"},n={};for(var r in e)n[e[r]]=r;var s={};i.prototype.toName=function(o){if(!(this.rgba.a||this.rgba.r||this.rgba.g||this.rgba.b))return"transparent";var a,l,u=n[this.toHex()];if(u)return u;if(o?.closest){var h=this.toRgb(),c=1/0,d="black";if(!s.length)for(var f in e)s[f]=new i(e[f]).toRgb();for(var x in e){var v=(a=h,l=s[x],Math.pow(a.r-l.r,2)+Math.pow(a.g-l.g,2)+Math.pow(a.b-l.b,2));v<c&&(c=v,d=x)}return d}},t.string.push([function(o){var a=o.toLowerCase(),l=a==="transparent"?"#0000":e[a];return l?new i(l).toRgb():null},"name"])}Nu([Gu]);const We=class ui{constructor(t=16777215){this._value=null,this._components=new Float32Array(4),this._components.fill(1),this._int=16777215,this.value=t}get red(){return this._components[0]}get green(){return this._components[1]}get blue(){return this._components[2]}get alpha(){return this._components[3]}setValue(t){return this.value=t,this}set value(t){if(t instanceof ui)this._value=this._cloneSource(t._value),this._int=t._int,this._components.set(t._components);else{if(t===null)throw new Error("Cannot set Color#value to null");(this._value===null||!this._isSourceEqual(this._value,t))&&(this._value=this._cloneSource(t),this._normalize(this._value))}}get value(){return this._value}_cloneSource(t){return typeof t=="string"||typeof t=="number"||t instanceof Number||t===null?t:Array.isArray(t)||ArrayBuffer.isView(t)?t.slice(0):typeof t=="object"&&t!==null?{...t}:t}_isSourceEqual(t,e){const n=typeof t;if(n!==typeof e)return!1;if(n==="number"||n==="string"||t instanceof Number)return t===e;if(Array.isArray(t)&&Array.isArray(e)||ArrayBuffer.isView(t)&&ArrayBuffer.isView(e))return t.length!==e.length?!1:t.every((s,o)=>s===e[o]);if(t!==null&&e!==null){const s=Object.keys(t),o=Object.keys(e);return s.length!==o.length?!1:s.every(a=>t[a]===e[a])}return t===e}toRgba(){const[t,e,n,r]=this._components;return{r:t,g:e,b:n,a:r}}toRgb(){const[t,e,n]=this._components;return{r:t,g:e,b:n}}toRgbaString(){const[t,e,n]=this.toUint8RgbArray();return`rgba(${t},${e},${n},${this.alpha})`}toUint8RgbArray(t){const[e,n,r]=this._components;return this._arrayRgb||(this._arrayRgb=[]),t||(t=this._arrayRgb),t[0]=Math.round(e*255),t[1]=Math.round(n*255),t[2]=Math.round(r*255),t}toArray(t){this._arrayRgba||(this._arrayRgba=[]),t||(t=this._arrayRgba);const[e,n,r,s]=this._components;return t[0]=e,t[1]=n,t[2]=r,t[3]=s,t}toRgbArray(t){this._arrayRgb||(this._arrayRgb=[]),t||(t=this._arrayRgb);const[e,n,r]=this._components;return t[0]=e,t[1]=n,t[2]=r,t}toNumber(){return this._int}toBgrNumber(){const[t,e,n]=this.toUint8RgbArray();return(n<<16)+(e<<8)+t}toLittleEndianNumber(){const t=this._int;return(t>>16)+(t&65280)+((t&255)<<16)}multiply(t){const[e,n,r,s]=ui._temp.setValue(t)._components;return this._components[0]*=e,this._components[1]*=n,this._components[2]*=r,this._components[3]*=s,this._refreshInt(),this._value=null,this}premultiply(t,e=!0){return e&&(this._components[0]*=t,this._components[1]*=t,this._components[2]*=t),this._components[3]=t,this._refreshInt(),this._value=null,this}toPremultiplied(t,e=!0){if(t===1)return(255<<24)+this._int;if(t===0)return e?0:this._int;let n=this._int>>16&255,r=this._int>>8&255,s=this._int&255;return e&&(n=n*t+.5|0,r=r*t+.5|0,s=s*t+.5|0),(t*255<<24)+(n<<16)+(r<<8)+s}toHex(){const t=this._int.toString(16);return`#${"000000".substring(0,6-t.length)+t}`}toHexa(){const e=Math.round(this._components[3]*255).toString(16);return this.toHex()+"00".substring(0,2-e.length)+e}setAlpha(t){return this._components[3]=this._clamp(t),this}_normalize(t){let e,n,r,s;if((typeof t=="number"||t instanceof Number)&&t>=0&&t<=16777215){const o=t;e=(o>>16&255)/255,n=(o>>8&255)/255,r=(o&255)/255,s=1}else if((Array.isArray(t)||t instanceof Float32Array)&&t.length>=3&&t.length<=4)t=this._clamp(t),[e,n,r,s=1]=t;else if((t instanceof Uint8Array||t instanceof Uint8ClampedArray)&&t.length>=3&&t.length<=4)t=this._clamp(t,0,255),[e,n,r,s=255]=t,e/=255,n/=255,r/=255,s/=255;else if(typeof t=="string"||typeof t=="object"){if(typeof t=="string"){const a=ui.HEX_PATTERN.exec(t);a&&(t=`#${a[2]}`)}const o=Zt(t);o.isValid()&&({r:e,g:n,b:r,a:s}=o.rgba,e/=255,n/=255,r/=255)}if(e!==void 0)this._components[0]=e,this._components[1]=n,this._components[2]=r,this._components[3]=s,this._refreshInt();else throw new Error(`Unable to convert color ${t}`)}_refreshInt(){this._clamp(this._components);const[t,e,n]=this._components;this._int=(t*255<<16)+(e*255<<8)+(n*255|0)}_clamp(t,e=0,n=1){return typeof t=="number"?Math.min(Math.max(t,e),n):(t.forEach((r,s)=>{t[s]=Math.min(Math.max(r,e),n)}),t)}static isColorLike(t){return typeof t=="number"||typeof t=="string"||t instanceof Number||t instanceof ui||Array.isArray(t)||t instanceof Uint8Array||t instanceof Uint8ClampedArray||t instanceof Float32Array||t.r!==void 0&&t.g!==void 0&&t.b!==void 0||t.r!==void 0&&t.g!==void 0&&t.b!==void 0&&t.a!==void 0||t.h!==void 0&&t.s!==void 0&&t.l!==void 0||t.h!==void 0&&t.s!==void 0&&t.l!==void 0&&t.a!==void 0||t.h!==void 0&&t.s!==void 0&&t.v!==void 0||t.h!==void 0&&t.s!==void 0&&t.v!==void 0&&t.a!==void 0}};We.shared=new We;We._temp=new We;We.HEX_PATTERN=/^(#|0x)?(([a-f0-9]{3}){1,2}([a-f0-9]{2})?)$/i;let K=We;const Vu={cullArea:null,cullable:!1,cullableChildren:!0};class Nr{constructor(t,e){this._pool=[],this._count=0,this._index=0,this._classType=t,e&&this.prepopulate(e)}prepopulate(t){for(let e=0;e<t;e++)this._pool[this._index++]=new this._classType;this._count+=t}get(t){let e;return this._index>0?e=this._pool[--this._index]:e=new this._classType,e.init?.(t),e}return(t){t.reset?.(),this._pool[this._index++]=t}get totalSize(){return this._count}get totalFree(){return this._index}get totalUsed(){return this._count-this._index}clear(){this._pool.length=0,this._index=0}}class Wu{constructor(){this._poolsByClass=new Map}prepopulate(t,e){this.getPool(t).prepopulate(e)}get(t,e){return this.getPool(t).get(e)}return(t){this.getPool(t.constructor).return(t)}getPool(t){return this._poolsByClass.has(t)||this._poolsByClass.set(t,new Nr(t)),this._poolsByClass.get(t)}stats(){const t={};return this._poolsByClass.forEach(e=>{const n=t[e._classType.name]?e._classType.name+e._classType.ID:e._classType.name;t[n]={free:e.totalFree,used:e.totalUsed,size:e.totalSize}}),t}}const oe=new Wu,$u={get isCachedAsTexture(){return!!this.renderGroup?.isCachedAsTexture},cacheAsTexture(i){typeof i=="boolean"&&i===!1?this.disableRenderGroup():(this.enableRenderGroup(),this.renderGroup.enableCacheAsTexture(i===!0?{}:i))},updateCacheTexture(){this.renderGroup?.updateCacheTexture()},get cacheAsBitmap(){return this.isCachedAsTexture},set cacheAsBitmap(i){B("v8.6.0","cacheAsBitmap is deprecated, use cacheAsTexture instead."),this.cacheAsTexture(i)}};function Hu(i,t,e){const n=i.length;let r;if(t>=n||e===0)return;e=t+e>n?n-t:e;const s=n-e;for(r=t;r<s;++r)i[r]=i[r+e];i.length=s}const Xu={allowChildren:!0,removeChildren(i=0,t){const e=t??this.children.length,n=e-i,r=[];if(n>0&&n<=e){for(let o=e-1;o>=i;o--){const a=this.children[o];a&&(r.push(a),a.parent=null)}Hu(this.children,i,e);const s=this.renderGroup||this.parentRenderGroup;s&&s.removeChildren(r);for(let o=0;o<r.length;++o)this.emit("childRemoved",r[o],this,o),r[o].emit("removed",this);return r}else if(n===0&&this.children.length===0)return r;throw new RangeError("removeChildren: numeric values are outside the acceptable range.")},removeChildAt(i){const t=this.getChildAt(i);return this.removeChild(t)},getChildAt(i){if(i<0||i>=this.children.length)throw new Error(`getChildAt: Index (${i}) does not exist.`);return this.children[i]},setChildIndex(i,t){if(t<0||t>=this.children.length)throw new Error(`The index ${t} supplied is out of bounds ${this.children.length}`);this.getChildIndex(i),this.addChildAt(i,t)},getChildIndex(i){const t=this.children.indexOf(i);if(t===-1)throw new Error("The supplied Container must be a child of the caller");return t},addChildAt(i,t){this.allowChildren||B(pt,"addChildAt: Only Containers will be allowed to add children in v8.0.0");const{children:e}=this;if(t<0||t>e.length)throw new Error(`${i}addChildAt: The index ${t} supplied is out of bounds ${e.length}`);if(i.parent){const r=i.parent.children.indexOf(i);if(i.parent===this&&r===t)return i;r!==-1&&i.parent.children.splice(r,1)}t===e.length?e.push(i):e.splice(t,0,i),i.parent=this,i.didChange=!0,i._updateFlags=15;const n=this.renderGroup||this.parentRenderGroup;return n&&n.addChild(i),this.sortableChildren&&(this.sortDirty=!0),this.emit("childAdded",i,this,t),i.emit("added",this),i},swapChildren(i,t){if(i===t)return;const e=this.getChildIndex(i),n=this.getChildIndex(t);this.children[e]=t,this.children[n]=i;const r=this.renderGroup||this.parentRenderGroup;r&&(r.structureDidChange=!0),this._didContainerChangeTick++},removeFromParent(){this.parent?.removeChild(this)},reparentChild(...i){return i.length===1?this.reparentChildAt(i[0],this.children.length):(i.forEach(t=>this.reparentChildAt(t,this.children.length)),i[0])},reparentChildAt(i,t){if(i.parent===this)return this.setChildIndex(i,t),i;const e=i.worldTransform.clone();i.removeFromParent(),this.addChildAt(i,t);const n=this.worldTransform.clone();return n.invert(),e.prepend(n),i.setFromMatrix(e),i}};class _s{constructor(){this.pipe="filter",this.priority=1}destroy(){for(let t=0;t<this.filters.length;t++)this.filters[t].destroy();this.filters=null,this.filterArea=null}}class Yu{constructor(){this._effectClasses=[],this._tests=[],this._initialized=!1}init(){this._initialized||(this._initialized=!0,this._effectClasses.forEach(t=>{this.add({test:t.test,maskClass:t})}))}add(t){this._tests.push(t)}getMaskEffect(t){this._initialized||this.init();for(let e=0;e<this._tests.length;e++){const n=this._tests[e];if(n.test(t))return oe.get(n.maskClass,t)}return t}returnMaskEffect(t){oe.return(t)}}const hr=new Yu;It.handleByList(U.MaskEffect,hr._effectClasses);const ju={_maskEffect:null,_maskOptions:{inverse:!1},_filterEffect:null,effects:[],_markStructureAsChanged(){const i=this.renderGroup||this.parentRenderGroup;i&&(i.structureDidChange=!0)},addEffect(i){this.effects.indexOf(i)===-1&&(this.effects.push(i),this.effects.sort((e,n)=>e.priority-n.priority),this._markStructureAsChanged(),this._updateIsSimple())},removeEffect(i){const t=this.effects.indexOf(i);t!==-1&&(this.effects.splice(t,1),this._markStructureAsChanged(),this._updateIsSimple())},set mask(i){const t=this._maskEffect;t?.mask!==i&&(t&&(this.removeEffect(t),hr.returnMaskEffect(t),this._maskEffect=null),i!=null&&(this._maskEffect=hr.getMaskEffect(i),this.addEffect(this._maskEffect)))},setMask(i){this._maskOptions={...this._maskOptions,...i},i.mask&&(this.mask=i.mask),this._markStructureAsChanged()},get mask(){return this._maskEffect?.mask},set filters(i){!Array.isArray(i)&&i&&(i=[i]);const t=this._filterEffect||(this._filterEffect=new _s);i=i;const e=i?.length>0,n=t.filters?.length>0,r=e!==n;i=Array.isArray(i)?i.slice(0):i,t.filters=Object.freeze(i),r&&(e?this.addEffect(t):(this.removeEffect(t),t.filters=i??null))},get filters(){return this._filterEffect?.filters},set filterArea(i){this._filterEffect||(this._filterEffect=new _s),this._filterEffect.filterArea=i},get filterArea(){return this._filterEffect?.filterArea}},qu={label:null,get name(){return B(pt,"Container.name property has been removed, use Container.label instead"),this.label},set name(i){B(pt,"Container.name property has been removed, use Container.label instead"),this.label=i},getChildByName(i,t=!1){return this.getChildByLabel(i,t)},getChildByLabel(i,t=!1){const e=this.children;for(let n=0;n<e.length;n++){const r=e[n];if(r.label===i||i instanceof RegExp&&i.test(r.label))return r}if(t)for(let n=0;n<e.length;n++){const s=e[n].getChildByLabel(i,!0);if(s)return s}return null},getChildrenByLabel(i,t=!1,e=[]){const n=this.children;for(let r=0;r<n.length;r++){const s=n[r];(s.label===i||i instanceof RegExp&&i.test(s.label))&&e.push(s)}if(t)for(let r=0;r<n.length;r++)n[r].getChildrenByLabel(i,!0,e);return e}},Rt=new Nr(Q),$e=new Nr(te);function Yo(i,t,e){e.clear();let n,r;return i.parent?t?n=i.parent.worldTransform:(r=Rt.get().identity(),n=Gr(i,r)):n=Q.IDENTITY,jo(i,e,n,t),r&&Rt.return(r),e.isValid||e.set(0,0,0,0),e}function jo(i,t,e,n){if(!i.visible||!i.measurable)return;let r;n?r=i.worldTransform:(i.updateLocalTransform(),r=Rt.get(),r.appendFrom(i.localTransform,e));const s=t,o=!!i.effects.length;if(o&&(t=$e.get().clear()),i.boundsArea)t.addRect(i.boundsArea,r);else{i.bounds&&(t.matrix=r,t.addBounds(i.bounds));for(let a=0;a<i.children.length;a++)jo(i.children[a],t,r,n)}if(o){for(let a=0;a<i.effects.length;a++)i.effects[a].addBounds?.(t);s.addBounds(t,Q.IDENTITY),$e.return(t)}n||Rt.return(r)}function Gr(i,t){const e=i.parent;return e&&(Gr(e,t),e.updateLocalTransform(),t.append(e.localTransform)),t}function qo(i,t){if(i===16777215||!t)return t;if(t===16777215||!i)return i;const e=i>>16&255,n=i>>8&255,r=i&255,s=t>>16&255,o=t>>8&255,a=t&255,l=e*s/255|0,u=n*o/255|0,h=r*a/255|0;return(l<<16)+(u<<8)+h}const vs=16777215;function ys(i,t){return i===vs?t:t===vs?i:qo(i,t)}function Ni(i){return((i&255)<<16)+(i&65280)+(i>>16&255)}const Ku={getGlobalAlpha(i){if(i)return this.renderGroup?this.renderGroup.worldAlpha:this.parentRenderGroup?this.parentRenderGroup.worldAlpha*this.alpha:this.alpha;let t=this.alpha,e=this.parent;for(;e;)t*=e.alpha,e=e.parent;return t},getGlobalTransform(i,t){if(t)return i.copyFrom(this.worldTransform);this.updateLocalTransform();const e=Gr(this,Rt.get().identity());return i.appendFrom(this.localTransform,e),Rt.return(e),i},getGlobalTint(i){if(i)return this.renderGroup?Ni(this.renderGroup.worldColor):this.parentRenderGroup?Ni(ys(this.localColor,this.parentRenderGroup.worldColor)):this.tint;let t=this.localColor,e=this.parent;for(;e;)t=ys(t,e.localColor),e=e.parent;return Ni(t)}};let An=0;const bs=500;function vt(...i){An!==bs&&(An++,An===bs?console.warn("PixiJS Warning: too many warnings, no more warnings will be reported to the console by PixiJS."):console.warn("PixiJS Warning: ",...i))}function Ko(i,t,e){return t.clear(),e||(e=Q.IDENTITY),Zo(i,t,e,i,!0),t.isValid||t.set(0,0,0,0),t}function Zo(i,t,e,n,r){let s;if(r)s=Rt.get(),s=e.copyTo(s);else{if(!i.visible||!i.measurable)return;i.updateLocalTransform();const l=i.localTransform;s=Rt.get(),s.appendFrom(l,e)}const o=t,a=!!i.effects.length;if(a&&(t=$e.get().clear()),i.boundsArea)t.addRect(i.boundsArea,s);else{i.renderPipeId&&(t.matrix=s,t.addBounds(i.bounds));const l=i.children;for(let u=0;u<l.length;u++)Zo(l[u],t,s,n,!1)}if(a){for(let l=0;l<i.effects.length;l++)i.effects[l].addLocalBounds?.(t,n);o.addBounds(t,Q.IDENTITY),$e.return(t)}Rt.return(s)}function Qo(i,t){const e=i.children;for(let n=0;n<e.length;n++){const r=e[n],s=r.uid,o=(r._didViewChangeTick&65535)<<16|r._didContainerChangeTick&65535,a=t.index;(t.data[a]!==s||t.data[a+1]!==o)&&(t.data[t.index]=s,t.data[t.index+1]=o,t.didChange=!0),t.index=a+2,r.children.length&&Qo(r,t)}return t.didChange}const Zu=new Q,Qu={_localBoundsCacheId:-1,_localBoundsCacheData:null,_setWidth(i,t){const e=Math.sign(this.scale.x)||1;t!==0?this.scale.x=i/t*e:this.scale.x=e},_setHeight(i,t){const e=Math.sign(this.scale.y)||1;t!==0?this.scale.y=i/t*e:this.scale.y=e},getLocalBounds(){this._localBoundsCacheData||(this._localBoundsCacheData={data:[],index:1,didChange:!1,localBounds:new te});const i=this._localBoundsCacheData;return i.index=1,i.didChange=!1,i.data[0]!==this._didViewChangeTick&&(i.didChange=!0,i.data[0]=this._didViewChangeTick),Qo(this,i),i.didChange&&Ko(this,i.localBounds,Zu),i.localBounds},getBounds(i,t){return Yo(this,i,t||new te)}},Ju={_onRender:null,set onRender(i){const t=this.renderGroup||this.parentRenderGroup;if(!i){this._onRender&&t?.removeOnRender(this),this._onRender=null;return}this._onRender||t?.addOnRender(this),this._onRender=i},get onRender(){return this._onRender}},th={_zIndex:0,sortDirty:!1,sortableChildren:!1,get zIndex(){return this._zIndex},set zIndex(i){this._zIndex!==i&&(this._zIndex=i,this.depthOfChildModified())},depthOfChildModified(){this.parent&&(this.parent.sortableChildren=!0,this.parent.sortDirty=!0),this.parentRenderGroup&&(this.parentRenderGroup.structureDidChange=!0)},sortChildren(){this.sortDirty&&(this.sortDirty=!1,this.children.sort(eh))}};function eh(i,t){return i._zIndex-t._zIndex}const ih={getGlobalPosition(i=new Ft,t=!1){return this.parent?this.parent.toGlobal(this._position,i,t):(i.x=this._position.x,i.y=this._position.y),i},toGlobal(i,t,e=!1){const n=this.getGlobalTransform(Rt.get(),e);return t=n.apply(i,t),Rt.return(n),t},toLocal(i,t,e,n){t&&(i=t.toGlobal(i,e,n));const r=this.getGlobalTransform(Rt.get(),n);return e=r.applyInverse(i,e),Rt.return(r),e}};class Jo{constructor(){this.uid=St("instructionSet"),this.instructions=[],this.instructionSize=0,this.renderables=[],this.gcTick=0}reset(){this.instructionSize=0}add(t){this.instructions[this.instructionSize++]=t}log(){this.instructions.length=this.instructionSize,console.table(this.instructions,["type","action"])}}let nh=0;class rh{constructor(t){this._poolKeyHash=Object.create(null),this._texturePool={},this.textureOptions=t||{},this.enableFullScreen=!1}createTexture(t,e,n){const r=new zt({...this.textureOptions,width:t,height:e,resolution:1,antialias:n,autoGarbageCollect:!0});return new k({source:r,label:`texturePool_${nh++}`})}getOptimalTexture(t,e,n=1,r){let s=Math.ceil(t*n-1e-6),o=Math.ceil(e*n-1e-6);s=nn(s),o=nn(o);const a=(s<<17)+(o<<1)+(r?1:0);this._texturePool[a]||(this._texturePool[a]=[]);let l=this._texturePool[a].pop();return l||(l=this.createTexture(s,o,r)),l.source._resolution=n,l.source.width=s/n,l.source.height=o/n,l.source.pixelWidth=s,l.source.pixelHeight=o,l.frame.x=0,l.frame.y=0,l.frame.width=t,l.frame.height=e,l.updateUvs(),this._poolKeyHash[l.uid]=a,l}getSameSizeTexture(t,e=!1){const n=t.source;return this.getOptimalTexture(t.width,t.height,n._resolution,e)}returnTexture(t){const e=this._poolKeyHash[t.uid];this._texturePool[e].push(t)}clear(t){if(t=t!==!1,t)for(const e in this._texturePool){const n=this._texturePool[e];if(n)for(let r=0;r<n.length;r++)n[r].destroy(!0)}this._texturePool={}}}const Dt=new rh;class sh{constructor(){this.renderPipeId="renderGroup",this.root=null,this.canBundle=!1,this.renderGroupParent=null,this.renderGroupChildren=[],this.worldTransform=new Q,this.worldColorAlpha=4294967295,this.worldColor=16777215,this.worldAlpha=1,this.childrenToUpdate=Object.create(null),this.updateTick=0,this.gcTick=0,this.childrenRenderablesToUpdate={list:[],index:0},this.structureDidChange=!0,this.instructionSet=new Jo,this._onRenderContainers=[],this.textureNeedsUpdate=!0,this.isCachedAsTexture=!1,this._matrixDirty=7}init(t){this.root=t,t._onRender&&this.addOnRender(t),t.didChange=!0;const e=t.children;for(let n=0;n<e.length;n++){const r=e[n];r._updateFlags=15,this.addChild(r)}}enableCacheAsTexture(t={}){this.textureOptions=t,this.isCachedAsTexture=!0,this.textureNeedsUpdate=!0}disableCacheAsTexture(){this.isCachedAsTexture=!1,this.texture&&(Dt.returnTexture(this.texture),this.texture=null)}updateCacheTexture(){this.textureNeedsUpdate=!0}reset(){this.renderGroupChildren.length=0;for(const t in this.childrenToUpdate){const e=this.childrenToUpdate[t];e.list.fill(null),e.index=0}this.childrenRenderablesToUpdate.index=0,this.childrenRenderablesToUpdate.list.fill(null),this.root=null,this.updateTick=0,this.structureDidChange=!0,this._onRenderContainers.length=0,this.renderGroupParent=null,this.disableCacheAsTexture()}get localTransform(){return this.root.localTransform}addRenderGroupChild(t){t.renderGroupParent&&t.renderGroupParent._removeRenderGroupChild(t),t.renderGroupParent=this,this.renderGroupChildren.push(t)}_removeRenderGroupChild(t){const e=this.renderGroupChildren.indexOf(t);e>-1&&this.renderGroupChildren.splice(e,1),t.renderGroupParent=null}addChild(t){if(this.structureDidChange=!0,t.parentRenderGroup=this,t.updateTick=-1,t.parent===this.root?t.relativeRenderGroupDepth=1:t.relativeRenderGroupDepth=t.parent.relativeRenderGroupDepth+1,t.didChange=!0,this.onChildUpdate(t),t.renderGroup){this.addRenderGroupChild(t.renderGroup);return}t._onRender&&this.addOnRender(t);const e=t.children;for(let n=0;n<e.length;n++)this.addChild(e[n])}removeChild(t){if(this.structureDidChange=!0,t._onRender&&(t.renderGroup||this.removeOnRender(t)),t.parentRenderGroup=null,t.renderGroup){this._removeRenderGroupChild(t.renderGroup);return}const e=t.children;for(let n=0;n<e.length;n++)this.removeChild(e[n])}removeChildren(t){for(let e=0;e<t.length;e++)this.removeChild(t[e])}onChildUpdate(t){let e=this.childrenToUpdate[t.relativeRenderGroupDepth];e||(e=this.childrenToUpdate[t.relativeRenderGroupDepth]={index:0,list:[]}),e.list[e.index++]=t}updateRenderable(t){t.globalDisplayStatus<7||(this.instructionSet.renderPipes[t.renderPipeId].updateRenderable(t),t.didViewUpdate=!1)}onChildViewUpdate(t){this.childrenRenderablesToUpdate.list[this.childrenRenderablesToUpdate.index++]=t}get isRenderable(){return this.root.localDisplayStatus===7&&this.worldAlpha>0}addOnRender(t){this._onRenderContainers.push(t)}removeOnRender(t){this._onRenderContainers.splice(this._onRenderContainers.indexOf(t),1)}runOnRender(){for(let t=0;t<this._onRenderContainers.length;t++)this._onRenderContainers[t]._onRender()}destroy(){this.disableCacheAsTexture(),this.renderGroupParent=null,this.root=null,this.childrenRenderablesToUpdate=null,this.childrenToUpdate=null,this.renderGroupChildren=null,this._onRenderContainers=null,this.instructionSet=null}getChildren(t=[]){const e=this.root.children;for(let n=0;n<e.length;n++)this._getChildren(e[n],t);return t}_getChildren(t,e=[]){if(e.push(t),t.renderGroup)return e;const n=t.children;for(let r=0;r<n.length;r++)this._getChildren(n[r],e);return e}invalidateMatrices(){this._matrixDirty=7}get inverseWorldTransform(){return this._matrixDirty&1?(this._matrixDirty&=-2,this._inverseWorldTransform||(this._inverseWorldTransform=new Q),this._inverseWorldTransform.copyFrom(this.worldTransform).invert()):this._inverseWorldTransform}get textureOffsetInverseTransform(){return this._matrixDirty&2?(this._matrixDirty&=-3,this._textureOffsetInverseTransform||(this._textureOffsetInverseTransform=new Q),this._textureOffsetInverseTransform.copyFrom(this.inverseWorldTransform).translate(-this._textureBounds.x,-this._textureBounds.y)):this._textureOffsetInverseTransform}get inverseParentTextureTransform(){if(!(this._matrixDirty&4))return this._inverseParentTextureTransform;this._matrixDirty&=-5;const t=this._parentCacheAsTextureRenderGroup;return t?(this._inverseParentTextureTransform||(this._inverseParentTextureTransform=new Q),this._inverseParentTextureTransform.copyFrom(this.worldTransform).prepend(t.inverseWorldTransform).translate(-t._textureBounds.x,-t._textureBounds.y)):this.worldTransform}get cacheToLocalTransform(){return this._parentCacheAsTextureRenderGroup?this._parentCacheAsTextureRenderGroup.textureOffsetInverseTransform:null}}function oh(i,t,e={}){for(const n in t)!e[n]&&t[n]!==void 0&&(i[n]=t[n])}const Pn=new Mt(null),Mn=new Mt(null),Fn=new Mt(null,1,1),Ss=1,ah=2,In=4;class X extends Ot{constructor(t={}){super(),this.uid=St("renderable"),this._updateFlags=15,this.renderGroup=null,this.parentRenderGroup=null,this.parentRenderGroupIndex=0,this.didChange=!1,this.didViewUpdate=!1,this.relativeRenderGroupDepth=0,this.children=[],this.parent=null,this.includeInBuild=!0,this.measurable=!0,this.isSimple=!0,this.updateTick=-1,this.localTransform=new Q,this.relativeGroupTransform=new Q,this.groupTransform=this.relativeGroupTransform,this.destroyed=!1,this._position=new Mt(this,0,0),this._scale=Fn,this._pivot=Mn,this._skew=Pn,this._cx=1,this._sx=0,this._cy=0,this._sy=1,this._rotation=0,this.localColor=16777215,this.localAlpha=1,this.groupAlpha=1,this.groupColor=16777215,this.groupColorAlpha=4294967295,this.localBlendMode="inherit",this.groupBlendMode="normal",this.localDisplayStatus=7,this.globalDisplayStatus=7,this._didContainerChangeTick=0,this._didViewChangeTick=0,this._didLocalTransformChangeId=-1,this.effects=[],oh(this,t,{children:!0,parent:!0,effects:!0}),t.children?.forEach(e=>this.addChild(e)),t.parent?.addChild(this)}static mixin(t){Object.defineProperties(X.prototype,Object.getOwnPropertyDescriptors(t))}set _didChangeId(t){this._didViewChangeTick=t>>12&4095,this._didContainerChangeTick=t&4095}get _didChangeId(){return this._didContainerChangeTick&4095|(this._didViewChangeTick&4095)<<12}addChild(...t){if(this.allowChildren||B(pt,"addChild: Only Containers will be allowed to add children in v8.0.0"),t.length>1){for(let r=0;r<t.length;r++)this.addChild(t[r]);return t[0]}const e=t[0],n=this.renderGroup||this.parentRenderGroup;return e.parent===this?(this.children.splice(this.children.indexOf(e),1),this.children.push(e),n&&(n.structureDidChange=!0),e):(e.parent&&e.parent.removeChild(e),this.children.push(e),this.sortableChildren&&(this.sortDirty=!0),e.parent=this,e.didChange=!0,e._updateFlags=15,n&&n.addChild(e),this.emit("childAdded",e,this,this.children.length-1),e.emit("added",this),this._didViewChangeTick++,e._zIndex!==0&&e.depthOfChildModified(),e)}removeChild(...t){if(t.length>1){for(let r=0;r<t.length;r++)this.removeChild(t[r]);return t[0]}const e=t[0],n=this.children.indexOf(e);return n>-1&&(this._didViewChangeTick++,this.children.splice(n,1),this.renderGroup?this.renderGroup.removeChild(e):this.parentRenderGroup&&this.parentRenderGroup.removeChild(e),e.parent=null,this.emit("childRemoved",e,this,n),e.emit("removed",this)),e}_onUpdate(t){t&&t===this._skew&&this._updateSkew(),this._didContainerChangeTick++,!this.didChange&&(this.didChange=!0,this.parentRenderGroup&&this.parentRenderGroup.onChildUpdate(this))}set isRenderGroup(t){!!this.renderGroup!==t&&(t?this.enableRenderGroup():this.disableRenderGroup())}get isRenderGroup(){return!!this.renderGroup}enableRenderGroup(){if(this.renderGroup)return;const t=this.parentRenderGroup;t?.removeChild(this),this.renderGroup=oe.get(sh,this),this.groupTransform=Q.IDENTITY,t?.addChild(this),this._updateIsSimple()}disableRenderGroup(){if(!this.renderGroup)return;const t=this.parentRenderGroup;t?.removeChild(this),oe.return(this.renderGroup),this.renderGroup=null,this.groupTransform=this.relativeGroupTransform,t?.addChild(this),this._updateIsSimple()}_updateIsSimple(){this.isSimple=!this.renderGroup&&this.effects.length===0}get worldTransform(){return this._worldTransform||(this._worldTransform=new Q),this.renderGroup?this._worldTransform.copyFrom(this.renderGroup.worldTransform):this.parentRenderGroup&&this._worldTransform.appendFrom(this.relativeGroupTransform,this.parentRenderGroup.worldTransform),this._worldTransform}get x(){return this._position.x}set x(t){this._position.x=t}get y(){return this._position.y}set y(t){this._position.y=t}get position(){return this._position}set position(t){this._position.copyFrom(t)}get rotation(){return this._rotation}set rotation(t){this._rotation!==t&&(this._rotation=t,this._onUpdate(this._skew))}get angle(){return this.rotation*wu}set angle(t){this.rotation=t*Ve}get pivot(){return this._pivot===Mn&&(this._pivot=new Mt(this,0,0)),this._pivot}set pivot(t){this._pivot===Mn&&(this._pivot=new Mt(this,0,0)),typeof t=="number"?this._pivot.set(t):this._pivot.copyFrom(t)}get skew(){return this._skew===Pn&&(this._skew=new Mt(this,0,0)),this._skew}set skew(t){this._skew===Pn&&(this._skew=new Mt(this,0,0)),this._skew.copyFrom(t)}get scale(){return this._scale===Fn&&(this._scale=new Mt(this,1,1)),this._scale}set scale(t){this._scale===Fn&&(this._scale=new Mt(this,0,0)),typeof t=="number"?this._scale.set(t):this._scale.copyFrom(t)}get width(){return Math.abs(this.scale.x*this.getLocalBounds().width)}set width(t){const e=this.getLocalBounds().width;this._setWidth(t,e)}get height(){return Math.abs(this.scale.y*this.getLocalBounds().height)}set height(t){const e=this.getLocalBounds().height;this._setHeight(t,e)}getSize(t){t||(t={});const e=this.getLocalBounds();return t.width=Math.abs(this.scale.x*e.width),t.height=Math.abs(this.scale.y*e.height),t}setSize(t,e){const n=this.getLocalBounds();typeof t=="object"?(e=t.height??t.width,t=t.width):e??(e=t),t!==void 0&&this._setWidth(t,n.width),e!==void 0&&this._setHeight(e,n.height)}_updateSkew(){const t=this._rotation,e=this._skew;this._cx=Math.cos(t+e._y),this._sx=Math.sin(t+e._y),this._cy=-Math.sin(t-e._x),this._sy=Math.cos(t-e._x)}updateTransform(t){return this.position.set(typeof t.x=="number"?t.x:this.position.x,typeof t.y=="number"?t.y:this.position.y),this.scale.set(typeof t.scaleX=="number"?t.scaleX||1:this.scale.x,typeof t.scaleY=="number"?t.scaleY||1:this.scale.y),this.rotation=typeof t.rotation=="number"?t.rotation:this.rotation,this.skew.set(typeof t.skewX=="number"?t.skewX:this.skew.x,typeof t.skewY=="number"?t.skewY:this.skew.y),this.pivot.set(typeof t.pivotX=="number"?t.pivotX:this.pivot.x,typeof t.pivotY=="number"?t.pivotY:this.pivot.y),this}setFromMatrix(t){t.decompose(this)}updateLocalTransform(){const t=this._didContainerChangeTick;if(this._didLocalTransformChangeId===t)return;this._didLocalTransformChangeId=t;const e=this.localTransform,n=this._scale,r=this._pivot,s=this._position,o=n._x,a=n._y,l=r._x,u=r._y;e.a=this._cx*o,e.b=this._sx*o,e.c=this._cy*a,e.d=this._sy*a,e.tx=s._x-(l*e.a+u*e.c),e.ty=s._y-(l*e.b+u*e.d)}set alpha(t){t!==this.localAlpha&&(this.localAlpha=t,this._updateFlags|=Ss,this._onUpdate())}get alpha(){return this.localAlpha}set tint(t){const n=K.shared.setValue(t??16777215).toBgrNumber();n!==this.localColor&&(this.localColor=n,this._updateFlags|=Ss,this._onUpdate())}get tint(){return Ni(this.localColor)}set blendMode(t){this.localBlendMode!==t&&(this.parentRenderGroup&&(this.parentRenderGroup.structureDidChange=!0),this._updateFlags|=ah,this.localBlendMode=t,this._onUpdate())}get blendMode(){return this.localBlendMode}get visible(){return!!(this.localDisplayStatus&2)}set visible(t){const e=t?2:0;(this.localDisplayStatus&2)!==e&&(this.parentRenderGroup&&(this.parentRenderGroup.structureDidChange=!0),this._updateFlags|=In,this.localDisplayStatus^=2,this._onUpdate())}get culled(){return!(this.localDisplayStatus&4)}set culled(t){const e=t?0:4;(this.localDisplayStatus&4)!==e&&(this.parentRenderGroup&&(this.parentRenderGroup.structureDidChange=!0),this._updateFlags|=In,this.localDisplayStatus^=4,this._onUpdate())}get renderable(){return!!(this.localDisplayStatus&1)}set renderable(t){const e=t?1:0;(this.localDisplayStatus&1)!==e&&(this._updateFlags|=In,this.localDisplayStatus^=1,this.parentRenderGroup&&(this.parentRenderGroup.structureDidChange=!0),this._onUpdate())}get isRenderable(){return this.localDisplayStatus===7&&this.groupAlpha>0}destroy(t=!1){if(this.destroyed)return;this.destroyed=!0;let e;if(this.children.length&&(e=this.removeChildren(0,this.children.length)),this.removeFromParent(),this.parent=null,this._maskEffect=null,this._filterEffect=null,this.effects=null,this._position=null,this._scale=null,this._pivot=null,this._skew=null,this.emit("destroyed",this),this.removeAllListeners(),(typeof t=="boolean"?t:t?.children)&&e)for(let r=0;r<e.length;++r)e[r].destroy(t);this.renderGroup?.destroy(),this.renderGroup=null}}X.mixin(Xu);X.mixin(ih);X.mixin(Ju);X.mixin(Qu);X.mixin(ju);X.mixin(qu);X.mixin(th);X.mixin(Vu);X.mixin($u);X.mixin(Ku);class Vr extends X{constructor(){super(...arguments),this.canBundle=!0,this.allowChildren=!1,this._roundPixels=0,this._lastUsed=-1,this._bounds=new te(0,1,0,0),this._boundsDirty=!0}get bounds(){return this._boundsDirty?(this.updateBounds(),this._boundsDirty=!1,this._bounds):this._bounds}get roundPixels(){return!!this._roundPixels}set roundPixels(t){this._roundPixels=t?1:0}containsPoint(t){const e=this.bounds,{x:n,y:r}=t;return n>=e.minX&&n<=e.maxX&&r>=e.minY&&r<=e.maxY}onViewUpdate(){if(this._didViewChangeTick++,this._boundsDirty=!0,this.didViewUpdate)return;this.didViewUpdate=!0;const t=this.renderGroup||this.parentRenderGroup;t&&t.onChildViewUpdate(this)}destroy(t){super.destroy(t),this._bounds=null}}class it extends Vr{constructor(t=k.EMPTY){t instanceof k&&(t={texture:t});const{texture:e=k.EMPTY,anchor:n,roundPixels:r,width:s,height:o,...a}=t;super({label:"Sprite",...a}),this.renderPipeId="sprite",this.batched=!0,this._visualBounds={minX:0,maxX:1,minY:0,maxY:0},this._anchor=new Mt({_onUpdate:()=>{this.onViewUpdate()}}),n?this.anchor=n:e.defaultAnchor&&(this.anchor=e.defaultAnchor),this.texture=e,this.allowChildren=!1,this.roundPixels=r??!1,s!==void 0&&(this.width=s),o!==void 0&&(this.height=o)}static from(t,e=!1){return t instanceof k?new it(t):new it(k.from(t,e))}set texture(t){t||(t=k.EMPTY);const e=this._texture;e!==t&&(e&&e.dynamic&&e.off("update",this.onViewUpdate,this),t.dynamic&&t.on("update",this.onViewUpdate,this),this._texture=t,this._width&&this._setWidth(this._width,this._texture.orig.width),this._height&&this._setHeight(this._height,this._texture.orig.height),this.onViewUpdate())}get texture(){return this._texture}get visualBounds(){return Ru(this._visualBounds,this._anchor,this._texture,0),this._visualBounds}get sourceBounds(){return B("8.6.1","Sprite.sourceBounds is deprecated, use visualBounds instead."),this.visualBounds}updateBounds(){const t=this._anchor,e=this._texture,n=this._bounds,{width:r,height:s}=e.orig;n.minX=-t._x*r,n.maxX=n.minX+r,n.minY=-t._y*s,n.maxY=n.minY+s}destroy(t=!1){if(super.destroy(t),typeof t=="boolean"?t:t?.texture){const n=typeof t=="boolean"?t:t?.textureSource;this._texture.destroy(n)}this._texture=null,this._visualBounds=null,this._bounds=null,this._anchor=null}get anchor(){return this._anchor}set anchor(t){typeof t=="number"?this._anchor.set(t):this._anchor.copyFrom(t)}get width(){return Math.abs(this.scale.x)*this._texture.orig.width}set width(t){this._setWidth(t,this._texture.orig.width),this._width=t}get height(){return Math.abs(this.scale.y)*this._texture.orig.height}set height(t){this._setHeight(t,this._texture.orig.height),this._height=t}getSize(t){return t||(t={}),t.width=Math.abs(this.scale.x)*this._texture.orig.width,t.height=Math.abs(this.scale.y)*this._texture.orig.height,t}setSize(t,e){typeof t=="object"?(e=t.height??t.width,t=t.width):e??(e=t),t!==void 0&&this._setWidth(t,this._texture.orig.width),e!==void 0&&this._setHeight(e,this._texture.orig.height)}}const lh=new te;function ta(i,t,e){const n=lh;i.measurable=!0,Yo(i,e,n),t.addBoundsMask(n),i.measurable=!1}function ea(i,t,e){const n=$e.get();i.measurable=!0;const r=Rt.get().identity(),s=ia(i,e,r);Ko(i,n,s),i.measurable=!1,t.addBoundsMask(n),Rt.return(r),$e.return(n)}function ia(i,t,e){return i?(i!==t&&(ia(i.parent,t,e),i.updateLocalTransform(),e.append(i.localTransform)),e):(vt("Mask bounds, renderable is not inside the root container"),e)}class na{constructor(t){this.priority=0,this.inverse=!1,this.pipe="alphaMask",t?.mask&&this.init(t.mask)}init(t){this.mask=t,this.renderMaskToTexture=!(t instanceof it),this.mask.renderable=this.renderMaskToTexture,this.mask.includeInBuild=!this.renderMaskToTexture,this.mask.measurable=!1}reset(){this.mask.measurable=!0,this.mask=null}addBounds(t,e){this.inverse||ta(this.mask,t,e)}addLocalBounds(t,e){ea(this.mask,t,e)}containsPoint(t,e){const n=this.mask;return e(n,t)}destroy(){this.reset()}static test(t){return t instanceof it}}na.extension=U.MaskEffect;class ra{constructor(t){this.priority=0,this.pipe="colorMask",t?.mask&&this.init(t.mask)}init(t){this.mask=t}destroy(){}static test(t){return typeof t=="number"}}ra.extension=U.MaskEffect;class sa{constructor(t){this.priority=0,this.pipe="stencilMask",t?.mask&&this.init(t.mask)}init(t){this.mask=t,this.mask.includeInBuild=!1,this.mask.measurable=!1}reset(){this.mask.measurable=!0,this.mask.includeInBuild=!0,this.mask=null}addBounds(t,e){ta(this.mask,t,e)}addLocalBounds(t,e){ea(this.mask,t,e)}containsPoint(t,e){const n=this.mask;return e(n,t)}destroy(){this.reset()}static test(t){return t instanceof X}}sa.extension=U.MaskEffect;const uh={createCanvas:(i,t)=>{const e=document.createElement("canvas");return e.width=i,e.height=t,e},getCanvasRenderingContext2D:()=>CanvasRenderingContext2D,getWebGLRenderingContext:()=>WebGLRenderingContext,getNavigator:()=>navigator,getBaseUrl:()=>document.baseURI??window.location.href,getFontFaceSet:()=>document.fonts,fetch:(i,t)=>fetch(i,t),parseXML:i=>new DOMParser().parseFromString(i,"text/xml")};let ws=uh;const ft={get(){return ws},set(i){ws=i}};class Wr extends zt{constructor(t){t.resource||(t.resource=ft.get().createCanvas()),t.width||(t.width=t.resource.width,t.autoDensity||(t.width/=t.resolution)),t.height||(t.height=t.resource.height,t.autoDensity||(t.height/=t.resolution)),super(t),this.uploadMethodId="image",this.autoDensity=t.autoDensity,this.resizeCanvas(),this.transparent=!!t.transparent}resizeCanvas(){this.autoDensity&&(this.resource.style.width=`${this.width}px`,this.resource.style.height=`${this.height}px`),(this.resource.width!==this.pixelWidth||this.resource.height!==this.pixelHeight)&&(this.resource.width=this.pixelWidth,this.resource.height=this.pixelHeight)}resize(t=this.width,e=this.height,n=this._resolution){const r=super.resize(t,e,n);return r&&this.resizeCanvas(),r}static test(t){return globalThis.HTMLCanvasElement&&t instanceof HTMLCanvasElement||globalThis.OffscreenCanvas&&t instanceof OffscreenCanvas}get context2D(){return this._context2D||(this._context2D=this.resource.getContext("2d"))}}Wr.extension=U.TextureSource;class Ae extends zt{constructor(t){if(t.resource&&globalThis.HTMLImageElement&&t.resource instanceof HTMLImageElement){const e=ft.get().createCanvas(t.resource.width,t.resource.height);e.getContext("2d").drawImage(t.resource,0,0,t.resource.width,t.resource.height),t.resource=e,vt("ImageSource: Image element passed, converting to canvas. Use CanvasSource instead.")}super(t),this.uploadMethodId="image",this.autoGarbageCollect=!0}static test(t){return globalThis.HTMLImageElement&&t instanceof HTMLImageElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap||globalThis.VideoFrame&&t instanceof VideoFrame}}Ae.extension=U.TextureSource;var rn=(i=>(i[i.INTERACTION=50]="INTERACTION",i[i.HIGH=25]="HIGH",i[i.NORMAL=0]="NORMAL",i[i.LOW=-25]="LOW",i[i.UTILITY=-50]="UTILITY",i))(rn||{});class On{constructor(t,e=null,n=0,r=!1){this.next=null,this.previous=null,this._destroyed=!1,this._fn=t,this._context=e,this.priority=n,this._once=r}match(t,e=null){return this._fn===t&&this._context===e}emit(t){this._fn&&(this._context?this._fn.call(this._context,t):this._fn(t));const e=this.next;return this._once&&this.destroy(!0),this._destroyed&&(this.next=null),e}connect(t){this.previous=t,t.next&&(t.next.previous=this),this.next=t.next,t.next=this}destroy(t=!1){this._destroyed=!0,this._fn=null,this._context=null,this.previous&&(this.previous.next=this.next),this.next&&(this.next.previous=this.previous);const e=this.next;return this.next=t?null:e,this.previous=null,e}}const oa=class Lt{constructor(){this.autoStart=!1,this.deltaTime=1,this.lastTime=-1,this.speed=1,this.started=!1,this._requestId=null,this._maxElapsedMS=100,this._minElapsedMS=0,this._protected=!1,this._lastFrame=-1,this._head=new On(null,null,1/0),this.deltaMS=1/Lt.targetFPMS,this.elapsedMS=1/Lt.targetFPMS,this._tick=t=>{this._requestId=null,this.started&&(this.update(t),this.started&&this._requestId===null&&this._head.next&&(this._requestId=requestAnimationFrame(this._tick)))}}_requestIfNeeded(){this._requestId===null&&this._head.next&&(this.lastTime=performance.now(),this._lastFrame=this.lastTime,this._requestId=requestAnimationFrame(this._tick))}_cancelIfNeeded(){this._requestId!==null&&(cancelAnimationFrame(this._requestId),this._requestId=null)}_startIfPossible(){this.started?this._requestIfNeeded():this.autoStart&&this.start()}add(t,e,n=rn.NORMAL){return this._addListener(new On(t,e,n))}addOnce(t,e,n=rn.NORMAL){return this._addListener(new On(t,e,n,!0))}_addListener(t){let e=this._head.next,n=this._head;if(!e)t.connect(n);else{for(;e;){if(t.priority>e.priority){t.connect(n);break}n=e,e=e.next}t.previous||t.connect(n)}return this._startIfPossible(),this}remove(t,e){let n=this._head.next;for(;n;)n.match(t,e)?n=n.destroy():n=n.next;return this._head.next||this._cancelIfNeeded(),this}get count(){if(!this._head)return 0;let t=0,e=this._head;for(;e=e.next;)t++;return t}start(){this.started||(this.started=!0,this._requestIfNeeded())}stop(){this.started&&(this.started=!1,this._cancelIfNeeded())}destroy(){if(!this._protected){this.stop();let t=this._head.next;for(;t;)t=t.destroy(!0);this._head.destroy(),this._head=null}}update(t=performance.now()){let e;if(t>this.lastTime){if(e=this.elapsedMS=t-this.lastTime,e>this._maxElapsedMS&&(e=this._maxElapsedMS),e*=this.speed,this._minElapsedMS){const s=t-this._lastFrame|0;if(s<this._minElapsedMS)return;this._lastFrame=t-s%this._minElapsedMS}this.deltaMS=e,this.deltaTime=this.deltaMS*Lt.targetFPMS;const n=this._head;let r=n.next;for(;r;)r=r.emit(this);n.next||this._cancelIfNeeded()}else this.deltaTime=this.deltaMS=this.elapsedMS=0;this.lastTime=t}get FPS(){return 1e3/this.elapsedMS}get minFPS(){return 1e3/this._maxElapsedMS}set minFPS(t){const e=Math.min(this.maxFPS,t),n=Math.min(Math.max(0,e)/1e3,Lt.targetFPMS);this._maxElapsedMS=1/n}get maxFPS(){return this._minElapsedMS?Math.round(1e3/this._minElapsedMS):0}set maxFPS(t){if(t===0)this._minElapsedMS=0;else{const e=Math.max(this.minFPS,t);this._minElapsedMS=1/(e/1e3)}}static get shared(){if(!Lt._shared){const t=Lt._shared=new Lt;t.autoStart=!0,t._protected=!0}return Lt._shared}static get system(){if(!Lt._system){const t=Lt._system=new Lt;t.autoStart=!0,t._protected=!0}return Lt._system}};oa.targetFPMS=.06;let Ut=oa,Rn;async function aa(){return Rn??(Rn=(async()=>{const t=document.createElement("canvas").getContext("webgl");if(!t)return"premultiply-alpha-on-upload";const e=await new Promise(o=>{const a=document.createElement("video");a.onloadeddata=()=>o(a),a.onerror=()=>o(null),a.autoplay=!1,a.crossOrigin="anonymous",a.preload="auto",a.src="data:video/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQJChYECGFOAZwEAAAAAAAHTEU2bdLpNu4tTq4QVSalmU6yBoU27i1OrhBZUrmtTrIHGTbuMU6uEElTDZ1OsggEXTbuMU6uEHFO7a1OsggG97AEAAAAAAABZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVSalmoCrXsYMPQkBNgIRMYXZmV0GETGF2ZkSJiEBEAAAAAAAAFlSua8yuAQAAAAAAAEPXgQFzxYgAAAAAAAAAAZyBACK1nIN1bmSIgQCGhVZfVlA5g4EBI+ODhAJiWgDglLCBArqBApqBAlPAgQFVsIRVuYEBElTDZ9Vzc9JjwItjxYgAAAAAAAAAAWfInEWjh0VOQ09ERVJEh49MYXZjIGxpYnZweC12cDlnyKJFo4hEVVJBVElPTkSHlDAwOjAwOjAwLjA0MDAwMDAwMAAAH0O2dcfngQCgwqGggQAAAIJJg0IAABAAFgA4JBwYSgAAICAAEb///4r+AAB1oZ2mm+6BAaWWgkmDQgAAEAAWADgkHBhKAAAgIABIQBxTu2uRu4+zgQC3iveBAfGCAXHwgQM=",a.load()});if(!e)return"premultiply-alpha-on-upload";const n=t.createTexture();t.bindTexture(t.TEXTURE_2D,n);const r=t.createFramebuffer();t.bindFramebuffer(t.FRAMEBUFFER,r),t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.TEXTURE_2D,n,0),t.pixelStorei(t.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),t.pixelStorei(t.UNPACK_COLORSPACE_CONVERSION_WEBGL,t.NONE),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,t.RGBA,t.UNSIGNED_BYTE,e);const s=new Uint8Array(4);return t.readPixels(0,0,1,1,t.RGBA,t.UNSIGNED_BYTE,s),t.deleteFramebuffer(r),t.deleteTexture(n),t.getExtension("WEBGL_lose_context")?.loseContext(),s[0]<=s[3]?"premultiplied-alpha":"premultiply-alpha-on-upload"})()),Rn}const dn=class la extends zt{constructor(t){super(t),this.isReady=!1,this.uploadMethodId="video",t={...la.defaultOptions,...t},this._autoUpdate=!0,this._isConnectedToTicker=!1,this._updateFPS=t.updateFPS||0,this._msToNextUpdate=0,this.autoPlay=t.autoPlay!==!1,this.alphaMode=t.alphaMode??"premultiply-alpha-on-upload",this._videoFrameRequestCallback=this._videoFrameRequestCallback.bind(this),this._videoFrameRequestCallbackHandle=null,this._load=null,this._resolve=null,this._reject=null,this._onCanPlay=this._onCanPlay.bind(this),this._onCanPlayThrough=this._onCanPlayThrough.bind(this),this._onError=this._onError.bind(this),this._onPlayStart=this._onPlayStart.bind(this),this._onPlayStop=this._onPlayStop.bind(this),this._onSeeked=this._onSeeked.bind(this),t.autoLoad!==!1&&this.load()}updateFrame(){if(!this.destroyed){if(this._updateFPS){const t=Ut.shared.elapsedMS*this.resource.playbackRate;this._msToNextUpdate=Math.floor(this._msToNextUpdate-t)}(!this._updateFPS||this._msToNextUpdate<=0)&&(this._msToNextUpdate=this._updateFPS?Math.floor(1e3/this._updateFPS):0),this.isValid&&this.update()}}_videoFrameRequestCallback(){this.updateFrame(),this.destroyed?this._videoFrameRequestCallbackHandle=null:this._videoFrameRequestCallbackHandle=this.resource.requestVideoFrameCallback(this._videoFrameRequestCallback)}get isValid(){return!!this.resource.videoWidth&&!!this.resource.videoHeight}async load(){if(this._load)return this._load;const t=this.resource,e=this.options;return(t.readyState===t.HAVE_ENOUGH_DATA||t.readyState===t.HAVE_FUTURE_DATA)&&t.width&&t.height&&(t.complete=!0),t.addEventListener("play",this._onPlayStart),t.addEventListener("pause",this._onPlayStop),t.addEventListener("seeked",this._onSeeked),this._isSourceReady()?this._mediaReady():(e.preload||t.addEventListener("canplay",this._onCanPlay),t.addEventListener("canplaythrough",this._onCanPlayThrough),t.addEventListener("error",this._onError,!0)),this.alphaMode=await aa(),this._load=new Promise((n,r)=>{this.isValid?n(this):(this._resolve=n,this._reject=r,e.preloadTimeoutMs!==void 0&&(this._preloadTimeout=setTimeout(()=>{this._onError(new ErrorEvent(`Preload exceeded timeout of ${e.preloadTimeoutMs}ms`))})),t.load())}),this._load}_onError(t){this.resource.removeEventListener("error",this._onError,!0),this.emit("error",t),this._reject&&(this._reject(t),this._reject=null,this._resolve=null)}_isSourcePlaying(){const t=this.resource;return!t.paused&&!t.ended}_isSourceReady(){return this.resource.readyState>2}_onPlayStart(){this.isValid||this._mediaReady(),this._configureAutoUpdate()}_onPlayStop(){this._configureAutoUpdate()}_onSeeked(){this._autoUpdate&&!this._isSourcePlaying()&&(this._msToNextUpdate=0,this.updateFrame(),this._msToNextUpdate=0)}_onCanPlay(){this.resource.removeEventListener("canplay",this._onCanPlay),this._mediaReady()}_onCanPlayThrough(){this.resource.removeEventListener("canplaythrough",this._onCanPlay),this._preloadTimeout&&(clearTimeout(this._preloadTimeout),this._preloadTimeout=void 0),this._mediaReady()}_mediaReady(){const t=this.resource;this.isValid&&(this.isReady=!0,this.resize(t.videoWidth,t.videoHeight)),this._msToNextUpdate=0,this.updateFrame(),this._msToNextUpdate=0,this._resolve&&(this._resolve(this),this._resolve=null,this._reject=null),this._isSourcePlaying()?this._onPlayStart():this.autoPlay&&this.resource.play()}destroy(){this._configureAutoUpdate();const t=this.resource;t&&(t.removeEventListener("play",this._onPlayStart),t.removeEventListener("pause",this._onPlayStop),t.removeEventListener("seeked",this._onSeeked),t.removeEventListener("canplay",this._onCanPlay),t.removeEventListener("canplaythrough",this._onCanPlayThrough),t.removeEventListener("error",this._onError,!0),t.pause(),t.src="",t.load()),super.destroy()}get autoUpdate(){return this._autoUpdate}set autoUpdate(t){t!==this._autoUpdate&&(this._autoUpdate=t,this._configureAutoUpdate())}get updateFPS(){return this._updateFPS}set updateFPS(t){t!==this._updateFPS&&(this._updateFPS=t,this._configureAutoUpdate())}_configureAutoUpdate(){this._autoUpdate&&this._isSourcePlaying()?!this._updateFPS&&this.resource.requestVideoFrameCallback?(this._isConnectedToTicker&&(Ut.shared.remove(this.updateFrame,this),this._isConnectedToTicker=!1,this._msToNextUpdate=0),this._videoFrameRequestCallbackHandle===null&&(this._videoFrameRequestCallbackHandle=this.resource.requestVideoFrameCallback(this._videoFrameRequestCallback))):(this._videoFrameRequestCallbackHandle!==null&&(this.resource.cancelVideoFrameCallback(this._videoFrameRequestCallbackHandle),this._videoFrameRequestCallbackHandle=null),this._isConnectedToTicker||(Ut.shared.add(this.updateFrame,this),this._isConnectedToTicker=!0,this._msToNextUpdate=0)):(this._videoFrameRequestCallbackHandle!==null&&(this.resource.cancelVideoFrameCallback(this._videoFrameRequestCallbackHandle),this._videoFrameRequestCallbackHandle=null),this._isConnectedToTicker&&(Ut.shared.remove(this.updateFrame,this),this._isConnectedToTicker=!1,this._msToNextUpdate=0))}static test(t){return globalThis.HTMLVideoElement&&t instanceof HTMLVideoElement}};dn.extension=U.TextureSource;dn.defaultOptions={...zt.defaultOptions,autoLoad:!0,autoPlay:!0,updateFPS:0,crossorigin:!0,loop:!1,muted:!0,playsinline:!0,preload:!1};dn.MIME_TYPES={ogv:"video/ogg",mov:"video/quicktime",m4v:"video/mp4"};let Gi=dn;const Ht=(i,t,e=!1)=>(Array.isArray(i)||(i=[i]),t?i.map(n=>typeof n=="string"||e?t(n):n):i);class hh{constructor(){this._parsers=[],this._cache=new Map,this._cacheMap=new Map}reset(){this._cacheMap.clear(),this._cache.clear()}has(t){return this._cache.has(t)}get(t){const e=this._cache.get(t);return e||vt(`[Assets] Asset id ${t} was not found in the Cache`),e}set(t,e){const n=Ht(t);let r;for(let l=0;l<this.parsers.length;l++){const u=this.parsers[l];if(u.test(e)){r=u.getCacheableAssets(n,e);break}}const s=new Map(Object.entries(r||{}));r||n.forEach(l=>{s.set(l,e)});const o=[...s.keys()],a={cacheKeys:o,keys:n};n.forEach(l=>{this._cacheMap.set(l,a)}),o.forEach(l=>{const u=r?r[l]:e;this._cache.has(l)&&this._cache.get(l)!==u&&vt("[Cache] already has key:",l),this._cache.set(l,s.get(l))})}remove(t){if(!this._cacheMap.has(t)){vt(`[Assets] Asset id ${t} was not found in the Cache`);return}const e=this._cacheMap.get(t);e.cacheKeys.forEach(r=>{this._cache.delete(r)}),e.keys.forEach(r=>{this._cacheMap.delete(r)})}get parsers(){return this._parsers}}const gt=new hh,cr=[];It.handleByList(U.TextureSource,cr);function ua(i={}){const t=i&&i.resource,e=t?i.resource:i,n=t?i:{resource:i};for(let r=0;r<cr.length;r++){const s=cr[r];if(s.test(e))return new s(n)}throw new Error(`Could not find a source type for resource: ${n.resource}`)}function ch(i={},t=!1){const e=i&&i.resource,n=e?i.resource:i,r=e?i:{resource:i};if(!t&&gt.has(n))return gt.get(n);const s=new k({source:ua(r)});return s.on("destroy",()=>{gt.has(n)&&gt.remove(n)}),t||gt.set(n,s),s}function fh(i,t=!1){return typeof i=="string"?gt.get(i):i instanceof zt?new k({source:i}):ch(i,t)}k.from=fh;zt.from=ua;It.add(na,ra,sa,Gi,Ae,Wr,Dr);var ae=(i=>(i[i.Low=0]="Low",i[i.Normal=1]="Normal",i[i.High=2]="High",i))(ae||{});function Gt(i){if(typeof i!="string")throw new TypeError(`Path must be a string. Received ${JSON.stringify(i)}`)}function qe(i){return i.split("?")[0].split("#")[0]}function dh(i){return i.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}function ph(i,t,e){return i.replace(new RegExp(dh(t),"g"),e)}function mh(i,t){let e="",n=0,r=-1,s=0,o=-1;for(let a=0;a<=i.length;++a){if(a<i.length)o=i.charCodeAt(a);else{if(o===47)break;o=47}if(o===47){if(!(r===a-1||s===1))if(r!==a-1&&s===2){if(e.length<2||n!==2||e.charCodeAt(e.length-1)!==46||e.charCodeAt(e.length-2)!==46){if(e.length>2){const l=e.lastIndexOf("/");if(l!==e.length-1){l===-1?(e="",n=0):(e=e.slice(0,l),n=e.length-1-e.lastIndexOf("/")),r=a,s=0;continue}}else if(e.length===2||e.length===1){e="",n=0,r=a,s=0;continue}}}else e.length>0?e+=`/${i.slice(r+1,a)}`:e=i.slice(r+1,a),n=a-r-1;r=a,s=0}else o===46&&s!==-1?++s:s=-1}return e}const At={toPosix(i){return ph(i,"\\","/")},isUrl(i){return/^https?:/.test(this.toPosix(i))},isDataUrl(i){return/^data:([a-z]+\/[a-z0-9-+.]+(;[a-z0-9-.!#$%*+.{}|~`]+=[a-z0-9-.!#$%*+.{}()_|~`]+)*)?(;base64)?,([a-z0-9!$&',()*+;=\-._~:@\/?%\s<>]*?)$/i.test(i)},isBlobUrl(i){return i.startsWith("blob:")},hasProtocol(i){return/^[^/:]+:/.test(this.toPosix(i))},getProtocol(i){Gt(i),i=this.toPosix(i);const t=/^file:\/\/\//.exec(i);if(t)return t[0];const e=/^[^/:]+:\/{0,2}/.exec(i);return e?e[0]:""},toAbsolute(i,t,e){if(Gt(i),this.isDataUrl(i)||this.isBlobUrl(i))return i;const n=qe(this.toPosix(t??ft.get().getBaseUrl())),r=qe(this.toPosix(e??this.rootname(n)));return i=this.toPosix(i),i.startsWith("/")?At.join(r,i.slice(1)):this.isAbsolute(i)?i:this.join(n,i)},normalize(i){if(Gt(i),i.length===0)return".";if(this.isDataUrl(i)||this.isBlobUrl(i))return i;i=this.toPosix(i);let t="";const e=i.startsWith("/");this.hasProtocol(i)&&(t=this.rootname(i),i=i.slice(t.length));const n=i.endsWith("/");return i=mh(i),i.length>0&&n&&(i+="/"),e?`/${i}`:t+i},isAbsolute(i){return Gt(i),i=this.toPosix(i),this.hasProtocol(i)?!0:i.startsWith("/")},join(...i){if(i.length===0)return".";let t;for(let e=0;e<i.length;++e){const n=i[e];if(Gt(n),n.length>0)if(t===void 0)t=n;else{const r=i[e-1]??"";this.joinExtensions.includes(this.extname(r).toLowerCase())?t+=`/../${n}`:t+=`/${n}`}}return t===void 0?".":this.normalize(t)},dirname(i){if(Gt(i),i.length===0)return".";i=this.toPosix(i);let t=i.charCodeAt(0);const e=t===47;let n=-1,r=!0;const s=this.getProtocol(i),o=i;i=i.slice(s.length);for(let a=i.length-1;a>=1;--a)if(t=i.charCodeAt(a),t===47){if(!r){n=a;break}}else r=!1;return n===-1?e?"/":this.isUrl(o)?s+i:s:e&&n===1?"//":s+i.slice(0,n)},rootname(i){Gt(i),i=this.toPosix(i);let t="";if(i.startsWith("/")?t="/":t=this.getProtocol(i),this.isUrl(i)){const e=i.indexOf("/",t.length);e!==-1?t=i.slice(0,e):t=i,t.endsWith("/")||(t+="/")}return t},basename(i,t){Gt(i),t&&Gt(t),i=qe(this.toPosix(i));let e=0,n=-1,r=!0,s;if(t!==void 0&&t.length>0&&t.length<=i.length){if(t.length===i.length&&t===i)return"";let o=t.length-1,a=-1;for(s=i.length-1;s>=0;--s){const l=i.charCodeAt(s);if(l===47){if(!r){e=s+1;break}}else a===-1&&(r=!1,a=s+1),o>=0&&(l===t.charCodeAt(o)?--o===-1&&(n=s):(o=-1,n=a))}return e===n?n=a:n===-1&&(n=i.length),i.slice(e,n)}for(s=i.length-1;s>=0;--s)if(i.charCodeAt(s)===47){if(!r){e=s+1;break}}else n===-1&&(r=!1,n=s+1);return n===-1?"":i.slice(e,n)},extname(i){Gt(i),i=qe(this.toPosix(i));let t=-1,e=0,n=-1,r=!0,s=0;for(let o=i.length-1;o>=0;--o){const a=i.charCodeAt(o);if(a===47){if(!r){e=o+1;break}continue}n===-1&&(r=!1,n=o+1),a===46?t===-1?t=o:s!==1&&(s=1):t!==-1&&(s=-1)}return t===-1||n===-1||s===0||s===1&&t===n-1&&t===e+1?"":i.slice(t,n)},parse(i){Gt(i);const t={root:"",dir:"",base:"",ext:"",name:""};if(i.length===0)return t;i=qe(this.toPosix(i));let e=i.charCodeAt(0);const n=this.isAbsolute(i);let r;t.root=this.rootname(i),n||this.hasProtocol(i)?r=1:r=0;let s=-1,o=0,a=-1,l=!0,u=i.length-1,h=0;for(;u>=r;--u){if(e=i.charCodeAt(u),e===47){if(!l){o=u+1;break}continue}a===-1&&(l=!1,a=u+1),e===46?s===-1?s=u:h!==1&&(h=1):s!==-1&&(h=-1)}return s===-1||a===-1||h===0||h===1&&s===a-1&&s===o+1?a!==-1&&(o===0&&n?t.base=t.name=i.slice(1,a):t.base=t.name=i.slice(o,a)):(o===0&&n?(t.name=i.slice(1,s),t.base=i.slice(1,a)):(t.name=i.slice(o,s),t.base=i.slice(o,a)),t.ext=i.slice(s,a)),t.dir=this.dirname(i),t},sep:"/",delimiter:":",joinExtensions:[".html"]};function ha(i,t,e,n,r){const s=t[e];for(let o=0;o<s.length;o++){const a=s[o];e<t.length-1?ha(i.replace(n[e],a),t,e+1,n,r):r.push(i.replace(n[e],a))}}function gh(i){const t=/\{(.*?)\}/g,e=i.match(t),n=[];if(e){const r=[];e.forEach(s=>{const o=s.substring(1,s.length-1).split(",");r.push(o)}),ha(i,r,0,e,n)}else n.push(i);return n}const sn=i=>!Array.isArray(i);class Xe{constructor(){this._defaultBundleIdentifierOptions={connector:"-",createBundleAssetId:(t,e)=>`${t}${this._bundleIdConnector}${e}`,extractAssetIdFromBundle:(t,e)=>e.replace(`${t}${this._bundleIdConnector}`,"")},this._bundleIdConnector=this._defaultBundleIdentifierOptions.connector,this._createBundleAssetId=this._defaultBundleIdentifierOptions.createBundleAssetId,this._extractAssetIdFromBundle=this._defaultBundleIdentifierOptions.extractAssetIdFromBundle,this._assetMap={},this._preferredOrder=[],this._parsers=[],this._resolverHash={},this._bundles={}}setBundleIdentifier(t){if(this._bundleIdConnector=t.connector??this._bundleIdConnector,this._createBundleAssetId=t.createBundleAssetId??this._createBundleAssetId,this._extractAssetIdFromBundle=t.extractAssetIdFromBundle??this._extractAssetIdFromBundle,this._extractAssetIdFromBundle("foo",this._createBundleAssetId("foo","bar"))!=="bar")throw new Error("[Resolver] GenerateBundleAssetId are not working correctly")}prefer(...t){t.forEach(e=>{this._preferredOrder.push(e),e.priority||(e.priority=Object.keys(e.params))}),this._resolverHash={}}set basePath(t){this._basePath=t}get basePath(){return this._basePath}set rootPath(t){this._rootPath=t}get rootPath(){return this._rootPath}get parsers(){return this._parsers}reset(){this.setBundleIdentifier(this._defaultBundleIdentifierOptions),this._assetMap={},this._preferredOrder=[],this._resolverHash={},this._rootPath=null,this._basePath=null,this._manifest=null,this._bundles={},this._defaultSearchParams=null}setDefaultSearchParams(t){if(typeof t=="string")this._defaultSearchParams=t;else{const e=t;this._defaultSearchParams=Object.keys(e).map(n=>`${encodeURIComponent(n)}=${encodeURIComponent(e[n])}`).join("&")}}getAlias(t){const{alias:e,src:n}=t;return Ht(e||n,s=>typeof s=="string"?s:Array.isArray(s)?s.map(o=>o?.src??o):s?.src?s.src:s,!0)}addManifest(t){this._manifest&&vt("[Resolver] Manifest already exists, this will be overwritten"),this._manifest=t,t.bundles.forEach(e=>{this.addBundle(e.name,e.assets)})}addBundle(t,e){const n=[];let r=e;Array.isArray(e)||(r=Object.entries(e).map(([s,o])=>typeof o=="string"||Array.isArray(o)?{alias:s,src:o}:{alias:s,...o})),r.forEach(s=>{const o=s.src,a=s.alias;let l;if(typeof a=="string"){const u=this._createBundleAssetId(t,a);n.push(u),l=[a,u]}else{const u=a.map(h=>this._createBundleAssetId(t,h));n.push(...u),l=[...a,...u]}this.add({...s,alias:l,src:o})}),this._bundles[t]=n}add(t){const e=[];Array.isArray(t)?e.push(...t):e.push(t);let n;n=s=>{this.hasKey(s)&&vt(`[Resolver] already has key: ${s} overwriting`)},Ht(e).forEach(s=>{const{src:o}=s;let{data:a,format:l,loadParser:u}=s;const h=Ht(o).map(f=>typeof f=="string"?gh(f):Array.isArray(f)?f:[f]),c=this.getAlias(s);Array.isArray(c)?c.forEach(n):n(c);const d=[];h.forEach(f=>{f.forEach(x=>{let v={};if(typeof x!="object"){v.src=x;for(let g=0;g<this._parsers.length;g++){const y=this._parsers[g];if(y.test(x)){v=y.parse(x);break}}}else a=x.data??a,l=x.format??l,u=x.loadParser??u,v={...v,...x};if(!c)throw new Error(`[Resolver] alias is undefined for this asset: ${v.src}`);v=this._buildResolvedAsset(v,{aliases:c,data:a,format:l,loadParser:u}),d.push(v)})}),c.forEach(f=>{this._assetMap[f]=d})})}resolveBundle(t){const e=sn(t);t=Ht(t);const n={};return t.forEach(r=>{const s=this._bundles[r];if(s){const o=this.resolve(s),a={};for(const l in o){const u=o[l];a[this._extractAssetIdFromBundle(r,l)]=u}n[r]=a}}),e?n[t[0]]:n}resolveUrl(t){const e=this.resolve(t);if(typeof t!="string"){const n={};for(const r in e)n[r]=e[r].src;return n}return e.src}resolve(t){const e=sn(t);t=Ht(t);const n={};return t.forEach(r=>{if(!this._resolverHash[r])if(this._assetMap[r]){let s=this._assetMap[r];const o=this._getPreferredOrder(s);o?.priority.forEach(a=>{o.params[a].forEach(l=>{const u=s.filter(h=>h[a]?h[a]===l:!1);u.length&&(s=u)})}),this._resolverHash[r]=s[0]}else this._resolverHash[r]=this._buildResolvedAsset({alias:[r],src:r},{});n[r]=this._resolverHash[r]}),e?n[t[0]]:n}hasKey(t){return!!this._assetMap[t]}hasBundle(t){return!!this._bundles[t]}_getPreferredOrder(t){for(let e=0;e<t.length;e++){const n=t[0],r=this._preferredOrder.find(s=>s.params.format.includes(n.format));if(r)return r}return this._preferredOrder[0]}_appendDefaultSearchParams(t){if(!this._defaultSearchParams)return t;const e=/\?/.test(t)?"&":"?";return`${t}${e}${this._defaultSearchParams}`}_buildResolvedAsset(t,e){const{aliases:n,data:r,loadParser:s,format:o}=e;return(this._basePath||this._rootPath)&&(t.src=At.toAbsolute(t.src,this._basePath,this._rootPath)),t.alias=n??t.alias??[t.src],t.src=this._appendDefaultSearchParams(t.src),t.data={...r||{},...t.data},t.loadParser=s??t.loadParser,t.format=o??t.format??xh(t.src),t}}Xe.RETINA_PREFIX=/@([0-9\.]+)x/;function xh(i){return i.split(".").pop().split("?").shift().split("#").shift()}const fr=(i,t)=>{const e=t.split("?")[1];return e&&(i+=`?${e}`),i},ca=class hi{constructor(t,e){this.linkedSheets=[],this._texture=t instanceof k?t:null,this.textureSource=t.source,this.textures={},this.animations={},this.data=e;const n=parseFloat(e.meta.scale);n?(this.resolution=n,t.source.resolution=this.resolution):this.resolution=t.source._resolution,this._frames=this.data.frames,this._frameKeys=Object.keys(this._frames),this._batchIndex=0,this._callback=null}parse(){return new Promise(t=>{this._callback=t,this._batchIndex=0,this._frameKeys.length<=hi.BATCH_SIZE?(this._processFrames(0),this._processAnimations(),this._parseComplete()):this._nextBatch()})}_processFrames(t){let e=t;const n=hi.BATCH_SIZE;for(;e-t<n&&e<this._frameKeys.length;){const r=this._frameKeys[e],s=this._frames[r],o=s.frame;if(o){let a=null,l=null;const u=s.trimmed!==!1&&s.sourceSize?s.sourceSize:s.frame,h=new _t(0,0,Math.floor(u.w)/this.resolution,Math.floor(u.h)/this.resolution);s.rotated?a=new _t(Math.floor(o.x)/this.resolution,Math.floor(o.y)/this.resolution,Math.floor(o.h)/this.resolution,Math.floor(o.w)/this.resolution):a=new _t(Math.floor(o.x)/this.resolution,Math.floor(o.y)/this.resolution,Math.floor(o.w)/this.resolution,Math.floor(o.h)/this.resolution),s.trimmed!==!1&&s.spriteSourceSize&&(l=new _t(Math.floor(s.spriteSourceSize.x)/this.resolution,Math.floor(s.spriteSourceSize.y)/this.resolution,Math.floor(o.w)/this.resolution,Math.floor(o.h)/this.resolution)),this.textures[r]=new k({source:this.textureSource,frame:a,orig:h,trim:l,rotate:s.rotated?2:0,defaultAnchor:s.anchor,defaultBorders:s.borders,label:r.toString()})}e++}}_processAnimations(){const t=this.data.animations||{};for(const e in t){this.animations[e]=[];for(let n=0;n<t[e].length;n++){const r=t[e][n];this.animations[e].push(this.textures[r])}}}_parseComplete(){const t=this._callback;this._callback=null,this._batchIndex=0,t.call(this,this.textures)}_nextBatch(){this._processFrames(this._batchIndex*hi.BATCH_SIZE),this._batchIndex++,setTimeout(()=>{this._batchIndex*hi.BATCH_SIZE<this._frameKeys.length?this._nextBatch():(this._processAnimations(),this._parseComplete())},0)}destroy(t=!1){for(const e in this.textures)this.textures[e].destroy();this._frames=null,this._frameKeys=null,this.data=null,this.textures=null,t&&(this._texture?.destroy(),this.textureSource.destroy()),this._texture=null,this.textureSource=null,this.linkedSheets=[]}};ca.BATCH_SIZE=1e3;let Cs=ca;const _h=["jpg","png","jpeg","avif","webp","basis","etc2","bc7","bc6h","bc5","bc4","bc3","bc2","bc1","eac","astc"];function fa(i,t,e){const n={};if(i.forEach(r=>{n[r]=t}),Object.keys(t.textures).forEach(r=>{n[r]=t.textures[r]}),!e){const r=At.dirname(i[0]);t.linkedSheets.forEach((s,o)=>{const a=fa([`${r}/${t.data.meta.related_multi_packs[o]}`],s,!0);Object.assign(n,a)})}return n}const vh={extension:U.Asset,cache:{test:i=>i instanceof Cs,getCacheableAssets:(i,t)=>fa(i,t,!1)},resolver:{extension:{type:U.ResolveParser,name:"resolveSpritesheet"},test:i=>{const e=i.split("?")[0].split("."),n=e.pop(),r=e.pop();return n==="json"&&_h.includes(r)},parse:i=>{const t=i.split(".");return{resolution:parseFloat(Xe.RETINA_PREFIX.exec(i)?.[1]??"1"),format:t[t.length-2],src:i}}},loader:{name:"spritesheetLoader",extension:{type:U.LoadParser,priority:ae.Normal,name:"spritesheetLoader"},async testParse(i,t){return At.extname(t.src).toLowerCase()===".json"&&!!i.frames},async parse(i,t,e){const{texture:n,imageFilename:r}=t?.data??{};let s=At.dirname(t.src);s&&s.lastIndexOf("/")!==s.length-1&&(s+="/");let o;if(n instanceof k)o=n;else{const u=fr(s+(r??i.meta.image),t.src);o=(await e.load([u]))[u]}const a=new Cs(o.source,i);await a.parse();const l=i?.meta?.related_multi_packs;if(Array.isArray(l)){const u=[];for(const c of l){if(typeof c!="string")continue;let d=s+c;t.data?.ignoreMultiPack||(d=fr(d,t.src),u.push(e.load({src:d,data:{ignoreMultiPack:!0}})))}const h=await Promise.all(u);a.linkedSheets=h,h.forEach(c=>{c.linkedSheets=[a].concat(a.linkedSheets.filter(d=>d!==c))})}return a},async unload(i,t,e){await e.unload(i.textureSource._sourceOrigin),i.destroy(!1)}}};It.add(vh);var En=/iPhone/i,Ts=/iPod/i,As=/iPad/i,Ps=/\biOS-universal(?:.+)Mac\b/i,Un=/\bAndroid(?:.+)Mobile\b/i,Ms=/Android/i,Me=/(?:SD4930UR|\bSilk(?:.+)Mobile\b)/i,Ii=/Silk/i,ne=/Windows Phone/i,Fs=/\bWindows(?:.+)ARM\b/i,Is=/BlackBerry/i,Os=/BB10/i,Rs=/Opera Mini/i,Es=/\b(CriOS|Chrome)(?:.+)Mobile/i,Us=/Mobile(?:.+)Firefox\b/i,zs=function(i){return typeof i<"u"&&i.platform==="MacIntel"&&typeof i.maxTouchPoints=="number"&&i.maxTouchPoints>1&&typeof MSStream>"u"};function yh(i){return function(t){return t.test(i)}}function ks(i){var t={userAgent:"",platform:"",maxTouchPoints:0};!i&&typeof navigator<"u"?t={userAgent:navigator.userAgent,platform:navigator.platform,maxTouchPoints:navigator.maxTouchPoints||0}:typeof i=="string"?t.userAgent=i:i&&i.userAgent&&(t={userAgent:i.userAgent,platform:i.platform,maxTouchPoints:i.maxTouchPoints||0});var e=t.userAgent,n=e.split("[FBAN");typeof n[1]<"u"&&(e=n[0]),n=e.split("Twitter"),typeof n[1]<"u"&&(e=n[0]);var r=yh(e),s={apple:{phone:r(En)&&!r(ne),ipod:r(Ts),tablet:!r(En)&&(r(As)||zs(t))&&!r(ne),universal:r(Ps),device:(r(En)||r(Ts)||r(As)||r(Ps)||zs(t))&&!r(ne)},amazon:{phone:r(Me),tablet:!r(Me)&&r(Ii),device:r(Me)||r(Ii)},android:{phone:!r(ne)&&r(Me)||!r(ne)&&r(Un),tablet:!r(ne)&&!r(Me)&&!r(Un)&&(r(Ii)||r(Ms)),device:!r(ne)&&(r(Me)||r(Ii)||r(Un)||r(Ms))||r(/\bokhttp\b/i)},windows:{phone:r(ne),tablet:r(Fs),device:r(ne)||r(Fs)},other:{blackberry:r(Is),blackberry10:r(Os),opera:r(Rs),firefox:r(Us),chrome:r(Es),device:r(Is)||r(Os)||r(Rs)||r(Us)||r(Es)},any:!1,phone:!1,tablet:!1};return s.any=s.apple.device||s.android.device||s.windows.device||s.other.device,s.phone=s.apple.phone||s.android.phone||s.windows.phone,s.tablet=s.apple.tablet||s.android.tablet||s.windows.tablet,s}const bh=ks.default??ks,De=bh(globalThis.navigator),zn=Object.create(null),Ls=Object.create(null);function $r(i,t){let e=Ls[i];return e===void 0&&(zn[t]===void 0&&(zn[t]=1),Ls[i]=e=zn[t]++),e}let Oi;function da(){return(!Oi||Oi?.isContextLost())&&(Oi=ft.get().createCanvas().getContext("webgl",{})),Oi}let Ri;function Sh(){if(!Ri){Ri="mediump";const i=da();i&&i.getShaderPrecisionFormat&&(Ri=i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision?"highp":"mediump")}return Ri}function wh(i,t,e){return t?i:e?(i=i.replace("out vec4 finalColor;",""),`
        
        #ifdef GL_ES // This checks if it is WebGL1
        #define in varying
        #define finalColor gl_FragColor
        #define texture texture2D
        #endif
        ${i}
        `):`
        
        #ifdef GL_ES // This checks if it is WebGL1
        #define in attribute
        #define out varying
        #endif
        ${i}
        `}function Ch(i,t,e){const n=e?t.maxSupportedFragmentPrecision:t.maxSupportedVertexPrecision;if(i.substring(0,9)!=="precision"){let r=e?t.requestedFragmentPrecision:t.requestedVertexPrecision;return r==="highp"&&n!=="highp"&&(r="mediump"),`precision ${r} float;
${i}`}else if(n!=="highp"&&i.substring(0,15)==="precision highp")return i.replace("precision highp","precision mediump");return i}function Th(i,t){return t?`#version 300 es
${i}`:i}const Ah={},Ph={};function Mh(i,{name:t="pixi-program"},e=!0){t=t.replace(/\s+/g,"-"),t+=e?"-fragment":"-vertex";const n=e?Ah:Ph;return n[t]?(n[t]++,t+=`-${n[t]}`):n[t]=1,i.indexOf("#define SHADER_NAME")!==-1?i:`${`#define SHADER_NAME ${t}`}
${i}`}function Fh(i,t){return t?i.replace("#version 300 es",""):i}const kn={stripVersion:Fh,ensurePrecision:Ch,addProgramDefines:wh,setProgramName:Mh,insertVersion:Th},Ln=Object.create(null),pa=class dr{constructor(t){t={...dr.defaultOptions,...t};const e=t.fragment.indexOf("#version 300 es")!==-1,n={stripVersion:e,ensurePrecision:{requestedFragmentPrecision:t.preferredFragmentPrecision,requestedVertexPrecision:t.preferredVertexPrecision,maxSupportedVertexPrecision:"highp",maxSupportedFragmentPrecision:Sh()},setProgramName:{name:t.name},addProgramDefines:e,insertVersion:e};let r=t.fragment,s=t.vertex;Object.keys(kn).forEach(o=>{const a=n[o];r=kn[o](r,a,!0),s=kn[o](s,a,!1)}),this.fragment=r,this.vertex=s,this.transformFeedbackVaryings=t.transformFeedbackVaryings,this._key=$r(`${this.vertex}:${this.fragment}`,"gl-program")}destroy(){this.fragment=null,this.vertex=null,this._attributeData=null,this._uniformData=null,this._uniformBlockData=null,this.transformFeedbackVaryings=null}static from(t){const e=`${t.vertex}:${t.fragment}`;return Ln[e]||(Ln[e]=new dr(t)),Ln[e]}};pa.defaultOptions={preferredVertexPrecision:"highp",preferredFragmentPrecision:"mediump"};let H=pa;const Bs={uint8x2:{size:2,stride:2,normalised:!1},uint8x4:{size:4,stride:4,normalised:!1},sint8x2:{size:2,stride:2,normalised:!1},sint8x4:{size:4,stride:4,normalised:!1},unorm8x2:{size:2,stride:2,normalised:!0},unorm8x4:{size:4,stride:4,normalised:!0},snorm8x2:{size:2,stride:2,normalised:!0},snorm8x4:{size:4,stride:4,normalised:!0},uint16x2:{size:2,stride:4,normalised:!1},uint16x4:{size:4,stride:8,normalised:!1},sint16x2:{size:2,stride:4,normalised:!1},sint16x4:{size:4,stride:8,normalised:!1},unorm16x2:{size:2,stride:4,normalised:!0},unorm16x4:{size:4,stride:8,normalised:!0},snorm16x2:{size:2,stride:4,normalised:!0},snorm16x4:{size:4,stride:8,normalised:!0},float16x2:{size:2,stride:4,normalised:!1},float16x4:{size:4,stride:8,normalised:!1},float32:{size:1,stride:4,normalised:!1},float32x2:{size:2,stride:8,normalised:!1},float32x3:{size:3,stride:12,normalised:!1},float32x4:{size:4,stride:16,normalised:!1},uint32:{size:1,stride:4,normalised:!1},uint32x2:{size:2,stride:8,normalised:!1},uint32x3:{size:3,stride:12,normalised:!1},uint32x4:{size:4,stride:16,normalised:!1},sint32:{size:1,stride:4,normalised:!1},sint32x2:{size:2,stride:8,normalised:!1},sint32x3:{size:3,stride:12,normalised:!1},sint32x4:{size:4,stride:16,normalised:!1}};function Ih(i){return Bs[i]??Bs.float32}const Oh={f32:"float32","vec2<f32>":"float32x2","vec3<f32>":"float32x3","vec4<f32>":"float32x4",vec2f:"float32x2",vec3f:"float32x3",vec4f:"float32x4",i32:"sint32","vec2<i32>":"sint32x2","vec3<i32>":"sint32x3","vec4<i32>":"sint32x4",u32:"uint32","vec2<u32>":"uint32x2","vec3<u32>":"uint32x3","vec4<u32>":"uint32x4",bool:"uint32","vec2<bool>":"uint32x2","vec3<bool>":"uint32x3","vec4<bool>":"uint32x4"};function Rh({source:i,entryPoint:t}){const e={},n=i.indexOf(`fn ${t}`);if(n!==-1){const r=i.indexOf("->",n);if(r!==-1){const s=i.substring(n,r),o=/@location\((\d+)\)\s+([a-zA-Z0-9_]+)\s*:\s*([a-zA-Z0-9_<>]+)(?:,|\s|$)/g;let a;for(;(a=o.exec(s))!==null;){const l=Oh[a[3]]??"float32";e[a[2]]={location:parseInt(a[1],10),format:l,stride:Ih(l).stride,offset:0,instance:!1,start:0}}}}return e}function Bn(i){const t=/(^|[^/])@(group|binding)\(\d+\)[^;]+;/g,e=/@group\((\d+)\)/,n=/@binding\((\d+)\)/,r=/var(<[^>]+>)? (\w+)/,s=/:\s*(\w+)/,o=/struct\s+(\w+)\s*{([^}]+)}/g,a=/(\w+)\s*:\s*([\w\<\>]+)/g,l=/struct\s+(\w+)/,u=i.match(t)?.map(c=>({group:parseInt(c.match(e)[1],10),binding:parseInt(c.match(n)[1],10),name:c.match(r)[2],isUniform:c.match(r)[1]==="<uniform>",type:c.match(s)[1]}));if(!u)return{groups:[],structs:[]};const h=i.match(o)?.map(c=>{const d=c.match(l)[1],f=c.match(a).reduce((x,v)=>{const[g,y]=v.split(":");return x[g.trim()]=y.trim(),x},{});return f?{name:d,members:f}:null}).filter(({name:c})=>u.some(d=>d.type===c))??[];return{groups:u,structs:h}}var ci=(i=>(i[i.VERTEX=1]="VERTEX",i[i.FRAGMENT=2]="FRAGMENT",i[i.COMPUTE=4]="COMPUTE",i))(ci||{});function Eh({groups:i}){const t=[];for(let e=0;e<i.length;e++){const n=i[e];t[n.group]||(t[n.group]=[]),n.isUniform?t[n.group].push({binding:n.binding,visibility:ci.VERTEX|ci.FRAGMENT,buffer:{type:"uniform"}}):n.type==="sampler"?t[n.group].push({binding:n.binding,visibility:ci.FRAGMENT,sampler:{type:"filtering"}}):n.type==="texture_2d"&&t[n.group].push({binding:n.binding,visibility:ci.FRAGMENT,texture:{sampleType:"float",viewDimension:"2d",multisampled:!1}})}return t}function Uh({groups:i}){const t=[];for(let e=0;e<i.length;e++){const n=i[e];t[n.group]||(t[n.group]={}),t[n.group][n.name]=n.binding}return t}function zh(i,t){const e=new Set,n=new Set,r=[...i.structs,...t.structs].filter(o=>e.has(o.name)?!1:(e.add(o.name),!0)),s=[...i.groups,...t.groups].filter(o=>{const a=`${o.name}-${o.binding}`;return n.has(a)?!1:(n.add(a),!0)});return{structs:r,groups:s}}const Dn=Object.create(null);class W{constructor(t){this._layoutKey=0,this._attributeLocationsKey=0;const{fragment:e,vertex:n,layout:r,gpuLayout:s,name:o}=t;if(this.name=o,this.fragment=e,this.vertex=n,e.source===n.source){const a=Bn(e.source);this.structsAndGroups=a}else{const a=Bn(n.source),l=Bn(e.source);this.structsAndGroups=zh(a,l)}this.layout=r??Uh(this.structsAndGroups),this.gpuLayout=s??Eh(this.structsAndGroups),this.autoAssignGlobalUniforms=this.layout[0]?.globalUniforms!==void 0,this.autoAssignLocalUniforms=this.layout[1]?.localUniforms!==void 0,this._generateProgramKey()}_generateProgramKey(){const{vertex:t,fragment:e}=this,n=t.source+e.source+t.entryPoint+e.entryPoint;this._layoutKey=$r(n,"program")}get attributeData(){return this._attributeData??(this._attributeData=Rh(this.vertex)),this._attributeData}destroy(){this.gpuLayout=null,this.layout=null,this.structsAndGroups=null,this.fragment=null,this.vertex=null}static from(t){const e=`${t.vertex.source}:${t.fragment.source}:${t.fragment.entryPoint}:${t.vertex.entryPoint}`;return Dn[e]||(Dn[e]=new W(t)),Dn[e]}}const ma=["f32","i32","vec2<f32>","vec3<f32>","vec4<f32>","mat2x2<f32>","mat3x3<f32>","mat4x4<f32>","mat3x2<f32>","mat4x2<f32>","mat2x3<f32>","mat4x3<f32>","mat2x4<f32>","mat3x4<f32>","vec2<i32>","vec3<i32>","vec4<i32>"],kh=ma.reduce((i,t)=>(i[t]=!0,i),{});function Lh(i,t){switch(i){case"f32":return 0;case"vec2<f32>":return new Float32Array(2*t);case"vec3<f32>":return new Float32Array(3*t);case"vec4<f32>":return new Float32Array(4*t);case"mat2x2<f32>":return new Float32Array([1,0,0,1]);case"mat3x3<f32>":return new Float32Array([1,0,0,0,1,0,0,0,1]);case"mat4x4<f32>":return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1])}return null}const ga=class xa{constructor(t,e){this._touched=0,this.uid=St("uniform"),this._resourceType="uniformGroup",this._resourceId=St("resource"),this.isUniformGroup=!0,this._dirtyId=0,this.destroyed=!1,e={...xa.defaultOptions,...e},this.uniformStructures=t;const n={};for(const r in t){const s=t[r];if(s.name=r,s.size=s.size??1,!kh[s.type])throw new Error(`Uniform type ${s.type} is not supported. Supported uniform types are: ${ma.join(", ")}`);s.value??(s.value=Lh(s.type,s.size)),n[r]=s.value}this.uniforms=n,this._dirtyId=1,this.ubo=e.ubo,this.isStatic=e.isStatic,this._signature=$r(Object.keys(n).map(r=>`${r}-${t[r].type}`).join("-"),"uniform-group")}update(){this._dirtyId++}};ga.defaultOptions={ubo:!1,isStatic:!1};let Hr=ga;class Vi{constructor(t){this.resources=Object.create(null),this._dirty=!0;let e=0;for(const n in t){const r=t[n];this.setResource(r,e++)}this._updateKey()}_updateKey(){if(!this._dirty)return;this._dirty=!1;const t=[];let e=0;for(const n in this.resources)t[e++]=this.resources[n]._resourceId;this._key=t.join("|")}setResource(t,e){const n=this.resources[e];t!==n&&(n&&t.off?.("change",this.onResourceChange,this),t.on?.("change",this.onResourceChange,this),this.resources[e]=t,this._dirty=!0)}getResource(t){return this.resources[t]}_touch(t){const e=this.resources;for(const n in e)e[n]._touched=t}destroy(){const t=this.resources;for(const e in t)t[e].off?.("change",this.onResourceChange,this);this.resources=null}onResourceChange(t){if(this._dirty=!0,t.destroyed){const e=this.resources;for(const n in e)e[n]===t&&(e[n]=null)}else this._updateKey()}}var on=(i=>(i[i.WEBGL=1]="WEBGL",i[i.WEBGPU=2]="WEBGPU",i[i.BOTH=3]="BOTH",i))(on||{});class pn extends Ot{constructor(t){super(),this._uniformBindMap=Object.create(null),this._ownedBindGroups=[];let{gpuProgram:e,glProgram:n,groups:r,resources:s,compatibleRenderers:o,groupMap:a}=t;this.gpuProgram=e,this.glProgram=n,o===void 0&&(o=0,e&&(o|=on.WEBGPU),n&&(o|=on.WEBGL)),this.compatibleRenderers=o;const l={};if(!s&&!r&&(s={}),s&&r)throw new Error("[Shader] Cannot have both resources and groups");if(!e&&r&&!a)throw new Error("[Shader] No group map or WebGPU shader provided - consider using resources instead.");if(!e&&r&&a)for(const u in a)for(const h in a[u]){const c=a[u][h];l[c]={group:u,binding:h,name:c}}else if(e&&r&&!a){const u=e.structsAndGroups.groups;a={},u.forEach(h=>{a[h.group]=a[h.group]||{},a[h.group][h.binding]=h.name,l[h.name]=h})}else if(s){r={},a={},e&&e.structsAndGroups.groups.forEach(c=>{a[c.group]=a[c.group]||{},a[c.group][c.binding]=c.name,l[c.name]=c});let u=0;for(const h in s)l[h]||(r[99]||(r[99]=new Vi,this._ownedBindGroups.push(r[99])),l[h]={group:99,binding:u,name:h},a[99]=a[99]||{},a[99][u]=h,u++);for(const h in s){const c=h;let d=s[h];!d.source&&!d._resourceType&&(d=new Hr(d));const f=l[c];f&&(r[f.group]||(r[f.group]=new Vi,this._ownedBindGroups.push(r[f.group])),r[f.group].setResource(d,f.binding))}}this.groups=r,this._uniformBindMap=a,this.resources=this._buildResourceAccessor(r,l)}addResource(t,e,n){var r,s;(r=this._uniformBindMap)[e]||(r[e]={}),(s=this._uniformBindMap[e])[n]||(s[n]=t),this.groups[e]||(this.groups[e]=new Vi,this._ownedBindGroups.push(this.groups[e]))}_buildResourceAccessor(t,e){const n={};for(const r in e){const s=e[r];Object.defineProperty(n,s.name,{get(){return t[s.group].getResource(s.binding)},set(o){t[s.group].setResource(o,s.binding)}})}return n}destroy(t=!1){this.emit("destroy",this),t&&(this.gpuProgram?.destroy(),this.glProgram?.destroy()),this.gpuProgram=null,this.glProgram=null,this.removeAllListeners(),this._uniformBindMap=null,this._ownedBindGroups.forEach(e=>{e.destroy()}),this._ownedBindGroups=null,this.resources=null,this.groups=null}static from(t){const{gpu:e,gl:n,...r}=t;let s,o;return e&&(s=W.from(e)),n&&(o=H.from(n)),new pn({gpuProgram:s,glProgram:o,...r})}}const Bh={normal:0,add:1,multiply:2,screen:3,overlay:4,erase:5,"normal-npm":6,"add-npm":7,"screen-npm":8,min:9,max:10},Nn=0,Gn=1,Vn=2,Wn=3,$n=4,Hn=5,pr=class _a{constructor(){this.data=0,this.blendMode="normal",this.polygonOffset=0,this.blend=!0,this.depthMask=!0}get blend(){return!!(this.data&1<<Nn)}set blend(t){!!(this.data&1<<Nn)!==t&&(this.data^=1<<Nn)}get offsets(){return!!(this.data&1<<Gn)}set offsets(t){!!(this.data&1<<Gn)!==t&&(this.data^=1<<Gn)}set cullMode(t){if(t==="none"){this.culling=!1;return}this.culling=!0,this.clockwiseFrontFace=t==="front"}get cullMode(){return this.culling?this.clockwiseFrontFace?"front":"back":"none"}get culling(){return!!(this.data&1<<Vn)}set culling(t){!!(this.data&1<<Vn)!==t&&(this.data^=1<<Vn)}get depthTest(){return!!(this.data&1<<Wn)}set depthTest(t){!!(this.data&1<<Wn)!==t&&(this.data^=1<<Wn)}get depthMask(){return!!(this.data&1<<Hn)}set depthMask(t){!!(this.data&1<<Hn)!==t&&(this.data^=1<<Hn)}get clockwiseFrontFace(){return!!(this.data&1<<$n)}set clockwiseFrontFace(t){!!(this.data&1<<$n)!==t&&(this.data^=1<<$n)}get blendMode(){return this._blendMode}set blendMode(t){this.blend=t!=="none",this._blendMode=t,this._blendModeId=Bh[t]||0}get polygonOffset(){return this._polygonOffset}set polygonOffset(t){this.offsets=!!t,this._polygonOffset=t}toString(){return`[pixi.js/core:State blendMode=${this.blendMode} clockwiseFrontFace=${this.clockwiseFrontFace} culling=${this.culling} depthMask=${this.depthMask} polygonOffset=${this.polygonOffset}]`}static for2d(){const t=new _a;return t.depthTest=!1,t.blend=!0,t}};pr.default2d=pr.for2d();let Dh=pr;const va=class mr extends pn{constructor(t){t={...mr.defaultOptions,...t},super(t),this.enabled=!0,this._state=Dh.for2d(),this.blendMode=t.blendMode,this.padding=t.padding,typeof t.antialias=="boolean"?this.antialias=t.antialias?"on":"off":this.antialias=t.antialias,this.resolution=t.resolution,this.blendRequired=t.blendRequired,this.clipToViewport=t.clipToViewport,this.addResource("uTexture",0,1)}apply(t,e,n,r){t.applyFilter(this,e,n,r)}get blendMode(){return this._state.blendMode}set blendMode(t){this._state.blendMode=t}static from(t){const{gpu:e,gl:n,...r}=t;let s,o;return e&&(s=W.from(e)),n&&(o=H.from(n)),new mr({gpuProgram:s,glProgram:o,...r})}};va.defaultOptions={blendMode:"normal",resolution:1,padding:0,antialias:"off",blendRequired:!1,clipToViewport:!0};let Y=va;const gr=[];It.handleByNamedList(U.Environment,gr);async function Nh(i){if(!i)for(let t=0;t<gr.length;t++){const e=gr[t];if(e.value.test()){await e.value.load();return}}}let Ke;function Gh(){if(typeof Ke=="boolean")return Ke;try{Ke=new Function("param1","param2","param3","return param1[param2] === param3;")({a:"b"},"a","b")===!0}catch{Ke=!1}return Ke}var Ei={exports:{}},Ds;function Vh(){if(Ds)return Ei.exports;Ds=1,Ei.exports=i,Ei.exports.default=i;function i(p,m,_){_=_||2;var b=m&&m.length,C=b?m[0]*_:p.length,P=t(p,0,C,_,!0),F=[];if(!P||P.next===P.prev)return F;var O,N,L,st,ot,j,xt;if(b&&(P=l(p,m,P,_)),p.length>80*_){O=L=p[0],N=st=p[1];for(var et=_;et<C;et+=_)ot=p[et],j=p[et+1],ot<O&&(O=ot),j<N&&(N=j),ot>L&&(L=ot),j>st&&(st=j);xt=Math.max(L-O,st-N),xt=xt!==0?32767/xt:0}return n(P,F,_,O,N,xt,0),F}function t(p,m,_,b,C){var P,F;if(C===wt(p,m,_,b)>0)for(P=m;P<_;P+=b)F=ut(P,p[P],p[P+1],F);else for(P=_-b;P>=m;P-=b)F=ut(P,p[P],p[P+1],F);return F&&T(F,F.next)&&(J(F),F=F.next),F}function e(p,m){if(!p)return p;m||(m=p);var _=p,b;do if(b=!1,!_.steiner&&(T(_,_.next)||w(_.prev,_,_.next)===0)){if(J(_),_=m=_.prev,_===_.next)break;b=!0}else _=_.next;while(b||_!==m);return m}function n(p,m,_,b,C,P,F){if(p){!F&&P&&f(p,b,C,P);for(var O=p,N,L;p.prev!==p.next;){if(N=p.prev,L=p.next,P?s(p,b,C,P):r(p)){m.push(N.i/_|0),m.push(p.i/_|0),m.push(L.i/_|0),J(p),p=L.next,O=L.next;continue}if(p=L,p===O){F?F===1?(p=o(e(p),m,_),n(p,m,_,b,C,P,2)):F===2&&a(p,m,_,b,C,P):n(e(p),m,_,b,C,P,1);break}}}}function r(p){var m=p.prev,_=p,b=p.next;if(w(m,_,b)>=0)return!1;for(var C=m.x,P=_.x,F=b.x,O=m.y,N=_.y,L=b.y,st=C<P?C<F?C:F:P<F?P:F,ot=O<N?O<L?O:L:N<L?N:L,j=C>P?C>F?C:F:P>F?P:F,xt=O>N?O>L?O:L:N>L?N:L,et=b.next;et!==m;){if(et.x>=st&&et.x<=j&&et.y>=ot&&et.y<=xt&&y(C,O,P,N,F,L,et.x,et.y)&&w(et.prev,et,et.next)>=0)return!1;et=et.next}return!0}function s(p,m,_,b){var C=p.prev,P=p,F=p.next;if(w(C,P,F)>=0)return!1;for(var O=C.x,N=P.x,L=F.x,st=C.y,ot=P.y,j=F.y,xt=O<N?O<L?O:L:N<L?N:L,et=st<ot?st<j?st:j:ot<j?ot:j,ee=O>N?O>L?O:L:N>L?N:L,kt=st>ot?st>j?st:j:ot>j?ot:j,Yt=v(xt,et,m,_,b),jt=v(ee,kt,m,_,b),$=p.prevZ,Z=p.nextZ;$&&$.z>=Yt&&Z&&Z.z<=jt;){if($.x>=xt&&$.x<=ee&&$.y>=et&&$.y<=kt&&$!==C&&$!==F&&y(O,st,N,ot,L,j,$.x,$.y)&&w($.prev,$,$.next)>=0||($=$.prevZ,Z.x>=xt&&Z.x<=ee&&Z.y>=et&&Z.y<=kt&&Z!==C&&Z!==F&&y(O,st,N,ot,L,j,Z.x,Z.y)&&w(Z.prev,Z,Z.next)>=0))return!1;Z=Z.nextZ}for(;$&&$.z>=Yt;){if($.x>=xt&&$.x<=ee&&$.y>=et&&$.y<=kt&&$!==C&&$!==F&&y(O,st,N,ot,L,j,$.x,$.y)&&w($.prev,$,$.next)>=0)return!1;$=$.prevZ}for(;Z&&Z.z<=jt;){if(Z.x>=xt&&Z.x<=ee&&Z.y>=et&&Z.y<=kt&&Z!==C&&Z!==F&&y(O,st,N,ot,L,j,Z.x,Z.y)&&w(Z.prev,Z,Z.next)>=0)return!1;Z=Z.nextZ}return!0}function o(p,m,_){var b=p;do{var C=b.prev,P=b.next.next;!T(C,P)&&I(C,b,b.next,P)&&G(C,P)&&G(P,C)&&(m.push(C.i/_|0),m.push(b.i/_|0),m.push(P.i/_|0),J(b),J(b.next),b=p=P),b=b.next}while(b!==p);return e(b)}function a(p,m,_,b,C,P){var F=p;do{for(var O=F.next.next;O!==F.prev;){if(F.i!==O.i&&S(F,O)){var N=E(F,O);F=e(F,F.next),N=e(N,N.next),n(F,m,_,b,C,P,0),n(N,m,_,b,C,P,0);return}O=O.next}F=F.next}while(F!==p)}function l(p,m,_,b){var C=[],P,F,O,N,L;for(P=0,F=m.length;P<F;P++)O=m[P]*b,N=P<F-1?m[P+1]*b:p.length,L=t(p,O,N,b,!1),L===L.next&&(L.steiner=!0),C.push(g(L));for(C.sort(u),P=0;P<C.length;P++)_=h(C[P],_);return _}function u(p,m){return p.x-m.x}function h(p,m){var _=c(p,m);if(!_)return m;var b=E(_,p);return e(b,b.next),e(_,_.next)}function c(p,m){var _=m,b=p.x,C=p.y,P=-1/0,F;do{if(C<=_.y&&C>=_.next.y&&_.next.y!==_.y){var O=_.x+(C-_.y)*(_.next.x-_.x)/(_.next.y-_.y);if(O<=b&&O>P&&(P=O,F=_.x<_.next.x?_:_.next,O===b))return F}_=_.next}while(_!==m);if(!F)return null;var N=F,L=F.x,st=F.y,ot=1/0,j;_=F;do b>=_.x&&_.x>=L&&b!==_.x&&y(C<st?b:P,C,L,st,C<st?P:b,C,_.x,_.y)&&(j=Math.abs(C-_.y)/(b-_.x),G(_,p)&&(j<ot||j===ot&&(_.x>F.x||_.x===F.x&&d(F,_)))&&(F=_,ot=j)),_=_.next;while(_!==N);return F}function d(p,m){return w(p.prev,p,m.prev)<0&&w(m.next,p,p.next)<0}function f(p,m,_,b){var C=p;do C.z===0&&(C.z=v(C.x,C.y,m,_,b)),C.prevZ=C.prev,C.nextZ=C.next,C=C.next;while(C!==p);C.prevZ.nextZ=null,C.prevZ=null,x(C)}function x(p){var m,_,b,C,P,F,O,N,L=1;do{for(_=p,p=null,P=null,F=0;_;){for(F++,b=_,O=0,m=0;m<L&&(O++,b=b.nextZ,!!b);m++);for(N=L;O>0||N>0&&b;)O!==0&&(N===0||!b||_.z<=b.z)?(C=_,_=_.nextZ,O--):(C=b,b=b.nextZ,N--),P?P.nextZ=C:p=C,C.prevZ=P,P=C;_=b}P.nextZ=null,L*=2}while(F>1);return p}function v(p,m,_,b,C){return p=(p-_)*C|0,m=(m-b)*C|0,p=(p|p<<8)&16711935,p=(p|p<<4)&252645135,p=(p|p<<2)&858993459,p=(p|p<<1)&1431655765,m=(m|m<<8)&16711935,m=(m|m<<4)&252645135,m=(m|m<<2)&858993459,m=(m|m<<1)&1431655765,p|m<<1}function g(p){var m=p,_=p;do(m.x<_.x||m.x===_.x&&m.y<_.y)&&(_=m),m=m.next;while(m!==p);return _}function y(p,m,_,b,C,P,F,O){return(C-F)*(m-O)>=(p-F)*(P-O)&&(p-F)*(b-O)>=(_-F)*(m-O)&&(_-F)*(P-O)>=(C-F)*(b-O)}function S(p,m){return p.next.i!==m.i&&p.prev.i!==m.i&&!D(p,m)&&(G(p,m)&&G(m,p)&&R(p,m)&&(w(p.prev,p,m.prev)||w(p,m.prev,m))||T(p,m)&&w(p.prev,p,p.next)>0&&w(m.prev,m,m.next)>0)}function w(p,m,_){return(m.y-p.y)*(_.x-m.x)-(m.x-p.x)*(_.y-m.y)}function T(p,m){return p.x===m.x&&p.y===m.y}function I(p,m,_,b){var C=M(w(p,m,_)),P=M(w(p,m,b)),F=M(w(_,b,p)),O=M(w(_,b,m));return!!(C!==P&&F!==O||C===0&&A(p,_,m)||P===0&&A(p,b,m)||F===0&&A(_,p,b)||O===0&&A(_,m,b))}function A(p,m,_){return m.x<=Math.max(p.x,_.x)&&m.x>=Math.min(p.x,_.x)&&m.y<=Math.max(p.y,_.y)&&m.y>=Math.min(p.y,_.y)}function M(p){return p>0?1:p<0?-1:0}function D(p,m){var _=p;do{if(_.i!==p.i&&_.next.i!==p.i&&_.i!==m.i&&_.next.i!==m.i&&I(_,_.next,p,m))return!0;_=_.next}while(_!==p);return!1}function G(p,m){return w(p.prev,p,p.next)<0?w(p,m,p.next)>=0&&w(p,p.prev,m)>=0:w(p,m,p.prev)<0||w(p,p.next,m)<0}function R(p,m){var _=p,b=!1,C=(p.x+m.x)/2,P=(p.y+m.y)/2;do _.y>P!=_.next.y>P&&_.next.y!==_.y&&C<(_.next.x-_.x)*(P-_.y)/(_.next.y-_.y)+_.x&&(b=!b),_=_.next;while(_!==p);return b}function E(p,m){var _=new tt(p.i,p.x,p.y),b=new tt(m.i,m.x,m.y),C=p.next,P=m.prev;return p.next=m,m.prev=p,_.next=C,C.prev=_,b.next=_,_.prev=b,P.next=b,b.prev=P,b}function ut(p,m,_,b){var C=new tt(p,m,_);return b?(C.next=b.next,C.prev=b,b.next.prev=C,b.next=C):(C.prev=C,C.next=C),C}function J(p){p.next.prev=p.prev,p.prev.next=p.next,p.prevZ&&(p.prevZ.nextZ=p.nextZ),p.nextZ&&(p.nextZ.prevZ=p.prevZ)}function tt(p,m,_){this.i=p,this.x=m,this.y=_,this.prev=null,this.next=null,this.z=0,this.prevZ=null,this.nextZ=null,this.steiner=!1}i.deviation=function(p,m,_,b){var C=m&&m.length,P=C?m[0]*_:p.length,F=Math.abs(wt(p,0,P,_));if(C)for(var O=0,N=m.length;O<N;O++){var L=m[O]*_,st=O<N-1?m[O+1]*_:p.length;F-=Math.abs(wt(p,L,st,_))}var ot=0;for(O=0;O<b.length;O+=3){var j=b[O]*_,xt=b[O+1]*_,et=b[O+2]*_;ot+=Math.abs((p[j]-p[et])*(p[xt+1]-p[j+1])-(p[j]-p[xt])*(p[et+1]-p[j+1]))}return F===0&&ot===0?0:Math.abs((ot-F)/F)};function wt(p,m,_,b){for(var C=0,P=m,F=_-b;P<_;P+=b)C+=(p[F]-p[P])*(p[P+1]+p[F+1]),F=P;return C}return i.flatten=function(p){for(var m=p[0][0].length,_={vertices:[],holes:[],dimensions:m},b=0,C=0;C<p.length;C++){for(var P=0;P<p[C].length;P++)for(var F=0;F<m;F++)_.vertices.push(p[C][P][F]);C>0&&(b+=p[C-1].length,_.holes.push(b))}return _},Ei.exports}var Wh=Vh();const $h=Br(Wh);var ya=(i=>(i[i.NONE=0]="NONE",i[i.COLOR=16384]="COLOR",i[i.STENCIL=1024]="STENCIL",i[i.DEPTH=256]="DEPTH",i[i.COLOR_DEPTH=16640]="COLOR_DEPTH",i[i.COLOR_STENCIL=17408]="COLOR_STENCIL",i[i.DEPTH_STENCIL=1280]="DEPTH_STENCIL",i[i.ALL=17664]="ALL",i))(ya||{});class Hh{constructor(t){this.items=[],this._name=t}emit(t,e,n,r,s,o,a,l){const{name:u,items:h}=this;for(let c=0,d=h.length;c<d;c++)h[c][u](t,e,n,r,s,o,a,l);return this}add(t){return t[this._name]&&(this.remove(t),this.items.push(t)),this}remove(t){const e=this.items.indexOf(t);return e!==-1&&this.items.splice(e,1),this}contains(t){return this.items.indexOf(t)!==-1}removeAll(){return this.items.length=0,this}destroy(){this.removeAll(),this.items=null,this._name=null}get empty(){return this.items.length===0}get name(){return this._name}}const Xh=["init","destroy","contextChange","resolutionChange","reset","renderEnd","renderStart","render","update","postrender","prerender"],ba=class Sa extends Ot{constructor(t){super(),this.runners=Object.create(null),this.renderPipes=Object.create(null),this._initOptions={},this._systemsHash=Object.create(null),this.type=t.type,this.name=t.name,this.config=t;const e=[...Xh,...this.config.runners??[]];this._addRunners(...e),this._unsafeEvalCheck()}async init(t={}){const e=t.skipExtensionImports===!0?!0:t.manageImports===!1;await Nh(e),this._addSystems(this.config.systems),this._addPipes(this.config.renderPipes,this.config.renderPipeAdaptors);for(const n in this._systemsHash)t={...this._systemsHash[n].constructor.defaultOptions,...t};t={...Sa.defaultOptions,...t},this._roundPixels=t.roundPixels?1:0;for(let n=0;n<this.runners.init.items.length;n++)await this.runners.init.items[n].init(t);this._initOptions=t}render(t,e){let n=t;if(n instanceof X&&(n={container:n},e&&(B(pt,"passing a second argument is deprecated, please use render options instead"),n.target=e.renderTexture)),n.target||(n.target=this.view.renderTarget),n.target===this.view.renderTarget&&(this._lastObjectRendered=n.container,n.clearColor=this.background.colorRgba),n.clearColor){const r=Array.isArray(n.clearColor)&&n.clearColor.length===4;n.clearColor=r?n.clearColor:K.shared.setValue(n.clearColor).toArray()}n.transform||(n.container.updateLocalTransform(),n.transform=n.container.localTransform),n.container.enableRenderGroup(),this.runners.prerender.emit(n),this.runners.renderStart.emit(n),this.runners.render.emit(n),this.runners.renderEnd.emit(n),this.runners.postrender.emit(n)}resize(t,e,n){const r=this.view.resolution;this.view.resize(t,e,n),this.emit("resize",this.view.screen.width,this.view.screen.height,this.view.resolution),n!==void 0&&n!==r&&this.runners.resolutionChange.emit(n)}clear(t={}){const e=this;t.target||(t.target=e.renderTarget.renderTarget),t.clearColor||(t.clearColor=this.background.colorRgba),t.clear??(t.clear=ya.ALL);const{clear:n,clearColor:r,target:s}=t;K.shared.setValue(r??this.background.colorRgba),e.renderTarget.clear(s,n,K.shared.toArray())}get resolution(){return this.view.resolution}set resolution(t){this.view.resolution=t,this.runners.resolutionChange.emit(t)}get width(){return this.view.texture.frame.width}get height(){return this.view.texture.frame.height}get canvas(){return this.view.canvas}get lastObjectRendered(){return this._lastObjectRendered}get renderingToScreen(){return this.renderTarget.renderingToScreen}get screen(){return this.view.screen}_addRunners(...t){t.forEach(e=>{this.runners[e]=new Hh(e)})}_addSystems(t){let e;for(e in t){const n=t[e];this._addSystem(n.value,n.name)}}_addSystem(t,e){const n=new t(this);if(this[e])throw new Error(`Whoops! The name "${e}" is already in use`);this[e]=n,this._systemsHash[e]=n;for(const r in this.runners)this.runners[r].add(n);return this}_addPipes(t,e){const n=e.reduce((r,s)=>(r[s.name]=s.value,r),{});t.forEach(r=>{const s=r.value,o=r.name,a=n[o];this.renderPipes[o]=new s(this,a?new a:null)})}destroy(t=!1){this.runners.destroy.items.reverse(),this.runners.destroy.emit(t),Object.values(this.runners).forEach(e=>{e.destroy()}),this._systemsHash=null,this.renderPipes=null}generateTexture(t){return this.textureGenerator.generateTexture(t)}get roundPixels(){return!!this._roundPixels}_unsafeEvalCheck(){if(!Gh())throw new Error("Current environment does not allow unsafe-eval, please use pixi.js/unsafe-eval module to enable support.")}};ba.defaultOptions={resolution:1,failIfMajorPerformanceCaveat:!1,roundPixels:!1};let wa=ba,Ui;function Yh(i){return Ui!==void 0||(Ui=(()=>{const t={stencil:!0,failIfMajorPerformanceCaveat:i??wa.defaultOptions.failIfMajorPerformanceCaveat};try{if(!ft.get().getWebGLRenderingContext())return!1;let n=ft.get().createCanvas().getContext("webgl",t);const r=!!n?.getContextAttributes()?.stencil;if(n){const s=n.getExtension("WEBGL_lose_context");s&&s.loseContext()}return n=null,r}catch{return!1}})()),Ui}let zi;async function jh(i={}){return zi!==void 0||(zi=await(async()=>{const t=ft.get().getNavigator().gpu;if(!t)return!1;try{return await(await t.requestAdapter(i)).requestDevice(),!0}catch{return!1}})()),zi}const Ns=["webgl","webgpu","canvas"];async function qh(i){let t=[];i.preference?(t.push(i.preference),Ns.forEach(s=>{s!==i.preference&&t.push(s)})):t=Ns.slice();let e,n={};for(let s=0;s<t.length;s++){const o=t[s];if(o==="webgpu"&&await jh()){const{WebGPURenderer:a}=await en(async()=>{const{WebGPURenderer:l}=await import("./WebGPURenderer-BdjS5krr.js");return{WebGPURenderer:l}},__vite__mapDeps([3,2,4]));e=a,n={...i,...i.webgpu};break}else if(o==="webgl"&&Yh(i.failIfMajorPerformanceCaveat??wa.defaultOptions.failIfMajorPerformanceCaveat)){const{WebGLRenderer:a}=await en(async()=>{const{WebGLRenderer:l}=await import("./WebGLRenderer-1pZBDciL.js");return{WebGLRenderer:l}},__vite__mapDeps([5,2,4]));e=a,n={...i,...i.webgl};break}else if(o==="canvas")throw n={...i},new Error("CanvasRenderer is not yet implemented")}if(delete n.webgpu,delete n.webgl,!e)throw new Error("No available renderer for the current environment");const r=new e;return await r.init(n),r}const Ca="8.6.6";class Ta{static init(){globalThis.__PIXI_APP_INIT__?.(this,Ca)}static destroy(){}}Ta.extension=U.Application;class Kh{constructor(t){this._renderer=t}init(){globalThis.__PIXI_RENDERER_INIT__?.(this._renderer,Ca)}destroy(){this._renderer=null}}Kh.extension={type:[U.WebGLSystem,U.WebGPUSystem],name:"initHook",priority:-10};const Aa=class xr{constructor(...t){this.stage=new X,t[0]!==void 0&&B(pt,"Application constructor options are deprecated, please use Application.init() instead.")}async init(t){t={...t},this.renderer=await qh(t),xr._plugins.forEach(e=>{e.init.call(this,t)})}render(){this.renderer.render({container:this.stage})}get canvas(){return this.renderer.canvas}get view(){return B(pt,"Application.view is deprecated, please use Application.canvas instead."),this.renderer.canvas}get screen(){return this.renderer.screen}destroy(t=!1,e=!1){const n=xr._plugins.slice(0);n.reverse(),n.forEach(r=>{r.destroy.call(this)}),this.stage.destroy(e),this.stage=null,this.renderer.destroy(t),this.renderer=null}};Aa._plugins=[];let Pa=Aa;It.handleByList(U.Application,Pa._plugins);It.add(Ta);class Ma extends Ot{constructor(){super(...arguments),this.chars=Object.create(null),this.lineHeight=0,this.fontFamily="",this.fontMetrics={fontSize:0,ascent:0,descent:0},this.baseLineOffset=0,this.distanceField={type:"none",range:0},this.pages=[],this.applyFillAsTint=!0,this.baseMeasurementFontSize=100,this.baseRenderedFontSize=100}get font(){return B(pt,"BitmapFont.font is deprecated, please use BitmapFont.fontFamily instead."),this.fontFamily}get pageTextures(){return B(pt,"BitmapFont.pageTextures is deprecated, please use BitmapFont.pages instead."),this.pages}get size(){return B(pt,"BitmapFont.size is deprecated, please use BitmapFont.fontMetrics.fontSize instead."),this.fontMetrics.fontSize}get distanceFieldRange(){return B(pt,"BitmapFont.distanceFieldRange is deprecated, please use BitmapFont.distanceField.range instead."),this.distanceField.range}get distanceFieldType(){return B(pt,"BitmapFont.distanceFieldType is deprecated, please use BitmapFont.distanceField.type instead."),this.distanceField.type}destroy(t=!1){this.emit("destroy",this),this.removeAllListeners();for(const e in this.chars)this.chars[e].texture?.destroy();this.chars=null,t&&(this.pages.forEach(e=>e.texture.destroy(!0)),this.pages=null)}}const Fa=class _r{constructor(t,e,n,r){this.uid=St("fillGradient"),this.type="linear",this.gradientStops=[],this._styleKey=null,this.x0=t,this.y0=e,this.x1=n,this.y1=r}addColorStop(t,e){return this.gradientStops.push({offset:t,color:K.shared.setValue(e).toHexa()}),this._styleKey=null,this}buildLinearGradient(){if(this.texture)return;const t=_r.defaultTextureSize,{gradientStops:e}=this,n=ft.get().createCanvas();n.width=t,n.height=t;const r=n.getContext("2d"),s=r.createLinearGradient(0,0,_r.defaultTextureSize,1);for(let v=0;v<e.length;v++){const g=e[v];s.addColorStop(g.offset,g.color)}r.fillStyle=s,r.fillRect(0,0,t,t),this.texture=new k({source:new Ae({resource:n,addressModeU:"clamp-to-edge",addressModeV:"repeat"})});const{x0:o,y0:a,x1:l,y1:u}=this,h=new Q,c=l-o,d=u-a,f=Math.sqrt(c*c+d*d),x=Math.atan2(d,c);h.translate(-o,-a),h.scale(1/t,1/t),h.rotate(-x),h.scale(256/f,1),this.transform=h,this._styleKey=null}get styleKey(){if(this._styleKey)return this._styleKey;const t=this.gradientStops.map(r=>`${r.offset}-${r.color}`).join("-"),e=this.texture.uid,n=this.transform.toArray().join("-");return`fill-gradient-${this.uid}-${t}-${e}-${n}-${this.x0}-${this.y0}-${this.x1}-${this.y1}`}};Fa.defaultTextureSize=256;let xi=Fa;const Gs={repeat:{addressModeU:"repeat",addressModeV:"repeat"},"repeat-x":{addressModeU:"repeat",addressModeV:"clamp-to-edge"},"repeat-y":{addressModeU:"clamp-to-edge",addressModeV:"repeat"},"no-repeat":{addressModeU:"clamp-to-edge",addressModeV:"clamp-to-edge"}};class mn{constructor(t,e){this.uid=St("fillPattern"),this.transform=new Q,this._styleKey=null,this.texture=t,this.transform.scale(1/t.frame.width,1/t.frame.height),e&&(t.source.style.addressModeU=Gs[e].addressModeU,t.source.style.addressModeV=Gs[e].addressModeV)}setTransform(t){const e=this.texture;this.transform.copyFrom(t),this.transform.invert(),this.transform.scale(1/e.frame.width,1/e.frame.height),this._styleKey=null}get styleKey(){return this._styleKey?this._styleKey:(this._styleKey=`fill-pattern-${this.uid}-${this.texture.uid}-${this.transform.toArray().join("-")}`,this._styleKey)}}var Xn,Vs;function Zh(){if(Vs)return Xn;Vs=1,Xn=e;var i={a:7,c:6,h:1,l:2,m:2,q:4,s:4,t:2,v:1,z:0},t=/([astvzqmhlc])([^astvzqmhlc]*)/ig;function e(s){var o=[];return s.replace(t,function(a,l,u){var h=l.toLowerCase();for(u=r(u),h=="m"&&u.length>2&&(o.push([l].concat(u.splice(0,2))),h="l",l=l=="m"?"l":"L");;){if(u.length==i[h])return u.unshift(l),o.push(u);if(u.length<i[h])throw new Error("malformed path data");o.push([l].concat(u.splice(0,i[h])))}}),o}var n=/-?[0-9]*\.?[0-9]+(?:e[-+]?\d+)?/ig;function r(s){var o=s.match(n);return o?o.map(Number):[]}return Xn}var Qh=Zh();const Jh=Br(Qh);function tc(i,t){const e=Jh(i),n=[];let r=null,s=0,o=0;for(let a=0;a<e.length;a++){const l=e[a],u=l[0],h=l;switch(u){case"M":s=h[1],o=h[2],t.moveTo(s,o);break;case"m":s+=h[1],o+=h[2],t.moveTo(s,o);break;case"H":s=h[1],t.lineTo(s,o);break;case"h":s+=h[1],t.lineTo(s,o);break;case"V":o=h[1],t.lineTo(s,o);break;case"v":o+=h[1],t.lineTo(s,o);break;case"L":s=h[1],o=h[2],t.lineTo(s,o);break;case"l":s+=h[1],o+=h[2],t.lineTo(s,o);break;case"C":s=h[5],o=h[6],t.bezierCurveTo(h[1],h[2],h[3],h[4],s,o);break;case"c":t.bezierCurveTo(s+h[1],o+h[2],s+h[3],o+h[4],s+h[5],o+h[6]),s+=h[5],o+=h[6];break;case"S":s=h[3],o=h[4],t.bezierCurveToShort(h[1],h[2],s,o);break;case"s":t.bezierCurveToShort(s+h[1],o+h[2],s+h[3],o+h[4]),s+=h[3],o+=h[4];break;case"Q":s=h[3],o=h[4],t.quadraticCurveTo(h[1],h[2],s,o);break;case"q":t.quadraticCurveTo(s+h[1],o+h[2],s+h[3],o+h[4]),s+=h[3],o+=h[4];break;case"T":s=h[1],o=h[2],t.quadraticCurveToShort(s,o);break;case"t":s+=h[1],o+=h[2],t.quadraticCurveToShort(s,o);break;case"A":s=h[6],o=h[7],t.arcToSvg(h[1],h[2],h[3],h[4],h[5],s,o);break;case"a":s+=h[6],o+=h[7],t.arcToSvg(h[1],h[2],h[3],h[4],h[5],s,o);break;case"Z":case"z":t.closePath(),n.length>0&&(r=n.pop(),r?(s=r.startX,o=r.startY):(s=0,o=0)),r=null;break;default:vt(`Unknown SVG path command: ${u}`)}u!=="Z"&&u!=="z"&&r===null&&(r={startX:s,startY:o},n.push(r))}return t}class Xr{constructor(t=0,e=0,n=0){this.type="circle",this.x=t,this.y=e,this.radius=n}clone(){return new Xr(this.x,this.y,this.radius)}contains(t,e){if(this.radius<=0)return!1;const n=this.radius*this.radius;let r=this.x-t,s=this.y-e;return r*=r,s*=s,r+s<=n}strokeContains(t,e,n,r=.5){if(this.radius===0)return!1;const s=this.x-t,o=this.y-e,a=this.radius,l=(1-r)*n,u=Math.sqrt(s*s+o*o);return u<=a+l&&u>a-(n-l)}getBounds(t){return t||(t=new _t),t.x=this.x-this.radius,t.y=this.y-this.radius,t.width=this.radius*2,t.height=this.radius*2,t}copyFrom(t){return this.x=t.x,this.y=t.y,this.radius=t.radius,this}copyTo(t){return t.copyFrom(this),t}toString(){return`[pixi.js/math:Circle x=${this.x} y=${this.y} radius=${this.radius}]`}}class Yr{constructor(t=0,e=0,n=0,r=0){this.type="ellipse",this.x=t,this.y=e,this.halfWidth=n,this.halfHeight=r}clone(){return new Yr(this.x,this.y,this.halfWidth,this.halfHeight)}contains(t,e){if(this.halfWidth<=0||this.halfHeight<=0)return!1;let n=(t-this.x)/this.halfWidth,r=(e-this.y)/this.halfHeight;return n*=n,r*=r,n+r<=1}strokeContains(t,e,n,r=.5){const{halfWidth:s,halfHeight:o}=this;if(s<=0||o<=0)return!1;const a=n*(1-r),l=n-a,u=s-l,h=o-l,c=s+a,d=o+a,f=t-this.x,x=e-this.y,v=f*f/(u*u)+x*x/(h*h),g=f*f/(c*c)+x*x/(d*d);return v>1&&g<=1}getBounds(t){return t||(t=new _t),t.x=this.x-this.halfWidth,t.y=this.y-this.halfHeight,t.width=this.halfWidth*2,t.height=this.halfHeight*2,t}copyFrom(t){return this.x=t.x,this.y=t.y,this.halfWidth=t.halfWidth,this.halfHeight=t.halfHeight,this}copyTo(t){return t.copyFrom(this),t}toString(){return`[pixi.js/math:Ellipse x=${this.x} y=${this.y} halfWidth=${this.halfWidth} halfHeight=${this.halfHeight}]`}}function ec(i,t,e,n,r,s){const o=i-e,a=t-n,l=r-e,u=s-n,h=o*l+a*u,c=l*l+u*u;let d=-1;c!==0&&(d=h/c);let f,x;d<0?(f=e,x=n):d>1?(f=r,x=s):(f=e+d*l,x=n+d*u);const v=i-f,g=t-x;return v*v+g*g}class pi{constructor(...t){this.type="polygon";let e=Array.isArray(t[0])?t[0]:t;if(typeof e[0]!="number"){const n=[];for(let r=0,s=e.length;r<s;r++)n.push(e[r].x,e[r].y);e=n}this.points=e,this.closePath=!0}clone(){const t=this.points.slice(),e=new pi(t);return e.closePath=this.closePath,e}contains(t,e){let n=!1;const r=this.points.length/2;for(let s=0,o=r-1;s<r;o=s++){const a=this.points[s*2],l=this.points[s*2+1],u=this.points[o*2],h=this.points[o*2+1];l>e!=h>e&&t<(u-a)*((e-l)/(h-l))+a&&(n=!n)}return n}strokeContains(t,e,n,r=.5){const s=n*n,o=s*(1-r),a=s-o,{points:l}=this,u=l.length-(this.closePath?0:2);for(let h=0;h<u;h+=2){const c=l[h],d=l[h+1],f=l[(h+2)%l.length],x=l[(h+3)%l.length],v=ec(t,e,c,d,f,x),g=Math.sign((f-c)*(e-d)-(x-d)*(t-c));if(v<=(g<0?a:o))return!0}return!1}getBounds(t){t||(t=new _t);const e=this.points;let n=1/0,r=-1/0,s=1/0,o=-1/0;for(let a=0,l=e.length;a<l;a+=2){const u=e[a],h=e[a+1];n=u<n?u:n,r=u>r?u:r,s=h<s?h:s,o=h>o?h:o}return t.x=n,t.width=r-n,t.y=s,t.height=o-s,t}copyFrom(t){return this.points=t.points.slice(),this.closePath=t.closePath,this}copyTo(t){return t.copyFrom(this),t}toString(){return`[pixi.js/math:PolygoncloseStroke=${this.closePath}points=${this.points.reduce((t,e)=>`${t}, ${e}`,"")}]`}get lastX(){return this.points[this.points.length-2]}get lastY(){return this.points[this.points.length-1]}get x(){return this.points[this.points.length-2]}get y(){return this.points[this.points.length-1]}}const ki=(i,t,e,n,r,s,o)=>{const a=i-e,l=t-n,u=Math.sqrt(a*a+l*l);return u>=r-s&&u<=r+o};class jr{constructor(t=0,e=0,n=0,r=0,s=20){this.type="roundedRectangle",this.x=t,this.y=e,this.width=n,this.height=r,this.radius=s}getBounds(t){return t||(t=new _t),t.x=this.x,t.y=this.y,t.width=this.width,t.height=this.height,t}clone(){return new jr(this.x,this.y,this.width,this.height,this.radius)}copyFrom(t){return this.x=t.x,this.y=t.y,this.width=t.width,this.height=t.height,this}copyTo(t){return t.copyFrom(this),t}contains(t,e){if(this.width<=0||this.height<=0)return!1;if(t>=this.x&&t<=this.x+this.width&&e>=this.y&&e<=this.y+this.height){const n=Math.max(0,Math.min(this.radius,Math.min(this.width,this.height)/2));if(e>=this.y+n&&e<=this.y+this.height-n||t>=this.x+n&&t<=this.x+this.width-n)return!0;let r=t-(this.x+n),s=e-(this.y+n);const o=n*n;if(r*r+s*s<=o||(r=t-(this.x+this.width-n),r*r+s*s<=o)||(s=e-(this.y+this.height-n),r*r+s*s<=o)||(r=t-(this.x+n),r*r+s*s<=o))return!0}return!1}strokeContains(t,e,n,r=.5){const{x:s,y:o,width:a,height:l,radius:u}=this,h=n*(1-r),c=n-h,d=s+u,f=o+u,x=a-u*2,v=l-u*2,g=s+a,y=o+l;return(t>=s-h&&t<=s+c||t>=g-c&&t<=g+h)&&e>=f&&e<=f+v||(e>=o-h&&e<=o+c||e>=y-c&&e<=y+h)&&t>=d&&t<=d+x?!0:t<d&&e<f&&ki(t,e,d,f,u,c,h)||t>g-u&&e<f&&ki(t,e,g-u,f,u,c,h)||t>g-u&&e>y-u&&ki(t,e,g-u,y-u,u,c,h)||t<d&&e>y-u&&ki(t,e,d,y-u,u,c,h)}toString(){return`[pixi.js/math:RoundedRectangle x=${this.x} y=${this.y}width=${this.width} height=${this.height} radius=${this.radius}]`}}const ic=["precision mediump float;","void main(void){","float test = 0.1;","%forloop%","gl_FragColor = vec4(0.0);","}"].join(`
`);function nc(i){let t="";for(let e=0;e<i;++e)e>0&&(t+=`
else `),e<i-1&&(t+=`if(test == ${e}.0){}`);return t}function rc(i,t){if(i===0)throw new Error("Invalid value of `0` passed to `checkMaxIfStatementsInShader`");const e=t.createShader(t.FRAGMENT_SHADER);try{for(;;){const n=ic.replace(/%forloop%/gi,nc(i));if(t.shaderSource(e,n),t.compileShader(e),!t.getShaderParameter(e,t.COMPILE_STATUS))i=i/2|0;else break}}finally{t.deleteShader(e)}return i}let Fe=null;function Ia(){if(Fe)return Fe;const i=da();return Fe=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),Fe=rc(Fe,i),i.getExtension("WEBGL_lose_context")?.loseContext(),Fe}const Oa={};function sc(i,t){let e=2166136261;for(let n=0;n<t;n++)e^=i[n].uid,e=Math.imul(e,16777619),e>>>=0;return Oa[e]||oc(i,t,e)}let Yn=0;function oc(i,t,e){const n={};let r=0;Yn||(Yn=Ia());for(let o=0;o<Yn;o++){const a=o<t?i[o]:k.EMPTY.source;n[r++]=a.source,n[r++]=a.style}const s=new Vi(n);return Oa[e]=s,s}class Ws{constructor(t){typeof t=="number"?this.rawBinaryData=new ArrayBuffer(t):t instanceof Uint8Array?this.rawBinaryData=t.buffer:this.rawBinaryData=t,this.uint32View=new Uint32Array(this.rawBinaryData),this.float32View=new Float32Array(this.rawBinaryData),this.size=this.rawBinaryData.byteLength}get int8View(){return this._int8View||(this._int8View=new Int8Array(this.rawBinaryData)),this._int8View}get uint8View(){return this._uint8View||(this._uint8View=new Uint8Array(this.rawBinaryData)),this._uint8View}get int16View(){return this._int16View||(this._int16View=new Int16Array(this.rawBinaryData)),this._int16View}get int32View(){return this._int32View||(this._int32View=new Int32Array(this.rawBinaryData)),this._int32View}get float64View(){return this._float64Array||(this._float64Array=new Float64Array(this.rawBinaryData)),this._float64Array}get bigUint64View(){return this._bigUint64Array||(this._bigUint64Array=new BigUint64Array(this.rawBinaryData)),this._bigUint64Array}view(t){return this[`${t}View`]}destroy(){this.rawBinaryData=null,this._int8View=null,this._uint8View=null,this._int16View=null,this.uint16View=null,this._int32View=null,this.uint32View=null,this.float32View=null}static sizeOf(t){switch(t){case"int8":case"uint8":return 1;case"int16":case"uint16":return 2;case"int32":case"uint32":case"float32":return 4;default:throw new Error(`${t} isn't a valid view type`)}}}function $s(i,t){const e=i.byteLength/8|0,n=new Float64Array(i,0,e);new Float64Array(t,0,e).set(n);const s=i.byteLength-e*8;if(s>0){const o=new Uint8Array(i,e*8,s);new Uint8Array(t,e*8,s).set(o)}}const ac={normal:"normal-npm",add:"add-npm",screen:"screen-npm"};var lc=(i=>(i[i.DISABLED=0]="DISABLED",i[i.RENDERING_MASK_ADD=1]="RENDERING_MASK_ADD",i[i.MASK_ACTIVE=2]="MASK_ACTIVE",i[i.INVERSE_MASK_ACTIVE=3]="INVERSE_MASK_ACTIVE",i[i.RENDERING_MASK_REMOVE=4]="RENDERING_MASK_REMOVE",i[i.NONE=5]="NONE",i))(lc||{});function Hs(i,t){return t.alphaMode==="no-premultiply-alpha"&&ac[i]||i}class uc{constructor(){this.ids=Object.create(null),this.textures=[],this.count=0}clear(){for(let t=0;t<this.count;t++){const e=this.textures[t];this.textures[t]=null,this.ids[e.uid]=null}this.count=0}}class hc{constructor(){this.renderPipeId="batch",this.action="startBatch",this.start=0,this.size=0,this.textures=new uc,this.blendMode="normal",this.topology="triangle-strip",this.canBundle=!0}destroy(){this.textures=null,this.gpuBindGroup=null,this.bindGroup=null,this.batcher=null}}const Ra=[];let vr=0;function Xs(){return vr>0?Ra[--vr]:new hc}function Ys(i){Ra[vr++]=i}let Ze=0;const Ea=class Wi{constructor(t={}){this.uid=St("batcher"),this.dirty=!0,this.batchIndex=0,this.batches=[],this._elements=[],Wi.defaultOptions.maxTextures=Wi.defaultOptions.maxTextures??Ia(),t={...Wi.defaultOptions,...t};const{maxTextures:e,attributesInitialSize:n,indicesInitialSize:r}=t;this.attributeBuffer=new Ws(n*4),this.indexBuffer=new Uint16Array(r),this.maxTextures=e}begin(){this.elementSize=0,this.elementStart=0,this.indexSize=0,this.attributeSize=0;for(let t=0;t<this.batchIndex;t++)Ys(this.batches[t]);this.batchIndex=0,this._batchIndexStart=0,this._batchIndexSize=0,this.dirty=!0}add(t){this._elements[this.elementSize++]=t,t._indexStart=this.indexSize,t._attributeStart=this.attributeSize,t._batcher=this,this.indexSize+=t.indexSize,this.attributeSize+=t.attributeSize*this.vertexSize}checkAndUpdateTexture(t,e){const n=t._batch.textures.ids[e._source.uid];return!n&&n!==0?!1:(t._textureId=n,t.texture=e,!0)}updateElement(t){this.dirty=!0;const e=this.attributeBuffer;t.packAsQuad?this.packQuadAttributes(t,e.float32View,e.uint32View,t._attributeStart,t._textureId):this.packAttributes(t,e.float32View,e.uint32View,t._attributeStart,t._textureId)}break(t){const e=this._elements;if(!e[this.elementStart])return;let n=Xs(),r=n.textures;r.clear();const s=e[this.elementStart];let o=Hs(s.blendMode,s.texture._source),a=s.topology;this.attributeSize*4>this.attributeBuffer.size&&this._resizeAttributeBuffer(this.attributeSize*4),this.indexSize>this.indexBuffer.length&&this._resizeIndexBuffer(this.indexSize);const l=this.attributeBuffer.float32View,u=this.attributeBuffer.uint32View,h=this.indexBuffer;let c=this._batchIndexSize,d=this._batchIndexStart,f="startBatch";const x=this.maxTextures;for(let v=this.elementStart;v<this.elementSize;++v){const g=e[v];e[v]=null;const S=g.texture._source,w=Hs(g.blendMode,S),T=o!==w||a!==g.topology;if(S._batchTick===Ze&&!T){g._textureId=S._textureBindLocation,c+=g.indexSize,g.packAsQuad?(this.packQuadAttributes(g,l,u,g._attributeStart,g._textureId),this.packQuadIndex(h,g._indexStart,g._attributeStart/this.vertexSize)):(this.packAttributes(g,l,u,g._attributeStart,g._textureId),this.packIndex(g,h,g._indexStart,g._attributeStart/this.vertexSize)),g._batch=n;continue}S._batchTick=Ze,(r.count>=x||T)&&(this._finishBatch(n,d,c-d,r,o,a,t,f),f="renderBatch",d=c,o=w,a=g.topology,n=Xs(),r=n.textures,r.clear(),++Ze),g._textureId=S._textureBindLocation=r.count,r.ids[S.uid]=r.count,r.textures[r.count++]=S,g._batch=n,c+=g.indexSize,g.packAsQuad?(this.packQuadAttributes(g,l,u,g._attributeStart,g._textureId),this.packQuadIndex(h,g._indexStart,g._attributeStart/this.vertexSize)):(this.packAttributes(g,l,u,g._attributeStart,g._textureId),this.packIndex(g,h,g._indexStart,g._attributeStart/this.vertexSize))}r.count>0&&(this._finishBatch(n,d,c-d,r,o,a,t,f),d=c,++Ze),this.elementStart=this.elementSize,this._batchIndexStart=d,this._batchIndexSize=c}_finishBatch(t,e,n,r,s,o,a,l){t.gpuBindGroup=null,t.bindGroup=null,t.action=l,t.batcher=this,t.textures=r,t.blendMode=s,t.topology=o,t.start=e,t.size=n,++Ze,this.batches[this.batchIndex++]=t,a.add(t)}finish(t){this.break(t)}ensureAttributeBuffer(t){t*4<=this.attributeBuffer.size||this._resizeAttributeBuffer(t*4)}ensureIndexBuffer(t){t<=this.indexBuffer.length||this._resizeIndexBuffer(t)}_resizeAttributeBuffer(t){const e=Math.max(t,this.attributeBuffer.size*2),n=new Ws(e);$s(this.attributeBuffer.rawBinaryData,n.rawBinaryData),this.attributeBuffer=n}_resizeIndexBuffer(t){const e=this.indexBuffer;let n=Math.max(t,e.length*1.5);n+=n%2;const r=n>65535?new Uint32Array(n):new Uint16Array(n);if(r.BYTES_PER_ELEMENT!==e.BYTES_PER_ELEMENT)for(let s=0;s<e.length;s++)r[s]=e[s];else $s(e.buffer,r.buffer);this.indexBuffer=r}packQuadIndex(t,e,n){t[e]=n+0,t[e+1]=n+1,t[e+2]=n+2,t[e+3]=n+0,t[e+4]=n+2,t[e+5]=n+3}packIndex(t,e,n,r){const s=t.indices,o=t.indexSize,a=t.indexOffset,l=t.attributeOffset;for(let u=0;u<o;u++)e[n++]=r+s[u+a]-l}destroy(){for(let t=0;t<this.batches.length;t++)Ys(this.batches[t]);this.batches=null;for(let t=0;t<this._elements.length;t++)this._elements[t]._batch=null;this._elements=null,this.indexBuffer=null,this.attributeBuffer.destroy(),this.attributeBuffer=null}};Ea.defaultOptions={maxTextures:null,attributesInitialSize:4,indicesInitialSize:6};let cc=Ea;var bt=(i=>(i[i.MAP_READ=1]="MAP_READ",i[i.MAP_WRITE=2]="MAP_WRITE",i[i.COPY_SRC=4]="COPY_SRC",i[i.COPY_DST=8]="COPY_DST",i[i.INDEX=16]="INDEX",i[i.VERTEX=32]="VERTEX",i[i.UNIFORM=64]="UNIFORM",i[i.STORAGE=128]="STORAGE",i[i.INDIRECT=256]="INDIRECT",i[i.QUERY_RESOLVE=512]="QUERY_RESOLVE",i[i.STATIC=1024]="STATIC",i))(bt||{});class fe extends Ot{constructor(t){let{data:e,size:n}=t;const{usage:r,label:s,shrinkToFit:o}=t;super(),this.uid=St("buffer"),this._resourceType="buffer",this._resourceId=St("resource"),this._touched=0,this._updateID=1,this._dataInt32=null,this.shrinkToFit=!0,this.destroyed=!1,e instanceof Array&&(e=new Float32Array(e)),this._data=e,n??(n=e?.byteLength);const a=!!e;this.descriptor={size:n,usage:r,mappedAtCreation:a,label:s},this.shrinkToFit=o??!0}get data(){return this._data}set data(t){this.setDataWithSize(t,t.length,!0)}get dataInt32(){return this._dataInt32||(this._dataInt32=new Int32Array(this.data.buffer)),this._dataInt32}get static(){return!!(this.descriptor.usage&bt.STATIC)}set static(t){t?this.descriptor.usage|=bt.STATIC:this.descriptor.usage&=~bt.STATIC}setDataWithSize(t,e,n){if(this._updateID++,this._updateSize=e*t.BYTES_PER_ELEMENT,this._data===t){n&&this.emit("update",this);return}const r=this._data;if(this._data=t,this._dataInt32=null,!r||r.length!==t.length){!this.shrinkToFit&&r&&t.byteLength<r.byteLength?n&&this.emit("update",this):(this.descriptor.size=t.byteLength,this._resourceId=St("resource"),this.emit("change",this));return}n&&this.emit("update",this)}update(t){this._updateSize=t??this._updateSize,this._updateID++,this.emit("update",this)}destroy(){this.destroyed=!0,this.emit("destroy",this),this.emit("change",this),this._data=null,this.descriptor=null,this.removeAllListeners()}}function Ua(i,t){if(!(i instanceof fe)){let e=t?bt.INDEX:bt.VERTEX;i instanceof Array&&(t?(i=new Uint32Array(i),e=bt.INDEX|bt.COPY_DST):(i=new Float32Array(i),e=bt.VERTEX|bt.COPY_DST)),i=new fe({data:i,label:t?"index-mesh-buffer":"vertex-mesh-buffer",usage:e})}return i}function fc(i,t,e){const n=i.getAttribute(t);if(!n)return e.minX=0,e.minY=0,e.maxX=0,e.maxY=0,e;const r=n.buffer.data;let s=1/0,o=1/0,a=-1/0,l=-1/0;const u=r.BYTES_PER_ELEMENT,h=(n.offset||0)/u,c=(n.stride||2*4)/u;for(let d=h;d<r.length;d+=c){const f=r[d],x=r[d+1];f>a&&(a=f),x>l&&(l=x),f<s&&(s=f),x<o&&(o=x)}return e.minX=s,e.minY=o,e.maxX=a,e.maxY=l,e}function dc(i){return(i instanceof fe||Array.isArray(i)||i.BYTES_PER_ELEMENT)&&(i={buffer:i}),i.buffer=Ua(i.buffer,!1),i}class za extends Ot{constructor(t={}){super(),this.uid=St("geometry"),this._layoutKey=0,this.instanceCount=1,this._bounds=new te,this._boundsDirty=!0;const{attributes:e,indexBuffer:n,topology:r}=t;if(this.buffers=[],this.attributes={},e)for(const s in e)this.addAttribute(s,e[s]);this.instanceCount=t.instanceCount??1,n&&this.addIndex(n),this.topology=r||"triangle-list"}onBufferUpdate(){this._boundsDirty=!0,this.emit("update",this)}getAttribute(t){return this.attributes[t]}getIndex(){return this.indexBuffer}getBuffer(t){return this.getAttribute(t).buffer}getSize(){for(const t in this.attributes){const e=this.attributes[t];return e.buffer.data.length/(e.stride/4||e.size)}return 0}addAttribute(t,e){const n=dc(e);this.buffers.indexOf(n.buffer)===-1&&(this.buffers.push(n.buffer),n.buffer.on("update",this.onBufferUpdate,this),n.buffer.on("change",this.onBufferUpdate,this)),this.attributes[t]=n}addIndex(t){this.indexBuffer=Ua(t,!0),this.buffers.push(this.indexBuffer)}get bounds(){return this._boundsDirty?(this._boundsDirty=!1,fc(this,"aPosition",this._bounds)):this._bounds}destroy(t=!1){this.emit("destroy",this),this.removeAllListeners(),t&&this.buffers.forEach(e=>e.destroy()),this.attributes=null,this.buffers=null,this.indexBuffer=null,this._bounds=null}}const pc=new Float32Array(1),mc=new Uint32Array(1);class gc extends za{constructor(){const e=new fe({data:pc,label:"attribute-batch-buffer",usage:bt.VERTEX|bt.COPY_DST,shrinkToFit:!1}),n=new fe({data:mc,label:"index-batch-buffer",usage:bt.INDEX|bt.COPY_DST,shrinkToFit:!1}),r=6*4;super({attributes:{aPosition:{buffer:e,format:"float32x2",stride:r,offset:0},aUV:{buffer:e,format:"float32x2",stride:r,offset:2*4},aColor:{buffer:e,format:"unorm8x4",stride:r,offset:4*4},aTextureIdAndRound:{buffer:e,format:"uint16x2",stride:r,offset:5*4}},indexBuffer:n})}}function js(i,t,e){if(i)for(const n in i){const r=n.toLocaleLowerCase(),s=t[r];if(s){let o=i[n];n==="header"&&(o=o.replace(/@in\s+[^;]+;\s*/g,"").replace(/@out\s+[^;]+;\s*/g,"")),e&&s.push(`//----${e}----//`),s.push(o)}else vt(`${n} placement hook does not exist in shader`)}}const xc=/\{\{(.*?)\}\}/g;function qs(i){const t={};return(i.match(xc)?.map(n=>n.replace(/[{()}]/g,""))??[]).forEach(n=>{t[n]=[]}),t}function Ks(i,t){let e;const n=/@in\s+([^;]+);/g;for(;(e=n.exec(i))!==null;)t.push(e[1])}function Zs(i,t,e=!1){const n=[];Ks(t,n),i.forEach(a=>{a.header&&Ks(a.header,n)});const r=n;e&&r.sort();const s=r.map((a,l)=>`       @location(${l}) ${a},`).join(`
`);let o=t.replace(/@in\s+[^;]+;\s*/g,"");return o=o.replace("{{in}}",`
${s}
`),o}function Qs(i,t){let e;const n=/@out\s+([^;]+);/g;for(;(e=n.exec(i))!==null;)t.push(e[1])}function _c(i){const e=/\b(\w+)\s*:/g.exec(i);return e?e[1]:""}function vc(i){const t=/@.*?\s+/g;return i.replace(t,"")}function yc(i,t){const e=[];Qs(t,e),i.forEach(l=>{l.header&&Qs(l.header,e)});let n=0;const r=e.sort().map(l=>l.indexOf("builtin")>-1?l:`@location(${n++}) ${l}`).join(`,
`),s=e.sort().map(l=>`       var ${vc(l)};`).join(`
`),o=`return VSOutput(
            ${e.sort().map(l=>` ${_c(l)}`).join(`,
`)});`;let a=t.replace(/@out\s+[^;]+;\s*/g,"");return a=a.replace("{{struct}}",`
${r}
`),a=a.replace("{{start}}",`
${s}
`),a=a.replace("{{return}}",`
${o}
`),a}function Js(i,t){let e=i;for(const n in t){const r=t[n];r.join(`
`).length?e=e.replace(`{{${n}}}`,`//-----${n} START-----//
${r.join(`
`)}
//----${n} FINISH----//`):e=e.replace(`{{${n}}}`,"")}return e}const ce=Object.create(null),jn=new Map;let bc=0;function Sc({template:i,bits:t}){const e=ka(i,t);if(ce[e])return ce[e];const{vertex:n,fragment:r}=Cc(i,t);return ce[e]=La(n,r,t),ce[e]}function wc({template:i,bits:t}){const e=ka(i,t);return ce[e]||(ce[e]=La(i.vertex,i.fragment,t)),ce[e]}function Cc(i,t){const e=t.map(o=>o.vertex).filter(o=>!!o),n=t.map(o=>o.fragment).filter(o=>!!o);let r=Zs(e,i.vertex,!0);r=yc(e,r);const s=Zs(n,i.fragment,!0);return{vertex:r,fragment:s}}function ka(i,t){return t.map(e=>(jn.has(e)||jn.set(e,bc++),jn.get(e))).sort((e,n)=>e-n).join("-")+i.vertex+i.fragment}function La(i,t,e){const n=qs(i),r=qs(t);return e.forEach(s=>{js(s.vertex,n,s.name),js(s.fragment,r,s.name)}),{vertex:Js(i,n),fragment:Js(t,r)}}const Tc=`
    @in aPosition: vec2<f32>;
    @in aUV: vec2<f32>;

    @out @builtin(position) vPosition: vec4<f32>;
    @out vUV : vec2<f32>;
    @out vColor : vec4<f32>;

    {{header}}

    struct VSOutput {
        {{struct}}
    };

    @vertex
    fn main( {{in}} ) -> VSOutput {

        var worldTransformMatrix = globalUniforms.uWorldTransformMatrix;
        var modelMatrix = mat3x3<f32>(
            1.0, 0.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 0.0, 1.0
          );
        var position = aPosition;
        var uv = aUV;

        {{start}}
        
        vColor = vec4<f32>(1., 1., 1., 1.);

        {{main}}

        vUV = uv;

        var modelViewProjectionMatrix = globalUniforms.uProjectionMatrix * worldTransformMatrix * modelMatrix;

        vPosition =  vec4<f32>((modelViewProjectionMatrix *  vec3<f32>(position, 1.0)).xy, 0.0, 1.0);
       
        vColor *= globalUniforms.uWorldColorAlpha;

        {{end}}

        {{return}}
    };
`,Ac=`
    @in vUV : vec2<f32>;
    @in vColor : vec4<f32>;
   
    {{header}}

    @fragment
    fn main(
        {{in}}
      ) -> @location(0) vec4<f32> {
        
        {{start}}

        var outColor:vec4<f32>;
      
        {{main}}
        
        var finalColor:vec4<f32> = outColor * vColor;

        {{end}}

        return finalColor;
      };
`,Pc=`
    in vec2 aPosition;
    in vec2 aUV;

    out vec4 vColor;
    out vec2 vUV;

    {{header}}

    void main(void){

        mat3 worldTransformMatrix = uWorldTransformMatrix;
        mat3 modelMatrix = mat3(
            1.0, 0.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 0.0, 1.0
          );
        vec2 position = aPosition;
        vec2 uv = aUV;
        
        {{start}}
        
        vColor = vec4(1.);
        
        {{main}}
        
        vUV = uv;
        
        mat3 modelViewProjectionMatrix = uProjectionMatrix * worldTransformMatrix * modelMatrix;

        gl_Position = vec4((modelViewProjectionMatrix * vec3(position, 1.0)).xy, 0.0, 1.0);

        vColor *= uWorldColorAlpha;

        {{end}}
    }
`,Mc=`
   
    in vec4 vColor;
    in vec2 vUV;

    out vec4 finalColor;

    {{header}}

    void main(void) {
        
        {{start}}

        vec4 outColor;
      
        {{main}}
        
        finalColor = outColor * vColor;
        
        {{end}}
    }
`,Fc={name:"global-uniforms-bit",vertex:{header:`
        struct GlobalUniforms {
            uProjectionMatrix:mat3x3<f32>,
            uWorldTransformMatrix:mat3x3<f32>,
            uWorldColorAlpha: vec4<f32>,
            uResolution: vec2<f32>,
        }

        @group(0) @binding(0) var<uniform> globalUniforms : GlobalUniforms;
        `}},Ic={name:"global-uniforms-bit",vertex:{header:`
          uniform mat3 uProjectionMatrix;
          uniform mat3 uWorldTransformMatrix;
          uniform vec4 uWorldColorAlpha;
          uniform vec2 uResolution;
        `}};function Oc({bits:i,name:t}){const e=Sc({template:{fragment:Ac,vertex:Tc},bits:[Fc,...i]});return W.from({name:t,vertex:{source:e.vertex,entryPoint:"main"},fragment:{source:e.fragment,entryPoint:"main"}})}function Rc({bits:i,name:t}){return new H({name:t,...wc({template:{vertex:Pc,fragment:Mc},bits:[Ic,...i]})})}const Ec={name:"color-bit",vertex:{header:`
            @in aColor: vec4<f32>;
        `,main:`
            vColor *= vec4<f32>(aColor.rgb * aColor.a, aColor.a);
        `}},Uc={name:"color-bit",vertex:{header:`
            in vec4 aColor;
        `,main:`
            vColor *= vec4(aColor.rgb * aColor.a, aColor.a);
        `}},qn={};function zc(i){const t=[];if(i===1)t.push("@group(1) @binding(0) var textureSource1: texture_2d<f32>;"),t.push("@group(1) @binding(1) var textureSampler1: sampler;");else{let e=0;for(let n=0;n<i;n++)t.push(`@group(1) @binding(${e++}) var textureSource${n+1}: texture_2d<f32>;`),t.push(`@group(1) @binding(${e++}) var textureSampler${n+1}: sampler;`)}return t.join(`
`)}function kc(i){const t=[];if(i===1)t.push("outColor = textureSampleGrad(textureSource1, textureSampler1, vUV, uvDx, uvDy);");else{t.push("switch vTextureId {");for(let e=0;e<i;e++)e===i-1?t.push("  default:{"):t.push(`  case ${e}:{`),t.push(`      outColor = textureSampleGrad(textureSource${e+1}, textureSampler${e+1}, vUV, uvDx, uvDy);`),t.push("      break;}");t.push("}")}return t.join(`
`)}function Lc(i){return qn[i]||(qn[i]={name:"texture-batch-bit",vertex:{header:`
                @in aTextureIdAndRound: vec2<u32>;
                @out @interpolate(flat) vTextureId : u32;
            `,main:`
                vTextureId = aTextureIdAndRound.y;
            `,end:`
                if(aTextureIdAndRound.x == 1)
                {
                    vPosition = vec4<f32>(roundPixels(vPosition.xy, globalUniforms.uResolution), vPosition.zw);
                }
            `},fragment:{header:`
                @in @interpolate(flat) vTextureId: u32;

                ${zc(i)}
            `,main:`
                var uvDx = dpdx(vUV);
                var uvDy = dpdy(vUV);

                ${kc(i)}
            `}}),qn[i]}const Kn={};function Bc(i){const t=[];for(let e=0;e<i;e++)e>0&&t.push("else"),e<i-1&&t.push(`if(vTextureId < ${e}.5)`),t.push("{"),t.push(`	outColor = texture(uTextures[${e}], vUV);`),t.push("}");return t.join(`
`)}function Dc(i){return Kn[i]||(Kn[i]={name:"texture-batch-bit",vertex:{header:`
                in vec2 aTextureIdAndRound;
                out float vTextureId;

            `,main:`
                vTextureId = aTextureIdAndRound.y;
            `,end:`
                if(aTextureIdAndRound.x == 1.)
                {
                    gl_Position.xy = roundPixels(gl_Position.xy, uResolution);
                }
            `},fragment:{header:`
                in float vTextureId;

                uniform sampler2D uTextures[${i}];

            `,main:`

                ${Bc(i)}
            `}}),Kn[i]}const Nc={name:"round-pixels-bit",vertex:{header:`
            fn roundPixels(position: vec2<f32>, targetSize: vec2<f32>) -> vec2<f32> 
            {
                return (floor(((position * 0.5 + 0.5) * targetSize) + 0.5) / targetSize) * 2.0 - 1.0;
            }
        `}},Gc={name:"round-pixels-bit",vertex:{header:`   
            vec2 roundPixels(vec2 position, vec2 targetSize)
            {       
                return (floor(((position * 0.5 + 0.5) * targetSize) + 0.5) / targetSize) * 2.0 - 1.0;
            }
        `}},to={};function Vc(i){let t=to[i];if(t)return t;const e=new Int32Array(i);for(let n=0;n<i;n++)e[n]=n;return t=to[i]=new Hr({uTextures:{value:e,type:"i32",size:i}},{isStatic:!0}),t}class Wc extends pn{constructor(t){const e=Rc({name:"batch",bits:[Uc,Dc(t),Gc]}),n=Oc({name:"batch",bits:[Ec,Lc(t),Nc]});super({glProgram:e,gpuProgram:n,resources:{batchSamplers:Vc(t)}})}}let eo=null;const Ba=class Da extends cc{constructor(){super(...arguments),this.geometry=new gc,this.shader=eo||(eo=new Wc(this.maxTextures)),this.name=Da.extension.name,this.vertexSize=6}packAttributes(t,e,n,r,s){const o=s<<16|t.roundPixels&65535,a=t.transform,l=a.a,u=a.b,h=a.c,c=a.d,d=a.tx,f=a.ty,{positions:x,uvs:v}=t,g=t.color,y=t.attributeOffset,S=y+t.attributeSize;for(let w=y;w<S;w++){const T=w*2,I=x[T],A=x[T+1];e[r++]=l*I+h*A+d,e[r++]=c*A+u*I+f,e[r++]=v[T],e[r++]=v[T+1],n[r++]=g,n[r++]=o}}packQuadAttributes(t,e,n,r,s){const o=t.texture,a=t.transform,l=a.a,u=a.b,h=a.c,c=a.d,d=a.tx,f=a.ty,x=t.bounds,v=x.maxX,g=x.minX,y=x.maxY,S=x.minY,w=o.uvs,T=t.color,I=s<<16|t.roundPixels&65535;e[r+0]=l*g+h*S+d,e[r+1]=c*S+u*g+f,e[r+2]=w.x0,e[r+3]=w.y0,n[r+4]=T,n[r+5]=I,e[r+6]=l*v+h*S+d,e[r+7]=c*S+u*v+f,e[r+8]=w.x1,e[r+9]=w.y1,n[r+10]=T,n[r+11]=I,e[r+12]=l*v+h*y+d,e[r+13]=c*y+u*v+f,e[r+14]=w.x2,e[r+15]=w.y2,n[r+16]=T,n[r+17]=I,e[r+18]=l*g+h*y+d,e[r+19]=c*y+u*g+f,e[r+20]=w.x3,e[r+21]=w.y3,n[r+22]=T,n[r+23]=I}};Ba.extension={type:[U.Batcher],name:"default"};let $c=Ba;function Hc(i,t,e,n,r,s,o,a=null){let l=0;e*=t,r*=s;const u=a.a,h=a.b,c=a.c,d=a.d,f=a.tx,x=a.ty;for(;l<o;){const v=i[e],g=i[e+1];n[r]=u*v+c*g+f,n[r+1]=h*v+d*g+x,r+=s,e+=t,l++}}function Xc(i,t,e,n){let r=0;for(t*=e;r<n;)i[t]=0,i[t+1]=0,t+=e,r++}function Na(i,t,e,n,r){const s=t.a,o=t.b,a=t.c,l=t.d,u=t.tx,h=t.ty;e||(e=0),n||(n=2),r||(r=i.length/n-e);let c=e*n;for(let d=0;d<r;d++){const f=i[c],x=i[c+1];i[c]=s*f+a*x+u,i[c+1]=o*f+l*x+h,c+=n}}const Yc=new Q;class Ga{constructor(){this.packAsQuad=!1,this.batcherName="default",this.topology="triangle-list",this.applyTransform=!0,this.roundPixels=0,this._batcher=null,this._batch=null}get uvs(){return this.geometryData.uvs}get positions(){return this.geometryData.vertices}get indices(){return this.geometryData.indices}get blendMode(){return this.applyTransform?this.renderable.groupBlendMode:"normal"}get color(){const t=this.baseColor,e=t>>16|t&65280|(t&255)<<16,n=this.renderable;return n?qo(e,n.groupColor)+(this.alpha*n.groupAlpha*255<<24):e+(this.alpha*255<<24)}get transform(){return this.renderable?.groupTransform||Yc}copyTo(t){t.indexOffset=this.indexOffset,t.indexSize=this.indexSize,t.attributeOffset=this.attributeOffset,t.attributeSize=this.attributeSize,t.baseColor=this.baseColor,t.alpha=this.alpha,t.texture=this.texture,t.geometryData=this.geometryData,t.topology=this.topology}reset(){this.applyTransform=!0,this.renderable=null,this.topology="triangle-list"}}const _i={extension:{type:U.ShapeBuilder,name:"circle"},build(i,t){let e,n,r,s,o,a;if(i.type==="circle"){const T=i;e=T.x,n=T.y,o=a=T.radius,r=s=0}else if(i.type==="ellipse"){const T=i;e=T.x,n=T.y,o=T.halfWidth,a=T.halfHeight,r=s=0}else{const T=i,I=T.width/2,A=T.height/2;e=T.x+I,n=T.y+A,o=a=Math.max(0,Math.min(T.radius,Math.min(I,A))),r=I-o,s=A-a}if(!(o>=0&&a>=0&&r>=0&&s>=0))return t;const l=Math.ceil(2.3*Math.sqrt(o+a)),u=l*8+(r?4:0)+(s?4:0);if(u===0)return t;if(l===0)return t[0]=t[6]=e+r,t[1]=t[3]=n+s,t[2]=t[4]=e-r,t[5]=t[7]=n-s,t;let h=0,c=l*4+(r?2:0)+2,d=c,f=u,x=r+o,v=s,g=e+x,y=e-x,S=n+v;if(t[h++]=g,t[h++]=S,t[--c]=S,t[--c]=y,s){const T=n-v;t[d++]=y,t[d++]=T,t[--f]=T,t[--f]=g}for(let T=1;T<l;T++){const I=Math.PI/2*(T/l),A=r+Math.cos(I)*o,M=s+Math.sin(I)*a,D=e+A,G=e-A,R=n+M,E=n-M;t[h++]=D,t[h++]=R,t[--c]=R,t[--c]=G,t[d++]=G,t[d++]=E,t[--f]=E,t[--f]=D}x=r,v=s+a,g=e+x,y=e-x,S=n+v;const w=n-v;return t[h++]=g,t[h++]=S,t[--f]=w,t[--f]=g,r&&(t[h++]=y,t[h++]=S,t[--f]=w,t[--f]=y),t},triangulate(i,t,e,n,r,s){if(i.length===0)return;let o=0,a=0;for(let h=0;h<i.length;h+=2)o+=i[h],a+=i[h+1];o/=i.length/2,a/=i.length/2;let l=n;t[l*e]=o,t[l*e+1]=a;const u=l++;for(let h=0;h<i.length;h+=2)t[l*e]=i[h],t[l*e+1]=i[h+1],h>0&&(r[s++]=l,r[s++]=u,r[s++]=l-1),l++;r[s++]=u+1,r[s++]=u,r[s++]=l-1}},jc={..._i,extension:{..._i.extension,name:"ellipse"}},qc={..._i,extension:{..._i.extension,name:"roundedRectangle"}},Va=1e-4,io=1e-4;function Kc(i){const t=i.length;if(t<6)return 1;let e=0;for(let n=0,r=i[t-2],s=i[t-1];n<t;n+=2){const o=i[n],a=i[n+1];e+=(o-r)*(a+s),r=o,s=a}return e<0?-1:1}function no(i,t,e,n,r,s,o,a){const l=i-e*r,u=t-n*r,h=i+e*s,c=t+n*s;let d,f;o?(d=n,f=-e):(d=-n,f=e);const x=l+d,v=u+f,g=h+d,y=c+f;return a.push(x,v),a.push(g,y),2}function pe(i,t,e,n,r,s,o,a){const l=e-i,u=n-t;let h=Math.atan2(l,u),c=Math.atan2(r-i,s-t);a&&h<c?h+=Math.PI*2:!a&&h>c&&(c+=Math.PI*2);let d=h;const f=c-h,x=Math.abs(f),v=Math.sqrt(l*l+u*u),g=(15*x*Math.sqrt(v)/Math.PI>>0)+1,y=f/g;if(d+=y,a){o.push(i,t),o.push(e,n);for(let S=1,w=d;S<g;S++,w+=y)o.push(i,t),o.push(i+Math.sin(w)*v,t+Math.cos(w)*v);o.push(i,t),o.push(r,s)}else{o.push(e,n),o.push(i,t);for(let S=1,w=d;S<g;S++,w+=y)o.push(i+Math.sin(w)*v,t+Math.cos(w)*v),o.push(i,t);o.push(r,s),o.push(i,t)}return g*2}function Zc(i,t,e,n,r,s){const o=Va;if(i.length===0)return;const a=t;let l=a.alignment;if(t.alignment!==.5){let b=Kc(i);l=(l-.5)*b+.5}const u=new Ft(i[0],i[1]),h=new Ft(i[i.length-2],i[i.length-1]),c=n,d=Math.abs(u.x-h.x)<o&&Math.abs(u.y-h.y)<o;if(c){i=i.slice(),d&&(i.pop(),i.pop(),h.set(i[i.length-2],i[i.length-1]));const b=(u.x+h.x)*.5,C=(h.y+u.y)*.5;i.unshift(b,C),i.push(b,C)}const f=r,x=i.length/2;let v=i.length;const g=f.length/2,y=a.width/2,S=y*y,w=a.miterLimit*a.miterLimit;let T=i[0],I=i[1],A=i[2],M=i[3],D=0,G=0,R=-(I-M),E=T-A,ut=0,J=0,tt=Math.sqrt(R*R+E*E);R/=tt,E/=tt,R*=y,E*=y;const wt=l,p=(1-wt)*2,m=wt*2;c||(a.cap==="round"?v+=pe(T-R*(p-m)*.5,I-E*(p-m)*.5,T-R*p,I-E*p,T+R*m,I+E*m,f,!0)+2:a.cap==="square"&&(v+=no(T,I,R,E,p,m,!0,f))),f.push(T-R*p,I-E*p),f.push(T+R*m,I+E*m);for(let b=1;b<x-1;++b){T=i[(b-1)*2],I=i[(b-1)*2+1],A=i[b*2],M=i[b*2+1],D=i[(b+1)*2],G=i[(b+1)*2+1],R=-(I-M),E=T-A,tt=Math.sqrt(R*R+E*E),R/=tt,E/=tt,R*=y,E*=y,ut=-(M-G),J=A-D,tt=Math.sqrt(ut*ut+J*J),ut/=tt,J/=tt,ut*=y,J*=y;const C=A-T,P=I-M,F=A-D,O=G-M,N=C*F+P*O,L=P*F-O*C,st=L<0;if(Math.abs(L)<.001*Math.abs(N)){f.push(A-R*p,M-E*p),f.push(A+R*m,M+E*m),N>=0&&(a.join==="round"?v+=pe(A,M,A-R*p,M-E*p,A-ut*p,M-J*p,f,!1)+4:v+=2,f.push(A-ut*m,M-J*m),f.push(A+ut*p,M+J*p));continue}const ot=(-R+T)*(-E+M)-(-R+A)*(-E+I),j=(-ut+D)*(-J+M)-(-ut+A)*(-J+G),xt=(C*j-F*ot)/L,et=(O*ot-P*j)/L,ee=(xt-A)*(xt-A)+(et-M)*(et-M),kt=A+(xt-A)*p,Yt=M+(et-M)*p,jt=A-(xt-A)*m,$=M-(et-M)*m,Z=Math.min(C*C+P*P,F*F+O*O),ns=st?p:m,mu=Z+ns*ns*S;ee<=mu?a.join==="bevel"||ee/S>w?(st?(f.push(kt,Yt),f.push(A+R*m,M+E*m),f.push(kt,Yt),f.push(A+ut*m,M+J*m)):(f.push(A-R*p,M-E*p),f.push(jt,$),f.push(A-ut*p,M-J*p),f.push(jt,$)),v+=2):a.join==="round"?st?(f.push(kt,Yt),f.push(A+R*m,M+E*m),v+=pe(A,M,A+R*m,M+E*m,A+ut*m,M+J*m,f,!0)+4,f.push(kt,Yt),f.push(A+ut*m,M+J*m)):(f.push(A-R*p,M-E*p),f.push(jt,$),v+=pe(A,M,A-R*p,M-E*p,A-ut*p,M-J*p,f,!1)+4,f.push(A-ut*p,M-J*p),f.push(jt,$)):(f.push(kt,Yt),f.push(jt,$)):(f.push(A-R*p,M-E*p),f.push(A+R*m,M+E*m),a.join==="round"?st?v+=pe(A,M,A+R*m,M+E*m,A+ut*m,M+J*m,f,!0)+2:v+=pe(A,M,A-R*p,M-E*p,A-ut*p,M-J*p,f,!1)+2:a.join==="miter"&&ee/S<=w&&(st?(f.push(jt,$),f.push(jt,$)):(f.push(kt,Yt),f.push(kt,Yt)),v+=2),f.push(A-ut*p,M-J*p),f.push(A+ut*m,M+J*m),v+=2)}T=i[(x-2)*2],I=i[(x-2)*2+1],A=i[(x-1)*2],M=i[(x-1)*2+1],R=-(I-M),E=T-A,tt=Math.sqrt(R*R+E*E),R/=tt,E/=tt,R*=y,E*=y,f.push(A-R*p,M-E*p),f.push(A+R*m,M+E*m),c||(a.cap==="round"?v+=pe(A-R*(p-m)*.5,M-E*(p-m)*.5,A-R*p,M-E*p,A+R*m,M+E*m,f,!1)+2:a.cap==="square"&&(v+=no(A,M,R,E,p,m,!1,f)));const _=io*io;for(let b=g;b<v+g-2;++b)T=f[b*2],I=f[b*2+1],A=f[(b+1)*2],M=f[(b+1)*2+1],D=f[(b+2)*2],G=f[(b+2)*2+1],!(Math.abs(T*(M-G)+A*(G-I)+D*(I-M))<_)&&s.push(b,b+1,b+2)}function Qc(i,t,e,n){const r=Va;if(i.length===0)return;const s=i[0],o=i[1],a=i[i.length-2],l=i[i.length-1],u=t||Math.abs(s-a)<r&&Math.abs(o-l)<r,h=e,c=i.length/2,d=h.length/2;for(let f=0;f<c;f++)h.push(i[f*2]),h.push(i[f*2+1]);for(let f=0;f<c-1;f++)n.push(d+f,d+f+1);u&&n.push(d+c-1,d)}function Wa(i,t,e,n,r,s,o){const a=$h(i,t,2);if(!a)return;for(let u=0;u<a.length;u+=3)s[o++]=a[u]+r,s[o++]=a[u+1]+r,s[o++]=a[u+2]+r;let l=r*n;for(let u=0;u<i.length;u+=2)e[l]=i[u],e[l+1]=i[u+1],l+=n}const Jc=[],tf={extension:{type:U.ShapeBuilder,name:"polygon"},build(i,t){for(let e=0;e<i.points.length;e++)t[e]=i.points[e];return t},triangulate(i,t,e,n,r,s){Wa(i,Jc,t,e,n,r,s)}},ef={extension:{type:U.ShapeBuilder,name:"rectangle"},build(i,t){const e=i,n=e.x,r=e.y,s=e.width,o=e.height;return s>=0&&o>=0&&(t[0]=n,t[1]=r,t[2]=n+s,t[3]=r,t[4]=n+s,t[5]=r+o,t[6]=n,t[7]=r+o),t},triangulate(i,t,e,n,r,s){let o=0;n*=e,t[n+o]=i[0],t[n+o+1]=i[1],o+=e,t[n+o]=i[2],t[n+o+1]=i[3],o+=e,t[n+o]=i[6],t[n+o+1]=i[7],o+=e,t[n+o]=i[4],t[n+o+1]=i[5],o+=e;const a=n/e;r[s++]=a,r[s++]=a+1,r[s++]=a+2,r[s++]=a+1,r[s++]=a+3,r[s++]=a+2}},nf={extension:{type:U.ShapeBuilder,name:"triangle"},build(i,t){return t[0]=i.x,t[1]=i.y,t[2]=i.x2,t[3]=i.y2,t[4]=i.x3,t[5]=i.y3,t},triangulate(i,t,e,n,r,s){let o=0;n*=e,t[n+o]=i[0],t[n+o+1]=i[1],o+=e,t[n+o]=i[2],t[n+o+1]=i[3],o+=e,t[n+o]=i[4],t[n+o+1]=i[5];const a=n/e;r[s++]=a,r[s++]=a+1,r[s++]=a+2}},gn={};It.handleByMap(U.ShapeBuilder,gn);It.add(ef,tf,nf,_i,jc,qc);const rf=new _t;function sf(i,t){const{geometryData:e,batches:n}=t;n.length=0,e.indices.length=0,e.vertices.length=0,e.uvs.length=0;for(let r=0;r<i.instructions.length;r++){const s=i.instructions[r];if(s.action==="texture")of(s.data,n,e);else if(s.action==="fill"||s.action==="stroke"){const o=s.action==="stroke",a=s.data.path.shapePath,l=s.data.style,u=s.data.hole;o&&u&&ro(u.shapePath,l,null,!0,n,e),ro(a,l,u,o,n,e)}}}function of(i,t,e){const{vertices:n,uvs:r,indices:s}=e,o=s.length,a=n.length/2,l=[],u=gn.rectangle,h=rf,c=i.image;h.x=i.dx,h.y=i.dy,h.width=i.dw,h.height=i.dh;const d=i.transform;u.build(h,l),d&&Na(l,d),u.triangulate(l,n,2,a,s,o);const f=c.uvs;r.push(f.x0,f.y0,f.x1,f.y1,f.x3,f.y3,f.x2,f.y2);const x=oe.get(Ga);x.indexOffset=o,x.indexSize=s.length-o,x.attributeOffset=a,x.attributeSize=n.length/2-a,x.baseColor=i.style,x.alpha=i.alpha,x.texture=c,x.geometryData=e,t.push(x)}function ro(i,t,e,n,r,s){const{vertices:o,uvs:a,indices:l}=s,u=i.shapePrimitives.length-1;i.shapePrimitives.forEach(({shape:h,transform:c},d)=>{const f=l.length,x=o.length/2,v=[],g=gn[h.type];let y="triangle-list";if(g.build(h,v),c&&Na(v,c),n){const I=h.closePath??!0,A=t;A.pixelLine?(Qc(v,I,o,l),y="line-list"):Zc(v,A,!1,I,o,l)}else if(e&&u===d){u!==0&&console.warn("[Pixi Graphics] only the last shape have be cut out");const I=[],A=v.slice();af(e.shapePath).forEach(D=>{I.push(A.length/2),A.push(...D)}),Wa(A,I,o,2,x,l,f)}else g.triangulate(v,o,2,x,l,f);const S=a.length/2,w=t.texture;if(w!==k.WHITE){const I=t.matrix;I&&(c&&I.append(c.clone().invert()),Hc(o,2,x,a,S,2,o.length/2-x,I))}else Xc(a,S,2,o.length/2-x);const T=oe.get(Ga);T.indexOffset=f,T.indexSize=l.length-f,T.attributeOffset=x,T.attributeSize=o.length/2-x,T.baseColor=t.color,T.alpha=t.alpha,T.texture=w,T.geometryData=s,T.topology=y,r.push(T)})}function af(i){if(!i)return[];const t=i.shapePrimitives,e=[];for(let n=0;n<t.length;n++){const r=t[n].shape,s=[];gn[r.type].build(r,s),e.push(s)}return e}class lf{constructor(){this.batches=[],this.geometryData={vertices:[],uvs:[],indices:[]}}}class uf{constructor(){this.batcher=new $c,this.instructions=new Jo}init(){this.instructions.reset()}get geometry(){return B(Pu,"GraphicsContextRenderData#geometry is deprecated, please use batcher.geometry instead."),this.batcher.geometry}}const qr=class yr{constructor(t){this._gpuContextHash={},this._graphicsDataContextHash=Object.create(null),t.renderableGC.addManagedHash(this,"_gpuContextHash"),t.renderableGC.addManagedHash(this,"_graphicsDataContextHash")}init(t){yr.defaultOptions.bezierSmoothness=t?.bezierSmoothness??yr.defaultOptions.bezierSmoothness}getContextRenderData(t){return this._graphicsDataContextHash[t.uid]||this._initContextRenderData(t)}updateGpuContext(t){let e=this._gpuContextHash[t.uid]||this._initContext(t);if(t.dirty){e?this._cleanGraphicsContextData(t):e=this._initContext(t),sf(t,e);const n=t.batchMode;t.customShader||n==="no-batch"?e.isBatchable=!1:n==="auto"&&(e.isBatchable=e.geometryData.vertices.length<400),t.dirty=!1}return e}getGpuContext(t){return this._gpuContextHash[t.uid]||this._initContext(t)}_initContextRenderData(t){const e=oe.get(uf),{batches:n,geometryData:r}=this._gpuContextHash[t.uid],s=r.vertices.length,o=r.indices.length;for(let h=0;h<n.length;h++)n[h].applyTransform=!1;const a=e.batcher;a.ensureAttributeBuffer(s),a.ensureIndexBuffer(o),a.begin();for(let h=0;h<n.length;h++){const c=n[h];a.add(c)}a.finish(e.instructions);const l=a.geometry;l.indexBuffer.setDataWithSize(a.indexBuffer,a.indexSize,!0),l.buffers[0].setDataWithSize(a.attributeBuffer.float32View,a.attributeSize,!0);const u=a.batches;for(let h=0;h<u.length;h++){const c=u[h];c.bindGroup=sc(c.textures.textures,c.textures.count)}return this._graphicsDataContextHash[t.uid]=e,e}_initContext(t){const e=new lf;return e.context=t,this._gpuContextHash[t.uid]=e,t.on("destroy",this.onGraphicsContextDestroy,this),this._gpuContextHash[t.uid]}onGraphicsContextDestroy(t){this._cleanGraphicsContextData(t),t.off("destroy",this.onGraphicsContextDestroy,this),this._gpuContextHash[t.uid]=null}_cleanGraphicsContextData(t){const e=this._gpuContextHash[t.uid];e.isBatchable||this._graphicsDataContextHash[t.uid]&&(oe.return(this.getContextRenderData(t)),this._graphicsDataContextHash[t.uid]=null),e.batches&&e.batches.forEach(n=>{oe.return(n)})}destroy(){for(const t in this._gpuContextHash)this._gpuContextHash[t]&&this.onGraphicsContextDestroy(this._gpuContextHash[t].context)}};qr.extension={type:[U.WebGLSystem,U.WebGPUSystem,U.CanvasSystem],name:"graphicsContext"};qr.defaultOptions={bezierSmoothness:.5};let $a=qr;const hf=8,Li=11920929e-14,cf=1;function Ha(i,t,e,n,r,s,o,a,l,u){const c=Math.min(.99,Math.max(0,u??$a.defaultOptions.bezierSmoothness));let d=(cf-c)/1;return d*=d,ff(t,e,n,r,s,o,a,l,i,d),i}function ff(i,t,e,n,r,s,o,a,l,u){br(i,t,e,n,r,s,o,a,l,u,0),l.push(o,a)}function br(i,t,e,n,r,s,o,a,l,u,h){if(h>hf)return;const c=(i+e)/2,d=(t+n)/2,f=(e+r)/2,x=(n+s)/2,v=(r+o)/2,g=(s+a)/2,y=(c+f)/2,S=(d+x)/2,w=(f+v)/2,T=(x+g)/2,I=(y+w)/2,A=(S+T)/2;if(h>0){let M=o-i,D=a-t;const G=Math.abs((e-o)*D-(n-a)*M),R=Math.abs((r-o)*D-(s-a)*M);if(G>Li&&R>Li){if((G+R)*(G+R)<=u*(M*M+D*D)){l.push(I,A);return}}else if(G>Li){if(G*G<=u*(M*M+D*D)){l.push(I,A);return}}else if(R>Li){if(R*R<=u*(M*M+D*D)){l.push(I,A);return}}else if(M=I-(i+o)/2,D=A-(t+a)/2,M*M+D*D<=u){l.push(I,A);return}}br(i,t,c,d,y,S,I,A,l,u,h+1),br(I,A,w,T,v,g,o,a,l,u,h+1)}const df=8,pf=11920929e-14,mf=1;function gf(i,t,e,n,r,s,o,a){const u=Math.min(.99,Math.max(0,a??$a.defaultOptions.bezierSmoothness));let h=(mf-u)/1;return h*=h,xf(t,e,n,r,s,o,i,h),i}function xf(i,t,e,n,r,s,o,a){Sr(o,i,t,e,n,r,s,a,0),o.push(r,s)}function Sr(i,t,e,n,r,s,o,a,l){if(l>df)return;const u=(t+n)/2,h=(e+r)/2,c=(n+s)/2,d=(r+o)/2,f=(u+c)/2,x=(h+d)/2;let v=s-t,g=o-e;const y=Math.abs((n-s)*g-(r-o)*v);if(y>pf){if(y*y<=a*(v*v+g*g)){i.push(f,x);return}}else if(v=f-(t+s)/2,g=x-(e+o)/2,v*v+g*g<=a){i.push(f,x);return}Sr(i,t,e,u,h,f,x,a,l+1),Sr(i,f,x,c,d,s,o,a,l+1)}function Xa(i,t,e,n,r,s,o,a){let l=Math.abs(r-s);(!o&&r>s||o&&s>r)&&(l=2*Math.PI-l),a||(a=Math.max(6,Math.floor(6*Math.pow(n,1/3)*(l/Math.PI)))),a=Math.max(a,3);let u=l/a,h=r;u*=o?-1:1;for(let c=0;c<a+1;c++){const d=Math.cos(h),f=Math.sin(h),x=t+d*n,v=e+f*n;i.push(x,v),h+=u}}function _f(i,t,e,n,r,s){const o=i[i.length-2],l=i[i.length-1]-e,u=o-t,h=r-e,c=n-t,d=Math.abs(l*c-u*h);if(d<1e-8||s===0){(i[i.length-2]!==t||i[i.length-1]!==e)&&i.push(t,e);return}const f=l*l+u*u,x=h*h+c*c,v=l*h+u*c,g=s*Math.sqrt(f)/d,y=s*Math.sqrt(x)/d,S=g*v/f,w=y*v/x,T=g*c+y*u,I=g*h+y*l,A=u*(y+S),M=l*(y+S),D=c*(g+w),G=h*(g+w),R=Math.atan2(M-I,A-T),E=Math.atan2(G-I,D-T);Xa(i,T+t,I+e,s,R,E,u*h>c*l)}const mi=Math.PI*2,Zn={centerX:0,centerY:0,ang1:0,ang2:0},Qn=({x:i,y:t},e,n,r,s,o,a,l)=>{i*=e,t*=n;const u=r*i-s*t,h=s*i+r*t;return l.x=u+o,l.y=h+a,l};function vf(i,t){const e=t===-1.5707963267948966?-.551915024494:1.3333333333333333*Math.tan(t/4),n=t===1.5707963267948966?.551915024494:e,r=Math.cos(i),s=Math.sin(i),o=Math.cos(i+t),a=Math.sin(i+t);return[{x:r-s*n,y:s+r*n},{x:o+a*n,y:a-o*n},{x:o,y:a}]}const so=(i,t,e,n)=>{const r=i*n-t*e<0?-1:1;let s=i*e+t*n;return s>1&&(s=1),s<-1&&(s=-1),r*Math.acos(s)},yf=(i,t,e,n,r,s,o,a,l,u,h,c,d)=>{const f=Math.pow(r,2),x=Math.pow(s,2),v=Math.pow(h,2),g=Math.pow(c,2);let y=f*x-f*g-x*v;y<0&&(y=0),y/=f*g+x*v,y=Math.sqrt(y)*(o===a?-1:1);const S=y*r/s*c,w=y*-s/r*h,T=u*S-l*w+(i+e)/2,I=l*S+u*w+(t+n)/2,A=(h-S)/r,M=(c-w)/s,D=(-h-S)/r,G=(-c-w)/s,R=so(1,0,A,M);let E=so(A,M,D,G);a===0&&E>0&&(E-=mi),a===1&&E<0&&(E+=mi),d.centerX=T,d.centerY=I,d.ang1=R,d.ang2=E};function bf(i,t,e,n,r,s,o,a=0,l=0,u=0){if(s===0||o===0)return;const h=Math.sin(a*mi/360),c=Math.cos(a*mi/360),d=c*(t-n)/2+h*(e-r)/2,f=-h*(t-n)/2+c*(e-r)/2;if(d===0&&f===0)return;s=Math.abs(s),o=Math.abs(o);const x=Math.pow(d,2)/Math.pow(s,2)+Math.pow(f,2)/Math.pow(o,2);x>1&&(s*=Math.sqrt(x),o*=Math.sqrt(x)),yf(t,e,n,r,s,o,l,u,h,c,d,f,Zn);let{ang1:v,ang2:g}=Zn;const{centerX:y,centerY:S}=Zn;let w=Math.abs(g)/(mi/4);Math.abs(1-w)<1e-7&&(w=1);const T=Math.max(Math.ceil(w),1);g/=T;let I=i[i.length-2],A=i[i.length-1];const M={x:0,y:0};for(let D=0;D<T;D++){const G=vf(v,g),{x:R,y:E}=Qn(G[0],s,o,c,h,y,S,M),{x:ut,y:J}=Qn(G[1],s,o,c,h,y,S,M),{x:tt,y:wt}=Qn(G[2],s,o,c,h,y,S,M);Ha(i,I,A,R,E,ut,J,tt,wt),I=tt,A=wt,v+=g}}function Sf(i,t,e){const n=(o,a)=>{const l=a.x-o.x,u=a.y-o.y,h=Math.sqrt(l*l+u*u),c=l/h,d=u/h;return{len:h,nx:c,ny:d}},r=(o,a)=>{o===0?i.moveTo(a.x,a.y):i.lineTo(a.x,a.y)};let s=t[t.length-1];for(let o=0;o<t.length;o++){const a=t[o%t.length],l=a.radius??e;if(l<=0){r(o,a),s=a;continue}const u=t[(o+1)%t.length],h=n(a,s),c=n(a,u);if(h.len<1e-4||c.len<1e-4){r(o,a),s=a;continue}let d=Math.asin(h.nx*c.ny-h.ny*c.nx),f=1,x=!1;h.nx*c.nx-h.ny*-c.ny<0?d<0?d=Math.PI+d:(d=Math.PI-d,f=-1,x=!0):d>0&&(f=-1,x=!0);const v=d/2;let g,y=Math.abs(Math.cos(v)*l/Math.sin(v));y>Math.min(h.len/2,c.len/2)?(y=Math.min(h.len/2,c.len/2),g=Math.abs(y*Math.sin(v)/Math.cos(v))):g=l;const S=a.x+c.nx*y+-c.ny*g*f,w=a.y+c.ny*y+c.nx*g*f,T=Math.atan2(h.ny,h.nx)+Math.PI/2*f,I=Math.atan2(c.ny,c.nx)-Math.PI/2*f;o===0&&i.moveTo(S+Math.cos(T)*g,w+Math.sin(T)*g),i.arc(S,w,g,T,I,x),s=a}}function wf(i,t,e,n){const r=(a,l)=>Math.sqrt((a.x-l.x)**2+(a.y-l.y)**2),s=(a,l,u)=>({x:a.x+(l.x-a.x)*u,y:a.y+(l.y-a.y)*u}),o=t.length;for(let a=0;a<o;a++){const l=t[(a+1)%o],u=l.radius??e;if(u<=0){a===0?i.moveTo(l.x,l.y):i.lineTo(l.x,l.y);continue}const h=t[a],c=t[(a+2)%o],d=r(h,l);let f;if(d<1e-4)f=l;else{const g=Math.min(d/2,u);f=s(l,h,g/d)}const x=r(c,l);let v;if(x<1e-4)v=l;else{const g=Math.min(x/2,u);v=s(l,c,g/x)}a===0?i.moveTo(f.x,f.y):i.lineTo(f.x,f.y),i.quadraticCurveTo(l.x,l.y,v.x,v.y,n)}}const Cf=new _t;class Tf{constructor(t){this.shapePrimitives=[],this._currentPoly=null,this._bounds=new te,this._graphicsPath2D=t}moveTo(t,e){return this.startPoly(t,e),this}lineTo(t,e){this._ensurePoly();const n=this._currentPoly.points,r=n[n.length-2],s=n[n.length-1];return(r!==t||s!==e)&&n.push(t,e),this}arc(t,e,n,r,s,o){this._ensurePoly(!1);const a=this._currentPoly.points;return Xa(a,t,e,n,r,s,o),this}arcTo(t,e,n,r,s){this._ensurePoly();const o=this._currentPoly.points;return _f(o,t,e,n,r,s),this}arcToSvg(t,e,n,r,s,o,a){const l=this._currentPoly.points;return bf(l,this._currentPoly.lastX,this._currentPoly.lastY,o,a,t,e,n,r,s),this}bezierCurveTo(t,e,n,r,s,o,a){this._ensurePoly();const l=this._currentPoly;return Ha(this._currentPoly.points,l.lastX,l.lastY,t,e,n,r,s,o,a),this}quadraticCurveTo(t,e,n,r,s){this._ensurePoly();const o=this._currentPoly;return gf(this._currentPoly.points,o.lastX,o.lastY,t,e,n,r,s),this}closePath(){return this.endPoly(!0),this}addPath(t,e){this.endPoly(),e&&!e.isIdentity()&&(t=t.clone(!0),t.transform(e));for(let n=0;n<t.instructions.length;n++){const r=t.instructions[n];this[r.action](...r.data)}return this}finish(t=!1){this.endPoly(t)}rect(t,e,n,r,s){return this.drawShape(new _t(t,e,n,r),s),this}circle(t,e,n,r){return this.drawShape(new Xr(t,e,n),r),this}poly(t,e,n){const r=new pi(t);return r.closePath=e,this.drawShape(r,n),this}regularPoly(t,e,n,r,s=0,o){r=Math.max(r|0,3);const a=-1*Math.PI/2+s,l=Math.PI*2/r,u=[];for(let h=0;h<r;h++){const c=a-h*l;u.push(t+n*Math.cos(c),e+n*Math.sin(c))}return this.poly(u,!0,o),this}roundPoly(t,e,n,r,s,o=0,a){if(r=Math.max(r|0,3),s<=0)return this.regularPoly(t,e,n,r,o);const l=n*Math.sin(Math.PI/r)-.001;s=Math.min(s,l);const u=-1*Math.PI/2+o,h=Math.PI*2/r,c=(r-2)*Math.PI/r/2;for(let d=0;d<r;d++){const f=d*h+u,x=t+n*Math.cos(f),v=e+n*Math.sin(f),g=f+Math.PI+c,y=f-Math.PI-c,S=x+s*Math.cos(g),w=v+s*Math.sin(g),T=x+s*Math.cos(y),I=v+s*Math.sin(y);d===0?this.moveTo(S,w):this.lineTo(S,w),this.quadraticCurveTo(x,v,T,I,a)}return this.closePath()}roundShape(t,e,n=!1,r){return t.length<3?this:(n?wf(this,t,e,r):Sf(this,t,e),this.closePath())}filletRect(t,e,n,r,s){if(s===0)return this.rect(t,e,n,r);const o=Math.min(n,r)/2,a=Math.min(o,Math.max(-o,s)),l=t+n,u=e+r,h=a<0?-a:0,c=Math.abs(a);return this.moveTo(t,e+c).arcTo(t+h,e+h,t+c,e,c).lineTo(l-c,e).arcTo(l-h,e+h,l,e+c,c).lineTo(l,u-c).arcTo(l-h,u-h,t+n-c,u,c).lineTo(t+c,u).arcTo(t+h,u-h,t,u-c,c).closePath()}chamferRect(t,e,n,r,s,o){if(s<=0)return this.rect(t,e,n,r);const a=Math.min(s,Math.min(n,r)/2),l=t+n,u=e+r,h=[t+a,e,l-a,e,l,e+a,l,u-a,l-a,u,t+a,u,t,u-a,t,e+a];for(let c=h.length-1;c>=2;c-=2)h[c]===h[c-2]&&h[c-1]===h[c-3]&&h.splice(c-1,2);return this.poly(h,!0,o)}ellipse(t,e,n,r,s){return this.drawShape(new Yr(t,e,n,r),s),this}roundRect(t,e,n,r,s,o){return this.drawShape(new jr(t,e,n,r,s),o),this}drawShape(t,e){return this.endPoly(),this.shapePrimitives.push({shape:t,transform:e}),this}startPoly(t,e){let n=this._currentPoly;return n&&this.endPoly(),n=new pi,n.points.push(t,e),this._currentPoly=n,this}endPoly(t=!1){const e=this._currentPoly;return e&&e.points.length>2&&(e.closePath=t,this.shapePrimitives.push({shape:e})),this._currentPoly=null,this}_ensurePoly(t=!0){if(!this._currentPoly&&(this._currentPoly=new pi,t)){const e=this.shapePrimitives[this.shapePrimitives.length-1];if(e){let n=e.shape.x,r=e.shape.y;if(e.transform&&!e.transform.isIdentity()){const s=e.transform,o=n;n=s.a*n+s.c*r+s.tx,r=s.b*o+s.d*r+s.ty}this._currentPoly.points.push(n,r)}else this._currentPoly.points.push(0,0)}}buildPath(){const t=this._graphicsPath2D;this.shapePrimitives.length=0,this._currentPoly=null;for(let e=0;e<t.instructions.length;e++){const n=t.instructions[e];this[n.action](...n.data)}this.finish()}get bounds(){const t=this._bounds;t.clear();const e=this.shapePrimitives;for(let n=0;n<e.length;n++){const r=e[n],s=r.shape.getBounds(Cf);r.transform?t.addRect(s,r.transform):t.addRect(s)}return t}}class He{constructor(t){this.instructions=[],this.uid=St("graphicsPath"),this._dirty=!0,typeof t=="string"?tc(t,this):this.instructions=t?.slice()??[]}get shapePath(){return this._shapePath||(this._shapePath=new Tf(this)),this._dirty&&(this._dirty=!1,this._shapePath.buildPath()),this._shapePath}addPath(t,e){return t=t.clone(),this.instructions.push({action:"addPath",data:[t,e]}),this._dirty=!0,this}arc(...t){return this.instructions.push({action:"arc",data:t}),this._dirty=!0,this}arcTo(...t){return this.instructions.push({action:"arcTo",data:t}),this._dirty=!0,this}arcToSvg(...t){return this.instructions.push({action:"arcToSvg",data:t}),this._dirty=!0,this}bezierCurveTo(...t){return this.instructions.push({action:"bezierCurveTo",data:t}),this._dirty=!0,this}bezierCurveToShort(t,e,n,r,s){const o=this.instructions[this.instructions.length-1],a=this.getLastPoint(Ft.shared);let l=0,u=0;if(!o||o.action!=="bezierCurveTo")l=a.x,u=a.y;else{l=o.data[2],u=o.data[3];const h=a.x,c=a.y;l=h+(h-l),u=c+(c-u)}return this.instructions.push({action:"bezierCurveTo",data:[l,u,t,e,n,r,s]}),this._dirty=!0,this}closePath(){return this.instructions.push({action:"closePath",data:[]}),this._dirty=!0,this}ellipse(...t){return this.instructions.push({action:"ellipse",data:t}),this._dirty=!0,this}lineTo(...t){return this.instructions.push({action:"lineTo",data:t}),this._dirty=!0,this}moveTo(...t){return this.instructions.push({action:"moveTo",data:t}),this}quadraticCurveTo(...t){return this.instructions.push({action:"quadraticCurveTo",data:t}),this._dirty=!0,this}quadraticCurveToShort(t,e,n){const r=this.instructions[this.instructions.length-1],s=this.getLastPoint(Ft.shared);let o=0,a=0;if(!r||r.action!=="quadraticCurveTo")o=s.x,a=s.y;else{o=r.data[0],a=r.data[1];const l=s.x,u=s.y;o=l+(l-o),a=u+(u-a)}return this.instructions.push({action:"quadraticCurveTo",data:[o,a,t,e,n]}),this._dirty=!0,this}rect(t,e,n,r,s){return this.instructions.push({action:"rect",data:[t,e,n,r,s]}),this._dirty=!0,this}circle(t,e,n,r){return this.instructions.push({action:"circle",data:[t,e,n,r]}),this._dirty=!0,this}roundRect(...t){return this.instructions.push({action:"roundRect",data:t}),this._dirty=!0,this}poly(...t){return this.instructions.push({action:"poly",data:t}),this._dirty=!0,this}regularPoly(...t){return this.instructions.push({action:"regularPoly",data:t}),this._dirty=!0,this}roundPoly(...t){return this.instructions.push({action:"roundPoly",data:t}),this._dirty=!0,this}roundShape(...t){return this.instructions.push({action:"roundShape",data:t}),this._dirty=!0,this}filletRect(...t){return this.instructions.push({action:"filletRect",data:t}),this._dirty=!0,this}chamferRect(...t){return this.instructions.push({action:"chamferRect",data:t}),this._dirty=!0,this}star(t,e,n,r,s,o,a){s||(s=r/2);const l=-1*Math.PI/2+o,u=n*2,h=Math.PI*2/u,c=[];for(let d=0;d<u;d++){const f=d%2?s:r,x=d*h+l;c.push(t+f*Math.cos(x),e+f*Math.sin(x))}return this.poly(c,!0,a),this}clone(t=!1){const e=new He;if(!t)e.instructions=this.instructions.slice();else for(let n=0;n<this.instructions.length;n++){const r=this.instructions[n];e.instructions.push({action:r.action,data:r.data.slice()})}return e}clear(){return this.instructions.length=0,this._dirty=!0,this}transform(t){if(t.isIdentity())return this;const e=t.a,n=t.b,r=t.c,s=t.d,o=t.tx,a=t.ty;let l=0,u=0,h=0,c=0,d=0,f=0,x=0,v=0;for(let g=0;g<this.instructions.length;g++){const y=this.instructions[g],S=y.data;switch(y.action){case"moveTo":case"lineTo":l=S[0],u=S[1],S[0]=e*l+r*u+o,S[1]=n*l+s*u+a;break;case"bezierCurveTo":h=S[0],c=S[1],d=S[2],f=S[3],l=S[4],u=S[5],S[0]=e*h+r*c+o,S[1]=n*h+s*c+a,S[2]=e*d+r*f+o,S[3]=n*d+s*f+a,S[4]=e*l+r*u+o,S[5]=n*l+s*u+a;break;case"quadraticCurveTo":h=S[0],c=S[1],l=S[2],u=S[3],S[0]=e*h+r*c+o,S[1]=n*h+s*c+a,S[2]=e*l+r*u+o,S[3]=n*l+s*u+a;break;case"arcToSvg":l=S[5],u=S[6],x=S[0],v=S[1],S[0]=e*x+r*v,S[1]=n*x+s*v,S[5]=e*l+r*u+o,S[6]=n*l+s*u+a;break;case"circle":S[4]=Qe(S[3],t);break;case"rect":S[4]=Qe(S[4],t);break;case"ellipse":S[8]=Qe(S[8],t);break;case"roundRect":S[5]=Qe(S[5],t);break;case"addPath":S[0].transform(t);break;case"poly":S[2]=Qe(S[2],t);break;default:vt("unknown transform action",y.action);break}}return this._dirty=!0,this}get bounds(){return this.shapePath.bounds}getLastPoint(t){let e=this.instructions.length-1,n=this.instructions[e];if(!n)return t.x=0,t.y=0,t;for(;n.action==="closePath";){if(e--,e<0)return t.x=0,t.y=0,t;n=this.instructions[e]}switch(n.action){case"moveTo":case"lineTo":t.x=n.data[0],t.y=n.data[1];break;case"quadraticCurveTo":t.x=n.data[2],t.y=n.data[3];break;case"bezierCurveTo":t.x=n.data[4],t.y=n.data[5];break;case"arc":case"arcToSvg":t.x=n.data[5],t.y=n.data[6];break;case"addPath":n.data[0].getLastPoint(t);break}return t}}function Qe(i,t){return i?i.prepend(t):t.clone()}function Af(i,t){if(typeof i=="string"){const n=document.createElement("div");n.innerHTML=i.trim(),i=n.querySelector("svg")}const e={context:t,path:new He};return Ya(i,e,null,null),t}function Ya(i,t,e,n){const r=i.children,{fillStyle:s,strokeStyle:o}=Pf(i);s&&e?e={...e,...s}:s&&(e=s),o&&n?n={...n,...o}:o&&(n=o),t.context.fillStyle=e,t.context.strokeStyle=n;let a,l,u,h,c,d,f,x,v,g,y,S,w,T,I,A,M;switch(i.nodeName.toLowerCase()){case"path":T=i.getAttribute("d"),I=new He(T),t.context.path(I),e&&t.context.fill(),n&&t.context.stroke();break;case"circle":f=Ct(i,"cx",0),x=Ct(i,"cy",0),v=Ct(i,"r",0),t.context.ellipse(f,x,v,v),e&&t.context.fill(),n&&t.context.stroke();break;case"rect":a=Ct(i,"x",0),l=Ct(i,"y",0),A=Ct(i,"width",0),M=Ct(i,"height",0),g=Ct(i,"rx",0),y=Ct(i,"ry",0),g||y?t.context.roundRect(a,l,A,M,g||y):t.context.rect(a,l,A,M),e&&t.context.fill(),n&&t.context.stroke();break;case"ellipse":f=Ct(i,"cx",0),x=Ct(i,"cy",0),g=Ct(i,"rx",0),y=Ct(i,"ry",0),t.context.beginPath(),t.context.ellipse(f,x,g,y),e&&t.context.fill(),n&&t.context.stroke();break;case"line":u=Ct(i,"x1",0),h=Ct(i,"y1",0),c=Ct(i,"x2",0),d=Ct(i,"y2",0),t.context.beginPath(),t.context.moveTo(u,h),t.context.lineTo(c,d),n&&t.context.stroke();break;case"polygon":w=i.getAttribute("points"),S=w.match(/\d+/g).map(D=>parseInt(D,10)),t.context.poly(S,!0),e&&t.context.fill(),n&&t.context.stroke();break;case"polyline":w=i.getAttribute("points"),S=w.match(/\d+/g).map(D=>parseInt(D,10)),t.context.poly(S,!1),n&&t.context.stroke();break;case"g":case"svg":break;default:{console.info(`[SVG parser] <${i.nodeName}> elements unsupported`);break}}for(let D=0;D<r.length;D++)Ya(r[D],t,e,n)}function Ct(i,t,e){const n=i.getAttribute(t);return n?Number(n):e}function Pf(i){const t=i.getAttribute("style"),e={},n={};let r=!1,s=!1;if(t){const o=t.split(";");for(let a=0;a<o.length;a++){const l=o[a],[u,h]=l.split(":");switch(u){case"stroke":h!=="none"&&(e.color=K.shared.setValue(h).toNumber(),s=!0);break;case"stroke-width":e.width=Number(h);break;case"fill":h!=="none"&&(r=!0,n.color=K.shared.setValue(h).toNumber());break;case"fill-opacity":n.alpha=Number(h);break;case"stroke-opacity":e.alpha=Number(h);break;case"opacity":n.alpha=Number(h),e.alpha=Number(h);break}}}else{const o=i.getAttribute("stroke");o&&o!=="none"&&(s=!0,e.color=K.shared.setValue(o).toNumber(),e.width=Ct(i,"stroke-width",1));const a=i.getAttribute("fill");a&&a!=="none"&&(r=!0,n.color=K.shared.setValue(a).toNumber())}return{strokeStyle:s?e:null,fillStyle:r?n:null}}function Mf(i){return K.isColorLike(i)}function oo(i){return i instanceof mn}function ao(i){return i instanceof xi}function Ff(i,t,e){const n=K.shared.setValue(t??0);return i.color=n.toNumber(),i.alpha=n.alpha===1?e.alpha:n.alpha,i.texture=k.WHITE,{...e,...i}}function lo(i,t,e){return i.fill=t,i.color=16777215,i.texture=t.texture,i.matrix=t.transform,{...e,...i}}function uo(i,t,e){return t.buildLinearGradient(),i.fill=t,i.color=16777215,i.texture=t.texture,i.matrix=t.transform,{...e,...i}}function If(i,t){const e={...t,...i};if(e.texture){if(e.texture!==k.WHITE){const s=e.matrix?.clone().invert()||new Q;s.translate(e.texture.frame.x,e.texture.frame.y),s.scale(1/e.texture.source.width,1/e.texture.source.height),e.matrix=s}const r=e.texture.source.style;r.addressMode==="clamp-to-edge"&&(r.addressMode="repeat",r.update())}const n=K.shared.setValue(e.color);return e.alpha*=n.alpha,e.color=n.toNumber(),e.matrix=e.matrix?e.matrix.clone():null,e}function Se(i,t){if(i==null)return null;const e={},n=i;return Mf(i)?Ff(e,i,t):oo(i)?lo(e,i,t):ao(i)?uo(e,i,t):n.fill&&oo(n.fill)?lo(n,n.fill,t):n.fill&&ao(n.fill)?uo(n,n.fill,t):If(n,t)}function an(i,t){const{width:e,alignment:n,miterLimit:r,cap:s,join:o,pixelLine:a,...l}=t,u=Se(i,l);return u?{width:e,alignment:n,miterLimit:r,cap:s,join:o,pixelLine:a,...u}:null}const Of=new Ft,ho=new Q,Kr=class Qt extends Ot{constructor(){super(...arguments),this.uid=St("graphicsContext"),this.dirty=!0,this.batchMode="auto",this.instructions=[],this._activePath=new He,this._transform=new Q,this._fillStyle={...Qt.defaultFillStyle},this._strokeStyle={...Qt.defaultStrokeStyle},this._stateStack=[],this._tick=0,this._bounds=new te,this._boundsDirty=!0}clone(){const t=new Qt;return t.batchMode=this.batchMode,t.instructions=this.instructions.slice(),t._activePath=this._activePath.clone(),t._transform=this._transform.clone(),t._fillStyle={...this._fillStyle},t._strokeStyle={...this._strokeStyle},t._stateStack=this._stateStack.slice(),t._bounds=this._bounds.clone(),t._boundsDirty=!0,t}get fillStyle(){return this._fillStyle}set fillStyle(t){this._fillStyle=Se(t,Qt.defaultFillStyle)}get strokeStyle(){return this._strokeStyle}set strokeStyle(t){this._strokeStyle=an(t,Qt.defaultStrokeStyle)}setFillStyle(t){return this._fillStyle=Se(t,Qt.defaultFillStyle),this}setStrokeStyle(t){return this._strokeStyle=Se(t,Qt.defaultStrokeStyle),this}texture(t,e,n,r,s,o){return this.instructions.push({action:"texture",data:{image:t,dx:n||0,dy:r||0,dw:s||t.frame.width,dh:o||t.frame.height,transform:this._transform.clone(),alpha:this._fillStyle.alpha,style:e?K.shared.setValue(e).toNumber():16777215}}),this.onUpdate(),this}beginPath(){return this._activePath=new He,this}fill(t,e){let n;const r=this.instructions[this.instructions.length-1];return this._tick===0&&r&&r.action==="stroke"?n=r.data.path:n=this._activePath.clone(),n?(t!=null&&(e!==void 0&&typeof t=="number"&&(B(pt,"GraphicsContext.fill(color, alpha) is deprecated, use GraphicsContext.fill({ color, alpha }) instead"),t={color:t,alpha:e}),this._fillStyle=Se(t,Qt.defaultFillStyle)),this.instructions.push({action:"fill",data:{style:this.fillStyle,path:n}}),this.onUpdate(),this._initNextPathLocation(),this._tick=0,this):this}_initNextPathLocation(){const{x:t,y:e}=this._activePath.getLastPoint(Ft.shared);this._activePath.clear(),this._activePath.moveTo(t,e)}stroke(t){let e;const n=this.instructions[this.instructions.length-1];return this._tick===0&&n&&n.action==="fill"?e=n.data.path:e=this._activePath.clone(),e?(t!=null&&(this._strokeStyle=an(t,Qt.defaultStrokeStyle)),this.instructions.push({action:"stroke",data:{style:this.strokeStyle,path:e}}),this.onUpdate(),this._initNextPathLocation(),this._tick=0,this):this}cut(){for(let t=0;t<2;t++){const e=this.instructions[this.instructions.length-1-t],n=this._activePath.clone();if(e&&(e.action==="stroke"||e.action==="fill"))if(e.data.hole)e.data.hole.addPath(n);else{e.data.hole=n;break}}return this._initNextPathLocation(),this}arc(t,e,n,r,s,o){this._tick++;const a=this._transform;return this._activePath.arc(a.a*t+a.c*e+a.tx,a.b*t+a.d*e+a.ty,n,r,s,o),this}arcTo(t,e,n,r,s){this._tick++;const o=this._transform;return this._activePath.arcTo(o.a*t+o.c*e+o.tx,o.b*t+o.d*e+o.ty,o.a*n+o.c*r+o.tx,o.b*n+o.d*r+o.ty,s),this}arcToSvg(t,e,n,r,s,o,a){this._tick++;const l=this._transform;return this._activePath.arcToSvg(t,e,n,r,s,l.a*o+l.c*a+l.tx,l.b*o+l.d*a+l.ty),this}bezierCurveTo(t,e,n,r,s,o,a){this._tick++;const l=this._transform;return this._activePath.bezierCurveTo(l.a*t+l.c*e+l.tx,l.b*t+l.d*e+l.ty,l.a*n+l.c*r+l.tx,l.b*n+l.d*r+l.ty,l.a*s+l.c*o+l.tx,l.b*s+l.d*o+l.ty,a),this}closePath(){return this._tick++,this._activePath?.closePath(),this}ellipse(t,e,n,r){return this._tick++,this._activePath.ellipse(t,e,n,r,this._transform.clone()),this}circle(t,e,n){return this._tick++,this._activePath.circle(t,e,n,this._transform.clone()),this}path(t){return this._tick++,this._activePath.addPath(t,this._transform.clone()),this}lineTo(t,e){this._tick++;const n=this._transform;return this._activePath.lineTo(n.a*t+n.c*e+n.tx,n.b*t+n.d*e+n.ty),this}moveTo(t,e){this._tick++;const n=this._transform,r=this._activePath.instructions,s=n.a*t+n.c*e+n.tx,o=n.b*t+n.d*e+n.ty;return r.length===1&&r[0].action==="moveTo"?(r[0].data[0]=s,r[0].data[1]=o,this):(this._activePath.moveTo(s,o),this)}quadraticCurveTo(t,e,n,r,s){this._tick++;const o=this._transform;return this._activePath.quadraticCurveTo(o.a*t+o.c*e+o.tx,o.b*t+o.d*e+o.ty,o.a*n+o.c*r+o.tx,o.b*n+o.d*r+o.ty,s),this}rect(t,e,n,r){return this._tick++,this._activePath.rect(t,e,n,r,this._transform.clone()),this}roundRect(t,e,n,r,s){return this._tick++,this._activePath.roundRect(t,e,n,r,s,this._transform.clone()),this}poly(t,e){return this._tick++,this._activePath.poly(t,e,this._transform.clone()),this}regularPoly(t,e,n,r,s=0,o){return this._tick++,this._activePath.regularPoly(t,e,n,r,s,o),this}roundPoly(t,e,n,r,s,o){return this._tick++,this._activePath.roundPoly(t,e,n,r,s,o),this}roundShape(t,e,n,r){return this._tick++,this._activePath.roundShape(t,e,n,r),this}filletRect(t,e,n,r,s){return this._tick++,this._activePath.filletRect(t,e,n,r,s),this}chamferRect(t,e,n,r,s,o){return this._tick++,this._activePath.chamferRect(t,e,n,r,s,o),this}star(t,e,n,r,s=0,o=0){return this._tick++,this._activePath.star(t,e,n,r,s,o,this._transform.clone()),this}svg(t){return this._tick++,Af(t,this),this}restore(){const t=this._stateStack.pop();return t&&(this._transform=t.transform,this._fillStyle=t.fillStyle,this._strokeStyle=t.strokeStyle),this}save(){return this._stateStack.push({transform:this._transform.clone(),fillStyle:{...this._fillStyle},strokeStyle:{...this._strokeStyle}}),this}getTransform(){return this._transform}resetTransform(){return this._transform.identity(),this}rotate(t){return this._transform.rotate(t),this}scale(t,e=t){return this._transform.scale(t,e),this}setTransform(t,e,n,r,s,o){return t instanceof Q?(this._transform.set(t.a,t.b,t.c,t.d,t.tx,t.ty),this):(this._transform.set(t,e,n,r,s,o),this)}transform(t,e,n,r,s,o){return t instanceof Q?(this._transform.append(t),this):(ho.set(t,e,n,r,s,o),this._transform.append(ho),this)}translate(t,e=t){return this._transform.translate(t,e),this}clear(){return this._activePath.clear(),this.instructions.length=0,this.resetTransform(),this.onUpdate(),this}onUpdate(){this.dirty||(this.emit("update",this,16),this.dirty=!0,this._boundsDirty=!0)}get bounds(){if(!this._boundsDirty)return this._bounds;const t=this._bounds;t.clear();for(let e=0;e<this.instructions.length;e++){const n=this.instructions[e],r=n.action;if(r==="fill"){const s=n.data;t.addBounds(s.path.bounds)}else if(r==="texture"){const s=n.data;t.addFrame(s.dx,s.dy,s.dx+s.dw,s.dy+s.dh,s.transform)}if(r==="stroke"){const s=n.data,o=s.style.alignment,a=s.style.width*(1-o),l=s.path.bounds;t.addFrame(l.minX-a,l.minY-a,l.maxX+a,l.maxY+a)}}return t}containsPoint(t){if(!this.bounds.containsPoint(t.x,t.y))return!1;const e=this.instructions;let n=!1;for(let r=0;r<e.length;r++){const s=e[r],o=s.data,a=o.path;if(!s.action||!a)continue;const l=o.style,u=a.shapePath.shapePrimitives;for(let h=0;h<u.length;h++){const c=u[h].shape;if(!l||!c)continue;const d=u[h].transform,f=d?d.applyInverse(t,Of):t;if(s.action==="fill")n=c.contains(f.x,f.y);else{const v=l;n=c.strokeContains(f.x,f.y,v.width,v.alignment)}const x=o.hole;if(x){const v=x.shapePath?.shapePrimitives;if(v)for(let g=0;g<v.length;g++)v[g].shape.contains(f.x,f.y)&&(n=!1)}if(n)return!0}}return n}destroy(t=!1){if(this._stateStack.length=0,this._transform=null,this.emit("destroy",this),this.removeAllListeners(),typeof t=="boolean"?t:t?.texture){const n=typeof t=="boolean"?t:t?.textureSource;this._fillStyle.texture&&this._fillStyle.texture.destroy(n),this._strokeStyle.texture&&this._strokeStyle.texture.destroy(n)}this._fillStyle=null,this._strokeStyle=null,this.instructions=null,this._activePath=null,this._bounds=null,this._stateStack=null,this.customShader=null,this._transform=null}};Kr.defaultFillStyle={color:16777215,alpha:1,texture:k.WHITE,matrix:null,fill:null};Kr.defaultStrokeStyle={width:1,color:16777215,alpha:1,alignment:.5,miterLimit:10,cap:"butt",join:"miter",texture:k.WHITE,matrix:null,fill:null,pixelLine:!1};let ve=Kr;const co=["align","breakWords","cssOverrides","fontVariant","fontWeight","leading","letterSpacing","lineHeight","padding","textBaseline","trim","whiteSpace","wordWrap","wordWrapWidth","fontFamily","fontStyle","fontSize"];function Rf(i){const t=[];let e=0;for(let n=0;n<co.length;n++){const r=`_${co[n]}`;t[e++]=i[r]}return e=ja(i._fill,t,e),e=Ef(i._stroke,t,e),e=Uf(i.dropShadow,t,e),t.join("-")}function ja(i,t,e){return i&&(t[e++]=i.color,t[e++]=i.alpha,t[e++]=i.fill?.styleKey),e}function Ef(i,t,e){return i&&(e=ja(i,t,e),t[e++]=i.width,t[e++]=i.alignment,t[e++]=i.cap,t[e++]=i.join,t[e++]=i.miterLimit),e}function Uf(i,t,e){return i&&(t[e++]=i.alpha,t[e++]=i.angle,t[e++]=i.blur,t[e++]=i.distance,t[e++]=K.shared.setValue(i.color).toNumber()),e}const Zr=class Re extends Ot{constructor(t={}){super(),zf(t);const e={...Re.defaultTextStyle,...t};for(const n in e){const r=n;this[r]=e[n]}this.update()}get align(){return this._align}set align(t){this._align=t,this.update()}get breakWords(){return this._breakWords}set breakWords(t){this._breakWords=t,this.update()}get dropShadow(){return this._dropShadow}set dropShadow(t){t!==null&&typeof t=="object"?this._dropShadow=this._createProxy({...Re.defaultDropShadow,...t}):this._dropShadow=t?this._createProxy({...Re.defaultDropShadow}):null,this.update()}get fontFamily(){return this._fontFamily}set fontFamily(t){this._fontFamily=t,this.update()}get fontSize(){return this._fontSize}set fontSize(t){typeof t=="string"?this._fontSize=parseInt(t,10):this._fontSize=t,this.update()}get fontStyle(){return this._fontStyle}set fontStyle(t){this._fontStyle=t.toLowerCase(),this.update()}get fontVariant(){return this._fontVariant}set fontVariant(t){this._fontVariant=t,this.update()}get fontWeight(){return this._fontWeight}set fontWeight(t){this._fontWeight=t,this.update()}get leading(){return this._leading}set leading(t){this._leading=t,this.update()}get letterSpacing(){return this._letterSpacing}set letterSpacing(t){this._letterSpacing=t,this.update()}get lineHeight(){return this._lineHeight}set lineHeight(t){this._lineHeight=t,this.update()}get padding(){return this._padding}set padding(t){this._padding=t,this.update()}get trim(){return this._trim}set trim(t){this._trim=t,this.update()}get textBaseline(){return this._textBaseline}set textBaseline(t){this._textBaseline=t,this.update()}get whiteSpace(){return this._whiteSpace}set whiteSpace(t){this._whiteSpace=t,this.update()}get wordWrap(){return this._wordWrap}set wordWrap(t){this._wordWrap=t,this.update()}get wordWrapWidth(){return this._wordWrapWidth}set wordWrapWidth(t){this._wordWrapWidth=t,this.update()}get fill(){return this._originalFill}set fill(t){t!==this._originalFill&&(this._originalFill=t,this._isFillStyle(t)&&(this._originalFill=this._createProxy({...ve.defaultFillStyle,...t},()=>{this._fill=Se({...this._originalFill},ve.defaultFillStyle)})),this._fill=Se(t===0?"black":t,ve.defaultFillStyle),this.update())}get stroke(){return this._originalStroke}set stroke(t){t!==this._originalStroke&&(this._originalStroke=t,this._isFillStyle(t)&&(this._originalStroke=this._createProxy({...ve.defaultStrokeStyle,...t},()=>{this._stroke=an({...this._originalStroke},ve.defaultStrokeStyle)})),this._stroke=an(t,ve.defaultStrokeStyle),this.update())}_generateKey(){return this._styleKey=Rf(this),this._styleKey}update(){this._styleKey=null,this.emit("update",this)}reset(){const t=Re.defaultTextStyle;for(const e in t)this[e]=t[e]}get styleKey(){return this._styleKey||this._generateKey()}clone(){return new Re({align:this.align,breakWords:this.breakWords,dropShadow:this._dropShadow?{...this._dropShadow}:null,fill:this._fill,fontFamily:this.fontFamily,fontSize:this.fontSize,fontStyle:this.fontStyle,fontVariant:this.fontVariant,fontWeight:this.fontWeight,leading:this.leading,letterSpacing:this.letterSpacing,lineHeight:this.lineHeight,padding:this.padding,stroke:this._stroke,textBaseline:this.textBaseline,whiteSpace:this.whiteSpace,wordWrap:this.wordWrap,wordWrapWidth:this.wordWrapWidth})}destroy(t=!1){if(this.removeAllListeners(),typeof t=="boolean"?t:t?.texture){const n=typeof t=="boolean"?t:t?.textureSource;this._fill?.texture&&this._fill.texture.destroy(n),this._originalFill?.texture&&this._originalFill.texture.destroy(n),this._stroke?.texture&&this._stroke.texture.destroy(n),this._originalStroke?.texture&&this._originalStroke.texture.destroy(n)}this._fill=null,this._stroke=null,this.dropShadow=null,this._originalStroke=null,this._originalFill=null}_createProxy(t,e){return new Proxy(t,{set:(n,r,s)=>(n[r]=s,e?.(r,s),this.update(),!0)})}_isFillStyle(t){return(t??null)!==null&&!(K.isColorLike(t)||t instanceof xi||t instanceof mn)}};Zr.defaultDropShadow={alpha:1,angle:Math.PI/6,blur:0,color:"black",distance:5};Zr.defaultTextStyle={align:"left",breakWords:!1,dropShadow:null,fill:"black",fontFamily:"Arial",fontSize:26,fontStyle:"normal",fontVariant:"normal",fontWeight:"normal",leading:0,letterSpacing:0,lineHeight:0,padding:0,stroke:null,textBaseline:"alphabetic",trim:!1,whiteSpace:"pre",wordWrap:!1,wordWrapWidth:100};let de=Zr;function zf(i){const t=i;if(typeof t.dropShadow=="boolean"&&t.dropShadow){const e=de.defaultDropShadow;i.dropShadow={alpha:t.dropShadowAlpha??e.alpha,angle:t.dropShadowAngle??e.angle,blur:t.dropShadowBlur??e.blur,color:t.dropShadowColor??e.color,distance:t.dropShadowDistance??e.distance}}if(t.strokeThickness!==void 0){B(pt,"strokeThickness is now a part of stroke");const e=t.stroke;let n={};if(K.isColorLike(e))n.color=e;else if(e instanceof xi||e instanceof mn)n.fill=e;else if(Object.hasOwnProperty.call(e,"color")||Object.hasOwnProperty.call(e,"fill"))n=e;else throw new Error("Invalid stroke value.");i.stroke={...n,width:t.strokeThickness}}if(Array.isArray(t.fillGradientStops)){B(pt,"gradient fill is now a fill pattern: `new FillGradient(...)`");let e;i.fontSize==null?i.fontSize=de.defaultTextStyle.fontSize:typeof i.fontSize=="string"?e=parseInt(i.fontSize,10):e=i.fontSize;const n=new xi(0,0,0,e*1.7),r=t.fillGradientStops.map(s=>K.shared.setValue(s).toNumber());r.forEach((s,o)=>{const a=o/(r.length-1);n.addColorStop(a,s)}),i.fill={fill:n}}}class kf{constructor(t){this._canvasPool=Object.create(null),this.canvasOptions=t||{},this.enableFullScreen=!1}_createCanvasAndContext(t,e){const n=ft.get().createCanvas();n.width=t,n.height=e;const r=n.getContext("2d");return{canvas:n,context:r}}getOptimalCanvasAndContext(t,e,n=1){t=Math.ceil(t*n-1e-6),e=Math.ceil(e*n-1e-6),t=nn(t),e=nn(e);const r=(t<<17)+(e<<1);this._canvasPool[r]||(this._canvasPool[r]=[]);let s=this._canvasPool[r].pop();return s||(s=this._createCanvasAndContext(t,e)),s}returnCanvasAndContext(t){const e=t.canvas,{width:n,height:r}=e,s=(n<<17)+(r<<1);t.context.clearRect(0,0,n,r),this._canvasPool[s].push(t)}clear(){this._canvasPool={}}}const fo=new kf,Lf=["serif","sans-serif","monospace","cursive","fantasy","system-ui"];function wr(i){const t=typeof i.fontSize=="number"?`${i.fontSize}px`:i.fontSize;let e=i.fontFamily;Array.isArray(i.fontFamily)||(e=i.fontFamily.split(","));for(let n=e.length-1;n>=0;n--){let r=e[n].trim();!/([\"\'])[^\'\"]+\1/.test(r)&&!Lf.includes(r)&&(r=`"${r}"`),e[n]=r}return`${i.fontStyle} ${i.fontVariant} ${i.fontWeight} ${t} ${e.join(",")}`}const Jn={willReadFrequently:!0},Xt=class z{static get experimentalLetterSpacingSupported(){let t=z._experimentalLetterSpacingSupported;if(t!==void 0){const e=ft.get().getCanvasRenderingContext2D().prototype;t=z._experimentalLetterSpacingSupported="letterSpacing"in e||"textLetterSpacing"in e}return t}constructor(t,e,n,r,s,o,a,l,u){this.text=t,this.style=e,this.width=n,this.height=r,this.lines=s,this.lineWidths=o,this.lineHeight=a,this.maxLineWidth=l,this.fontProperties=u}static measureText(t=" ",e,n=z._canvas,r=e.wordWrap){const s=`${t}:${e.styleKey}`;if(z._measurementCache[s])return z._measurementCache[s];const o=wr(e),a=z.measureFont(o);a.fontSize===0&&(a.fontSize=e.fontSize,a.ascent=e.fontSize);const l=z.__context;l.font=o;const h=(r?z._wordWrap(t,e,n):t).split(/(?:\r\n|\r|\n)/),c=new Array(h.length);let d=0;for(let S=0;S<h.length;S++){const w=z._measureText(h[S],e.letterSpacing,l);c[S]=w,d=Math.max(d,w)}const f=e._stroke?.width||0;let x=d+f;e.dropShadow&&(x+=e.dropShadow.distance);const v=e.lineHeight||a.fontSize;let g=Math.max(v,a.fontSize+f)+(h.length-1)*(v+e.leading);return e.dropShadow&&(g+=e.dropShadow.distance),new z(t,e,x,g,h,c,v+e.leading,d,a)}static _measureText(t,e,n){let r=!1;z.experimentalLetterSpacingSupported&&(z.experimentalLetterSpacing?(n.letterSpacing=`${e}px`,n.textLetterSpacing=`${e}px`,r=!0):(n.letterSpacing="0px",n.textLetterSpacing="0px"));const s=n.measureText(t);let o=s.width;const a=-s.actualBoundingBoxLeft;let u=s.actualBoundingBoxRight-a;if(o>0)if(r)o-=e,u-=e;else{const h=(z.graphemeSegmenter(t).length-1)*e;o+=h,u+=h}return Math.max(o,u)}static _wordWrap(t,e,n=z._canvas){const r=n.getContext("2d",Jn);let s=0,o="",a="";const l=Object.create(null),{letterSpacing:u,whiteSpace:h}=e,c=z._collapseSpaces(h),d=z._collapseNewlines(h);let f=!c;const x=e.wordWrapWidth+u,v=z._tokenize(t);for(let g=0;g<v.length;g++){let y=v[g];if(z._isNewline(y)){if(!d){a+=z._addLine(o),f=!c,o="",s=0;continue}y=" "}if(c){const w=z.isBreakingSpace(y),T=z.isBreakingSpace(o[o.length-1]);if(w&&T)continue}const S=z._getFromCache(y,u,l,r);if(S>x)if(o!==""&&(a+=z._addLine(o),o="",s=0),z.canBreakWords(y,e.breakWords)){const w=z.wordWrapSplit(y);for(let T=0;T<w.length;T++){let I=w[T],A=I,M=1;for(;w[T+M];){const G=w[T+M];if(!z.canBreakChars(A,G,y,T,e.breakWords))I+=G;else break;A=G,M++}T+=M-1;const D=z._getFromCache(I,u,l,r);D+s>x&&(a+=z._addLine(o),f=!1,o="",s=0),o+=I,s+=D}}else{o.length>0&&(a+=z._addLine(o),o="",s=0);const w=g===v.length-1;a+=z._addLine(y,!w),f=!1,o="",s=0}else S+s>x&&(f=!1,a+=z._addLine(o),o="",s=0),(o.length>0||!z.isBreakingSpace(y)||f)&&(o+=y,s+=S)}return a+=z._addLine(o,!1),a}static _addLine(t,e=!0){return t=z._trimRight(t),t=e?`${t}
`:t,t}static _getFromCache(t,e,n,r){let s=n[t];return typeof s!="number"&&(s=z._measureText(t,e,r)+e,n[t]=s),s}static _collapseSpaces(t){return t==="normal"||t==="pre-line"}static _collapseNewlines(t){return t==="normal"}static _trimRight(t){if(typeof t!="string")return"";for(let e=t.length-1;e>=0;e--){const n=t[e];if(!z.isBreakingSpace(n))break;t=t.slice(0,-1)}return t}static _isNewline(t){return typeof t!="string"?!1:z._newlines.includes(t.charCodeAt(0))}static isBreakingSpace(t,e){return typeof t!="string"?!1:z._breakingSpaces.includes(t.charCodeAt(0))}static _tokenize(t){const e=[];let n="";if(typeof t!="string")return e;for(let r=0;r<t.length;r++){const s=t[r],o=t[r+1];if(z.isBreakingSpace(s,o)||z._isNewline(s)){n!==""&&(e.push(n),n=""),e.push(s);continue}n+=s}return n!==""&&e.push(n),e}static canBreakWords(t,e){return e}static canBreakChars(t,e,n,r,s){return!0}static wordWrapSplit(t){return z.graphemeSegmenter(t)}static measureFont(t){if(z._fonts[t])return z._fonts[t];const e=z._context;e.font=t;const n=e.measureText(z.METRICS_STRING+z.BASELINE_SYMBOL),r={ascent:n.actualBoundingBoxAscent,descent:n.actualBoundingBoxDescent,fontSize:n.actualBoundingBoxAscent+n.actualBoundingBoxDescent};return z._fonts[t]=r,r}static clearMetrics(t=""){t?delete z._fonts[t]:z._fonts={}}static get _canvas(){if(!z.__canvas){let t;try{const e=new OffscreenCanvas(0,0);if(e.getContext("2d",Jn)?.measureText)return z.__canvas=e,e;t=ft.get().createCanvas()}catch{t=ft.get().createCanvas()}t.width=t.height=10,z.__canvas=t}return z.__canvas}static get _context(){return z.__context||(z.__context=z._canvas.getContext("2d",Jn)),z.__context}};Xt.METRICS_STRING="|ÉqÅ";Xt.BASELINE_SYMBOL="M";Xt.BASELINE_MULTIPLIER=1.4;Xt.HEIGHT_MULTIPLIER=2;Xt.graphemeSegmenter=(()=>{if(typeof Intl?.Segmenter=="function"){const i=new Intl.Segmenter;return t=>[...i.segment(t)].map(e=>e.segment)}return i=>[...i]})();Xt.experimentalLetterSpacing=!1;Xt._fonts={};Xt._newlines=[10,13];Xt._breakingSpaces=[9,32,8192,8193,8194,8195,8196,8197,8198,8200,8201,8202,8287,12288];Xt._measurementCache={};let Cr=Xt;function po(i,t){if(i.texture===k.WHITE&&!i.fill)return K.shared.setValue(i.color).setAlpha(i.alpha??1).toHexa();if(i.fill){if(i.fill instanceof mn){const e=i.fill,n=t.createPattern(e.texture.source.resource,"repeat"),r=e.transform.copyTo(Q.shared);return r.scale(e.texture.frame.width,e.texture.frame.height),n.setTransform(r),n}else if(i.fill instanceof xi){const e=i.fill;if(e.type==="linear"){const n=t.createLinearGradient(e.x0,e.y0,e.x1,e.y1);return e.gradientStops.forEach(r=>{n.addColorStop(r.offset,K.shared.setValue(r.color).toHex())}),n}}}else{const e=t.createPattern(i.texture.source.resource,"repeat"),n=i.matrix.copyTo(Q.shared);return n.scale(i.texture.frame.width,i.texture.frame.height),e.setTransform(n),e}return vt("FillStyle not recognised",i),"red"}function qa(i){if(i==="")return[];typeof i=="string"&&(i=[i]);const t=[];for(let e=0,n=i.length;e<n;e++){const r=i[e];if(Array.isArray(r)){if(r.length!==2)throw new Error(`[BitmapFont]: Invalid character range length, expecting 2 got ${r.length}.`);if(r[0].length===0||r[1].length===0)throw new Error("[BitmapFont]: Invalid character delimiter.");const s=r[0].charCodeAt(0),o=r[1].charCodeAt(0);if(o<s)throw new Error("[BitmapFont]: Invalid character range.");for(let a=s,l=o;a<=l;a++)t.push(String.fromCharCode(a))}else t.push(...Array.from(r))}if(t.length===0)throw new Error("[BitmapFont]: Empty set when resolving characters.");return t}const Ka=class Za extends Ma{constructor(t){super(),this.resolution=1,this.pages=[],this._padding=0,this._measureCache=Object.create(null),this._currentChars=[],this._currentX=0,this._currentY=0,this._currentPageIndex=-1,this._skipKerning=!1;const e={...Za.defaultOptions,...t};this._textureSize=e.textureSize,this._mipmap=e.mipmap;const n=e.style.clone();e.overrideFill&&(n._fill.color=16777215,n._fill.alpha=1,n._fill.texture=k.WHITE,n._fill.fill=null),this.applyFillAsTint=e.overrideFill;const r=n.fontSize;n.fontSize=this.baseMeasurementFontSize;const s=wr(n);e.overrideSize?n._stroke&&(n._stroke.width*=this.baseRenderedFontSize/r):n.fontSize=this.baseRenderedFontSize=r,this._style=n,this._skipKerning=e.skipKerning??!1,this.resolution=e.resolution??1,this._padding=e.padding??4,this.fontMetrics=Cr.measureFont(s),this.lineHeight=n.lineHeight||this.fontMetrics.fontSize||n.fontSize}ensureCharacters(t){const e=qa(t).filter(g=>!this._currentChars.includes(g)).filter((g,y,S)=>S.indexOf(g)===y);if(!e.length)return;this._currentChars=[...this._currentChars,...e];let n;this._currentPageIndex===-1?n=this._nextPage():n=this.pages[this._currentPageIndex];let{canvas:r,context:s}=n.canvasAndContext,o=n.texture.source;const a=this._style;let l=this._currentX,u=this._currentY;const h=this.baseRenderedFontSize/this.baseMeasurementFontSize,c=this._padding*h;let d=0,f=!1;const x=r.width/this.resolution,v=r.height/this.resolution;for(let g=0;g<e.length;g++){const y=e[g],S=Cr.measureText(y,a,r,!1);S.lineHeight=S.height;const w=S.width*h,T=Math.ceil((a.fontStyle==="italic"?2:1)*w),I=S.height*h,A=T+c*2,M=I+c*2;if(f=!1,y!==`
`&&y!=="\r"&&y!=="	"&&y!==" "&&(f=!0,d=Math.ceil(Math.max(M,d))),l+A>x&&(u+=d,d=M,l=0,u+d>v)){o.update();const G=this._nextPage();r=G.canvasAndContext.canvas,s=G.canvasAndContext.context,o=G.texture.source,u=0}const D=w/h-(a.dropShadow?.distance??0)-(a._stroke?.width??0);if(this.chars[y]={id:y.codePointAt(0),xOffset:-this._padding,yOffset:-this._padding,xAdvance:D,kerning:{}},f){this._drawGlyph(s,S,l+c,u+c,h,a);const G=o.width*h,R=o.height*h,E=new _t(l/G*o.width,u/R*o.height,A/G*o.width,M/R*o.height);this.chars[y].texture=new k({source:o,frame:E}),l+=Math.ceil(A)}}o.update(),this._currentX=l,this._currentY=u,this._skipKerning&&this._applyKerning(e,s)}get pageTextures(){return B(pt,"BitmapFont.pageTextures is deprecated, please use BitmapFont.pages instead."),this.pages}_applyKerning(t,e){const n=this._measureCache;for(let r=0;r<t.length;r++){const s=t[r];for(let o=0;o<this._currentChars.length;o++){const a=this._currentChars[o];let l=n[s];l||(l=n[s]=e.measureText(s).width);let u=n[a];u||(u=n[a]=e.measureText(a).width);let h=e.measureText(s+a).width,c=h-(l+u);c&&(this.chars[s].kerning[a]=c),h=e.measureText(s+a).width,c=h-(l+u),c&&(this.chars[a].kerning[s]=c)}}}_nextPage(){this._currentPageIndex++;const t=this.resolution,e=fo.getOptimalCanvasAndContext(this._textureSize,this._textureSize,t);this._setupContext(e.context,this._style,t);const n=t*(this.baseRenderedFontSize/this.baseMeasurementFontSize),r=new k({source:new Ae({resource:e.canvas,resolution:n,alphaMode:"premultiply-alpha-on-upload",autoGenerateMipmaps:this._mipmap})}),s={canvasAndContext:e,texture:r};return this.pages[this._currentPageIndex]=s,s}_setupContext(t,e,n){e.fontSize=this.baseRenderedFontSize,t.scale(n,n),t.font=wr(e),e.fontSize=this.baseMeasurementFontSize,t.textBaseline=e.textBaseline;const r=e._stroke,s=r?.width??0;if(r&&(t.lineWidth=s,t.lineJoin=r.join,t.miterLimit=r.miterLimit,t.strokeStyle=po(r,t)),e._fill&&(t.fillStyle=po(e._fill,t)),e.dropShadow){const o=e.dropShadow,a=K.shared.setValue(o.color).toArray(),l=o.blur*n,u=o.distance*n;t.shadowColor=`rgba(${a[0]*255},${a[1]*255},${a[2]*255},${o.alpha})`,t.shadowBlur=l,t.shadowOffsetX=Math.cos(o.angle)*u,t.shadowOffsetY=Math.sin(o.angle)*u}else t.shadowColor="black",t.shadowBlur=0,t.shadowOffsetX=0,t.shadowOffsetY=0}_drawGlyph(t,e,n,r,s,o){const a=e.text,l=e.fontProperties,h=(o._stroke?.width??0)*s,c=n+h/2,d=r-h/2,f=l.descent*s,x=e.lineHeight*s;o.stroke&&h&&t.strokeText(a,c,d+x-f),o._fill&&t.fillText(a,c,d+x-f)}destroy(){super.destroy();for(let t=0;t<this.pages.length;t++){const{canvasAndContext:e,texture:n}=this.pages[t];fo.returnCanvasAndContext(e),n.destroy(!0)}this.pages=null}};Ka.defaultOptions={textureSize:512,style:new de,mipmap:!0};let mo=Ka;function Bf(i,t,e,n){const r={width:0,height:0,offsetY:0,scale:t.fontSize/e.baseMeasurementFontSize,lines:[{width:0,charPositions:[],spaceWidth:0,spacesIndex:[],chars:[]}]};r.offsetY=e.baseLineOffset;let s=r.lines[0],o=null,a=!0;const l={spaceWord:!1,width:0,start:0,index:0,positions:[],chars:[]},u=x=>{const v=s.width;for(let g=0;g<l.index;g++){const y=x.positions[g];s.chars.push(x.chars[g]),s.charPositions.push(y+v)}s.width+=x.width,a=!1,l.width=0,l.index=0,l.chars.length=0},h=()=>{let x=s.chars.length-1;if(n){let v=s.chars[x];for(;v===" ";)s.width-=e.chars[v].xAdvance,v=s.chars[--x]}r.width=Math.max(r.width,s.width),s={width:0,charPositions:[],chars:[],spaceWidth:0,spacesIndex:[]},a=!0,r.lines.push(s),r.height+=e.lineHeight},c=e.baseMeasurementFontSize/t.fontSize,d=t.letterSpacing*c,f=t.wordWrapWidth*c;for(let x=0;x<i.length+1;x++){let v;const g=x===i.length;g||(v=i[x]);const y=e.chars[v]||e.chars[" "];if(/(?:\s)/.test(v)||v==="\r"||v===`
`||g){if(!a&&t.wordWrap&&s.width+l.width-d>f?(h(),u(l),g||s.charPositions.push(0)):(l.start=s.width,u(l),g||s.charPositions.push(0)),v==="\r"||v===`
`)s.width!==0&&h();else if(!g){const I=y.xAdvance+(y.kerning[o]||0)+d;s.width+=I,s.spaceWidth=I,s.spacesIndex.push(s.charPositions.length),s.chars.push(v)}}else{const T=y.kerning[o]||0,I=y.xAdvance+T+d;l.positions[l.index++]=l.width+T,l.chars.push(v),l.width+=I}o=v}return h(),t.align==="center"?Df(r):t.align==="right"?Nf(r):t.align==="justify"&&Gf(r),r}function Df(i){for(let t=0;t<i.lines.length;t++){const e=i.lines[t],n=i.width/2-e.width/2;for(let r=0;r<e.charPositions.length;r++)e.charPositions[r]+=n}}function Nf(i){for(let t=0;t<i.lines.length;t++){const e=i.lines[t],n=i.width-e.width;for(let r=0;r<e.charPositions.length;r++)e.charPositions[r]+=n}}function Gf(i){const t=i.width;for(let e=0;e<i.lines.length;e++){const n=i.lines[e];let r=0,s=n.spacesIndex[r++],o=0;const a=n.spacesIndex.length,u=(t-n.width)/a;for(let h=0;h<n.charPositions.length;h++)h===s&&(s=n.spacesIndex[r++],o+=u),n.charPositions[h]+=o}}let Bi=0;class Vf{constructor(){this.ALPHA=[["a","z"],["A","Z"]," "],this.NUMERIC=[["0","9"]],this.ALPHANUMERIC=[["a","z"],["A","Z"],["0","9"]," "],this.ASCII=[[" ","~"]],this.defaultOptions={chars:this.ALPHANUMERIC,resolution:1,padding:4,skipKerning:!1}}getFont(t,e){let n=`${e.fontFamily}-bitmap`,r=!0;if(e._fill.fill&&!e._stroke)n+=e._fill.fill.styleKey,r=!1;else if(e._stroke||e.dropShadow){let o=e.styleKey;o=o.substring(0,o.lastIndexOf("-")),n=`${o}-bitmap`,r=!1}if(!gt.has(n)){const o=new mo({style:e,overrideFill:r,overrideSize:!0,...this.defaultOptions});Bi++,Bi>50&&vt("BitmapText",`You have dynamically created ${Bi} bitmap fonts, this can be inefficient. Try pre installing your font styles using \`BitmapFont.install({name:"style1", style})\``),o.once("destroy",()=>{Bi--,gt.remove(n)}),gt.set(n,o)}const s=gt.get(n);return s.ensureCharacters?.(t),s}getLayout(t,e,n=!0){const r=this.getFont(t,e);return Bf([...t],e,r,n)}measureText(t,e,n=!0){return this.getLayout(t,e,n)}install(...t){let e=t[0];typeof e=="string"&&(e={name:e,style:t[1],chars:t[2]?.chars,resolution:t[2]?.resolution,padding:t[2]?.padding,skipKerning:t[2]?.skipKerning},B(pt,"BitmapFontManager.install(name, style, options) is deprecated, use BitmapFontManager.install({name, style, ...options})"));const n=e?.name;if(!n)throw new Error("[BitmapFontManager] Property `name` is required.");e={...this.defaultOptions,...e};const r=e.style,s=r instanceof de?r:new de(r),o=s._fill.fill!==null&&s._fill.fill!==void 0,a=new mo({style:s,overrideFill:o,skipKerning:e.skipKerning,padding:e.padding,resolution:e.resolution,overrideSize:!1}),l=qa(e.chars);return a.ensureCharacters(l.join("")),gt.set(`${n}-bitmap`,a),a.once("destroy",()=>gt.remove(`${n}-bitmap`)),a}uninstall(t){const e=`${t}-bitmap`,n=gt.get(e);n&&n.destroy()}}const Tr=new Vf;class Qa extends Ma{constructor(t,e){super();const{textures:n,data:r}=t;Object.keys(r.pages).forEach(s=>{const o=r.pages[parseInt(s,10)],a=n[o.id];this.pages.push({texture:a})}),Object.keys(r.chars).forEach(s=>{const o=r.chars[s],{frame:a,source:l}=n[o.page],u=new _t(o.x+a.x,o.y+a.y,o.width,o.height),h=new k({source:l,frame:u});this.chars[s]={id:s.codePointAt(0),xOffset:o.xOffset,yOffset:o.yOffset,xAdvance:o.xAdvance,kerning:o.kerning??{},texture:h}}),this.baseRenderedFontSize=r.fontSize,this.baseMeasurementFontSize=r.fontSize,this.fontMetrics={ascent:0,descent:0,fontSize:r.fontSize},this.baseLineOffset=r.baseLineOffset,this.lineHeight=r.lineHeight,this.fontFamily=r.fontFamily,this.distanceField=r.distanceField??{type:"none",range:0},this.url=e}destroy(){super.destroy();for(let t=0;t<this.pages.length;t++){const{texture:e}=this.pages[t];e.destroy(!0)}this.pages=null}static install(t){Tr.install(t)}static uninstall(t){Tr.uninstall(t)}}const tr={test(i){return typeof i=="string"&&i.startsWith("info face=")},parse(i){const t=i.match(/^[a-z]+\s+.+$/gm),e={info:[],common:[],page:[],char:[],chars:[],kerning:[],kernings:[],distanceField:[]};for(const c in t){const d=t[c].match(/^[a-z]+/gm)[0],f=t[c].match(/[a-zA-Z]+=([^\s"']+|"([^"]*)")/gm),x={};for(const v in f){const g=f[v].split("="),y=g[0],S=g[1].replace(/"/gm,""),w=parseFloat(S),T=isNaN(w)?S:w;x[y]=T}e[d].push(x)}const n={chars:{},pages:[],lineHeight:0,fontSize:0,fontFamily:"",distanceField:null,baseLineOffset:0},[r]=e.info,[s]=e.common,[o]=e.distanceField;o&&(n.distanceField={range:parseInt(o.distanceRange,10),type:o.fieldType}),n.fontSize=parseInt(r.size,10),n.fontFamily=r.face,n.lineHeight=parseInt(s.lineHeight,10);const a=e.page;for(let c=0;c<a.length;c++)n.pages.push({id:parseInt(a[c].id,10)||0,file:a[c].file});const l={};n.baseLineOffset=n.lineHeight-parseInt(s.base,10);const u=e.char;for(let c=0;c<u.length;c++){const d=u[c],f=parseInt(d.id,10);let x=d.letter??d.char??String.fromCharCode(f);x==="space"&&(x=" "),l[f]=x,n.chars[x]={id:f,page:parseInt(d.page,10)||0,x:parseInt(d.x,10),y:parseInt(d.y,10),width:parseInt(d.width,10),height:parseInt(d.height,10),xOffset:parseInt(d.xoffset,10),yOffset:parseInt(d.yoffset,10),xAdvance:parseInt(d.xadvance,10),kerning:{}}}const h=e.kerning;for(let c=0;c<h.length;c++){const d=parseInt(h[c].first,10),f=parseInt(h[c].second,10),x=parseInt(h[c].amount,10);n.chars[l[f]].kerning[l[d]]=x}return n}},go={test(i){const t=i;return typeof t!="string"&&"getElementsByTagName"in t&&t.getElementsByTagName("page").length&&t.getElementsByTagName("info")[0].getAttribute("face")!==null},parse(i){const t={chars:{},pages:[],lineHeight:0,fontSize:0,fontFamily:"",distanceField:null,baseLineOffset:0},e=i.getElementsByTagName("info")[0],n=i.getElementsByTagName("common")[0],r=i.getElementsByTagName("distanceField")[0];r&&(t.distanceField={type:r.getAttribute("fieldType"),range:parseInt(r.getAttribute("distanceRange"),10)});const s=i.getElementsByTagName("page"),o=i.getElementsByTagName("char"),a=i.getElementsByTagName("kerning");t.fontSize=parseInt(e.getAttribute("size"),10),t.fontFamily=e.getAttribute("face"),t.lineHeight=parseInt(n.getAttribute("lineHeight"),10);for(let u=0;u<s.length;u++)t.pages.push({id:parseInt(s[u].getAttribute("id"),10)||0,file:s[u].getAttribute("file")});const l={};t.baseLineOffset=t.lineHeight-parseInt(n.getAttribute("base"),10);for(let u=0;u<o.length;u++){const h=o[u],c=parseInt(h.getAttribute("id"),10);let d=h.getAttribute("letter")??h.getAttribute("char")??String.fromCharCode(c);d==="space"&&(d=" "),l[c]=d,t.chars[d]={id:c,page:parseInt(h.getAttribute("page"),10)||0,x:parseInt(h.getAttribute("x"),10),y:parseInt(h.getAttribute("y"),10),width:parseInt(h.getAttribute("width"),10),height:parseInt(h.getAttribute("height"),10),xOffset:parseInt(h.getAttribute("xoffset"),10),yOffset:parseInt(h.getAttribute("yoffset"),10),xAdvance:parseInt(h.getAttribute("xadvance"),10),kerning:{}}}for(let u=0;u<a.length;u++){const h=parseInt(a[u].getAttribute("first"),10),c=parseInt(a[u].getAttribute("second"),10),d=parseInt(a[u].getAttribute("amount"),10);t.chars[l[c]].kerning[l[h]]=d}return t}},xo={test(i){return typeof i=="string"&&i.includes("<font>")?go.test(ft.get().parseXML(i)):!1},parse(i){return go.parse(ft.get().parseXML(i))}},Wf=[".xml",".fnt"],$f={extension:{type:U.CacheParser,name:"cacheBitmapFont"},test:i=>i instanceof Qa,getCacheableAssets(i,t){const e={};return i.forEach(n=>{e[n]=t,e[`${n}-bitmap`]=t}),e[`${t.fontFamily}-bitmap`]=t,e}},Hf={extension:{type:U.LoadParser,priority:ae.Normal},name:"loadBitmapFont",test(i){return Wf.includes(At.extname(i).toLowerCase())},async testParse(i){return tr.test(i)||xo.test(i)},async parse(i,t,e){const n=tr.test(i)?tr.parse(i):xo.parse(i),{src:r}=t,{pages:s}=n,o=[],a=n.distanceField?{scaleMode:"linear",alphaMode:"premultiply-alpha-on-upload",autoGenerateMipmaps:!1,resolution:1}:{};for(let c=0;c<s.length;++c){const d=s[c].file;let f=At.join(At.dirname(r),d);f=fr(f,r),o.push({src:f,data:a})}const l=await e.load(o),u=o.map(c=>l[c.src]);return new Qa({data:n,textures:u},r)},async load(i,t){return await(await ft.get().fetch(i)).text()},async unload(i,t,e){await Promise.all(i.pages.map(n=>e.unload(n.texture.source._sourceOrigin))),i.destroy()}};class Xf{constructor(t,e=!1){this._loader=t,this._assetList=[],this._isLoading=!1,this._maxConcurrent=1,this.verbose=e}add(t){t.forEach(e=>{this._assetList.push(e)}),this.verbose&&console.log("[BackgroundLoader] assets: ",this._assetList),this._isActive&&!this._isLoading&&this._next()}async _next(){if(this._assetList.length&&this._isActive){this._isLoading=!0;const t=[],e=Math.min(this._assetList.length,this._maxConcurrent);for(let n=0;n<e;n++)t.push(this._assetList.pop());await this._loader.load(t),this._isLoading=!1,this._next()}}get active(){return this._isActive}set active(t){this._isActive!==t&&(this._isActive=t,t&&!this._isLoading&&this._next())}}const Yf={extension:{type:U.CacheParser,name:"cacheTextureArray"},test:i=>Array.isArray(i)&&i.every(t=>t instanceof k),getCacheableAssets:(i,t)=>{const e={};return i.forEach(n=>{t.forEach((r,s)=>{e[n+(s===0?"":s+1)]=r})}),e}};async function Ja(i){if("Image"in globalThis)return new Promise(t=>{const e=new Image;e.onload=()=>{t(!0)},e.onerror=()=>{t(!1)},e.src=i});if("createImageBitmap"in globalThis&&"fetch"in globalThis){try{const t=await(await fetch(i)).blob();await createImageBitmap(t)}catch{return!1}return!0}return!1}const jf={extension:{type:U.DetectionParser,priority:1},test:async()=>Ja("data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A="),add:async i=>[...i,"avif"],remove:async i=>i.filter(t=>t!=="avif")},_o=["png","jpg","jpeg"],qf={extension:{type:U.DetectionParser,priority:-1},test:()=>Promise.resolve(!0),add:async i=>[...i,..._o],remove:async i=>i.filter(t=>!_o.includes(t))},Kf="WorkerGlobalScope"in globalThis&&globalThis instanceof globalThis.WorkerGlobalScope;function Qr(i){return Kf?!1:document.createElement("video").canPlayType(i)!==""}const Zf={extension:{type:U.DetectionParser,priority:0},test:async()=>Qr("video/mp4"),add:async i=>[...i,"mp4","m4v"],remove:async i=>i.filter(t=>t!=="mp4"&&t!=="m4v")},Qf={extension:{type:U.DetectionParser,priority:0},test:async()=>Qr("video/ogg"),add:async i=>[...i,"ogv"],remove:async i=>i.filter(t=>t!=="ogv")},Jf={extension:{type:U.DetectionParser,priority:0},test:async()=>Qr("video/webm"),add:async i=>[...i,"webm"],remove:async i=>i.filter(t=>t!=="webm")},td={extension:{type:U.DetectionParser,priority:0},test:async()=>Ja("data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA="),add:async i=>[...i,"webp"],remove:async i=>i.filter(t=>t!=="webp")};class ed{constructor(){this._parsers=[],this._parsersValidated=!1,this.parsers=new Proxy(this._parsers,{set:(t,e,n)=>(this._parsersValidated=!1,t[e]=n,!0)}),this.promiseCache={}}reset(){this._parsersValidated=!1,this.promiseCache={}}_getLoadPromiseAndParser(t,e){const n={promise:null,parser:null};return n.promise=(async()=>{let r=null,s=null;if(e.loadParser&&(s=this._parserHash[e.loadParser],s||vt(`[Assets] specified load parser "${e.loadParser}" not found while loading ${t}`)),!s){for(let o=0;o<this.parsers.length;o++){const a=this.parsers[o];if(a.load&&a.test?.(t,e,this)){s=a;break}}if(!s)return vt(`[Assets] ${t} could not be loaded as we don't know how to parse it, ensure the correct parser has been added`),null}r=await s.load(t,e,this),n.parser=s;for(let o=0;o<this.parsers.length;o++){const a=this.parsers[o];a.parse&&a.parse&&await a.testParse?.(r,e,this)&&(r=await a.parse(r,e,this)||r,n.parser=a)}return r})(),n}async load(t,e){this._parsersValidated||this._validateParsers();let n=0;const r={},s=sn(t),o=Ht(t,u=>({alias:[u],src:u,data:{}})),a=o.length,l=o.map(async u=>{const h=At.toAbsolute(u.src);if(!r[u.src])try{this.promiseCache[h]||(this.promiseCache[h]=this._getLoadPromiseAndParser(h,u)),r[u.src]=await this.promiseCache[h].promise,e&&e(++n/a)}catch(c){throw delete this.promiseCache[h],delete r[u.src],new Error(`[Loader.load] Failed to load ${h}.
${c}`)}});return await Promise.all(l),s?r[o[0].src]:r}async unload(t){const n=Ht(t,r=>({alias:[r],src:r})).map(async r=>{const s=At.toAbsolute(r.src),o=this.promiseCache[s];if(o){const a=await o.promise;delete this.promiseCache[s],await o.parser?.unload?.(a,r,this)}});await Promise.all(n)}_validateParsers(){this._parsersValidated=!0,this._parserHash=this._parsers.filter(t=>t.name).reduce((t,e)=>(e.name?t[e.name]&&vt(`[Assets] loadParser name conflict "${e.name}"`):vt("[Assets] loadParser should have a name"),{...t,[e.name]:e}),{})}}function Ye(i,t){if(Array.isArray(t)){for(const e of t)if(i.startsWith(`data:${e}`))return!0;return!1}return i.startsWith(`data:${t}`)}function je(i,t){const e=i.split("?")[0],n=At.extname(e).toLowerCase();return Array.isArray(t)?t.includes(n):n===t}const id=".json",nd="application/json",rd={extension:{type:U.LoadParser,priority:ae.Low},name:"loadJson",test(i){return Ye(i,nd)||je(i,id)},async load(i){return await(await ft.get().fetch(i)).json()}},sd=".txt",od="text/plain",ad={name:"loadTxt",extension:{type:U.LoadParser,priority:ae.Low,name:"loadTxt"},test(i){return Ye(i,od)||je(i,sd)},async load(i){return await(await ft.get().fetch(i)).text()}},ld=["normal","bold","100","200","300","400","500","600","700","800","900"],ud=[".ttf",".otf",".woff",".woff2"],hd=["font/ttf","font/otf","font/woff","font/woff2"],cd=/^(--|-?[A-Z_])[0-9A-Z_-]*$/i;function fd(i){const t=At.extname(i),r=At.basename(i,t).replace(/(-|_)/g," ").toLowerCase().split(" ").map(a=>a.charAt(0).toUpperCase()+a.slice(1));let s=r.length>0;for(const a of r)if(!a.match(cd)){s=!1;break}let o=r.join(" ");return s||(o=`"${o.replace(/[\\"]/g,"\\$&")}"`),o}const dd=/^[0-9A-Za-z%:/?#\[\]@!\$&'()\*\+,;=\-._~]*$/;function pd(i){return dd.test(i)?i:encodeURI(i)}const md={extension:{type:U.LoadParser,priority:ae.Low},name:"loadWebFont",test(i){return Ye(i,hd)||je(i,ud)},async load(i,t){const e=ft.get().getFontFaceSet();if(e){const n=[],r=t.data?.family??fd(i),s=t.data?.weights?.filter(a=>ld.includes(a))??["normal"],o=t.data??{};for(let a=0;a<s.length;a++){const l=s[a],u=new FontFace(r,`url(${pd(i)})`,{...o,weight:l});await u.load(),e.add(u),n.push(u)}return gt.set(`${r}-and-url`,{url:i,fontFaces:n}),n.length===1?n[0]:n}return vt("[loadWebFont] FontFace API is not supported. Skipping loading font"),null},unload(i){(Array.isArray(i)?i:[i]).forEach(t=>{gt.remove(`${t.family}-and-url`),ft.get().getFontFaceSet().delete(t)})}};function Jr(i,t=1){const e=Xe.RETINA_PREFIX?.exec(i);return e?parseFloat(e[1]):t}function ts(i,t,e){i.label=e,i._sourceOrigin=e;const n=new k({source:i,label:e}),r=()=>{delete t.promiseCache[e],gt.has(e)&&gt.remove(e)};return n.source.once("destroy",()=>{t.promiseCache[e]&&(vt("[Assets] A TextureSource managed by Assets was destroyed instead of unloaded! Use Assets.unload() instead of destroying the TextureSource."),r())}),n.once("destroy",()=>{i.destroyed||(vt("[Assets] A Texture managed by Assets was destroyed instead of unloaded! Use Assets.unload() instead of destroying the Texture."),r())}),n}const gd=".svg",xd="image/svg+xml",_d={extension:{type:U.LoadParser,priority:ae.Low,name:"loadSVG"},name:"loadSVG",config:{crossOrigin:"anonymous",parseAsGraphicsContext:!1},test(i){return Ye(i,xd)||je(i,gd)},async load(i,t,e){return t.data.parseAsGraphicsContext??this.config.parseAsGraphicsContext?yd(i):vd(i,t,e,this.config.crossOrigin)},unload(i){i.destroy(!0)}};async function vd(i,t,e,n){const s=await(await ft.get().fetch(i)).blob(),o=URL.createObjectURL(s),a=new Image;a.src=o,a.crossOrigin=n,await a.decode(),URL.revokeObjectURL(o);const l=document.createElement("canvas"),u=l.getContext("2d"),h=t.data?.resolution||Jr(i),c=t.data?.width??a.width,d=t.data?.height??a.height;l.width=c*h,l.height=d*h,u.drawImage(a,0,0,c*h,d*h);const{parseAsGraphicsContext:f,...x}=t.data,v=new Ae({resource:l,alphaMode:"premultiply-alpha-on-upload",resolution:h,...x});return ts(v,e,i)}async function yd(i){const e=await(await ft.get().fetch(i)).text(),n=new ve;return n.svg(e),n}const bd=`(function () {
    'use strict';

    const WHITE_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=";
    async function checkImageBitmap() {
      try {
        if (typeof createImageBitmap !== "function")
          return false;
        const response = await fetch(WHITE_PNG);
        const imageBlob = await response.blob();
        const imageBitmap = await createImageBitmap(imageBlob);
        return imageBitmap.width === 1 && imageBitmap.height === 1;
      } catch (_e) {
        return false;
      }
    }
    void checkImageBitmap().then((result) => {
      self.postMessage(result);
    });

})();
`;let Ne=null,Ar=class{constructor(){Ne||(Ne=URL.createObjectURL(new Blob([bd],{type:"application/javascript"}))),this.worker=new Worker(Ne)}};Ar.revokeObjectURL=function(){Ne&&(URL.revokeObjectURL(Ne),Ne=null)};const Sd=`(function () {
    'use strict';

    async function loadImageBitmap(url, alphaMode) {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(\`[WorkerManager.loadImageBitmap] Failed to fetch \${url}: \${response.status} \${response.statusText}\`);
      }
      const imageBlob = await response.blob();
      return alphaMode === "premultiplied-alpha" ? createImageBitmap(imageBlob, { premultiplyAlpha: "none" }) : createImageBitmap(imageBlob);
    }
    self.onmessage = async (event) => {
      try {
        const imageBitmap = await loadImageBitmap(event.data.data[0], event.data.data[1]);
        self.postMessage({
          data: imageBitmap,
          uuid: event.data.uuid,
          id: event.data.id
        }, [imageBitmap]);
      } catch (e) {
        self.postMessage({
          error: e,
          uuid: event.data.uuid,
          id: event.data.id
        });
      }
    };

})();
`;let Ge=null;class tl{constructor(){Ge||(Ge=URL.createObjectURL(new Blob([Sd],{type:"application/javascript"}))),this.worker=new Worker(Ge)}}tl.revokeObjectURL=function(){Ge&&(URL.revokeObjectURL(Ge),Ge=null)};let vo=0,er;class wd{constructor(){this._initialized=!1,this._createdWorkers=0,this._workerPool=[],this._queue=[],this._resolveHash={}}isImageBitmapSupported(){return this._isImageBitmapSupported!==void 0?this._isImageBitmapSupported:(this._isImageBitmapSupported=new Promise(t=>{const{worker:e}=new Ar;e.addEventListener("message",n=>{e.terminate(),Ar.revokeObjectURL(),t(n.data)})}),this._isImageBitmapSupported)}loadImageBitmap(t,e){return this._run("loadImageBitmap",[t,e?.data?.alphaMode])}async _initWorkers(){this._initialized||(this._initialized=!0)}_getWorker(){er===void 0&&(er=navigator.hardwareConcurrency||4);let t=this._workerPool.pop();return!t&&this._createdWorkers<er&&(this._createdWorkers++,t=new tl().worker,t.addEventListener("message",e=>{this._complete(e.data),this._returnWorker(e.target),this._next()})),t}_returnWorker(t){this._workerPool.push(t)}_complete(t){t.error!==void 0?this._resolveHash[t.uuid].reject(t.error):this._resolveHash[t.uuid].resolve(t.data),this._resolveHash[t.uuid]=null}async _run(t,e){await this._initWorkers();const n=new Promise((r,s)=>{this._queue.push({id:t,arguments:e,resolve:r,reject:s})});return this._next(),n}_next(){if(!this._queue.length)return;const t=this._getWorker();if(!t)return;const e=this._queue.pop(),n=e.id;this._resolveHash[vo]={resolve:e.resolve,reject:e.reject},t.postMessage({data:e.arguments,uuid:vo++,id:n})}}const yo=new wd,Cd=[".jpeg",".jpg",".png",".webp",".avif"],Td=["image/jpeg","image/png","image/webp","image/avif"];async function Ad(i,t){const e=await ft.get().fetch(i);if(!e.ok)throw new Error(`[loadImageBitmap] Failed to fetch ${i}: ${e.status} ${e.statusText}`);const n=await e.blob();return t?.data?.alphaMode==="premultiplied-alpha"?createImageBitmap(n,{premultiplyAlpha:"none"}):createImageBitmap(n)}const el={name:"loadTextures",extension:{type:U.LoadParser,priority:ae.High,name:"loadTextures"},config:{preferWorkers:!0,preferCreateImageBitmap:!0,crossOrigin:"anonymous"},test(i){return Ye(i,Td)||je(i,Cd)},async load(i,t,e){let n=null;globalThis.createImageBitmap&&this.config.preferCreateImageBitmap?this.config.preferWorkers&&await yo.isImageBitmapSupported()?n=await yo.loadImageBitmap(i,t):n=await Ad(i,t):n=await new Promise(s=>{n=new Image,n.crossOrigin=this.config.crossOrigin,n.src=i,n.complete?s(n):n.onload=()=>{s(n)}});const r=new Ae({resource:n,alphaMode:"premultiply-alpha-on-upload",resolution:t.data?.resolution||Jr(i),...t.data});return ts(r,e,i)},unload(i){i.destroy(!0)}},il=[".mp4",".m4v",".webm",".ogg",".ogv",".h264",".avi",".mov"],Pd=il.map(i=>`video/${i.substring(1)}`);function Md(i,t,e){e===void 0&&!t.startsWith("data:")?i.crossOrigin=Id(t):e!==!1&&(i.crossOrigin=typeof e=="string"?e:"anonymous")}function Fd(i){return new Promise((t,e)=>{i.addEventListener("canplaythrough",n),i.addEventListener("error",r),i.load();function n(){s(),t()}function r(o){s(),e(o)}function s(){i.removeEventListener("canplaythrough",n),i.removeEventListener("error",r)}})}function Id(i,t=globalThis.location){if(i.startsWith("data:"))return"";t||(t=globalThis.location);const e=new URL(i,document.baseURI);return e.hostname!==t.hostname||e.port!==t.port||e.protocol!==t.protocol?"anonymous":""}const Od={name:"loadVideo",extension:{type:U.LoadParser,name:"loadVideo"},test(i){const t=Ye(i,Pd),e=je(i,il);return t||e},async load(i,t,e){const n={...Gi.defaultOptions,resolution:t.data?.resolution||Jr(i),alphaMode:t.data?.alphaMode||await aa(),...t.data},r=document.createElement("video"),s={preload:n.autoLoad!==!1?"auto":void 0,"webkit-playsinline":n.playsinline!==!1?"":void 0,playsinline:n.playsinline!==!1?"":void 0,muted:n.muted===!0?"":void 0,loop:n.loop===!0?"":void 0,autoplay:n.autoPlay!==!1?"":void 0};Object.keys(s).forEach(l=>{const u=s[l];u!==void 0&&r.setAttribute(l,u)}),n.muted===!0&&(r.muted=!0),Md(r,i,n.crossorigin);const o=document.createElement("source");let a;if(i.startsWith("data:"))a=i.slice(5,i.indexOf(";"));else if(!i.startsWith("blob:")){const l=i.split("?")[0].slice(i.lastIndexOf(".")+1).toLowerCase();a=Gi.MIME_TYPES[l]||`video/${l}`}return o.src=i,a&&(o.type=a),new Promise(l=>{const u=async()=>{const h=new Gi({...n,resource:r});r.removeEventListener("canplay",u),t.data.preload&&await Fd(r),l(ts(h,e,i))};r.addEventListener("canplay",u),r.appendChild(o)})},unload(i){i.destroy(!0)}},nl={extension:{type:U.ResolveParser,name:"resolveTexture"},test:el.test,parse:i=>({resolution:parseFloat(Xe.RETINA_PREFIX.exec(i)?.[1]??"1"),format:i.split(".").pop(),src:i})},Rd={extension:{type:U.ResolveParser,priority:-2,name:"resolveJson"},test:i=>Xe.RETINA_PREFIX.test(i)&&i.endsWith(".json"),parse:nl.parse};class Ed{constructor(){this._detections=[],this._initialized=!1,this.resolver=new Xe,this.loader=new ed,this.cache=gt,this._backgroundLoader=new Xf(this.loader),this._backgroundLoader.active=!0,this.reset()}async init(t={}){if(this._initialized){vt("[Assets]AssetManager already initialized, did you load before calling this Assets.init()?");return}if(this._initialized=!0,t.defaultSearchParams&&this.resolver.setDefaultSearchParams(t.defaultSearchParams),t.basePath&&(this.resolver.basePath=t.basePath),t.bundleIdentifier&&this.resolver.setBundleIdentifier(t.bundleIdentifier),t.manifest){let s=t.manifest;typeof s=="string"&&(s=await this.load(s)),this.resolver.addManifest(s)}const e=t.texturePreference?.resolution??1,n=typeof e=="number"?[e]:e,r=await this._detectFormats({preferredFormats:t.texturePreference?.format,skipDetections:t.skipDetections,detections:this._detections});this.resolver.prefer({params:{format:r,resolution:n}}),t.preferences&&this.setPreferences(t.preferences)}add(t){this.resolver.add(t)}async load(t,e){this._initialized||await this.init();const n=sn(t),r=Ht(t).map(a=>{if(typeof a!="string"){const l=this.resolver.getAlias(a);return l.some(u=>!this.resolver.hasKey(u))&&this.add(a),Array.isArray(l)?l[0]:l}return this.resolver.hasKey(a)||this.add({alias:a,src:a}),a}),s=this.resolver.resolve(r),o=await this._mapLoadToResolve(s,e);return n?o[r[0]]:o}addBundle(t,e){this.resolver.addBundle(t,e)}async loadBundle(t,e){this._initialized||await this.init();let n=!1;typeof t=="string"&&(n=!0,t=[t]);const r=this.resolver.resolveBundle(t),s={},o=Object.keys(r);let a=0,l=0;const u=()=>{e?.(++a/l)},h=o.map(c=>{const d=r[c];return l+=Object.keys(d).length,this._mapLoadToResolve(d,u).then(f=>{s[c]=f})});return await Promise.all(h),n?s[t[0]]:s}async backgroundLoad(t){this._initialized||await this.init(),typeof t=="string"&&(t=[t]);const e=this.resolver.resolve(t);this._backgroundLoader.add(Object.values(e))}async backgroundLoadBundle(t){this._initialized||await this.init(),typeof t=="string"&&(t=[t]);const e=this.resolver.resolveBundle(t);Object.values(e).forEach(n=>{this._backgroundLoader.add(Object.values(n))})}reset(){this.resolver.reset(),this.loader.reset(),this.cache.reset(),this._initialized=!1}get(t){if(typeof t=="string")return gt.get(t);const e={};for(let n=0;n<t.length;n++)e[n]=gt.get(t[n]);return e}async _mapLoadToResolve(t,e){const n=[...new Set(Object.values(t))];this._backgroundLoader.active=!1;const r=await this.loader.load(n,e);this._backgroundLoader.active=!0;const s={};return n.forEach(o=>{const a=r[o.src],l=[o.src];o.alias&&l.push(...o.alias),l.forEach(u=>{s[u]=a}),gt.set(l,a)}),s}async unload(t){this._initialized||await this.init();const e=Ht(t).map(r=>typeof r!="string"?r.src:r),n=this.resolver.resolve(e);await this._unloadFromResolved(n)}async unloadBundle(t){this._initialized||await this.init(),t=Ht(t);const e=this.resolver.resolveBundle(t),n=Object.keys(e).map(r=>this._unloadFromResolved(e[r]));await Promise.all(n)}async _unloadFromResolved(t){const e=Object.values(t);e.forEach(n=>{gt.remove(n.src)}),await this.loader.unload(e)}async _detectFormats(t){let e=[];t.preferredFormats&&(e=Array.isArray(t.preferredFormats)?t.preferredFormats:[t.preferredFormats]);for(const n of t.detections)t.skipDetections||await n.test()?e=await n.add(e):t.skipDetections||(e=await n.remove(e));return e=e.filter((n,r)=>e.indexOf(n)===r),e}get detections(){return this._detections}setPreferences(t){this.loader.parsers.forEach(e=>{e.config&&Object.keys(e.config).filter(n=>n in t).forEach(n=>{e.config[n]=t[n]})})}}const $t=new Ed;It.handleByList(U.LoadParser,$t.loader.parsers).handleByList(U.ResolveParser,$t.resolver.parsers).handleByList(U.CacheParser,$t.cache.parsers).handleByList(U.DetectionParser,$t.detections);It.add(Yf,qf,jf,td,Zf,Qf,Jf,rd,ad,md,_d,el,Od,Hf,$f,nl,Rd);const bo={loader:U.LoadParser,resolver:U.ResolveParser,cache:U.CacheParser,detection:U.DetectionParser};It.handle(U.Asset,i=>{const t=i.ref;Object.entries(bo).filter(([e])=>!!t[e]).forEach(([e,n])=>It.add(Object.assign(t[e],{extension:t[e].extension??n})))},i=>{const t=i.ref;Object.keys(bo).filter(e=>!!t[e]).forEach(e=>It.remove(t[e]))});var Ud=`in vec2 aPosition;
out vec2 vTextureCoord;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition( void )
{
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
    
    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0*uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;

    return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord( void )
{
    return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main(void)
{
    gl_Position = filterVertexPosition();
    vTextureCoord = filterTextureCoord();
}
`,zd=`
in vec2 vTextureCoord;

out vec4 finalColor;

uniform float uAlpha;
uniform sampler2D uTexture;

void main()
{
    finalColor =  texture(uTexture, vTextureCoord) * uAlpha;
}
`,So=`struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

struct AlphaUniforms {
  uAlpha:f32,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;
@group(0) @binding(1) var uTexture: texture_2d<f32>;
@group(0) @binding(2) var uSampler : sampler;

@group(1) @binding(0) var<uniform> alphaUniforms : AlphaUniforms;

struct VSOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv : vec2<f32>
  };

fn filterVertexPosition(aPosition:vec2<f32>) -> vec4<f32>
{
    var position = aPosition * gfu.uOutputFrame.zw + gfu.uOutputFrame.xy;

    position.x = position.x * (2.0 / gfu.uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0*gfu.uOutputTexture.z / gfu.uOutputTexture.y) - gfu.uOutputTexture.z;

    return vec4(position, 0.0, 1.0);
}

fn filterTextureCoord( aPosition:vec2<f32> ) -> vec2<f32>
{
    return aPosition * (gfu.uOutputFrame.zw * gfu.uInputSize.zw);
}

fn globalTextureCoord( aPosition:vec2<f32> ) -> vec2<f32>
{
  return  (aPosition.xy / gfu.uGlobalFrame.zw) + (gfu.uGlobalFrame.xy / gfu.uGlobalFrame.zw);  
}

fn getSize() -> vec2<f32>
{
  return gfu.uGlobalFrame.zw;
}
  
@vertex
fn mainVertex(
  @location(0) aPosition : vec2<f32>, 
) -> VSOutput {
  return VSOutput(
   filterVertexPosition(aPosition),
   filterTextureCoord(aPosition)
  );
}

@fragment
fn mainFragment(
  @location(0) uv: vec2<f32>,
  @builtin(position) position: vec4<f32>
) -> @location(0) vec4<f32> {
 
    var sample = textureSample(uTexture, uSampler, uv);
    
    return sample * alphaUniforms.uAlpha;
}`;const rl=class sl extends Y{constructor(t){t={...sl.defaultOptions,...t};const e=W.from({vertex:{source:So,entryPoint:"mainVertex"},fragment:{source:So,entryPoint:"mainFragment"}}),n=H.from({vertex:Ud,fragment:zd,name:"alpha-filter"}),{alpha:r,...s}=t,o=new Hr({uAlpha:{value:r,type:"f32"}});super({...s,gpuProgram:e,glProgram:n,resources:{alphaUniforms:o}})}get alpha(){return this.resources.alphaUniforms.uniforms.uAlpha}set alpha(t){this.resources.alphaUniforms.uniforms.uAlpha=t}};rl.defaultOptions={alpha:1};let kd=rl;const ol={5:[.153388,.221461,.250301],7:[.071303,.131514,.189879,.214607],9:[.028532,.067234,.124009,.179044,.20236],11:[.0093,.028002,.065984,.121703,.175713,.198596],13:[.002406,.009255,.027867,.065666,.121117,.174868,.197641],15:[489e-6,.002403,.009246,.02784,.065602,.120999,.174697,.197448]},Ld=["in vec2 vBlurTexCoords[%size%];","uniform sampler2D uTexture;","out vec4 finalColor;","void main(void)","{","    finalColor = vec4(0.0);","    %blur%","}"].join(`
`);function Bd(i){const t=ol[i],e=t.length;let n=Ld,r="";const s="finalColor += texture(uTexture, vBlurTexCoords[%index%]) * %value%;";let o;for(let a=0;a<i;a++){let l=s.replace("%index%",a.toString());o=a,a>=e&&(o=i-a-1),l=l.replace("%value%",t[o].toString()),r+=l,r+=`
`}return n=n.replace("%blur%",r),n=n.replace("%size%",i.toString()),n}const Dd=`
    in vec2 aPosition;

    uniform float uStrength;

    out vec2 vBlurTexCoords[%size%];

    uniform vec4 uInputSize;
    uniform vec4 uOutputFrame;
    uniform vec4 uOutputTexture;

    vec4 filterVertexPosition( void )
{
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
    
    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0*uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;

    return vec4(position, 0.0, 1.0);
}

    vec2 filterTextureCoord( void )
    {
        return aPosition * (uOutputFrame.zw * uInputSize.zw);
    }

    void main(void)
    {
        gl_Position = filterVertexPosition();

        float pixelStrength = uInputSize.%dimension% * uStrength;

        vec2 textureCoord = filterTextureCoord();
        %blur%
    }`;function Nd(i,t){const e=Math.ceil(i/2);let n=Dd,r="",s;t?s="vBlurTexCoords[%index%] =  textureCoord + vec2(%sampleIndex% * pixelStrength, 0.0);":s="vBlurTexCoords[%index%] =  textureCoord + vec2(0.0, %sampleIndex% * pixelStrength);";for(let o=0;o<i;o++){let a=s.replace("%index%",o.toString());a=a.replace("%sampleIndex%",`${o-(e-1)}.0`),r+=a,r+=`
`}return n=n.replace("%blur%",r),n=n.replace("%size%",i.toString()),n=n.replace("%dimension%",t?"z":"w"),n}function Gd(i,t){const e=Nd(t,i),n=Bd(t);return H.from({vertex:e,fragment:n,name:`blur-${i?"horizontal":"vertical"}-pass-filter`})}var Vd=`

struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

struct BlurUniforms {
  uStrength:f32,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;
@group(0) @binding(1) var uTexture: texture_2d<f32>;
@group(0) @binding(2) var uSampler : sampler;

@group(1) @binding(0) var<uniform> blurUniforms : BlurUniforms;


struct VSOutput {
    @builtin(position) position: vec4<f32>,
    %blur-struct%
  };

fn filterVertexPosition(aPosition:vec2<f32>) -> vec4<f32>
{
    var position = aPosition * gfu.uOutputFrame.zw + gfu.uOutputFrame.xy;

    position.x = position.x * (2.0 / gfu.uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0*gfu.uOutputTexture.z / gfu.uOutputTexture.y) - gfu.uOutputTexture.z;

    return vec4(position, 0.0, 1.0);
}

fn filterTextureCoord( aPosition:vec2<f32> ) -> vec2<f32>
{
    return aPosition * (gfu.uOutputFrame.zw * gfu.uInputSize.zw);
}

fn globalTextureCoord( aPosition:vec2<f32> ) -> vec2<f32>
{
  return  (aPosition.xy / gfu.uGlobalFrame.zw) + (gfu.uGlobalFrame.xy / gfu.uGlobalFrame.zw);  
}

fn getSize() -> vec2<f32>
{
  return gfu.uGlobalFrame.zw;
}


@vertex
fn mainVertex(
  @location(0) aPosition : vec2<f32>, 
) -> VSOutput {

  let filteredCord = filterTextureCoord(aPosition);

  let pixelStrength = gfu.uInputSize.%dimension% * blurUniforms.uStrength;

  return VSOutput(
   filterVertexPosition(aPosition),
    %blur-vertex-out%
  );
}

@fragment
fn mainFragment(
  @builtin(position) position: vec4<f32>,
  %blur-fragment-in%
) -> @location(0) vec4<f32> {

    var   finalColor = vec4(0.0);

    %blur-sampling%

    return finalColor;
}`;function Wd(i,t){const e=ol[t],n=e.length,r=[],s=[],o=[];for(let c=0;c<t;c++){r[c]=`@location(${c}) offset${c}: vec2<f32>,`,i?s[c]=`filteredCord + vec2(${c-n+1} * pixelStrength, 0.0),`:s[c]=`filteredCord + vec2(0.0, ${c-n+1} * pixelStrength),`;const d=c<n?c:t-c-1,f=e[d].toString();o[c]=`finalColor += textureSample(uTexture, uSampler, offset${c}) * ${f};`}const a=r.join(`
`),l=s.join(`
`),u=o.join(`
`),h=Vd.replace("%blur-struct%",a).replace("%blur-vertex-out%",l).replace("%blur-fragment-in%",a).replace("%blur-sampling%",u).replace("%dimension%",i?"z":"w");return W.from({vertex:{source:h,entryPoint:"mainVertex"},fragment:{source:h,entryPoint:"mainFragment"}})}const al=class ll extends Y{constructor(t){t={...ll.defaultOptions,...t};const e=Gd(t.horizontal,t.kernelSize),n=Wd(t.horizontal,t.kernelSize);super({glProgram:e,gpuProgram:n,resources:{blurUniforms:{uStrength:{value:0,type:"f32"}}},...t}),this.horizontal=t.horizontal,this._quality=0,this.quality=t.quality,this.blur=t.strength,this._uniforms=this.resources.blurUniforms.uniforms}apply(t,e,n,r){if(this._uniforms.uStrength=this.strength/this.passes,this.passes===1)t.applyFilter(this,e,n,r);else{const s=Dt.getSameSizeTexture(e);let o=e,a=s;this._state.blend=!1;const l=t.renderer.type===on.WEBGPU;for(let u=0;u<this.passes-1;u++){t.applyFilter(this,o,a,u===0?!0:l);const h=a;a=o,o=h}this._state.blend=!0,t.applyFilter(this,o,n,r),Dt.returnTexture(s)}}get blur(){return this.strength}set blur(t){this.padding=1+Math.abs(t)*2,this.strength=t}get quality(){return this._quality}set quality(t){this._quality=t,this.passes=t}};al.defaultOptions={strength:8,quality:4,kernelSize:5};let wo=al;const ul=class hl extends za{constructor(...t){let e=t[0]??{};e instanceof Float32Array&&(B(pt,"use new MeshGeometry({ positions, uvs, indices }) instead"),e={positions:e,uvs:t[1],indices:t[2]}),e={...hl.defaultOptions,...e};const n=e.positions||new Float32Array([0,0,1,0,1,1,0,1]),r=e.uvs||new Float32Array([0,0,1,0,1,1,0,1]),s=e.indices||new Uint32Array([0,1,2,0,2,3]),o=e.shrinkBuffersToFit,a=new fe({data:n,label:"attribute-mesh-positions",shrinkToFit:o,usage:bt.VERTEX|bt.COPY_DST}),l=new fe({data:r,label:"attribute-mesh-uvs",shrinkToFit:o,usage:bt.VERTEX|bt.COPY_DST}),u=new fe({data:s,label:"index-mesh-buffer",shrinkToFit:o,usage:bt.INDEX|bt.COPY_DST});super({attributes:{aPosition:{buffer:a,format:"float32x2",stride:2*4,offset:0},aUV:{buffer:l,format:"float32x2",stride:2*4,offset:0}},indexBuffer:u,topology:e.topology}),this.batchMode="auto"}get positions(){return this.attributes.aPosition.buffer.data}set positions(t){this.attributes.aPosition.buffer.data=t}get uvs(){return this.attributes.aUV.buffer.data}set uvs(t){this.attributes.aUV.buffer.data=t}get indices(){return this.indexBuffer.data}set indices(t){this.indexBuffer.data=t}};ul.defaultOptions={topology:"triangle-list",shrinkBuffersToFit:!1};let $d=ul;class ln extends it{constructor(...t){let e=t[0];Array.isArray(t[0])&&(e={textures:t[0],autoUpdate:t[1]});const{textures:n,autoUpdate:r,...s}=e,[o]=n;super({...s,texture:o instanceof k?o:o.texture}),this._textures=null,this._durations=null,this._autoUpdate=r??!0,this._isConnectedToTicker=!1,this.animationSpeed=1,this.loop=!0,this.updateAnchor=!1,this.onComplete=null,this.onFrameChange=null,this.onLoop=null,this._currentTime=0,this._playing=!1,this._previousFrame=null,this.textures=n}stop(){this._playing&&(this._playing=!1,this._autoUpdate&&this._isConnectedToTicker&&(Ut.shared.remove(this.update,this),this._isConnectedToTicker=!1))}play(){this._playing||(this._playing=!0,this._autoUpdate&&!this._isConnectedToTicker&&(Ut.shared.add(this.update,this,rn.HIGH),this._isConnectedToTicker=!0))}gotoAndStop(t){this.stop(),this.currentFrame=t}gotoAndPlay(t){this.currentFrame=t,this.play()}update(t){if(!this._playing)return;const e=t.deltaTime,n=this.animationSpeed*e,r=this.currentFrame;if(this._durations!==null){let s=this._currentTime%1*this._durations[this.currentFrame];for(s+=n/60*1e3;s<0;)this._currentTime--,s+=this._durations[this.currentFrame];const o=Math.sign(this.animationSpeed*e);for(this._currentTime=Math.floor(this._currentTime);s>=this._durations[this.currentFrame];)s-=this._durations[this.currentFrame]*o,this._currentTime+=o;this._currentTime+=s/this._durations[this.currentFrame]}else this._currentTime+=n;this._currentTime<0&&!this.loop?(this.gotoAndStop(0),this.onComplete&&this.onComplete()):this._currentTime>=this._textures.length&&!this.loop?(this.gotoAndStop(this._textures.length-1),this.onComplete&&this.onComplete()):r!==this.currentFrame&&(this.loop&&this.onLoop&&(this.animationSpeed>0&&this.currentFrame<r||this.animationSpeed<0&&this.currentFrame>r)&&this.onLoop(),this._updateTexture())}_updateTexture(){const t=this.currentFrame;this._previousFrame!==t&&(this._previousFrame=t,this.texture=this._textures[t],this.updateAnchor&&this.anchor.copyFrom(this.texture.defaultAnchor),this.onFrameChange&&this.onFrameChange(this.currentFrame))}destroy(){this.stop(),super.destroy(),this.onComplete=null,this.onFrameChange=null,this.onLoop=null}static fromFrames(t){const e=[];for(let n=0;n<t.length;++n)e.push(k.from(t[n]));return new ln(e)}static fromImages(t){const e=[];for(let n=0;n<t.length;++n)e.push(k.from(t[n]));return new ln(e)}get totalFrames(){return this._textures.length}get textures(){return this._textures}set textures(t){if(t[0]instanceof k)this._textures=t,this._durations=null;else{this._textures=[],this._durations=[];for(let e=0;e<t.length;e++)this._textures.push(t[e].texture),this._durations.push(t[e].time)}this._previousFrame=null,this.gotoAndStop(0),this._updateTexture()}get currentFrame(){let t=Math.floor(this._currentTime)%this._textures.length;return t<0&&(t+=this._textures.length),t}set currentFrame(t){if(t<0||t>this.totalFrames-1)throw new Error(`[AnimatedSprite]: Invalid frame index value ${t}, expected to be between 0 and totalFrames ${this.totalFrames}.`);const e=this.currentFrame;this._currentTime=t,e!==this.currentFrame&&this._updateTexture()}get playing(){return this._playing}get autoUpdate(){return this._autoUpdate}set autoUpdate(t){t!==this._autoUpdate&&(this._autoUpdate=t,!this._autoUpdate&&this._isConnectedToTicker?(Ut.shared.remove(this.update,this),this._isConnectedToTicker=!1):this._autoUpdate&&!this._isConnectedToTicker&&this._playing&&(Ut.shared.add(this.update,this),this._isConnectedToTicker=!0))}}class cl extends Vr{constructor(t,e){const{text:n,resolution:r,style:s,anchor:o,width:a,height:l,roundPixels:u,...h}=t;super({...h}),this.batched=!0,this._resolution=null,this._autoResolution=!0,this._didTextUpdate=!0,this._styleClass=e,this.text=n??"",this.style=s,this.resolution=r??null,this.allowChildren=!1,this._anchor=new Mt({_onUpdate:()=>{this.onViewUpdate()}}),o&&(this.anchor=o),this.roundPixels=u??!1,a!==void 0&&(this.width=a),l!==void 0&&(this.height=l)}get anchor(){return this._anchor}set anchor(t){typeof t=="number"?this._anchor.set(t):this._anchor.copyFrom(t)}set text(t){t=t.toString(),this._text!==t&&(this._text=t,this.onViewUpdate())}get text(){return this._text}set resolution(t){this._autoResolution=t===null,this._resolution=t,this.onViewUpdate()}get resolution(){return this._resolution}get style(){return this._style}set style(t){t||(t={}),this._style?.off("update",this.onViewUpdate,this),t instanceof this._styleClass?this._style=t:this._style=new this._styleClass(t),this._style.on("update",this.onViewUpdate,this),this.onViewUpdate()}get width(){return Math.abs(this.scale.x)*this.bounds.width}set width(t){this._setWidth(t,this.bounds.width)}get height(){return Math.abs(this.scale.y)*this.bounds.height}set height(t){this._setHeight(t,this.bounds.height)}getSize(t){return t||(t={}),t.width=Math.abs(this.scale.x)*this.bounds.width,t.height=Math.abs(this.scale.y)*this.bounds.height,t}setSize(t,e){typeof t=="object"?(e=t.height??t.width,t=t.width):e??(e=t),t!==void 0&&this._setWidth(t,this.bounds.width),e!==void 0&&this._setHeight(e,this.bounds.height)}containsPoint(t){const e=this.bounds.width,n=this.bounds.height,r=-e*this.anchor.x;let s=0;return t.x>=r&&t.x<=r+e&&(s=-n*this.anchor.y,t.y>=s&&t.y<=s+n)}onViewUpdate(){this.didViewUpdate||(this._didTextUpdate=!0),super.onViewUpdate()}_getKey(){return`${this.text}:${this._style.styleKey}:${this._resolution}`}destroy(t=!1){super.destroy(t),this.owner=null,this._bounds=null,this._anchor=null,(typeof t=="boolean"?t:t?.style)&&this._style.destroy(t),this._style=null,this._text=null}}function fl(i,t){let e=i[0]??{};return(typeof e=="string"||i[1])&&(B(pt,`use new ${t}({ text: "hi!", style }) instead`),e={text:e,style:i[1]}),e}class mt extends cl{constructor(...t){const e=fl(t,"Text");super(e,de),this.renderPipeId="text"}updateBounds(){const t=this._bounds,e=this._anchor,n=Cr.measureText(this._text,this._style),{width:r,height:s}=n;t.minX=-e._x*r,t.maxX=t.minX+r,t.minY=-e._y*s,t.maxY=t.minY+s}}class Co extends cl{constructor(...t){var e;const n=fl(t,"BitmapText");n.style??(n.style=n.style||{}),(e=n.style).fill??(e.fill=16777215),super(n,de),this.renderPipeId="bitmapText"}updateBounds(){const t=this._bounds,e=this._anchor,n=Tr.measureText(this.text,this._style),r=n.scale,s=n.offsetY*r;let o=n.width*r,a=n.height*r;const l=this._style._stroke;l&&(o+=l.width,a+=l.width),t.minX=-e._x*o,t.maxX=t.minX+o,t.minY=-e._y*(a+s),t.maxY=t.minY+a}set resolution(t){t!==null&&vt("[BitmapText] dynamically updating the resolution is not supported. Resolution should be managed by the BitmapFont.")}get resolution(){return this._resolution}}const Je=new Map;function Hd(i,t){if(!Je.has(i)){const e=new k({source:new Wr({resource:i,...t})}),n=()=>{Je.get(i)===e&&Je.delete(i)};e.once("destroy",n),e.source.once("destroy",n),Je.set(i,e)}return Je.get(i)}const dl=class pl{constructor(t={}){if(this.uid=St("renderTarget"),this.colorTextures=[],this.dirtyId=0,this.isRoot=!1,this._size=new Float32Array(2),this._managedColorTextures=!1,t={...pl.defaultOptions,...t},this.stencil=t.stencil,this.depth=t.depth,this.isRoot=t.isRoot,typeof t.colorTextures=="number"){this._managedColorTextures=!0;for(let e=0;e<t.colorTextures;e++)this.colorTextures.push(new zt({width:t.width,height:t.height,resolution:t.resolution,antialias:t.antialias}))}else{this.colorTextures=[...t.colorTextures.map(n=>n.source)];const e=this.colorTexture.source;this.resize(e.width,e.height,e._resolution)}this.colorTexture.source.on("resize",this.onSourceResize,this),(t.depthStencilTexture||this.stencil)&&(t.depthStencilTexture instanceof k||t.depthStencilTexture instanceof zt?this.depthStencilTexture=t.depthStencilTexture.source:this.ensureDepthStencilTexture())}get size(){const t=this._size;return t[0]=this.pixelWidth,t[1]=this.pixelHeight,t}get width(){return this.colorTexture.source.width}get height(){return this.colorTexture.source.height}get pixelWidth(){return this.colorTexture.source.pixelWidth}get pixelHeight(){return this.colorTexture.source.pixelHeight}get resolution(){return this.colorTexture.source._resolution}get colorTexture(){return this.colorTextures[0]}onSourceResize(t){this.resize(t.width,t.height,t._resolution,!0)}ensureDepthStencilTexture(){this.depthStencilTexture||(this.depthStencilTexture=new zt({width:this.width,height:this.height,resolution:this.resolution,format:"depth24plus-stencil8",autoGenerateMipmaps:!1,antialias:!1,mipLevelCount:1}))}resize(t,e,n=this.resolution,r=!1){this.dirtyId++,this.colorTextures.forEach((s,o)=>{r&&o===0||s.source.resize(t,e,n)}),this.depthStencilTexture&&this.depthStencilTexture.source.resize(t,e,n)}destroy(){this.colorTexture.source.off("resize",this.onSourceResize,this),this._managedColorTextures&&this.colorTextures.forEach(t=>{t.destroy()}),this.depthStencilTexture&&(this.depthStencilTexture.destroy(),delete this.depthStencilTexture)}};dl.defaultOptions={width:0,height:0,resolution:1,colorTextures:1,stencil:!1,depth:!1,antialias:!1,isRoot:!1};let Xd=dl;const es=class ml{get autoDensity(){return this.texture.source.autoDensity}set autoDensity(t){this.texture.source.autoDensity=t}get resolution(){return this.texture.source._resolution}set resolution(t){this.texture.source.resize(this.texture.source.width,this.texture.source.height,t)}init(t){t={...ml.defaultOptions,...t},t.view&&(B(pt,"ViewSystem.view has been renamed to ViewSystem.canvas"),t.canvas=t.view),this.screen=new _t(0,0,t.width,t.height),this.canvas=t.canvas||ft.get().createCanvas(),this.antialias=!!t.antialias,this.texture=Hd(this.canvas,t),this.renderTarget=new Xd({colorTextures:[this.texture],depth:!!t.depth,isRoot:!0}),this.texture.source.transparent=t.backgroundAlpha<1,this.resolution=t.resolution}resize(t,e,n){this.texture.source.resize(t,e,n),this.screen.width=this.texture.frame.width,this.screen.height=this.texture.frame.height}destroy(t=!1){(typeof t=="boolean"?t:!!t?.removeView)&&this.canvas.parentNode&&this.canvas.parentNode.removeChild(this.canvas)}};es.extension={type:[U.WebGLSystem,U.WebGPUSystem,U.CanvasSystem],name:"view",priority:0};es.defaultOptions={width:800,height:600,autoDensity:!1,antialias:!1};let Yd=es;const gl=class xl extends $d{constructor(...t){super({});let e=t[0]??{};typeof e=="number"&&(B(pt,"PlaneGeometry constructor changed please use { width, height, verticesX, verticesY } instead"),e={width:e,height:t[1],verticesX:t[2],verticesY:t[3]}),this.build(e)}build(t){t={...xl.defaultOptions,...t},this.verticesX=this.verticesX??t.verticesX,this.verticesY=this.verticesY??t.verticesY,this.width=this.width??t.width,this.height=this.height??t.height;const e=this.verticesX*this.verticesY,n=[],r=[],s=[],o=this.verticesX-1,a=this.verticesY-1,l=this.width/o,u=this.height/a;for(let c=0;c<e;c++){const d=c%this.verticesX,f=c/this.verticesX|0;n.push(d*l,f*u),r.push(d/o,f/a)}const h=o*a;for(let c=0;c<h;c++){const d=c%o,f=c/o|0,x=f*this.verticesX+d,v=f*this.verticesX+d+1,g=(f+1)*this.verticesX+d,y=(f+1)*this.verticesX+d+1;s.push(x,v,g,v,y,g)}this.buffers[0].data=new Float32Array(n),this.buffers[1].data=new Float32Array(r),this.indexBuffer.data=new Uint32Array(s),this.buffers[0].update(),this.buffers[1].update(),this.indexBuffer.update()}};gl.defaultOptions={width:100,height:100,verticesX:10,verticesY:10};let jd=gl;const _l=class vl extends jd{constructor(t={}){t={...vl.defaultOptions,...t},super({width:t.width,height:t.height,verticesX:4,verticesY:4}),this.update(t)}update(t){this.width=t.width??this.width,this.height=t.height??this.height,this._originalWidth=t.originalWidth??this._originalWidth,this._originalHeight=t.originalHeight??this._originalHeight,this._leftWidth=t.leftWidth??this._leftWidth,this._rightWidth=t.rightWidth??this._rightWidth,this._topHeight=t.topHeight??this._topHeight,this._bottomHeight=t.bottomHeight??this._bottomHeight,this.updateUvs(),this.updatePositions()}updatePositions(){const t=this.positions,e=this._leftWidth+this._rightWidth,n=this.width>e?1:this.width/e,r=this._topHeight+this._bottomHeight,s=this.height>r?1:this.height/r,o=Math.min(n,s);t[9]=t[11]=t[13]=t[15]=this._topHeight*o,t[17]=t[19]=t[21]=t[23]=this.height-this._bottomHeight*o,t[25]=t[27]=t[29]=t[31]=this.height,t[2]=t[10]=t[18]=t[26]=this._leftWidth*o,t[4]=t[12]=t[20]=t[28]=this.width-this._rightWidth*o,t[6]=t[14]=t[22]=t[30]=this.width,this.getBuffer("aPosition").update()}updateUvs(){const t=this.uvs;t[0]=t[8]=t[16]=t[24]=0,t[1]=t[3]=t[5]=t[7]=0,t[6]=t[14]=t[22]=t[30]=1,t[25]=t[27]=t[29]=t[31]=1;const e=1/this._originalWidth,n=1/this._originalHeight;t[2]=t[10]=t[18]=t[26]=e*this._leftWidth,t[9]=t[11]=t[13]=t[15]=n*this._topHeight,t[4]=t[12]=t[20]=t[28]=1-e*this._rightWidth,t[17]=t[19]=t[21]=t[23]=1-n*this._bottomHeight,this.getBuffer("aUV").update()}};_l.defaultOptions={width:100,height:100,leftWidth:10,topHeight:10,rightWidth:10,bottomHeight:10,originalWidth:100,originalHeight:100};let Ie=_l;const yl=class bl extends Vr{constructor(t){t instanceof k&&(t={texture:t});const{width:e,height:n,leftWidth:r,rightWidth:s,topHeight:o,bottomHeight:a,texture:l,roundPixels:u,...h}=t;super({label:"NineSliceSprite",...h}),this.renderPipeId="nineSliceSprite",this.batched=!0,this._leftWidth=r??l?.defaultBorders?.left??Ie.defaultOptions.leftWidth,this._topHeight=o??l?.defaultBorders?.top??Ie.defaultOptions.topHeight,this._rightWidth=s??l?.defaultBorders?.right??Ie.defaultOptions.rightWidth,this._bottomHeight=a??l?.defaultBorders?.bottom??Ie.defaultOptions.bottomHeight,this.bounds.maxX=this._width=e??l.width??Ie.defaultOptions.width,this.bounds.maxY=this._height=n??l.height??Ie.defaultOptions.height,this.allowChildren=!1,this.texture=l??bl.defaultOptions.texture,this.roundPixels=u??!1}updateBounds(){}get width(){return this._width}set width(t){this.bounds.maxX=this._width=t,this.onViewUpdate()}get height(){return this._height}set height(t){this.bounds.maxY=this._height=t,this.onViewUpdate()}setSize(t,e){typeof t=="object"&&(e=t.height??t.width,t=t.width),this.bounds.maxX=this._width=t,this.bounds.maxY=this._height=e??t,this.onViewUpdate()}getSize(t){return t||(t={}),t.width=this._width,t.height=this._height,t}get leftWidth(){return this._leftWidth}set leftWidth(t){this._leftWidth=t,this.onViewUpdate()}get topHeight(){return this._topHeight}set topHeight(t){this._topHeight=t,this.onViewUpdate()}get rightWidth(){return this._rightWidth}set rightWidth(t){this._rightWidth=t,this.onViewUpdate()}get bottomHeight(){return this._bottomHeight}set bottomHeight(t){this._bottomHeight=t,this.onViewUpdate()}get texture(){return this._texture}set texture(t){t||(t=k.EMPTY);const e=this._texture;e!==t&&(e&&e.dynamic&&e.off("update",this.onViewUpdate,this),t.dynamic&&t.on("update",this.onViewUpdate,this),this._texture=t,this.onViewUpdate())}get originalWidth(){return this._texture.width}get originalHeight(){return this._texture.height}destroy(t){if(super.destroy(t),typeof t=="boolean"?t:t?.texture){const n=typeof t=="boolean"?t:t?.textureSource;this._texture.destroy(n)}this._texture=null}};yl.defaultOptions={texture:k.EMPTY};let Et=yl;It.add(_u,vu);const qd="hexes_of_battle",Kd="0.11.0",Zd="module",Qd={dev:"vite",build:"tsc && vite build",preview:"vite preview",deploy:"vite build && gh-pages -d dist"},Jd={"gh-pages":"^6.2.0",typescript:"~5.7.2",vite:"^6.0.2"},tp={"@pixi/sound":"^6.0.1","@pixi/tilemap":"^5.0.1","@pixi/ui":"^2.1.5","pixi-filters":"^6.0.5","pixi.js":"^8.5.2"},ep={name:qd,private:!0,version:Kd,type:Zd,scripts:Qd,devDependencies:Jd,dependencies:tp};var lt=(i=>(i[i.NONE=0]="NONE",i[i.EAST=1]="EAST",i[i.NORTHEAST=2]="NORTHEAST",i[i.NORTHWEST=3]="NORTHWEST",i[i.WEST=4]="WEST",i[i.SOUTHWEST=5]="SOUTHWEST",i[i.SOUTHEAST=6]="SOUTHEAST",i))(lt||{}),ht=(i=>(i[i.NONE=0]="NONE",i[i.EAST=1]="EAST",i[i.NORTHEAST=2]="NORTHEAST",i[i.NORTH_NORTHEAST=3]="NORTH_NORTHEAST",i[i.NORTH=4]="NORTH",i[i.NORTH_NORTHWEST=5]="NORTH_NORTHWEST",i[i.NORTHWEST=6]="NORTHWEST",i[i.WEST=7]="WEST",i[i.SOUTHWEST=8]="SOUTHWEST",i[i.SOUTH_SOUTHWEST=9]="SOUTH_SOUTHWEST",i[i.SOUTH=10]="SOUTH",i[i.SOUTH_SOUTHEAST=11]="SOUTH_SOUTHEAST",i[i.SOUTHEAST=12]="SOUTHEAST",i))(ht||{});function ir(i){switch(i){case 1:return 4;case 2:return 5;case 3:return 6;case 4:return 1;case 5:return 2;case 6:return 3}return 0}class yt{constructor(t,e,n={...yt.DEFAULT_HEX_MAP_CONFIG}){this.width=t,this.height=e,this.config=n}static DEFAULT_HEX_MAP_CONFIG={OFFSET_X:0,OFFSET_Y:0,CELL_WIDTH:80,CELL_HEIGHT:92};static INV_SQRT3=1/Math.sqrt(3);static SQRT3=Math.sqrt(3);tiles=[];offset(){return{x:this.config.OFFSET_X,y:this.config.OFFSET_Y}}setOffset(t,e){this.config.OFFSET_X=t,this.config.OFFSET_Y=e}cellSize(){return{x:this.config.CELL_WIDTH,y:this.config.CELL_HEIGHT}}setCellSize(t){this.config.CELL_WIDTH=t}initializeToSize(t,e){for(let n=0;n<t;n++){this.tiles[n]=[];for(let r=0;r<e;r++){let s=3;this.tiles[n][r]=s}}}getNeighbours(t){let e=[];for(let n=1;n<=6;n++){let r=this.getNeighbourInDirection(t,n);r!==null&&e.push(r)}return e}static getNeighboursInBounds(t,e,n){let r=[];for(let s=1;s<=6;s++){let o=yt.getNeighbourInDirectionInBounds(t,s,e,n);o!==null&&r.push(o)}return r}getNeighbourInDirection(t,e){return yt.getNeighbourInDirectionInBounds(t,e,this.width,this.height)}static getNeighbourInDirectionInBounds(t,e,n,r){let s=yt.getCoordsInDirectionInternal(t,e);return s===null||s.x<0||s.x>=n||s.y<0||s.y>=r?null:s}static getNeighbourInDirectionInDataMatrix(t,e,n,r,s){let o=yt.getCoordsInDirectionInternal(t,e);return o===null||o.x<0||o.x>=r||o.y<0||o.y>=s?null:{coord:o,value:n[o.x][o.y]}}static getSingleEdgeForDataCell(t,e,n,r,s){let o=[];for(let l=1;l<=6;l++){const u=yt.getNeighbourInDirectionInDataMatrix({x:r,y:s},l,t,e,n);o[l]=u}let a=4;return(!o[1]||o[1].value<1)&&(!o[2]||o[2].value<1)&&(!o[6]||o[6].value<1)?1:(!o[1]||o[1].value<1)&&(!o[2]||o[2].value<1)&&(!o[3]||o[3].value<1)?3:(!o[4]||o[4].value<1)&&(!o[2]||o[2].value<1)&&(!o[3]||o[3].value<1)?5:(!o[1]||o[1].value<1)&&(!o[6]||o[6].value<1)&&(!o[5]||o[5].value<1)?11:(!o[4]||o[4].value<1)&&(!o[6]||o[6].value<1)&&(!o[5]||o[5].value<1)?9:(!o[1]||o[1].value<1)&&(!o[2]||o[2].value<1)?2:(!o[1]||o[1].value<1)&&(!o[6]||o[6].value<1)?12:(!o[4]||o[4].value<1)&&(!o[3]||o[3].value<1)&&(!o[5]||o[5].value<1)?7:(!o[4]||o[4].value<1)&&(!o[3]||o[3].value<1)?6:(!o[4]||o[4].value<1)&&(!o[5]||o[5].value<1)?8:(!o[2]||o[2].value<1)&&(!o[3]||o[3].value<1)?4:(!o[6]||o[6].value<1)&&(!o[5]||o[5].value<1)?10:a}static getEdgesForDataMatrix(t,e,n){let r=[];for(let s=0;s<n;s++)for(let o=0;o<e;o++){if(t[o][s]!==1)continue;const a=yt.getSingleEdgeForDataCell(t,e,n,o,s);r.push({coord:{x:o,y:s},value:t[o][s],edge:a})}return r}static getCoordsInDirectionInternal(t,e){switch(e){case 1:return{x:t.x+1,y:t.y};case 2:return{x:t.x+t.y%2,y:t.y-1};case 3:return{x:t.x-(1-t.y%2),y:t.y-1};case 4:return{x:t.x-1,y:t.y};case 5:return{x:t.x-(1-t.y%2),y:t.y+1};case 6:return{x:t.x+t.y%2,y:t.y+1};default:return null}}hexToPixel(t,e){const n=this.config.CELL_WIDTH*yt.INV_SQRT3;let r=this.config.OFFSET_X+n*(yt.SQRT3*t+yt.SQRT3/2*e),s=this.config.OFFSET_Y+n*(3/2*e);return r-=Math.floor(e/2)*this.config.CELL_WIDTH,{x:r,y:s}}pixelToHex(t,e){return yt.pixelToHexInternal(t,e,this.config.OFFSET_X,this.config.OFFSET_Y,this.config.CELL_WIDTH)}static pixelToHexInternal(t,e,n,r,s){let o={x:t-n,y:e-r};const a=s*yt.INV_SQRT3;let l=(o.x*yt.SQRT3/3-o.y/3)/a,u=o.y*2/3/a,h=yt.axial_round(l,u);return h.x+=Math.floor(h.y/2),h}static axial_round=(t,e)=>{const n=Math.round(t),r=Math.round(e);t-=n,e-=r;const s=Math.round(t+.5*e)*(t*t>=e*e?1:0),o=Math.round(e+.5*t)*(t*t<e*e?1:0);return{x:n+s,y:r+o}};pixelToHexWithDirectionalDetail(t,e){let n=this.pixelToHex(t,e),r=this.hexToPixel(n.x,n.y);const s=t-r.x>0?1:0,o=e-r.y>(t-r.x)*yt.INV_SQRT3?2:0,a=e-r.y>-1*(t-r.x)*yt.INV_SQRT3?4:0;switch(s+o+a){case 0:return{cell:n,direction:3};case 1:return{cell:n,direction:2};case 2:return{cell:n,direction:4};case 5:return{cell:n,direction:1};case 6:return{cell:n,direction:5};case 7:return{cell:n,direction:6};default:return{cell:n,direction:0}}}getDirectionForNeighbour(t,e){for(let n=1;n<=6;n++){const r=this.getNeighbourInDirection(t,n);if(r!==null&&r.x==e.x&&r.y==e.y)return n}return 0}getGeneralDirectionForTarget(t,e){const n=this.getDirectionForNeighbour(t,e);if(n!==0)return n;let r=e.x-t.x,s=e.y-t.y;return s===0||Math.abs(r)/Math.abs(s)>.5?r>0?1:4:s>0?r>0?6:5:r>0?2:3}}var nr={},ti={},To;function Ti(){if(To)return ti;To=1,Object.defineProperty(ti,"__esModule",{value:!0}),ti.Collector=void 0;let i=class{constructor(e){this.emit=(...n)=>{e.emitCollecting(this,n)}}};return ti.Collector=i,ti}var ei={},Ao;function ip(){if(Ao)return ei;Ao=1,Object.defineProperty(ei,"__esModule",{value:!0}),ei.CollectorArray=void 0;const i=Ti();let t=class extends i.Collector{constructor(){super(...arguments),this.result=[]}handleResult(n){return this.result.push(n),!0}getResult(){return this.result}reset(){this.result.length=0}};return ei.CollectorArray=t,ei}var ii={},Po;function np(){if(Po)return ii;Po=1,Object.defineProperty(ii,"__esModule",{value:!0}),ii.CollectorLast=void 0;const i=Ti();let t=class extends i.Collector{handleResult(n){return this.result=n,!0}getResult(){return this.result}reset(){delete this.result}};return ii.CollectorLast=t,ii}var ni={},Mo;function rp(){if(Mo)return ni;Mo=1,Object.defineProperty(ni,"__esModule",{value:!0}),ni.CollectorUntil0=void 0;const i=Ti();let t=class extends i.Collector{constructor(){super(...arguments),this.result=!1}handleResult(n){return this.result=n,this.result}getResult(){return this.result}reset(){this.result=!1}};return ni.CollectorUntil0=t,ni}var ri={},Fo;function sp(){if(Fo)return ri;Fo=1,Object.defineProperty(ri,"__esModule",{value:!0}),ri.CollectorWhile0=void 0;const i=Ti();let t=class extends i.Collector{constructor(){super(...arguments),this.result=!1}handleResult(n){return this.result=n,!this.result}getResult(){return this.result}reset(){this.result=!1}};return ri.CollectorWhile0=t,ri}var si={},oi={},Io;function op(){if(Io)return oi;Io=1,Object.defineProperty(oi,"__esModule",{value:!0}),oi.SignalConnectionImpl=void 0;class i{constructor(e,n){this.link=e,this.parentCleanup=n}disconnect(){return this.link!==null?(this.link.unlink(),this.link=null,this.parentCleanup(),this.parentCleanup=null,!0):!1}set enabled(e){this.link&&this.link.setEnabled(e)}get enabled(){return this.link!==null&&this.link.isEnabled()}}return oi.SignalConnectionImpl=i,oi}var ai={},Oo;function ap(){if(Oo)return ai;Oo=1,Object.defineProperty(ai,"__esModule",{value:!0}),ai.SignalLink=void 0;let i=class Sl{constructor(e=null,n=null,r=0){this.enabled=!0,this.newLink=!1,this.callback=null,this.prev=e??this,this.next=n??this,this.order=r}isEnabled(){return this.enabled&&!this.newLink}setEnabled(e){this.enabled=e}unlink(){this.callback=null,this.next.prev=this.prev,this.prev.next=this.next}insert(e,n){let r=this.prev;for(;r!==this&&!(r.order<=n);)r=r.prev;const s=new Sl(r,r.next,n);return s.callback=e,r.next=s,s.next.prev=s,s}};return ai.SignalLink=i,ai}var Ro;function lp(){if(Ro)return si;Ro=1,Object.defineProperty(si,"__esModule",{value:!0}),si.Signal=void 0;const i=op(),t=ap();let e=class{constructor(){this.head=new t.SignalLink,this.hasNewLinks=!1,this.emitDepth=0,this.connectionsCount=0}getConnectionsCount(){return this.connectionsCount}hasConnections(){return this.connectionsCount>0}connect(r,s=0){this.connectionsCount++;const o=this.head.insert(r,s);return this.emitDepth>0&&(this.hasNewLinks=!0,o.newLink=!0),new i.SignalConnectionImpl(o,()=>this.decrementConnectionCount())}decrementConnectionCount(){this.connectionsCount--}disconnect(r){for(let s=this.head.next;s!==this.head;s=s.next)if(s.callback===r)return this.decrementConnectionCount(),s.unlink(),!0;return!1}disconnectAll(){for(;this.head.next!==this.head;)this.head.next.unlink();this.connectionsCount=0}emit(...r){this.emitDepth++;for(let s=this.head.next;s!==this.head;s=s.next)s.isEnabled()&&s.callback&&s.callback.apply(null,r);this.emitDepth--,this.unsetNewLink()}emitCollecting(r,s){this.emitDepth++;for(let o=this.head.next;o!==this.head;o=o.next)if(o.isEnabled()&&o.callback){const a=o.callback.apply(null,s);if(!r.handleResult(a))break}this.emitDepth--,this.unsetNewLink()}unsetNewLink(){if(this.hasNewLinks&&this.emitDepth===0){for(let r=this.head.next;r!==this.head;r=r.next)r.newLink=!1;this.hasNewLinks=!1}}};return si.Signal=e,si}var li={},Eo;function up(){if(Eo)return li;Eo=1,Object.defineProperty(li,"__esModule",{value:!0}),li.SignalConnections=void 0;let i=class{constructor(){this.list=[]}add(e){this.list.push(e)}disconnectAll(){for(const e of this.list)e.disconnect();this.list=[]}getCount(){return this.list.length}isEmpty(){return this.list.length===0}};return li.SignalConnections=i,li}var Uo;function hp(){return Uo||(Uo=1,function(i){Object.defineProperty(i,"__esModule",{value:!0}),i.SignalConnections=i.Signal=i.CollectorWhile0=i.CollectorUntil0=i.CollectorLast=i.CollectorArray=i.Collector=void 0;var t=Ti();Object.defineProperty(i,"Collector",{enumerable:!0,get:function(){return t.Collector}});var e=ip();Object.defineProperty(i,"CollectorArray",{enumerable:!0,get:function(){return e.CollectorArray}});var n=np();Object.defineProperty(i,"CollectorLast",{enumerable:!0,get:function(){return n.CollectorLast}});var r=rp();Object.defineProperty(i,"CollectorUntil0",{enumerable:!0,get:function(){return r.CollectorUntil0}});var s=sp();Object.defineProperty(i,"CollectorWhile0",{enumerable:!0,get:function(){return s.CollectorWhile0}});var o=lp();Object.defineProperty(i,"Signal",{enumerable:!0,get:function(){return o.Signal}});var a=up();Object.defineProperty(i,"SignalConnections",{enumerable:!0,get:function(){return a.SignalConnections}})}(nr)),nr}var Oe=hp(),cp=Object.defineProperty,fp=(i,t,e)=>t in i?cp(i,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):i[t]=e,le=(i,t,e)=>fp(i,typeof t!="symbol"?t+"":t,e);class dp{constructor(){le(this,"_isMouseIn"),le(this,"_isDown"),le(this,"onDown"),le(this,"onUp"),le(this,"onUpOut"),le(this,"onOut"),le(this,"onPress"),le(this,"onHover"),this.onPress=new Oe.Signal,this.onDown=new Oe.Signal,this.onUp=new Oe.Signal,this.onHover=new Oe.Signal,this.onOut=new Oe.Signal,this.onUpOut=new Oe.Signal}connectEvents(t){De.any?(t.on("pointerdown",this.processDown,this),t.on("pointerup",this.processUp,this),t.on("pointerupoutside",this.processUpOut,this),t.on("pointerout",this.processOut,this),t.on("pointertap",this.processPress,this),t.on("pointerover",this.processOver,this)):(t.on("mousedown",this.processDown,this),t.on("mouseup",this.processUp,this),t.on("mouseupoutside",this.processUpOut,this),t.on("mouseout",this.processOut,this),t.on("click",this.processPress,this),t.on("mouseover",this.processOver,this))}disconnectEvents(t){De.any?(t.off("pointerdown",this.processDown,this),t.off("pointerup",this.processUp,this),t.off("pointerupoutside",this.processUpOut,this),t.off("pointerout",this.processOut,this),t.off("pointertap",this.processPress,this),t.off("pointerover",this.processOver,this)):(t.off("mousedown",this.processDown,this),t.off("mouseup",this.processUp,this),t.off("mouseupoutside",this.processUpOut,this),t.off("mouseout",this.processOut,this),t.off("click",this.processPress,this),t.off("mouseover",this.processOver,this))}processDown(t){this._isDown=!0,this.onDown.emit(this,t),this.down(t)}processUp(t){this._isDown&&(this.onUp.emit(this,t),this.up(t)),this._isDown=!1}processUpOut(t){this._isDown&&(this.onUp.emit(this,t),this.onUpOut.emit(this,t),this.up(t),this.upOut(t)),this._isDown=!1}processOut(t){this._isMouseIn&&(this._isMouseIn=!1,this.onOut.emit(this,t),this.out(t))}processPress(t){this._isDown=!1,this.onPress.emit(this,t),this.press(t)}processOver(t){De.any||(this._isMouseIn=!0,this.onHover.emit(this,t),this.hover(t))}down(t){}up(t){}upOut(t){}out(t){}press(t){}hover(t){}get isDown(){return this._isDown}}var pp=Object.defineProperty,mp=(i,t,e)=>t in i?pp(i,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):i[t]=e,he=(i,t,e)=>mp(i,typeof t!="symbol"?t+"":t,e);class gp extends dp{constructor(t){super(),he(this,"_view"),t&&(this.view=t,this.enabled=!0)}set view(t){!!this._view&&this.disconnectEvents(this._view),this._view=t,this.connectEvents(this._view)}get view(){return this._view}set enabled(t){if(!this.view){console.error("Button view is not set. Please set it before enabling the button.");return}this.view.eventMode=t?"static":"auto",this.view.cursor=t?"pointer":"default",!t&&this.isDown&&this.processUp()}get enabled(){return this.view.eventMode==="static"}}class xp extends X{constructor(t){super(),he(this,"button"),he(this,"onDown"),he(this,"onUp"),he(this,"onUpOut"),he(this,"onOut"),he(this,"onPress"),he(this,"onHover"),this.button=new gp(this),this.button.enabled=!0,t&&this.addChild(t),this.onPress=this.button.onPress,this.onDown=this.button.onDown,this.onUp=this.button.onUp,this.onHover=this.button.onHover,this.onOut=this.button.onOut,this.onUpOut=this.button.onUpOut}set enabled(t){this.button.enabled=t}get enabled(){return this.button.enabled}}function gi(i){return typeof i=="string"?it.from(i):i instanceof k?new it(i):i}var _p=Object.defineProperty,vp=(i,t,e)=>t in i?_p(i,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):i[t]=e,ue=(i,t,e)=>vp(i,typeof t!="symbol"?t+"":t,e);class yp extends X{constructor(t){super(),ue(this,"bg"),ue(this,"fill"),ue(this,"fillMask"),ue(this,"progressStart",0),ue(this,"_progress",0),ue(this,"options"),ue(this,"innerView"),ue(this,"_view"),this.options=t,this.innerView=new X,this.addChild(this.innerView),t?.bg&&t?.fill&&this.init(t)}init({bg:t,fill:e,fillPaddings:n,progress:r}){this.setBackground(t),this.setFill(e,n),this.progress=r}setBackground(t){this.bg&&this.bg.destroy(),this.options?.nineSliceSprite&&(typeof t=="string"?this.bg=new Et({texture:k.from(t),leftWidth:this.options.nineSliceSprite.bg[0],topHeight:this.options.nineSliceSprite.bg[1],rightWidth:this.options.nineSliceSprite.bg[2],bottomHeight:this.options.nineSliceSprite.bg[3]}):t instanceof k?this.bg=new Et({texture:t,leftWidth:this.options.nineSliceSprite.bg[0],topHeight:this.options.nineSliceSprite.bg[1],rightWidth:this.options.nineSliceSprite.bg[2],bottomHeight:this.options.nineSliceSprite.bg[3]}):console.warn(`NineSliceSprite can not be used with views set as Container.
                    Pass the texture or texture name as instead of the Container extended instance.`)),this.bg||(this.bg=gi(t)),this.innerView.addChildAt(this.bg,0)}setFill(t,e){if(this.fill&&this.fill.destroy(),this.bg instanceof it&&t===this.bg){console.warn("Can not use same Sprite instance for bg and fill.");return}this.options?.nineSliceSprite?typeof t=="string"||t instanceof k?this.fill=new Et({texture:typeof t=="string"?k.from(t):t,leftWidth:this.options.nineSliceSprite.fill[0],topHeight:this.options.nineSliceSprite.fill[1],rightWidth:this.options.nineSliceSprite.fill[2],bottomHeight:this.options.nineSliceSprite.fill[3]}):(console.warn(`NineSliceSprite can not be used with views set as Container.
                    Pass the texture or texture name as instead of the Container extended instance.`),this.fill=gi(t)):this.fill=gi(t),this.innerView.addChildAt(this.fill,1);const n=e?.left??0,r=e?.top??0;this.fill.x=n,this.fill.y=r,this.fillMask&&(this.fill.mask=null,this.fillMask.destroy());const s=this.fill.width/2,o=this.fill.width/2,a=this.fill.height/2,l=this.fill.height/2;let u=k.WHITE;this.fill instanceof it&&this.fill.texture&&(u=this.fill.texture),this.fillMask=new Et({texture:u,leftWidth:s,topHeight:a,rightWidth:o,bottomHeight:l}),this.fillMask.position.copyFrom(this.fill),this.addChild(this.fillMask),this.fill.mask=this.fillMask}validate(t){return t=Math.round(t),t<0?0:t>100?100:t}set progress(t){this._progress=this.validate(t),this.fill&&this.fillMask&&(this.fill.mask=null,this.fillMask.width=this.fill.width/100*(this._progress-this.progressStart),this.fillMask.x=this.progressStart/100*this.fill.width+this.fill.x,this.fillMask.height=this.fill.height,this.fill.mask=this.fillMask)}get progress(){return this._progress}set width(t){if(this.options?.nineSliceSprite){if(this.bg&&(this.bg.width=t),this.fill){const e=this.options.fillPaddings?.left??0,n=this.options.fillPaddings?.right??0;this.fill.width=t-e-n,this.fillMask.width=t-e-n}this.progress=this._progress}else super.width=t}get width(){return super.width}set height(t){if(this.options?.nineSliceSprite){if(this.bg&&(this.bg.height=t),this.fill){const e=this.options.fillPaddings?.top??0,n=this.options.fillPaddings?.bottom??0;this.fill.height=t-e-n,this.fillMask.height=t-e-n}this.progress=this._progress}else super.height=t}get height(){return super.height}setSize(t,e){if(this.options?.nineSliceSprite){if(this.bg&&this.bg.setSize(t,e),this.fill){typeof t=="object"?(e=t.height??t.width,t=t.width):e=e??t;const n=this.options.fillPaddings?.top??0,r=this.options.fillPaddings?.bottom??0,s=this.options.fillPaddings?.left??0,o=this.options.fillPaddings?.right??0;this.fill.setSize(t-s-o,e-n-r),this.fillMask.setSize(t-s-o,e-n-r)}this.progress=this._progress}else super.setSize(t,e)}}/*!
 * tweedle.js - v2.1.0
 * Compiled Wed, 05 Apr 2023 15:21:25 UTC
 *
 * tweedle.js is licensed under the MIT License.
 * http://www.opensource.org/licenses/mit-license
 * 
 * Copyright 2019-2021, Milton Candelero <miltoncandelero@gmail.com>, All Rights Reserved
 */let fi;typeof self>"u"&&typeof process<"u"&&process.hrtime?fi=function(){const i=process.hrtime();return i[0]*1e3+i[1]/1e6}:typeof self<"u"&&self.performance!==void 0&&self.performance.now!==void 0?fi=self.performance.now.bind(self.performance):Date.now!==void 0?fi=Date.now:fi=function(){return new Date().getTime()};class Vt{constructor(){Vt.prototype.__init.call(this),Vt.prototype.__init2.call(this),Vt.prototype.__init3.call(this),Vt.prototype.__init4.call(this)}__init(){this._tweens={}}static get shared(){return Vt._shared||(Vt._shared=new Vt),Vt._shared}__init2(){this._paused=!1}isPaused(){return this._paused}pause(){this._paused=!0}resume(){this._paused=!1}__init3(){this._lastUpdateTime=void 0}__init4(){this.now=fi}getAll(){return Object.keys(this._tweens).map(t=>this._tweens[t])}removeAll(){this._tweens={}}add(t){this._tweens[t.getId()]=t}remove(t){delete this._tweens[t.getId()]}update(t,e=!1){if(t==null&&(this._lastUpdateTime==null?(this._lastUpdateTime=this.now(),t=0):t=this.now()-this._lastUpdateTime),this._lastUpdateTime=this.now(),this._paused)return!1;const n=Object.keys(this._tweens);if(n.length==0)return!1;for(let r=0;r<n.length;r++){const s=this._tweens[n[r]];s&&s.update(t,!0)==!1&&!e&&delete this._tweens[n[r]]}return!0}}const $i={Step:{None(i){return i<.5?0:1}},Linear:{None(i){return i}},Quadratic:{In(i){return i*i},Out(i){return i*(2-i)},InOut(i){return(i*=2)<1?.5*i*i:-.5*(--i*(i-2)-1)}},Cubic:{In(i){return i*i*i},Out(i){return--i*i*i+1},InOut(i){return(i*=2)<1?.5*i*i*i:.5*((i-=2)*i*i+2)}},Quartic:{In(i){return i*i*i*i},Out(i){return 1- --i*i*i*i},InOut(i){return(i*=2)<1?.5*i*i*i*i:-.5*((i-=2)*i*i*i-2)}},Quintic:{In(i){return i*i*i*i*i},Out(i){return--i*i*i*i*i+1},InOut(i){return(i*=2)<1?.5*i*i*i*i*i:.5*((i-=2)*i*i*i*i+2)}},Sinusoidal:{In(i){return 1-Math.cos(i*Math.PI/2)},Out(i){return Math.sin(i*Math.PI/2)},InOut(i){return .5*(1-Math.cos(Math.PI*i))}},Exponential:{In(i){return i==0?0:Math.pow(1024,i-1)},Out(i){return i==1?1:1-Math.pow(2,-10*i)},InOut(i){return i==0?0:i==1?1:(i*=2)<1?.5*Math.pow(1024,i-1):.5*(-Math.pow(2,-10*(i-1))+2)}},Circular:{In(i){return 1-Math.sqrt(1-i*i)},Out(i){return Math.sqrt(1- --i*i)},InOut(i){return(i*=2)<1?-.5*(Math.sqrt(1-i*i)-1):.5*(Math.sqrt(1-(i-=2)*i)+1)}},Elastic:{In(i){return i==0?0:i==1?1:-Math.pow(2,10*(i-1))*Math.sin((i-1.1)*5*Math.PI)},Out(i){return i==0?0:i==1?1:Math.pow(2,-10*i)*Math.sin((i-.1)*5*Math.PI)+1},InOut(i){return i==0?0:i==1?1:(i*=2,i<1?-.5*Math.pow(2,10*(i-1))*Math.sin((i-1.1)*5*Math.PI):.5*Math.pow(2,-10*(i-1))*Math.sin((i-1.1)*5*Math.PI)+1)}},Back:{In(i){return i*i*((1.70158+1)*i-1.70158)},Out(i){return--i*i*((1.70158+1)*i+1.70158)+1},InOut(i){const t=2.5949095;return(i*=2)<1?.5*(i*i*((t+1)*i-t)):.5*((i-=2)*i*((t+1)*i+t)+2)}},Bounce:{In(i){return 1-$i.Bounce.Out(1-i)},Out(i){return i<1/2.75?7.5625*i*i:i<2/2.75?7.5625*(i-=1.5/2.75)*i+.75:i<2.5/2.75?7.5625*(i-=2.25/2.75)*i+.9375:7.5625*(i-=2.625/2.75)*i+.984375},InOut(i){return i<.5?$i.Bounce.In(i*2)*.5:$i.Bounce.Out(i*2-1)*.5+.5}}},V={Geom:{Linear(i,t){const e=i.length-1,n=e*t,r=Math.floor(n),s=V.Utils.Linear;return t<0?s(i[0],i[1],n):t>1?s(i[e],i[e-1],e-n):s(i[r],i[r+1>e?e:r+1],n-r)},Bezier(i,t){let e=0;const n=i.length-1,r=Math.pow,s=V.Utils.Bernstein;for(let o=0;o<=n;o++)e+=s(n,o)*r(1-t,n-o)*r(t,o)*i[o];return e},QuadraticBezier(i,t){let e=0;const n=i.length-1;if(t==1)return i[n];const r=Math.pow,s=V.Utils.Bernstein,o=n*t,a=Math.floor(o),l=(o-a)*.5+.5*(a%2),u=a-a%2,h=u+1,c=u+2;return e+=s(2,0)*r(1-l,2)*r(l,0)*i[u],e+=s(2,1)*r(1-l,1)*r(l,1)*i[h],e+=s(2,2)*r(1-l,0)*r(l,2)*i[c],e},CubicBezier(i,t){let e=0;const n=i.length-1;if(t==1)return i[n];const r=Math.pow,s=V.Utils.Bernstein,o=n*t,a=Math.floor(o),l=(o-a)*(1/3)+1/3*(a%3),u=a-a%3,h=u+1,c=u+2,d=u+3;return e+=s(3,0)*r(1-l,3)*r(l,0)*i[u],e+=s(3,1)*r(1-l,2)*r(l,1)*i[h],e+=s(3,2)*r(1-l,1)*r(l,2)*i[c],e+=s(3,3)*r(1-l,0)*r(l,3)*i[d],e},CatmullRom(i,t){const e=i.length-1;let n=e*t,r=Math.floor(n);const s=V.Utils.CatmullRom;return i[0]==i[e]?(t<0&&(r=Math.floor(n=e*(1+t))),s(i[(r-1+e)%e],i[r],i[(r+1)%e],i[(r+2)%e],n-r)):t<0?i[0]-(s(i[0],i[0],i[1],i[1],-n)-i[0]):t>1?i[e]-(s(i[e],i[e],i[e-1],i[e-1],n-e)-i[e]):s(i[r?r-1:0],i[r],i[e<r+1?e:r+1],i[e<r+2?e:r+2],n-r)}},Angle:{Radians(i,t){const e=i.length-1,n=e*t,r=Math.floor(n),s=V.Utils.WrapLinear;return t<0?s(i[0],i[1],n,2*Math.PI):t>1?s(i[e],i[e-1],e-n,2*Math.PI):s(i[r],i[r+1>e?e:r+1],n-r,2*Math.PI)},Degrees(i,t){const e=i.length-1,n=e*t,r=Math.floor(n),s=V.Utils.WrapLinear;return t<0?s(i[0],i[1],n,360):t>1?s(i[e],i[e-1],e-n,360):s(i[r],i[r+1>e?e:r+1],n-r,360)}},Color:{RGB(i,t){const e=i.length-1,n=e*t,r=Math.floor(n),s=V.Utils.RGBLinear;return t<0?s(i[0],i[1],n):t>1?s(i[e],i[e-1],e-n):s(i[r],i[r+1>e?e:r+1],n-r)},HSV(i,t){const e=i.length-1,n=e*t,r=Math.floor(n),s=V.Utils.HSVLinear;return t<0?s(i[0],i[1],n):t>1?s(i[e],i[e-1],e-n):s(i[r],i[r+1>e?e:r+1],n-r)},HCL(i,t){const e=i.length-1,n=e*t,r=Math.floor(n),s=V.Utils.HCLLinear;return t<0?s(i[0],i[1],n):t>1?s(i[e],i[e-1],e-n):s(i[r],i[r+1>e?e:r+1],n-r)}},Utils:{RGBsplit(i){const t=i>>24&255,e=i>>16&255,n=i>>8&255,r=i&255;return{a:t,r:e,g:n,b:r}},HSVsplit(i){const t=V.Utils.RGBsplit(i);t.r/=255,t.g/=255,t.b/=255;const e=Math.max(t.r,t.g,t.b),n=Math.min(t.r,t.g,t.b);let r;const s=e,o=e-n,a=e==0?0:o/e;if(e==n)r=0;else{switch(e){case t.r:r=(t.g-t.b)/o+(t.g<t.b?6:0);break;case t.g:r=(t.b-t.r)/o+2;break;case t.b:r=(t.r-t.g)/o+4;break}r/=6}return{a:t.a,h:r,s:a,v:s}},HSVJoin(i){let t,e,n;const r=Math.floor(i.h*6),s=i.h*6-r,o=i.v*(1-i.s),a=i.v*(1-s*i.s),l=i.v*(1-(1-s)*i.s);switch(r%6){case 0:t=i.v,e=l,n=o;break;case 1:t=a,e=i.v,n=o;break;case 2:t=o,e=i.v,n=l;break;case 3:t=o,e=a,n=i.v;break;case 4:t=l,e=o,n=i.v;break;case 5:t=i.v,e=o,n=a;break}return i.a<<24|t<<16|e<<8|n},HCLSplit(i){const n=.530454533953517,r=V.Utils.RGBsplit(i),s={a:r.a,h:0,c:0,l:0};let o=0;const a=Math.min(r.r,Math.min(r.g,r.b)),l=Math.max(r.r,Math.max(r.g,r.b));let u=3/100;return s.c=l-a,s.c!=0&&(o=Math.atan2(r.g-r.b,r.r-r.g)/Math.PI,u*=a/l),u=Math.exp(u),s.h=(o/2-Math.min(o%1,-o%1)/6)%1,s.c*=u,s.l=V.Utils.Linear(-a,l,u)/(n*2),s},HCLJoin(i){const n=.530454533953517,r={a:i.a,r:0,g:0,b:0};if(i.l!=0){let s=i.h;const o=i.c,a=i.l*n,l=Math.exp((1-o/(2*a))*(3/100)),u=(2*a-o)/(2*l-1),h=o/l,c=(s+Math.min(2*s%1/4,-2*s%1/8))*Math.PI*2;let d;s*=6,s<=.999?(d=Math.tan(c),r.r=1,r.g=d/(1+d)):s<=1.001?(r.r=1,r.g=1):s<=2?(d=Math.tan(c),r.r=(1+d)/d,r.g=1):s<=3?(d=Math.tan(c),r.g=1,r.b=1+d):s<=3.999?(d=Math.tan(c),r.g=1/(1+d),r.b=1):s<=4.001?(r.g=0,r.b=1):s<=5?(d=Math.tan(c),r.r=-1/d,r.b=1):(d=Math.tan(c),r.r=1,r.b=-d),r.r=r.r*h+u,r.g=r.g*h+u,r.b=r.b*h+u}return r.a<<24|r.r<<16|r.g<<8|r.b},WrapLinear(i,t,e,n){let r;return i=(i+n*Math.trunc(Math.abs(i/n)))%n,t=(t+n*Math.trunc(Math.abs(t/n)))%n,Math.abs(i-t)<=.5*n?r=V.Utils.Linear(i,t,e):(i<t?r=V.Utils.Linear(i+n,t,e):r=V.Utils.Linear(i,t+n,e),r=r%n),r},RGBLinear(i,t,e){const n=V.Utils.RGBsplit(i),r=V.Utils.RGBsplit(t),s=V.Utils.Linear(n.a,r.a,e),o=V.Utils.Linear(n.r,r.r,e),a=V.Utils.Linear(n.g,r.g,e),l=V.Utils.Linear(n.b,r.b,e);return s<<24|o<<16|a<<8|l},HSVLinear(i,t,e){const n=V.Utils.HSVsplit(i),r=V.Utils.HSVsplit(t);let s;Math.abs(n.h-r.h)<=.5?s=V.Utils.Linear(n.h,r.h,e):(n.h<r.h?s=V.Utils.Linear(n.h+1,r.h,e):s=V.Utils.Linear(n.h,r.h+1,e),s=s%1);const o=V.Utils.Linear(n.s,r.s,e),a=V.Utils.Linear(n.v,r.v,e),l=V.Utils.Linear(n.a,r.a,e);return V.Utils.HSVJoin({a:l,h:s,s:o,v:a})},HCLLinear(i,t,e){const n=V.Utils.HCLSplit(i),r=V.Utils.HCLSplit(t);let s;Math.abs(n.h-r.h)<=.5?s=V.Utils.Linear(n.h,r.h,e):(n.h<r.h?s=V.Utils.Linear(n.h+1,r.h,e):s=V.Utils.Linear(n.h,r.h+1,e),s=s%1);const o=V.Utils.Linear(n.c,r.c,e),a=V.Utils.Linear(n.l,r.l,e),l=V.Utils.Linear(n.a,r.a,e);return V.Utils.HSVJoin({a:l,h:s,s:o,v:a})},Linear(i,t,e){return(t-i)*e+i},Bernstein(i,t){const e=V.Utils.Factorial;return e(i)/e(t)/e(i-t)},Factorial:function(){const i=[1];return function(t){let e=1;if(i[t])return i[t];for(let n=t;n>1;n--)e*=n;return i[t]=e,e}}(),CatmullRom(i,t,e,n,r){const s=(e-i)*.5,o=(n-t)*.5,a=r*r,l=r*a;return(2*t-2*e+s+o)*l+(-3*t+3*e-2*s-o)*a+s*r+t}}};class xn{static __initStatic(){this._nextId=0}static nextId(){return xn._nextId++}}xn.__initStatic();const Di={safetyCheckFunction:i=>!0,easingFunction:$i.Linear.None,yoyoEasingFunction:void 0,interpolationFunction:V.Geom.Linear};class ct{__init(){this._isPaused=!1}__init2(){this._valuesStart={}}__init3(){this._valuesEnd={}}__init4(){this._valuesStartRepeat={}}__init5(){this._duration=0}__init6(){this._repeatCount=0}__init7(){this._repeat=0}__init8(){this._yoyo=!1}__init9(){this._isPlaying=!1}get _reversed(){return this.yoyo&&this._repeatCount%2!==0}__init10(){this._delayTime=0}__init11(){this._startTime=0}__init12(){this._elapsedTime=0}__init13(){this._timescale=1}__init14(){this._safetyCheckFunction=Di.safetyCheckFunction}__init15(){this._easingFunction=Di.easingFunction}__init16(){this._yoyoEasingFunction=Di.yoyoEasingFunction}__init17(){this._interpolationFunction=Di.interpolationFunction}__init18(){this._chainedTweens=[]}__init19(){this._onStartCallbackFired=!1}__init20(){this._onAfterDelayCallbackFired=!1}__init21(){this._id=xn.nextId()}__init22(){this._isChainStopped=!1}get _group(){return this._groupRef?this._groupRef:Vt.shared}set _group(t){this._groupRef=t}constructor(t,e){ct.prototype.__init.call(this),ct.prototype.__init2.call(this),ct.prototype.__init3.call(this),ct.prototype.__init4.call(this),ct.prototype.__init5.call(this),ct.prototype.__init6.call(this),ct.prototype.__init7.call(this),ct.prototype.__init8.call(this),ct.prototype.__init9.call(this),ct.prototype.__init10.call(this),ct.prototype.__init11.call(this),ct.prototype.__init12.call(this),ct.prototype.__init13.call(this),ct.prototype.__init14.call(this),ct.prototype.__init15.call(this),ct.prototype.__init16.call(this),ct.prototype.__init17.call(this),ct.prototype.__init18.call(this),ct.prototype.__init19.call(this),ct.prototype.__init20.call(this),ct.prototype.__init21.call(this),ct.prototype.__init22.call(this),this._object=t,this._group=e}getId(){return this._id}getGroup(){return this._group}getTimescale(){return this._timescale}isPlaying(){return this._isPlaying}isPaused(){return this._isPaused}from(t){try{JSON.stringify(t)}catch{throw new Error("The object you provided to the from() method has a circular reference!")}return this._setupProperties(t,this._valuesStart,t,this._valuesStartRepeat,!0),this}to(t,e){try{this._valuesEnd=JSON.parse(JSON.stringify(t))}catch{return console.warn("The object you provided to the to() method has a circular reference!. It can't be cloned. Falling back to dynamic targeting"),this.dynamicTo(t,e)}return e!==void 0&&(this._duration=e),this}dynamicTo(t,e){return this._valuesEnd=t,e!==void 0&&(this._duration=e),this}duration(t){return this._duration=t,this}start(t){return this._isPlaying?this:(t!=null&&(this._delayTime=t),this._group.add(this),this._reversed&&(this._swapEndStartRepeatValues(this._valuesStartRepeat,this._valuesEnd),this._valuesStart=JSON.parse(JSON.stringify(this._valuesStartRepeat))),this._repeatCount=0,this._isPlaying=!0,this._isPaused=!1,this._onStartCallbackFired=!1,this._onAfterDelayCallbackFired=!1,this._isChainStopped=!1,this._startTime=-this._delayTime,this._elapsedTime=0,this._setupProperties(this._object,this._valuesStart,this._valuesEnd,this._valuesStartRepeat,!1),this)}restart(t){return this.reset(),this.start(t)}reset(){return this._isPlaying&&this.stop(),this._valuesStart={},this._valuesStartRepeat={},this}rewind(){this._isPlaying&&this.stop(),this._reversed&&this._swapEndStartRepeatValues(this._valuesStartRepeat,this._valuesEnd);const t=this._easingFunction(0);return this._updateProperties(this._object,this._valuesStart,this._valuesEnd,t),this}_setupProperties(t,e,n,r,s){for(const o in n){const a=t[o],l=Array.isArray(a),u=!Number.isNaN(Number(a)),h=l?"array":typeof a,c=h=="object",d=typeof n[o]=="object",f=!l&&Array.isArray(n[o]);h=="undefined"||h=="function"||n[o]==null||!l&&!u&&!c||((c||l||d)&&a&&!f?(typeof e[o]>"u"&&(e[o]=l?[]:{}),typeof r[o]>"u"&&(r[o]=l?[]:{}),this._setupProperties(a,e[o],n[o],r[o],s)):((typeof e[o]>"u"||s)&&(e[o]=a),(typeof r[o]>"u"||s)&&(f?r[o]=n[o].slice().reverse()[0]:r[o]=e[o]||0)))}}stop(){return this._isChainStopped||(this._isChainStopped=!0,this.stopChainedTweens()),this._isPlaying?(this._group.remove(this),this._isPlaying=!1,this._isPaused=!1,this._onStopCallback&&this._onStopCallback(this._object,this),this):this}end(t=!1){let e=[];if(t||(e=this._chainedTweens,this._chainedTweens=[]),this.resume(),this.update(1/0),!t){this._chainedTweens=e;for(let n=0,r=this._chainedTweens.length;n<r;n++)this._chainedTweens[n].start()}return this}skip(t,e=!1){return this.resume(),this.update(t*this._duration-(e?this._elapsedTime:0)),this}pause(){return this._isPaused||!this._isPlaying?this:(this._isPaused=!0,this._group.remove(this),this)}resume(){return!this._isPaused||!this._isPlaying?this:(this._isPaused=!1,this._group.add(this),this)}stopChainedTweens(){for(let t=0,e=this._chainedTweens.length;t<e;t++)this._chainedTweens[t].stop();return this}startChainedTweens(t=!1){t&&this.stop();for(let e=0,n=this._chainedTweens.length;e<n;e++)this._chainedTweens[e].start();return this}group(t){return this._group=t,this}delay(t){return this._delayTime=t,this}timescale(t){return this._timescale=t,this}repeat(t=1/0){return this._repeat=t,this}repeatDelay(t){return this._repeatDelayTime=t,this}yoyo(t=!0){return this._yoyo=t,this}easing(t){return this._easingFunction=t,this}safetyCheck(t){return this._safetyCheckFunction=t,this}yoyoEasing(t){return this._yoyoEasingFunction=t,this}interpolation(t){return this._interpolationFunction=t,this}chain(...t){return this._chainedTweens=t,this}onStart(t){return this._onStartCallback=t,this}onAfterDelay(t){return this._onAfterDelayCallback=t,this}onUpdate(t){return this._onUpdateCallback=t,this}onRepeat(t){return this._onRepeatCallback=t,this}onComplete(t){return this._onCompleteCallback=t,this}onStop(t){return this._onStopCallback=t,this}update(t,e=!1){const n=this._internalUpdate(t);return!n&&!e&&this._group.remove(this),n}_internalUpdate(t){if(!this._safetyCheckFunction(this._object)||this._isPaused)return!1;t*=this._timescale;let e;this._elapsedTime+=t;const n=this._duration,r=this._startTime+this._elapsedTime;if(r>n&&!this._isPlaying)return!1;this.isPlaying||this.start(),this._onStartCallbackFired==!1&&(this._onStartCallback&&this._onStartCallback(this._object,this),this._onStartCallbackFired=!0),this._onAfterDelayCallbackFired==!1&&r>=0&&(this._onAfterDelayCallback&&this._onAfterDelayCallback(this._object,this),this._onAfterDelayCallbackFired=!0),e=r/this._duration,this._duration==0&&(r>=0?e=1:e=0),e=Math.min(1,e),e=Math.max(0,e);let s=Number.isFinite(r)?r%this._duration:r;Number.isNaN(s)&&(s=0);const o=Math.floor(r/this._duration);let a;if(this._reversed&&this._yoyoEasingFunction?a=this._yoyoEasingFunction(e):a=this._easingFunction(e),this._updateProperties(this._object,this._valuesStart,this._valuesEnd,a),this._onUpdateCallback&&(e!=1||this._repeat-this._repeatCount<=0)&&this._onUpdateCallback(this._object,e,this),e==1){if(this._repeat-this._repeatCount>0){const l=this._repeatCount;if(this._repeatCount=Math.min(this._repeat+1,this._repeatCount+o),this._onUpdateCallback&&(this._repeat-this._repeatCount<0||s<=0)&&this._onUpdateCallback(this._object,e,this),this._yoyo?this._swapEndStartRepeatValues(this._valuesStartRepeat,this._valuesEnd):this._moveForwardStartRepeatValues(this._valuesStartRepeat,this._valuesEnd),this._valuesStart=JSON.parse(JSON.stringify(this._valuesStartRepeat)),this._repeatDelayTime!==void 0?this._startTime=-this._repeatDelayTime:this._startTime=0,this._onRepeatCallback){let u=1;Number.isFinite(o)?u=this._repeatCount-l:Number.isFinite(this._repeat)&&(u=this._repeat-l);for(let h=0;h<u;h++)this._onRepeatCallback(this._object,l+1+h,this)}if(this._elapsedTime=0,this._repeat-this._repeatCount>=0)return s>0&&Number.isFinite(this._repeat)&&this._internalUpdate(s),!0}this._onCompleteCallback&&this._onCompleteCallback(this._object,this);for(let l=0,u=this._chainedTweens.length;l<u;l++)this._chainedTweens[l].start(),s>0&&this._chainedTweens[l].update(s);return this._isPlaying=!1,!1}return!0}_updateProperties(t,e,n,r){for(const s in n){if(e[s]==null)continue;const o=e[s];let a=n[s];const l=Array.isArray(t[s]),u=Array.isArray(a);!l&&u?this._reversed?t[s]=this._interpolationFunction(a.concat([o]),r):t[s]=this._interpolationFunction([o].concat(a),r):typeof a=="object"&&a?this._updateProperties(t[s],o,a,r):(a=this._handleRelativeValue(o,a),typeof a=="number"&&(typeof o=="number"||typeof o=="string")&&(t[s]=Number(o)+(a-Number(o))*r,typeof o=="string"&&(t[s]=String(t[s]))))}}_handleRelativeValue(t,e){return typeof e!="string"?e:e.charAt(0)=="+"||e.charAt(0)=="-"?t+Number(e):Number(e)}_swapEndStartRepeatValues(t,e){for(const n in t){const r=!Array.isArray(t[n])&&Array.isArray(e[n]);if(typeof t[n]=="object")this._swapEndStartRepeatValues(t[n],e[n]);else{const s=t[n];if(typeof e[n]=="string")t[n]=Number(t[n])+Number(e[n]),e[n]=s;else if(r){const o=e[n].slice().reverse();t[n]=o[0],e[n]=o}else t[n]=e[n],e[n]=s}}}_moveForwardStartRepeatValues(t,e){for(const n in t)typeof e[n]=="object"?this._moveForwardStartRepeatValues(t[n],e[n]):typeof e[n]=="string"&&(t[n]=Number(t[n])+Number(e[n]))}}function zo(i,t,e=0,n=!0){let r=t.scale.x,s=t.scale.y;if(!i)throw new Error("Parent is not defined");const o=i.width-e*2,a=i.height-e*2,l=o-Math.round(t.width),u=a-Math.round(t.height);if(l<0&&(r=o/(t.width/r)),u<0&&(s=a/(t.height/s)),r<=0||s<=0){t.scale.set(0);return}if(n||t.scale.x===t.scale.y){const h=Math.min(r,s);t.scale.set(h,h)}else{const h=t.scale.x/t.scale.y;l<u?t.scale.set(r,r/h):t.scale.set(s*h,s)}}function bp(i){return typeof i=="string"||typeof i=="number"?new mt({text:String(i)}):i}var Sp=Object.defineProperty,wp=(i,t,e)=>t in i?Sp(i,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):i[t]=e,Pt=(i,t,e)=>wp(i,typeof t!="symbol"?t+"":t,e);class qt extends xp{constructor(t){super(),Pt(this,"animations"),Pt(this,"originalInnerViewState"),Pt(this,"defaultDuration",100),Pt(this,"options"),Pt(this,"_padding"),Pt(this,"_offset"),Pt(this,"_textOffset"),Pt(this,"iconOffset"),Pt(this,"innerView",new X),Pt(this,"_views",{}),Pt(this,"state"),Pt(this,"anchor"),Pt(this,"_defaultTextScale",{x:1,y:1}),Pt(this,"_defaultIconScale",{x:1,y:1}),Pt(this,"_defaultTextAnchor",{x:.5,y:.5}),Pt(this,"_defaultIconAnchor",{x:.5,y:.5}),this.options=t??{};const{defaultView:e,hoverView:n,pressedView:r,disabledView:s,text:o,padding:a,offset:l,textOffset:u,iconOffset:h,defaultTextScale:c,defaultIconScale:d,defaultTextAnchor:f,defaultIconAnchor:x,scale:v,anchor:g,anchorX:y,anchorY:S,icon:w,animations:T}=t??{};this.addChild(this.innerView),this.anchor=new Mt({_onUpdate:()=>this.updateAnchor()}),this.anchor.set(y??g??0,S??g??0),this.padding=a??0,this.offset=l,this.textOffset=u,this.iconOffset=h,this.defaultTextScale=c,this.defaultIconScale=d,this.defaultTextAnchor=f,this.defaultIconAnchor=x,this.scale.set(v??1),T&&(this.animations=T,Ut.shared.add(()=>Vt.shared.update())),this.setState("default"),this.defaultView=e,this.hoverView=n,this.pressedView=r,this.disabledView=s,this.text=o,this.iconView=w,this.initStateControl()}set text(t){if(!t||t===0){this.removeView("textView");return}if(!this._views.textView){this.createTextView(t);return}this._views.textView.text=t.toString()}get text(){return this._views.textView?.text}set enabled(t){this.button.enabled=t,this.setState(t?"default":"disabled")}get enabled(){return this.button.enabled}setState(t,e=!1){if(!e&&this.state===t)return;const n=this.getStateView(this.state);n&&(n.visible=!1),this.state=t;const r=this.getStateView(t);r&&(this.setOffset(r,t,this.offset),r.visible=!0),this.updateAnchor(),this.playAnimations(t)}createTextView(t){if(this._views.textView=bp(t),this.options?.defaultTextScale===void 0){const{x:e,y:n}=this._views.textView.scale;this._defaultTextScale={x:e,y:n}}this.innerView.addChild(this._views.textView),this.adjustTextView(this.state)}setOffset(t,e,n){const r=n?n[e]:{x:0,y:0},s=n?.default;r?(t.x+=r.x??0,t.y+=r.y??0):s?(t.x+=s.x??0,t.y+=s.y??0):(n.x||n.y)&&(t.x+=n.x??0,t.y+=n.y??0)}getStateView(t){if(this._views)switch(t){case"hover":return this._views.hoverView??this._views.defaultView??void 0;case"pressed":return this._views.pressedView??this._views.hoverView??this._views.defaultView??void 0;case"disabled":return this._views.disabledView??this._views.defaultView??void 0;case"default":return this._views.defaultView??void 0;default:return}}adjustTextView(t){if(!this.text)return;const e=this.getStateView(this.state),{x:n,y:r}=this._defaultTextAnchor;if(e){if(this.options.ignoreRefitting||this._views.textView.scale.set(this._defaultTextScale.x,this._defaultTextScale.y),this.contentFittingMode==="default"&&zo(e,this._views.textView,this.padding,!1),this.contentFittingMode==="fill"){this._views.textView.scale.set(1);const s=e.width-this.padding*2,o=e.height-this.padding*2,a=s/this._views.textView.width,l=o/this._views.textView.height,u=Math.min(a,l);this._views.textView.scale.set(u*this._defaultTextScale.x,u*this._defaultTextScale.y)}this._views.textView.x=e.x+e.width/2,this._views.textView.y=e.y+e.height/2}this._views.textView.anchor.set(n,r),this.setOffset(this._views.textView,t,this.textOffset)}adjustIconView(t){if(!this._views.iconView)return;const e=this.getStateView(t);if(!e)return;if(this.options.ignoreRefitting||this._views.iconView.scale.set(this._defaultIconScale.x,this._defaultIconScale.y),this.contentFittingMode==="default"&&zo(e,this._views.iconView,this.padding,!1),this.contentFittingMode==="fill"){this._views.iconView.scale.set(1);const s=e.width-this.padding*2,o=e.height-this.padding*2,a=s/this._views.iconView.width,l=o/this._views.iconView.height,u=Math.min(a,l);this._views.iconView.scale.set(u*this._defaultIconScale.x,u*this._defaultIconScale.y)}const{x:n,y:r}=this._defaultIconAnchor;"anchor"in this._views.iconView?this._views.iconView.anchor.set(n,r):this._views.iconView.pivot.set(n*(this._views.iconView.width/this._views.iconView.scale.x),r*(this._views.iconView.height/this._views.iconView.scale.y)),this._views.iconView.x=e.x+e.width/2,this._views.iconView.y=e.y+e.height/2,this.setOffset(this._views.iconView,t,this.iconOffset)}updateAnchor(){if(!this._views)return;const t=this.anchor.x??0,e=this.anchor.y??0;if([this._views.defaultView,this._views.hoverView,this._views.pressedView,this._views.disabledView].forEach(r=>{r&&(r.anchor?.set(0),r.x=-r.width*t,r.y=-r.height*e)}),this._views.defaultView){const{x:r,y:s,width:o,height:a}=this._views.defaultView;this.hitArea=new _t(r,s,o,a)}this.adjustIconView(this.state),this.adjustTextView(this.state)}set contentFittingMode(t){this.options.contentFittingMode=t}get contentFittingMode(){return this.options.contentFittingMode??"default"}set defaultView(t){this.updateView("defaultView",t)}get defaultView(){return this._views.defaultView}set hoverView(t){this.updateView("hoverView",t),this._views.hoverView&&this.state!=="hover"&&(this._views.hoverView.visible=!1)}get hoverView(){return this._views.hoverView}set pressedView(t){this.updateView("pressedView",t),this._views.pressedView&&(this._views.pressedView.visible=!1)}get pressedView(){return this._views.pressedView}set disabledView(t){this.updateView("disabledView",t),this._views.disabledView&&(this._views.disabledView.visible=!1)}get disabledView(){return this._views.disabledView}updateView(t,e){e!==void 0&&(this.removeView(t),e!==null&&(this.options?.nineSliceSprite&&(typeof e=="string"?this._views[t]=new Et({texture:k.from(e),leftWidth:this.options.nineSliceSprite[0],topHeight:this.options.nineSliceSprite[1],rightWidth:this.options.nineSliceSprite[2],bottomHeight:this.options.nineSliceSprite[3]}):e instanceof k?this._views[t]=new Et({texture:e,leftWidth:this.options.nineSliceSprite[0],topHeight:this.options.nineSliceSprite[1],rightWidth:this.options.nineSliceSprite[2],bottomHeight:this.options.nineSliceSprite[3]}):console.warn("NineSliceSprite can not be used with views set as Container. Pass the texture or texture name as instead of the Container extended instance.")),this._views[t]||(this._views[t]=gi(e)),this.setOffset(this._views[t],this.state,this.offset),this._views[t].parent||this.innerView.addChild(this._views[t]),this.updateAnchor(),this._views.iconView&&this.innerView.addChild(this._views.iconView),this._views.textView&&this.innerView.addChild(this._views.textView),this.setState(this.state,!0)))}removeView(t){this._views[t]&&(this.innerView.removeChild(this._views[t]),this._views[t]=null)}set textView(t){t!==void 0&&(this.removeView("textView"),t!==null&&this.createTextView(t))}get textView(){return this._views.textView}set iconView(t){if(t!==void 0&&(this.removeView("iconView"),t!==null)){if(this._views.iconView=gi(t),this.options?.defaultIconScale===void 0){const{x:e,y:n}=this._views.iconView.scale;this._defaultIconScale={x:e,y:n}}this._views.iconView.parent||this.innerView.addChild(this._views.iconView),this.setState(this.state,!0)}}get iconView(){return this._views.iconView}playAnimations(t){if(!this.animations)return;if(t==="default"&&!this.originalInnerViewState){this.originalInnerViewState={x:this.innerView.x,y:this.innerView.y,width:this.innerView.width,height:this.innerView.height,scale:{x:this.innerView.scale.x,y:this.innerView.scale.y}};const n=this.animations?.default;if(n){this.innerView.x=n.props.x??this.originalInnerViewState.x,this.innerView.y=n.props.y??this.originalInnerViewState.y,this.innerView.width=n.props.width??this.originalInnerViewState.width,this.innerView.height=n.props.height??this.originalInnerViewState.height,this.innerView.scale.x=n.props.scale.x??this.originalInnerViewState.scale.x,this.innerView.scale.y=n.props.scale.y??this.originalInnerViewState.scale.y;return}}const e=this.animations[t]??this.animations.default;if(e){const n=e;this.defaultDuration=n.duration,new ct(this.innerView).to(n.props,n.duration).start();return}new ct(this.innerView).to(this.originalInnerViewState,this.defaultDuration).start()}initStateControl(){this.onDown.connect(()=>{this.setState("pressed")}),this.onUp.connect(()=>{De.any?this.setState("default"):this.setState("hover")}),this.onUpOut.connect(()=>{this.setState("default")}),this.onOut.connect(()=>{this.button.isDown||this.setState("default")}),this.onPress.connect(()=>{De.any?this.setState("default"):this.setState("hover")}),this.onHover.connect(()=>{this.button.isDown||(De.any?this.setState("default"):this.setState("hover"))})}set padding(t){this._padding=t,this.adjustTextView(this.state),this.adjustIconView(this.state)}get padding(){return this._padding}set offset(t){this._offset=t,this.updateAnchor()}get offset(){return this._offset}set textOffset(t){this._textOffset=t,this.adjustTextView(this.state)}get textOffset(){return this._textOffset}set defaultTextScale(t){if(t===void 0)return;this.options.defaultTextScale=t;const e=typeof t=="number";this._defaultTextScale.x=e?t:t.x??1,this._defaultTextScale.y=e?t:t.y??1,this.adjustTextView(this.state)}get defaultTextScale(){return this.defaultTextScale}set defaultIconScale(t){if(t===void 0)return;this.options.defaultIconScale=t;const e=typeof t=="number";this._defaultIconScale.x=e?t:t.x??1,this._defaultIconScale.y=e?t:t.y??1,this.adjustIconView(this.state)}get defaultIconScale(){return this.defaultIconScale}set defaultTextAnchor(t){if(t===void 0)return;this.options.defaultTextAnchor=t;const e=typeof t=="number";this._defaultTextAnchor.x=e?t:t.x??1,this._defaultTextAnchor.y=e?t:t.y??1,this.adjustTextView(this.state)}get defaultTextAnchor(){return this.defaultTextAnchor}set defaultIconAnchor(t){if(t===void 0)return;this.options.defaultIconAnchor=t;const e=typeof t=="number";this._defaultIconAnchor.x=e?t:t.x??1,this._defaultIconAnchor.y=e?t:t.y??1,this.adjustIconView(this.state)}get defaultIconAnchor(){return this.defaultIconAnchor}set width(t){this.options?.nineSliceSprite?(this._views.defaultView&&(this._views.defaultView.width=t),this._views.hoverView&&(this._views.hoverView.width=t),this._views.pressedView&&(this._views.pressedView.width=t),this._views.disabledView&&(this._views.disabledView.width=t),this.adjustTextView(this.state),this.adjustIconView(this.state),this.updateAnchor()):super.width=t}get width(){return super.width}set height(t){this.options?.nineSliceSprite?(this._views.defaultView&&(this._views.defaultView.height=t),this._views.hoverView&&(this._views.hoverView.height=t),this._views.pressedView&&(this._views.pressedView.height=t),this._views.disabledView&&(this._views.disabledView.height=t),this.adjustTextView(this.state),this.adjustIconView(this.state),this.updateAnchor()):super.height=t}get height(){return super.height}setSize(t,e){this.options?.nineSliceSprite?(this._views.defaultView&&this._views.defaultView.setSize(t,e),this._views.hoverView&&this._views.hoverView.setSize(t,e),this._views.pressedView&&this._views.pressedView.setSize(t,e),this._views.disabledView&&this._views.disabledView.setSize(t,e),this.adjustTextView(this.state),this.adjustIconView(this.state),this.updateAnchor()):super.setSize(t,e)}}class un{isFullScreen=!1;fullscreenToggleButton;zoomInButton;zoomOutButton;toggleCoordsButton;toggleGridButton;nextTurnButton;nextUnitButton;showHealthbarsButton;toggleStatsButton;togglePerfStatsButton;static DEFAULT_FONT_STYLE={fontFamily:"GustysSerpents",fontSize:16,align:"left"};DEFAULT_BUTTON_STYLE={defaultView:"btn_simple.png",hoverView:"btn_simple_hover.png",pressedView:"btn_simple_click.png",nineSliceSprite:[7,7,7,7]};initializeButtons(){this.fullscreenToggleButton=new qt({...this.DEFAULT_BUTTON_STYLE,icon:"glyph_fullscreen.png"}),this.fullscreenToggleButton.position.set(10,10),this.zoomInButton=new qt({...this.DEFAULT_BUTTON_STYLE,icon:"glyph_plus.png"}),this.zoomInButton.position.set(10,60),this.zoomOutButton=new qt({...this.DEFAULT_BUTTON_STYLE,icon:"glyph_minus.png"}),this.zoomOutButton.position.set(10,110),this.toggleCoordsButton=new qt({...this.DEFAULT_BUTTON_STYLE,icon:"glyph_xy.png"}),this.toggleCoordsButton.position.set(10,160),this.toggleGridButton=new qt({...this.DEFAULT_BUTTON_STYLE,icon:"glyph_grid.png"}),this.toggleGridButton.position.set(10,210),this.showHealthbarsButton=new qt({...this.DEFAULT_BUTTON_STYLE,icon:"glyph_toggle_healthbars.png"}),this.showHealthbarsButton.position.set(10,260),this.toggleStatsButton=new qt({...this.DEFAULT_BUTTON_STYLE,icon:"glyph_toggle_stats.png"}),this.toggleStatsButton.position.set(10,310),this.togglePerfStatsButton=new qt({...this.DEFAULT_BUTTON_STYLE,icon:"glyph_toggle_perf_stats.png"}),this.togglePerfStatsButton.position.set(10,360),this.nextUnitButton=new qt({...this.DEFAULT_BUTTON_STYLE,icon:"glyph_next_unit.png"}),this.nextUnitButton.position.set(10,695),this.nextUnitButton.width=130,this.nextUnitButton.height=75,this.nextUnitButton.text=new mt({...un.DEFAULT_FONT_STYLE,text:`
[N]ext Unit`}),this.nextTurnButton=new qt({...this.DEFAULT_BUTTON_STYLE,icon:"glyph_next_turn.png"}),this.nextTurnButton.position.set(10,790),this.nextTurnButton.width=130,this.nextTurnButton.height=75,this.nextTurnButton.text=new mt({...un.DEFAULT_FONT_STYLE,text:`
[E]nd Turn`}),this.connectEventHandlers()}getControls(){let t=[];return this.fullscreenToggleButton&&t.push(this.fullscreenToggleButton),this.zoomInButton&&t.push(this.zoomInButton),this.zoomOutButton&&t.push(this.zoomOutButton),this.toggleCoordsButton&&t.push(this.toggleCoordsButton),this.toggleGridButton&&t.push(this.toggleGridButton),this.nextTurnButton&&t.push(this.nextTurnButton),this.nextUnitButton&&t.push(this.nextUnitButton),this.showHealthbarsButton&&t.push(this.showHealthbarsButton),this.toggleStatsButton&&t.push(this.toggleStatsButton),this.togglePerfStatsButton&&t.push(this.togglePerfStatsButton),t}connectEventHandlers(){this.fullscreenToggleButton?.onPress.connect(()=>{this.isFullScreen?this.exitFullscreen():this.enterFullscreen()})}async enterFullscreen(){if(this.isFullScreen)return;const t=document.getElementById("game");if(!t){console.error("Failed to find the game container element");return}await t.requestFullscreen(),console.log("Entered fullscreen mode"),this.isFullScreen=!0}async exitFullscreen(){console.log("Exiting fullscreen mode"),this.isFullScreen&&(await document.exitFullscreen(),console.log("Exited fullscreen mode"),this.isFullScreen=!1)}}class Cp{constructor(t,e,n,r){this.creature=t,this.position=e,this.indexInArmy=n,this.indexOFArmy=r}}var Hi=(i=>(i[i.NONE=0]="NONE",i[i.ATTACK_MELEE=1]="ATTACK_MELEE",i[i.ATTACK_RANGED=2]="ATTACK_RANGED",i))(Hi||{});class vi{constructor(t,e){this.type=t,this.coords=e}static DEFAULT=new vi(0,{x:0,y:0})}class Xi{selectedCreatureIndex=-1;currentArmyIndex=0;reachableCells=!1;enemyReachableCells=!1;unitRenderUpdate=!1;hoverOverCell=null;hoverOverUnitIndex=-1;hoverDirection=lt.NONE;hoverPath=[];cursorHint="";animationAtCoords={...vi.DEFAULT};somethingChanged=!1;hoverEnemyIndex=-1}var Yi=(i=>(i[i.NONE=0]="NONE",i[i.MOVE=1]="MOVE",i[i.ATTACK_MELEE=2]="ATTACK_MELEE",i[i.ATTACK_RANGED=3]="ATTACK_RANGED",i[i.COUNTER_ATTACK_MELEE=4]="COUNTER_ATTACK_MELEE",i[i.SELECT_NEXT=5]="SELECT_NEXT",i))(Yi||{});class Wt{constructor(t,e,n=0,r=0,s=0,o,a){this.type=t,this.path=e,this.step=n,this.stepDuration=r,this.remainingTime=s,this.sourceUnit=o,this.targetUnit=a}static AttackMelee(t,e){return new Wt(2,[e.position],0,500,50,t,e)}static CounterAttack(t,e){return new Wt(4,[],0,500,50,t,e)}}class se{constructor(t){this.hexMap=t}turnNumber=0;currentArmyIndex=0;activeCreatureIndex=-1;renderStateChanged=!0;creatures=[];pathfinding_tiles=[];enemy_potential_tiles=[];enemy_range_tiles=[];rangereach_tiles=[];cached_occupation_tiles=[];nextRenderUpdate=new Xi;prevRenderUpdate=new Xi;unitReachData=[];unitRangeData=[];currentActions=[];finished=!1;initializeToSize(t,e){this.hexMap.initializeToSize(t,e);for(let n=0;n<t;n++){this.pathfinding_tiles[n]=[],this.cached_occupation_tiles[n]=[],this.rangereach_tiles[n]=[],this.enemy_potential_tiles[n]=[],this.enemy_range_tiles[n]=[];for(let r=0;r<e;r++)this.pathfinding_tiles[n][r]=0,this.cached_occupation_tiles[n][r]=0,this.rangereach_tiles[n][r]=0,this.enemy_potential_tiles[n][r]=0,this.enemy_range_tiles[n][r]=0}}selectCreatureByArmyIndex(t,e){this.activeCreatureIndex=e,this.renderStateChanged=!0,this.nextRenderUpdate.selectedCreatureIndex=e,this.nextRenderUpdate.currentArmyIndex=t,this.nextRenderUpdate.somethingChanged=!0,console.log(`Selected creature in army: ${this.currentArmyIndex}, at index ${this.activeCreatureIndex}`)}static resetNumericalMatrixToZero(t){for(let e=0;e<t.length;e++)for(let n=0;n<t[0].length;n++)t[e][n]=0}cacheCreaturesToHexMap(){se.resetNumericalMatrixToZero(this.cached_occupation_tiles);for(let t=0;t<this.creatures.length;t++){let e=this.creatures[t];this.cached_occupation_tiles[e.position.x][e.position.y]=t+1}}cacheRangedReachableCells(t,e,n,r,s){let o=[{coords:t,reach:e,cameFrom:t}];for(;o.length>0;){let a=o.shift();if(a===void 0||n[a.coords.x][a.coords.y]!==0||a.reach<0||(n[a.coords.x][a.coords.y]=a.reach+1,a.reach===0))continue;let u=this.hexMap.getNeighbours(a.coords).map(h=>({coords:h,reach:a.reach-1,cameFrom:a.coords}));u=u.filter(h=>n[h.coords.x][h.coords.y]===0);for(const h of u){o.push(h);const c=this.cached_occupation_tiles[h.coords.x][h.coords.y]-1;c>=0&&this.creatures[c].armyAlignment!==s&&(r.push(h),this.pathfinding_tiles[h.coords.x][h.coords.y]=100)}}}cacheMeleeReachableCells(t,e,n,r,s,o){se.resetNumericalMatrixToZero(n);let a=[{coords:t,reach:e,cameFrom:t}];for(;a.length>0;){let l=a.shift();if(l===void 0||l.reach<0)continue;let h=this.hexMap.getNeighbours(l.coords).map(c=>({coords:c,reach:l.reach-1,cameFrom:l.coords}));h=h.filter(c=>n[c.coords.x][c.coords.y]===0);for(let c of h){if(this.cached_occupation_tiles[c.coords.x][c.coords.y]>0){const d=this.cached_occupation_tiles[c.coords.x][c.coords.y]-1;d>=0&&this.creatures[d].armyAlignment!==s&&this.creatures[o].stats.remaining_attacks>0&&(r.push(c),n[c.coords.x][c.coords.y]=100);continue}l.reach>0&&(a.push(c),r.push(c),n[c.coords.x][c.coords.y]=1)}}}showReachableCells(t){let e=[],n=t.position;return this.cacheCreaturesToHexMap(),this.unitReachData=[],this.cacheMeleeReachableCells(n,t.stats.remaining_movement,this.pathfinding_tiles,this.unitReachData,this.currentArmyIndex,this.activeCreatureIndex),this.unitRangeData=[],se.resetNumericalMatrixToZero(this.rangereach_tiles),t.stats.is_ranged&&this.cacheRangedReachableCells(n,t.stats.range,this.rangereach_tiles,this.unitRangeData,this.currentArmyIndex),this.nextRenderUpdate.reachableCells=!0,e}getCreatureAtPosition(t){for(let e=0;e<this.creatures.length;e++)if(this.creatures[e].position.x==t.x&&this.creatures[e].position.y==t.y)return new Cp(this.creatures[e],t,e,this.creatures[e].armyAlignment);return null}tryToSelectUnitAtLocation(t){let e=this.getCreatureAtPosition(t);e!==null&&(console.log("Clicked on creature: ",e),this.currentArmyIndex===e.indexOFArmy&&(this.selectCreatureByArmyIndex(e.indexOFArmy,e.indexInArmy),this.showReachableCells(e.creature)))}moveOrAttackWithActiveCreatureAtLocation(t,e,n=!1){if(this.activeCreatureIndex<0)return;if(this.pathfinding_tiles[t.x][t.y]===0){console.log("Clicked on a non-reachable cell");return}let r=this.creatures[this.activeCreatureIndex],s=this.getCreatureAtPosition(t);if(s===null){console.log("Moving creature to cell: ",t);const a=this.findPathFromSelectedUnitToCell(t);r.stats.remaining_movement-=a.length,this.currentActions.push(new Wt(1,a,0,50,50)),this.nextRenderUpdate.hoverOverCell=null,this.nextRenderUpdate.hoverPath=[];return}if(s.indexInArmy===this.activeCreatureIndex){console.log("Clicked on the same creature");return}if(r.armyAlignment===s.indexOFArmy){console.log("Tried to attack a friendly creature");return}if(r.stats.remaining_attacks<=0){console.log("No more attacks left");return}if(console.log("Attacking creature: ",s),r.stats.is_ranged&&!n&&this.hexMap.getNeighbours(r.position).findIndex(a=>a.x===t.x&&a.y===t.y)==-1){console.log("Range attack at: ",t),this.currentActions.push(new Wt(3,[t],0,500,50)),this.nextRenderUpdate.unitRenderUpdate=!0,this.nextRenderUpdate.somethingChanged=!0;return}let o=[];if(e!==lt.NONE){let a=this.hexMap.getNeighbourInDirection(t,e);a&&this.getCreatureAtPosition(a)===null&&(o=this.findPathFromSelectedUnitToCell(a))}o.length===0&&(o=this.findPathFromSelectedUnitToCell(t),o.pop()),r.stats.remaining_movement-=o.length,console.log("Adding action to move with path: ",o),this.currentActions.push(new Wt(1,o,0,50,50,r,s.creature)),console.log("Adding action to attack at: ",t),this.currentActions.push(new Wt(2,[t],0,500,50,r,s.creature))}onMouseClickOnCell(t,e,n=lt.NONE,r){this.currentActions.length>0||(t.button===0?this.tryToSelectUnitAtLocation(e):t.button===2&&(console.log("Right mouse button clicked, coords: ",e,"dir:",n,", meleePref:",r),this.moveOrAttackWithActiveCreatureAtLocation(e,n,r)))}onMouseOverCell(t,e=lt.NONE,n=!1){if(this.currentActions.length>0||this.nextRenderUpdate.hoverOverCell&&this.nextRenderUpdate.hoverOverCell.x===t.x&&this.nextRenderUpdate.hoverOverCell.y===t.y)return;if(this.nextRenderUpdate.hoverOverCell=t,this.nextRenderUpdate.hoverDirection=e,this.activeCreatureIndex<=-1){this.nextRenderUpdate.hoverPath=[],this.nextRenderUpdate.somethingChanged=!0;return}const r=this.creatures[this.activeCreatureIndex],s=this.getCreatureAtPosition(t);if(s===null||s.indexOFArmy===this.currentArmyIndex){this.nextRenderUpdate.hoverPath=this.findPathFromSelectedUnitToCell(t),this.nextRenderUpdate.cursorHint="default",this.nextRenderUpdate.somethingChanged=!0,this.nextRenderUpdate.enemyReachableCells=!0,this.nextRenderUpdate.hoverOverUnitIndex=s?.indexInArmy??-1,se.resetNumericalMatrixToZero(this.enemy_potential_tiles),se.resetNumericalMatrixToZero(this.enemy_range_tiles);return}let o=[];this.cacheMeleeReachableCells(t,s.creature.stats.remaining_movement,this.enemy_potential_tiles,o,s.indexOFArmy,s.indexInArmy);let a=[];if(se.resetNumericalMatrixToZero(this.enemy_range_tiles),s.creature.stats.is_ranged&&this.cacheRangedReachableCells(t,s.creature.stats.range,this.enemy_range_tiles,a,s.indexOFArmy),this.nextRenderUpdate.enemyReachableCells=!0,this.nextRenderUpdate.hoverEnemyIndex=s.indexInArmy,this.nextRenderUpdate.somethingChanged=!0,r.stats.remaining_attacks<=0)return;if(r.stats.is_ranged&&!n){if(!this.unitRangeData.find(d=>d.coords.x===t.x&&d.coords.y===t.y))return;if(this.hexMap.getNeighbours(r.position).findIndex(d=>d.x===t.x&&d.y===t.y)==-1){this.nextRenderUpdate.hoverPath=[],this.nextRenderUpdate.hoverOverCell=t,this.nextRenderUpdate.cursorHint="attack_ranged",this.nextRenderUpdate.somethingChanged=!0;return}}let l=this.hexMap.getNeighbourInDirection(t,e);if(!l){console.log("Neighbour not found in direction: ",e),this.nextRenderUpdate.somethingChanged=!0;return}if(!this.unitReachData.find(c=>c.coords.x===l.x&&c.coords.y===l.y)){if(l.x===r.position.x&&l.y===r.position.y){this.nextRenderUpdate.cursorHint=this.getAttackCursorForDirection(ir(e)),this.nextRenderUpdate.somethingChanged=!0;return}if(this.unitReachData.find(d=>d.coords.x===t.x&&d.coords.y===t.y))if(this.nextRenderUpdate.cursorHint="attack_melee",this.nextRenderUpdate.hoverPath=this.findPathFromSelectedUnitToCell(t),this.nextRenderUpdate.hoverPath.length>=2){e=this.hexMap.getDirectionForNeighbour(t,this.nextRenderUpdate.hoverPath[this.nextRenderUpdate.hoverPath.length-2]),this.nextRenderUpdate.cursorHint=this.getAttackCursorForDirection(ir(e)),this.nextRenderUpdate.somethingChanged=!0;return}else return;else{this.nextRenderUpdate.cursorHint="",this.nextRenderUpdate.somethingChanged=!0;return}}if(this.getCreatureAtPosition(l)){console.log("Occupied by enemy unit");return}this.nextRenderUpdate.hoverPath=this.findPathFromSelectedUnitToCell(l),this.nextRenderUpdate.cursorHint=this.getAttackCursorForDirection(ir(e)),this.nextRenderUpdate.somethingChanged=!0}getAttackCursorForDirection(t){switch(t){case lt.EAST:return"attack_melee_e";case lt.NORTHEAST:return"attack_melee_ne";case lt.NORTHWEST:return"attack_melee_nw";case lt.WEST:return"attack_melee_w";case lt.SOUTHWEST:return"attack_melee_sw";case lt.SOUTHEAST:return"attack_melee_se";default:return""}}static findPathToCellInReachData(t,e){let n=[],r=e.find(s=>s.coords.x===t.x&&s.coords.y===t.y);if(!r)return n;for(;r;)n.push(r.coords),r=e.find(s=>s.coords.x===r?.cameFrom.x&&s.coords.y===r?.cameFrom.y);return n.reverse(),n}findPathFromSelectedUnitToCell(t){return se.findPathToCellInReachData(t,this.unitReachData)}nextTurn(){if(!this.finished){for(let t=0;t<this.creatures.length;t++)this.creatures[t].armyAlignment===this.currentArmyIndex&&(this.creatures[t].stats.remaining_movement=this.creatures[t].stats.num_moves,this.creatures[t].stats.remaining_attacks=this.creatures[t].stats.num_attacks,this.creatures[t].stats.remaining_counterattacks=this.creatures[t].stats.num_counterattacks);this.currentArmyIndex=(this.currentArmyIndex+1)%2,this.currentArmyIndex===0&&this.turnNumber++,this.activeCreatureIndex=-1,this.hookNextTurn(this.turnNumber,this.currentArmyIndex)}}checkVictoryConditions(){let t=!1,e=!1;for(let n=0;n<this.creatures.length;n++)this.creatures[n].stats.remaining_health>0&&(this.creatures[n].armyAlignment===0?t=!0:e=!0);return t?e?-1:(console.log("Army 0 wins!"),0):(console.log("Army 1 wins!"),1)}checkVictoryConditionsAndState(){let t=this.checkVictoryConditions();t>=0&&(this.finished=!0,this.hookBattleFinished(t))}selectNextUnit(){let t=-1,e=this.activeCreatureIndex;for(let n=0;n<this.creatures.length;n++)if(e=(e+1)%this.creatures.length,this.creatures[e].armyAlignment===this.currentArmyIndex&&(this.creatures[e].stats.remaining_movement>0||this.creatures[e].stats.remaining_attacks>0)){t=e;break}return t==-1&&this.hookRecommendEndTurn(this.currentArmyIndex),t>=0&&(this.selectCreatureByArmyIndex(this.currentArmyIndex,t),this.showReachableCells(this.creatures[t])),this.nextRenderUpdate.hoverPath=[],this.nextRenderUpdate.unitRenderUpdate=!0,t}reselectCurrentUnit(){return this.activeCreatureIndex>=0&&(this.selectCreatureByArmyIndex(this.currentArmyIndex,this.activeCreatureIndex),this.showReachableCells(this.creatures[this.activeCreatureIndex])),this.nextRenderUpdate.hoverPath=[],this.nextRenderUpdate.unitRenderUpdate=!0,this.activeCreatureIndex}update(t){if((this.prevRenderUpdate.hoverEnemyIndex!=this.nextRenderUpdate.hoverEnemyIndex||this.prevRenderUpdate.hoverOverUnitIndex!=this.nextRenderUpdate.hoverOverUnitIndex)&&(this.nextRenderUpdate.unitRenderUpdate=!0),this.prevRenderUpdate=this.nextRenderUpdate,this.nextRenderUpdate=new Xi,this.currentActions.length==0)return this.prevRenderUpdate;let e=this.currentActions[0];switch(e.type){case 1:e.remainingTime-=t,this.updateDoMove(e);break;case 2:case 3:if(e.remainingTime-=t,e.remainingTime>0)return this.prevRenderUpdate;this.updateDoAttack(e);break;case 4:if(e.remainingTime-=t,e.remainingTime>0)return this.prevRenderUpdate;this.updateDoCounterAttack(e);break;case 5:this.currentActions.shift(),this.selectNextUnit();break}return this.prevRenderUpdate}updateDoMove(t){if(!(t.remainingTime>0))if(t.remainingTime=t.stepDuration,t.step<t.path.length){let e=t.path[t.step];const n=this.hexMap.getDirectionForNeighbour(this.creatures[this.activeCreatureIndex].position,e);this.creatures[this.activeCreatureIndex].facingDirection=n,this.creatures[this.activeCreatureIndex].position=e,this.hookMovingUnit(this.creatures[this.activeCreatureIndex],e),t.step++,this.nextRenderUpdate.unitRenderUpdate=!0,this.nextRenderUpdate.somethingChanged=!0}else this.currentActions.shift(),this.creatures[this.activeCreatureIndex].stats.remaining_movement>0?this.reselectCurrentUnit():this.currentActions.push(new Wt(5,[],0,500,50))}updateDoAttack(t){if(t.step==0){if(t.type==2){const n=this.hexMap.getDirectionForNeighbour(this.creatures[this.activeCreatureIndex].position,t.path[0]);this.creatures[this.activeCreatureIndex].facingDirection=n,this.nextRenderUpdate.unitRenderUpdate=!0,this.nextRenderUpdate.somethingChanged=!0}else{const n=this.hexMap.getGeneralDirectionForTarget(this.creatures[this.activeCreatureIndex].position,t.path[0]);this.creatures[this.activeCreatureIndex].facingDirection!==n&&(this.creatures[this.activeCreatureIndex].facingDirection=n,this.nextRenderUpdate.unitRenderUpdate=!0,this.nextRenderUpdate.somethingChanged=!0)}const e=t.type==2?1:2;this.nextRenderUpdate.animationAtCoords=new vi(e,t.path[0]),this.nextRenderUpdate.somethingChanged=!0,t.step++,t.remainingTime=t.stepDuration,console.log("Playing attack animation");return}else if(t.step==1){const e=this.updateDoAttackApplyDamageAndCounter(t);console.log("Applied attack"),this.currentActions.shift(),this.nextRenderUpdate.unitRenderUpdate=!0,this.nextRenderUpdate.somethingChanged=!0,t.step++,e||this.currentActions.push(new Wt(5,[],0,500,50))}}updateDoAttackApplyDamageAndCounter(t){let e=!1;if(t.path.length<=0)return e;const n=t.path[0];let r=this.getCreatureAtPosition(n);if(r===null)return console.error("The creature is no longer there"),e;let s=this.creatures[this.activeCreatureIndex],o=t.type==2?s.getRandomAttackDamageMelee():s.getRandomAttackDamageRanged(),a=t.type==2?r.creature.stats.defense_melee:r.creature.stats.defense_ranged;return o-=a,this.hookDoingAttack(s,r.creature,o,t.type),r.creature.takeDamage(o),console.log(`Dealt ${o} damage to the creature`),r.creature.isAlive?(console.log("The creature is still alive"),e=t.type==2&&this.queueCounterattack(r.creature,s)):(console.log("The creature has died"),this.hookUnitDied(r.creature),this.creatures.splice(r.indexInArmy,1),this.checkVictoryConditionsAndState(),this.tryToSelectUnitAtLocation(s.position)),s.stats.remaining_attacks--,s.stats.remaining_movement=0,e}hookDoingAttack(t,e,n,r){console.log("hookDoingAttack not implemented.")}hookNextTurn(t,e){console.log("hookNextTurn not implemented.")}hookMovingUnit(t,e){console.log("hookMovingUnit not implemented.")}hookUnitDied(t){console.log("hookUnitDied not implemented.")}hookBattleFinished(t){console.log("hookBattleFinished not implemented.")}hookRecommendEndTurn(t){console.log("hookRecommendEndTurn not implemented.")}queueCounterattack(t,e){return t.stats.remaining_counterattacks<=0?!1:(console.log("Queueing counterattack"),this.currentActions.push(Wt.CounterAttack(t,e)),!0)}updateDoCounterAttack(t){if(!(t.sourceUnit===void 0||t.targetUnit===void 0))if(t.step==0){if(t.type==4){const n=this.hexMap.getDirectionForNeighbour(t.sourceUnit.position,t.targetUnit.position);t.sourceUnit.facingDirection=n,this.nextRenderUpdate.unitRenderUpdate=!0,this.nextRenderUpdate.somethingChanged=!0}const e=1;this.nextRenderUpdate.animationAtCoords=new vi(e,t.targetUnit.position),this.nextRenderUpdate.somethingChanged=!0,t.step++,t.remainingTime=t.stepDuration,console.log("Playing counterattack animation");return}else t.step==1&&(this.updateDoCounterAttackApply(t),console.log("Applied counterattack"),this.currentActions.shift(),this.nextRenderUpdate.unitRenderUpdate=!0,this.nextRenderUpdate.somethingChanged=!0,t.step++,this.currentActions.push(new Wt(5,[],0,500,50)))}updateDoCounterAttackApply(t){if(t.sourceUnit===void 0||t.targetUnit===void 0)return;let e=t.sourceUnit.getRandomAttackDamageMelee(),n=t.targetUnit.stats.defense_melee;if(e-=n,this.hookDoingAttack(t.sourceUnit,t.targetUnit,e,4),t.targetUnit.takeDamage(e),console.log(`Dealt ${e} damage to the creature`),!t.targetUnit.isAlive){console.log("The creature has died");const r=this.creatures.findIndex(s=>s===t.targetUnit);r>=0&&(this.hookUnitDied(this.creatures[r]),this.creatures.splice(r,1),this.checkVictoryConditionsAndState())}t.sourceUnit.stats.remaining_counterattacks--}}class Tp{constructor(t){this.data=t}static equals(t,e){return t.data===e.data}}class Be{static generateGuid(){return new Tp(Be.s4()+"-"+Be.s4()+"-"+Be.s4()+"-"+Be.s4())}static s4(){return Math.floor((1+Math.random())*65536).toString(16).substring(1)}}var at=(i=>(i[i.PEASANT=0]="PEASANT",i[i.PEASANT_ARCHER=1]="PEASANT_ARCHER",i[i.SWORDSMAN=2]="SWORDSMAN",i[i.SPEARMAN=3]="SPEARMAN",i[i.CROSSBOWMAN=4]="CROSSBOWMAN",i[i.ARCHER=5]="ARCHER",i[i.BARBARIAN=6]="BARBARIAN",i))(at||{});class _n{constructor(t=0,e={..._n.DEFAULT_CREATURE_PROPS}){this.creatureType=t,this.stats=e,this.guid=Be.generateGuid()}static DEFAULT_CREATURE_PROPS={attack_melee_low:3,attack_melee_high:6,attack_ranged_low:3,attack_ranged_high:5,defense_melee:0,defense_ranged:0,initiative:4,is_ranged:!1,health:12,num_attacks:1,num_counterattacks:1,range:1,remaining_attacks:1,remaining_counterattacks:1,remaining_health:12,remaining_movement:4,num_moves:4};position={x:0,y:0};facingDirection=lt.EAST;armyAlignment=0;static CREATURE_NAMES=["Peasant","Peasant Archer","Swordsman","Spearman","Crossbowman","Archer","Barbarian"];guid;get GUID(){return this.guid}get isAlive(){return this.stats.remaining_health>0}takeDamage(t){this.stats.remaining_health-=t}getRandomAttackDamageMelee(){return this.stats.attack_melee_low+Math.floor(Math.random()*(this.stats.attack_melee_high-this.stats.attack_melee_low+1))}getRandomAttackDamageRanged(){return this.stats.attack_ranged_low+Math.floor(Math.random()*(this.stats.attack_ranged_high-this.stats.attack_ranged_low+1))}}class Ap{creatureTemplates=[];nameToTypesMap=new Map([[0,"peasant"],[1,"peasant-archer"],[2,"swordsman"],[3,"spearman"],[4,"crossbowman"],[6,"barbarian"]]);constructor(){}setCreatureTemplates(t){this.creatureTemplates=t}createCreature(t){const e=this.nameToTypesMap.get(t),n=this.creatureTemplates.find(s=>s.name===e);if(!n)throw new Error(`Could not find creature template for creature type ${t}`);let r=new _n(t,{...n.stats});return r.stats.remaining_attacks=r.stats.num_attacks,r.stats.remaining_counterattacks=r.stats.num_counterattacks,r.stats.remaining_health=r.stats.health,r.stats.remaining_movement=r.stats.num_moves,console.log("Created creature: ",r),r}}class Bt{constructor(t,e){this.view=t,this.uiSheet=e;const n=new Et({texture:this.uiSheet.textures["panel.png"],leftWidth:15,topHeight:15,rightWidth:15,bottomHeight:15});n.width=200,n.height=350;const r=new mt({text:"Stats",style:{fill:16777215,fontSize:24}});r.anchor.set(.5),r.x=n.width/2,r.y=25,this.window.addChild(n),this.bannerBg=new Et({texture:this.uiSheet.textures["progress_bg.png"],leftWidth:5,topHeight:5,rightWidth:5,bottomHeight:5}),this.bannerBg.width=74,this.bannerBg.height=74,this.bannerBg.position={x:336/2-5,y:-35},this.window.addChild(this.bannerBg),this.faceBg=new Et({texture:this.uiSheet.textures["progress_bg.png"],leftWidth:5,topHeight:5,rightWidth:5,bottomHeight:5}),this.faceBg.width=74,this.faceBg.height=74,this.faceBg.position={x:-64/2-5,y:-35},this.window.addChild(this.faceBg),this.window.addChild(r),this.window.position={x:1350,y:110},this.unitTypeText.position={x:10,y:50},this.hpText.position={x:10,y:80},this.attackMeleeText.position={x:10,y:110},this.attackRangedText.position={x:10,y:140},this.rangeText.position={x:10,y:170},this.movementText.position={x:10,y:200},this.attacksText.position={x:10,y:230},this.meleeDefenseText.position={x:10,y:260},this.rangedDefenseText.position={x:10,y:290},this.counterAttacksText.position={x:10,y:320},this.window.addChild(this.unitTypeText),this.window.addChild(this.hpText),this.window.addChild(this.attackMeleeText),this.window.addChild(this.attackRangedText),this.window.addChild(this.rangeText),this.window.addChild(this.movementText),this.window.addChild(this.attacksText),this.window.addChild(this.meleeDefenseText),this.window.addChild(this.rangedDefenseText),this.window.addChild(this.counterAttacksText),this.view.addChild(this.window)}static DEFAULT_FONT_STYLE={style:{fill:{color:"#ffffff",alpha:1},fontSize:16,align:"left"}};window=new X;stats=void 0;creatureType="";unitTypeText=new mt({...Bt.DEFAULT_FONT_STYLE,text:"Unit Type: "});hpText=new mt({...Bt.DEFAULT_FONT_STYLE,text:"HP: "});attackMeleeText=new mt({...Bt.DEFAULT_FONT_STYLE,text:"Attack (melee): "});attackRangedText=new mt({...Bt.DEFAULT_FONT_STYLE,text:"Attack (ranged): "});rangeText=new mt({...Bt.DEFAULT_FONT_STYLE,text:"Range: "});movementText=new mt({...Bt.DEFAULT_FONT_STYLE,text:"Movement: "});attacksText=new mt({...Bt.DEFAULT_FONT_STYLE,text:"Attacks: "});meleeDefenseText=new mt({...Bt.DEFAULT_FONT_STYLE,text:"Melee Defense: "});rangedDefenseText=new mt({...Bt.DEFAULT_FONT_STYLE,text:"Ranged Defense: "});counterAttacksText=new mt({...Bt.DEFAULT_FONT_STYLE,text:"CounterAttacks: "});bannerSprite=void 0;bannerBg=void 0;faceSprite=void 0;faceBg=void 0;setCreature(t){this.stats=t.stats,this.creatureType=_n.CREATURE_NAMES[t.creatureType]}setBannerTexture(t){this.bannerSprite&&(this.window.removeChild(this.bannerSprite),this.bannerSprite.destroy(),this.bannerSprite=void 0),t&&(this.bannerSprite=new it(t),this.bannerSprite.position={x:5,y:5},this.bannerBg&&(this.bannerSprite.x+=this.bannerBg.x,this.bannerSprite.y+=this.bannerBg.y),this.bannerSprite.width=64,this.bannerSprite.height=64,this.window.addChild(this.bannerSprite))}setFaceTexture(t){this.faceSprite&&(this.window.removeChild(this.faceSprite),this.faceSprite.destroy(),this.faceSprite=void 0),t&&(this.faceSprite=new it(t),this.faceSprite.position={x:5,y:5},this.faceBg&&(this.faceSprite.x+=this.faceBg.x,this.faceSprite.y+=this.faceBg.y),this.faceSprite.width=64,this.faceSprite.height=64,this.window.addChild(this.faceSprite))}update(){this.stats&&(this.unitTypeText.text=`Unit: ${this.creatureType}`,this.hpText.text=`HP: ${this.stats?.remaining_health}/${this.stats?.health}`,this.attackMeleeText.text=`Attack (melee): ${this.stats?.attack_melee_low}-${this.stats?.attack_melee_high}`,this.stats.is_ranged?this.attackRangedText.text=`Attack (ranged): ${this.stats?.attack_ranged_low}-${this.stats?.attack_ranged_high}`:this.attackRangedText.text="Attack (ranged): -",this.rangeText.text=`Range: ${this.stats?.range}`,this.movementText.text=`Movement: ${this.stats?.remaining_movement} / ${this.stats?.num_moves}`,this.attacksText.text=`Attacks: ${this.stats?.remaining_attacks} / ${this.stats?.num_attacks}`,this.meleeDefenseText.text=`Melee Defense: ${this.stats?.defense_melee}`,this.rangedDefenseText.text=`Ranged Defense: ${this.stats?.defense_ranged}`,this.counterAttacksText.text=`CounterAttacks: ${this.stats?.remaining_counterattacks} / ${this.stats?.num_counterattacks}`)}toggleVisibility(){this.window.visible=!this.window.visible}hide(){this.window.visible=!1}}class yi{constructor(t,e,n,r){this.damageValue=t,this.view=e,this.remainingDurationInMillis=n,this.startingDurationInMillis=n,this.attackNumberText.position=r,this.attackNumberText.text=""+t.toString(),this.view.addChild(this.attackNumberText)}static DEFAULT_FONT_STYLE={style:{fill:{color:"#ff0000",alpha:1},fontSize:24,align:"left"}};static DEFAULT_DURATION_IN_MILLIS=500;attackNumberText=new mt({...yi.DEFAULT_FONT_STYLE,text:this.damageValue});travelDistance={x:10,y:-105};startingDurationInMillis=yi.DEFAULT_DURATION_IN_MILLIS;update(t){t==0||this.startingDurationInMillis==0||(this.remainingDurationInMillis-=t,this.attackNumberText.position.x+=this.travelDistance.x/(this.startingDurationInMillis/t),this.attackNumberText.position.y+=this.travelDistance.y/(this.startingDurationInMillis/t),this.remainingDurationInMillis<=0&&(this.view.removeChild(this.attackNumberText),this.attackNumberText.destroy()))}}class Pp{damageValues=[];addDamageValue(t,e,n){const r=new yi(t,e,yi.DEFAULT_DURATION_IN_MILLIS,n);this.damageValues.push(r)}update(t){this.damageValues.forEach(e=>e.update(t)),this.damageValues=this.damageValues.filter(e=>e.remainingDurationInMillis>0)}}class bi{static DEFAULT_COUNT=100;static DEFAULT_MIN=99999;static DEFAULT_MAX=-1;data=[];last_start=-1;min=bi.DEFAULT_MIN;max=bi.DEFAULT_MAX;constructor(){}}class is{static DEFAULT_FONT_STYLE={style:{fill:{color:"#ffffff",alpha:1},fontSize:14,align:"left"}};detailsText=new mt({...is.DEFAULT_FONT_STYLE,text:""});view;uiSheet;window=new X;windowBg;constructor(){}records={};startMeasure(t){this.records[t]||(this.records[t]=new bi),this.records[t].last_start=window.performance.now()}stopMeasure(t){this.records[t]&&this.records[t].last_start!==-1&&this.records[t].data.push(window.performance.now()-this.records[t].last_start)}update(){const t=Object.keys(this.records);this.detailsText.text="";for(let e of t){this.records[e].data.length>bi.DEFAULT_COUNT&&this.records[e].data.shift();const n=this.records[e].data.reduce((o,a)=>o+a,0)/this.records[e].data.length;this.records[e].min=Math.min(this.records[e].min,this.records[e].data[this.records[e].data.length-1]),this.records[e].max=Math.max(this.records[e].max,this.records[e].data[this.records[e].data.length-1]);const r=Math.min(...this.records[e].data),s=Math.max(...this.records[e].data);this.detailsText.text+=`${e}: ${n.toFixed(3)} ms (abs min: ${this.records[e].min} ms, max: ${this.records[e].max} ms)
`,this.detailsText.text+=`       (recent min: ${r} ms, max: ${s} ms)
`}}show(t,e){if(this.view=t,this.uiSheet=e,this.view.addChild(this.window),this.windowBg||!this.uiSheet)return;this.windowBg=new Et({texture:this.uiSheet?.textures["panel.png"],leftWidth:15,topHeight:15,rightWidth:15,bottomHeight:15}),this.windowBg.width=350,this.windowBg.height=150;const n=new mt({text:"Perf Stats",style:{fill:16777215,fontSize:14}});n.anchor.set(.5),n.x=this.windowBg.width/2,n.y=10,this.window.addChild(this.windowBg),this.window.addChild(n),this.window.x=1300,this.window.y=710,this.detailsText.position={x:10,y:30},this.window.addChild(this.detailsText)}hide(){this.view?.removeChild(this.window)}toggleVisibility(t,e){this.window.parent?this.hide():this.show(t,e)}}class Mp{static async loadJson(t){return await(await fetch(t)).json()}}class we{constructor(t,e,n,r,s,o){if(this.message=t,this.view=e,this.remainingDurationInMillis=n,this.uiSheet=s,this.texture=o,!this.uiSheet)throw new Error("uiSheet is required");this.startingDurationInMillis=n;const a=new Et({texture:this.uiSheet.textures["panel.png"],leftWidth:15,topHeight:15,rightWidth:15,bottomHeight:15});a.width=400,a.height=120,this.window.addChild(a);const l=new Et({texture:this.uiSheet.textures["progress_bg.png"],leftWidth:5,topHeight:5,rightWidth:5,bottomHeight:5});l.width=138,l.height=138,l.position={x:272/2-5,y:75},this.window.addChild(l),this.window.position=r,this.texture&&(this.bannerSprite=new it(this.texture),this.bannerSprite.position={x:272/2,y:80},this.bannerSprite.width=128,this.bannerSprite.height=128,this.window.addChild(this.bannerSprite)),this.turnChangeText.position={x:20,y:20},this.turnChangeText.text=""+t.toString(),this.window.addChild(this.turnChangeText),this.view.addChild(this.window)}static DEFAULT_FONT_STYLE={style:{fill:{color:"#dddd77",alpha:1},fontSize:42,align:"left"}};static DEFAULT_DURATION_IN_MILLIS=750;static END_OF_BATTLE_DURATION_IN_MILLIS=5e3;turnChangeText=new mt({...we.DEFAULT_FONT_STYLE,text:this.message});alpha=1;startingDurationInMillis=we.DEFAULT_DURATION_IN_MILLIS;bannerSprite=void 0;window=new X;update(t){t==0||this.startingDurationInMillis==0||(this.remainingDurationInMillis<.5*this.startingDurationInMillis&&(this.alpha=this.remainingDurationInMillis*2/this.startingDurationInMillis,this.window.alpha=this.alpha),this.remainingDurationInMillis-=t,this.remainingDurationInMillis<=0&&(this.view.removeChild(this.window),this.window.destroy({children:!0})))}}class Fp{damageValues=[];uiSheet;setUISheet(t){this.uiSheet=t}addTurnChange(t,e,n,r){const s=new we(t,e,we.DEFAULT_DURATION_IN_MILLIS,n,this.uiSheet,r);this.damageValues.push(s)}addEndOfBattle(t,e,n,r){const s=new we(t,e,we.END_OF_BATTLE_DURATION_IN_MILLIS,n,this.uiSheet,r);this.damageValues.push(s)}update(t){this.damageValues.forEach(e=>e.update(t)),this.damageValues=this.damageValues.filter(e=>e.remainingDurationInMillis>0)}}class q{constructor(t,e){this.view=t,this.uiSheet=e;const n=new Et({texture:this.uiSheet.textures["panel.png"],leftWidth:15,topHeight:15,rightWidth:15,bottomHeight:15});n.width=1200,n.height=q.DEFAULT_BANNER_SIZE-5,this.window.addChild(n),this.bannerLeftBg=new Et({texture:this.uiSheet.textures["progress_bg.png"],leftWidth:q.DEFAULT_BORDER_SIZE,topHeight:q.DEFAULT_BORDER_SIZE,rightWidth:q.DEFAULT_BORDER_SIZE,bottomHeight:q.DEFAULT_BORDER_SIZE}),this.bannerLeftBg.width=q.DEFAULT_BANNER_SIZE+2*q.DEFAULT_BORDER_SIZE,this.bannerLeftBg.height=q.DEFAULT_BANNER_SIZE+2*q.DEFAULT_BORDER_SIZE,this.bannerLeftBg.position={x:20-q.DEFAULT_BORDER_SIZE,y:0},this.window.addChild(this.bannerLeftBg),this.bannerRightBg=new Et({texture:this.uiSheet.textures["progress_bg.png"],leftWidth:q.DEFAULT_BORDER_SIZE,topHeight:q.DEFAULT_BORDER_SIZE,rightWidth:q.DEFAULT_BORDER_SIZE,bottomHeight:q.DEFAULT_BORDER_SIZE}),this.bannerRightBg.width=q.DEFAULT_BANNER_SIZE+2*q.DEFAULT_BORDER_SIZE,this.bannerRightBg.height=q.DEFAULT_BANNER_SIZE+2*q.DEFAULT_BORDER_SIZE,this.bannerRightBg.position={x:1180-q.DEFAULT_BANNER_SIZE-2*q.DEFAULT_BORDER_SIZE,y:0},this.window.addChild(this.bannerRightBg),this.window.position={x:200,y:-5},this.view.addChild(this.window)}static DEFAULT_FONT_STYLE={style:{fill:{color:"#ffffff",alpha:1},fontSize:16,align:"left"}};static RIGHT_ALIGN_FONT_STYLE={style:{fill:{color:"#ffffff",alpha:1},fontSize:16,align:"left"}};static DEFAULT_BANNER_SIZE=40;static DEFAULT_BORDER_SIZE=4;window=new X;bannerLeft=void 0;bannerRight=void 0;bannerLeftBg=void 0;bannerRightBg=void 0;setActiveArmyIndex(t){t===0?(this.bannerLeftBg&&(this.bannerLeftBg.tint=65280),this.bannerRightBg&&(this.bannerRightBg.tint=16777215),this.bannerRight&&(this.bannerRight.alpha=.5),this.bannerLeft&&(this.bannerLeft.alpha=1)):(this.bannerLeftBg&&(this.bannerLeftBg.tint=16777215),this.bannerRightBg&&(this.bannerRightBg.tint=65280),this.bannerRight&&(this.bannerRight.alpha=1),this.bannerLeft&&(this.bannerLeft.alpha=.5))}setLeftBannerTexture(t){this.bannerLeft&&(this.window.removeChild(this.bannerLeft),this.bannerLeft.destroy(),this.bannerLeft=void 0),t&&(this.bannerLeft=new it(t),this.bannerLeft.position={x:q.DEFAULT_BORDER_SIZE,y:q.DEFAULT_BORDER_SIZE},this.bannerLeftBg&&(this.bannerLeft.x+=this.bannerLeftBg.x,this.bannerLeft.y+=this.bannerLeftBg.y),this.bannerLeft.width=q.DEFAULT_BANNER_SIZE,this.bannerLeft.height=q.DEFAULT_BANNER_SIZE,this.window.addChild(this.bannerLeft))}setLeftArmyName(t){const e=new mt({...q.DEFAULT_FONT_STYLE,text:t});e.position={x:32+q.DEFAULT_BANNER_SIZE,y:8},this.window.addChild(e)}setRightArmyName(t){const e=new mt({...q.RIGHT_ALIGN_FONT_STYLE,text:t});e.position={x:1200-2*32-20-e.width,y:8},this.window.addChild(e)}setRightBannerTexture(t){this.bannerRight&&(this.window.removeChild(this.bannerRight),this.bannerRight.destroy(),this.bannerRight=void 0),t&&(this.bannerRight=new it(t),this.bannerRight.position={x:q.DEFAULT_BORDER_SIZE,y:q.DEFAULT_BORDER_SIZE},this.bannerRightBg&&(this.bannerRight.x+=this.bannerRightBg.x,this.bannerRight.y+=this.bannerRightBg.y),this.bannerRight.width=q.DEFAULT_BANNER_SIZE,this.bannerRight.height=q.DEFAULT_BANNER_SIZE,this.window.addChild(this.bannerRight))}}var nt=`in vec2 aPosition;
out vec2 vTextureCoord;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition( void )
{
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
    
    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0*uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;

    return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord( void )
{
    return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main(void)
{
    gl_Position = filterVertexPosition();
    vTextureCoord = filterTextureCoord();
}
`,rt=`struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

struct VSOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv : vec2<f32>
  };

fn filterVertexPosition(aPosition:vec2<f32>) -> vec4<f32>
{
    var position = aPosition * gfu.uOutputFrame.zw + gfu.uOutputFrame.xy;

    position.x = position.x * (2.0 / gfu.uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0*gfu.uOutputTexture.z / gfu.uOutputTexture.y) - gfu.uOutputTexture.z;

    return vec4(position, 0.0, 1.0);
}

fn filterTextureCoord( aPosition:vec2<f32> ) -> vec2<f32>
{
    return aPosition * (gfu.uOutputFrame.zw * gfu.uInputSize.zw);
}

fn globalTextureCoord( aPosition:vec2<f32> ) -> vec2<f32>
{
  return  (aPosition.xy / gfu.uGlobalFrame.zw) + (gfu.uGlobalFrame.xy / gfu.uGlobalFrame.zw);  
}

fn getSize() -> vec2<f32>
{
  return gfu.uGlobalFrame.zw;
}
  
@vertex
fn mainVertex(
  @location(0) aPosition : vec2<f32>, 
) -> VSOutput {
  return VSOutput(
   filterVertexPosition(aPosition),
   filterTextureCoord(aPosition)
  );
}`,Ip=`in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform float uGamma;
uniform float uContrast;
uniform float uSaturation;
uniform float uBrightness;
uniform vec4 uColor;

void main()
{
    vec4 c = texture(uTexture, vTextureCoord);

    if (c.a > 0.0) {
        c.rgb /= c.a;

        vec3 rgb = pow(c.rgb, vec3(1. / uGamma));
        rgb = mix(vec3(.5), mix(vec3(dot(vec3(.2125, .7154, .0721), rgb)), rgb, uSaturation), uContrast);
        rgb.r *= uColor.r;
        rgb.g *= uColor.g;
        rgb.b *= uColor.b;
        c.rgb = rgb * uBrightness;

        c.rgb *= c.a;
    }

    finalColor = c * uColor.a;
}
`,Op=`struct AdjustmentUniforms {
  uGamma: f32,
  uContrast: f32,
  uSaturation: f32,
  uBrightness: f32,
  uColor: vec4<f32>,
};

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> adjustmentUniforms : AdjustmentUniforms;

@fragment
fn mainFragment(
  @location(0) uv: vec2<f32>,
  @builtin(position) position: vec4<f32>
) -> @location(0) vec4<f32> {
  var sample = textureSample(uTexture, uSampler, uv);
  let color = adjustmentUniforms.uColor;

  if (sample.a > 0.0) 
  {
    sample = vec4<f32>(sample.rgb / sample.a, sample.a);
    var rgb: vec3<f32> = pow(sample.rgb, vec3<f32>(1. / adjustmentUniforms.uGamma));
    rgb = mix(vec3<f32>(.5), mix(vec3<f32>(dot(vec3<f32>(.2125, .7154, .0721), rgb)), rgb, adjustmentUniforms.uSaturation), adjustmentUniforms.uContrast);
    rgb.r *= color.r;
    rgb.g *= color.g;
    rgb.b *= color.b;
    sample = vec4<f32>(rgb.rgb * adjustmentUniforms.uBrightness, sample.a);
    sample = vec4<f32>(sample.rgb * sample.a, sample.a);
  }

  return sample * color.a;
}`,Rp=Object.defineProperty,Ep=(i,t,e)=>t in i?Rp(i,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):i[t]=e,wl=(i,t,e)=>(Ep(i,typeof t!="symbol"?t+"":t,e),e);const Up=class Cl extends Y{constructor(t){t={...Cl.DEFAULT_OPTIONS,...t};const e=W.from({vertex:{source:rt,entryPoint:"mainVertex"},fragment:{source:Op,entryPoint:"mainFragment"}}),n=H.from({vertex:nt,fragment:Ip,name:"adjustment-filter"});super({gpuProgram:e,glProgram:n,resources:{adjustmentUniforms:{uGamma:{value:t.gamma,type:"f32"},uContrast:{value:t.contrast,type:"f32"},uSaturation:{value:t.saturation,type:"f32"},uBrightness:{value:t.brightness,type:"f32"},uColor:{value:[t.red,t.green,t.blue,t.alpha],type:"vec4<f32>"}}}}),wl(this,"uniforms"),this.uniforms=this.resources.adjustmentUniforms.uniforms}get gamma(){return this.uniforms.uGamma}set gamma(t){this.uniforms.uGamma=t}get contrast(){return this.uniforms.uContrast}set contrast(t){this.uniforms.uContrast=t}get saturation(){return this.uniforms.uSaturation}set saturation(t){this.uniforms.uSaturation=t}get brightness(){return this.uniforms.uBrightness}set brightness(t){this.uniforms.uBrightness=t}get red(){return this.uniforms.uColor[0]}set red(t){this.uniforms.uColor[0]=t}get green(){return this.uniforms.uColor[1]}set green(t){this.uniforms.uColor[1]=t}get blue(){return this.uniforms.uColor[2]}set blue(t){this.uniforms.uColor[2]=t}get alpha(){return this.uniforms.uColor[3]}set alpha(t){this.uniforms.uColor[3]=t}};wl(Up,"DEFAULT_OPTIONS",{gamma:1,contrast:1,saturation:1,brightness:1,red:1,green:1,blue:1,alpha:1});var zp=`
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec2 uOffset;

void main(void)
{
    vec4 color = vec4(0.0);

    // Sample top left pixel
    color += texture(uTexture, vec2(vTextureCoord.x - uOffset.x, vTextureCoord.y + uOffset.y));

    // Sample top right pixel
    color += texture(uTexture, vec2(vTextureCoord.x + uOffset.x, vTextureCoord.y + uOffset.y));

    // Sample bottom right pixel
    color += texture(uTexture, vec2(vTextureCoord.x + uOffset.x, vTextureCoord.y - uOffset.y));

    // Sample bottom left pixel
    color += texture(uTexture, vec2(vTextureCoord.x - uOffset.x, vTextureCoord.y - uOffset.y));

    // Average
    color *= 0.25;

    finalColor = color;
}`,kp=`struct KawaseBlurUniforms {
  uOffset:vec2<f32>,
};

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> kawaseBlurUniforms : KawaseBlurUniforms;

@fragment
fn mainFragment(
  @builtin(position) position: vec4<f32>,
  @location(0) uv : vec2<f32>
) -> @location(0) vec4<f32> {
  let uOffset = kawaseBlurUniforms.uOffset;
  var color: vec4<f32> = vec4<f32>(0.0);

  // Sample top left pixel
  color += textureSample(uTexture, uSampler, vec2<f32>(uv.x - uOffset.x, uv.y + uOffset.y));
  // Sample top right pixel
  color += textureSample(uTexture, uSampler, vec2<f32>(uv.x + uOffset.x, uv.y + uOffset.y));
  // Sample bottom right pixel
  color += textureSample(uTexture, uSampler, vec2<f32>(uv.x + uOffset.x, uv.y - uOffset.y));
  // Sample bottom left pixel
  color += textureSample(uTexture, uSampler, vec2<f32>(uv.x - uOffset.x, uv.y - uOffset.y));
  // Average
  color *= 0.25;

  return color;
}`,Lp=`
precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec2 uOffset;

uniform vec4 uInputClamp;

void main(void)
{
    vec4 color = vec4(0.0);

    // Sample top left pixel
    color += texture(uTexture, clamp(vec2(vTextureCoord.x - uOffset.x, vTextureCoord.y + uOffset.y), uInputClamp.xy, uInputClamp.zw));

    // Sample top right pixel
    color += texture(uTexture, clamp(vec2(vTextureCoord.x + uOffset.x, vTextureCoord.y + uOffset.y), uInputClamp.xy, uInputClamp.zw));

    // Sample bottom right pixel
    color += texture(uTexture, clamp(vec2(vTextureCoord.x + uOffset.x, vTextureCoord.y - uOffset.y), uInputClamp.xy, uInputClamp.zw));

    // Sample bottom left pixel
    color += texture(uTexture, clamp(vec2(vTextureCoord.x - uOffset.x, vTextureCoord.y - uOffset.y), uInputClamp.xy, uInputClamp.zw));

    // Average
    color *= 0.25;

    finalColor = color;
}
`,Bp=`struct KawaseBlurUniforms {
  uOffset:vec2<f32>,
};

struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> kawaseBlurUniforms : KawaseBlurUniforms;

@fragment
fn mainFragment(
  @builtin(position) position: vec4<f32>,
  @location(0) uv : vec2<f32>
) -> @location(0) vec4<f32> {
  let uOffset = kawaseBlurUniforms.uOffset;
  var color: vec4<f32> = vec4(0.0);

  // Sample top left pixel
  color += textureSample(uTexture, uSampler, clamp(vec2<f32>(uv.x - uOffset.x, uv.y + uOffset.y), gfu.uInputClamp.xy, gfu.uInputClamp.zw));
  // Sample top right pixel
  color += textureSample(uTexture, uSampler, clamp(vec2<f32>(uv.x + uOffset.x, uv.y + uOffset.y), gfu.uInputClamp.xy, gfu.uInputClamp.zw));
  // Sample bottom right pixel
  color += textureSample(uTexture, uSampler, clamp(vec2<f32>(uv.x + uOffset.x, uv.y - uOffset.y), gfu.uInputClamp.xy, gfu.uInputClamp.zw));
  // Sample bottom left pixel
  color += textureSample(uTexture, uSampler, clamp(vec2<f32>(uv.x - uOffset.x, uv.y - uOffset.y), gfu.uInputClamp.xy, gfu.uInputClamp.zw));
  // Average
  color *= 0.25;
    
  return color;
}`,Dp=Object.defineProperty,Np=(i,t,e)=>t in i?Dp(i,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):i[t]=e,ye=(i,t,e)=>(Np(i,typeof t!="symbol"?t+"":t,e),e);const Tl=class Al extends Y{constructor(...t){let e=t[0]??{};(typeof e=="number"||Array.isArray(e))&&(B("6.0.0","KawaseBlurFilter constructor params are now options object. See params: { strength, quality, clamp, pixelSize }"),e={strength:e},t[1]!==void 0&&(e.quality=t[1]),t[2]!==void 0&&(e.clamp=t[2])),e={...Al.DEFAULT_OPTIONS,...e};const n=W.from({vertex:{source:rt,entryPoint:"mainVertex"},fragment:{source:e?.clamp?Bp:kp,entryPoint:"mainFragment"}}),r=H.from({vertex:nt,fragment:e?.clamp?Lp:zp,name:"kawase-blur-filter"});super({gpuProgram:n,glProgram:r,resources:{kawaseBlurUniforms:{uOffset:{value:new Float32Array(2),type:"vec2<f32>"}}}}),ye(this,"uniforms"),ye(this,"_pixelSize",{x:0,y:0}),ye(this,"_clamp"),ye(this,"_kernels",[]),ye(this,"_blur"),ye(this,"_quality"),this.uniforms=this.resources.kawaseBlurUniforms.uniforms,this.pixelSize=e.pixelSize??{x:1,y:1},Array.isArray(e.strength)?this.kernels=e.strength:typeof e.strength=="number"&&(this._blur=e.strength,this.quality=e.quality??3),this._clamp=!!e.clamp}apply(t,e,n,r){const s=this.pixelSizeX/e.source.width,o=this.pixelSizeY/e.source.height;let a;if(this._quality===1||this._blur===0)a=this._kernels[0]+.5,this.uniforms.uOffset[0]=a*s,this.uniforms.uOffset[1]=a*o,t.applyFilter(this,e,n,r);else{const l=Dt.getSameSizeTexture(e);let u=e,h=l,c;const d=this._quality-1;for(let f=0;f<d;f++)a=this._kernels[f]+.5,this.uniforms.uOffset[0]=a*s,this.uniforms.uOffset[1]=a*o,t.applyFilter(this,u,h,!0),c=u,u=h,h=c;a=this._kernels[d]+.5,this.uniforms.uOffset[0]=a*s,this.uniforms.uOffset[1]=a*o,t.applyFilter(this,u,n,r),Dt.returnTexture(l)}}get strength(){return this._blur}set strength(t){this._blur=t,this._generateKernels()}get quality(){return this._quality}set quality(t){this._quality=Math.max(1,Math.round(t)),this._generateKernels()}get kernels(){return this._kernels}set kernels(t){Array.isArray(t)&&t.length>0?(this._kernels=t,this._quality=t.length,this._blur=Math.max(...t)):(this._kernels=[0],this._quality=1)}get pixelSize(){return this._pixelSize}set pixelSize(t){if(typeof t=="number"){this.pixelSizeX=this.pixelSizeY=t;return}if(Array.isArray(t)){this.pixelSizeX=t[0],this.pixelSizeY=t[1];return}this._pixelSize=t}get pixelSizeX(){return this.pixelSize.x}set pixelSizeX(t){this.pixelSize.x=t}get pixelSizeY(){return this.pixelSize.y}set pixelSizeY(t){this.pixelSize.y=t}get clamp(){return this._clamp}_updatePadding(){this.padding=Math.ceil(this._kernels.reduce((t,e)=>t+e+.5,0))}_generateKernels(){const t=this._blur,e=this._quality,n=[t];if(t>0){let r=t;const s=t/e;for(let o=1;o<e;o++)r-=s,n.push(r)}this._kernels=n,this._updatePadding()}};ye(Tl,"DEFAULT_OPTIONS",{strength:4,quality:3,clamp:!1,pixelSize:{x:1,y:1}});let Pl=Tl;var Gp=`in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform sampler2D uMapTexture;
uniform float uBloomScale;
uniform float uBrightness;

void main() {
    vec4 color = texture(uTexture, vTextureCoord);
    color.rgb *= uBrightness;
    vec4 bloomColor = vec4(texture(uMapTexture, vTextureCoord).rgb, 0.0);
    bloomColor.rgb *= uBloomScale;
    finalColor = color + bloomColor;
}
`,Vp=`struct AdvancedBloomUniforms {
  uBloomScale: f32,
  uBrightness: f32,
};

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> advancedBloomUniforms : AdvancedBloomUniforms;
@group(1) @binding(1) var uMapTexture: texture_2d<f32>;

@fragment
fn mainFragment(
  @builtin(position) position: vec4<f32>,
  @location(0) uv : vec2<f32>
) -> @location(0) vec4<f32> {
  var color = textureSample(uTexture, uSampler, uv);
  color = vec4<f32>(color.rgb * advancedBloomUniforms.uBrightness, color.a);

  var bloomColor = vec4<f32>(textureSample(uMapTexture, uSampler, uv).rgb, 0.0);
  bloomColor = vec4<f32>(bloomColor.rgb * advancedBloomUniforms.uBloomScale, bloomColor.a);
  
  return color + bloomColor;
}
`,Wp=`
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform float uThreshold;

void main() {
    vec4 color = texture(uTexture, vTextureCoord);

    // A simple & fast algorithm for getting brightness.
    // It's inaccuracy , but good enought for this feature.
    float _max = max(max(color.r, color.g), color.b);
    float _min = min(min(color.r, color.g), color.b);
    float brightness = (_max + _min) * 0.5;

    if(brightness > uThreshold) {
        finalColor = color;
    } else {
        finalColor = vec4(0.0, 0.0, 0.0, 0.0);
    }
}
`,$p=`struct ExtractBrightnessUniforms {
  uThreshold: f32,
};

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> extractBrightnessUniforms : ExtractBrightnessUniforms;

@fragment
fn mainFragment(
  @builtin(position) position: vec4<f32>,
  @location(0) uv : vec2<f32>
) -> @location(0) vec4<f32> {
  let color: vec4<f32> = textureSample(uTexture, uSampler, uv);

  // A simple & fast algorithm for getting brightness.
  // It's inaccurate, but good enough for this feature.
  let max: f32 = max(max(color.r, color.g), color.b);
  let min: f32 = min(min(color.r, color.g), color.b);
  let brightness: f32 = (max + min) * 0.5;

  return select(vec4<f32>(0.), color, brightness > extractBrightnessUniforms.uThreshold);
}
`,Hp=Object.defineProperty,Xp=(i,t,e)=>t in i?Hp(i,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):i[t]=e,Ml=(i,t,e)=>(Xp(i,typeof t!="symbol"?t+"":t,e),e);const Fl=class Il extends Y{constructor(t){t={...Il.DEFAULT_OPTIONS,...t};const e=W.from({vertex:{source:rt,entryPoint:"mainVertex"},fragment:{source:$p,entryPoint:"mainFragment"}}),n=H.from({vertex:nt,fragment:Wp,name:"extract-brightness-filter"});super({gpuProgram:e,glProgram:n,resources:{extractBrightnessUniforms:{uThreshold:{value:t.threshold,type:"f32"}}}}),Ml(this,"uniforms"),this.uniforms=this.resources.extractBrightnessUniforms.uniforms}get threshold(){return this.uniforms.uThreshold}set threshold(t){this.uniforms.uThreshold=t}};Ml(Fl,"DEFAULT_OPTIONS",{threshold:.5});let Yp=Fl;var jp=Object.defineProperty,qp=(i,t,e)=>t in i?jp(i,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):i[t]=e,Ee=(i,t,e)=>(qp(i,typeof t!="symbol"?t+"":t,e),e);const Ol=class Rl extends Y{constructor(t){t={...Rl.DEFAULT_OPTIONS,...t};const e=W.from({vertex:{source:rt,entryPoint:"mainVertex"},fragment:{source:Vp,entryPoint:"mainFragment"}}),n=H.from({vertex:nt,fragment:Gp,name:"advanced-bloom-filter"});super({gpuProgram:e,glProgram:n,resources:{advancedBloomUniforms:{uBloomScale:{value:t.bloomScale,type:"f32"},uBrightness:{value:t.brightness,type:"f32"}},uMapTexture:k.WHITE}}),Ee(this,"uniforms"),Ee(this,"bloomScale",1),Ee(this,"brightness",1),Ee(this,"_extractFilter"),Ee(this,"_blurFilter"),this.uniforms=this.resources.advancedBloomUniforms.uniforms,this._extractFilter=new Yp({threshold:t.threshold}),this._blurFilter=new Pl({strength:t.kernels??t.blur,quality:t.kernels?void 0:t.quality}),Object.assign(this,t)}apply(t,e,n,r){const s=Dt.getSameSizeTexture(e);this._extractFilter.apply(t,e,s,!0);const o=Dt.getSameSizeTexture(e);this._blurFilter.apply(t,s,o,!0),this.uniforms.uBloomScale=this.bloomScale,this.uniforms.uBrightness=this.brightness,this.resources.uMapTexture=o.source,t.applyFilter(this,e,n,r),Dt.returnTexture(o),Dt.returnTexture(s)}get threshold(){return this._extractFilter.threshold}set threshold(t){this._extractFilter.threshold=t}get kernels(){return this._blurFilter.kernels}set kernels(t){this._blurFilter.kernels=t}get blur(){return this._blurFilter.strength}set blur(t){this._blurFilter.strength=t}get quality(){return this._blurFilter.quality}set quality(t){this._blurFilter.quality=t}get pixelSize(){return this._blurFilter.pixelSize}set pixelSize(t){typeof t=="number"&&(t={x:t,y:t}),Array.isArray(t)&&(t={x:t[0],y:t[1]}),this._blurFilter.pixelSize=t}get pixelSizeX(){return this._blurFilter.pixelSizeX}set pixelSizeX(t){this._blurFilter.pixelSizeX=t}get pixelSizeY(){return this._blurFilter.pixelSizeY}set pixelSizeY(t){this._blurFilter.pixelSizeY=t}};Ee(Ol,"DEFAULT_OPTIONS",{threshold:.5,bloomScale:1,brightness:1,blur:8,quality:4,pixelSize:{x:1,y:1}});let Kp=Ol;var Zp=`precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform float uSize;
uniform vec3 uColor;
uniform float uReplaceColor;

uniform vec4 uInputSize;

vec2 mapCoord( vec2 coord )
{
    coord *= uInputSize.xy;
    coord += uInputSize.zw;

    return coord;
}

vec2 unmapCoord( vec2 coord )
{
    coord -= uInputSize.zw;
    coord /= uInputSize.xy;

    return coord;
}

vec2 pixelate(vec2 coord, vec2 size)
{
    return floor(coord / size) * size;
}

vec2 getMod(vec2 coord, vec2 size)
{
    return mod(coord, size) / size;
}

float character(float n, vec2 p)
{
    p = floor(p*vec2(4.0, 4.0) + 2.5);

    if (clamp(p.x, 0.0, 4.0) == p.x)
    {
        if (clamp(p.y, 0.0, 4.0) == p.y)
        {
            if (int(mod(n/exp2(p.x + 5.0*p.y), 2.0)) == 1) return 1.0;
        }
    }
    return 0.0;
}

void main()
{
    vec2 coord = mapCoord(vTextureCoord);

    // get the grid position
    vec2 pixCoord = pixelate(coord, vec2(uSize));
    pixCoord = unmapCoord(pixCoord);

    // sample the color at grid position
    vec4 color = texture(uTexture, pixCoord);

    // brightness of the color as it's perceived by the human eye
    float gray = 0.3 * color.r + 0.59 * color.g + 0.11 * color.b;

    // determine the character to use
    float n =  65536.0;             // .
    if (gray > 0.2) n = 65600.0;    // :
    if (gray > 0.3) n = 332772.0;   // *
    if (gray > 0.4) n = 15255086.0; // o
    if (gray > 0.5) n = 23385164.0; // &
    if (gray > 0.6) n = 15252014.0; // 8
    if (gray > 0.7) n = 13199452.0; // @
    if (gray > 0.8) n = 11512810.0; // #

    // get the mod..
    vec2 modd = getMod(coord, vec2(uSize));

    finalColor = (uReplaceColor > 0.5 ? vec4(uColor, 1.) : color) * character( n, vec2(-1.0) + modd * 2.0);
}
`,Qp=`struct AsciiUniforms {
    uSize: f32,
    uColor: vec3<f32>,
    uReplaceColor: f32,
};

struct GlobalFilterUniforms {
    uInputSize:vec4<f32>,
    uInputPixel:vec4<f32>,
    uInputClamp:vec4<f32>,
    uOutputFrame:vec4<f32>,
    uGlobalFrame:vec4<f32>,
    uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> asciiUniforms : AsciiUniforms;

@fragment
fn mainFragment(
    @location(0) uv: vec2<f32>,
    @builtin(position) position: vec4<f32>
) -> @location(0) vec4<f32> {
    let pixelSize: f32 = asciiUniforms.uSize;
    let coord: vec2<f32> = mapCoord(uv);

    // get the rounded color..
    var pixCoord: vec2<f32> = pixelate(coord, vec2<f32>(pixelSize));
    pixCoord = unmapCoord(pixCoord);

    var color = textureSample(uTexture, uSampler, pixCoord);

    // determine the character to use
    let gray: f32 = 0.3 * color.r + 0.59 * color.g + 0.11 * color.b;
    
    var n: f32 = 65536.0; // .
    if (gray > 0.2) {
        n = 65600.0;    // :
    }
    if (gray > 0.3) {
        n = 332772.0;   // *
    }
    if (gray > 0.4) {
        n = 15255086.0; // o
    }
    if (gray > 0.5) {
        n = 23385164.0; // &
    }
    if (gray > 0.6) {
        n = 15252014.0; // 8
    }
    if (gray > 0.7) {
        n = 13199452.0; // @
    }
    if (gray > 0.8) {
        n = 11512810.0; // #
    }

    // get the mod..
    let modd: vec2<f32> = getMod(coord, vec2<f32>(pixelSize));
    return select(color, vec4<f32>(asciiUniforms.uColor, 1.), asciiUniforms.uReplaceColor > 0.5) * character(n, vec2<f32>(-1.0) + modd * 2.0);
}

fn pixelate(coord: vec2<f32>, size: vec2<f32>) -> vec2<f32>
{
    return floor( coord / size ) * size;
}

fn getMod(coord: vec2<f32>, size: vec2<f32>) -> vec2<f32>
{
    return moduloVec2( coord , size) / size;
}

fn character(n: f32, p: vec2<f32>) -> f32
{
    var q: vec2<f32> = floor(p*vec2<f32>(4.0, 4.0) + 2.5);

    if (clamp(q.x, 0.0, 4.0) == q.x)
    {
        if (clamp(q.y, 0.0, 4.0) == q.y)
        {
        if (i32(modulo(n/exp2(q.x + 5.0*q.y), 2.0)) == 1)
        {
            return 1.0;
        }
        }
    }

    return 0.0;
}

fn modulo(x: f32, y: f32) -> f32
{
  return x - y * floor(x/y);
}

fn moduloVec2(x: vec2<f32>, y: vec2<f32>) -> vec2<f32>
{
  return x - y * floor(x/y);
}

fn mapCoord(coord: vec2<f32> ) -> vec2<f32>
{
    var mappedCoord: vec2<f32> = coord;
    mappedCoord *= gfu.uInputSize.xy;
    mappedCoord += gfu.uOutputFrame.xy;
    return mappedCoord;
}

fn unmapCoord(coord: vec2<f32> ) -> vec2<f32>
{
    var mappedCoord: vec2<f32> = coord;
    mappedCoord -= gfu.uOutputFrame.xy;
    mappedCoord /= gfu.uInputSize.xy;
    return mappedCoord;
}`,Jp=Object.defineProperty,tm=(i,t,e)=>t in i?Jp(i,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):i[t]=e,Pr=(i,t,e)=>(tm(i,typeof t!="symbol"?t+"":t,e),e);const em=class El extends Y{constructor(...t){let e=t[0]??{};typeof e=="number"&&(B("6.0.0","AsciiFilter constructor params are now options object. See params: { size, color, replaceColor }"),e={size:e});const n=e?.color&&e.replaceColor!==!1;e={...El.DEFAULT_OPTIONS,...e};const r=W.from({vertex:{source:rt,entryPoint:"mainVertex"},fragment:{source:Qp,entryPoint:"mainFragment"}}),s=H.from({vertex:nt,fragment:Zp,name:"ascii-filter"});super({gpuProgram:r,glProgram:s,resources:{asciiUniforms:{uSize:{value:e.size,type:"f32"},uColor:{value:new Float32Array(3),type:"vec3<f32>"},uReplaceColor:{value:Number(n),type:"f32"}}}}),Pr(this,"uniforms"),Pr(this,"_color"),this.uniforms=this.resources.asciiUniforms.uniforms,this._color=new K,this.color=e.color??16777215}get size(){return this.uniforms.uSize}set size(t){this.uniforms.uSize=t}get color(){return this._color.value}set color(t){this._color.setValue(t);const[e,n,r]=this._color.toArray();this.uniforms.uColor[0]=e,this.uniforms.uColor[1]=n,this.uniforms.uColor[2]=r}get replaceColor(){return this.uniforms.uReplaceColor>.5}set replaceColor(t){this.uniforms.uReplaceColor=t?1:0}};Pr(em,"DEFAULT_OPTIONS",{size:8,color:16777215,replaceColor:!1});var im=`precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec2 uTransform;
uniform vec3 uLightColor;
uniform float uLightAlpha;
uniform vec3 uShadowColor;
uniform float uShadowAlpha;

uniform vec4 uInputSize;

void main(void) {
    vec2 transform = vec2(1.0 / uInputSize) * vec2(uTransform.x, uTransform.y);
    vec4 color = texture(uTexture, vTextureCoord);
    float light = texture(uTexture, vTextureCoord - transform).a;
    float shadow = texture(uTexture, vTextureCoord + transform).a;

    color.rgb = mix(color.rgb, uLightColor, clamp((color.a - light) * uLightAlpha, 0.0, 1.0));
    color.rgb = mix(color.rgb, uShadowColor, clamp((color.a - shadow) * uShadowAlpha, 0.0, 1.0));
    finalColor = vec4(color.rgb * color.a, color.a);
}
`,nm=`struct BevelUniforms {
  uLightColor: vec3<f32>,
  uLightAlpha: f32,
  uShadowColor: vec3<f32>,
  uShadowAlpha: f32,
  uTransform: vec2<f32>,
};

struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> bevelUniforms : BevelUniforms;

@fragment
fn mainFragment(
  @builtin(position) position: vec4<f32>,
  @location(0) uv : vec2<f32>
) -> @location(0) vec4<f32> {
  let transform = vec2<f32>(1.0 / gfu.uInputSize.xy) * vec2<f32>(bevelUniforms.uTransform.x, bevelUniforms.uTransform.y);
  var color: vec4<f32> = textureSample(uTexture, uSampler, uv);
  let lightSample: f32 = textureSample(uTexture, uSampler, uv - transform).a;
  let shadowSample: f32 = textureSample(uTexture, uSampler, uv + transform).a;

  let light = vec4<f32>(bevelUniforms.uLightColor, bevelUniforms.uLightAlpha);
  let shadow = vec4<f32>(bevelUniforms.uShadowColor, bevelUniforms.uShadowAlpha);

  color = vec4<f32>(mix(color.rgb, light.rgb, clamp((color.a - lightSample) * light.a, 0.0, 1.0)), color.a);
  color = vec4<f32>(mix(color.rgb, shadow.rgb, clamp((color.a - shadowSample) * shadow.a, 0.0, 1.0)), color.a);
  
  return vec4<f32>(color.rgb * color.a, color.a);
}`,rm=Object.defineProperty,sm=(i,t,e)=>t in i?rm(i,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):i[t]=e,Ue=(i,t,e)=>(sm(i,typeof t!="symbol"?t+"":t,e),e);const om=class Ul extends Y{constructor(t){t={...Ul.DEFAULT_OPTIONS,...t};const e=W.from({vertex:{source:rt,entryPoint:"mainVertex"},fragment:{source:nm,entryPoint:"mainFragment"}}),n=H.from({vertex:nt,fragment:im,name:"bevel-filter"});super({gpuProgram:e,glProgram:n,resources:{bevelUniforms:{uLightColor:{value:new Float32Array(3),type:"vec3<f32>"},uLightAlpha:{value:t.lightAlpha,type:"f32"},uShadowColor:{value:new Float32Array(3),type:"vec3<f32>"},uShadowAlpha:{value:t.shadowAlpha,type:"f32"},uTransform:{value:new Float32Array(2),type:"vec2<f32>"}}},padding:1}),Ue(this,"uniforms"),Ue(this,"_thickness"),Ue(this,"_rotation"),Ue(this,"_lightColor"),Ue(this,"_shadowColor"),this.uniforms=this.resources.bevelUniforms.uniforms,this._lightColor=new K,this._shadowColor=new K,this.lightColor=t.lightColor??16777215,this.shadowColor=t.shadowColor??0,Object.assign(this,t)}get rotation(){return this._rotation/Ve}set rotation(t){this._rotation=t*Ve,this._updateTransform()}get thickness(){return this._thickness}set thickness(t){this._thickness=t,this._updateTransform()}get lightColor(){return this._lightColor.value}set lightColor(t){this._lightColor.setValue(t);const[e,n,r]=this._lightColor.toArray();this.uniforms.uLightColor[0]=e,this.uniforms.uLightColor[1]=n,this.uniforms.uLightColor[2]=r}get lightAlpha(){return this.uniforms.uLightAlpha}set lightAlpha(t){this.uniforms.uLightAlpha=t}get shadowColor(){return this._shadowColor.value}set shadowColor(t){this._shadowColor.setValue(t);const[e,n,r]=this._shadowColor.toArray();this.uniforms.uShadowColor[0]=e,this.uniforms.uShadowColor[1]=n,this.uniforms.uShadowColor[2]=r}get shadowAlpha(){return this.uniforms.uShadowAlpha}set shadowAlpha(t){this.uniforms.uShadowAlpha=t}_updateTransform(){this.uniforms.uTransform[0]=this.thickness*Math.cos(this._rotation),this.uniforms.uTransform[1]=this.thickness*Math.sin(this._rotation)}};Ue(om,"DEFAULT_OPTIONS",{rotation:45,thickness:2,lightColor:16777215,lightAlpha:.7,shadowColor:0,shadowAlpha:.7});var am=Object.defineProperty,lm=(i,t,e)=>t in i?am(i,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):i[t]=e,ji=(i,t,e)=>(lm(i,typeof t!="symbol"?t+"":t,e),e);const um=class zl extends kd{constructor(...t){let e=t[0]??{};if(typeof e=="number"||Array.isArray(e)||"x"in e&&"y"in e){B("6.0.0","BloomFilter constructor params are now options object. See params: { strength, quality, resolution, kernelSize }");let n=e;Array.isArray(n)&&(n={x:n[0],y:n[1]}),e={strength:n},t[1]!==void 0&&(e.quality=t[1]),t[2]!==void 0&&(e.resolution=t[2]),t[3]!==void 0&&(e.kernelSize=t[3])}e={...zl.DEFAULT_OPTIONS,...e},super(),ji(this,"_blurXFilter"),ji(this,"_blurYFilter"),ji(this,"_strength"),this._strength={x:2,y:2},e.strength&&(typeof e.strength=="number"?(this._strength.x=e.strength,this._strength.y=e.strength):(this._strength.x=e.strength.x,this._strength.y=e.strength.y)),this._blurXFilter=new wo({...e,horizontal:!0,strength:this.strengthX}),this._blurYFilter=new wo({...e,horizontal:!1,strength:this.strengthY}),this._blurYFilter.blendMode="screen",Object.assign(this,e)}apply(t,e,n,r){const s=Dt.getSameSizeTexture(e);t.applyFilter(this,e,n,r),this._blurXFilter.apply(t,e,s,!0),this._blurYFilter.apply(t,s,n,!1),Dt.returnTexture(s)}get strength(){return this._strength}set strength(t){this._strength=typeof t=="number"?{x:t,y:t}:t,this._updateStrength()}get strengthX(){return this.strength.x}set strengthX(t){this.strength.x=t,this._updateStrength()}get strengthY(){return this.strength.y}set strengthY(t){this.strength.y=t,this._updateStrength()}_updateStrength(){this._blurXFilter.blur=this.strengthX,this._blurYFilter.blur=this.strengthY}get blur(){return B("6.0.0","BloomFilter.blur is deprecated, please use BloomFilter.strength instead"),this.strengthX}set blur(t){B("6.0.0","BloomFilter.blur is deprecated, please use BloomFilter.strength instead"),this.strength=t}get blurX(){return B("6.0.0","BloomFilter.blurX is deprecated, please use BloomFilter.strengthX instead"),this.strengthX}set blurX(t){B("6.0.0","BloomFilter.blurX is deprecated, please use BloomFilter.strengthX instead"),this.strengthX=t}get blurY(){return B("6.0.0","BloomFilter.blurY is deprecated, please use BloomFilter.strengthY instead"),this.strengthY}set blurY(t){B("6.0.0","BloomFilter.blurY is deprecated, please use BloomFilter.strengthY instead"),this.strengthY=t}};ji(um,"DEFAULT_OPTIONS",{strength:{x:2,y:2},quality:4,resolution:1,kernelSize:5});var hm=`precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec2 uDimensions;
uniform vec2 uCenter;
uniform float uRadius;
uniform float uStrength;

uniform vec4 uInputSize;
uniform vec4 uInputClamp;

void main()
{
    vec2 coord = vTextureCoord * uInputSize.xy;
    coord -= uCenter * uDimensions.xy;
    float distance = length(coord);

    if (distance < uRadius) {
        float percent = distance / uRadius;
        if (uStrength > 0.0) {
            coord *= mix(1.0, smoothstep(0.0, uRadius / distance, percent), uStrength * 0.75);
        } else {
            coord *= mix(1.0, pow(percent, 1.0 + uStrength * 0.75) * uRadius / distance, 1.0 - percent);
        }
    }

    coord += uCenter * uDimensions.xy;
    coord /= uInputSize.xy;
    vec2 clampedCoord = clamp(coord, uInputClamp.xy, uInputClamp.zw);
    vec4 color = texture(uTexture, clampedCoord);

    if (coord != clampedCoord) {
        color *= max(0.0, 1.0 - length(coord - clampedCoord));
    }

    finalColor = color;
}
`,cm=`struct BulgePinchUniforms {
  uDimensions: vec2<f32>,
  uCenter: vec2<f32>,
  uRadius: f32,
  uStrength: f32,
};

struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> bulgePinchUniforms : BulgePinchUniforms;

@fragment
fn mainFragment(
  @builtin(position) position: vec4<f32>,
  @location(0) uv : vec2<f32>
) -> @location(0) vec4<f32> {
  let dimensions: vec2<f32> = bulgePinchUniforms.uDimensions;
  let center: vec2<f32> = bulgePinchUniforms.uCenter;
  let radius: f32 = bulgePinchUniforms.uRadius;
  let strength: f32 = bulgePinchUniforms.uStrength;
  var coord: vec2<f32> = (uv * gfu.uInputSize.xy) - center * dimensions.xy;

  let distance: f32 = length(coord);

  if (distance < radius) {
      let percent: f32 = distance / radius;
      if (strength > 0.0) {
          coord *= mix(1.0, smoothstep(0.0, radius / distance, percent), strength * 0.75);
      } else {
          coord *= mix(1.0, pow(percent, 1.0 + strength * 0.75) * radius / distance, 1.0 - percent);
      }
  }
    coord += (center * dimensions.xy);
    coord /= gfu.uInputSize.xy;

    let clampedCoord: vec2<f32> = clamp(coord, gfu.uInputClamp.xy, gfu.uInputClamp.zw);
    var color: vec4<f32> = textureSample(uTexture, uSampler, clampedCoord);
    if (coord.x != clampedCoord.x && coord.y != clampedCoord.y) {
        color *= max(0.0, 1.0 - length(coord - clampedCoord));
    }

    return color;
}

fn compareVec2(x: vec2<f32>, y: vec2<f32>) -> bool
{
  if (x.x == y.x && x.y == y.y)
  {
    return true;
  }

  return false;
}`,fm=Object.defineProperty,dm=(i,t,e)=>t in i?fm(i,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):i[t]=e,kl=(i,t,e)=>(dm(i,typeof t!="symbol"?t+"":t,e),e);const pm=class Ll extends Y{constructor(t){t={...Ll.DEFAULT_OPTIONS,...t};const e=W.from({vertex:{source:rt,entryPoint:"mainVertex"},fragment:{source:cm,entryPoint:"mainFragment"}}),n=H.from({vertex:nt,fragment:hm,name:"bulge-pinch-filter"});super({gpuProgram:e,glProgram:n,resources:{bulgePinchUniforms:{uDimensions:{value:[0,0],type:"vec2<f32>"},uCenter:{value:t.center,type:"vec2<f32>"},uRadius:{value:t.radius,type:"f32"},uStrength:{value:t.strength,type:"f32"}}}}),kl(this,"uniforms"),this.uniforms=this.resources.bulgePinchUniforms.uniforms,Object.assign(this,t)}apply(t,e,n,r){this.uniforms.uDimensions[0]=e.frame.width,this.uniforms.uDimensions[1]=e.frame.height,t.applyFilter(this,e,n,r)}get center(){return this.uniforms.uCenter}set center(t){typeof t=="number"&&(t={x:t,y:t}),Array.isArray(t)&&(t={x:t[0],y:t[1]}),this.uniforms.uCenter=t}get centerX(){return this.uniforms.uCenter.x}set centerX(t){this.uniforms.uCenter.x=t}get centerY(){return this.uniforms.uCenter.y}set centerY(t){this.uniforms.uCenter.y=t}get radius(){return this.uniforms.uRadius}set radius(t){this.uniforms.uRadius=t}get strength(){return this.uniforms.uStrength}set strength(t){this.uniforms.uStrength=t}};kl(pm,"DEFAULT_OPTIONS",{center:{x:.5,y:.5},radius:100,strength:1});var mm=`precision highp float;
in vec2 vTextureCoord;
in vec2 vFilterCoord;
out vec4 finalColor;

const int TYPE_LINEAR = 0;
const int TYPE_RADIAL = 1;
const int TYPE_CONIC = 2;
const int MAX_STOPS = 32;

uniform sampler2D uTexture;
uniform vec4 uOptions;
uniform vec2 uCounts;
uniform vec3 uColors[MAX_STOPS];
uniform vec4 uStops[MAX_STOPS];

const float PI = 3.1415926538;
const float PI_2 = PI*2.;

struct ColorStop {
    float offset;
    vec3 color;
    float alpha;
};

mat2 rotate2d(float angle){
    return mat2(cos(angle), -sin(angle),
    sin(angle), cos(angle));
}

float projectLinearPosition(vec2 pos, float angle){
    vec2 center = vec2(0.5);
    vec2 result = pos - center;
    result = rotate2d(angle) * result;
    result = result + center;
    return clamp(result.x, 0., 1.);
}

float projectRadialPosition(vec2 pos) {
    float r = distance(pos, vec2(0.5));
    return clamp(2.*r, 0., 1.);
}

float projectAnglePosition(vec2 pos, float angle) {
    vec2 center = pos - vec2(0.5);
    float polarAngle=atan(-center.y, center.x);
    return mod(polarAngle + angle, PI_2) / PI_2;
}

float projectPosition(vec2 pos, int type, float angle) {
    if (type == TYPE_LINEAR) {
        return projectLinearPosition(pos, angle);
    } else if (type == TYPE_RADIAL) {
        return projectRadialPosition(pos);
    } else if (type == TYPE_CONIC) {
        return projectAnglePosition(pos, angle);
    }

    return pos.y;
}

void main(void) {
    int uType = int(uOptions[0]);
    float uAngle = uOptions[1];
    float uAlpha = uOptions[2];
    float uReplace = uOptions[3];

    int uNumStops = int(uCounts[0]);
    float uMaxColors = uCounts[1];

    // current/original color
    vec4 currentColor = texture(uTexture, vTextureCoord);

    // skip calculations if gradient alpha is 0
    if (0.0 == uAlpha) {
        finalColor = currentColor;
        return;
    }

    // project position
    float y = projectPosition(vFilterCoord, int(uType), radians(uAngle));

    // check gradient bounds
    float offsetMin = uStops[0][0];
    float offsetMax = 0.0;

    int numStops = int(uNumStops);

    for (int i = 0; i < MAX_STOPS; i++) {
        if (i == numStops-1){ // last index
            offsetMax = uStops[i][0];
        }
    }

    if (y  < offsetMin || y > offsetMax) {
        finalColor = currentColor;
        return;
    }

    // limit colors
    if (uMaxColors > 0.) {
        float stepSize = 1./uMaxColors;
        float stepNumber = float(floor(y/stepSize));
        y = stepSize * (stepNumber + 0.5);// offset by 0.5 to use color from middle of segment
    }

    // find color stops
    ColorStop from;
    ColorStop to;

    for (int i = 0; i < MAX_STOPS; i++) {
        if (y >= uStops[i][0]) {
            from = ColorStop(uStops[i][0], uColors[i], uStops[i][1]);
            to = ColorStop(uStops[i+1][0], uColors[i+1], uStops[i+1][1]);
        }

        if (i == numStops-1){ // last index
            break;
        }
    }

    // mix colors from stops
    vec4 colorFrom = vec4(from.color * from.alpha, from.alpha);
    vec4 colorTo = vec4(to.color * to.alpha, to.alpha);

    float segmentHeight = to.offset - from.offset;
    float relativePos = y - from.offset;// position from 0 to [segmentHeight]
    float relativePercent = relativePos / segmentHeight;// position in percent between [from.offset] and [to.offset].

    float gradientAlpha = uAlpha * currentColor.a;
    vec4 gradientColor = mix(colorFrom, colorTo, relativePercent) * gradientAlpha;

    if (uReplace < 0.5) {
        // mix resulting color with current color
        finalColor = gradientColor + currentColor*(1.-gradientColor.a);
    } else {
        // replace with gradient color
        finalColor = gradientColor;
    }
}
`,gm=`in vec2 aPosition;
out vec2 vTextureCoord;
out vec2 vFilterCoord;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition( void )
{
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
    
    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0*uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;

    return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord( void )
{
    return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main(void)
{
    gl_Position = filterVertexPosition();
    vTextureCoord = filterTextureCoord();
    vFilterCoord = vTextureCoord * uInputSize.xy / uOutputFrame.zw;
}
`,ko=`struct BaseUniforms {
  uOptions: vec4<f32>,
  uCounts: vec2<f32>,
};

struct StopsUniforms {
  uColors: array<vec3<f32>, MAX_STOPS>,
  uStops: array<vec4<f32>, MAX_STOPS>,
};

struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> baseUniforms : BaseUniforms;
@group(1) @binding(1) var<uniform> stopsUniforms : StopsUniforms;

struct VSOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv : vec2<f32>,
  @location(1) coord : vec2<f32>
};

fn filterVertexPosition(aPosition:vec2<f32>) -> vec4<f32>
{
    var position = aPosition * gfu.uOutputFrame.zw + gfu.uOutputFrame.xy;

    position.x = position.x * (2.0 / gfu.uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0*gfu.uOutputTexture.z / gfu.uOutputTexture.y) - gfu.uOutputTexture.z;

    return vec4(position, 0.0, 1.0);
}

fn filterTextureCoord( aPosition:vec2<f32> ) -> vec2<f32>
{
    return aPosition * (gfu.uOutputFrame.zw * gfu.uInputSize.zw);
}

fn filterCoord( vTextureCoord:vec2<f32> ) -> vec2<f32>
{
    return vTextureCoord * gfu.uInputSize.xy / gfu.uOutputFrame.zw;
}

fn globalTextureCoord( aPosition:vec2<f32> ) -> vec2<f32>
{
  return  (aPosition.xy / gfu.uGlobalFrame.zw) + (gfu.uGlobalFrame.xy / gfu.uGlobalFrame.zw);  
}

fn getSize() -> vec2<f32>
{
  return gfu.uGlobalFrame.zw;
}
  
@vertex
fn mainVertex(
  @location(0) aPosition : vec2<f32>, 
) -> VSOutput {
  let vTextureCoord: vec2<f32> = filterTextureCoord(aPosition);
  return VSOutput(
   filterVertexPosition(aPosition),
   vTextureCoord,
   filterCoord(vTextureCoord),
  );
}

struct ColorStop {
  offset: f32,
  color: vec3<f32>,
  alpha: f32,
};

fn rotate2d(angle: f32) -> mat2x2<f32>{
  return mat2x2(cos(angle), -sin(angle),
  sin(angle), cos(angle));
}

fn projectLinearPosition(pos: vec2<f32>, angle: f32) -> f32 {
  var center: vec2<f32> = vec2<f32>(0.5);
  var result: vec2<f32> = pos - center;
  result = rotate2d(angle) * result;
  result = result + center;
  return clamp(result.x, 0.0, 1.0);
}

fn projectRadialPosition(pos: vec2<f32>) -> f32 {
  var r: f32 = distance(pos, vec2<f32>(0.5));
  return clamp(2.0 * r, 0.0, 1.0);
}

fn projectAnglePosition(pos: vec2<f32>, angle: f32) -> f32 {
  var center: vec2<f32> = pos - vec2<f32>(0.5, 0.5);
  var polarAngle: f32 = atan2(-center.y, center.x);
  return ((polarAngle + angle) % PI_2) / PI_2;
}

fn projectPosition(pos: vec2<f32>, gradientType: i32, angle: f32) -> f32 {
  if (gradientType == TYPE_LINEAR) {
      return projectLinearPosition(pos, angle);
  } else if (gradientType == TYPE_RADIAL) {
      return projectRadialPosition(pos);
  } else if (gradientType == TYPE_CONIC) {
      return projectAnglePosition(pos, angle);
  }

  return pos.y;
}

@fragment
fn mainFragment(
  @builtin(position) position: vec4<f32>,
  @location(0) uv : vec2<f32>,
  @location(1) coord : vec2<f32>
) -> @location(0) vec4<f32> {
  let uType: i32 = i32(baseUniforms.uOptions[0]);
  let uAngle: f32 = baseUniforms.uOptions[1];
  let uAlpha: f32 = baseUniforms.uOptions[2];
  let uReplace: f32 = baseUniforms.uOptions[3];

  let uNumStops: i32 = i32(baseUniforms.uCounts[0]);
  let uMaxColors: f32 = baseUniforms.uCounts[1];

  // current/original color
  var currentColor: vec4<f32> = textureSample(uTexture, uSampler, uv);

  // skip calculations if gradient alpha is 0
  if (uAlpha == 0.0) { return currentColor; }

  // project position
  var y: f32 = projectPosition(coord, uType, radians(uAngle));

  // check gradient bounds
  var offsetMin: f32 = stopsUniforms.uStops[0][0];
  var offsetMax: f32 = 0.0;

  let numStops: i32 = uNumStops;

  for (var i: i32 = 0; i < MAX_STOPS; i = i + 1) {
      if (i == numStops - 1) { // last index
          offsetMax = stopsUniforms.uStops[i][0];
      }
  }

  if (y  < offsetMin || y > offsetMax) { return currentColor; }

  // limit colors
  if (uMaxColors > 0.0) {
      var stepSize: f32 = 1.0 / uMaxColors;
      var stepNumber: f32 = floor(y / stepSize);
      y = stepSize * (stepNumber + 0.5); // offset by 0.5 to use color from middle of segment
  }

  // find color stops
  var stopFrom: ColorStop;
  var stopTo: ColorStop;

  for (var i: i32 = 0; i < MAX_STOPS; i = i + 1) {
      if (y >= stopsUniforms.uStops[i][0]) {
          stopFrom = ColorStop(stopsUniforms.uStops[i][0], stopsUniforms.uColors[i], stopsUniforms.uStops[i][1]);
          stopTo = ColorStop(stopsUniforms.uStops[i + 1][0], stopsUniforms.uColors[i + 1], stopsUniforms.uStops[i + 1][1]);
      }

      if (i == numStops - 1) { // last index
          break;
      }
  }

  // mix colors from stops
  var colorFrom: vec4<f32> = vec4<f32>(stopFrom.color * stopFrom.alpha, stopFrom.alpha);
  var colorTo: vec4<f32> = vec4<f32>(stopTo.color * stopTo.alpha, stopTo.alpha);

  var segmentHeight: f32 = stopTo.offset - stopFrom.offset;
  var relativePos: f32 = y - stopFrom.offset; // position from 0 to [segmentHeight]
  var relativePercent: f32 = relativePos / segmentHeight; // position in percent between [from.offset] and [to.offset].

  var gradientAlpha: f32 = uAlpha * currentColor.a;
  var gradientColor: vec4<f32> = mix(colorFrom, colorTo, relativePercent) * gradientAlpha;

  if (uReplace < 0.5) {
      // mix resulting color with current color
      return gradientColor + currentColor * (1.0 - gradientColor.a);
  } else {
      // replace with gradient color
      return gradientColor;
  }
}

const PI: f32 = 3.14159265358979323846264;
const PI_2: f32 = PI * 2.0;

const TYPE_LINEAR: i32 = 0;
const TYPE_RADIAL: i32 = 1;
const TYPE_CONIC: i32 = 2;
const MAX_STOPS: i32 = 32;`,Pe=Pe||{};Pe.stringify=function(){var i={"visit_linear-gradient":function(t){return i.visit_gradient(t)},"visit_repeating-linear-gradient":function(t){return i.visit_gradient(t)},"visit_radial-gradient":function(t){return i.visit_gradient(t)},"visit_repeating-radial-gradient":function(t){return i.visit_gradient(t)},visit_gradient:function(t){var e=i.visit(t.orientation);return e&&(e+=", "),t.type+"("+e+i.visit(t.colorStops)+")"},visit_shape:function(t){var e=t.value,n=i.visit(t.at),r=i.visit(t.style);return r&&(e+=" "+r),n&&(e+=" at "+n),e},"visit_default-radial":function(t){var e="",n=i.visit(t.at);return n&&(e+=n),e},"visit_extent-keyword":function(t){var e=t.value,n=i.visit(t.at);return n&&(e+=" at "+n),e},"visit_position-keyword":function(t){return t.value},visit_position:function(t){return i.visit(t.value.x)+" "+i.visit(t.value.y)},"visit_%":function(t){return t.value+"%"},visit_em:function(t){return t.value+"em"},visit_px:function(t){return t.value+"px"},visit_literal:function(t){return i.visit_color(t.value,t)},visit_hex:function(t){return i.visit_color("#"+t.value,t)},visit_rgb:function(t){return i.visit_color("rgb("+t.value.join(", ")+")",t)},visit_rgba:function(t){return i.visit_color("rgba("+t.value.join(", ")+")",t)},visit_color:function(t,e){var n=t,r=i.visit(e.length);return r&&(n+=" "+r),n},visit_angular:function(t){return t.value+"deg"},visit_directional:function(t){return"to "+t.value},visit_array:function(t){var e="",n=t.length;return t.forEach(function(r,s){e+=i.visit(r),s<n-1&&(e+=", ")}),e},visit:function(t){if(!t)return"";var e="";if(t instanceof Array)return i.visit_array(t,e);if(t.type){var n=i["visit_"+t.type];if(n)return n(t);throw Error("Missing visitor visit_"+t.type)}else throw Error("Invalid node.")}};return function(t){return i.visit(t)}}();var Pe=Pe||{};Pe.parse=function(){var i={linearGradient:/^(\-(webkit|o|ms|moz)\-)?(linear\-gradient)/i,repeatingLinearGradient:/^(\-(webkit|o|ms|moz)\-)?(repeating\-linear\-gradient)/i,radialGradient:/^(\-(webkit|o|ms|moz)\-)?(radial\-gradient)/i,repeatingRadialGradient:/^(\-(webkit|o|ms|moz)\-)?(repeating\-radial\-gradient)/i,sideOrCorner:/^to (left (top|bottom)|right (top|bottom)|left|right|top|bottom)/i,extentKeywords:/^(closest\-side|closest\-corner|farthest\-side|farthest\-corner|contain|cover)/,positionKeywords:/^(left|center|right|top|bottom)/i,pixelValue:/^(-?(([0-9]*\.[0-9]+)|([0-9]+\.?)))px/,percentageValue:/^(-?(([0-9]*\.[0-9]+)|([0-9]+\.?)))\%/,emValue:/^(-?(([0-9]*\.[0-9]+)|([0-9]+\.?)))em/,angleValue:/^(-?(([0-9]*\.[0-9]+)|([0-9]+\.?)))deg/,startCall:/^\(/,endCall:/^\)/,comma:/^,/,hexColor:/^\#([0-9a-fA-F]+)/,literalColor:/^([a-zA-Z]+)/,rgbColor:/^rgb/i,rgbaColor:/^rgba/i,number:/^(([0-9]*\.[0-9]+)|([0-9]+\.?))/},t="";function e(m){var _=new Error(t+": "+m);throw _.source=t,_}function n(){var m=r();return t.length>0&&e("Invalid input not EOF"),m}function r(){return w(s)}function s(){return o("linear-gradient",i.linearGradient,l)||o("repeating-linear-gradient",i.repeatingLinearGradient,l)||o("radial-gradient",i.radialGradient,c)||o("repeating-radial-gradient",i.repeatingRadialGradient,c)}function o(m,_,b){return a(_,function(C){var P=b();return P&&(wt(i.comma)||e("Missing comma before color stops")),{type:m,orientation:P,colorStops:w(T)}})}function a(m,_){var b=wt(m);if(b){wt(i.startCall)||e("Missing (");var C=_(b);return wt(i.endCall)||e("Missing )"),C}}function l(){return u()||h()}function u(){return tt("directional",i.sideOrCorner,1)}function h(){return tt("angular",i.angleValue,1)}function c(){var m,_=d(),b;return _&&(m=[],m.push(_),b=t,wt(i.comma)&&(_=d(),_?m.push(_):t=b)),m}function d(){var m=f()||x();if(m)m.at=g();else{var _=v();if(_){m=_;var b=g();b&&(m.at=b)}else{var C=y();C&&(m={type:"default-radial",at:C})}}return m}function f(){var m=tt("shape",/^(circle)/i,0);return m&&(m.style=J()||v()),m}function x(){var m=tt("shape",/^(ellipse)/i,0);return m&&(m.style=E()||v()),m}function v(){return tt("extent-keyword",i.extentKeywords,1)}function g(){if(tt("position",/^at/,0)){var m=y();return m||e("Missing positioning value"),m}}function y(){var m=S();if(m.x||m.y)return{type:"position",value:m}}function S(){return{x:E(),y:E()}}function w(m){var _=m(),b=[];if(_)for(b.push(_);wt(i.comma);)_=m(),_?b.push(_):e("One extra comma");return b}function T(){var m=I();return m||e("Expected color definition"),m.length=E(),m}function I(){return M()||G()||D()||A()}function A(){return tt("literal",i.literalColor,0)}function M(){return tt("hex",i.hexColor,1)}function D(){return a(i.rgbColor,function(){return{type:"rgb",value:w(R)}})}function G(){return a(i.rgbaColor,function(){return{type:"rgba",value:w(R)}})}function R(){return wt(i.number)[1]}function E(){return tt("%",i.percentageValue,1)||ut()||J()}function ut(){return tt("position-keyword",i.positionKeywords,1)}function J(){return tt("px",i.pixelValue,1)||tt("em",i.emValue,1)}function tt(m,_,b){var C=wt(_);if(C)return{type:m,value:C[b]}}function wt(m){var _,b;return b=/^[\n\r\t\s]+/.exec(t),b&&p(b[0].length),_=m.exec(t),_&&p(_[0].length),_}function p(m){t=t.substr(m)}return function(m){return t=m.toString(),n()}}();var xm=Pe.parse;Pe.stringify;function _m(i){const t=xm(Am(i));if(t.length===0)throw new Error("Invalid CSS gradient.");if(t.length!==1)throw new Error("Unsupported CSS gradient (multiple gradients is not supported).");const e=t[0],n=vm(e.type),r=ym(e.colorStops),s=Cm(e.orientation);return{type:n,stops:r,angle:s}}function vm(i){const t={"linear-gradient":0,"radial-gradient":1};if(!(i in t))throw new Error(`Unsupported gradient type "${i}"`);return t[i]}function ym(i){const t=Sm(i),e=[],n=new K;for(let r=0;r<i.length;r++){const s=bm(i[r]),o=n.setValue(s).toArray();e.push({offset:t[r],color:o.slice(0,3),alpha:o[3]})}return e}function bm(i){switch(i.type){case"hex":return`#${i.value}`;case"literal":return i.value;default:return`${i.type}(${i.value.join(",")})`}}function Sm(i){const t=[];for(let s=0;s<i.length;s++){const o=i[s];let a=-1;o.type==="literal"&&o.length&&"type"in o.length&&o.length.type==="%"&&"value"in o.length&&(a=parseFloat(o.length.value)/100),t.push(a)}const n=s=>{for(let o=s;o<t.length;o++)if(t[o]!==-1)return{indexDelta:o-s,offset:t[o]};return{indexDelta:t.length-1-s,offset:1}};let r=0;for(let s=0;s<t.length;s++){const o=t[s];if(o!==-1)r=o;else if(s===0)t[s]=0;else if(s+1===t.length)t[s]=1;else{const a=n(s),u=(a.offset-r)/(1+a.indexDelta);for(let h=0;h<=a.indexDelta;h++)t[s+h]=r+(h+1)*u;s+=a.indexDelta,r=t[s]}}return t.map(wm)}function wm(i){return i.toString().length>6?parseFloat(i.toString().substring(0,6)):i}function Cm(i){if(typeof i>"u")return 0;if("type"in i&&"value"in i)switch(i.type){case"angular":return parseFloat(i.value);case"directional":return Tm(i.value)}return 0}function Tm(i){const t={left:270,top:0,bottom:180,right:90,"left top":315,"top left":315,"left bottom":225,"bottom left":225,"right top":45,"top right":45,"right bottom":135,"bottom right":135};if(!(i in t))throw new Error(`Unsupported directional value "${i}"`);return t[i]}function Am(i){let t=i.replace(/\s{2,}/gu," ");return t=t.replace(/;/g,""),t=t.replace(/ ,/g,","),t=t.replace(/\( /g,"("),t=t.replace(/ \)/g,")"),t.trim()}var Pm=Object.defineProperty,Mm=(i,t,e)=>t in i?Pm(i,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):i[t]=e,Te=(i,t,e)=>(Mm(i,typeof t!="symbol"?t+"":t,e),e);const rr=90;function Fm(i){return[...i].sort((t,e)=>t.offset-e.offset)}const Si=class qi extends Y{constructor(t){if(t&&"css"in t?t={..._m(t.css||""),alpha:t.alpha??qi.defaults.alpha,maxColors:t.maxColors??qi.defaults.maxColors}:t={...qi.defaults,...t},!t.stops||t.stops.length<2)throw new Error("ColorGradientFilter requires at least 2 color stops.");const e=W.from({vertex:{source:ko,entryPoint:"mainVertex"},fragment:{source:ko,entryPoint:"mainFragment"}}),n=H.from({vertex:gm,fragment:mm,name:"color-gradient-filter"}),r=32;super({gpuProgram:e,glProgram:n,resources:{baseUniforms:{uOptions:{value:[t.type,t.angle??rr,t.alpha,t.replace?1:0],type:"vec4<f32>"},uCounts:{value:[t.stops.length,t.maxColors],type:"vec2<f32>"}},stopsUniforms:{uColors:{value:new Float32Array(r*3),type:"vec3<f32>",size:r},uStops:{value:new Float32Array(r*4),type:"vec4<f32>",size:r}}}}),Te(this,"baseUniforms"),Te(this,"stopsUniforms"),Te(this,"_stops",[]),this.baseUniforms=this.resources.baseUniforms.uniforms,this.stopsUniforms=this.resources.stopsUniforms.uniforms,Object.assign(this,t)}get stops(){return this._stops}set stops(t){const e=Fm(t),n=new K;let r,s,o;for(let a=0;a<e.length;a++){n.setValue(e[a].color);const l=a*3;[r,s,o]=n.toArray(),this.stopsUniforms.uColors[l]=r,this.stopsUniforms.uColors[l+1]=s,this.stopsUniforms.uColors[l+2]=o,this.stopsUniforms.uStops[a*4]=e[a].offset,this.stopsUniforms.uStops[a*4+1]=e[a].alpha}this.baseUniforms.uCounts[0]=e.length,this._stops=e}get type(){return this.baseUniforms.uOptions[0]}set type(t){this.baseUniforms.uOptions[0]=t}get angle(){return this.baseUniforms.uOptions[1]+rr}set angle(t){this.baseUniforms.uOptions[1]=t-rr}get alpha(){return this.baseUniforms.uOptions[2]}set alpha(t){this.baseUniforms.uOptions[2]=t}get maxColors(){return this.baseUniforms.uCounts[1]}set maxColors(t){this.baseUniforms.uCounts[1]=t}get replace(){return this.baseUniforms.uOptions[3]>.5}set replace(t){this.baseUniforms.uOptions[3]=t?1:0}};Te(Si,"LINEAR",0);Te(Si,"RADIAL",1);Te(Si,"CONIC",2);Te(Si,"defaults",{type:Si.LINEAR,stops:[{offset:0,color:16711680,alpha:1},{offset:1,color:255,alpha:1}],alpha:1,angle:90,maxColors:0,replace:!1});var Im=`in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform sampler2D uMapTexture;
uniform float uMix;
uniform float uSize;
uniform float uSliceSize;
uniform float uSlicePixelSize;
uniform float uSliceInnerSize;

void main() {
    vec4 color = texture(uTexture, vTextureCoord.xy);
    vec4 adjusted;

    if (color.a > 0.0) {
        color.rgb /= color.a;
        float innerWidth = uSize - 1.0;
        float zSlice0 = min(floor(color.b * innerWidth), innerWidth);
        float zSlice1 = min(zSlice0 + 1.0, innerWidth);
        float xOffset = uSlicePixelSize * 0.5 + color.r * uSliceInnerSize;
        float s0 = xOffset + (zSlice0 * uSliceSize);
        float s1 = xOffset + (zSlice1 * uSliceSize);
        float yOffset = uSliceSize * 0.5 + color.g * (1.0 - uSliceSize);
        vec4 slice0Color = texture(uMapTexture, vec2(s0,yOffset));
        vec4 slice1Color = texture(uMapTexture, vec2(s1,yOffset));
        float zOffset = fract(color.b * innerWidth);
        adjusted = mix(slice0Color, slice1Color, zOffset);

        color.rgb *= color.a;
    }

    finalColor = vec4(mix(color, adjusted, uMix).rgb, color.a);

}`,Om=`struct ColorMapUniforms {
  uMix: f32,
  uSize: f32,
  uSliceSize: f32,
  uSlicePixelSize: f32,
  uSliceInnerSize: f32,
};

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> colorMapUniforms : ColorMapUniforms;
@group(1) @binding(1) var uMapTexture: texture_2d<f32>;
@group(1) @binding(2) var uMapSampler: sampler;

@fragment
fn mainFragment(
  @builtin(position) position: vec4<f32>,
  @location(0) uv : vec2<f32>
) -> @location(0) vec4<f32> {
  var color:vec4<f32> = textureSample(uTexture, uSampler, uv);

  var adjusted: vec4<f32>;

  var altColor: vec4<f32> = vec4<f32>(color.rgb / color.a, color.a);
  let innerWidth: f32 = colorMapUniforms.uSize - 1.0;
  let zSlice0: f32 = min(floor(color.b * innerWidth), innerWidth);
  let zSlice1: f32 = min(zSlice0 + 1.0, innerWidth);
  let xOffset: f32 = colorMapUniforms.uSlicePixelSize * 0.5 + color.r * colorMapUniforms.uSliceInnerSize;
  let s0: f32 = xOffset + (zSlice0 * colorMapUniforms.uSliceSize);
  let s1: f32 = xOffset + (zSlice1 * colorMapUniforms.uSliceSize);
  let yOffset: f32 = colorMapUniforms.uSliceSize * 0.5 + color.g * (1.0 - colorMapUniforms.uSliceSize);
  let slice0Color: vec4<f32> = textureSample(uMapTexture, uMapSampler, vec2(s0,yOffset));
  let slice1Color: vec4<f32> = textureSample(uMapTexture, uMapSampler, vec2(s1,yOffset));
  let zOffset: f32 = fract(color.b * innerWidth);
  adjusted = mix(slice0Color, slice1Color, zOffset);
  altColor = vec4<f32>(color.rgb * color.a, color.a);

  let realColor: vec4<f32> = select(color, altColor, color.a > 0.0);

  return vec4<f32>(mix(realColor, adjusted, colorMapUniforms.uMix).rgb, realColor.a);
}`,Rm=Object.defineProperty,Em=(i,t,e)=>t in i?Rm(i,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):i[t]=e,re=(i,t,e)=>(Em(i,typeof t!="symbol"?t+"":t,e),e);const Um=class Bl extends Y{constructor(...t){let e=t[0]??{};if((e instanceof k||e instanceof zt)&&(B("6.0.0","ColorMapFilter constructor params are now options object. See params: { colorMap, nearest, mix }"),e={colorMap:e},t[1]!==void 0&&(e.nearest=t[1]),t[2]!==void 0&&(e.mix=t[2])),e={...Bl.DEFAULT_OPTIONS,...e},!e.colorMap)throw Error("No color map texture source was provided to ColorMapFilter");const n=W.from({vertex:{source:rt,entryPoint:"mainVertex"},fragment:{source:Om,entryPoint:"mainFragment"}}),r=H.from({vertex:nt,fragment:Im,name:"color-map-filter"});super({gpuProgram:n,glProgram:r,resources:{colorMapUniforms:{uMix:{value:e.mix,type:"f32"},uSize:{value:0,type:"f32"},uSliceSize:{value:0,type:"f32"},uSlicePixelSize:{value:0,type:"f32"},uSliceInnerSize:{value:0,type:"f32"}},uMapTexture:e.colorMap.source,uMapSampler:e.colorMap.source.style}}),re(this,"uniforms"),re(this,"_size",0),re(this,"_sliceSize",0),re(this,"_slicePixelSize",0),re(this,"_sliceInnerSize",0),re(this,"_nearest",!1),re(this,"_scaleMode","linear"),re(this,"_colorMap"),this.uniforms=this.resources.colorMapUniforms.uniforms,Object.assign(this,e)}get mix(){return this.uniforms.uMix}set mix(t){this.uniforms.uMix=t}get colorSize(){return this._size}get colorMap(){return this._colorMap}set colorMap(t){if(!t||t===this.colorMap)return;const e=t instanceof k?t.source:t;e.style.scaleMode=this._scaleMode,e.autoGenerateMipmaps=!1,this._size=e.height,this._sliceSize=1/this._size,this._slicePixelSize=this._sliceSize/this._size,this._sliceInnerSize=this._slicePixelSize*(this._size-1),this.uniforms.uSize=this._size,this.uniforms.uSliceSize=this._sliceSize,this.uniforms.uSlicePixelSize=this._slicePixelSize,this.uniforms.uSliceInnerSize=this._sliceInnerSize,this.resources.uMapTexture=e,this._colorMap=t}get nearest(){return this._nearest}set nearest(t){this._nearest=t,this._scaleMode=t?"nearest":"linear";const e=this._colorMap;e&&e.source&&(e.source.scaleMode=this._scaleMode,e.source.autoGenerateMipmaps=!1,e.source.style.update(),e.source.update())}updateColorMap(){const t=this._colorMap;t?.source&&(t.source.update(),this.colorMap=t)}destroy(){this._colorMap?.destroy(),super.destroy()}};re(Um,"DEFAULT_OPTIONS",{colorMap:k.WHITE,nearest:!1,mix:1});var zm=`in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec3 uColor;
uniform float uAlpha;

void main(void) {
    vec4 c = texture(uTexture, vTextureCoord);
    finalColor = vec4(mix(c.rgb, uColor.rgb, c.a * uAlpha), c.a);
}
`,km=`struct ColorOverlayUniforms {
    uColor: vec3<f32>,
    uAlpha: f32,
};

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> colorOverlayUniforms : ColorOverlayUniforms;

@fragment
fn mainFragment(
    @builtin(position) position: vec4<f32>,
    @location(0) uv : vec2<f32>
) -> @location(0) vec4<f32> {
    let c = textureSample(uTexture, uSampler, uv);
    return vec4<f32>(mix(c.rgb, colorOverlayUniforms.uColor.rgb, c.a * colorOverlayUniforms.uAlpha), c.a);
}
`,Lm=Object.defineProperty,Bm=(i,t,e)=>t in i?Lm(i,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):i[t]=e,Mr=(i,t,e)=>(Bm(i,typeof t!="symbol"?t+"":t,e),e);const Dm=class Dl extends Y{constructor(...t){let e=t[0]??{};(typeof e=="number"||Array.isArray(e)||e instanceof Float32Array)&&(B("6.0.0","ColorOverlayFilter constructor params are now options object. See params: { color, alpha }"),e={color:e},t[1]!==void 0&&(e.alpha=t[1])),e={...Dl.DEFAULT_OPTIONS,...e};const n=W.from({vertex:{source:rt,entryPoint:"mainVertex"},fragment:{source:km,entryPoint:"mainFragment"}}),r=H.from({vertex:nt,fragment:zm,name:"color-overlay-filter"});super({gpuProgram:n,glProgram:r,resources:{colorOverlayUniforms:{uColor:{value:new Float32Array(3),type:"vec3<f32>"},uAlpha:{value:e.alpha,type:"f32"}}}}),Mr(this,"uniforms"),Mr(this,"_color"),this.uniforms=this.resources.colorOverlayUniforms.uniforms,this._color=new K,this.color=e.color??0}get color(){return this._color.value}set color(t){this._color.setValue(t);const[e,n,r]=this._color.toArray();this.uniforms.uColor[0]=e,this.uniforms.uColor[1]=n,this.uniforms.uColor[2]=r}get alpha(){return this.uniforms.uAlpha}set alpha(t){this.uniforms.uAlpha=t}};Mr(Dm,"DEFAULT_OPTIONS",{color:0,alpha:1});var Nm=`in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec3 uOriginalColor;
uniform vec3 uTargetColor;
uniform float uTolerance;

void main(void) {
    vec4 c = texture(uTexture, vTextureCoord);
    vec3 colorDiff = uOriginalColor - (c.rgb / max(c.a, 0.0000000001));
    float colorDistance = length(colorDiff);
    float doReplace = step(colorDistance, uTolerance);
    finalColor = vec4(mix(c.rgb, (uTargetColor + colorDiff) * c.a, doReplace), c.a);
}
`,Gm=`struct ColorReplaceUniforms {
  uOriginalColor: vec3<f32>,
  uTargetColor: vec3<f32>,
  uTolerance: f32,
};

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> colorReplaceUniforms : ColorReplaceUniforms;

@fragment
fn mainFragment(
   @builtin(position) position: vec4<f32>,
    @location(0) uv : vec2<f32>
) -> @location(0) vec4<f32> {
  let sample: vec4<f32> = textureSample(uTexture, uSampler, uv);

  let colorDiff: vec3<f32> = colorReplaceUniforms.uOriginalColor - (sample.rgb / max(sample.a, 0.0000000001));
  let colorDistance: f32 = length(colorDiff);
  let doReplace: f32 = step(colorDistance, colorReplaceUniforms.uTolerance);

  return vec4<f32>(mix(sample.rgb, (colorReplaceUniforms.uTargetColor + colorDiff) * sample.a, doReplace), sample.a);
}`,Vm=Object.defineProperty,Wm=(i,t,e)=>t in i?Vm(i,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):i[t]=e,Ki=(i,t,e)=>(Wm(i,typeof t!="symbol"?t+"":t,e),e);const $m=class Nl extends Y{constructor(...t){let e=t[0]??{};(typeof e=="number"||Array.isArray(e)||e instanceof Float32Array)&&(B("6.0.0","ColorReplaceFilter constructor params are now options object. See params: { originalColor, targetColor, tolerance }"),e={originalColor:e},t[1]!==void 0&&(e.targetColor=t[1]),t[2]!==void 0&&(e.tolerance=t[2])),e={...Nl.DEFAULT_OPTIONS,...e};const n=W.from({vertex:{source:rt,entryPoint:"mainVertex"},fragment:{source:Gm,entryPoint:"mainFragment"}}),r=H.from({vertex:nt,fragment:Nm,name:"color-replace-filter"});super({gpuProgram:n,glProgram:r,resources:{colorReplaceUniforms:{uOriginalColor:{value:new Float32Array(3),type:"vec3<f32>"},uTargetColor:{value:new Float32Array(3),type:"vec3<f32>"},uTolerance:{value:e.tolerance,type:"f32"}}}}),Ki(this,"uniforms"),Ki(this,"_originalColor"),Ki(this,"_targetColor"),this.uniforms=this.resources.colorReplaceUniforms.uniforms,this._originalColor=new K,this._targetColor=new K,this.originalColor=e.originalColor??16711680,this.targetColor=e.targetColor??0,Object.assign(this,e)}get originalColor(){return this._originalColor.value}set originalColor(t){this._originalColor.setValue(t);const[e,n,r]=this._originalColor.toArray();this.uniforms.uOriginalColor[0]=e,this.uniforms.uOriginalColor[1]=n,this.uniforms.uOriginalColor[2]=r}get targetColor(){return this._targetColor.value}set targetColor(t){this._targetColor.setValue(t);const[e,n,r]=this._targetColor.toArray();this.uniforms.uTargetColor[0]=e,this.uniforms.uTargetColor[1]=n,this.uniforms.uTargetColor[2]=r}get tolerance(){return this.uniforms.uTolerance}set tolerance(t){this.uniforms.uTolerance=t}set newColor(t){B("6.0.0","ColorReplaceFilter.newColor is deprecated, please use ColorReplaceFilter.targetColor instead"),this.targetColor=t}get newColor(){return B("6.0.0","ColorReplaceFilter.newColor is deprecated, please use ColorReplaceFilter.targetColor instead"),this.targetColor}set epsilon(t){B("6.0.0","ColorReplaceFilter.epsilon is deprecated, please use ColorReplaceFilter.tolerance instead"),this.tolerance=t}get epsilon(){return B("6.0.0","ColorReplaceFilter.epsilon is deprecated, please use ColorReplaceFilter.tolerance instead"),this.tolerance}};Ki($m,"DEFAULT_OPTIONS",{originalColor:16711680,targetColor:0,tolerance:.4});var Hm=`in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec2 uTexelSize;
uniform mat3 uMatrix;

void main(void)
{
    vec4 c11 = texture(uTexture, vTextureCoord - uTexelSize); // top left
    vec4 c12 = texture(uTexture, vec2(vTextureCoord.x, vTextureCoord.y - uTexelSize.y)); // top center
    vec4 c13 = texture(uTexture, vec2(vTextureCoord.x + uTexelSize.x, vTextureCoord.y - uTexelSize.y)); // top right

    vec4 c21 = texture(uTexture, vec2(vTextureCoord.x - uTexelSize.x, vTextureCoord.y)); // mid left
    vec4 c22 = texture(uTexture, vTextureCoord); // mid center
    vec4 c23 = texture(uTexture, vec2(vTextureCoord.x + uTexelSize.x, vTextureCoord.y)); // mid right

    vec4 c31 = texture(uTexture, vec2(vTextureCoord.x - uTexelSize.x, vTextureCoord.y + uTexelSize.y)); // bottom left
    vec4 c32 = texture(uTexture, vec2(vTextureCoord.x, vTextureCoord.y + uTexelSize.y)); // bottom center
    vec4 c33 = texture(uTexture, vTextureCoord + uTexelSize); // bottom right

    finalColor =
        c11 * uMatrix[0][0] + c12 * uMatrix[0][1] + c13 * uMatrix[0][2] +
        c21 * uMatrix[1][0] + c22 * uMatrix[1][1] + c23 * uMatrix[1][2] +
        c31 * uMatrix[2][0] + c32 * uMatrix[2][1] + c33 * uMatrix[2][2];

    finalColor.a = c22.a;
}`,Xm=`struct ConvolutionUniforms {
    uMatrix: mat3x3<f32>,
    uTexelSize: vec2<f32>,
};

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> convolutionUniforms : ConvolutionUniforms;

@fragment
fn mainFragment(
    @location(0) uv: vec2<f32>,
    @builtin(position) position: vec4<f32>
) -> @location(0) vec4<f32> {
    let texelSize = convolutionUniforms.uTexelSize;
    let matrix = convolutionUniforms.uMatrix;

    let c11: vec4<f32> = textureSample(uTexture, uSampler, uv - texelSize); // top left
    let c12: vec4<f32> = textureSample(uTexture, uSampler, vec2<f32>(uv.x, uv.y - texelSize.y)); // top center
    let c13: vec4<f32> = textureSample(uTexture, uSampler, vec2<f32>(uv.x + texelSize.x, uv.y - texelSize.y)); // top right

    let c21: vec4<f32> = textureSample(uTexture, uSampler, vec2<f32>(uv.x - texelSize.x, uv.y)); // mid left
    let c22: vec4<f32> = textureSample(uTexture, uSampler, uv); // mid center
    let c23: vec4<f32> = textureSample(uTexture, uSampler, vec2<f32>(uv.x + texelSize.x, uv.y)); // mid right

    let c31: vec4<f32> = textureSample(uTexture, uSampler, vec2<f32>(uv.x - texelSize.x, uv.y + texelSize.y)); // bottom left
    let c32: vec4<f32> = textureSample(uTexture, uSampler, vec2<f32>(uv.x, uv.y + texelSize.y)); // bottom center
    let c33: vec4<f32> = textureSample(uTexture, uSampler, uv + texelSize); // bottom right

    var finalColor: vec4<f32> = vec4<f32>(
        c11 * matrix[0][0] + c12 * matrix[0][1] + c13 * matrix[0][2] +
        c21 * matrix[1][0] + c22 * matrix[1][1] + c23 * matrix[1][2] +
        c31 * matrix[2][0] + c32 * matrix[2][1] + c33 * matrix[2][2]
    );

    finalColor.a = c22.a;

    return finalColor;
}`,Ym=Object.defineProperty,jm=(i,t,e)=>t in i?Ym(i,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):i[t]=e,Gl=(i,t,e)=>(jm(i,typeof t!="symbol"?t+"":t,e),e);const qm=class Vl extends Y{constructor(...t){let e=t[0]??{};Array.isArray(e)&&(B("6.0.0","ConvolutionFilter constructor params are now options object. See params: { matrix, width, height }"),e={matrix:e},t[1]!==void 0&&(e.width=t[1]),t[2]!==void 0&&(e.height=t[2])),e={...Vl.DEFAULT_OPTIONS,...e};const n=e.width??200,r=e.height??200,s=W.from({vertex:{source:rt,entryPoint:"mainVertex"},fragment:{source:Xm,entryPoint:"mainFragment"}}),o=H.from({vertex:nt,fragment:Hm,name:"convolution-filter"});super({gpuProgram:s,glProgram:o,resources:{convolutionUniforms:{uMatrix:{value:e.matrix,type:"mat3x3<f32>"},uTexelSize:{value:{x:1/n,y:1/r},type:"vec2<f32>"}}}}),Gl(this,"uniforms"),this.uniforms=this.resources.convolutionUniforms.uniforms,this.width=n,this.height=r}get matrix(){return this.uniforms.uMatrix}set matrix(t){t.forEach((e,n)=>{this.uniforms.uMatrix[n]=e})}get width(){return 1/this.uniforms.uTexelSize.x}set width(t){this.uniforms.uTexelSize.x=1/t}get height(){return 1/this.uniforms.uTexelSize.y}set height(t){this.uniforms.uTexelSize.y=1/t}};Gl(qm,"DEFAULT_OPTIONS",{matrix:new Float32Array(9),width:200,height:200});var Km=`precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec4 uLine;
uniform vec2 uNoise;
uniform vec3 uVignette;
uniform float uSeed;
uniform float uTime;
uniform vec2 uDimensions;

uniform vec4 uInputSize;

const float SQRT_2 = 1.414213;

float rand(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

float vignette(vec3 co, vec2 coord)
{
    float outter = SQRT_2 - uVignette[0] * SQRT_2;
    vec2 dir = vec2(0.5) - coord;
    dir.y *= uDimensions.y / uDimensions.x;
    float darker = clamp((outter - length(dir) * SQRT_2) / ( 0.00001 + uVignette[2] * SQRT_2), 0.0, 1.0);
    return darker + (1.0 - darker) * (1.0 - uVignette[1]);
}

float noise(vec2 coord)
{
    vec2 pixelCoord = coord * uInputSize.xy;
    pixelCoord.x = floor(pixelCoord.x / uNoise[1]);
    pixelCoord.y = floor(pixelCoord.y / uNoise[1]);
    return (rand(pixelCoord * uNoise[1] * uSeed) - 0.5) * uNoise[0];
}

vec3 interlaceLines(vec3 co, vec2 coord)
{
    vec3 color = co;

    float curvature = uLine[0];
    float lineWidth = uLine[1];
    float lineContrast = uLine[2];
    float verticalLine = uLine[3];

    vec2 dir = vec2(coord * uInputSize.xy / uDimensions - 0.5);

    float _c = curvature > 0. ? curvature : 1.;
    float k = curvature > 0. ? (length(dir * dir) * 0.25 * _c * _c + 0.935 * _c) : 1.;
    vec2 uv = dir * k;
    float v = verticalLine > 0.5 ? uv.x * uDimensions.x : uv.y * uDimensions.y;
    v *= min(1.0, 2.0 / lineWidth ) / _c;
    float j = 1. + cos(v * 1.2 - uTime) * 0.5 * lineContrast;
    color *= j;

    float segment = verticalLine > 0.5 ? mod((dir.x + .5) * uDimensions.x, 4.) : mod((dir.y + .5) * uDimensions.y, 4.);
    color *= 0.99 + ceil(segment) * 0.015;

    return color;
}

void main(void)
{
    finalColor = texture(uTexture, vTextureCoord);
    vec2 coord = vTextureCoord * uInputSize.xy / uDimensions;

    if (uNoise[0] > 0.0 && uNoise[1] > 0.0)
    {
        float n = noise(vTextureCoord);
        finalColor += vec4(n, n, n, finalColor.a);
    }

    if (uVignette[0] > 0.)
    {
        float v = vignette(finalColor.rgb, coord);
        finalColor *= vec4(v, v, v, finalColor.a);
    }

    if (uLine[1] > 0.0)
    {
        finalColor = vec4(interlaceLines(finalColor.rgb, vTextureCoord), finalColor.a);  
    }
}
`,Zm=`struct CRTUniforms {
    uLine: vec4<f32>,
    uNoise: vec2<f32>,
    uVignette: vec3<f32>,
    uSeed: f32,
    uTime: f32,
    uDimensions: vec2<f32>,
};

struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> crtUniforms : CRTUniforms;

@fragment
fn mainFragment(
  @builtin(position) position: vec4<f32>,
  @location(0) uv : vec2<f32>
) -> @location(0) vec4<f32> {
    
  var color: vec4<f32> = textureSample(uTexture, uSampler, uv);
  let coord: vec2<f32> = uv * gfu.uInputSize.xy / crtUniforms.uDimensions;

  let uNoise = crtUniforms.uNoise;

  if (uNoise[0] > 0.0 && uNoise[1] > 0.0)
  {
    color += vec4<f32>(vec3<f32>(noise(uv)), color.a);
  }

  if (crtUniforms.uVignette[0] > 0.)
  {
    color *= vec4<f32>(vec3<f32>(vignette(color.rgb, coord)), color.a);
  }

  if (crtUniforms.uLine[1] > 0.0)
  {
    color = vec4<f32>(vec3<f32>(interlaceLines(color.rgb, uv)), color.a);  
  }

  return color;
}

const SQRT_2: f32 = 1.414213;

fn modulo(x: f32, y: f32) -> f32
{
  return x - y * floor(x/y);
}

fn rand(co: vec2<f32>) -> f32
{
  return fract(sin(dot(co, vec2<f32>(12.9898, 78.233))) * 43758.5453);
}

fn vignette(co: vec3<f32>, coord: vec2<f32>) -> f32
{
  let uVignette = crtUniforms.uVignette;
  let uDimensions = crtUniforms.uDimensions;
  
  let outter: f32 = SQRT_2 - uVignette[0] * SQRT_2;
  var dir: vec2<f32> = vec2<f32>(0.5) - coord;
  dir.y *= uDimensions.y / uDimensions.x;
  let darker: f32 = clamp((outter - length(dir) * SQRT_2) / ( 0.00001 + uVignette[2] * SQRT_2), 0.0, 1.0);
  return darker + (1.0 - darker) * (1.0 - uVignette[1]);
}

fn noise(coord: vec2<f32>) -> f32
{
  let uNoise = crtUniforms.uNoise;
  let uSeed = crtUniforms.uSeed;

  var pixelCoord: vec2<f32> = coord * gfu.uInputSize.xy;
  pixelCoord.x = floor(pixelCoord.x / uNoise[1]);
  pixelCoord.y = floor(pixelCoord.y / uNoise[1]);
  return (rand(pixelCoord * uNoise[1] * uSeed) - 0.5) * uNoise[0];
}

fn interlaceLines(co: vec3<f32>, coord: vec2<f32>) -> vec3<f32>
{
  var color = co;

  let uDimensions = crtUniforms.uDimensions;

  let curvature: f32 = crtUniforms.uLine[0];
  let lineWidth: f32 = crtUniforms.uLine[1];
  let lineContrast: f32 = crtUniforms.uLine[2];
  let verticalLine: f32 = crtUniforms.uLine[3];

  let dir: vec2<f32> = vec2<f32>(coord * gfu.uInputSize.xy / uDimensions - 0.5);

  let _c: f32 = select(1., curvature, curvature > 0.);
  let k: f32 = select(1., (length(dir * dir) * 0.25 * _c * _c + 0.935 * _c), curvature > 0.);
  let uv: vec2<f32> = dir * k;
  let v: f32 = select(uv.y * uDimensions.y, uv.x * uDimensions.x, verticalLine > 0.5) * min(1.0, 2.0 / lineWidth ) / _c;
  let j: f32 = 1. + cos(v * 1.2 - crtUniforms.uTime) * 0.5 * lineContrast;
  color *= j;

  let segment: f32 = select(modulo((dir.y + .5) * uDimensions.y, 4.), modulo((dir.x + .5) * uDimensions.x, 4.), verticalLine > 0.5);
  color *= 0.99 + ceil(segment) * 0.015;

  return color;
}`,Qm=Object.defineProperty,Jm=(i,t,e)=>t in i?Qm(i,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):i[t]=e,Zi=(i,t,e)=>(Jm(i,typeof t!="symbol"?t+"":t,e),e);const tg=class Wl extends Y{constructor(t){t={...Wl.DEFAULT_OPTIONS,...t};const e=W.from({vertex:{source:rt,entryPoint:"mainVertex"},fragment:{source:Zm,entryPoint:"mainFragment"}}),n=H.from({vertex:nt,fragment:Km,name:"crt-filter"});super({gpuProgram:e,glProgram:n,resources:{crtUniforms:{uLine:{value:new Float32Array(4),type:"vec4<f32>"},uNoise:{value:new Float32Array(2),type:"vec2<f32>"},uVignette:{value:new Float32Array(3),type:"vec3<f32>"},uSeed:{value:t.seed,type:"f32"},uTime:{value:t.time,type:"f32"},uDimensions:{value:new Float32Array(2),type:"vec2<f32>"}}}}),Zi(this,"uniforms"),Zi(this,"seed"),Zi(this,"time"),this.uniforms=this.resources.crtUniforms.uniforms,Object.assign(this,t)}apply(t,e,n,r){this.uniforms.uDimensions[0]=e.frame.width,this.uniforms.uDimensions[1]=e.frame.height,this.uniforms.uSeed=this.seed,this.uniforms.uTime=this.time,t.applyFilter(this,e,n,r)}get curvature(){return this.uniforms.uLine[0]}set curvature(t){this.uniforms.uLine[0]=t}get lineWidth(){return this.uniforms.uLine[1]}set lineWidth(t){this.uniforms.uLine[1]=t}get lineContrast(){return this.uniforms.uLine[2]}set lineContrast(t){this.uniforms.uLine[2]=t}get verticalLine(){return this.uniforms.uLine[3]>.5}set verticalLine(t){this.uniforms.uLine[3]=t?1:0}get noise(){return this.uniforms.uNoise[0]}set noise(t){this.uniforms.uNoise[0]=t}get noiseSize(){return this.uniforms.uNoise[1]}set noiseSize(t){this.uniforms.uNoise[1]=t}get vignetting(){return this.uniforms.uVignette[0]}set vignetting(t){this.uniforms.uVignette[0]=t}get vignettingAlpha(){return this.uniforms.uVignette[1]}set vignettingAlpha(t){this.uniforms.uVignette[1]=t}get vignettingBlur(){return this.uniforms.uVignette[2]}set vignettingBlur(t){this.uniforms.uVignette[2]=t}};Zi(tg,"DEFAULT_OPTIONS",{curvature:1,lineWidth:1,lineContrast:.25,verticalLine:!1,noise:0,noiseSize:1,vignetting:.3,vignettingAlpha:1,vignettingBlur:.3,time:0,seed:0});var eg=`precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform float uAngle;
uniform float uScale;
uniform bool uGrayScale;

uniform vec4 uInputSize;

float pattern()
{
    float s = sin(uAngle), c = cos(uAngle);
    vec2 tex = vTextureCoord * uInputSize.xy;
    vec2 point = vec2(
        c * tex.x - s * tex.y,
        s * tex.x + c * tex.y
    ) * uScale;
    return (sin(point.x) * sin(point.y)) * 4.0;
    }

    void main()
    {
    vec4 color = texture(uTexture, vTextureCoord);
    vec3 colorRGB = vec3(color);

    if (uGrayScale)
    {
        colorRGB = vec3(color.r + color.g + color.b) / 3.0;
    }

    finalColor = vec4(colorRGB * 10.0 - 5.0 + pattern(), color.a);
}
`,ig=`struct DotUniforms {
  uScale:f32,
  uAngle:f32,
  uGrayScale:f32,
};

struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> dotUniforms : DotUniforms;

@fragment
fn mainFragment(
  @location(0) uv: vec2<f32>,
  @builtin(position) position: vec4<f32>
) -> @location(0) vec4<f32> {
  let color: vec4<f32> = textureSample(uTexture, uSampler, uv);
  let gray: vec3<f32> = vec3<f32>(dot(color.rgb, vec3<f32>(0.299, 0.587, 0.114)));
  // dotUniforms.uGrayScale == 1 doesn't ever pass so it is converted to a float and compared to 0.5 instead 
  let finalColor: vec3<f32> = select(color.rgb, gray, f32(dotUniforms.uGrayScale) >= 0.5);

  return vec4<f32>(finalColor * 10.0 - 5.0 + pattern(uv), color.a);
}

fn pattern(uv: vec2<f32>) -> f32
{
  let s: f32 = sin(dotUniforms.uAngle);
  let c: f32 = cos(dotUniforms.uAngle);
  
  let tex: vec2<f32> = uv * gfu.uInputSize.xy;
  
  let p: vec2<f32> = vec2<f32>(
      c * tex.x - s * tex.y,
      s * tex.x + c * tex.y
  ) * dotUniforms.uScale;

  return (sin(p.x) * sin(p.y)) * 4.0;
}`,ng=Object.defineProperty,rg=(i,t,e)=>t in i?ng(i,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):i[t]=e,sg=(i,t,e)=>(rg(i,t+"",e),e);const og=class $l extends Y{constructor(...t){let e=t[0]??{};typeof e=="number"&&(B("6.0.0","DotFilter constructor params are now options object. See params: { scale, angle, grayscale }"),e={scale:e},t[1]!==void 0&&(e.angle=t[1]),t[2]!==void 0&&(e.grayscale=t[2])),e={...$l.DEFAULT_OPTIONS,...e};const n={uScale:{value:e.scale,type:"f32"},uAngle:{value:e.angle,type:"f32"},uGrayScale:{value:e.grayscale?1:0,type:"f32"}},r=W.from({vertex:{source:rt,entryPoint:"mainVertex"},fragment:{source:ig,entryPoint:"mainFragment"}}),s=H.from({vertex:nt,fragment:eg,name:"dot-filter"});super({gpuProgram:r,glProgram:s,resources:{dotUniforms:n}})}get scale(){return this.resources.dotUniforms.uniforms.uScale}set scale(t){this.resources.dotUniforms.uniforms.uScale=t}get angle(){return this.resources.dotUniforms.uniforms.uAngle}set angle(t){this.resources.dotUniforms.uniforms.uAngle=t}get grayscale(){return this.resources.dotUniforms.uniforms.uGrayScale===1}set grayscale(t){this.resources.dotUniforms.uniforms.uGrayScale=t?1:0}};sg(og,"DEFAULT_OPTIONS",{scale:1,angle:5,grayscale:!0});var ag=`precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform float uAlpha;
uniform vec3 uColor;
uniform vec2 uOffset;

uniform vec4 uInputSize;

void main(void){
    vec4 sample = texture(uTexture, vTextureCoord - uOffset * uInputSize.zw);

    // Premultiply alpha
    sample.rgb = uColor.rgb * sample.a;

    // alpha user alpha
    sample *= uAlpha;

    finalColor = sample;
}`,lg=`struct DropShadowUniforms {
  uAlpha: f32,
  uColor: vec3<f32>,
  uOffset: vec2<f32>,
};

struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> dropShadowUniforms : DropShadowUniforms;

@fragment
fn mainFragment(
  @builtin(position) position: vec4<f32>,
  @location(0) uv : vec2<f32>
) -> @location(0) vec4<f32> {
  var color: vec4<f32> = textureSample(uTexture, uSampler, uv - dropShadowUniforms.uOffset * gfu.uInputSize.zw);

  // Premultiply alpha
  color = vec4<f32>(vec3<f32>(dropShadowUniforms.uColor.rgb * color.a), color.a);
  // alpha user alpha
  color *= dropShadowUniforms.uAlpha;

  return color;
}`,ug=Object.defineProperty,hg=(i,t,e)=>t in i?ug(i,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):i[t]=e,ze=(i,t,e)=>(hg(i,typeof t!="symbol"?t+"":t,e),e);const cg=class Hl extends Y{constructor(t){t={...Hl.DEFAULT_OPTIONS,...t};const e=W.from({vertex:{source:rt,entryPoint:"mainVertex"},fragment:{source:lg,entryPoint:"mainFragment"}}),n=H.from({vertex:nt,fragment:ag,name:"drop-shadow-filter"});super({gpuProgram:e,glProgram:n,resources:{dropShadowUniforms:{uAlpha:{value:t.alpha,type:"f32"},uColor:{value:new Float32Array(3),type:"vec3<f32>"},uOffset:{value:t.offset,type:"vec2<f32>"}}},resolution:t.resolution}),ze(this,"uniforms"),ze(this,"shadowOnly",!1),ze(this,"_color"),ze(this,"_blurFilter"),ze(this,"_basePass"),this.uniforms=this.resources.dropShadowUniforms.uniforms,this._color=new K,this.color=t.color??0,this._blurFilter=new Pl({strength:t.kernels??t.blur,quality:t.kernels?void 0:t.quality}),this._basePass=new Y({gpuProgram:W.from({vertex:{source:rt,entryPoint:"mainVertex"},fragment:{source:`
                    @group(0) @binding(1) var uTexture: texture_2d<f32>; 
                    @group(0) @binding(2) var uSampler: sampler;
                    @fragment
                    fn mainFragment(
                        @builtin(position) position: vec4<f32>,
                        @location(0) uv : vec2<f32>
                    ) -> @location(0) vec4<f32> {
                        return textureSample(uTexture, uSampler, uv);
                    }
                    `,entryPoint:"mainFragment"}}),glProgram:H.from({vertex:nt,fragment:`
                in vec2 vTextureCoord;
                out vec4 finalColor;
                uniform sampler2D uTexture;

                void main(void){
                    finalColor = texture(uTexture, vTextureCoord);
                }
                `,name:"drop-shadow-filter"}),resources:{}}),Object.assign(this,t)}apply(t,e,n,r){const s=Dt.getSameSizeTexture(e);t.applyFilter(this,e,s,!0),this._blurFilter.apply(t,s,n,r),this.shadowOnly||t.applyFilter(this._basePass,e,n,!1),Dt.returnTexture(s)}get offset(){return this.uniforms.uOffset}set offset(t){this.uniforms.uOffset=t,this._updatePadding()}get offsetX(){return this.offset.x}set offsetX(t){this.offset.x=t,this._updatePadding()}get offsetY(){return this.offset.y}set offsetY(t){this.offset.y=t,this._updatePadding()}get color(){return this._color.value}set color(t){this._color.setValue(t);const[e,n,r]=this._color.toArray();this.uniforms.uColor[0]=e,this.uniforms.uColor[1]=n,this.uniforms.uColor[2]=r}get alpha(){return this.uniforms.uAlpha}set alpha(t){this.uniforms.uAlpha=t}get blur(){return this._blurFilter.strength}set blur(t){this._blurFilter.strength=t,this._updatePadding()}get quality(){return this._blurFilter.quality}set quality(t){this._blurFilter.quality=t,this._updatePadding()}get kernels(){return this._blurFilter.kernels}set kernels(t){this._blurFilter.kernels=t}get pixelSize(){return this._blurFilter.pixelSize}set pixelSize(t){typeof t=="number"&&(t={x:t,y:t}),Array.isArray(t)&&(t={x:t[0],y:t[1]}),this._blurFilter.pixelSize=t}get pixelSizeX(){return this._blurFilter.pixelSizeX}set pixelSizeX(t){this._blurFilter.pixelSizeX=t}get pixelSizeY(){return this._blurFilter.pixelSizeY}set pixelSizeY(t){this._blurFilter.pixelSizeY=t}_updatePadding(){const t=Math.max(Math.abs(this.offsetX),Math.abs(this.offsetY));this.padding=t+this.blur*2+this.quality*4}};ze(cg,"DEFAULT_OPTIONS",{offset:{x:4,y:4},color:0,alpha:.5,shadowOnly:!1,kernels:void 0,blur:2,quality:3,pixelSize:{x:1,y:1},resolution:1});var fg=`precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform sampler2D uDisplacementMap;
uniform float uSeed;
uniform vec2 uDimensions;
uniform float uAspect;
uniform float uFillMode;
uniform float uOffset;
uniform float uDirection;
uniform vec2 uRed;
uniform vec2 uGreen;
uniform vec2 uBlue;

uniform vec4 uInputSize;
uniform vec4 uInputClamp;

const int TRANSPARENT = 0;
const int ORIGINAL = 1;
const int LOOP = 2;
const int CLAMP = 3;
const int MIRROR = 4;

void main(void)
{
    vec2 coord = (vTextureCoord * uInputSize.xy) / uDimensions;

    if (coord.x > 1.0 || coord.y > 1.0) {
        return;
    }

    float sinDir = sin(uDirection);
    float cosDir = cos(uDirection);

    float cx = coord.x - 0.5;
    float cy = (coord.y - 0.5) * uAspect;
    float ny = (-sinDir * cx + cosDir * cy) / uAspect + 0.5;

    // displacementMap: repeat
    // ny = ny > 1.0 ? ny - 1.0 : (ny < 0.0 ? 1.0 + ny : ny);

    // displacementMap: mirror
    ny = ny > 1.0 ? 2.0 - ny : (ny < 0.0 ? -ny : ny);

    vec4 dc = texture(uDisplacementMap, vec2(0.5, ny));

    float displacement = (dc.r - dc.g) * (uOffset / uInputSize.x);

    coord = vTextureCoord + vec2(cosDir * displacement, sinDir * displacement * uAspect);

    int fillMode = int(uFillMode);

    if (fillMode == CLAMP) {
        coord = clamp(coord, uInputClamp.xy, uInputClamp.zw);
    } else {
        if( coord.x > uInputClamp.z ) {
            if (fillMode == TRANSPARENT) {
                discard;
            } else if (fillMode == LOOP) {
                coord.x -= uInputClamp.z;
            } else if (fillMode == MIRROR) {
                coord.x = uInputClamp.z * 2.0 - coord.x;
            }
        } else if( coord.x < uInputClamp.x ) {
            if (fillMode == TRANSPARENT) {
                discard;
            } else if (fillMode == LOOP) {
                coord.x += uInputClamp.z;
            } else if (fillMode == MIRROR) {
                coord.x *= -uInputClamp.z;
            }
        }

        if( coord.y > uInputClamp.w ) {
            if (fillMode == TRANSPARENT) {
                discard;
            } else if (fillMode == LOOP) {
                coord.y -= uInputClamp.w;
            } else if (fillMode == MIRROR) {
                coord.y = uInputClamp.w * 2.0 - coord.y;
            }
        } else if( coord.y < uInputClamp.y ) {
            if (fillMode == TRANSPARENT) {
                discard;
            } else if (fillMode == LOOP) {
                coord.y += uInputClamp.w;
            } else if (fillMode == MIRROR) {
                coord.y *= -uInputClamp.w;
            }
        }
    }

    finalColor.r = texture(uTexture, coord + uRed * (1.0 - uSeed * 0.4) / uInputSize.xy).r;
    finalColor.g = texture(uTexture, coord + uGreen * (1.0 - uSeed * 0.3) / uInputSize.xy).g;
    finalColor.b = texture(uTexture, coord + uBlue * (1.0 - uSeed * 0.2) / uInputSize.xy).b;
    finalColor.a = texture(uTexture, coord).a;
}
`,dg=`struct GlitchUniforms {
  uSeed: f32,
  uDimensions: vec2<f32>,
  uAspect: f32,
  uFillMode: f32,
  uOffset: f32,
  uDirection: f32,
  uRed: vec2<f32>,
  uGreen: vec2<f32>,
  uBlue: vec2<f32>,
};

struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> glitchUniforms : GlitchUniforms;
@group(1) @binding(1) var uDisplacementMap: texture_2d<f32>; 
@group(1) @binding(2) var uDisplacementSampler: sampler; 

@fragment
fn mainFragment(
  @builtin(position) position: vec4<f32>,
  @location(0) uv : vec2<f32>
) -> @location(0) vec4<f32> {
  let uSeed: f32 = glitchUniforms.uSeed;
  let uDimensions: vec2<f32> = glitchUniforms.uDimensions;
  let uAspect: f32 = glitchUniforms.uAspect;
  let uOffset: f32 = glitchUniforms.uOffset;
  let uDirection: f32 = glitchUniforms.uDirection;
  let uRed: vec2<f32> = glitchUniforms.uRed;
  let uGreen: vec2<f32> = glitchUniforms.uGreen;
  let uBlue: vec2<f32> = glitchUniforms.uBlue;

  let uInputSize: vec4<f32> = gfu.uInputSize;
  let uInputClamp: vec4<f32> = gfu.uInputClamp;

  var discarded: bool = false;
  var coord: vec2<f32> = (uv * uInputSize.xy) / uDimensions;

    if (coord.x > 1.0 || coord.y > 1.0) {
      discarded = true;
    }

    let sinDir: f32 = sin(uDirection);
    let cosDir: f32 = cos(uDirection);

    let cx: f32 = coord.x - 0.5;
    let cy: f32 = (coord.y - 0.5) * uAspect;
    var ny: f32 = (-sinDir * cx + cosDir * cy) / uAspect + 0.5;

    ny = select(select(ny, -ny, ny < 0.0), 2.0 - ny, ny > 1.0);

    let dc: vec4<f32> = textureSample(uDisplacementMap, uDisplacementSampler, vec2<f32>(0.5, ny));

    let displacement: f32 = (dc.r - dc.g) * (uOffset / uInputSize.x);

    coord = uv + vec2<f32>(cosDir * displacement, sinDir * displacement * uAspect);

    let fillMode: i32 = i32(glitchUniforms.uFillMode);

    if (fillMode == CLAMP) {
      coord = clamp(coord, uInputClamp.xy, uInputClamp.zw);
    } else {
      if (coord.x > uInputClamp.z) {
        if (fillMode == TRANSPARENT) {
          discarded = true;
        } else if (fillMode == LOOP) {
          coord.x = coord.x - uInputClamp.z;
        } else if (fillMode == MIRROR) {
          coord.x = uInputClamp.z * 2.0 - coord.x;
        }
      } else if (coord.x < uInputClamp.x) {
        if (fillMode == TRANSPARENT) {
          discarded = true;
        } else if (fillMode == LOOP) {
          coord.x = coord.x + uInputClamp.z;
        } else if (fillMode == MIRROR) {
          coord.x = coord.x * -uInputClamp.z;
        }
      }

      if (coord.y > uInputClamp.w) {
        if (fillMode == TRANSPARENT) {
          discarded = true;
        } else if (fillMode == LOOP) {
          coord.y = coord.y - uInputClamp.w;
        } else if (fillMode == MIRROR) {
          coord.y = uInputClamp.w * 2.0 - coord.y;
        }
      } else if (coord.y < uInputClamp.y) {
        if (fillMode == TRANSPARENT) {
          discarded = true;
        } else if (fillMode == LOOP) {
          coord.y = coord.y + uInputClamp.w;
        } else if (fillMode == MIRROR) {
          coord.y = coord.y * -uInputClamp.w;
        }
      }
    }

    let seedR: f32 = 1.0 - uSeed * 0.4;
    let seedG: f32 = 1.0 - uSeed * 0.3;
    let seedB: f32 = 1.0 - uSeed * 0.2;

    let offsetR: vec2<f32> = vec2(uRed.x * seedR / uInputSize.x, uRed.y * seedR / uInputSize.y);
    let offsetG: vec2<f32> = vec2(uGreen.x * seedG / uInputSize.x, uGreen.y * seedG / uInputSize.y);
    let offsetB: vec2<f32> = vec2(uBlue.x * seedB / uInputSize.x, uBlue.y * seedB / uInputSize.y);

    let r = textureSample(uTexture, uSampler, coord + offsetR).r;
    let g = textureSample(uTexture, uSampler, coord + offsetG).g;
    let b = textureSample(uTexture, uSampler, coord + offsetB).b;
    let a = textureSample(uTexture, uSampler, coord).a;

    return select(vec4<f32>(r, g, b, a), vec4<f32>(0.0,0.0,0.0,0.0), discarded);
}

const TRANSPARENT: i32 = 0;
const ORIGINAL: i32 = 1;
const LOOP: i32 = 2;
const CLAMP: i32 = 3;
const MIRROR: i32 = 4;`,pg=Object.defineProperty,mg=(i,t,e)=>t in i?pg(i,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):i[t]=e,Jt=(i,t,e)=>(mg(i,typeof t!="symbol"?t+"":t,e),e);const gg=class Xl extends Y{constructor(t){t={...Xl.defaults,...t};const e=W.from({vertex:{source:rt,entryPoint:"mainVertex"},fragment:{source:dg,entryPoint:"mainFragment"}}),n=H.from({vertex:nt,fragment:fg,name:"glitch-filter"}),r=document.createElement("canvas");r.width=4,r.height=t.sampleSize??512;const s=new k({source:new Ae({resource:r})});super({gpuProgram:e,glProgram:n,resources:{glitchUniforms:{uSeed:{value:t?.seed??0,type:"f32"},uDimensions:{value:new Float32Array(2),type:"vec2<f32>"},uAspect:{value:1,type:"f32"},uFillMode:{value:t?.fillMode??0,type:"f32"},uOffset:{value:t?.offset??100,type:"f32"},uDirection:{value:t?.direction??0,type:"f32"},uRed:{value:t.red,type:"vec2<f32>"},uGreen:{value:t.green,type:"vec2<f32>"},uBlue:{value:t.blue,type:"vec2<f32>"}},uDisplacementMap:s.source,uDisplacementSampler:s.source.style}}),Jt(this,"uniforms"),Jt(this,"average",!1),Jt(this,"minSize",8),Jt(this,"sampleSize",512),Jt(this,"_canvas"),Jt(this,"texture"),Jt(this,"_slices",0),Jt(this,"_sizes",new Float32Array(1)),Jt(this,"_offsets",new Float32Array(1)),this.uniforms=this.resources.glitchUniforms.uniforms,this._canvas=r,this.texture=s,Object.assign(this,t)}apply(t,e,n,r){const{width:s,height:o}=e.frame;this.uniforms.uDimensions[0]=s,this.uniforms.uDimensions[1]=o,this.uniforms.uAspect=o/s,t.applyFilter(this,e,n,r)}_randomizeSizes(){const t=this._sizes,e=this._slices-1,n=this.sampleSize,r=Math.min(this.minSize/n,.9/this._slices);if(this.average){const s=this._slices;let o=1;for(let a=0;a<e;a++){const l=o/(s-a),u=Math.max(l*(1-Math.random()*.6),r);t[a]=u,o-=u}t[e]=o}else{let s=1;const o=Math.sqrt(1/this._slices);for(let a=0;a<e;a++){const l=Math.max(o*s*Math.random(),r);t[a]=l,s-=l}t[e]=s}this.shuffle()}shuffle(){const t=this._sizes,e=this._slices-1;for(let n=e;n>0;n--){const r=Math.random()*n>>0,s=t[n];t[n]=t[r],t[r]=s}}_randomizeOffsets(){for(let t=0;t<this._slices;t++)this._offsets[t]=Math.random()*(Math.random()<.5?-1:1)}refresh(){this._randomizeSizes(),this._randomizeOffsets(),this.redraw()}redraw(){const t=this.sampleSize,e=this.texture,n=this._canvas.getContext("2d");n.clearRect(0,0,8,t);let r,s=0;for(let o=0;o<this._slices;o++){r=Math.floor(this._offsets[o]*256);const a=this._sizes[o]*t,l=r>0?r:0,u=r<0?-r:0;n.fillStyle=`rgba(${l}, ${u}, 0, 1)`,n.fillRect(0,s>>0,t,a+1>>0),s+=a}e.source.update()}set sizes(t){const e=Math.min(this._slices,t.length);for(let n=0;n<e;n++)this._sizes[n]=t[n]}get sizes(){return this._sizes}set offsets(t){const e=Math.min(this._slices,t.length);for(let n=0;n<e;n++)this._offsets[n]=t[n]}get offsets(){return this._offsets}get slices(){return this._slices}set slices(t){this._slices!==t&&(this._slices=t,this._sizes=new Float32Array(t),this._offsets=new Float32Array(t),this.refresh())}get offset(){return this.uniforms.uOffset}set offset(t){this.uniforms.uOffset=t}get seed(){return this.uniforms.uSeed}set seed(t){this.uniforms.uSeed=t}get fillMode(){return this.uniforms.uFillMode}set fillMode(t){this.uniforms.uFillMode=t}get direction(){return this.uniforms.uDirection/Ve}set direction(t){this.uniforms.uDirection=t*Ve}get red(){return this.uniforms.uRed}set red(t){Array.isArray(t)&&(t={x:t[0],y:t[1]}),this.uniforms.uRed=t}get green(){return this.uniforms.uGreen}set green(t){Array.isArray(t)&&(t={x:t[0],y:t[1]}),this.uniforms.uGreen=t}get blue(){return this.uniforms.uBlue}set blue(t){Array.isArray(t)&&(t={x:t[0],y:t[1]}),this.uniforms.uBlue=t}destroy(){this.texture?.destroy(!0),this.texture=this._canvas=this.red=this.green=this.blue=this._sizes=this._offsets=null}};Jt(gg,"defaults",{slices:5,offset:100,direction:0,fillMode:0,average:!1,seed:0,red:{x:0,y:0},green:{x:0,y:0},blue:{x:0,y:0},minSize:8,sampleSize:512});var xg=`precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec2 uStrength;
uniform vec3 uColor;
uniform float uKnockout;
uniform float uAlpha;

uniform vec4 uInputSize;
uniform vec4 uInputClamp;

const float PI = 3.14159265358979323846264;

// Hard-assignment of DIST and ANGLE_STEP_SIZE instead of using uDistance and uQuality to allow them to be use on GLSL loop conditions
const float DIST = __DIST__;
const float ANGLE_STEP_SIZE = min(__ANGLE_STEP_SIZE__, PI * 2.);
const float ANGLE_STEP_NUM = ceil(PI * 2. / ANGLE_STEP_SIZE);
const float MAX_TOTAL_ALPHA = ANGLE_STEP_NUM * DIST * (DIST + 1.) / 2.;

void main(void) {
    vec2 px = vec2(1.) / uInputSize.xy;

    float totalAlpha = 0.;

    vec2 direction;
    vec2 displaced;
    vec4 curColor;

    for (float angle = 0.; angle < PI * 2.; angle += ANGLE_STEP_SIZE) {
      direction = vec2(cos(angle), sin(angle)) * px;

      for (float curDistance = 0.; curDistance < DIST; curDistance++) {
          displaced = clamp(vTextureCoord + direction * (curDistance + 1.), uInputClamp.xy, uInputClamp.zw);
          curColor = texture(uTexture, displaced);
          totalAlpha += (DIST - curDistance) * curColor.a;
      }
    }
    
    curColor = texture(uTexture, vTextureCoord);

    vec4 glowColor = vec4(uColor, uAlpha);
    bool knockout = uKnockout > .5;
    float innerStrength = uStrength[0];
    float outerStrength = uStrength[1];

    float alphaRatio = totalAlpha / MAX_TOTAL_ALPHA;
    float innerGlowAlpha = (1. - alphaRatio) * innerStrength * curColor.a * uAlpha;
    float innerGlowStrength = min(1., innerGlowAlpha);
    
    vec4 innerColor = mix(curColor, glowColor, innerGlowStrength);
    float outerGlowAlpha = alphaRatio * outerStrength * (1. - curColor.a) * uAlpha;
    float outerGlowStrength = min(1. - innerColor.a, outerGlowAlpha);
    vec4 outerGlowColor = outerGlowStrength * glowColor.rgba;

    if (knockout) {
      float resultAlpha = outerGlowAlpha + innerGlowAlpha;
      finalColor = vec4(glowColor.rgb * resultAlpha, resultAlpha);
    }
    else {
      finalColor = innerColor + outerGlowColor;
    }
}
`,_g=`struct GlowUniforms {
  uDistance: f32,
  uStrength: vec2<f32>,
  uColor: vec3<f32>,
  uAlpha: f32,
  uQuality: f32,
  uKnockout: f32,
};

struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> glowUniforms : GlowUniforms;

@fragment
fn mainFragment(
  @builtin(position) position: vec4<f32>,
  @location(0) uv : vec2<f32>
) -> @location(0) vec4<f32> {
  let quality = glowUniforms.uQuality;
  let distance = glowUniforms.uDistance;

  let dist: f32 = glowUniforms.uDistance;
  let angleStepSize: f32 = min(1. / quality / distance, PI * 2.0);
  let angleStepNum: f32 = ceil(PI * 2.0 / angleStepSize);

  let px: vec2<f32> = vec2<f32>(1.0 / gfu.uInputSize.xy);

  var totalAlpha: f32 = 0.0;

  var direction: vec2<f32>;
  var displaced: vec2<f32>;
  var curColor: vec4<f32>;

  for (var angle = 0.0; angle < PI * 2.0; angle += angleStepSize) {
    direction = vec2<f32>(cos(angle), sin(angle)) * px;
    for (var curDistance = 0.0; curDistance < dist; curDistance+=1) {
      displaced = vec2<f32>(clamp(uv + direction * (curDistance + 1.0), gfu.uInputClamp.xy, gfu.uInputClamp.zw));
      curColor = textureSample(uTexture, uSampler, displaced);
      totalAlpha += (dist - curDistance) * curColor.a;
    }
  }
    
  curColor = textureSample(uTexture, uSampler, uv);

  let glowColorRGB = glowUniforms.uColor;
  let glowAlpha = glowUniforms.uAlpha;
  let glowColor = vec4<f32>(glowColorRGB, glowAlpha);
  let knockout: bool = glowUniforms.uKnockout > 0.5;
  let innerStrength = glowUniforms.uStrength[0];
  let outerStrength = glowUniforms.uStrength[1];

  let alphaRatio: f32 = (totalAlpha / (angleStepNum * dist * (dist + 1.0) / 2.0));
  let innerGlowAlpha: f32 = (1.0 - alphaRatio) * innerStrength * curColor.a * glowAlpha;
  let innerGlowStrength: f32 = min(1.0, innerGlowAlpha);
  
  let innerColor: vec4<f32> = mix(curColor, glowColor, innerGlowStrength);
  let outerGlowAlpha: f32 = alphaRatio * outerStrength * (1. - curColor.a) * glowAlpha;
  let outerGlowStrength: f32 = min(1.0 - innerColor.a, outerGlowAlpha);
  let outerGlowColor: vec4<f32> = outerGlowStrength * glowColor.rgba;
  
  if (knockout) {
    let resultAlpha: f32 = outerGlowAlpha + innerGlowAlpha;
    return vec4<f32>(glowColor.rgb * resultAlpha, resultAlpha);
  }
  else {
    return innerColor + outerGlowColor;
  }
}

const PI: f32 = 3.14159265358979323846264;`,vg=Object.defineProperty,yg=(i,t,e)=>t in i?vg(i,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):i[t]=e,Fr=(i,t,e)=>(yg(i,typeof t!="symbol"?t+"":t,e),e);const bg=class Yl extends Y{constructor(t){t={...Yl.DEFAULT_OPTIONS,...t};const e=t.distance??10,n=t.quality??.1,r=W.from({vertex:{source:rt,entryPoint:"mainVertex"},fragment:{source:_g,entryPoint:"mainFragment"}}),s=H.from({vertex:nt,fragment:xg.replace(/__ANGLE_STEP_SIZE__/gi,`${(1/n/e).toFixed(7)}`).replace(/__DIST__/gi,`${e.toFixed(0)}.0`),name:"glow-filter"});super({gpuProgram:r,glProgram:s,resources:{glowUniforms:{uDistance:{value:e,type:"f32"},uStrength:{value:[t.innerStrength,t.outerStrength],type:"vec2<f32>"},uColor:{value:new Float32Array(3),type:"vec3<f32>"},uAlpha:{value:t.alpha,type:"f32"},uQuality:{value:n,type:"f32"},uKnockout:{value:t?.knockout??!1?1:0,type:"f32"}}},padding:e}),Fr(this,"uniforms"),Fr(this,"_color"),this.uniforms=this.resources.glowUniforms.uniforms,this._color=new K,this.color=t.color??16777215}get distance(){return this.uniforms.uDistance}set distance(t){this.uniforms.uDistance=this.padding=t}get innerStrength(){return this.uniforms.uStrength[0]}set innerStrength(t){this.uniforms.uStrength[0]=t}get outerStrength(){return this.uniforms.uStrength[1]}set outerStrength(t){this.uniforms.uStrength[1]=t}get color(){return this._color.value}set color(t){this._color.setValue(t);const[e,n,r]=this._color.toArray();this.uniforms.uColor[0]=e,this.uniforms.uColor[1]=n,this.uniforms.uColor[2]=r}get alpha(){return this.uniforms.uAlpha}set alpha(t){this.uniforms.uAlpha=t}get quality(){return this.uniforms.uQuality}set quality(t){this.uniforms.uQuality=t}get knockout(){return this.uniforms.uKnockout===1}set knockout(t){this.uniforms.uKnockout=t?1:0}};Fr(bg,"DEFAULT_OPTIONS",{distance:10,outerStrength:4,innerStrength:0,color:16777215,alpha:1,quality:.1,knockout:!1});var Sg=`precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec2 uDimensions;
uniform float uParallel;
uniform vec2 uLight;
uniform float uAspect;
uniform float uTime;
uniform vec3 uRay;

uniform vec4 uInputSize;

\${PERLIN}

void main(void) {
    vec2 uDimensions = uDimensions;
    bool uParallel = uParallel > 0.5;
    vec2 uLight = uLight;
    float uAspect = uAspect;

    vec2 coord = vTextureCoord * uInputSize.xy / uDimensions;

    float d;

    if (uParallel) {
        float _cos = uLight.x;
        float _sin = uLight.y;
        d = (_cos * coord.x) + (_sin * coord.y * uAspect);
    } else {
        float dx = coord.x - uLight.x / uDimensions.x;
        float dy = (coord.y - uLight.y / uDimensions.y) * uAspect;
        float dis = sqrt(dx * dx + dy * dy) + 0.00001;
        d = dy / dis;
    }

    float uTime = uTime;
    vec3 uRay = uRay;

    float gain = uRay[0];
    float lacunarity = uRay[1];
    float alpha = uRay[2];

    vec3 dir = vec3(d, d, 0.0);
    float noise = turb(dir + vec3(uTime, 0.0, 62.1 + uTime) * 0.05, vec3(480.0, 320.0, 480.0), lacunarity, gain);
    noise = mix(noise, 0.0, 0.3);
    //fade vertically.
    vec4 mist = vec4(vec3(noise), 1.0) * (1.0 - coord.y);
    mist.a = 1.0;
    // apply user alpha
    mist *= alpha;

    finalColor = texture(uTexture, vTextureCoord) + mist;
}
`,wg=`struct GodrayUniforms {
  uLight: vec2<f32>,
  uParallel: f32,
  uAspect: f32,
  uTime: f32,
  uRay: vec3<f32>,
  uDimensions: vec2<f32>,
};

struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> godrayUniforms : GodrayUniforms;

@fragment
fn mainFragment(
  @builtin(position) position: vec4<f32>,
  @location(0) uv : vec2<f32>
) -> @location(0) vec4<f32> {
  let uDimensions: vec2<f32> = godrayUniforms.uDimensions;
  let uParallel: bool = godrayUniforms.uParallel > 0.5;
  let uLight: vec2<f32> = godrayUniforms.uLight;
  let uAspect: f32 = godrayUniforms.uAspect;

  let coord: vec2<f32> = uv * gfu.uInputSize.xy / uDimensions;

  var d: f32;

  if (uParallel) {
    let _cos: f32 = uLight.x;
    let _sin: f32 = uLight.y;
    d = (_cos * coord.x) + (_sin * coord.y * uAspect);
  } else {
    let dx: f32 = coord.x - uLight.x / uDimensions.x;
    let dy: f32 = (coord.y - uLight.y / uDimensions.y) * uAspect;
    let dis: f32 = sqrt(dx * dx + dy * dy) + 0.00001;
    d = dy / dis;
  }

  let uTime: f32 = godrayUniforms.uTime;
  let uRay: vec3<f32> = godrayUniforms.uRay;
  
  let gain = uRay[0];
  let lacunarity = uRay[1];
  let alpha = uRay[2];

  let dir: vec3<f32> = vec3<f32>(d, d, 0.0);
  var noise: f32 = turb(dir + vec3<f32>(uTime, 0.0, 62.1 + uTime) * 0.05, vec3<f32>(480.0, 320.0, 480.0), lacunarity, gain);
  noise = mix(noise, 0.0, 0.3);
  //fade vertically.
  var mist: vec4<f32> = vec4<f32>(vec3<f32>(noise), 1.0) * (1.0 - coord.y);
  mist.a = 1.0;
  // apply user alpha
  mist *= alpha;
  return textureSample(uTexture, uSampler, uv) + mist;
}

\${PERLIN}`,Cg=`vec3 mod289(vec3 x)
{
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}
vec4 mod289(vec4 x)
{
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}
vec4 permute(vec4 x)
{
    return mod289(((x * 34.0) + 1.0) * x);
}
vec4 taylorInvSqrt(vec4 r)
{
    return 1.79284291400159 - 0.85373472095314 * r;
}
vec3 fade(vec3 t)
{
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}
// Classic Perlin noise, periodic variant
float pnoise(vec3 P, vec3 rep)
{
    vec3 Pi0 = mod(floor(P), rep); // Integer part, modulo period
    vec3 Pi1 = mod(Pi0 + vec3(1.0), rep); // Integer part + 1, mod period
    Pi0 = mod289(Pi0);
    Pi1 = mod289(Pi1);
    vec3 Pf0 = fract(P); // Fractional part for interpolation
    vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
    vec4 iy = vec4(Pi0.yy, Pi1.yy);
    vec4 iz0 = Pi0.zzzz;
    vec4 iz1 = Pi1.zzzz;
    vec4 ixy = permute(permute(ix) + iy);
    vec4 ixy0 = permute(ixy + iz0);
    vec4 ixy1 = permute(ixy + iz1);
    vec4 gx0 = ixy0 * (1.0 / 7.0);
    vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
    gx0 = fract(gx0);
    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
    vec4 sz0 = step(gz0, vec4(0.0));
    gx0 -= sz0 * (step(0.0, gx0) - 0.5);
    gy0 -= sz0 * (step(0.0, gy0) - 0.5);
    vec4 gx1 = ixy1 * (1.0 / 7.0);
    vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
    gx1 = fract(gx1);
    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
    vec4 sz1 = step(gz1, vec4(0.0));
    gx1 -= sz1 * (step(0.0, gx1) - 0.5);
    gy1 -= sz1 * (step(0.0, gy1) - 0.5);
    vec3 g000 = vec3(gx0.x, gy0.x, gz0.x);
    vec3 g100 = vec3(gx0.y, gy0.y, gz0.y);
    vec3 g010 = vec3(gx0.z, gy0.z, gz0.z);
    vec3 g110 = vec3(gx0.w, gy0.w, gz0.w);
    vec3 g001 = vec3(gx1.x, gy1.x, gz1.x);
    vec3 g101 = vec3(gx1.y, gy1.y, gz1.y);
    vec3 g011 = vec3(gx1.z, gy1.z, gz1.z);
    vec3 g111 = vec3(gx1.w, gy1.w, gz1.w);
    vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
    g000 *= norm0.x;
    g010 *= norm0.y;
    g100 *= norm0.z;
    g110 *= norm0.w;
    vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
    g001 *= norm1.x;
    g011 *= norm1.y;
    g101 *= norm1.z;
    g111 *= norm1.w;
    float n000 = dot(g000, Pf0);
    float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
    float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
    float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
    float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
    float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
    float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
    float n111 = dot(g111, Pf1);
    vec3 fade_xyz = fade(Pf0);
    vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
    vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
    float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
    return 2.2 * n_xyz;
}
float turb(vec3 P, vec3 rep, float lacunarity, float gain)
{
    float sum = 0.0;
    float sc = 1.0;
    float totalgain = 1.0;
    for (float i = 0.0; i < 6.0; i++)
    {
        sum += totalgain * pnoise(P * sc, rep);
        sc *= lacunarity;
        totalgain *= gain;
    }
    return abs(sum);
}
`,Tg=`// Taken from https://gist.github.com/munrocket/236ed5ba7e409b8bdf1ff6eca5dcdc39

fn moduloVec3(x: vec3<f32>, y: vec3<f32>) -> vec3<f32>
{
  return x - y * floor(x/y);
}
fn mod289Vec3(x: vec3<f32>) -> vec3<f32>
{
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}
fn mod289Vec4(x: vec4<f32>) -> vec4<f32>
{
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}
fn permute4(x: vec4<f32>) -> vec4<f32>
{
    return mod289Vec4(((x * 34.0) + 1.0) * x);
}
fn taylorInvSqrt(r: vec4<f32>) -> vec4<f32>
{
    return 1.79284291400159 - 0.85373472095314 * r;
}
fn fade3(t: vec3<f32>) -> vec3<f32>
{
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}
fn fade2(t: vec2<f32>) -> vec2<f32> { return t * t * t * (t * (t * 6. - 15.) + 10.); }

fn perlinNoise2(P: vec2<f32>) -> f32 {
  var Pi: vec4<f32> = floor(P.xyxy) + vec4<f32>(0., 0., 1., 1.);
  let Pf = fract(P.xyxy) - vec4<f32>(0., 0., 1., 1.);
  Pi = Pi % vec4<f32>(289.); // To avoid truncation effects in permutation
  let ix = Pi.xzxz;
  let iy = Pi.yyww;
  let fx = Pf.xzxz;
  let fy = Pf.yyww;
  let i = permute4(permute4(ix) + iy);
  var gx: vec4<f32> = 2. * fract(i * 0.0243902439) - 1.; // 1/41 = 0.024...
  let gy = abs(gx) - 0.5;
  let tx = floor(gx + 0.5);
  gx = gx - tx;
  var g00: vec2<f32> = vec2<f32>(gx.x, gy.x);
  var g10: vec2<f32> = vec2<f32>(gx.y, gy.y);
  var g01: vec2<f32> = vec2<f32>(gx.z, gy.z);
  var g11: vec2<f32> = vec2<f32>(gx.w, gy.w);
  let norm = 1.79284291400159 - 0.85373472095314 *
      vec4<f32>(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11));
  g00 = g00 * norm.x;
  g01 = g01 * norm.y;
  g10 = g10 * norm.z;
  g11 = g11 * norm.w;
  let n00 = dot(g00, vec2<f32>(fx.x, fy.x));
  let n10 = dot(g10, vec2<f32>(fx.y, fy.y));
  let n01 = dot(g01, vec2<f32>(fx.z, fy.z));
  let n11 = dot(g11, vec2<f32>(fx.w, fy.w));
  let fade_xy = fade2(Pf.xy);
  let n_x = mix(vec2<f32>(n00, n01), vec2<f32>(n10, n11), vec2<f32>(fade_xy.x));
  let n_xy = mix(n_x.x, n_x.y, fade_xy.y);
  return 2.3 * n_xy;
}

// Classic Perlin noise, periodic variant
fn perlinNoise3(P: vec3<f32>, rep: vec3<f32>) -> f32
{
    var Pi0: vec3<f32> = moduloVec3(floor(P), rep); // Integer part, modulo period
    var Pi1: vec3<f32> = moduloVec3(Pi0 + vec3<f32>(1.0), rep); // Integer part + 1, mod period
    Pi0 = mod289Vec3(Pi0);
    Pi1 = mod289Vec3(Pi1);
    let Pf0: vec3<f32> = fract(P); // Fractional part for interpolation
    let Pf1: vec3<f32> = Pf0 - vec3<f32>(1.0); // Fractional part - 1.0
    let ix: vec4<f32> = vec4<f32>(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
    let iy: vec4<f32> = vec4<f32>(Pi0.yy, Pi1.yy);
    let iz0: vec4<f32> = Pi0.zzzz;
    let iz1: vec4<f32> = Pi1.zzzz;
    let ixy: vec4<f32> = permute4(permute4(ix) + iy);
    let ixy0: vec4<f32> = permute4(ixy + iz0);
    let ixy1: vec4<f32> = permute4(ixy + iz1);
    var gx0: vec4<f32> = ixy0 * (1.0 / 7.0);
    var gy0: vec4<f32> = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
    gx0 = fract(gx0);
    let gz0: vec4<f32> = vec4<f32>(0.5) - abs(gx0) - abs(gy0);
    let sz0: vec4<f32> = step(gz0, vec4<f32>(0.0));
    gx0 -= sz0 * (step(vec4<f32>(0.0), gx0) - 0.5);
    gy0 -= sz0 * (step(vec4<f32>(0.0), gy0) - 0.5);
    var gx1: vec4<f32> = ixy1 * (1.0 / 7.0);
    var gy1: vec4<f32> = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
    gx1 = fract(gx1);
    let gz1: vec4<f32> = vec4<f32>(0.5) - abs(gx1) - abs(gy1);
    let sz1: vec4<f32> = step(gz1, vec4<f32>(0.0));
    gx1 -= sz1 * (step(vec4<f32>(0.0), gx1) - 0.5);
    gy1 -= sz1 * (step(vec4<f32>(0.0), gy1) - 0.5);
    var g000: vec3<f32> = vec3<f32>(gx0.x, gy0.x, gz0.x);
    var g100: vec3<f32> = vec3<f32>(gx0.y, gy0.y, gz0.y);
    var g010: vec3<f32> = vec3<f32>(gx0.z, gy0.z, gz0.z);
    var g110: vec3<f32> = vec3<f32>(gx0.w, gy0.w, gz0.w);
    var g001: vec3<f32> = vec3<f32>(gx1.x, gy1.x, gz1.x);
    var g101: vec3<f32> = vec3<f32>(gx1.y, gy1.y, gz1.y);
    var g011: vec3<f32> = vec3<f32>(gx1.z, gy1.z, gz1.z);
    var g111: vec3<f32> = vec3<f32>(gx1.w, gy1.w, gz1.w);
    let norm0: vec4<f32> = taylorInvSqrt(vec4<f32>(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
    g000 *= norm0.x;
    g010 *= norm0.y;
    g100 *= norm0.z;
    g110 *= norm0.w;
    let norm1: vec4<f32> = taylorInvSqrt(vec4<f32>(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
    g001 *= norm1.x;
    g011 *= norm1.y;
    g101 *= norm1.z;
    g111 *= norm1.w;
    let n000: f32 = dot(g000, Pf0);
    let n100: f32 = dot(g100, vec3<f32>(Pf1.x, Pf0.yz));
    let n010: f32 = dot(g010, vec3<f32>(Pf0.x, Pf1.y, Pf0.z));
    let n110: f32 = dot(g110, vec3<f32>(Pf1.xy, Pf0.z));
    let n001: f32 = dot(g001, vec3<f32>(Pf0.xy, Pf1.z));
    let n101: f32 = dot(g101, vec3<f32>(Pf1.x, Pf0.y, Pf1.z));
    let n011: f32 = dot(g011, vec3<f32>(Pf0.x, Pf1.yz));
    let n111: f32 = dot(g111, Pf1);
    let fade_xyz: vec3<f32> = fade3(Pf0);
    let n_z: vec4<f32> = mix(vec4<f32>(n000, n100, n010, n110), vec4<f32>(n001, n101, n011, n111), fade_xyz.z);
    let n_yz: vec2<f32> = mix(n_z.xy, n_z.zw, fade_xyz.y);
    let n_xyz: f32 = mix(n_yz.x, n_yz.y, fade_xyz.x);
    return 2.2 * n_xyz;
}
fn turb(P: vec3<f32>, rep: vec3<f32>, lacunarity: f32, gain: f32) -> f32
{
    var sum: f32 = 0.0;
    var sc: f32 = 1.0;
    var totalgain: f32 = 1.0;
    for (var i = 0.0; i < 6.0; i += 1)
    {
        sum += totalgain * perlinNoise3(P * sc, rep);
        sc *= lacunarity;
        totalgain *= gain;
    }
    return abs(sum);
}`,Ag=Object.defineProperty,Pg=(i,t,e)=>t in i?Ag(i,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):i[t]=e,ke=(i,t,e)=>(Pg(i,typeof t!="symbol"?t+"":t,e),e);const Mg=class jl extends Y{constructor(t){t={...jl.DEFAULT_OPTIONS,...t};const e=W.from({vertex:{source:rt,entryPoint:"mainVertex"},fragment:{source:wg.replace("${PERLIN}",Tg),entryPoint:"mainFragment"}}),n=H.from({vertex:nt,fragment:Sg.replace("${PERLIN}",Cg),name:"god-ray-filter"});super({gpuProgram:e,glProgram:n,resources:{godrayUniforms:{uLight:{value:new Float32Array(2),type:"vec2<f32>"},uParallel:{value:0,type:"f32"},uAspect:{value:0,type:"f32"},uTime:{value:t.time,type:"f32"},uRay:{value:new Float32Array(3),type:"vec3<f32>"},uDimensions:{value:new Float32Array(2),type:"vec2<f32>"}}}}),ke(this,"uniforms"),ke(this,"time",0),ke(this,"_angleLight",[0,0]),ke(this,"_angle",0),ke(this,"_center"),this.uniforms=this.resources.godrayUniforms.uniforms,Object.assign(this,t)}apply(t,e,n,r){const s=e.frame.width,o=e.frame.height;this.uniforms.uLight[0]=this.parallel?this._angleLight[0]:this._center.x,this.uniforms.uLight[1]=this.parallel?this._angleLight[1]:this._center.y,this.uniforms.uDimensions[0]=s,this.uniforms.uDimensions[1]=o,this.uniforms.uAspect=o/s,this.uniforms.uTime=this.time,t.applyFilter(this,e,n,r)}get angle(){return this._angle}set angle(t){this._angle=t;const e=t*Ve;this._angleLight[0]=Math.cos(e),this._angleLight[1]=Math.sin(e)}get parallel(){return this.uniforms.uParallel>.5}set parallel(t){this.uniforms.uParallel=t?1:0}get center(){return this._center}set center(t){Array.isArray(t)&&(t={x:t[0],y:t[1]}),this._center=t}get centerX(){return this.center.x}set centerX(t){this.center.x=t}get centerY(){return this.center.y}set centerY(t){this.center.y=t}get gain(){return this.uniforms.uRay[0]}set gain(t){this.uniforms.uRay[0]=t}get lacunarity(){return this.uniforms.uRay[1]}set lacunarity(t){this.uniforms.uRay[1]=t}get alpha(){return this.uniforms.uRay[2]}set alpha(t){this.uniforms.uRay[2]=t}};ke(Mg,"DEFAULT_OPTIONS",{angle:30,gain:.5,lacunarity:2.5,parallel:!0,time:0,center:{x:0,y:0},alpha:1});var Fg=`in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec3 uHsl;
uniform float uAlpha;
uniform float uColorize;

// https://en.wikipedia.org/wiki/Luma_(video)
const vec3 weight = vec3(0.299, 0.587, 0.114);

float getWeightedAverage(vec3 rgb) {
    return rgb.r * weight.r + rgb.g * weight.g + rgb.b * weight.b;
}

// https://gist.github.com/mairod/a75e7b44f68110e1576d77419d608786?permalink_comment_id=3195243#gistcomment-3195243
const vec3 k = vec3(0.57735, 0.57735, 0.57735);

vec3 hueShift(vec3 color, float angle) {
    float cosAngle = cos(angle);
    return vec3(
    color * cosAngle +
    cross(k, color) * sin(angle) +
    k * dot(k, color) * (1.0 - cosAngle)
    );
}

void main()
{
    vec4 color = texture(uTexture, vTextureCoord);
    vec3 resultRGB = color.rgb;

    float hue = uHsl[0];
    float saturation = uHsl[1];
    float lightness = uHsl[2];

    // colorize
    if (uColorize > 0.5) {
        resultRGB = vec3(getWeightedAverage(resultRGB), 0., 0.);
    }

    // hue
    resultRGB = hueShift(resultRGB, hue);

    // saturation
    // https://github.com/evanw/glfx.js/blob/master/src/filters/adjust/huesaturation.js
    float average = (resultRGB.r + resultRGB.g + resultRGB.b) / 3.0;

    if (saturation > 0.) {
        resultRGB += (average - resultRGB) * (1. - 1. / (1.001 - saturation));
    } else {
        resultRGB -= (average - resultRGB) * saturation;
    }

    // lightness
    resultRGB = mix(resultRGB, vec3(ceil(lightness)) * color.a, abs(lightness));

    // alpha
    finalColor = mix(color, vec4(resultRGB, color.a), uAlpha);
}
`,Ig=`struct HslUniforms {
  uHsl:vec3<f32>,
  uColorize:f32,
  uAlpha:f32,
};

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> hslUniforms : HslUniforms;

@fragment
fn mainFragment(
  @location(0) uv: vec2<f32>,
  @builtin(position) position: vec4<f32>
) -> @location(0) vec4<f32> {
    let color: vec4<f32> = textureSample(uTexture, uSampler, uv);
    var resultRGB: vec3<f32> = color.rgb;

    let hue: f32 = hslUniforms.uHsl[0];
    let saturation: f32 = hslUniforms.uHsl[1];
    let lightness: f32 = hslUniforms.uHsl[2];

    // colorize
    if (hslUniforms.uColorize > 0.5) {
        resultRGB = vec3<f32>(dot(color.rgb, vec3<f32>(0.299, 0.587, 0.114)), 0., 0.);
    }

    // hue
    resultRGB = hueShift(resultRGB, hue);

    // saturation
    // https://github.com/evanw/glfx.js/blob/master/src/filters/adjust/huesaturation.js
    let average: f32 = (resultRGB.r + resultRGB.g + resultRGB.b) / 3.0;

    if (saturation > 0.) {
        resultRGB += (average - resultRGB) * (1. - 1. / (1.001 - saturation));
    } else {
        resultRGB -= (average - resultRGB) * saturation;
    }

    // lightness
    resultRGB = mix(resultRGB, vec3<f32>(ceil(lightness)) * color.a, abs(lightness));

    // alpha
    return mix(color, vec4<f32>(resultRGB, color.a), hslUniforms.uAlpha);
}

// https://gist.github.com/mairod/a75e7b44f68110e1576d77419d608786?permalink_comment_id=3195243#gistcomment-3195243
const k: vec3<f32> = vec3(0.57735, 0.57735, 0.57735);

fn hueShift(color: vec3<f32>, angle: f32) -> vec3<f32> 
{
    let cosAngle: f32 = cos(angle);
    return vec3<f32>(
    color * cosAngle +
    cross(k, color) * sin(angle) +
    k * dot(k, color) * (1.0 - cosAngle)
    );
}`,Og=Object.defineProperty,Rg=(i,t,e)=>t in i?Og(i,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):i[t]=e,Ir=(i,t,e)=>(Rg(i,typeof t!="symbol"?t+"":t,e),e);const Eg=class ql extends Y{constructor(t){t={...ql.DEFAULT_OPTIONS,...t};const e=W.from({vertex:{source:rt,entryPoint:"mainVertex"},fragment:{source:Ig,entryPoint:"mainFragment"}}),n=H.from({vertex:nt,fragment:Fg,name:"hsl-adjustment-filter"});super({gpuProgram:e,glProgram:n,resources:{hslUniforms:{uHsl:{value:new Float32Array(3),type:"vec3<f32>"},uColorize:{value:t.colorize?1:0,type:"f32"},uAlpha:{value:t.alpha,type:"f32"}}}}),Ir(this,"uniforms"),Ir(this,"_hue"),this.uniforms=this.resources.hslUniforms.uniforms,Object.assign(this,t)}get hue(){return this._hue}set hue(t){this._hue=t,this.uniforms.uHsl[0]=t*(Math.PI/180)}get saturation(){return this.uniforms.uHsl[1]}set saturation(t){this.uniforms.uHsl[1]=t}get lightness(){return this.uniforms.uHsl[2]}set lightness(t){this.uniforms.uHsl[2]=t}get colorize(){return this.uniforms.uColorize===1}set colorize(t){this.uniforms.uColorize=t?1:0}get alpha(){return this.uniforms.uAlpha}set alpha(t){this.uniforms.uAlpha=t}};Ir(Eg,"DEFAULT_OPTIONS",{hue:0,saturation:0,lightness:0,colorize:!1,alpha:1});var Ug=`precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec2 uVelocity;
uniform int uKernelSize;
uniform float uOffset;

uniform vec4 uInputSize;

const int MAX_KERNEL_SIZE = 2048;

// Notice:
// the perfect way:
//    int kernelSize = min(uKernelSize, MAX_KERNELSIZE);
// BUT in real use-case , uKernelSize < MAX_KERNELSIZE almost always.
// So use uKernelSize directly.

void main(void)
{
    vec4 color = texture(uTexture, vTextureCoord);

    if (uKernelSize == 0)
    {
        finalColor = color;
        return;
    }

    vec2 velocity = uVelocity / uInputSize.xy;
    float offset = -uOffset / length(uVelocity) - 0.5;
    int k = uKernelSize - 1;

    for(int i = 0; i < MAX_KERNEL_SIZE - 1; i++) {
        if (i == k) {
            break;
        }
        vec2 bias = velocity * (float(i) / float(k) + offset);
        color += texture(uTexture, vTextureCoord + bias);
    }
    finalColor = color / float(uKernelSize);
}
`,zg=`struct MotionBlurUniforms {
  uVelocity: vec2<f32>,
  uKernelSize: f32,
  uOffset: f32,
};

struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> motionBlurUniforms : MotionBlurUniforms;

@fragment
fn mainFragment(
  @builtin(position) position: vec4<f32>,
  @location(0) uv : vec2<f32>
) -> @location(0) vec4<f32> {
  let uVelocity = motionBlurUniforms.uVelocity;
  let uKernelSize = motionBlurUniforms.uKernelSize;
  let uOffset = motionBlurUniforms.uOffset;

  let velocity: vec2<f32> = uVelocity / gfu.uInputSize.xy;
  let offset: f32 = -uOffset / length(uVelocity) - 0.5;
  let k: i32 = i32(min(uKernelSize - 1, MAX_KERNEL_SIZE - 1));

  var color: vec4<f32> = textureSample(uTexture, uSampler, uv);

  for(var i: i32 = 0; i < k; i += 1) {
    let bias: vec2<f32> = velocity * (f32(i) / f32(k) + offset);
    color += textureSample(uTexture, uSampler, uv + bias);
  }
  
  return select(color / f32(uKernelSize), textureSample(uTexture, uSampler, uv), uKernelSize == 0);
}

const MAX_KERNEL_SIZE: f32 = 2048;`,kg=Object.defineProperty,Lg=(i,t,e)=>t in i?kg(i,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):i[t]=e,Or=(i,t,e)=>(Lg(i,typeof t!="symbol"?t+"":t,e),e);const Bg=class Kl extends Y{constructor(...t){let e=t[0]??{};if(Array.isArray(e)||"x"in e&&"y"in e||e instanceof Mt){B("6.0.0","MotionBlurFilter constructor params are now options object. See params: { velocity, kernelSize, offset }");const s="x"in e?e.x:e[0],o="y"in e?e.y:e[1];e={velocity:{x:s,y:o}},t[1]!==void 0&&(e.kernelSize=t[1]),t[2]!==void 0&&(e.offset=t[2])}e={...Kl.DEFAULT_OPTIONS,...e};const n=W.from({vertex:{source:rt,entryPoint:"mainVertex"},fragment:{source:zg,entryPoint:"mainFragment"}}),r=H.from({vertex:nt,fragment:Ug,name:"motion-blur-filter"});super({gpuProgram:n,glProgram:r,resources:{motionBlurUniforms:{uVelocity:{value:e.velocity,type:"vec2<f32>"},uKernelSize:{value:Math.trunc(e.kernelSize??5),type:"i32"},uOffset:{value:e.offset,type:"f32"}}}}),Or(this,"uniforms"),Or(this,"_kernelSize"),this.uniforms=this.resources.motionBlurUniforms.uniforms,Object.assign(this,e)}get velocity(){return this.uniforms.uVelocity}set velocity(t){Array.isArray(t)&&(t={x:t[0],y:t[1]}),this.uniforms.uVelocity=t,this._updateDirty()}get velocityX(){return this.velocity.x}set velocityX(t){this.velocity.x=t,this._updateDirty()}get velocityY(){return this.velocity.y}set velocityY(t){this.velocity.y=t,this._updateDirty()}get kernelSize(){return this._kernelSize}set kernelSize(t){this._kernelSize=t,this._updateDirty()}get offset(){return this.uniforms.uOffset}set offset(t){this.uniforms.uOffset=t}_updateDirty(){this.padding=(Math.max(Math.abs(this.velocityX),Math.abs(this.velocityY))>>0)+1,this.uniforms.uKernelSize=this.velocityX!==0||this.velocityY!==0?this._kernelSize:0}};Or(Bg,"DEFAULT_OPTIONS",{velocity:{x:0,y:0},kernelSize:5,offset:0});var Dg=`in vec2 vTextureCoord;
out vec4 finalColor;

const int MAX_COLORS = \${MAX_COLORS};

uniform sampler2D uTexture;
uniform vec3 uOriginalColors[MAX_COLORS];
uniform vec3 uTargetColors[MAX_COLORS];
uniform float uTolerance;

void main(void)
{
    finalColor = texture(uTexture, vTextureCoord);

    float alpha = finalColor.a;
    if (alpha < 0.0001)
    {
      return;
    }

    vec3 color = finalColor.rgb / alpha;

    for(int i = 0; i < MAX_COLORS; i++)
    {
      vec3 origColor = uOriginalColors[i];
      if (origColor.r < 0.0)
      {
        break;
      }
      vec3 colorDiff = origColor - color;
      if (length(colorDiff) < uTolerance)
      {
        vec3 targetColor = uTargetColors[i];
        finalColor = vec4((targetColor + colorDiff) * alpha, alpha);
        return;
      }
    }
}
`,Ng=`struct MultiColorReplaceUniforms {
  uOriginalColors: array<vec3<f32>, MAX_COLORS>,
  uTargetColors: array<vec3<f32>, MAX_COLORS>,
  uTolerance:f32,
};

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> multiColorReplaceUniforms : MultiColorReplaceUniforms;

@fragment
fn mainFragment(
  @builtin(position) position: vec4<f32>,
  @location(0) uv : vec2<f32>
) -> @location(0) vec4<f32> {
  let uOriginalColors = multiColorReplaceUniforms.uOriginalColors;
  let uTargetColors = multiColorReplaceUniforms.uTargetColors;
  let uTolerance = multiColorReplaceUniforms.uTolerance;

  var color: vec4<f32> = textureSample(uTexture, uSampler, uv);

  let alpha: f32 = color.a;

  if (alpha > 0.0001)
  {
    var modColor: vec3<f32> = vec3<f32>(color.rgb) / alpha;

    for(var i: i32 = 0; i < MAX_COLORS; i += 1)
    {
      let origColor: vec3<f32> = uOriginalColors[i];
      if (origColor.r < 0.0)
      {
        break;
      }
      let colorDiff: vec3<f32> = origColor - modColor;
      
      if (length(colorDiff) < uTolerance)
      {
        let targetColor: vec3<f32> = uTargetColors[i];
        color = vec4((targetColor + colorDiff) * alpha, alpha);
        return color;
      }
    }
  }

  return color;
}

const MAX_COLORS: i32 = \${MAX_COLORS};`,Gg=Object.defineProperty,Vg=(i,t,e)=>t in i?Gg(i,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):i[t]=e,Qi=(i,t,e)=>(Vg(i,typeof t!="symbol"?t+"":t,e),e);const Wg=class Zl extends Y{constructor(...t){let e=t[0]??{};Array.isArray(e)&&(B("6.0.0","MultiColorReplaceFilter constructor params are now options object. See params: { replacements, tolerance, maxColors }"),e={replacements:e},t[1]&&(e.tolerance=t[1]),t[2]&&(e.maxColors=t[2])),e={...Zl.DEFAULT_OPTIONS,...e};const n=e.maxColors??e.replacements.length,r=W.from({vertex:{source:rt,entryPoint:"mainVertex"},fragment:{source:Ng.replace(/\$\{MAX_COLORS\}/g,n.toFixed(0)),entryPoint:"mainFragment"}}),s=H.from({vertex:nt,fragment:Dg.replace(/\$\{MAX_COLORS\}/g,n.toFixed(0)),name:"multi-color-replace-filter"});super({gpuProgram:r,glProgram:s,resources:{multiColorReplaceUniforms:{uOriginalColors:{value:new Float32Array(3*n),type:"vec3<f32>",size:n},uTargetColors:{value:new Float32Array(3*n),type:"vec3<f32>",size:n},uTolerance:{value:e.tolerance,type:"f32"}}}}),Qi(this,"uniforms"),Qi(this,"_replacements",[]),Qi(this,"_maxColors"),this._maxColors=n,this.uniforms=this.resources.multiColorReplaceUniforms.uniforms,this.replacements=e.replacements}set replacements(t){const e=this.uniforms.uOriginalColors,n=this.uniforms.uTargetColors,r=t.length,s=new K;if(r>this._maxColors)throw new Error(`Length of replacements (${r}) exceeds the maximum colors length (${this._maxColors})`);e[r*3]=-1;let o,a,l;for(let u=0;u<r;u++){const h=t[u];s.setValue(h[0]),[o,a,l]=s.toArray(),e[u*3]=o,e[u*3+1]=a,e[u*3+2]=l,s.setValue(h[1]),[o,a,l]=s.toArray(),n[u*3]=o,n[u*3+1]=a,n[u*3+2]=l}this._replacements=t}get replacements(){return this._replacements}refresh(){this.replacements=this._replacements}get maxColors(){return this._maxColors}get tolerance(){return this.uniforms.uTolerance}set tolerance(t){this.uniforms.uTolerance=t}set epsilon(t){B("6.0.0","MultiColorReplaceFilter.epsilon is deprecated, please use MultiColorReplaceFilter.tolerance instead"),this.tolerance=t}get epsilon(){return B("6.0.0","MultiColorReplaceFilter.epsilon is deprecated, please use MultiColorReplaceFilter.tolerance instead"),this.tolerance}};Qi(Wg,"DEFAULT_OPTIONS",{replacements:[[16711680,255]],tolerance:.05,maxColors:void 0});var $g=`precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform float uSepia;
uniform vec2 uNoise;
uniform vec3 uScratch;
uniform vec3 uVignetting;
uniform float uSeed;
uniform vec2 uDimensions;

uniform vec4 uInputSize;

const float SQRT_2 = 1.414213;
const vec3 SEPIA_RGB = vec3(112.0 / 255.0, 66.0 / 255.0, 20.0 / 255.0);

float rand(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

vec3 Overlay(vec3 src, vec3 dst)
{
    // if (dst <= 0.5) then: 2 * src * dst
    // if (dst > 0.5) then: 1 - 2 * (1 - dst) * (1 - src)
    return vec3((dst.x <= 0.5) ? (2.0 * src.x * dst.x) : (1.0 - 2.0 * (1.0 - dst.x) * (1.0 - src.x)),
                (dst.y <= 0.5) ? (2.0 * src.y * dst.y) : (1.0 - 2.0 * (1.0 - dst.y) * (1.0 - src.y)),
                (dst.z <= 0.5) ? (2.0 * src.z * dst.z) : (1.0 - 2.0 * (1.0 - dst.z) * (1.0 - src.z)));
}


void main()
{
    finalColor = texture(uTexture, vTextureCoord);
    vec3 color = finalColor.rgb;

    if (uSepia > 0.0)
    {
        float gray = (color.x + color.y + color.z) / 3.0;
        vec3 grayscale = vec3(gray);

        color = Overlay(SEPIA_RGB, grayscale);

        color = grayscale + uSepia * (color - grayscale);
    }

    vec2 coord = vTextureCoord * uInputSize.xy / uDimensions.xy;

    float vignette = uVignetting[0];
    float vignetteAlpha = uVignetting[1];
    float vignetteBlur = uVignetting[2];

    if (vignette > 0.0)
    {
        float outter = SQRT_2 - vignette * SQRT_2;
        vec2 dir = vec2(vec2(0.5, 0.5) - coord);
        dir.y *= uDimensions.y / uDimensions.x;
        float darker = clamp((outter - length(dir) * SQRT_2) / ( 0.00001 + vignetteBlur * SQRT_2), 0.0, 1.0);
        color.rgb *= darker + (1.0 - darker) * (1.0 - vignetteAlpha);
    }

    float scratch = uScratch[0];
    float scratchDensity = uScratch[1];
    float scratchWidth = uScratch[2];

    if (scratchDensity > uSeed && scratch != 0.0)
    {
        float phase = uSeed * 256.0;
        float s = mod(floor(phase), 2.0);
        float dist = 1.0 / scratchDensity;
        float d = distance(coord, vec2(uSeed * dist, abs(s - uSeed * dist)));
        if (d < uSeed * 0.6 + 0.4)
        {
            highp float period = scratchDensity * 10.0;

            float xx = coord.x * period + phase;
            float aa = abs(mod(xx, 0.5) * 4.0);
            float bb = mod(floor(xx / 0.5), 2.0);
            float yy = (1.0 - bb) * aa + bb * (2.0 - aa);

            float kk = 2.0 * period;
            float dw = scratchWidth / uDimensions.x * (0.75 + uSeed);
            float dh = dw * kk;

            float tine = (yy - (2.0 - dh));

            if (tine > 0.0) {
                float _sign = sign(scratch);

                tine = s * tine / period + scratch + 0.1;
                tine = clamp(tine + 1.0, 0.5 + _sign * 0.5, 1.5 + _sign * 0.5);

                color.rgb *= tine;
            }
        }
    }

    float noise = uNoise[0];
    float noiseSize = uNoise[1];

    if (noise > 0.0 && noiseSize > 0.0)
    {
        vec2 pixelCoord = vTextureCoord.xy * uInputSize.xy;
        pixelCoord.x = floor(pixelCoord.x / noiseSize);
        pixelCoord.y = floor(pixelCoord.y / noiseSize);
        // vec2 d = pixelCoord * noiseSize * vec2(1024.0 + uSeed * 512.0, 1024.0 - uSeed * 512.0);
        // float _noise = snoise(d) * 0.5;
        float _noise = rand(pixelCoord * noiseSize * uSeed) - 0.5;
        color += _noise * noise;
    }

    finalColor.rgb = color;
}`,Hg=`struct OldFilmUniforms {
    uSepia: f32,
    uNoise: vec2<f32>,
    uScratch: vec3<f32>,
    uVignetting: vec3<f32>,
    uSeed: f32,
    uDimensions: vec2<f32>,
};

struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> oldFilmUniforms : OldFilmUniforms;

@fragment
fn mainFragment(
  @builtin(position) position: vec4<f32>,
  @location(0) uv : vec2<f32>
) -> @location(0) vec4<f32> {
  var color: vec4<f32> = textureSample(uTexture, uSampler, uv);

  if (oldFilmUniforms.uSepia > 0.)
  {
    color = vec4<f32>(sepia(color.rgb), color.a);
  }

  let coord: vec2<f32> = uv * gfu.uInputSize.xy / oldFilmUniforms.uDimensions;

  if (oldFilmUniforms.uVignetting[0] > 0.)
  {
    color *= vec4<f32>(vec3<f32>(vignette(color.rgb, coord)), color.a);
  }

  let uScratch = oldFilmUniforms.uScratch; 

  if (uScratch[1] > oldFilmUniforms.uSeed && uScratch[0] != 0.)
  {
    color = vec4<f32>(scratch(color.rgb, coord), color.a);
  }

  let uNoise = oldFilmUniforms.uNoise;

  if (uNoise[0] > 0.0 && uNoise[1] > 0.0)
  {
    color += vec4<f32>(vec3<f32>(noise(uv)), color.a);
  }

  return color;
}

const SQRT_2: f32 = 1.414213;
const SEPIA_RGB: vec3<f32> = vec3<f32>(112.0 / 255.0, 66.0 / 255.0, 20.0 / 255.0);

fn modulo(x: f32, y: f32) -> f32
{
  return x - y * floor(x/y);
}

fn rand(co: vec2<f32>) -> f32
{
  return fract(sin(dot(co, vec2<f32>(12.9898, 78.233))) * 43758.5453);
}

fn overlay(src: vec3<f32>, dst: vec3<f32>) -> vec3<f32>
{
    // if (dst <= 0.5) then: 2 * src * dst
    // if (dst > 0.5) then: 1 - 2 * (1 - dst) * (1 - src)

    return vec3<f32>(
      select((1.0 - 2.0 * (1.0 - dst.x) * (1.0 - src.x)), (2.0 * src.x * dst.x), (dst.x <= 0.5)), 
      select((1.0 - 2.0 * (1.0 - dst.y) * (1.0 - src.y)), (2.0 * src.y * dst.y), (dst.y <= 0.5)),
      select((1.0 - 2.0 * (1.0 - dst.z) * (1.0 - src.z)), (2.0 * src.z * dst.z), (dst.z <= 0.5))
    );
}

fn sepia(co: vec3<f32>) -> vec3<f32>
{
  let gray: f32 = (co.x + co.y + co.z) / 3.0;
  let grayscale: vec3<f32> = vec3<f32>(gray);
  let color = overlay(SEPIA_RGB, grayscale);
  return grayscale + oldFilmUniforms.uSepia * (color - grayscale);
}

fn vignette(co: vec3<f32>, coord: vec2<f32>) -> f32
{
  let uVignetting = oldFilmUniforms.uVignetting;
  let uDimensions = oldFilmUniforms.uDimensions;
  
  let outter: f32 = SQRT_2 - uVignetting[0] * SQRT_2;
  var dir: vec2<f32> = vec2<f32>(vec2<f32>(0.5) - coord);
  dir.y *= uDimensions.y / uDimensions.x;
  let darker: f32 = clamp((outter - length(dir) * SQRT_2) / ( 0.00001 + uVignetting[2] * SQRT_2), 0.0, 1.0);
  return darker + (1.0 - darker) * (1.0 - uVignetting[1]);
}

fn scratch(co: vec3<f32>, coord: vec2<f32>) -> vec3<f32>
{
  var color = co;
  let uScratch = oldFilmUniforms.uScratch;
  let uSeed = oldFilmUniforms.uSeed;
  let uDimensions = oldFilmUniforms.uDimensions;

  let phase: f32 = uSeed * 256.0;
  let s: f32 = modulo(floor(phase), 2.0);
  let dist: f32 = 1.0 / uScratch[1];
  let d: f32 = distance(coord, vec2<f32>(uSeed * dist, abs(s - uSeed * dist)));

  if (d < uSeed * 0.6 + 0.4)
  {
    let period: f32 = uScratch[1] * 10.0;

    let xx: f32 = coord.x * period + phase;
    let aa: f32 = abs(modulo(xx, 0.5) * 4.0);
    let bb: f32 = modulo(floor(xx / 0.5), 2.0);
    let yy: f32 = (1.0 - bb) * aa + bb * (2.0 - aa);

    let kk: f32 = 2.0 * period;
    let dw: f32 = uScratch[2] / uDimensions.x * (0.75 + uSeed);
    let dh: f32 = dw * kk;

    var tine: f32 = (yy - (2.0 - dh));

    if (tine > 0.0) {
        let _sign: f32 = sign(uScratch[0]);

        tine = s * tine / period + uScratch[0] + 0.1;
        tine = clamp(tine + 1.0, 0.5 + _sign * 0.5, 1.5 + _sign * 0.5);

        color *= tine;
    }
  }

  return color;
}

fn noise(coord: vec2<f32>) -> f32
{
  let uNoise = oldFilmUniforms.uNoise;
  let uSeed = oldFilmUniforms.uSeed;

  var pixelCoord: vec2<f32> = coord * gfu.uInputSize.xy;
  pixelCoord.x = floor(pixelCoord.x / uNoise[1]);
  pixelCoord.y = floor(pixelCoord.y / uNoise[1]);
  return (rand(pixelCoord * uNoise[1] * uSeed) - 0.5) * uNoise[0];
}`,Xg=Object.defineProperty,Yg=(i,t,e)=>t in i?Xg(i,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):i[t]=e,Rr=(i,t,e)=>(Yg(i,typeof t!="symbol"?t+"":t,e),e);const jg=class Ql extends Y{constructor(t){t={...Ql.DEFAULT_OPTIONS,...t};const e=W.from({vertex:{source:rt,entryPoint:"mainVertex"},fragment:{source:Hg,entryPoint:"mainFragment"}}),n=H.from({vertex:nt,fragment:$g,name:"old-film-filter"});super({gpuProgram:e,glProgram:n,resources:{oldFilmUniforms:{uSepia:{value:t.sepia,type:"f32"},uNoise:{value:new Float32Array(2),type:"vec2<f32>"},uScratch:{value:new Float32Array(3),type:"vec3<f32>"},uVignetting:{value:new Float32Array(3),type:"vec3<f32>"},uSeed:{value:t.seed,type:"f32"},uDimensions:{value:new Float32Array(2),type:"vec2<f32>"}}}}),Rr(this,"uniforms"),Rr(this,"seed"),this.uniforms=this.resources.oldFilmUniforms.uniforms,Object.assign(this,t)}apply(t,e,n,r){this.uniforms.uDimensions[0]=e.frame.width,this.uniforms.uDimensions[1]=e.frame.height,this.uniforms.uSeed=this.seed,t.applyFilter(this,e,n,r)}get sepia(){return this.uniforms.uSepia}set sepia(t){this.uniforms.uSepia=t}get noise(){return this.uniforms.uNoise[0]}set noise(t){this.uniforms.uNoise[0]=t}get noiseSize(){return this.uniforms.uNoise[1]}set noiseSize(t){this.uniforms.uNoise[1]=t}get scratch(){return this.uniforms.uScratch[0]}set scratch(t){this.uniforms.uScratch[0]=t}get scratchDensity(){return this.uniforms.uScratch[1]}set scratchDensity(t){this.uniforms.uScratch[1]=t}get scratchWidth(){return this.uniforms.uScratch[2]}set scratchWidth(t){this.uniforms.uScratch[2]=t}get vignetting(){return this.uniforms.uVignetting[0]}set vignetting(t){this.uniforms.uVignetting[0]=t}get vignettingAlpha(){return this.uniforms.uVignetting[1]}set vignettingAlpha(t){this.uniforms.uVignetting[1]=t}get vignettingBlur(){return this.uniforms.uVignetting[2]}set vignettingBlur(t){this.uniforms.uVignetting[2]=t}};Rr(jg,"DEFAULT_OPTIONS",{sepia:.3,noise:.3,noiseSize:1,scratch:.5,scratchDensity:.3,scratchWidth:1,vignetting:.3,vignettingAlpha:1,vignettingBlur:.3,seed:0});var qg=`precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec2 uThickness;
uniform vec3 uColor;
uniform float uAlpha;
uniform float uKnockout;

uniform vec4 uInputClamp;

const float DOUBLE_PI = 2. * 3.14159265358979323846264;
const float ANGLE_STEP = \${ANGLE_STEP};

float outlineMaxAlphaAtPos(vec2 pos) {
    if (uThickness.x == 0. || uThickness.y == 0.) {
        return 0.;
    }

    vec4 displacedColor;
    vec2 displacedPos;
    float maxAlpha = 0.;

    for (float angle = 0.; angle <= DOUBLE_PI; angle += ANGLE_STEP) {
        displacedPos.x = vTextureCoord.x + uThickness.x * cos(angle);
        displacedPos.y = vTextureCoord.y + uThickness.y * sin(angle);
        displacedColor = texture(uTexture, clamp(displacedPos, uInputClamp.xy, uInputClamp.zw));
        maxAlpha = max(maxAlpha, displacedColor.a);
    }

    return maxAlpha;
}

void main(void) {
    vec4 sourceColor = texture(uTexture, vTextureCoord);
    vec4 contentColor = sourceColor * float(uKnockout < 0.5);
    float outlineAlpha = uAlpha * outlineMaxAlphaAtPos(vTextureCoord.xy) * (1.-sourceColor.a);
    vec4 outlineColor = vec4(vec3(uColor) * outlineAlpha, outlineAlpha);
    finalColor = contentColor + outlineColor;
}
`,Kg=`struct OutlineUniforms {
  uThickness:vec2<f32>,
  uColor:vec3<f32>,
  uAlpha:f32,
  uAngleStep:f32,
  uKnockout:f32,
};

struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> outlineUniforms : OutlineUniforms;

@fragment
fn mainFragment(
  @builtin(position) position: vec4<f32>,
  @location(0) uv : vec2<f32>
) -> @location(0) vec4<f32> {
  let sourceColor: vec4<f32> = textureSample(uTexture, uSampler, uv);
  let contentColor: vec4<f32> = sourceColor * (1. - outlineUniforms.uKnockout);
  
  let outlineAlpha: f32 = outlineUniforms.uAlpha * outlineMaxAlphaAtPos(uv) * (1. - sourceColor.a);
  let outlineColor: vec4<f32> = vec4<f32>(vec3<f32>(outlineUniforms.uColor) * outlineAlpha, outlineAlpha);
  
  return contentColor + outlineColor;
}

fn outlineMaxAlphaAtPos(uv: vec2<f32>) -> f32 {
  let thickness = outlineUniforms.uThickness;

  if (thickness.x == 0. || thickness.y == 0.) {
    return 0.;
  }
  
  let angleStep = outlineUniforms.uAngleStep;

  var displacedColor: vec4<f32>;
  var displacedPos: vec2<f32>;

  var maxAlpha: f32 = 0.;
  var displaced: vec2<f32>;
  var curColor: vec4<f32>;

  for (var angle = 0.; angle <= DOUBLE_PI; angle += angleStep)
  {
    displaced.x = uv.x + thickness.x * cos(angle);
    displaced.y = uv.y + thickness.y * sin(angle);
    curColor = textureSample(uTexture, uSampler, clamp(displaced, gfu.uInputClamp.xy, gfu.uInputClamp.zw));
    maxAlpha = max(maxAlpha, curColor.a);
  }

  return maxAlpha;
}

const DOUBLE_PI: f32 = 3.14159265358979323846264 * 2.;`,Zg=Object.defineProperty,Qg=(i,t,e)=>t in i?Zg(i,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):i[t]=e,Ce=(i,t,e)=>(Qg(i,typeof t!="symbol"?t+"":t,e),e);const vn=class be extends Y{constructor(...t){let e=t[0]??{};typeof e=="number"&&(B("6.0.0","OutlineFilter constructor params are now options object. See params: { thickness, color, quality, alpha, knockout }"),e={thickness:e},t[1]!==void 0&&(e.color=t[1]),t[2]!==void 0&&(e.quality=t[2]),t[3]!==void 0&&(e.alpha=t[3]),t[4]!==void 0&&(e.knockout=t[4])),e={...be.DEFAULT_OPTIONS,...e};const n=e.quality??.1,r=W.from({vertex:{source:rt,entryPoint:"mainVertex"},fragment:{source:Kg,entryPoint:"mainFragment"}}),s=H.from({vertex:nt,fragment:qg.replace(/\$\{ANGLE_STEP\}/,be.getAngleStep(n).toFixed(7)),name:"outline-filter"});super({gpuProgram:r,glProgram:s,resources:{outlineUniforms:{uThickness:{value:new Float32Array(2),type:"vec2<f32>"},uColor:{value:new Float32Array(3),type:"vec3<f32>"},uAlpha:{value:e.alpha,type:"f32"},uAngleStep:{value:0,type:"f32"},uKnockout:{value:e.knockout?1:0,type:"f32"}}}}),Ce(this,"uniforms"),Ce(this,"_thickness"),Ce(this,"_quality"),Ce(this,"_color"),this.uniforms=this.resources.outlineUniforms.uniforms,this.uniforms.uAngleStep=be.getAngleStep(n),this._color=new K,this.color=e.color??0,Object.assign(this,e)}apply(t,e,n,r){this.uniforms.uThickness[0]=this.thickness/e.source.width,this.uniforms.uThickness[1]=this.thickness/e.source.height,t.applyFilter(this,e,n,r)}static getAngleStep(t){return parseFloat((Math.PI*2/Math.max(t*be.MAX_SAMPLES,be.MIN_SAMPLES)).toFixed(7))}get thickness(){return this._thickness}set thickness(t){this._thickness=this.padding=t}get color(){return this._color.value}set color(t){this._color.setValue(t);const[e,n,r]=this._color.toArray();this.uniforms.uColor[0]=e,this.uniforms.uColor[1]=n,this.uniforms.uColor[2]=r}get alpha(){return this.uniforms.uAlpha}set alpha(t){this.uniforms.uAlpha=t}get quality(){return this._quality}set quality(t){this._quality=t,this.uniforms.uAngleStep=be.getAngleStep(t)}get knockout(){return this.uniforms.uKnockout===1}set knockout(t){this.uniforms.uKnockout=t?1:0}};Ce(vn,"DEFAULT_OPTIONS",{thickness:1,color:0,alpha:1,quality:.1,knockout:!1});Ce(vn,"MIN_SAMPLES",1);Ce(vn,"MAX_SAMPLES",100);let sr=vn;var Jg=`precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform float uRadian;
uniform vec2 uCenter;
uniform float uRadius;
uniform int uKernelSize;

uniform vec4 uInputSize;

const int MAX_KERNEL_SIZE = 2048;

void main(void)
{
    vec4 color = texture(uTexture, vTextureCoord);

    if (uKernelSize == 0)
    {
        finalColor = color;
        return;
    }

    float aspect = uInputSize.y / uInputSize.x;
    vec2 center = uCenter.xy / uInputSize.xy;
    float gradient = uRadius / uInputSize.x * 0.3;
    float radius = uRadius / uInputSize.x - gradient * 0.5;
    int k = uKernelSize - 1;

    vec2 coord = vTextureCoord;
    vec2 dir = vec2(center - coord);
    float dist = length(vec2(dir.x, dir.y * aspect));

    float radianStep = uRadian;
    if (radius >= 0.0 && dist > radius) {
        float delta = dist - radius;
        float gap = gradient;
        float scale = 1.0 - abs(delta / gap);
        if (scale <= 0.0) {
            finalColor = color;
            return;
        }
        radianStep *= scale;
    }
    radianStep /= float(k);

    float s = sin(radianStep);
    float c = cos(radianStep);
    mat2 rotationMatrix = mat2(vec2(c, -s), vec2(s, c));

    for(int i = 0; i < MAX_KERNEL_SIZE - 1; i++) {
        if (i == k) {
            break;
        }

        coord -= center;
        coord.y *= aspect;
        coord = rotationMatrix * coord;
        coord.y /= aspect;
        coord += center;

        vec4 sample = texture(uTexture, coord);

        // switch to pre-multiplied alpha to correctly blur transparent images
        // sample.rgb *= sample.a;

        color += sample;
    }

    finalColor = color / float(uKernelSize);
}
`,tx=`struct RadialBlurUniforms {
  uRadian: f32,
  uCenter: vec2<f32>,
  uKernelSize: f32,
  uRadius: f32,
};

struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> radialBlurUniforms : RadialBlurUniforms;

@fragment
fn mainFragment(
  @builtin(position) position: vec4<f32>,
  @location(0) uv : vec2<f32>
) -> @location(0) vec4<f32> {
  let uRadian = radialBlurUniforms.uRadian;
  let uCenter = radialBlurUniforms.uCenter;
  let uKernelSize = radialBlurUniforms.uKernelSize;
  let uRadius = radialBlurUniforms.uRadius;
  
  var returnColorOnly = false;

  if (uKernelSize == 0)
  {
    returnColorOnly = true;
  }

  let aspect: f32 = gfu.uInputSize.y / gfu.uInputSize.x;
  let center: vec2<f32> = uCenter.xy / gfu.uInputSize.xy;
  let gradient: f32 = uRadius / gfu.uInputSize.x * 0.3;
  let radius: f32 = uRadius / gfu.uInputSize.x - gradient * 0.5;
  let k: i32 = i32(uKernelSize - 1);

  var coord: vec2<f32> = uv;
  let dir: vec2<f32> = vec2<f32>(center - coord);
  let dist: f32 = length(vec2<f32>(dir.x, dir.y * aspect));

  var radianStep: f32 = uRadian;
  
  if (radius >= 0.0 && dist > radius)
  {
    let delta: f32 = dist - radius;
    let gap: f32 = gradient;
    let scale: f32 = 1.0 - abs(delta / gap);
    if (scale <= 0.0) {
      returnColorOnly = true;
    }
    radianStep *= scale;
  }

  radianStep /= f32(k);

  let s: f32 = sin(radianStep);
  let c: f32 = cos(radianStep);
  let rotationMatrix: mat2x2<f32> = mat2x2<f32>(vec2<f32>(c, -s), vec2<f32>(s, c));
  
  var color: vec4<f32> = textureSample(uTexture, uSampler, uv);
  let baseColor = vec4<f32>(color);

  let minK: i32 = min(i32(uKernelSize) - 1, MAX_KERNEL_SIZE - 1);

  for(var i: i32 = 0; i < minK; i += 1) 
  {
    coord -= center;
    coord.y *= aspect;
    coord = rotationMatrix * coord;
    coord.y /= aspect;
    coord += center;
    let sample: vec4<f32> = textureSample(uTexture, uSampler, coord);
    // switch to pre-multiplied alpha to correctly blur transparent images
    // sample.rgb *= sample.a;
    color += sample;
  }

  return select(color / f32(uKernelSize), baseColor, returnColorOnly);
}

const MAX_KERNEL_SIZE: i32 = 2048;`,ex=Object.defineProperty,ix=(i,t,e)=>t in i?ex(i,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):i[t]=e,Ji=(i,t,e)=>(ix(i,typeof t!="symbol"?t+"":t,e),e);const nx=class Jl extends Y{constructor(...t){let e=t[0]??{};if(typeof e=="number"){if(B("6.0.0","RadialBlurFilter constructor params are now options object. See params: { angle, center, kernelSize, radius }"),e={angle:e},t[1]){const s="x"in t[1]?t[1].x:t[1][0],o="y"in t[1]?t[1].y:t[1][1];e.center={x:s,y:o}}t[2]&&(e.kernelSize=t[2]),t[3]&&(e.radius=t[3])}e={...Jl.DEFAULT_OPTIONS,...e};const n=W.from({vertex:{source:rt,entryPoint:"mainVertex"},fragment:{source:tx,entryPoint:"mainFragment"}}),r=H.from({vertex:nt,fragment:Jg,name:"radial-blur-filter"});super({gpuProgram:n,glProgram:r,resources:{radialBlurUniforms:{uRadian:{value:0,type:"f32"},uCenter:{value:e.center,type:"vec2<f32>"},uKernelSize:{value:e.kernelSize,type:"i32"},uRadius:{value:e.radius,type:"f32"}}}}),Ji(this,"uniforms"),Ji(this,"_angle"),Ji(this,"_kernelSize"),this.uniforms=this.resources.radialBlurUniforms.uniforms,Object.assign(this,e)}_updateKernelSize(){this.uniforms.uKernelSize=this._angle!==0?this.kernelSize:0}get angle(){return this._angle}set angle(t){this._angle=t,this.uniforms.uRadian=t*Math.PI/180,this._updateKernelSize()}get center(){return this.uniforms.uCenter}set center(t){Array.isArray(t)&&(t={x:t[0],y:t[1]}),this.uniforms.uCenter=t}get centerX(){return this.center.x}set centerX(t){this.center.x=t}get centerY(){return this.center.y}set centerY(t){this.center.y=t}get kernelSize(){return this._kernelSize}set kernelSize(t){this._kernelSize=t,this._updateKernelSize()}get radius(){return this.uniforms.uRadius}set radius(t){this.uniforms.uRadius=t<0||t===1/0?-1:t}};Ji(nx,"DEFAULT_OPTIONS",{angle:0,center:{x:0,y:0},kernelSize:5,radius:-1});var rx=`precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform float uMirror;
uniform float uBoundary;
uniform vec2 uAmplitude;
uniform vec2 uWavelength;
uniform vec2 uAlpha;
uniform float uTime;
uniform vec2 uDimensions;

uniform vec4 uInputSize;
uniform vec4 uInputClamp;

float rand(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

void main(void)
{
    vec2 pixelCoord = vTextureCoord.xy * uInputSize.xy;
    vec2 coord = pixelCoord / uDimensions;

    if (coord.y < uBoundary) {
        finalColor = texture(uTexture, vTextureCoord);
        return;
    }

    float k = (coord.y - uBoundary) / (1. - uBoundary + 0.0001);
    float areaY = uBoundary * uDimensions.y / uInputSize.y;
    float v = areaY + areaY - vTextureCoord.y;
    float y = uMirror > 0.5 ? v : vTextureCoord.y;

    float _amplitude = ((uAmplitude.y - uAmplitude.x) * k + uAmplitude.x ) / uInputSize.x;
    float _waveLength = ((uWavelength.y - uWavelength.x) * k + uWavelength.x) / uInputSize.y;
    float _alpha = (uAlpha.y - uAlpha.x) * k + uAlpha.x;

    float x = vTextureCoord.x + cos(v * 6.28 / _waveLength - uTime) * _amplitude;
    x = clamp(x, uInputClamp.x, uInputClamp.z);

    vec4 color = texture(uTexture, vec2(x, y));

    finalColor = color * _alpha;
}
`,sx=`struct ReflectionUniforms {
  uMirror: f32,
  uBoundary: f32,
  uAmplitude: vec2<f32>,
  uWavelength: vec2<f32>,
  uAlpha: vec2<f32>,
  uTime: f32,
  uDimensions: vec2<f32>,
};

struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> reflectionUniforms : ReflectionUniforms;

@fragment
fn mainFragment(
  @builtin(position) position: vec4<f32>,
  @location(0) uv : vec2<f32>
) -> @location(0) vec4<f32> {
  let uDimensions: vec2<f32> = reflectionUniforms.uDimensions;
  let uBoundary: f32 = reflectionUniforms.uBoundary;
  let uMirror: bool = reflectionUniforms.uMirror > 0.5;
  let uAmplitude: vec2<f32> = reflectionUniforms.uAmplitude;
  let uWavelength: vec2<f32> = reflectionUniforms.uWavelength;
  let uAlpha: vec2<f32> = reflectionUniforms.uAlpha;
  let uTime: f32 = reflectionUniforms.uTime;

  let pixelCoord: vec2<f32> = uv * gfu.uInputSize.xy;
  let coord: vec2<f32> = pixelCoord /uDimensions;
  var returnColorOnly: bool = false;

  if (coord.y < uBoundary) {
    returnColorOnly = true;
  }

  let k: f32 = (coord.y - uBoundary) / (1. - uBoundary + 0.0001);
  let areaY: f32 = uBoundary * uDimensions.y / gfu.uInputSize.y;
  let v: f32 = areaY + areaY - uv.y;
  let y: f32 = select(uv.y, v, uMirror);

  let amplitude: f32 = ((uAmplitude.y - uAmplitude.x) * k + uAmplitude.x ) / gfu.uInputSize.x;
  let waveLength: f32 = ((uWavelength.y - uWavelength.x) * k + uWavelength.x) / gfu.uInputSize.y;
  let alpha: f32 = select((uAlpha.y - uAlpha.x) * k + uAlpha.x, 1., returnColorOnly);

  var x: f32 = uv.x + cos(v * 6.28 / waveLength - uTime) * amplitude;
  x = clamp(x, gfu.uInputClamp.x, gfu.uInputClamp.z);
  
  return textureSample(uTexture, uSampler, select(vec2<f32>(x, y), uv, returnColorOnly)) * alpha;
}

fn rand(co: vec2<f32>) -> f32 
{
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}`,ox=Object.defineProperty,ax=(i,t,e)=>t in i?ox(i,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):i[t]=e,Er=(i,t,e)=>(ax(i,typeof t!="symbol"?t+"":t,e),e);const lx=class tu extends Y{constructor(t){t={...tu.DEFAULT_OPTIONS,...t};const e=W.from({vertex:{source:rt,entryPoint:"mainVertex"},fragment:{source:sx,entryPoint:"mainFragment"}}),n=H.from({vertex:nt,fragment:rx,name:"reflection-filter"});super({gpuProgram:e,glProgram:n,resources:{reflectionUniforms:{uMirror:{value:t.mirror?1:0,type:"f32"},uBoundary:{value:t.boundary,type:"f32"},uAmplitude:{value:t.amplitude,type:"vec2<f32>"},uWavelength:{value:t.waveLength,type:"vec2<f32>"},uAlpha:{value:t.alpha,type:"vec2<f32>"},uTime:{value:t.time,type:"f32"},uDimensions:{value:new Float32Array(2),type:"vec2<f32>"}}}}),Er(this,"uniforms"),Er(this,"time",0),this.uniforms=this.resources.reflectionUniforms.uniforms,Object.assign(this,t)}apply(t,e,n,r){this.uniforms.uDimensions[0]=e.frame.width,this.uniforms.uDimensions[1]=e.frame.height,this.uniforms.uTime=this.time,t.applyFilter(this,e,n,r)}get mirror(){return this.uniforms.uMirror>.5}set mirror(t){this.uniforms.uMirror=t?1:0}get boundary(){return this.uniforms.uBoundary}set boundary(t){this.uniforms.uBoundary=t}get amplitude(){return Array.from(this.uniforms.uAmplitude)}set amplitude(t){this.uniforms.uAmplitude[0]=t[0],this.uniforms.uAmplitude[1]=t[1]}get amplitudeStart(){return this.uniforms.uAmplitude[0]}set amplitudeStart(t){this.uniforms.uAmplitude[0]=t}get amplitudeEnd(){return this.uniforms.uAmplitude[1]}set amplitudeEnd(t){this.uniforms.uAmplitude[1]=t}get waveLength(){return Array.from(this.uniforms.uWavelength)}set waveLength(t){this.uniforms.uWavelength[0]=t[0],this.uniforms.uWavelength[1]=t[1]}get wavelengthStart(){return this.uniforms.uWavelength[0]}set wavelengthStart(t){this.uniforms.uWavelength[0]=t}get wavelengthEnd(){return this.uniforms.uWavelength[1]}set wavelengthEnd(t){this.uniforms.uWavelength[1]=t}get alpha(){return Array.from(this.uniforms.uAlpha)}set alpha(t){this.uniforms.uAlpha[0]=t[0],this.uniforms.uAlpha[1]=t[1]}get alphaStart(){return this.uniforms.uAlpha[0]}set alphaStart(t){this.uniforms.uAlpha[0]=t}get alphaEnd(){return this.uniforms.uAlpha[1]}set alphaEnd(t){this.uniforms.uAlpha[1]=t}};Er(lx,"DEFAULT_OPTIONS",{mirror:!0,boundary:.5,amplitude:[0,20],waveLength:[30,100],alpha:[1,1],time:0});var ux=`precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec4 uInputSize;
uniform vec2 uRed;
uniform vec2 uGreen;
uniform vec2 uBlue;

void main(void)
{
   float r = texture(uTexture, vTextureCoord + uRed/uInputSize.xy).r;
   float g = texture(uTexture, vTextureCoord + uGreen/uInputSize.xy).g;
   float b = texture(uTexture, vTextureCoord + uBlue/uInputSize.xy).b;
   float a = texture(uTexture, vTextureCoord).a;
   finalColor = vec4(r, g, b, a);
}
`,hx=`struct RgbSplitUniforms {
    uRed: vec2<f32>,
    uGreen: vec2<f32>,
    uBlue: vec3<f32>,
};

struct GlobalFilterUniforms {
    uInputSize:vec4<f32>,
    uInputPixel:vec4<f32>,
    uInputClamp:vec4<f32>,
    uOutputFrame:vec4<f32>,
    uGlobalFrame:vec4<f32>,
    uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> rgbSplitUniforms : RgbSplitUniforms;

@fragment
fn mainFragment(
    @builtin(position) position: vec4<f32>,
    @location(0) uv : vec2<f32>
) -> @location(0) vec4<f32> {
    let r = textureSample(uTexture, uSampler, uv + vec2<f32>(rgbSplitUniforms.uRed.x / gfu.uInputSize.x, rgbSplitUniforms.uRed.y / gfu.uInputSize.y)).r;
    let g = textureSample(uTexture, uSampler, uv + vec2<f32>(rgbSplitUniforms.uGreen.x / gfu.uInputSize.x, rgbSplitUniforms.uGreen.y / gfu.uInputSize.y)).g;
    let b = textureSample(uTexture, uSampler, uv + vec2<f32>(rgbSplitUniforms.uBlue.x / gfu.uInputSize.x, rgbSplitUniforms.uBlue.y / gfu.uInputSize.y)).b;
    let a = textureSample(uTexture, uSampler, uv).a;
    return vec4<f32>(r, g, b, a);
}
`,cx=Object.defineProperty,fx=(i,t,e)=>t in i?cx(i,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):i[t]=e,eu=(i,t,e)=>(fx(i,typeof t!="symbol"?t+"":t,e),e);const dx=class iu extends Y{constructor(...t){let e=t[0]??{};(Array.isArray(e)||"x"in e&&"y"in e)&&(B("6.0.0","RGBSplitFilter constructor params are now options object. See params: { red, green, blue }"),e={red:e},t[1]!==void 0&&(e.green=t[1]),t[2]!==void 0&&(e.blue=t[2])),e={...iu.DEFAULT_OPTIONS,...e};const n=W.from({vertex:{source:rt,entryPoint:"mainVertex"},fragment:{source:hx,entryPoint:"mainFragment"}}),r=H.from({vertex:nt,fragment:ux,name:"rgb-split-filter"});super({gpuProgram:n,glProgram:r,resources:{rgbSplitUniforms:{uRed:{value:e.red,type:"vec2<f32>"},uGreen:{value:e.green,type:"vec2<f32>"},uBlue:{value:e.blue,type:"vec2<f32>"}}}}),eu(this,"uniforms"),this.uniforms=this.resources.rgbSplitUniforms.uniforms,Object.assign(this,e)}get red(){return this.uniforms.uRed}set red(t){Array.isArray(t)&&(t={x:t[0],y:t[1]}),this.uniforms.uRed=t}get redX(){return this.red.x}set redX(t){this.red.x=t}get redY(){return this.red.y}set redY(t){this.red.y=t}get green(){return this.uniforms.uGreen}set green(t){Array.isArray(t)&&(t={x:t[0],y:t[1]}),this.uniforms.uGreen=t}get greenX(){return this.green.x}set greenX(t){this.green.x=t}get greenY(){return this.green.y}set greenY(t){this.green.y=t}get blue(){return this.uniforms.uBlue}set blue(t){Array.isArray(t)&&(t={x:t[0],y:t[1]}),this.uniforms.uBlue=t}get blueX(){return this.blue.x}set blueX(t){this.blue.x=t}get blueY(){return this.blue.y}set blueY(t){this.blue.y=t}};eu(dx,"DEFAULT_OPTIONS",{red:{x:-10,y:0},green:{x:0,y:10},blue:{x:0,y:0}});var px=`
precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec2 uCenter;
uniform float uTime;
uniform float uSpeed;
uniform vec4 uWave;

uniform vec4 uInputSize;
uniform vec4 uInputClamp;

const float PI = 3.14159;

void main()
{
    float uAmplitude = uWave[0];
    float uWavelength = uWave[1];
    float uBrightness = uWave[2];
    float uRadius = uWave[3];

    float halfWavelength = uWavelength * 0.5 / uInputSize.x;
    float maxRadius = uRadius / uInputSize.x;
    float currentRadius = uTime * uSpeed / uInputSize.x;

    float fade = 1.0;

    if (maxRadius > 0.0) {
        if (currentRadius > maxRadius) {
            finalColor = texture(uTexture, vTextureCoord);
            return;
        }
        fade = 1.0 - pow(currentRadius / maxRadius, 2.0);
    }

    vec2 dir = vec2(vTextureCoord - uCenter / uInputSize.xy);
    dir.y *= uInputSize.y / uInputSize.x;
    float dist = length(dir);

    if (dist <= 0.0 || dist < currentRadius - halfWavelength || dist > currentRadius + halfWavelength) {
        finalColor = texture(uTexture, vTextureCoord);
        return;
    }

    vec2 diffUV = normalize(dir);

    float diff = (dist - currentRadius) / halfWavelength;

    float p = 1.0 - pow(abs(diff), 2.0);

    // float powDiff = diff * pow(p, 2.0) * ( amplitude * fade );
    float powDiff = 1.25 * sin(diff * PI) * p * ( uAmplitude * fade );

    vec2 offset = diffUV * powDiff / uInputSize.xy;

    // Do clamp :
    vec2 coord = vTextureCoord + offset;
    vec2 clampedCoord = clamp(coord, uInputClamp.xy, uInputClamp.zw);
    vec4 color = texture(uTexture, clampedCoord);
    if (coord != clampedCoord) {
        color *= max(0.0, 1.0 - length(coord - clampedCoord));
    }

    // No clamp :
    // finalColor = texture(uTexture, vTextureCoord + offset);

    color.rgb *= 1.0 + (uBrightness - 1.0) * p * fade;

    finalColor = color;
}
`,mx=`
struct ShockWaveUniforms {
    uTime: f32,
    uOffset: vec2<f32>,
    uSpeed: f32,
    uWave: vec4<f32>,
};

struct GlobalFilterUniforms {
    uInputSize:vec4<f32>,
    uInputPixel:vec4<f32>,
    uInputClamp:vec4<f32>,
    uOutputFrame:vec4<f32>,
    uGlobalFrame:vec4<f32>,
    uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> shockwaveUniforms : ShockWaveUniforms;

@fragment
fn mainFragment(
    @builtin(position) position: vec4<f32>,
    @location(0) uv : vec2<f32>
) -> @location(0) vec4<f32> {

    let uTime = shockwaveUniforms.uTime;
    let uOffset = shockwaveUniforms.uOffset;
    let uSpeed = shockwaveUniforms.uSpeed;
    let uAmplitude = shockwaveUniforms.uWave[0];
    let uWavelength = shockwaveUniforms.uWave[1];
    let uBrightness = shockwaveUniforms.uWave[2];
    let uRadius = shockwaveUniforms.uWave[3];
    let halfWavelength: f32 = uWavelength * 0.5 / gfu.uInputSize.x;
    let maxRadius: f32 = uRadius / gfu.uInputSize.x;
    let currentRadius: f32 = uTime * uSpeed / gfu.uInputSize.x;
    var fade: f32 = 1.0;
    var returnColorOnly: bool = false;
    
    if (maxRadius > 0.0) {
        if (currentRadius > maxRadius) {
            returnColorOnly = true;
        }
        fade = 1.0 - pow(currentRadius / maxRadius, 2.0);
    }
    var dir: vec2<f32> = vec2<f32>(uv - uOffset / gfu.uInputSize.xy);
    dir.y *= gfu.uInputSize.y / gfu.uInputSize.x;

    let dist:f32 = length(dir);

    if (dist <= 0.0 || dist < currentRadius - halfWavelength || dist > currentRadius + halfWavelength) {
        returnColorOnly = true;
    }

    let diffUV: vec2<f32> = normalize(dir);
    let diff: f32 = (dist - currentRadius) / halfWavelength;
    let p: f32 = 1.0 - pow(abs(diff), 2.0);
    let powDiff: f32 = 1.25 * sin(diff * PI) * p * ( uAmplitude * fade );
    let offset: vec2<f32> = diffUV * powDiff / gfu.uInputSize.xy;
    // Do clamp :
    let coord: vec2<f32> = uv + offset;
    let clampedCoord: vec2<f32> = clamp(coord, gfu.uInputClamp.xy, gfu.uInputClamp.zw);

    var clampedColor: vec4<f32> = textureSample(uTexture, uSampler, clampedCoord);
    
    if (boolVec2(coord, clampedCoord)) 
    {
        clampedColor *= max(0.0, 1.0 - length(coord - clampedCoord));
    }
    // No clamp :
    var finalColor = clampedColor;

    return select(finalColor, textureSample(uTexture, uSampler, uv), returnColorOnly);
}

fn boolVec2(x: vec2<f32>, y: vec2<f32>) -> bool
{
    if (x.x == y.x && x.y == y.y)
    {
        return true;
    }
    
    return false;
}

const PI: f32 = 3.14159265358979323846264;
`,gx=Object.defineProperty,xx=(i,t,e)=>t in i?gx(i,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):i[t]=e,Ur=(i,t,e)=>(xx(i,typeof t!="symbol"?t+"":t,e),e);const _x=class nu extends Y{constructor(...t){let e=t[0]??{};(Array.isArray(e)||"x"in e&&"y"in e)&&(B("6.0.0","ShockwaveFilter constructor params are now options object. See params: { center, speed, amplitude, wavelength, brightness, radius, time }"),e={center:e,...t[1]},t[2]!==void 0&&(e.time=t[2])),e={...nu.DEFAULT_OPTIONS,...e};const n=W.from({vertex:{source:rt,entryPoint:"mainVertex"},fragment:{source:mx,entryPoint:"mainFragment"}}),r=H.from({vertex:nt,fragment:px,name:"shockwave-filter"});super({gpuProgram:n,glProgram:r,resources:{shockwaveUniforms:{uTime:{value:e.time,type:"f32"},uCenter:{value:e.center,type:"vec2<f32>"},uSpeed:{value:e.speed,type:"f32"},uWave:{value:new Float32Array(4),type:"vec4<f32>"}}}}),Ur(this,"uniforms"),Ur(this,"time"),this.time=0,this.uniforms=this.resources.shockwaveUniforms.uniforms,Object.assign(this,e)}apply(t,e,n,r){this.uniforms.uTime=this.time,t.applyFilter(this,e,n,r)}get center(){return this.uniforms.uCenter}set center(t){Array.isArray(t)&&(t={x:t[0],y:t[1]}),this.uniforms.uCenter=t}get centerX(){return this.uniforms.uCenter.x}set centerX(t){this.uniforms.uCenter.x=t}get centerY(){return this.uniforms.uCenter.y}set centerY(t){this.uniforms.uCenter.y=t}get speed(){return this.uniforms.uSpeed}set speed(t){this.uniforms.uSpeed=t}get amplitude(){return this.uniforms.uWave[0]}set amplitude(t){this.uniforms.uWave[0]=t}get wavelength(){return this.uniforms.uWave[1]}set wavelength(t){this.uniforms.uWave[1]=t}get brightness(){return this.uniforms.uWave[2]}set brightness(t){this.uniforms.uWave[2]=t}get radius(){return this.uniforms.uWave[3]}set radius(t){this.uniforms.uWave[3]=t}};Ur(_x,"DEFAULT_OPTIONS",{center:{x:0,y:0},speed:500,amplitude:30,wavelength:160,brightness:1,radius:-1});var vx=`precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform sampler2D uMapTexture;
uniform vec3 uColor;
uniform float uAlpha;
uniform vec2 uDimensions;

uniform vec4 uInputSize;

void main() {
    vec4 diffuseColor = texture(uTexture, vTextureCoord);
    vec2 lightCoord = (vTextureCoord * uInputSize.xy) / uDimensions;
    vec4 light = texture(uMapTexture, lightCoord);
    vec3 ambient = uColor.rgb * uAlpha;
    vec3 intensity = ambient + light.rgb;
    vec3 color = diffuseColor.rgb * intensity;
    finalColor = vec4(color, diffuseColor.a);
}
`,yx=`struct SimpleLightmapUniforms {
  uColor: vec3<f32>,
  uAlpha: f32,
  uDimensions: vec2<f32>,
};

struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> simpleLightmapUniforms : SimpleLightmapUniforms;
@group(1) @binding(1) var uMapTexture: texture_2d<f32>;
@group(1) @binding(2) var uMapSampler: sampler;

@fragment
fn mainFragment(
  @builtin(position) position: vec4<f32>,
  @location(0) uv : vec2<f32>,
) -> @location(0) vec4<f32> {
  let uColor = simpleLightmapUniforms.uColor;
  let uAlpha = simpleLightmapUniforms.uAlpha;
  let uDimensions = simpleLightmapUniforms.uDimensions;

  let diffuseColor: vec4<f32> = textureSample(uTexture, uSampler, uv);
  let lightCoord: vec2<f32> = (uv * gfu.uInputSize.xy) / simpleLightmapUniforms.uDimensions;
  let light: vec4<f32> = textureSample(uMapTexture, uMapSampler, lightCoord);
  let ambient: vec3<f32> = uColor * uAlpha;
  let intensity: vec3<f32> = ambient + light.rgb;
  let finalColor: vec3<f32> = diffuseColor.rgb * intensity;
  return vec4<f32>(finalColor, diffuseColor.a);
}`,bx=Object.defineProperty,Sx=(i,t,e)=>t in i?bx(i,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):i[t]=e,tn=(i,t,e)=>(Sx(i,typeof t!="symbol"?t+"":t,e),e);const wx=class ru extends Y{constructor(...t){let e=t[0]??{};if(e instanceof k&&(B("6.0.0","SimpleLightmapFilter constructor params are now options object. See params: { lightMap, color, alpha }"),e={lightMap:e},t[1]!==void 0&&(e.color=t[1]),t[2]!==void 0&&(e.alpha=t[2])),e={...ru.DEFAULT_OPTIONS,...e},!e.lightMap)throw Error("No light map texture source was provided to SimpleLightmapFilter");const n=W.from({vertex:{source:rt,entryPoint:"mainVertex"},fragment:{source:yx,entryPoint:"mainFragment"}}),r=H.from({vertex:nt,fragment:vx,name:"simple-lightmap-filter"});super({gpuProgram:n,glProgram:r,resources:{simpleLightmapUniforms:{uColor:{value:new Float32Array(3),type:"vec3<f32>"},uAlpha:{value:e.alpha,type:"f32"},uDimensions:{value:new Float32Array(2),type:"vec2<f32>"}},uMapTexture:e.lightMap.source,uMapSampler:e.lightMap.source.style}}),tn(this,"uniforms"),tn(this,"_color"),tn(this,"_lightMap"),this.uniforms=this.resources.simpleLightmapUniforms.uniforms,this._color=new K,this.color=e.color??0,Object.assign(this,e)}apply(t,e,n,r){this.uniforms.uDimensions[0]=e.frame.width,this.uniforms.uDimensions[1]=e.frame.height,t.applyFilter(this,e,n,r)}get lightMap(){return this._lightMap}set lightMap(t){this._lightMap=t,this.resources.uMapTexture=t.source,this.resources.uMapSampler=t.source.style}get color(){return this._color.value}set color(t){this._color.setValue(t);const[e,n,r]=this._color.toArray();this.uniforms.uColor[0]=e,this.uniforms.uColor[1]=n,this.uniforms.uColor[2]=r}get alpha(){return this.uniforms.uAlpha}set alpha(t){this.uniforms.uAlpha=t}};tn(wx,"DEFAULT_OPTIONS",{lightMap:k.WHITE,color:0,alpha:1});var Cx=`in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec2 uBlur;
uniform vec2 uStart;
uniform vec2 uEnd;
uniform vec2 uDelta;
uniform vec2 uDimensions;

float random(vec3 scale, float seed)
{
    return fract(sin(dot(gl_FragCoord.xyz + seed, scale)) * 43758.5453 + seed);
}

void main(void)
{
    vec4 color = vec4(0.0);
    float total = 0.0;

    float blur = uBlur[0];
    float gradientBlur = uBlur[1];

    float offset = random(vec3(12.9898, 78.233, 151.7182), 0.0);
    vec2 normal = normalize(vec2(uStart.y - uEnd.y, uEnd.x - uStart.x));
    float radius = smoothstep(0.0, 1.0, abs(dot(vTextureCoord * uDimensions - uStart, normal)) / gradientBlur) * blur;

    for (float t = -30.0; t <= 30.0; t++)
    {
        float percent = (t + offset - 0.5) / 30.0;
        float weight = 1.0 - abs(percent);
        vec4 sample = texture(uTexture, vTextureCoord + uDelta / uDimensions * percent * radius);
        sample.rgb *= sample.a;
        color += sample * weight;
        total += weight;
    }

    color /= total;
    color.rgb /= color.a + 0.00001;

    finalColor = color;
}
`,Tx=`struct TiltShiftUniforms {
  uBlur: vec2<f32>,
  uStart: vec2<f32>,
  uEnd: vec2<f32>,
  uDelta: vec2<f32>,
  uDimensions: vec2<f32>,
};

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> tiltShiftUniforms : TiltShiftUniforms;

@fragment
fn mainFragment(
  @builtin(position) position: vec4<f32>,
  @location(0) uv : vec2<f32>
) -> @location(0) vec4<f32> {
  let uBlur = tiltShiftUniforms.uBlur[0];
  let uBlurGradient = tiltShiftUniforms.uBlur[1];
  let uStart = tiltShiftUniforms.uStart;
  let uEnd = tiltShiftUniforms.uEnd;
  let uDelta = tiltShiftUniforms.uDelta;
  let uDimensions = tiltShiftUniforms.uDimensions;

  var color: vec4<f32> = vec4<f32>(0.0);
  var total: f32 = 0.0;

  let offset: f32 = random(position, vec3<f32>(12.9898, 78.233, 151.7182), 0.0);
  let normal: vec2<f32> = normalize(vec2<f32>(uStart.y - uEnd.y, uEnd.x - uStart.x));
  let radius: f32 = smoothstep(0.0, 1.0, abs(dot(uv * uDimensions - uStart, normal)) / uBlurGradient) * uBlur;

  for (var t: f32 = -30.0; t <= 30.0; t += 1.0)
  {
    var percent: f32 = (t + offset - 0.5) / 30.0;
    var weight: f32 = 1.0 - abs(percent);
    var sample: vec4<f32> = textureSample(uTexture, uSampler, uv + uDelta / uDimensions * percent * radius);
    sample = vec4<f32>(sample.xyz * sample.a, sample.a); // multiply sample.rgb with sample.a
    color += sample * weight;
    total += weight;
  }

  color /= total;
  color = vec4<f32>(color.xyz / (color.a + 0.00001), color.a); // divide color.rgb by color.a + 0.00001

  return color;
}


fn random(position: vec4<f32>, scale: vec3<f32>, seed: f32) -> f32
{
  return fract(sin(dot(position.xyz + seed, scale)) * 43758.5453 + seed);
}`,Ax=Object.defineProperty,Px=(i,t,e)=>t in i?Ax(i,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):i[t]=e,zr=(i,t,e)=>(Px(i,typeof t!="symbol"?t+"":t,e),e);const Mx=class su extends Y{constructor(t){const{width:e,height:n}=Yd.defaultOptions;t={...su.DEFAULT_OPTIONS,start:{x:0,y:n/2},end:{x:e,y:n/2},...t};const r=W.from({vertex:{source:rt,entryPoint:"mainVertex"},fragment:{source:Tx,entryPoint:"mainFragment"}}),s=H.from({vertex:nt,fragment:Cx,name:"tilt-shift-axis-filter"});super({gpuProgram:r,glProgram:s,resources:{tiltShiftUniforms:{uBlur:{value:new Float32Array([t.blur,t.gradientBlur]),type:"vec2<f32>"},uStart:{value:t.start,type:"vec2<f32>"},uEnd:{value:t.end,type:"vec2<f32>"},uDelta:{value:new Float32Array([0,0]),type:"vec2<f32>"},uDimensions:{value:new Float32Array([e,n]),type:"vec2<f32>"}}}}),zr(this,"uniforms"),zr(this,"_tiltAxis"),this.uniforms=this.resources.tiltShiftUniforms.uniforms,this._tiltAxis=t.axis}updateDimensions(t){const{uDimensions:e}=this.uniforms;e[0]=t.frame.width,e[1]=t.frame.height}updateDelta(){if(this.uniforms.uDelta[0]=0,this.uniforms.uDelta[1]=0,this._tiltAxis===void 0)return;const t=this.uniforms.uEnd,e=this.uniforms.uStart,n=t.x-e.x,r=t.y-e.y,s=Math.sqrt(n*n+r*r),o=this._tiltAxis==="vertical";this.uniforms.uDelta[0]=o?-r/s:n/s,this.uniforms.uDelta[1]=o?n/s:r/s}};zr(Mx,"DEFAULT_OPTIONS",{blur:100,gradientBlur:600});var Fx=`precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec2 uTwist;
uniform vec2 uOffset;
uniform vec4 uInputSize;

vec2 mapCoord( vec2 coord )
{
    coord *= uInputSize.xy;
    coord += uInputSize.zw;

    return coord;
}

vec2 unmapCoord( vec2 coord )
{
    coord -= uInputSize.zw;
    coord /= uInputSize.xy;

    return coord;
}

vec2 twist(vec2 coord)
{
    coord -= uOffset;

    float dist = length(coord);
    float uRadius = uTwist[0];
    float uAngle = uTwist[1];

    if (dist < uRadius)
    {
        float ratioDist = (uRadius - dist) / uRadius;
        float angleMod = ratioDist * ratioDist * uAngle;
        float s = sin(angleMod);
        float c = cos(angleMod);
        coord = vec2(coord.x * c - coord.y * s, coord.x * s + coord.y * c);
    }

    coord += uOffset;

    return coord;
}

void main(void)
{
    vec2 coord = mapCoord(vTextureCoord);
    coord = twist(coord);
    coord = unmapCoord(coord);
    finalColor = texture(uTexture, coord);
}
`,Ix=`struct TwistUniforms {
  uTwist:vec2<f32>,
  uOffset:vec2<f32>,
};

struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> twistUniforms : TwistUniforms;

@fragment
fn mainFragment(
  @location(0) uv: vec2<f32>,
  @builtin(position) position: vec4<f32>
) -> @location(0) vec4<f32> {
  return textureSample(uTexture, uSampler, unmapCoord(twist(mapCoord(uv))));
}

fn mapCoord(coord: vec2<f32> ) -> vec2<f32>
{
  var mappedCoord: vec2<f32> = coord;
  mappedCoord *= gfu.uInputSize.xy;
  mappedCoord += gfu.uOutputFrame.xy;
  return mappedCoord;
}

fn unmapCoord(coord: vec2<f32> ) -> vec2<f32>
{
  var mappedCoord: vec2<f32> = coord;
  mappedCoord -= gfu.uOutputFrame.xy;
  mappedCoord /= gfu.uInputSize.xy;
  return mappedCoord;
}

fn twist(coord: vec2<f32>) -> vec2<f32>
{
  var twistedCoord: vec2<f32> = coord;
  let uRadius = twistUniforms.uTwist[0];
  let uAngle = twistUniforms.uTwist[1];
  let uOffset = twistUniforms.uOffset;

  twistedCoord -= uOffset;
  
  let dist = length(twistedCoord);

  if (dist < uRadius)
  {
    let ratioDist: f32 = (uRadius - dist) / uRadius;
    let angleMod: f32 = ratioDist * ratioDist * uAngle;
    let s: f32 = sin(angleMod);
    let c: f32 = cos(angleMod);
    twistedCoord = vec2<f32>(twistedCoord.x * c - twistedCoord.y * s, twistedCoord.x * s + twistedCoord.y * c);
  }

  twistedCoord += uOffset;
  return twistedCoord;
}
`,Ox=Object.defineProperty,Rx=(i,t,e)=>t in i?Ox(i,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):i[t]=e,ou=(i,t,e)=>(Rx(i,typeof t!="symbol"?t+"":t,e),e);const Ex=class au extends Y{constructor(t){t={...au.DEFAULT_OPTIONS,...t};const e=W.from({vertex:{source:rt,entryPoint:"mainVertex"},fragment:{source:Ix,entryPoint:"mainFragment"}}),n=H.from({vertex:nt,fragment:Fx,name:"twist-filter"});super({gpuProgram:e,glProgram:n,resources:{twistUniforms:{uTwist:{value:[t.radius??0,t.angle??0],type:"vec2<f32>"},uOffset:{value:t.offset,type:"vec2<f32>"}}},...t}),ou(this,"uniforms"),this.uniforms=this.resources.twistUniforms.uniforms}get radius(){return this.uniforms.uTwist[0]}set radius(t){this.uniforms.uTwist[0]=t}get angle(){return this.uniforms.uTwist[1]}set angle(t){this.uniforms.uTwist[1]=t}get offset(){return this.uniforms.uOffset}set offset(t){this.uniforms.uOffset=t}get offsetX(){return this.offset.x}set offsetX(t){this.offset.x=t}get offsetY(){return this.offset.y}set offsetY(t){this.offset.y=t}};ou(Ex,"DEFAULT_OPTIONS",{padding:20,radius:200,angle:4,offset:{x:0,y:0}});var Ux=`precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform float uStrength;
uniform vec2 uCenter;
uniform vec2 uRadii;

uniform vec4 uInputSize;

const float MAX_KERNEL_SIZE = \${MAX_KERNEL_SIZE};

// author: http://byteblacksmith.com/improvements-to-the-canonical-one-liner-glsl-rand-for-opengl-es-2-0/
highp float rand(vec2 co, float seed) {
    const highp float a = 12.9898, b = 78.233, c = 43758.5453;
    highp float dt = dot(co + seed, vec2(a, b)), sn = mod(dt, 3.14159);
    return fract(sin(sn) * c + seed);
}

void main() {
    float minGradient = uRadii[0] * 0.3;
    float innerRadius = (uRadii[0] + minGradient * 0.5) / uInputSize.x;

    float gradient = uRadii[1] * 0.3;
    float radius = (uRadii[1] - gradient * 0.5) / uInputSize.x;

    float countLimit = MAX_KERNEL_SIZE;

    vec2 dir = vec2(uCenter.xy / uInputSize.xy - vTextureCoord);
    float dist = length(vec2(dir.x, dir.y * uInputSize.y / uInputSize.x));

    float strength = uStrength;

    float delta = 0.0;
    float gap;
    if (dist < innerRadius) {
        delta = innerRadius - dist;
        gap = minGradient;
    } else if (radius >= 0.0 && dist > radius) { // radius < 0 means it's infinity
        delta = dist - radius;
        gap = gradient;
    }

    if (delta > 0.0) {
        float normalCount = gap / uInputSize.x;
        delta = (normalCount - delta) / normalCount;
        countLimit *= delta;
        strength *= delta;
        if (countLimit < 1.0)
        {
            gl_FragColor = texture(uTexture, vTextureCoord);
            return;
        }
    }

    // randomize the lookup values to hide the fixed number of samples
    float offset = rand(vTextureCoord, 0.0);

    float total = 0.0;
    vec4 color = vec4(0.0);

    dir *= strength;

    for (float t = 0.0; t < MAX_KERNEL_SIZE; t++) {
        float percent = (t + offset) / MAX_KERNEL_SIZE;
        float weight = 4.0 * (percent - percent * percent);
        vec2 p = vTextureCoord + dir * percent;
        vec4 sample = texture(uTexture, p);

        // switch to pre-multiplied alpha to correctly blur transparent images
        // sample.rgb *= sample.a;

        color += sample * weight;
        total += weight;

        if (t > countLimit){
            break;
        }
    }

    color /= total;
    // switch back from pre-multiplied alpha
    // color.rgb /= color.a + 0.00001;

    gl_FragColor = color;
}
`,zx=`struct ZoomBlurUniforms {
    uStrength:f32,
    uCenter:vec2<f32>,
    uRadii:vec2<f32>,
};

struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> zoomBlurUniforms : ZoomBlurUniforms;

@fragment
fn mainFragment(
    @builtin(position) position: vec4<f32>,
    @location(0) uv : vec2<f32>
) -> @location(0) vec4<f32> {
  let uStrength = zoomBlurUniforms.uStrength;
  let uCenter = zoomBlurUniforms.uCenter;
  let uRadii = zoomBlurUniforms.uRadii;

  let minGradient: f32 = uRadii[0] * 0.3;
  let innerRadius: f32 = (uRadii[0] + minGradient * 0.5) / gfu.uInputSize.x;

  let gradient: f32 = uRadii[1] * 0.3;
  let radius: f32 = (uRadii[1] - gradient * 0.5) / gfu.uInputSize.x;

  let MAX_KERNEL_SIZE: f32 = \${MAX_KERNEL_SIZE};

  var countLimit: f32 = MAX_KERNEL_SIZE;

  var dir: vec2<f32> = vec2<f32>(uCenter / gfu.uInputSize.xy - uv);
  let dist: f32 = length(vec2<f32>(dir.x, dir.y * gfu.uInputSize.y / gfu.uInputSize.x));

  var strength: f32 = uStrength;

  var delta: f32 = 0.0;
  var gap: f32;

  if (dist < innerRadius) {
      delta = innerRadius - dist;
      gap = minGradient;
  } else if (radius >= 0.0 && dist > radius) { // radius < 0 means it's infinity
      delta = dist - radius;
      gap = gradient;
  }

  var returnColorOnly: bool = false;

  if (delta > 0.0) {
    let normalCount: f32 = gap / gfu.uInputSize.x;
    delta = (normalCount - delta) / normalCount;
    countLimit *= delta;
    strength *= delta;
    
    if (countLimit < 1.0)
    {
      returnColorOnly = true;;
    }
  }

  // randomize the lookup values to hide the fixed number of samples
  let offset: f32 = rand(uv, 0.0);

  var total: f32 = 0.0;
  var color: vec4<f32> = vec4<f32>(0.);

  dir *= strength;

  for (var t = 0.0; t < MAX_KERNEL_SIZE; t += 1.0) {
    let percent: f32 = (t + offset) / MAX_KERNEL_SIZE;
    let weight: f32 = 4.0 * (percent - percent * percent);
    let p: vec2<f32> = uv + dir * percent;
    let sample: vec4<f32> = textureSample(uTexture, uSampler, p);
    
    if (t < countLimit)
    {
      color += sample * weight;
      total += weight;
    }
  }

  color /= total;

  return select(color, textureSample(uTexture, uSampler, uv), returnColorOnly);
}

fn modulo(x: f32, y: f32) -> f32
{
  return x - y * floor(x/y);
}

// author: http://byteblacksmith.com/improvements-to-the-canonical-one-liner-glsl-rand-for-opengl-es-2-0/
fn rand(co: vec2<f32>, seed: f32) -> f32
{
  let a: f32 = 12.9898;
  let b: f32 = 78.233;
  let c: f32 = 43758.5453;
  let dt: f32 = dot(co + seed, vec2<f32>(a, b));
  let sn: f32 = modulo(dt, 3.14159);
  return fract(sin(sn) * c + seed);
}`,kx=Object.defineProperty,Lx=(i,t,e)=>t in i?kx(i,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):i[t]=e,lu=(i,t,e)=>(Lx(i,typeof t!="symbol"?t+"":t,e),e);const Bx=class uu extends Y{constructor(t){t={...uu.DEFAULT_OPTIONS,...t};const e=t.maxKernelSize??32,n=W.from({vertex:{source:rt,entryPoint:"mainVertex"},fragment:{source:zx.replace("${MAX_KERNEL_SIZE}",e.toFixed(1)),entryPoint:"mainFragment"}}),r=H.from({vertex:nt,fragment:Ux.replace("${MAX_KERNEL_SIZE}",e.toFixed(1)),name:"zoom-blur-filter"});super({gpuProgram:n,glProgram:r,resources:{zoomBlurUniforms:{uStrength:{value:t.strength,type:"f32"},uCenter:{value:t.center,type:"vec2<f32>"},uRadii:{value:new Float32Array(2),type:"vec2<f32>"}}}}),lu(this,"uniforms"),this.uniforms=this.resources.zoomBlurUniforms.uniforms,Object.assign(this,t)}get strength(){return this.uniforms.uStrength}set strength(t){this.uniforms.uStrength=t}get center(){return this.uniforms.uCenter}set center(t){Array.isArray(t)&&(t={x:t[0],y:t[1]}),this.uniforms.uCenter=t}get centerX(){return this.uniforms.uCenter.x}set centerX(t){this.uniforms.uCenter.x=t}get centerY(){return this.uniforms.uCenter.y}set centerY(t){this.uniforms.uCenter.y=t}get innerRadius(){return this.uniforms.uRadii[0]}set innerRadius(t){this.uniforms.uRadii[0]=t}get radius(){return this.uniforms.uRadii[1]}set radius(t){this.uniforms.uRadii[1]=t<0||t===1/0?-1:t}};lu(Bx,"DEFAULT_OPTIONS",{strength:.1,center:{x:0,y:0},innerRadius:0,radius:-1,maxKernelSize:32});let hu;function Dx(i){return hu=i,i}function wi(){return hu}class kr{static setParamValue(t,e){if(t.setValueAtTime){const n=wi().context;t.setValueAtTime(e,n.audioContext.currentTime)}else t.value=e;return e}}class Nx extends Ot{constructor(){super(...arguments),this.speed=1,this.muted=!1,this.volume=1,this.paused=!1}refresh(){this.emit("refresh")}refreshPaused(){this.emit("refreshPaused")}get filters(){return console.warn("HTML Audio does not support filters"),null}set filters(t){console.warn("HTML Audio does not support filters")}get audioContext(){return console.warn("HTML Audio does not support audioContext"),null}toggleMute(){return this.muted=!this.muted,this.refresh(),this.muted}togglePause(){return this.paused=!this.paused,this.refreshPaused(),this.paused}destroy(){this.removeAllListeners()}}let Gx=0;const Lr=class extends Ot{constructor(i){super(),this.id=Gx++,this.init(i)}set(i,t){if(this[i]===void 0)throw new Error(`Property with name ${i} does not exist.`);switch(i){case"speed":this.speed=t;break;case"volume":this.volume=t;break;case"paused":this.paused=t;break;case"loop":this.loop=t;break;case"muted":this.muted=t;break}return this}get progress(){const{currentTime:i}=this._source;return i/this._duration}get paused(){return this._paused}set paused(i){this._paused=i,this.refreshPaused()}_onPlay(){this._playing=!0}_onPause(){this._playing=!1}init(i){this._playing=!1,this._duration=i.source.duration;const t=this._source=i.source.cloneNode(!1);t.src=i.parent.url,t.onplay=this._onPlay.bind(this),t.onpause=this._onPause.bind(this),i.context.on("refresh",this.refresh,this),i.context.on("refreshPaused",this.refreshPaused,this),this._media=i}_internalStop(){this._source&&this._playing&&(this._source.onended=null,this._source.pause())}stop(){this._internalStop(),this._source&&this.emit("stop")}get speed(){return this._speed}set speed(i){this._speed=i,this.refresh()}get volume(){return this._volume}set volume(i){this._volume=i,this.refresh()}get loop(){return this._loop}set loop(i){this._loop=i,this.refresh()}get muted(){return this._muted}set muted(i){this._muted=i,this.refresh()}get filters(){return console.warn("HTML Audio does not support filters"),null}set filters(i){console.warn("HTML Audio does not support filters")}refresh(){const i=this._media.context,t=this._media.parent;this._source.loop=this._loop||t.loop;const e=i.volume*(i.muted?0:1),n=t.volume*(t.muted?0:1),r=this._volume*(this._muted?0:1);this._source.volume=r*e*n,this._source.playbackRate=this._speed*i.speed*t.speed}refreshPaused(){const i=this._media.context,t=this._media.parent,e=this._paused||t.paused||i.paused;e!==this._pausedReal&&(this._pausedReal=e,e?(this._internalStop(),this.emit("paused")):(this.emit("resumed"),this.play({start:this._source.currentTime,end:this._end,volume:this._volume,speed:this._speed,loop:this._loop})),this.emit("pause",e))}play(i){const{start:t,end:e,speed:n,loop:r,volume:s,muted:o}=i;e&&console.assert(e>t,"End time is before start time"),this._speed=n,this._volume=s,this._loop=!!r,this._muted=o,this.refresh(),this.loop&&e!==null&&(console.warn('Looping not support when specifying an "end" time'),this.loop=!1),this._start=t,this._end=e||this._duration,this._start=Math.max(0,this._start-Lr.PADDING),this._end=Math.min(this._end+Lr.PADDING,this._duration),this._source.onloadedmetadata=()=>{this._source&&(this._source.currentTime=t,this._source.onloadedmetadata=null,this.emit("progress",t/this._duration,this._duration),Ut.shared.add(this._onUpdate,this))},this._source.onended=this._onComplete.bind(this),this._source.play(),this.emit("start")}_onUpdate(){this.emit("progress",this.progress,this._duration),this._source.currentTime>=this._end&&!this._source.loop&&this._onComplete()}_onComplete(){Ut.shared.remove(this._onUpdate,this),this._internalStop(),this.emit("progress",1,this._duration),this.emit("end",this)}destroy(){Ut.shared.remove(this._onUpdate,this),this.removeAllListeners();const i=this._source;i&&(i.onended=null,i.onplay=null,i.onpause=null,this._internalStop()),this._source=null,this._speed=1,this._volume=1,this._loop=!1,this._end=null,this._start=0,this._duration=0,this._playing=!1,this._pausedReal=!1,this._paused=!1,this._muted=!1,this._media&&(this._media.context.off("refresh",this.refresh,this),this._media.context.off("refreshPaused",this.refreshPaused,this),this._media=null)}toString(){return`[HTMLAudioInstance id=${this.id}]`}};let cu=Lr;cu.PADDING=.1;class Vx extends Ot{init(t){this.parent=t,this._source=t.options.source||new Audio,t.url&&(this._source.src=t.url)}create(){return new cu(this)}get isPlayable(){return!!this._source&&this._source.readyState===4}get duration(){return this._source.duration}get context(){return this.parent.context}get filters(){return null}set filters(t){console.warn("HTML Audio does not support filters")}destroy(){this.removeAllListeners(),this.parent=null,this._source&&(this._source.src="",this._source.load(),this._source=null)}get source(){return this._source}load(t){const e=this._source,n=this.parent;if(e.readyState===4){n.isLoaded=!0;const l=n.autoPlayStart();t&&setTimeout(()=>{t(null,n,l)},0);return}if(!n.url){t(new Error("sound.url or sound.source must be set"));return}e.src=n.url;const r=()=>{a(),n.isLoaded=!0;const l=n.autoPlayStart();t&&t(null,n,l)},s=()=>{a(),t&&t(new Error("Sound loading has been aborted"))},o=()=>{a();const l=`Failed to load audio element (code: ${e.error.code})`;t?t(new Error(l)):console.error(l)},a=()=>{e.removeEventListener("canplaythrough",r),e.removeEventListener("load",r),e.removeEventListener("abort",s),e.removeEventListener("error",o)};e.addEventListener("canplaythrough",r,!1),e.addEventListener("load",r,!1),e.addEventListener("abort",s,!1),e.addEventListener("error",o,!1),e.load()}}class Wx{constructor(t,e){this.parent=t,Object.assign(this,e),this.duration=this.end-this.start,console.assert(this.duration>0,"End time must be after start time")}play(t){return this.parent.play({complete:t,speed:this.speed||this.parent.speed,end:this.end,start:this.start,loop:this.loop})}destroy(){this.parent=null}}const hn=["ogg","oga","opus","m4a","mp3","mpeg","wav","aiff","wma","mid","caf"],$x=["audio/mpeg","audio/ogg"],cn={};function Hx(i){const t={m4a:"audio/mp4",oga:"audio/ogg",opus:'audio/ogg; codecs="opus"',caf:'audio/x-caf; codecs="opus"'},e=document.createElement("audio"),n={},r=/^no$/;hn.forEach(s=>{const o=e.canPlayType(`audio/${s}`).replace(r,""),a=t[s]?e.canPlayType(t[s]).replace(r,""):"";n[s]=!!o||!!a}),Object.assign(cn,n)}Hx();let Xx=0;class Yx extends Ot{constructor(t){super(),this.id=Xx++,this._media=null,this._paused=!1,this._muted=!1,this._elapsed=0,this.init(t)}set(t,e){if(this[t]===void 0)throw new Error(`Property with name ${t} does not exist.`);switch(t){case"speed":this.speed=e;break;case"volume":this.volume=e;break;case"muted":this.muted=e;break;case"loop":this.loop=e;break;case"paused":this.paused=e;break}return this}stop(){this._source&&(this._internalStop(),this.emit("stop"))}get speed(){return this._speed}set speed(t){this._speed=t,this.refresh(),this._update(!0)}get volume(){return this._volume}set volume(t){this._volume=t,this.refresh()}get muted(){return this._muted}set muted(t){this._muted=t,this.refresh()}get loop(){return this._loop}set loop(t){this._loop=t,this.refresh()}get filters(){return this._filters}set filters(t){this._filters&&(this._filters?.filter(e=>e).forEach(e=>e.disconnect()),this._filters=null,this._source.connect(this._gain)),this._filters=t?.length?t.slice(0):null,this.refresh()}refresh(){if(!this._source)return;const t=this._media.context,e=this._media.parent;this._source.loop=this._loop||e.loop;const n=t.volume*(t.muted?0:1),r=e.volume*(e.muted?0:1),s=this._volume*(this._muted?0:1);kr.setParamValue(this._gain.gain,s*r*n),kr.setParamValue(this._source.playbackRate,this._speed*e.speed*t.speed),this.applyFilters()}applyFilters(){if(this._filters?.length){this._source.disconnect();let t=this._source;this._filters.forEach(e=>{t.connect(e.destination),t=e}),t.connect(this._gain)}}refreshPaused(){const t=this._media.context,e=this._media.parent,n=this._paused||e.paused||t.paused;n!==this._pausedReal&&(this._pausedReal=n,n?(this._internalStop(),this.emit("paused")):(this.emit("resumed"),this.play({start:this._elapsed%this._duration,end:this._end,speed:this._speed,loop:this._loop,volume:this._volume})),this.emit("pause",n))}play(t){const{start:e,end:n,speed:r,loop:s,volume:o,muted:a,filters:l}=t;n&&console.assert(n>e,"End time is before start time"),this._paused=!1;const{source:u,gain:h}=this._media.nodes.cloneBufferSource();this._source=u,this._gain=h,this._speed=r,this._volume=o,this._loop=!!s,this._muted=a,this._filters=l,this.refresh();const c=this._source.buffer.duration;this._duration=c,this._end=n,this._lastUpdate=this._now(),this._elapsed=e,this._source.onended=this._onComplete.bind(this),this._loop?(this._source.loopEnd=n,this._source.loopStart=e,this._source.start(0,e)):n?this._source.start(0,e,n-e):this._source.start(0,e),this.emit("start"),this._update(!0),this.enableTicker(!0)}enableTicker(t){Ut.shared.remove(this._updateListener,this),t&&Ut.shared.add(this._updateListener,this)}get progress(){return this._progress}get paused(){return this._paused}set paused(t){this._paused=t,this.refreshPaused()}destroy(){this.removeAllListeners(),this._internalStop(),this._gain&&(this._gain.disconnect(),this._gain=null),this._media&&(this._media.context.events.off("refresh",this.refresh,this),this._media.context.events.off("refreshPaused",this.refreshPaused,this),this._media=null),this._filters?.forEach(t=>t.disconnect()),this._filters=null,this._end=null,this._speed=1,this._volume=1,this._loop=!1,this._elapsed=0,this._duration=0,this._paused=!1,this._muted=!1,this._pausedReal=!1}toString(){return`[WebAudioInstance id=${this.id}]`}_now(){return this._media.context.audioContext.currentTime}_updateListener(){this._update()}_update(t=!1){if(this._source){const e=this._now(),n=e-this._lastUpdate;if(n>0||t){const r=this._source.playbackRate.value;this._elapsed+=n*r,this._lastUpdate=e;const s=this._duration;let o;if(this._source.loopStart){const a=this._source.loopEnd-this._source.loopStart;o=(this._source.loopStart+this._elapsed%a)/s}else o=this._elapsed%s/s;this._progress=o,this.emit("progress",this._progress,s)}}}init(t){this._media=t,t.context.events.on("refresh",this.refresh,this),t.context.events.on("refreshPaused",this.refreshPaused,this)}_internalStop(){if(this._source){this.enableTicker(!1),this._source.onended=null,this._source.stop(0),this._source.disconnect();try{this._source.buffer=null}catch(t){console.warn("Failed to set AudioBufferSourceNode.buffer to null:",t)}this._source=null}}_onComplete(){if(this._source){this.enableTicker(!1),this._source.onended=null,this._source.disconnect();try{this._source.buffer=null}catch(t){console.warn("Failed to set AudioBufferSourceNode.buffer to null:",t)}}this._source=null,this._progress=1,this.emit("progress",1,this._duration),this.emit("end",this)}}class fu{constructor(t,e){this._output=e,this._input=t}get destination(){return this._input}get filters(){return this._filters}set filters(t){if(this._filters&&(this._filters.forEach(e=>{e&&e.disconnect()}),this._filters=null,this._input.connect(this._output)),t&&t.length){this._filters=t.slice(0),this._input.disconnect();let e=null;t.forEach(n=>{e===null?this._input.connect(n.destination):e.connect(n.destination),e=n}),e.connect(this._output)}}destroy(){this.filters=null,this._input=null,this._output=null}}const du=class extends fu{constructor(i){const t=i.audioContext,e=t.createBufferSource(),n=t.createGain(),r=t.createAnalyser();e.connect(r),r.connect(n),n.connect(i.destination),super(r,n),this.context=i,this.bufferSource=e,this.gain=n,this.analyser=r}get script(){return this._script||(this._script=this.context.audioContext.createScriptProcessor(du.BUFFER_SIZE),this._script.connect(this.context.destination)),this._script}destroy(){super.destroy(),this.bufferSource.disconnect(),this._script&&this._script.disconnect(),this.gain.disconnect(),this.analyser.disconnect(),this.bufferSource=null,this._script=null,this.gain=null,this.analyser=null,this.context=null}cloneBufferSource(){const i=this.bufferSource,t=this.context.audioContext.createBufferSource();t.buffer=i.buffer,kr.setParamValue(t.playbackRate,i.playbackRate.value),t.loop=i.loop;const e=this.context.audioContext.createGain();return t.connect(e),e.connect(this.destination),{source:t,gain:e}}get bufferSize(){return this.script.bufferSize}};let pu=du;pu.BUFFER_SIZE=0;class jx{init(t){this.parent=t,this._nodes=new pu(this.context),this._source=this._nodes.bufferSource,this.source=t.options.source}destroy(){this.parent=null,this._nodes.destroy(),this._nodes=null;try{this._source.buffer=null}catch(t){console.warn("Failed to set AudioBufferSourceNode.buffer to null:",t)}this._source=null,this.source=null}create(){return new Yx(this)}get context(){return this.parent.context}get isPlayable(){return!!this._source&&!!this._source.buffer}get filters(){return this._nodes.filters}set filters(t){this._nodes.filters=t}get duration(){return console.assert(this.isPlayable,"Sound not yet playable, no duration"),this._source.buffer.duration}get buffer(){return this._source.buffer}set buffer(t){this._source.buffer=t}get nodes(){return this._nodes}load(t){this.source?this._decode(this.source,t):this.parent.url?this._loadUrl(t):t?t(new Error("sound.url or sound.source must be set")):console.error("sound.url or sound.source must be set")}async _loadUrl(t){const e=this.parent.url,n=await ft.get().fetch(e);this._decode(await n.arrayBuffer(),t)}_decode(t,e){const n=(r,s)=>{if(r)e&&e(r);else{this.parent.isLoaded=!0,this.buffer=s;const o=this.parent.autoPlayStart();e&&e(null,this.parent,o)}};t instanceof AudioBuffer?n(null,t):this.parent.context.decode(t,n)}}const Le=class{static from(i){let t={};typeof i=="string"?t.url=i:i instanceof ArrayBuffer||i instanceof AudioBuffer||i instanceof HTMLAudioElement?t.source=i:Array.isArray(i)?t.url=i:t=i,t={autoPlay:!1,singleInstance:!1,url:null,source:null,preload:!1,volume:1,speed:1,complete:null,loaded:null,loop:!1,...t},Object.freeze(t);const e=wi().useLegacy?new Vx:new jx;return new Le(e,t)}constructor(i,t){this.media=i,this.options=t,this._instances=[],this._sprites={},this.media.init(this);const e=t.complete;this._autoPlayOptions=e?{complete:e}:null,this.isLoaded=!1,this._preloadQueue=null,this.isPlaying=!1,this.autoPlay=t.autoPlay,this.singleInstance=t.singleInstance,this.preload=t.preload||this.autoPlay,this.url=Array.isArray(t.url)?this.preferUrl(t.url):t.url,this.speed=t.speed,this.volume=t.volume,this.loop=t.loop,t.sprites&&this.addSprites(t.sprites),this.preload&&this._preload(t.loaded)}preferUrl(i){const[t]=i.map(e=>({url:e,ext:At.extname(e).slice(1)})).filter(({ext:e})=>cn[e]).sort((e,n)=>hn.indexOf(e.ext)-hn.indexOf(n.ext));if(!t)throw new Error("No supported file type found");return t.url}get context(){return wi().context}pause(){return this.isPlaying=!1,this.paused=!0,this}resume(){return this.isPlaying=this._instances.length>0,this.paused=!1,this}get paused(){return this._paused}set paused(i){this._paused=i,this.refreshPaused()}get speed(){return this._speed}set speed(i){this._speed=i,this.refresh()}get filters(){return this.media.filters}set filters(i){this.media.filters=i}addSprites(i,t){if(typeof i=="object"){const n={};for(const r in i)n[r]=this.addSprites(r,i[r]);return n}console.assert(!this._sprites[i],`Alias ${i} is already taken`);const e=new Wx(this,t);return this._sprites[i]=e,e}destroy(){this._removeInstances(),this.removeSprites(),this.media.destroy(),this.media=null,this._sprites=null,this._instances=null}removeSprites(i){if(i){const t=this._sprites[i];t!==void 0&&(t.destroy(),delete this._sprites[i])}else for(const t in this._sprites)this.removeSprites(t);return this}get isPlayable(){return this.isLoaded&&this.media&&this.media.isPlayable}stop(){if(!this.isPlayable)return this.autoPlay=!1,this._autoPlayOptions=null,this;this.isPlaying=!1;for(let i=this._instances.length-1;i>=0;i--)this._instances[i].stop();return this}play(i,t){let e;if(typeof i=="string"?e={sprite:i,loop:this.loop,complete:t}:typeof i=="function"?(e={},e.complete=i):e=i,e={complete:null,loaded:null,sprite:null,end:null,start:0,volume:1,speed:1,muted:!1,loop:!1,...e||{}},e.sprite){const r=e.sprite;console.assert(!!this._sprites[r],`Alias ${r} is not available`);const s=this._sprites[r];e.start=s.start+(e.start||0),e.end=s.end,e.speed=s.speed||1,e.loop=s.loop||e.loop,delete e.sprite}if(e.offset&&(e.start=e.offset),!this.isLoaded)return this._preloadQueue?new Promise(r=>{this._preloadQueue.push(()=>{r(this.play(e))})}):(this._preloadQueue=[],this.autoPlay=!0,this._autoPlayOptions=e,new Promise((r,s)=>{this._preload((o,a,l)=>{this._preloadQueue.forEach(u=>u()),this._preloadQueue=null,o?s(o):(e.loaded&&e.loaded(o,a,l),r(l))})}));(this.singleInstance||e.singleInstance)&&this._removeInstances();const n=this._createInstance();return this._instances.push(n),this.isPlaying=!0,n.once("end",()=>{e.complete&&e.complete(this),this._onComplete(n)}),n.once("stop",()=>{this._onComplete(n)}),n.play(e),n}refresh(){const i=this._instances.length;for(let t=0;t<i;t++)this._instances[t].refresh()}refreshPaused(){const i=this._instances.length;for(let t=0;t<i;t++)this._instances[t].refreshPaused()}get volume(){return this._volume}set volume(i){this._volume=i,this.refresh()}get muted(){return this._muted}set muted(i){this._muted=i,this.refresh()}get loop(){return this._loop}set loop(i){this._loop=i,this.refresh()}_preload(i){this.media.load(i)}get instances(){return this._instances}get sprites(){return this._sprites}get duration(){return this.media.duration}autoPlayStart(){let i;return this.autoPlay&&(i=this.play(this._autoPlayOptions)),i}_removeInstances(){for(let i=this._instances.length-1;i>=0;i--)this._poolInstance(this._instances[i]);this._instances.length=0}_onComplete(i){if(this._instances){const t=this._instances.indexOf(i);t>-1&&this._instances.splice(t,1),this.isPlaying=this._instances.length>0}this._poolInstance(i)}_createInstance(){if(Le._pool.length>0){const i=Le._pool.pop();return i.init(this.media),i}return this.media.create()}_poolInstance(i){i.destroy(),Le._pool.indexOf(i)<0&&Le._pool.push(i)}};let fn=Le;fn._pool=[];class Ci extends fu{constructor(){const t=window,e=new Ci.AudioContext,n=e.createDynamicsCompressor(),r=e.createAnalyser();r.connect(n),n.connect(e.destination),super(r,n),this.autoPause=!0,this._ctx=e,this._offlineCtx=new Ci.OfflineAudioContext(1,2,t.OfflineAudioContext?Math.max(8e3,Math.min(96e3,e.sampleRate)):44100),this.compressor=n,this.analyser=r,this.events=new Ot,this.volume=1,this.speed=1,this.muted=!1,this.paused=!1,this._locked=e.state==="suspended"&&("ontouchstart"in globalThis||"onclick"in globalThis),this._locked&&(this._unlock(),this._unlock=this._unlock.bind(this),document.addEventListener("mousedown",this._unlock,!0),document.addEventListener("touchstart",this._unlock,!0),document.addEventListener("touchend",this._unlock,!0)),this.onFocus=this.onFocus.bind(this),this.onBlur=this.onBlur.bind(this),globalThis.addEventListener("focus",this.onFocus),globalThis.addEventListener("blur",this.onBlur)}onFocus(){if(!this.autoPause)return;const t=this._ctx.state;(t==="suspended"||t==="interrupted"||!this._locked)&&(this.paused=this._pausedOnBlur,this.refreshPaused())}onBlur(){this.autoPause&&(this._locked||(this._pausedOnBlur=this._paused,this.paused=!0,this.refreshPaused()))}_unlock(){this._locked&&(this.playEmptySound(),this._ctx.state==="running"&&(document.removeEventListener("mousedown",this._unlock,!0),document.removeEventListener("touchend",this._unlock,!0),document.removeEventListener("touchstart",this._unlock,!0),this._locked=!1))}playEmptySound(){const t=this._ctx.createBufferSource();t.buffer=this._ctx.createBuffer(1,1,22050),t.connect(this._ctx.destination),t.start(0,0,0),t.context.state==="suspended"&&t.context.resume()}static get AudioContext(){const t=window;return t.AudioContext||t.webkitAudioContext||null}static get OfflineAudioContext(){const t=window;return t.OfflineAudioContext||t.webkitOfflineAudioContext||null}destroy(){super.destroy();const t=this._ctx;typeof t.close<"u"&&t.close(),globalThis.removeEventListener("focus",this.onFocus),globalThis.removeEventListener("blur",this.onBlur),this.events.removeAllListeners(),this.analyser.disconnect(),this.compressor.disconnect(),this.analyser=null,this.compressor=null,this.events=null,this._offlineCtx=null,this._ctx=null}get audioContext(){return this._ctx}get offlineContext(){return this._offlineCtx}set paused(t){t&&this._ctx.state==="running"?this._ctx.suspend():!t&&this._ctx.state==="suspended"&&this._ctx.resume(),this._paused=t}get paused(){return this._paused}refresh(){this.events.emit("refresh")}refreshPaused(){this.events.emit("refreshPaused")}toggleMute(){return this.muted=!this.muted,this.refresh(),this.muted}togglePause(){return this.paused=!this.paused,this.refreshPaused(),this._paused}decode(t,e){const n=s=>{e(new Error(s?.message||"Unable to decode file"))},r=this._offlineCtx.decodeAudioData(t,s=>{e(null,s)},n);r&&r.catch(n)}}class qx{constructor(){this.init()}init(){return this.supported&&(this._webAudioContext=new Ci),this._htmlAudioContext=new Nx,this._sounds={},this.useLegacy=!this.supported,this}get context(){return this._context}get filtersAll(){return this.useLegacy?[]:this._context.filters}set filtersAll(t){this.useLegacy||(this._context.filters=t)}get supported(){return Ci.AudioContext!==null}add(t,e){if(typeof t=="object"){const s={};for(const o in t){const a=this._getOptions(t[o],e);s[o]=this.add(o,a)}return s}if(console.assert(!this._sounds[t],`Sound with alias ${t} already exists.`),e instanceof fn)return this._sounds[t]=e,e;const n=this._getOptions(e),r=fn.from(n);return this._sounds[t]=r,r}_getOptions(t,e){let n;return typeof t=="string"?n={url:t}:Array.isArray(t)?n={url:t}:t instanceof ArrayBuffer||t instanceof AudioBuffer||t instanceof HTMLAudioElement?n={source:t}:n=t,n={...n,...e||{}},n}get useLegacy(){return this._useLegacy}set useLegacy(t){this._useLegacy=t,this._context=!t&&this.supported?this._webAudioContext:this._htmlAudioContext}get disableAutoPause(){return!this._webAudioContext.autoPause}set disableAutoPause(t){this._webAudioContext.autoPause=!t}remove(t){return this.exists(t,!0),this._sounds[t].destroy(),delete this._sounds[t],this}get volumeAll(){return this._context.volume}set volumeAll(t){this._context.volume=t,this._context.refresh()}get speedAll(){return this._context.speed}set speedAll(t){this._context.speed=t,this._context.refresh()}togglePauseAll(){return this._context.togglePause()}pauseAll(){return this._context.paused=!0,this._context.refreshPaused(),this}resumeAll(){return this._context.paused=!1,this._context.refreshPaused(),this}toggleMuteAll(){return this._context.toggleMute()}muteAll(){return this._context.muted=!0,this._context.refresh(),this}unmuteAll(){return this._context.muted=!1,this._context.refresh(),this}removeAll(){for(const t in this._sounds)this._sounds[t].destroy(),delete this._sounds[t];return this}stopAll(){for(const t in this._sounds)this._sounds[t].stop();return this}exists(t,e=!1){const n=!!this._sounds[t];return e&&console.assert(n,`No sound matching alias '${t}'.`),n}isPlaying(){for(const t in this._sounds)if(this._sounds[t].isPlaying)return!0;return!1}find(t){return this.exists(t,!0),this._sounds[t]}play(t,e){return this.find(t).play(e)}stop(t){return this.find(t).stop()}pause(t){return this.find(t).pause()}resume(t){return this.find(t).resume()}volume(t,e){const n=this.find(t);return e!==void 0&&(n.volume=e),n.volume}speed(t,e){const n=this.find(t);return e!==void 0&&(n.speed=e),n.speed}duration(t){return this.find(t).duration}close(){return this.removeAll(),this._sounds=null,this._webAudioContext&&(this._webAudioContext.destroy(),this._webAudioContext=null),this._htmlAudioContext&&(this._htmlAudioContext.destroy(),this._htmlAudioContext=null),this._context=null,this}}const Lo=i=>{const t=i.src;let e=i?.alias?.[0];return(!e||i.src===e)&&(e=At.basename(t,At.extname(t))),e},Kx={extension:U.Asset,detection:{test:async()=>!0,add:async i=>[...i,...hn.filter(t=>cn[t])],remove:async i=>i.filter(t=>i.includes(t))},loader:{name:"sound",extension:{type:[U.LoadParser],priority:ae.High},test(i){const t=At.extname(i).slice(1);return!!cn[t]||$x.some(e=>i.startsWith(`data:${e}`))},async load(i,t){const e=await new Promise((n,r)=>fn.from({...t.data,url:i,preload:!0,loaded(s,o){s?r(s):n(o),t.data?.loaded?.(s,o)}}));return wi().add(Lo(t),e),e},async unload(i,t){wi().remove(Lo(t))}}};It.add(Kx);const Kt=Dx(new qx);class Zx{constructor(t){this.app=t}currentGameState=2;version=ep.version;hexMap=new yt(13,9);battle=new se(this.hexMap);NATIVE_RESOLUTION={width:1600,height:900};ZOOM_LEVEL_MIN=.5;ZOOM_LEVEL_MAX=2;navZoomLevel=1;navMapOffset={x:0,y:0};MAP_OFFSET_MIN={x:-600,y:-600};MAP_OFFSET_MAX={x:1200,y:1200};mouseDragCoords={x:0,y:0};mouseRightClickCoords={x:0,y:0};terrainSheet=void 0;terrainTexture=void 0;hexagonSheet=void 0;uiSheet=void 0;unitsSheet=void 0;bannersSheet=void 0;touchSpriteLeft=new it;touchSpriteRight=new it;softCursorSprite=new it;uiAnimationSprites=[];softCursorTextures={};displayOnScreenTouchControls=!1;commonControls=new un;unitStats=void 0;topSidePanel=void 0;softCursorName="default";fpsText;instructionsText;messagesText;coordsTexts=[];unitSprites=[];hexHoverSprite;hexSelectedSprite;hexReachableSprites=[];hexEnemyReachableSprites=[];hexPathSprites=[];hexUnitBars=[];showHealthbars=!0;showFacingDirections=!0;damageValueDisplay=new Pp;turnChangeDisplay=new Fp;perfDisplayPanel=new is;terrainRenderGroup=new X({isRenderGroup:!0});unitRenderSubgroups=[];unitRenderGroup=new X({isRenderGroup:!0});uiRenderGroup=new X({isRenderGroup:!0});uiPlusRenderGroup=new X({isRenderGroup:!0});renderContainer=new X;hexZoneContainer=new X({isRenderGroup:!0});hexTerrainContainer=new X({isRenderGroup:!0});hexCellsGridContainer=new X({isRenderGroup:!0});hexCellsContainer=new X({isRenderGroup:!0});hexUiRenderGroup=new X({isRenderGroup:!0});userOptions={showCoords:!1,showGrid:!1};renderContainerOffset={x:0,y:0};DEFAULT_FONT_STYLE={fontFamily:"GustysSerpents",fontSize:18,align:"left"};creatureTemplates=[];creatureRepository=new Ap;tempMessage="";controlPressed=!1;async initialize(){const t=document.getElementById("game");if(!t){console.error("Failed to find the game container element");return}await this.app.init({background:"#102229",width:this.NATIVE_RESOLUTION.width,height:this.NATIVE_RESOLUTION.height,resizeTo:t}),this.setScalingForSize(this.app.screen.width,this.app.screen.height),console.log("App started, size: "+this.app.screen.width+"x"+this.app.screen.height),console.log("Scaling factor: "+this.renderContainer.scale.x.toFixed(2)+"x"+this.renderContainer.scale.y.toFixed(2)),t.appendChild(this.app.canvas),t.addEventListener("contextmenu",e=>{e.preventDefault()}),this.app.stage.addChild(this.renderContainer),this.renderContainer.addChild(this.terrainRenderGroup),this.renderContainer.addChild(this.hexZoneContainer),this.renderContainer.addChild(this.uiRenderGroup),this.renderContainer.addChild(this.uiPlusRenderGroup),this.hexZoneContainer.addChild(this.hexTerrainContainer),this.hexZoneContainer.addChild(this.hexCellsGridContainer),this.hexZoneContainer.addChild(this.hexCellsContainer),this.hexZoneContainer.addChild(this.unitRenderGroup),this.hexZoneContainer.addChild(this.hexUiRenderGroup),await this.loadTemplates(),await this.loadAssets(),await this.loadSounds(),this.initializeCommonControls(),this.initializeTopPanel(),this.initializeMapAndGame(),await this.initializeTexts(),this.setupMainLoop(),this.setupInputHandlers(),this.startBattle(),this.app.renderer.on("resize",(e,n)=>{this.setScalingForSize(e,n)})}startBattle(){this.hookNextTurn(0,0),this.battle.selectNextUnit(),Kt.play("track_dark_whispers",{loop:!0,volume:.15})}setScalingForSize(t,e){this.instructionsText&&(this.instructionsText.text=this.tempMessage+`
Resized to: `+t+"x"+e);const n=this.NATIVE_RESOLUTION;console.log("Resized to: "+t+" x "+e+". With original size of: "+n.width+" x "+n.height);const r={x:t/n.width,y:e/n.height},s=Math.min(r.x,r.y);this.renderContainer.scale.set(s,s),this.hexZoneContainer.scale.set(this.navZoomLevel,this.navZoomLevel),this.renderContainerOffset={x:(t-n.width*s)/2,y:Math.max((e-n.height*s)/2-30,0)},this.renderContainer.position.set(this.renderContainerOffset.x,this.renderContainerOffset.y)}async loadAssets(){this.terrainTexture=await $t.load("stars.jpg"),this.hexagonSheet=await $t.load("hexagon_selections.json"),this.hexagonSheet||console.error("Failed to load the hexes spritesheet"),this.terrainSheet=await $t.load("hex_terrain.json"),this.terrainSheet||console.error("Failed to load the terrain spritesheet"),this.unitsSheet=await $t.load("unitsspritesheet.json"),this.unitsSheet||console.error("Failed to load the units spritesheet"),this.uiSheet=await $t.load("ui/hexes-ui-sheet.json"),this.uiSheet||console.error("Failed to load the UI spritesheet"),this.bannersSheet=await $t.load("bannersspritesheet.json"),this.bannersSheet||console.error("Failed to load the banners spritesheet"),this.turnChangeDisplay.setUISheet(this.uiSheet),this.softCursorTextures.default=this.uiSheet.textures["cur_gs_arrow.png"],this.softCursorTextures.attack_melee=this.uiSheet.textures["cursor_sword.png"],this.softCursorTextures.attack_melee_e=this.uiSheet.textures["cursor_sword_e.png"],this.softCursorTextures.attack_melee_w=this.uiSheet.textures["cursor_sword_w.png"],this.softCursorTextures.attack_melee_ne=this.uiSheet.textures["cursor_sword_ne.png"],this.softCursorTextures.attack_melee_nw=this.uiSheet.textures["cursor_sword_nw.png"],this.softCursorTextures.attack_melee_se=this.uiSheet.textures["cursor_sword_se.png"],this.softCursorTextures.attack_melee_sw=this.uiSheet.textures["cursor_sword_sw.png"],this.softCursorTextures.attack_ranged=this.uiSheet.textures["cursor_arrow.png"],this.softCursorSprite=new it(this.softCursorTextures.default),this.uiPlusRenderGroup.addChild(this.softCursorSprite)}async initializeTexts(){await $t.load("./GustysSerpentsFontL.xml"),this.fpsText=new Co({text:"FPS: 0",style:this.DEFAULT_FONT_STYLE}),this.fpsText.x=62,this.fpsText.y=2,this.fpsText.alpha=.7,this.uiRenderGroup.addChild(this.fpsText);const t=new de({fontFamily:"Arial",fontSize:18,fill:{color:"#ffffff",alpha:1}});this.tempMessage=`HoB v.${this.version}
`+this.tempMessage,this.instructionsText=new mt({text:this.tempMessage,style:t}),this.instructionsText.position={x:1480,y:5},this.uiRenderGroup.addChild(this.instructionsText),this.messagesText=new mt({text:"",style:t}),this.messagesText.x=10,this.messagesText.y=60,this.uiRenderGroup.addChild(this.messagesText)}async loadSounds(){console.log("Loading sounds..."),await Kt.add("arrow","audio/arrow.ogg"),await Kt.add("die","audio/die.ogg"),await Kt.add("move","audio/move.ogg"),await Kt.add("sword","audio/sword.ogg"),await Kt.add("track_dark_whispers","audio/dark_whispers.ogg"),console.log("Loaded sounds...")}async loadTemplates(){this.creatureTemplates=await Mp.loadJson("./creaturetypes.json"),this.creatureRepository.setCreatureTemplates(this.creatureTemplates)}modifyZoomLevel(t,e={x:.5,y:.5}){let n={x:this.hexZoneContainer.width,y:this.hexZoneContainer.height};this.navZoomLevel+=t,this.navZoomLevel=Math.max(this.ZOOM_LEVEL_MIN,this.navZoomLevel),this.navZoomLevel=Math.min(this.ZOOM_LEVEL_MAX,this.navZoomLevel),this.hexZoneContainer.scale.set(this.navZoomLevel,this.navZoomLevel),this.setNavMapOffset({x:this.navMapOffset.x+(n.x-this.hexZoneContainer.width)*e.x,y:this.navMapOffset.y+(n.y-this.hexZoneContainer.height)*e.y})}initializeCommonControls(){this.commonControls.initializeButtons(),this.commonControls.getControls().forEach(t=>{this.uiRenderGroup.addChild(t)}),this.commonControls.zoomInButton?.onPress.connect(()=>{this.modifyZoomLevel(.1)}),this.commonControls.zoomOutButton?.onPress.connect(()=>{this.modifyZoomLevel(-.1)}),this.commonControls.toggleCoordsButton?.onPress.connect(()=>{this.coordsTexts.forEach(t=>{t.visible=!t.visible})}),this.commonControls.toggleGridButton?.onPress.connect(()=>{this.hexCellsGridContainer.visible=!this.hexCellsGridContainer.visible}),this.commonControls.nextTurnButton?.onPress.connect(()=>{this.battle.nextTurn(),this.battle.selectNextUnit()}),this.commonControls.nextUnitButton?.onPress.connect(()=>{this.battle.selectNextUnit()}),this.commonControls.showHealthbarsButton?.onPress.connect(()=>{this.showHealthbars=!this.showHealthbars,this.battle.reselectCurrentUnit()}),this.commonControls.toggleStatsButton?.onPress.connect(()=>{this.uiSheet&&(this.unitStats||(this.unitStats=new Bt(this.renderContainer,this.uiSheet),this.unitStats.hide()),this.unitStats.toggleVisibility(),this.unitStats&&this.battle.activeCreatureIndex>=0&&(this.unitStats.setCreature(this.battle.creatures[this.battle.activeCreatureIndex]),this.unitStats.update()))}),this.commonControls.togglePerfStatsButton?.onPress.connect(()=>{this.uiSheet&&this.perfDisplayPanel.toggleVisibility(this.uiRenderGroup,this.uiSheet)}),this.uiSheet&&(this.unitStats=new Bt(this.renderContainer,this.uiSheet))}initializeTopPanel(){this.uiSheet&&(this.topSidePanel=new q(this.renderContainer,this.uiSheet),this.topSidePanel.setLeftBannerTexture(this.bannersSheet?.textures[this.getBannerTextureNameForArmyIndex(0)]),this.topSidePanel.setRightBannerTexture(this.bannersSheet?.textures[this.getBannerTextureNameForArmyIndex(1)]),this.topSidePanel.setLeftArmyName("The Count of Ekkina's 1st Army"),this.topSidePanel.setRightArmyName("Knights of The Grand Duke"))}getBannerTextureNameForArmyIndex(t){return t===0?"banner1.png":"banner2.png"}initializeMapAndGame(){let t=new it(this.terrainTexture);t.scale.set(2,2),t.x=0,t.y=0,this.terrainRenderGroup.addChild(t),this.battle.initializeToSize(this.hexMap.width,this.hexMap.height),this.hexMap.setOffset(150,135);for(let n=0;n<this.hexMap.height;n++)for(let r=0;r<this.hexMap.width;r++){let s=this.hexMap.hexToPixel(r,n);s={x:s.x-this.hexMap.cellSize().x/2,y:s.y-this.hexMap.cellSize().y/2};let o=2,a=new it(this.terrainSheet?.textures[`grass_${o}.png`]);a.position.copyFrom(s),this.hexTerrainContainer.addChild(a);const l=new it(this.hexagonSheet?.textures["hex_empty.png"]);l.position.copyFrom(s),this.hexCellsGridContainer.addChild(l),s.x+=this.hexMap.cellSize().x/3,s.y+=this.hexMap.cellSize().y/3;let u=new Co({text:`${r},${n}`,style:this.DEFAULT_FONT_STYLE});u.position.copyFrom(s),u.visible=this.userOptions.showCoords,this.coordsTexts.push(u),this.hexUiRenderGroup.addChild(u)}this.hexCellsGridContainer.visible=this.userOptions.showGrid;for(let n=0;n<this.hexMap.height;n++)this.unitRenderSubgroups.push(new X({isRenderGroup:!0})),this.unitRenderGroup.addChild(this.unitRenderSubgroups[n]);let e=this.creatureRepository.createCreature(at.PEASANT);e.position={x:3,y:4},e.armyAlignment=0,this.battle.creatures.push(e),e=this.creatureRepository.createCreature(at.SPEARMAN),e.position={x:0,y:0},e.stats.num_moves=10,e.stats.remaining_movement=10,e.armyAlignment=0,this.battle.creatures.push(e),e=this.creatureRepository.createCreature(at.PEASANT_ARCHER),e.position={x:1,y:5},e.armyAlignment=0,this.battle.creatures.push(e),e=this.creatureRepository.createCreature(at.CROSSBOWMAN),e.position={x:0,y:4},e.armyAlignment=0,this.battle.creatures.push(e),e=this.creatureRepository.createCreature(at.SPEARMAN),e.position={x:3,y:5},e.armyAlignment=0,this.battle.creatures.push(e),e=this.creatureRepository.createCreature(at.SPEARMAN),e.position={x:5,y:7},e.facingDirection=lt.WEST,e.armyAlignment=1,this.battle.creatures.push(e),e=this.creatureRepository.createCreature(at.SWORDSMAN),e.position={x:4,y:4},e.facingDirection=lt.WEST,e.armyAlignment=1,this.battle.creatures.push(e),e=this.creatureRepository.createCreature(at.BARBARIAN),e.position={x:4,y:6},e.facingDirection=lt.WEST,e.armyAlignment=1,this.battle.creatures.push(e),e=this.creatureRepository.createCreature(at.PEASANT),e.position={x:4,y:3},e.facingDirection=lt.WEST,e.armyAlignment=1,this.battle.creatures.push(e),e=this.creatureRepository.createCreature(at.PEASANT_ARCHER),e.position={x:7,y:4},e.armyAlignment=1,e.facingDirection=lt.WEST,this.battle.creatures.push(e),this.battle.hookDoingAttack=(n,r,s,o)=>{this.hookDoingAttack(n,r,s,o)},this.battle.hookNextTurn=(n,r)=>{this.hookNextTurn(n,r)},this.battle.hookMovingUnit=(n,r)=>{this.hookMovingUnit(n,r)},this.battle.hookUnitDied=n=>{this.hookUnitDied(n)},this.battle.hookBattleFinished=n=>{this.hookBattleFinished(n)},this.battle.hookRecommendEndTurn=n=>{this.hookRecommendEndTurn(n)},this.renderUnits(new Xi)}hookDoingAttack(t,e,n,r){const s=this.hexMap.hexToPixel(e.position.x,e.position.y);if(this.damageValueDisplay.addDamageValue(n,this.uiPlusRenderGroup,s),r===Yi.ATTACK_MELEE||r===Yi.COUNTER_ATTACK_MELEE){const o=.9+Math.random()*.2;Kt.play("sword",{speed:o})}if(r===Yi.ATTACK_RANGED){const o=.9+Math.random()*.2;Kt.play("arrow",{speed:o})}}hookNextTurn(t,e){const n=`Turn ${t+1} - Army ${e+1}`,r=this.getBannerTextureNameForArmyIndex(e),s=this.bannersSheet?.textures[r];this.turnChangeDisplay.addTurnChange(n,this.uiPlusRenderGroup,{x:500,y:350},s),this.topSidePanel&&this.topSidePanel.setActiveArmyIndex(e),this.commonControls.nextTurnButton&&(this.commonControls.nextTurnButton.filters=[])}hookMovingUnit(t,e){const n=.9+Math.random()*.2;Kt.play("move",{speed:n})}hookUnitDied(t){Kt.play("die")}hookBattleFinished(t){console.log("*** VICTORY for army #"+t);const e=`Victory for Army ${t+1}`,n=this.getBannerTextureNameForArmyIndex(t),r=this.bannersSheet?.textures[n];this.turnChangeDisplay.addEndOfBattle(e,this.uiPlusRenderGroup,{x:500,y:350},r),this.topSidePanel&&this.topSidePanel.setActiveArmyIndex(t)}hookRecommendEndTurn(t){this.commonControls.nextTurnButton&&(this.commonControls.nextTurnButton.filters=[new Kp({threshold:.25,bloomScale:1,brightness:1,blur:5,quality:3})])}directionToSpriteName(t){switch(t){case lt.EAST:return"hex_dir_E.png";case lt.NORTHEAST:return"hex_dir_NE.png";case lt.NORTHWEST:return"hex_dir_NW.png";case lt.WEST:return"hex_dir_W.png";case lt.SOUTHWEST:return"hex_dir_SW.png";case lt.SOUTHEAST:return"hex_dir_SE.png"}return"hex_empty.png"}renderUnits(t){this.unitRenderSubgroups.forEach(e=>{e.removeChildren()}),this.unitSprites=[],this.hexUnitBars.forEach(e=>{this.unitRenderGroup.removeChild(e)}),this.hexUnitBars=[],this.battle.creatures.forEach((e,n)=>{let{x:r,y:s}=this.hexMap.hexToPixel(e.position.x,e.position.y);r-=this.hexMap.cellSize().x/2,s-=this.hexMap.cellSize().y/2;let o="peasant_fork_right.png";if(e.facingDirection===lt.EAST||e.facingDirection===lt.SOUTHEAST||e.facingDirection===lt.NORTHEAST)switch(e.creatureType){case at.PEASANT:o="peasant_fork_right.png";break;case at.PEASANT_ARCHER:o="peasant_archer_right.png";break;case at.SPEARMAN:o="spearman_right.png";break;case at.SWORDSMAN:o="swordman_right.png";break;case at.BARBARIAN:o="barbarian_right.png";break;case at.CROSSBOWMAN:o="crossbowman_right.png";break}else if(e.facingDirection===lt.WEST||e.facingDirection===lt.SOUTHWEST||e.facingDirection===lt.NORTHWEST)switch(e.creatureType){case at.PEASANT:o="peasant_fork_left.png";break;case at.PEASANT_ARCHER:o="peasant_archer_left.png";break;case at.SPEARMAN:o="spearman_left.png";break;case at.SWORDSMAN:o="swordman_left.png";break;case at.BARBARIAN:o="barbarian_left.png";break;case at.CROSSBOWMAN:o="crossbowman_left.png";break}const a=new it(this.unitsSheet?.textures[o]);if(a.x=r,a.y=s,this.unitSprites.push(a),this.showFacingDirections){let l=this.directionToSpriteName(e.facingDirection);const u=new it(this.hexagonSheet?.textures[l]);u.position={x:r,y:s},u.alpha=.5,this.unitSprites.push(u),this.unitRenderSubgroups[e.position.y].addChild(u)}if(this.showHealthbars){let l=new yp({bg:"progress_bg.png",fill:"progress_fill.png",nineSliceSprite:{bg:[3,3,3,3],fill:[2,2,2,2]},fillPaddings:{top:2,right:2,bottom:2,left:2}});l.width=80,l.height=8,l.x=r,l.y=s+60,l.progress=100*e.stats.remaining_health/e.stats.health,l.rotation=-Math.PI/2,this.hexUnitBars.push(l),this.unitRenderSubgroups[e.position.y].addChild(l)}if(a.filters=[],n===this.battle.activeCreatureIndex){const l=new sr({color:13942642,thickness:2});a.filters=[l]}if(n===t.hoverEnemyIndex){const l=new sr({color:13907010,thickness:2});a.filters=[l]}if(n===t.hoverOverUnitIndex){const l=new sr({color:5623637,thickness:2});a.filters=[l]}this.unitRenderSubgroups[e.position.y].addChild(a)})}setupMainLoop(){this.app.ticker.maxFPS=60,this.app.ticker.add(t=>{if(this.perfDisplayPanel.startMeasure("frame"),this.fpsText&&(this.fpsText.text=`FPS: ${Math.round(t.FPS)}`),this.battle){this.perfDisplayPanel.startMeasure("battle.update");let e=this.battle.update(t.deltaMS);this.perfDisplayPanel.stopMeasure("battle.update"),e.somethingChanged&&(this.perfDisplayPanel.startMeasure("map.render"),this.updateMapRendering(e),this.perfDisplayPanel.stopMeasure("map.render"))}this.damageValueDisplay.update(t.deltaMS),this.turnChangeDisplay.update(t.deltaMS),this.perfDisplayPanel.stopMeasure("frame"),this.perfDisplayPanel.update()})}updateMapRendering(t){if(t.selectedCreatureIndex!=-1){let e=this.battle.creatures[t.selectedCreatureIndex].position;if(e.x>=0&&e.x<this.hexMap.width&&e.y>=0&&e.y<this.hexMap.height){if(this.hexSelectedSprite||(this.hexSelectedSprite=new it(this.hexagonSheet?.textures["hex_selected_green.png"]),this.hexCellsContainer.addChild(this.hexSelectedSprite)),this.hexSelectedSprite){const n=this.hexMap.hexToPixel(e.x,e.y);this.hexSelectedSprite.x=n.x-this.hexMap.cellSize().x/2,this.hexSelectedSprite.y=n.y-this.hexMap.cellSize().y/2}}else this.hexSelectedSprite&&(this.hexCellsContainer.removeChild(this.hexSelectedSprite),this.hexSelectedSprite=void 0);this.showStatsForUnit(this.battle.creatures[t.selectedCreatureIndex])}if(t.reachableCells){this.hexReachableSprites.forEach(n=>{this.hexCellsContainer.removeChild(n)}),this.hexReachableSprites=[];for(let n=0;n<this.hexMap.height;n++)for(let r=0;r<this.hexMap.width;r++){if(this.battle.pathfinding_tiles[r][n]<=0)continue;let s="hex_action_disabled_gray.png";this.battle.pathfinding_tiles[r][n]===100&&(s="hex_action_red.png");let o=this.hexMap.hexToPixel(r,n);o={x:o.x-this.hexMap.cellSize().x/2,y:o.y-this.hexMap.cellSize().y/2};let a=new it(this.hexagonSheet?.textures[s]);a.position.copyFrom(o),this.hexReachableSprites.push(a),this.hexCellsContainer.addChild(a)}let e=yt.getEdgesForDataMatrix(this.battle.rangereach_tiles,this.hexMap.width,this.hexMap.height);for(let n of e){let r=this.hexMap.hexToPixel(n.coord.x,n.coord.y);r={x:r.x-this.hexMap.cellSize().x/2,y:r.y-this.hexMap.cellSize().y/2};let s="hex_empty.png";switch(n.edge){case ht.EAST:s="hex_range_E.png";break;case ht.NORTHEAST:s="hex_range_NE.png";break;case ht.NORTH_NORTHEAST:s="hex_range_NNE.png";break;case ht.NORTH:s="hex_range_N.png";break;case ht.NORTH_NORTHWEST:s="hex_range_NNW.png";break;case ht.NORTHWEST:s="hex_range_NW.png";break;case ht.WEST:s="hex_range_W.png";break;case ht.SOUTHWEST:s="hex_range_SW.png";break;case ht.SOUTH_SOUTHWEST:s="hex_range_SSW.png";break;case ht.SOUTH:s="hex_range_S.png";break;case ht.SOUTH_SOUTHEAST:s="hex_range_SSE.png";break;case ht.SOUTHEAST:s="hex_range_SE.png";break}let o=new it(this.hexagonSheet?.textures[s]);o.tint=5592528,o.position.copyFrom(r),this.hexReachableSprites.push(o),this.hexCellsContainer.addChild(o)}}if(t.enemyReachableCells){this.hexEnemyReachableSprites.forEach(n=>{this.hexCellsContainer.removeChild(n)}),this.hexEnemyReachableSprites=[];for(let n=0;n<this.hexMap.height;n++)for(let r=0;r<this.hexMap.width;r++){if(this.battle.enemy_potential_tiles[r][n]<=0)continue;let s="hex_action_disabled_gray.png";this.battle.enemy_potential_tiles[r][n]===100&&(s="hex_action_blue.png");let o=this.hexMap.hexToPixel(r,n);o={x:o.x-this.hexMap.cellSize().x/2,y:o.y-this.hexMap.cellSize().y/2};let a=new it(this.hexagonSheet?.textures[s]);a.position.copyFrom(o),this.hexEnemyReachableSprites.push(a),this.hexCellsContainer.addChild(a)}let e=yt.getEdgesForDataMatrix(this.battle.enemy_range_tiles,this.hexMap.width,this.hexMap.height);for(let n of e){let r=this.hexMap.hexToPixel(n.coord.x,n.coord.y);r={x:r.x-this.hexMap.cellSize().x/2,y:r.y-this.hexMap.cellSize().y/2};let s="hex_empty.png";switch(n.edge){case ht.EAST:s="hex_range_E.png";break;case ht.NORTHEAST:s="hex_range_NE.png";break;case ht.NORTH_NORTHEAST:s="hex_range_NNE.png";break;case ht.NORTH:s="hex_range_N.png";break;case ht.NORTH_NORTHWEST:s="hex_range_NNW.png";break;case ht.NORTHWEST:s="hex_range_NW.png";break;case ht.WEST:s="hex_range_W.png";break;case ht.SOUTHWEST:s="hex_range_SW.png";break;case ht.SOUTH_SOUTHWEST:s="hex_range_SSW.png";break;case ht.SOUTH:s="hex_range_S.png";break;case ht.SOUTH_SOUTHEAST:s="hex_range_SSE.png";break;case ht.SOUTHEAST:s="hex_range_SE.png";break}let o=new it(this.hexagonSheet?.textures[s]);o.position.copyFrom(r),o.tint=16711680,this.hexEnemyReachableSprites.push(o),this.hexCellsContainer.addChild(o)}}if(t.hoverOverCell){if(this.hexHoverSprite||(this.hexHoverSprite=new it(this.hexagonSheet?.textures["hex_usable_yellow.png"]),this.hexCellsContainer.addChild(this.hexHoverSprite)),this.hexHoverSprite){const e=this.hexMap.hexToPixel(t.hoverOverCell.x,t.hoverOverCell.y);this.hexHoverSprite.x=e.x-this.hexMap.cellSize().x/2,this.hexHoverSprite.y=e.y-this.hexMap.cellSize().y/2}t.hoverEnemyIndex!=-1?this.showStatsForUnit(this.battle.creatures[t.hoverEnemyIndex]):t.hoverOverUnitIndex!=-1?this.showStatsForUnit(this.battle.creatures[t.hoverOverUnitIndex]):this.battle.activeCreatureIndex!=-1&&this.showStatsForUnit(this.battle.creatures[this.battle.activeCreatureIndex]),this.hexPathSprites.forEach(e=>{this.hexCellsContainer.removeChild(e)}),this.hexPathSprites=[],t.hoverPath.length>0&&(t.hoverPath.forEach(e=>{let n=new it(this.hexagonSheet?.textures["hex_usable_yellow.png"]);n.x=this.hexMap.hexToPixel(e.x,e.y).x-this.hexMap.cellSize().x/2,n.y=this.hexMap.hexToPixel(e.x,e.y).y-this.hexMap.cellSize().y/2,this.hexPathSprites.push(n)}),this.hexPathSprites.forEach(e=>{this.hexCellsContainer.addChild(e)}))}if((t.unitRenderUpdate||t.hoverOverUnitIndex!=-1||t.hoverEnemyIndex!=-1)&&this.renderUnits(t),t.cursorHint.length>0&&this.softCursorName!=t.cursorHint){this.softCursorName=t.cursorHint,this.uiPlusRenderGroup.removeChild(this.softCursorSprite);const e=this.softCursorSprite.position;this.softCursorSprite.texture=this.softCursorTextures[t.cursorHint];const n=this.softCursorTextures[t.cursorHint].defaultAnchor;n?this.softCursorSprite.anchor={x:n.x,y:n.y}:this.softCursorSprite.anchor={x:0,y:0},this.softCursorSprite.position.copyFrom(e),this.uiPlusRenderGroup.addChild(this.softCursorSprite)}if(t.animationAtCoords.type!=Hi.NONE){console.log(`Animation at coords: ${t.animationAtCoords.coords.x}, ${t.animationAtCoords.coords.y}`);let e="";switch(t.animationAtCoords.type){case Hi.ATTACK_MELEE:e="anim_sword_attack.png";break;case Hi.ATTACK_RANGED:e="anim_arrow_attack.png";break;default:e=""}if(console.log(`Animation texture source: ${e}`),e.length>0){const n=this.uiSheet?.animations[e];if(n){let r=new ln(n);const s=t.animationAtCoords.coords;r.animationSpeed=.4,r.x=this.hexMap.hexToPixel(s.x,s.y).x-this.hexMap.cellSize().x/2,r.y=this.hexMap.hexToPixel(s.x,s.y).y-this.hexMap.cellSize().y/2,r.play(),r.loop=!1,this.uiAnimationSprites.push(r),this.hexUiRenderGroup.addChild(r)}}}else this.uiAnimationSprites.forEach(e=>{this.hexUiRenderGroup.removeChild(e)}),this.uiAnimationSprites=[]}showStatsForUnit(t){if(this.unitStats){const e=this.getBannerTextureNameForArmyIndex(t.armyAlignment),n=this.bannersSheet?.textures[e];this.unitStats.setBannerTexture(n),this.unitStats.setCreature(t);let r="";switch(t.creatureType){case at.PEASANT:r="peasant_face.png";break;case at.PEASANT_ARCHER:r="peasant_archer_face.png";break;case at.SPEARMAN:r="spearman_face.png";break;case at.SWORDSMAN:r="swordman_face.png";break;case at.BARBARIAN:r="barbarian_face.png";break;case at.CROSSBOWMAN:r="crossbowman_face.png";break}const s=this.unitsSheet?.textures[r];this.unitStats.setFaceTexture(s),this.unitStats.update()}}setNavMapOffset(t){this.navMapOffset.y=Math.max(this.MAP_OFFSET_MIN.y,t.y),this.navMapOffset.y=Math.min(this.MAP_OFFSET_MAX.y,t.y),this.navMapOffset.x=Math.max(this.MAP_OFFSET_MIN.x,t.x),this.navMapOffset.x=Math.min(this.MAP_OFFSET_MAX.x,t.x),this.hexZoneContainer.position.copyFrom(this.navMapOffset)}setupInputHandlers(){window.addEventListener("gamepadconnected",t=>{let e=`Gamepad connected at index ${t.gamepad.index}: ${t.gamepad.id}. ${t.gamepad.buttons.length} buttons, ${t.gamepad.axes.length} axes.`;console.log(e),this.messagesText&&(this.messagesText.text=e)}),window.addEventListener("gamepaddisconnected",t=>{let e=`Gamepad disconnected from index ${t.gamepad.index}: ${t.gamepad.id}`;console.log(e),this.messagesText&&(this.messagesText.text=e)}),document.addEventListener("keydown",t=>{this.currentGameState===2&&(t.code==="Escape"||(t.code==="ArrowUp"?this.setNavMapOffset({x:this.navMapOffset.x,y:this.navMapOffset.y-10}):t.code==="ArrowDown"?this.setNavMapOffset({x:this.navMapOffset.x,y:this.navMapOffset.y+10}):t.code==="ArrowLeft"?this.setNavMapOffset({x:this.navMapOffset.x-10,y:this.navMapOffset.y}):t.code==="ArrowRight"?this.setNavMapOffset({x:this.navMapOffset.x+10,y:this.navMapOffset.y}):t.code==="Equal"?this.modifyZoomLevel(.1):t.code==="Minus"?this.modifyZoomLevel(-.1):(t.code==="ControlLeft"||t.code==="ControlRight")&&(this.controlPressed=!0)))}),document.addEventListener("keyup",t=>{t.code==="ControlLeft"||t.code==="ControlRight"?this.controlPressed=!1:t.code==="KeyE"?(this.battle?.nextTurn(),this.battle?.selectNextUnit()):t.code==="KeyN"?this.battle?.selectNextUnit():console.log(`Key pressed: ${t.code}`)}),document.addEventListener("wheel",t=>{if(this.currentGameState===2){let e={x:t.clientX/this.app.screen.width,y:t.clientY/this.app.screen.height};t.deltaY<0?this.modifyZoomLevel(.1,e):this.modifyZoomLevel(-.1,e)}}),document.addEventListener("mousedown",t=>{t.button===1&&(this.mouseDragCoords={x:t.clientX,y:t.clientY}),t.button===2&&(this.mouseRightClickCoords={x:t.clientX,y:t.clientY})}),document.addEventListener("mouseup",t=>{if(t.button===1&&(this.mouseDragCoords={x:0,y:0}),t.button===2){if(console.log("Right click"),this.mouseRightClickCoords.x>0&&this.mouseRightClickCoords.y>0){let e=this.adjustInContainerCoords({x:t.clientX,y:t.clientY},this.renderContainerOffset,this.renderContainer.scale),n=this.adjustInContainerCoords(e,this.navMapOffset,{x:this.navZoomLevel,y:this.navZoomLevel}),r=this.hexMap.pixelToHexWithDirectionalDetail(n.x,n.y),s=r.cell;s.x>=0&&s.x<this.hexMap.width&&s.y>=0&&s.y<this.hexMap.height&&this.battle?.onMouseClickOnCell(t,s,r.direction,this.controlPressed)}this.mouseRightClickCoords={x:0,y:0}}}),document.addEventListener("click",t=>{let e=this.adjustInContainerCoords({x:t.clientX,y:t.clientY},this.renderContainerOffset,this.renderContainer.scale),n=this.adjustInContainerCoords(e,this.navMapOffset,{x:this.navZoomLevel,y:this.navZoomLevel}),r=this.hexMap.pixelToHexWithDirectionalDetail(n.x,n.y),s=r.cell;s.x>=0&&s.x<this.hexMap.width&&s.y>=0&&s.y<this.hexMap.height&&this.battle?.onMouseClickOnCell(t,s,r.direction,this.controlPressed)}),document.addEventListener("mousemove",t=>{if(this.currentGameState===2){if(this.mouseDragCoords.x>0&&this.mouseDragCoords.y>0){let o=t.clientX-this.mouseDragCoords.x,a=t.clientY-this.mouseDragCoords.y;this.navMapOffset.x+=o,this.navMapOffset.y+=a,this.navMapOffset.x=Math.max(this.MAP_OFFSET_MIN.x,this.navMapOffset.x),this.navMapOffset.x=Math.min(this.MAP_OFFSET_MAX.x,this.navMapOffset.x),this.navMapOffset.y=Math.max(this.MAP_OFFSET_MIN.y,this.navMapOffset.y),this.navMapOffset.y=Math.min(this.MAP_OFFSET_MAX.y,this.navMapOffset.y),this.hexZoneContainer.position.copyFrom(this.navMapOffset),this.mouseDragCoords={x:t.clientX,y:t.clientY};return}let e=this.adjustInContainerCoords({x:t.clientX,y:t.clientY},this.renderContainerOffset,this.renderContainer.scale);this.softCursorSprite.position.copyFrom(e);let n=this.adjustInContainerCoords(e,this.navMapOffset,{x:this.navZoomLevel,y:this.navZoomLevel}),r=this.hexMap.pixelToHexWithDirectionalDetail(n.x,n.y),s=r.cell;s.x>=0&&s.x<this.hexMap.width&&s.y>=0&&s.y<this.hexMap.height?this.battle.onMouseOverCell(s,r.direction,this.controlPressed):this.hexHoverSprite&&(this.hexCellsContainer.removeChild(this.hexHoverSprite),this.hexHoverSprite=void 0)}}),globalThis.addEventListener("touchstart",t=>{if(!this.displayOnScreenTouchControls){console.log("Adding on-screen touch controls"),this.displayOnScreenTouchControls=!0,this.uiRenderGroup.addChild(this.touchSpriteLeft),this.uiRenderGroup.addChild(this.touchSpriteRight);return}if(this.currentGameState===2&&t.touches.length>0){console.log(`Touch start: ${t.touches.item(0)?.clientX}, ${t.touches.item(0)?.clientY}`);const e=t.touches.item(0)?.clientX,n=t.touches.item(0)?.clientY;e&&n&&this.reactToTouchInput(e,n)}},!1)}reactToTouchInput(t,e){console.log(`Touch input: ${t}, ${e}`)}adjustInContainerCoords(t,e,n){return{x:(t.x-e.x)/n.x,y:(t.y-e.y)/n.y}}}const Qx=new Pa,Jx=new Zx(Qx);(async()=>await Jx.initialize())();export{Ss as $,wa as A,bt as B,X as C,ft as D,U as E,Y as F,W as G,oe as H,Yo as I,Dt as J,te as K,_s as L,Q as M,it as N,Ih as O,Ft as P,Gh as Q,on as R,Dh as S,Ut as T,rn as U,_t as V,Hh as W,Hd as X,Xd as Y,St as Z,ys as _,Ot as a,ah as a0,In as a1,K as a2,Ko as a3,Ca as a4,Yd as a5,Kh as a6,za as a7,Rc as a8,Uc as a9,Dc as aa,Gc as ab,Vc as ac,$e as ad,Vr as ae,ve as af,B as ag,pt as ah,de as ai,Rf as aj,Ga as ak,Hs as al,Ws as am,Iu as an,Ie as ao,$d as ap,Tr as aq,Bf as ar,gt as as,Ru as at,Cr as au,wr as av,po as aw,nn as ax,$a as ay,lc as b,fe as c,Vi as d,It as e,$s as f,sc as g,$r as h,De as i,ya as j,Wr as k,zt as l,Hr as m,fo as n,Oc as o,Ec as p,Lc as q,Hu as r,Ia as s,Nc as t,pn as u,k as v,vt as w,Ou as x,H as y,$c as z};