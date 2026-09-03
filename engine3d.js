/* ============================================================================
 * Мандашня · engine3d.js
 * Self-contained minimal WebGL (1.0) 3D engine — no external dependencies.
 * Exposes window.GLB with mat4/vec3 math, a Renderer, texture/mesh helpers,
 * camera projection and ground-plane raycasting. Designed for an offline PWA.
 * ==========================================================================*/
(function () {
  "use strict";

  /* ----------------------------- mat4 / vec3 ------------------------------ */
  var M = {
    create: function () { var o = new Float32Array(16); o[0] = o[5] = o[10] = o[15] = 1; return o; },
    identity: function (o) {
      o[0]=1;o[1]=0;o[2]=0;o[3]=0; o[4]=0;o[5]=1;o[6]=0;o[7]=0;
      o[8]=0;o[9]=0;o[10]=1;o[11]=0; o[12]=0;o[13]=0;o[14]=0;o[15]=1; return o;
    },
    clone: function (a) { var o = new Float32Array(16); o.set(a); return o; },
    mul: function (o, a, b) {
      var a00=a[0],a01=a[1],a02=a[2],a03=a[3], a10=a[4],a11=a[5],a12=a[6],a13=a[7],
          a20=a[8],a21=a[9],a22=a[10],a23=a[11], a30=a[12],a31=a[13],a32=a[14],a33=a[15];
      var b0,b1,b2,b3;
      b0=b[0];b1=b[1];b2=b[2];b3=b[3];
      o[0]=b0*a00+b1*a10+b2*a20+b3*a30; o[1]=b0*a01+b1*a11+b2*a21+b3*a31; o[2]=b0*a02+b1*a12+b2*a22+b3*a32; o[3]=b0*a03+b1*a13+b2*a23+b3*a33;
      b0=b[4];b1=b[5];b2=b[6];b3=b[7];
      o[4]=b0*a00+b1*a10+b2*a20+b3*a30; o[5]=b0*a01+b1*a11+b2*a21+b3*a31; o[6]=b0*a02+b1*a12+b2*a22+b3*a32; o[7]=b0*a03+b1*a13+b2*a23+b3*a33;
      b0=b[8];b1=b[9];b2=b[10];b3=b[11];
      o[8]=b0*a00+b1*a10+b2*a20+b3*a30; o[9]=b0*a01+b1*a11+b2*a21+b3*a31; o[10]=b0*a02+b1*a12+b2*a22+b3*a32; o[11]=b0*a03+b1*a13+b2*a23+b3*a33;
      b0=b[12];b1=b[13];b2=b[14];b3=b[15];
      o[12]=b0*a00+b1*a10+b2*a20+b3*a30; o[13]=b0*a01+b1*a11+b2*a21+b3*a31; o[14]=b0*a02+b1*a12+b2*a22+b3*a32; o[15]=b0*a03+b1*a13+b2*a23+b3*a33;
      return o;
    },
    perspective: function (o, fovy, aspect, near, far) {
      var f = 1.0 / Math.tan(fovy / 2), nf = 1 / (near - far);
      o[0]=f/aspect;o[1]=0;o[2]=0;o[3]=0; o[4]=0;o[5]=f;o[6]=0;o[7]=0;
      o[8]=0;o[9]=0;o[10]=(far+near)*nf;o[11]=-1; o[12]=0;o[13]=0;o[14]=(2*far*near)*nf;o[15]=0; return o;
    },
    lookAt: function (o, eye, center, up) {
      var ex=eye[0],ey=eye[1],ez=eye[2], ux=up[0],uy=up[1],uz=up[2], cx=center[0],cy=center[1],cz=center[2];
      var z0=ex-cx, z1=ey-cy, z2=ez-cz;
      var zl=1/Math.hypot(z0,z1,z2); z0*=zl;z1*=zl;z2*=zl;
      var x0=uy*z2-uz*z1, x1=uz*z0-ux*z2, x2=ux*z1-uy*z0;
      var xl=Math.hypot(x0,x1,x2); if(!xl){x0=0;x1=0;x2=0;} else {xl=1/xl; x0*=xl;x1*=xl;x2*=xl;}
      var y0=z1*x2-z2*x1, y1=z2*x0-z0*x2, y2=z0*x1-z1*x0;
      o[0]=x0;o[1]=y0;o[2]=z0;o[3]=0; o[4]=x1;o[5]=y1;o[6]=z1;o[7]=0; o[8]=x2;o[9]=y2;o[10]=z2;o[11]=0;
      o[12]=-(x0*ex+x1*ey+x2*ez); o[13]=-(y0*ex+y1*ey+y2*ez); o[14]=-(z0*ex+z1*ey+z2*ez); o[15]=1; return o;
    },
    invert: function (o, a) {
      var a00=a[0],a01=a[1],a02=a[2],a03=a[3],a10=a[4],a11=a[5],a12=a[6],a13=a[7],
          a20=a[8],a21=a[9],a22=a[10],a23=a[11],a30=a[12],a31=a[13],a32=a[14],a33=a[15];
      var b00=a00*a11-a01*a10,b01=a00*a12-a02*a10,b02=a00*a13-a03*a10,b03=a01*a12-a02*a11,
          b04=a01*a13-a03*a11,b05=a02*a13-a03*a12,b06=a20*a31-a21*a30,b07=a20*a32-a22*a30,
          b08=a20*a33-a23*a30,b09=a21*a32-a22*a31,b10=a21*a33-a23*a31,b11=a22*a33-a23*a32;
      var det=b00*b11-b01*b10+b02*b09+b03*b08-b04*b07+b05*b06;
      if(!det) return null; det=1/det;
      o[0]=(a11*b11-a12*b10+a13*b09)*det; o[1]=(a02*b10-a01*b11-a03*b09)*det; o[2]=(a31*b05-a32*b04+a33*b03)*det; o[3]=(a22*b04-a21*b05-a23*b03)*det;
      o[4]=(a12*b08-a10*b11-a13*b07)*det; o[5]=(a00*b11-a02*b08+a03*b07)*det; o[6]=(a32*b02-a30*b05-a33*b01)*det; o[7]=(a20*b05-a22*b02+a23*b01)*det;
      o[8]=(a10*b10-a11*b08+a13*b06)*det; o[9]=(a01*b08-a00*b10-a03*b06)*det; o[10]=(a30*b04-a31*b02+a33*b00)*det; o[11]=(a21*b02-a20*b04-a23*b00)*det;
      o[12]=(a11*b07-a10*b09-a12*b06)*det; o[13]=(a00*b09-a01*b07+a02*b06)*det; o[14]=(a31*b01-a30*b03-a32*b00)*det; o[15]=(a20*b03-a21*b01+a22*b00)*det;
      return o;
    },
    fromTRS: function (o, tx, ty, tz, rx, ry, rz, sx, sy, sz) {
      var cx=Math.cos(rx),sxr=Math.sin(rx),cy=Math.cos(ry),syr=Math.sin(ry),cz=Math.cos(rz),szr=Math.sin(rz);
      // R = Rz * Ry * Rx
      var r00=cy*cz, r01=cy*szr, r02=-syr;
      var r10=sxr*syr*cz-cx*szr, r11=sxr*syr*szr+cx*cz, r12=sxr*cy;
      var r20=cx*syr*cz+sxr*szr, r21=cx*syr*szr-sxr*cz, r22=cx*cy;
      o[0]=r00*sx;o[1]=r01*sx;o[2]=r02*sx;o[3]=0;
      o[4]=r10*sy;o[5]=r11*sy;o[6]=r12*sy;o[7]=0;
      o[8]=r20*sz;o[9]=r21*sz;o[10]=r22*sz;o[11]=0;
      o[12]=tx;o[13]=ty;o[14]=tz;o[15]=1; return o;
    },
    normalMat3: function (out9, m) {
      var a00=m[0],a01=m[1],a02=m[2],a10=m[4],a11=m[5],a12=m[6],a20=m[8],a21=m[9],a22=m[10];
      var b01=a22*a11-a12*a21, b11=-a22*a10+a12*a20, b21=a21*a10-a11*a20;
      var det=a00*b01+a01*b11+a02*b21; if(!det){ out9[0]=1;out9[1]=0;out9[2]=0;out9[3]=0;out9[4]=1;out9[5]=0;out9[6]=0;out9[7]=0;out9[8]=1; return out9; }
      det=1/det;
      out9[0]=b01*det; out9[1]=(-a22*a01+a02*a21)*det; out9[2]=(a12*a01-a02*a11)*det;
      out9[3]=b11*det; out9[4]=(a22*a00-a02*a20)*det; out9[5]=(-a12*a00+a02*a10)*det;
      out9[6]=b21*det; out9[7]=(-a21*a00+a01*a20)*det; out9[8]=(a11*a00-a01*a10)*det;
      return out9;
    }
  };
  var V = {
    sub: function (a, b) { return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]; },
    cross: function (a, b) { return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]; },
    norm: function (a) { var l = Math.hypot(a[0],a[1],a[2]) || 1; return [a[0]/l, a[1]/l, a[2]/l]; }
  };

  /* ----------------------------- Shaders ---------------------------------- */
  var VS = [
    "attribute vec3 aPos; attribute vec3 aNormal; attribute vec2 aUV;",
    "uniform mat4 uProj, uView, uModel; uniform mat3 uNormalMat;",
    "varying vec3 vN; varying vec2 vUV; varying vec3 vWorld;",
    "void main(){ vec4 wp = uModel*vec4(aPos,1.0); vWorld=wp.xyz; vN=uNormalMat*aNormal; vUV=aUV; gl_Position=uProj*uView*wp; }"
  ].join("\n");
  var FS = [
    "precision mediump float;",
    "uniform sampler2D uTex; uniform float uUseTex; uniform vec4 uColor;",
    "uniform float uAmbient, uAlphaTest, uShininess, uEmissive;",
    "uniform vec3 uLightDir, uEye, uFog; uniform float uFogAmt;",
    "varying vec3 vN; varying vec2 vUV; varying vec3 vWorld;",
    "void main(){",
    "  vec4 base = uColor; if(uUseTex>0.5) base *= texture2D(uTex, vUV);",
    "  if(base.a < uAlphaTest) discard;",
    "  vec3 N = normalize(vN); vec3 Ld = normalize(uLightDir);",
    "  float diff = max(dot(N, Ld), 0.0);",
    "  float light = uAmbient + diff*(1.0-uAmbient);",
    "  vec3 col = base.rgb * light;",
    "  if(uShininess>0.0){ vec3 Vd=normalize(uEye-vWorld); vec3 H=normalize(Ld+Vd); float s=pow(max(dot(N,H),0.0),uShininess); col += vec3(s)*0.4; }",
    "  col = mix(col, base.rgb, uEmissive);",
    "  gl_FragColor = vec4(col, base.a);",
    "}"
  ].join("\n");

  function compile(gl, type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error("shader: " + gl.getShaderInfoLog(s));
    return s;
  }

  /* ----------------------------- Mesh builders ---------------------------- */
  function makeMesh(gl, pos, nrm, uv, idx) {
    function buf(data, arrType) { var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, arrType, gl.STATIC_DRAW); return b; }
    var m = { pos: buf(0, new Float32Array(pos)), nrm: buf(0, new Float32Array(nrm)), uv: buf(0, new Float32Array(uv)), count: idx.length };
    m.idx = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.idx); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
    return m;
  }
  // Box centered on X/Z, spanning y in [0,1]*h scaled later; unit box [-0.5,0.5]^3.
  function boxGeo() {
    var p = [], n = [], u = [], idx = [];
    var faces = [
      { nx:0,ny:0,nz:1,  v:[[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]] },
      { nx:0,ny:0,nz:-1, v:[[.5,-.5,-.5],[-.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5]] },
      { nx:1,ny:0,nz:0,  v:[[.5,-.5,.5],[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5]] },
      { nx:-1,ny:0,nz:0, v:[[-.5,-.5,-.5],[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5]] },
      { nx:0,ny:1,nz:0,  v:[[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5],[-.5,.5,-.5]] },
      { nx:0,ny:-1,nz:0, v:[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5],[-.5,-.5,.5]] }
    ];
    var uvq = [[0,1],[1,1],[1,0],[0,0]];
    faces.forEach(function (f) {
      var base = p.length / 3;
      for (var i=0;i<4;i++){ p.push(f.v[i][0],f.v[i][1],f.v[i][2]); n.push(f.nx,f.ny,f.nz); u.push(uvq[i][0],uvq[i][1]); }
      idx.push(base,base+1,base+2, base,base+2,base+3);
    });
    return { pos:p, nrm:n, uv:u, idx:idx };
  }
  // Dice cube with per-face UV mapped to a 1x6 vertical atlas (face f -> v in [f/6,(f+1)/6]).
  function diceGeo() {
    var g = boxGeo();
    // face order in boxGeo: +Z,-Z,+X,-X,+Y,-Y  -> dice values front,back,right,left,top,bottom
    // atlas rows: 0..5
    for (var f=0; f<6; f++) {
      var v0 = f/6, v1 = (f+1)/6;
      var q = [[0,v1],[1,v1],[1,v0],[0,v0]];
      for (var i=0;i<4;i++){ g.uv[(f*4+i)*2]=q[i][0]; g.uv[(f*4+i)*2+1]=q[i][1]; }
    }
    return g;
  }
  function quadGeo() {
    // Winding reversed so the front face points +Y (up) and survives back-face
    // culling when viewed from an overhead camera.
    return { pos:[-0.5,0,-0.5, 0.5,0,-0.5, 0.5,0,0.5, -0.5,0,0.5],
             nrm:[0,1,0, 0,1,0, 0,1,0, 0,1,0],
             uv:[0,0, 1,0, 1,1, 0,1], idx:[0,2,1, 0,3,2] };
  }
  // Unit billboard quad in XY plane, y in [0,1] (anchored at bottom). z=0.
  function spriteGeo() {
    return { pos:[-0.5,0,0, 0.5,0,0, 0.5,1,0, -0.5,1,0],
             nrm:[0,0,1,0,0,1,0,0,1,0,0,1], uv:[0,1, 1,1, 1,0, 0,0], idx:[0,1,2,0,2,3] };
  }
  // Centered billboard quad (y in [-0.5,0.5]).
  function spriteCenterGeo() {
    return { pos:[-0.5,-0.5,0, 0.5,-0.5,0, 0.5,0.5,0, -0.5,0.5,0],
             nrm:[0,0,1,0,0,1,0,0,1,0,0,1], uv:[0,1, 1,1, 1,0, 0,0], idx:[0,1,2,0,2,3] };
  }
  // Cylinder (disc token) radius 0.5, height 1 centered, y in [-0.5,0.5].
  function cylinderGeo(seg) {
    seg = seg || 28; var p=[],n=[],u=[],idx=[];
    // side
    for (var i=0;i<=seg;i++){ var a=i/seg*Math.PI*2, cx=Math.cos(a), cz=Math.sin(a);
      p.push(cx*0.5,-0.5,cz*0.5); n.push(cx,0,cz); u.push(i/seg,1);
      p.push(cx*0.5, 0.5,cz*0.5); n.push(cx,0,cz); u.push(i/seg,0); }
    for (var i2=0;i2<seg;i2++){ var b=i2*2; idx.push(b,b+1,b+2, b+1,b+3,b+2); }
    // top cap
    var topC = p.length/3; p.push(0,0.5,0); n.push(0,1,0); u.push(0.5,0.5);
    for (var t=0;t<=seg;t++){ var a2=t/seg*Math.PI*2; p.push(Math.cos(a2)*0.5,0.5,Math.sin(a2)*0.5); n.push(0,1,0); u.push(0.5+Math.cos(a2)*0.5,0.5+Math.sin(a2)*0.5); }
    for (var t2=0;t2<seg;t2++){ idx.push(topC, topC+1+t2, topC+2+t2); }
    // bottom cap
    var botC = p.length/3; p.push(0,-0.5,0); n.push(0,-1,0); u.push(0.5,0.5);
    for (var t3=0;t3<=seg;t3++){ var a3=t3/seg*Math.PI*2; p.push(Math.cos(a3)*0.5,-0.5,Math.sin(a3)*0.5); n.push(0,-1,0); u.push(0.5+Math.cos(a3)*0.5,0.5+Math.sin(a3)*0.5); }
    for (var t4=0;t4<seg;t4++){ idx.push(botC, botC+2+t4, botC+1+t4); }
    return { pos:p, nrm:n, uv:u, idx:idx };
  }

  /* ----------------------------- Renderer --------------------------------- */
  function Renderer(canvas, opts) {
    opts = opts || {};
    var attribs = { alpha: true, antialias: true, premultipliedAlpha: false, preserveDrawingBuffer: !!opts.preserveDrawingBuffer, powerPreference: "high-performance" };
    var gl = canvas.getContext("webgl", attribs) || canvas.getContext("experimental-webgl", attribs);
    if (!gl) throw new Error("WebGL unavailable");
    this.gl = gl; this.canvas = canvas;
    var prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FS));
    gl.bindAttribLocation(prog, 0, "aPos"); gl.bindAttribLocation(prog, 1, "aNormal"); gl.bindAttribLocation(prog, 2, "aUV");
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link: " + gl.getProgramInfoLog(prog));
    gl.useProgram(prog); this.prog = prog;
    var U = {}; ["uProj","uView","uModel","uNormalMat","uTex","uUseTex","uColor","uAmbient","uAlphaTest","uShininess","uEmissive","uLightDir","uEye"].forEach(function (k) { U[k] = gl.getUniformLocation(prog, k); });
    this.U = U;
    this.geo = { box: makeMesh(gl, (function(){var g=boxGeo();return g.pos;})(), boxGeo().nrm, boxGeo().uv, boxGeo().idx) };
    var bg = boxGeo(); this.geo.box = makeMesh(gl, bg.pos, bg.nrm, bg.uv, bg.idx);
    var dg = diceGeo(); this.geo.dice = makeMesh(gl, dg.pos, dg.nrm, dg.uv, dg.idx);
    var qg = quadGeo(); this.geo.quad = makeMesh(gl, qg.pos, qg.nrm, qg.uv, qg.idx);
    var sg = spriteGeo(); this.geo.sprite = makeMesh(gl, sg.pos, sg.nrm, sg.uv, sg.idx);
    var scg = spriteCenterGeo(); this.geo.spriteC = makeMesh(gl, scg.pos, scg.nrm, scg.uv, scg.idx);
    var cg = cylinderGeo(30); this.geo.cyl = makeMesh(gl, cg.pos, cg.nrm, cg.uv, cg.idx);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    this._proj = M.create(); this._view = M.create(); this._vp = M.create(); this._inv = M.create();
    this._nm = new Float32Array(9); this._tmp = M.create();
    this.eye = [0,10,10]; this.cssW = 1; this.cssH = 1;
    this._white = this.makeSolidTexture(255,255,255,255);
    gl.uniform3f(U.uLightDir, 0.35, 1.0, 0.55);
  }
  Renderer.prototype.resize = function (cssW, cssH, dpr) {
    dpr = dpr || (window.devicePixelRatio || 1); dpr = Math.min(dpr, 2.5);
    this.cssW = cssW; this.cssH = cssH;
    this.canvas.width = Math.max(1, Math.round(cssW * dpr));
    this.canvas.height = Math.max(1, Math.round(cssH * dpr));
    this.canvas.style.width = cssW + "px"; this.canvas.style.height = cssH + "px";
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  };
  Renderer.prototype.setCamera = function (eye, center, up, fovyDeg, near, far) {
    var aspect = this.canvas.width / Math.max(1, this.canvas.height);
    M.perspective(this._proj, (fovyDeg || 42) * Math.PI / 180, aspect, near || 0.1, far || 200);
    M.lookAt(this._view, eye, center, up || [0,1,0]);
    M.mul(this._vp, this._proj, this._view); M.invert(this._inv, this._vp);
    this.eye = eye;
    var gl = this.gl, U = this.U;
    gl.uniformMatrix4fv(U.uProj, false, this._proj);
    gl.uniformMatrix4fv(U.uView, false, this._view);
    gl.uniform3f(U.uEye, eye[0], eye[1], eye[2]);
    // camera basis for billboards
    var fwd = V.norm(V.sub(center, eye));
    this.camRight = V.norm(V.cross(fwd, up || [0,1,0]));
    this.camUp = V.cross(this.camRight, fwd);
    this.camFwd = fwd;
  };
  Renderer.prototype.setLight = function (x,y,z) { this.gl.uniform3f(this.U.uLightDir, x,y,z); };
  Renderer.prototype.begin = function (r,g,b,a) {
    var gl = this.gl;
    gl.clearColor(r,g,b,a===undefined?1:a); gl.depthMask(true);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  };
  Renderer.prototype.blend = function (mode) {
    var gl = this.gl;
    if (mode === "add") gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    else gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  };
  Renderer.prototype.makeSolidTexture = function (r,g,b,a) {
    var gl = this.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([r,g,b,a]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return t;
  };
  function isPow2(x){ return (x & (x-1)) === 0; }
  Renderer.prototype.makeTexture = function (source, o) {
    o = o || {}; var gl = this.gl, t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, o.flipY === false ? false : true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    var pw = isPow2(source.width || 0) && isPow2(source.height || 0);
    if (pw && o.mipmap !== false) { gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); }
    else { gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    var wrap = (o.repeat && pw) ? gl.REPEAT : gl.CLAMP_TO_EDGE;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    t._w = source.width; t._h = source.height; return t;
  };
  Renderer.prototype._bindGeo = function (mesh) {
    var gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.pos); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.nrm); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1,3,gl.FLOAT,false,0,0);
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.uv); gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2,2,gl.FLOAT,false,0,0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.idx);
  };
  // Draw a mesh. opts: {tex,color:[r,g,b,a],ambient,alphaTest,shininess,emissive,depthWrite,cull,blend}
  Renderer.prototype.draw = function (mesh, model, opts) {
    opts = opts || {}; var gl = this.gl, U = this.U;
    gl.uniformMatrix4fv(U.uModel, false, model);
    M.normalMat3(this._nm, model); gl.uniformMatrix3fv(U.uNormalMat, false, this._nm);
    var c = opts.color || [1,1,1,1];
    gl.uniform4f(U.uColor, c[0], c[1], c[2], c[3] === undefined ? 1 : c[3]);
    gl.uniform1f(U.uAmbient, opts.ambient === undefined ? 0.45 : opts.ambient);
    gl.uniform1f(U.uAlphaTest, opts.alphaTest === undefined ? 0.0 : opts.alphaTest);
    gl.uniform1f(U.uShininess, opts.shininess || 0.0);
    gl.uniform1f(U.uEmissive, opts.emissive || 0.0);
    if (opts.tex) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, opts.tex); gl.uniform1i(U.uTex, 0); gl.uniform1f(U.uUseTex, 1); }
    else gl.uniform1f(U.uUseTex, 0);
    if (opts.blend) this.blend(opts.blend);
    if (opts.cull === false) gl.disable(gl.CULL_FACE);
    gl.depthMask(opts.depthWrite === false ? false : true);
    this._bindGeo(mesh);
    gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
    if (opts.cull === false) gl.enable(gl.CULL_FACE);
    if (opts.blend) this.blend("alpha");
    gl.depthMask(true);
  };
  // Billboard sprite at world pos, facing camera. opts: {tex,color,w,h,anchorBottom,alphaTest,blend,depthWrite,tiltFwd}
  Renderer.prototype.sprite = function (worldPos, opts) {
    opts = opts || {}; var w = opts.w || 1, h = opts.h || 1;
    var R = this.camRight, up = opts.upright ? [0,1,0] : this.camUp;
    var fwd = this.camFwd;
    var model = this._tmp;
    // basis columns: X=right*w, Y=up*h, Z=-fwd
    model[0]=R[0]*w; model[1]=R[1]*w; model[2]=R[2]*w; model[3]=0;
    model[4]=up[0]*h; model[5]=up[1]*h; model[6]=up[2]*h; model[7]=0;
    model[8]=-fwd[0]; model[9]=-fwd[1]; model[10]=-fwd[2]; model[11]=0;
    model[12]=worldPos[0]; model[13]=worldPos[1]; model[14]=worldPos[2]; model[15]=1;
    var mesh = opts.anchorBottom ? this.geo.sprite : this.geo.spriteC;
    this.draw(mesh, model, { tex: opts.tex, color: opts.color, ambient: 1.0, alphaTest: opts.alphaTest === undefined ? 0.35 : opts.alphaTest, blend: opts.blend, depthWrite: opts.depthWrite, cull: false });
  };
  // Flat ground shadow (dark blob) at pos with radius.
  Renderer.prototype.groundBlob = function (x, z, r, alpha, tex, y) {
    var model = this._tmp; M.fromTRS(model, x, (y===undefined?0.02:y), z, 0,0,0, r*2, 1, r*2);
    this.draw(this.geo.quad, model, { tex: tex, color: [0,0,0, alpha===undefined?0.32:alpha], ambient: 1.0, blend: "alpha", depthWrite: false, cull: false });
  };
  Renderer.prototype.project = function (p) {
    var m = this._vp;
    var x=p[0],y=p[1],z=p[2];
    var cx = m[0]*x+m[4]*y+m[8]*z+m[12];
    var cy = m[1]*x+m[5]*y+m[9]*z+m[13];
    var cw = m[3]*x+m[7]*y+m[11]*z+m[15];
    if (cw === 0) cw = 1e-6;
    var ndcx = cx/cw, ndcy = cy/cw;
    return { x: (ndcx*0.5+0.5)*this.cssW, y: (1-(ndcy*0.5+0.5))*this.cssH, visible: cw > 0, w: cw };
  };
  // Screen (css px) -> point on plane y=planeY. Returns [x,y,z] or null.
  Renderer.prototype.rayPlaneY = function (sx, sy, planeY) {
    var ndcx = (sx / this.cssW) * 2 - 1, ndcy = 1 - (sy / this.cssH) * 2;
    var inv = this._inv;
    function un(nz){ var x=ndcx,y=ndcy,z=nz,w=1;
      var ox=inv[0]*x+inv[4]*y+inv[8]*z+inv[12], oy=inv[1]*x+inv[5]*y+inv[9]*z+inv[13],
          oz=inv[2]*x+inv[6]*y+inv[10]*z+inv[14], ow=inv[3]*x+inv[7]*y+inv[11]*z+inv[15];
      return [ox/ow, oy/ow, oz/ow]; }
    var a = un(-1), b = un(1);
    var dy = b[1]-a[1]; if (Math.abs(dy) < 1e-6) return null;
    var t = (planeY - a[1]) / dy; if (t < 0) return null;
    return [a[0]+(b[0]-a[0])*t, planeY, a[2]+(b[2]-a[2])*t];
  };

  window.GLB = { mat4: M, vec3: V, Renderer: Renderer, boxGeo: boxGeo, quadGeo: quadGeo, makeMesh: makeMesh };
})();
