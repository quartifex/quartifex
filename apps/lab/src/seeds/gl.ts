// A small WebGL 1 helper shared by the shader seeds: one full-screen triangle, one fragment
// shader, textures from images, uniforms by name. Lab code: no API promises.

const VERT = `attribute vec2 p;varying vec2 vUv;void main(){vUv=p*.5+.5;gl_Position=vec4(p,0.,1.);}`;

export type Uniform = number | readonly [number, number] | readonly [number, number, number];

export type Quad = {
  gl: WebGLRenderingContext;
  /** Sets the uniforms given, binds textures to units in order, draws one frame. */
  draw: (uniforms: Record<string, Uniform>, textures?: Record<string, WebGLTexture | null>) => void;
  /** Uploads an image (or replaces one) as a linear, clamped texture. */
  texture: (source: TexImageSource, existing?: WebGLTexture | null) => WebGLTexture | null;
  /** Matches the drawing buffer to the canvas's CSS size times `dpr`. */
  resize: (dpr: number) => [number, number];
  dispose: () => void;
};

export function createQuad(canvas: HTMLCanvasElement, frag: string): Quad | null {
  const gl = canvas.getContext("webgl", { premultipliedAlpha: false, antialias: false });
  if (!gl) return null;
  const shader = (type: number, src: string) => {
    const s = gl.createShader(type);
    if (!s) throw new Error("shader");
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
      throw new Error(gl.getShaderInfoLog(s) ?? "compile");
    return s;
  };
  const prog = gl.createProgram();
  if (!prog) return null;
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT));
  gl.attachShader(
    prog,
    shader(gl.FRAGMENT_SHADER, `precision highp float;varying vec2 vUv;${frag}`),
  );
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
    throw new Error(gl.getProgramInfoLog(prog) ?? "link");
  // biome-ignore lint/correctness/useHookAtTopLevel: WebGL's useProgram, not a React hook
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  const locs = new Map<string, WebGLUniformLocation | null>();
  const at = (name: string) => {
    if (!locs.has(name)) locs.set(name, gl.getUniformLocation(prog, name));
    return locs.get(name) ?? null;
  };

  return {
    gl,
    texture(source, existing) {
      const tex = existing ?? gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      return tex;
    },
    resize(dpr) {
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      return [w, h];
    },
    draw(uniforms, textures = {}) {
      let unit = 0;
      for (const [name, tex] of Object.entries(textures)) {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.uniform1i(at(name), unit);
        unit++;
      }
      for (const [name, v] of Object.entries(uniforms)) {
        const l = at(name);
        if (typeof v === "number") gl.uniform1f(l, v);
        else if (v.length === 2) gl.uniform2f(l, v[0], v[1]);
        else gl.uniform3f(l, v[0], v[1], v[2]);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    // The context stays alive: a canvas gives the same context back, and Strict Mode
    // rebuilds effects on it, so only the program and buffer are released.
    dispose() {
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    },
  };
}

/** Loads an image and resolves once it can be drawn. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

/** A gyro sequence frame (72 frames, 960 x 540, WebP), the hub's own rendered sequence. */
export const gyroFrame = (index: number) =>
  `/sequences/gyro/w960/webp/${String(Math.max(0, Math.min(71, index))).padStart(4, "0")}.webp`;

/** The jar sequence's frame, same shape. */
export const jarFrame = (index: number) =>
  `/sequences/jar/w960/webp/${String(Math.max(0, Math.min(71, index))).padStart(4, "0")}.webp`;

/** GLSL: cover-fit a texture of aspect `ta` into a viewport of aspect `va`. */
export const COVER = `vec2 cover(vec2 uv,float va,float ta){vec2 s=va>ta?vec2(1.,ta/va):vec2(va/ta,1.);return (uv-.5)*s+.5;}`;

/** GLSL: value noise and fbm. */
export const NOISE = `float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*vnoise(p);p*=2.03;a*=.5;}return v;}`;
