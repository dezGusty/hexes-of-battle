import { describe, it, expect, vi } from 'vitest';
import { Texture } from 'pixi.js';
import { initWebGLFixes } from './webgl-fixes';

describe('WebGL Deprecation & Warning Fixes', () => {
  it('should configure PixiJS default textures with no-premultiply-alpha', () => {
    initWebGLFixes();
    expect(Texture.WHITE.source.alphaMode).toBe('no-premultiply-alpha');
    expect(Texture.EMPTY.source.alphaMode).toBe('no-premultiply-alpha');
  });

  it('should guard non-DOM uploads from UNPACK_FLIP_Y and UNPACK_PREMULTIPLY_ALPHA in WebGL texImage2D', () => {
    // Mock WebGLRenderingContext
    const origPixelStorei = vi.fn();
    const origTexImage2D = vi.fn();
    const origTexSubImage2D = vi.fn();

    const fakeGl: any = {
      UNPACK_FLIP_Y_WEBGL: 0x9240,
      UNPACK_PREMULTIPLY_ALPHA_WEBGL: 0x9241,
      pixelStorei: origPixelStorei,
      texImage2D: origTexImage2D,
      texSubImage2D: origTexSubImage2D,
    };

    // Install prototype guards on fakeGl prototype
    const fakeProto = Object.getPrototypeOf(fakeGl) || {};
    fakeProto.pixelStorei = origPixelStorei;
    fakeProto.texImage2D = origTexImage2D;
    fakeProto.texSubImage2D = origTexSubImage2D;

    // Temporarily attach to globalThis.WebGLRenderingContext
    const globalScope = globalThis as any;
    const origContext = globalScope.WebGLRenderingContext;
    globalScope.WebGLRenderingContext = function () {} as any;
    globalScope.WebGLRenderingContext.prototype = fakeProto;

    initWebGLFixes();

    // Call pixelStorei to enable flipY and premultiplyAlpha
    fakeProto.pixelStorei.call(fakeGl, fakeGl.UNPACK_FLIP_Y_WEBGL, true);
    fakeProto.pixelStorei.call(fakeGl, fakeGl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

    // Call texImage2D with non-DOM data (null)
    const recordedPixelStoreCalls: [number, any][] = [];
    origPixelStorei.mockImplementation((pname, param) => {
      recordedPixelStoreCalls.push([pname, param]);
    });

    fakeProto.texImage2D.call(fakeGl, 0x0de1, 0, 0x1908, 1, 1, 0, 0x1908, 0x1401, null);

    // Should have temporarily disabled flags and then restored them
    expect(recordedPixelStoreCalls).toEqual([
      [fakeGl.UNPACK_FLIP_Y_WEBGL, false],
      [fakeGl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false],
      [fakeGl.UNPACK_FLIP_Y_WEBGL, true],
      [fakeGl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true],
    ]);

    // Cleanup
    globalScope.WebGLRenderingContext = origContext;
  });
});
