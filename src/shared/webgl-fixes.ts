import { Texture } from 'pixi.js';

/**
 * Initializes guards and configurations to eliminate WebGL specification warnings:
 * 1. "WebGL warning: texImage: Alpha-premult and y-flip are deprecated for non-DOM-Element uploads."
 * 2. "WebGL warning: texSubImage: Alpha-premult and y-flip are deprecated for non-DOM-Element uploads."
 *
 * In WebGL 2.0 / WebGL specs, UNPACK_FLIP_Y_WEBGL and UNPACK_PREMULTIPLY_ALPHA_WEBGL only apply to
 * DOM elements (HTMLImageElement, HTMLCanvasElement, HTMLVideoElement, ImageData, ImageBitmap).
 * When uploading TypedArrays, ArrayBuffers, or allocating null storage, those flags are deprecated
 * and trigger browser warnings (e.g. in Firefox).
 */
export function initWebGLFixes(): void {
  // 1. PixiJS built-in Texture.WHITE and Texture.EMPTY use BufferImageSource/TextureSource with
  // alphaMode: 'premultiply-alpha-on-upload' by default. Set them to 'no-premultiply-alpha'
  // so PixiJS does not set UNPACK_PREMULTIPLY_ALPHA_WEBGL when uploading raw buffer data.
  if (Texture.WHITE?.source) {
    Texture.WHITE.source.alphaMode = 'no-premultiply-alpha';
  }
  if (Texture.EMPTY?.source) {
    Texture.EMPTY.source.alphaMode = 'no-premultiply-alpha';
  }

  // 2. Prototype-level guard on WebGLRenderingContext and WebGL2RenderingContext.
  // Tracks UNPACK_FLIP_Y_WEBGL and UNPACK_PREMULTIPLY_ALPHA_WEBGL state in memory without GPU stalls.
  // If texImage2D or texSubImage2D is called with a non-DOM element (null, TypedArray) while either
  // flag is enabled, temporarily resets the flag for that upload to adhere strictly to WebGL 2.0.
  const globalScope: any = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null);
  if (globalScope) {
    const contexts = [
      globalScope.WebGLRenderingContext?.prototype,
      globalScope.WebGL2RenderingContext?.prototype,
    ].filter(Boolean) as (WebGLRenderingContext | WebGL2RenderingContext)[];

    for (const proto of contexts) {
      if ((proto as any).__webglDeprecationGuardInstalled) continue;
      (proto as any).__webglDeprecationGuardInstalled = true;

      const origPixelStorei = proto.pixelStorei;
      const origTexImage2D = proto.texImage2D;
      const origTexSubImage2D = proto.texSubImage2D;

      const stateMap = new WeakMap<WebGLRenderingContextBase, { flipY: boolean; premult: boolean }>();

      proto.pixelStorei = function (pname: number, param: any) {
        let state = stateMap.get(this);
        if (!state) {
          state = { flipY: false, premult: false };
          stateMap.set(this, state);
        }
        if (pname === this.UNPACK_FLIP_Y_WEBGL) {
          state.flipY = Boolean(param);
        } else if (pname === this.UNPACK_PREMULTIPLY_ALPHA_WEBGL) {
          state.premult = Boolean(param);
        }
        return origPixelStorei.call(this, pname, param);
      };

      const isDOMElement = (val: any): boolean => {
        if (!val) return false;
        if (typeof Element !== 'undefined' && val instanceof Element) return true;
        if (typeof ImageData !== 'undefined' && val instanceof ImageData) return true;
        if (typeof ImageBitmap !== 'undefined' && val instanceof ImageBitmap) return true;
        return false;
      };

      proto.texImage2D = function (...args: any[]) {
        const state = stateMap.get(this);
        const lastArg = args[args.length - 1];
        const isDom = isDOMElement(lastArg);
        if (!isDom && state && (state.flipY || state.premult)) {
          if (state.flipY) origPixelStorei.call(this, this.UNPACK_FLIP_Y_WEBGL, false);
          if (state.premult) origPixelStorei.call(this, this.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
          try {
            return (origTexImage2D as any).apply(this, args);
          } finally {
            if (state.flipY) origPixelStorei.call(this, this.UNPACK_FLIP_Y_WEBGL, true);
            if (state.premult) origPixelStorei.call(this, this.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
          }
        }
        return (origTexImage2D as any).apply(this, args);
      };

      proto.texSubImage2D = function (...args: any[]) {
        const state = stateMap.get(this);
        const lastArg = args[args.length - 1];
        const isDom = isDOMElement(lastArg);
        if (!isDom && state && (state.flipY || state.premult)) {
          if (state.flipY) origPixelStorei.call(this, this.UNPACK_FLIP_Y_WEBGL, false);
          if (state.premult) origPixelStorei.call(this, this.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
          try {
            return (origTexSubImage2D as any).apply(this, args);
          } finally {
            if (state.flipY) origPixelStorei.call(this, this.UNPACK_FLIP_Y_WEBGL, true);
            if (state.premult) origPixelStorei.call(this, this.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
          }
        }
        return (origTexSubImage2D as any).apply(this, args);
      };
    }
  }
}
