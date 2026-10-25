// Patches the official v0.20.4 build (assets/ + index.html in this folder) so it calls window.HOB3D.
// Idempotent: re-running on an already patched bundle is a no-op.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const bundle = path.join(root, 'assets', 'index-fp_m_7IR.js');
const html = path.join(root, 'index.html');

// Registry of the bundle's own Three.js classes (minified names mapped by their type strings).
const REGISTRY =
  'function __hobT(){return{Group:fm,Mesh:ig,BoxGeometry:Lg,CylinderGeometry:Rg,ConeGeometry:zg,' +
  'SphereGeometry:qg,BufferGeometry:hh,Float32BufferAttribute:rh,MeshStandardMaterial:i_,' +
  'ShaderMaterial:n_,FogExp2:bm,Color:X,CanvasTexture:Ng,WebGLRenderer:tS,Scene:xm,' +
  'PerspectiveCamera:$_,AmbientLight:rv,DirectionalLight:nv}}';
const REGISTRY_RE = /function __hobT\(\)\{return\{[^}]*\}\}/;

const patches = [
  {
    name: 'units use 3D models',
    from: 'createSingleModelVisual(e,t,n){switch(t){',
    to: 'createSingleModelVisual(e,t,n){if(window.HOB3D){let u=window.HOB3D.createUnit(__hobT(),e,n);if(u)return u}switch(t){',
  },
  {
    name: 'sky and lighting',
    from: 'setupSkyBackground(){this.scene.fog=new bm(990246,.018)}',
    to: 'setupSkyBackground(){this.scene.fog=new bm(990246,.018),window.HOB3D&&window.HOB3D.setupAtmosphere(__hobT(),this)}',
  },
  {
    name: 'terrain props',
    from: 'this.rebuildGridBorders(),this.rebuildCoords()}',
    to: 'this.rebuildGridBorders(),this.rebuildCoords(),window.HOB3D&&window.HOB3D.decorateBoard(__hobT(),this)}',
  },
];

let src = fs.readFileSync(bundle, 'utf8');
if (src.includes('function __hobT(')) {
  console.log('bundle already patched');
} else {
  for (const p of patches) {
    const n = src.split(p.from).length - 1;
    if (n !== 1) throw new Error(`anchor for "${p.name}" found ${n} times, expected 1`);
    src = src.replace(p.from, p.to);
    console.log('patched:', p.name);
  }
  // Append the registry at module scope, before the source-map comment if any.
  src = src.replace(/\s*$/, '\n' + REGISTRY + '\n');
  fs.writeFileSync(bundle, src);
}

// Relative base path, so the game also runs from a subfolder (GitHub Pages project site).
// Later additions, each applied on its own so an already patched bundle picks them up.
src = fs.readFileSync(bundle, 'utf8');
if (!src.includes(REGISTRY)) {
  src = src.replace(REGISTRY_RE, () => REGISTRY);
  console.log('updated: class registry');
}
// Each hook checks that the add-on function exists, so a cached older hob3d.js next to a
// newer bundle (browser and CDN caches expire separately) skips the hook instead of throwing.
// `prev` lists earlier versions of `to`, upgraded in place on an already patched bundle.
const LATE_PATCHES = [
  {
    name: '3D portraits',
    from: 'getFaceTextureForCreature(e){if(!this.assets.unitsSheet)return;',
    prev: ['getFaceTextureForCreature(e){if(!this.assets.unitsSheet)return;if(window.HOB3D){let f=window.HOB3D.portraitFor('],
    to: 'getFaceTextureForCreature(e){if(!this.assets.unitsSheet)return;if(window.HOB3D?.portraitFor){let f=window.HOB3D.portraitFor(',
    tail: '__hobT(),e,c=>this.assets.unitsSheet.textures[`peasant_face.png`].constructor.from(c));if(f)return f}',
  },
  // HUD edge anchoring: hand the HUD and the screen size to the add-on, and map pointer
  // positions back to the HUD's design coordinates before its hard-coded hit tests.
  {
    name: 'register HUD',
    from: 'this.container.addChild(this.uiCursorRenderGroup)',
    prev: ['this.container.addChild(this.uiCursorRenderGroup),window.HOB3D&&window.HOB3D.registerHud(this)'],
    to: 'this.container.addChild(this.uiCursorRenderGroup),window.HOB3D?.registerHud&&window.HOB3D.registerHud(this)',
  },
  {
    name: 'screen size to add-on',
    from: 'this.renderContainer.position.set(this.renderContainerOffset.x,this.renderContainerOffset.y)}',
    prev: ['this.renderContainer.position.set(this.renderContainerOffset.x,this.renderContainerOffset.y),window.HOB3D&&window.HOB3D.uiResize(e,t,i)}'],
    to: 'this.renderContainer.position.set(this.renderContainerOffset.x,this.renderContainerOffset.y),window.HOB3D?.uiResize&&window.HOB3D.uiResize(e,t,i)}',
  },
  {
    name: 'UI hover test in design coordinates',
    from: 'isPointerOverUI(e,t){return!!(',
    prev: ['isPointerOverUI(e,t){window.HOB3D&&([e,t]=window.HOB3D.uiUnshift(e,t));return!!('],
    to: 'isPointerOverUI(e,t){window.HOB3D?.uiUnshift&&([e,t]=window.HOB3D.uiUnshift(e,t));return!!(',
  },
  {
    name: 'UI click in design coordinates',
    from: 'handleClick(e,t){return this.unitStats?.isVisible()',
    prev: ['handleClick(e,t){window.HOB3D&&([e,t]=window.HOB3D.uiUnshift(e,t));return this.unitStats?.isVisible()'],
    to: 'handleClick(e,t){window.HOB3D?.uiUnshift&&([e,t]=window.HOB3D.uiUnshift(e,t));return this.unitStats?.isVisible()',
  },
  {
    name: 'panel hover tooltips in design coordinates',
    from: 'this.unitStats?.isVisible()&&this.unitStats.mousemove(e),this.enemyStats?.isVisible()&&this.enemyStats.mousemove(e)}',
    prev: ['(()=>{let u=window.HOB3D?window.HOB3D.uiUnshift(e.x,e.y):[e.x,e.y],'],
    to: '(()=>{let u=window.HOB3D?.uiUnshift?window.HOB3D.uiUnshift(e.x,e.y):[e.x,e.y],',
    tail: 'p={x:u[0],y:u[1]};this.unitStats?.isVisible()&&this.unitStats.mousemove(p),this.enemyStats?.isVisible()&&this.enemyStats.mousemove(p)})()}',
  },
];
for (const p of LATE_PATCHES) {
  if (src.includes(p.to)) continue;
  const old = (p.prev || []).find((s) => src.includes(s));
  if (old) {
    src = src.replace(old, () => p.to);
    console.log('upgraded:', p.name);
    continue;
  }
  const n = src.split(p.from).length - 1;
  if (n !== 1) throw new Error(`anchor for "${p.name}" found ${n} times, expected 1`);
  // A `tail` patch replaces `from` with `to + tail` (the tail is unchanged between versions).
  src = src.replace(p.from, () => p.to + (p.tail || ''));
  console.log('patched:', p.name);
}
fs.writeFileSync(bundle, src);

// Vite's preload helper resolves "assets/x.js" against the page, not against the script.
const OLD_BASES = ['mt=function(e){return`/`+e}', 'mt=function(e){return`./`+e}'];
const REL_BASE = 'mt=function(e){return new URL(e,document.baseURI).href}';
src = fs.readFileSync(bundle, 'utf8');
for (const old of OLD_BASES) {
  if (src.includes(old)) {
    src = src.replace(old, REL_BASE);
    fs.writeFileSync(bundle, src);
    console.log('patched: page-relative preload base');
  }
}

let page = fs.readFileSync(html, 'utf8');
if (!page.includes('hob3d.js')) {
  page = page.replace('<script type="module"', '<script src="./hob3d.js"></script>\n  <script type="module"');
  console.log('index.html loads hob3d.js');
}
if (page.includes('"/assets/')) {
  page = page.replaceAll('"/assets/', '"./assets/');
  console.log('index.html uses relative asset paths');
}
fs.writeFileSync(html, page);
