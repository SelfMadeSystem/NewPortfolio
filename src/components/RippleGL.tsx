import * as twgl from 'twgl.js';
import { useAnimationLoop } from '../utils/hooks/useAnimationLoop';
import { useCanvas } from '../utils/hooks/useCanvas';
import { usePointerPosition } from '../utils/hooks/usePointerPosition';
import { Vector2 } from '../utils/vec';
import { rippleCanvasStore } from './canvasStore';
import { useCallback, useRef } from 'preact/hooks';

const defaultOptions = {
  rippleStrength: 5.0,
  rippleDamping: 1.0,
  rippleRadius: 1.0,
  rippleStride: 1.0,
};

type RippleGLOptions = typeof defaultOptions;

const vertexShader = /* glsl */ `
attribute vec4 position;
attribute vec2 texcoord;
varying vec2 v_texcoord;
void main() {
  gl_Position = position;
  v_texcoord = texcoord;
}
`;

const rippleFragShader = /* glsl */ `
precision highp float;


varying vec2 v_texcoord;
uniform sampler2D prevTex;
uniform float time;
uniform float dt;
uniform vec2 pointerPos;
uniform bool pointerDown;
uniform vec2 resolution;
uniform float rippleStrength;
uniform float rippleDamping;
uniform float rippleRadius;
uniform float rippleStride;

vec4 sampleTex(sampler2D tex, vec2 uv) {
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    return vec4(0.0, 0.0, 0.0, 0.0);
  }
  return texture2D(tex, uv);
}

void main()
{
  vec2 uv = v_texcoord;
  uv.y = 1.0 - uv.y;
  vec2 fragCoord = uv * resolution;
  vec2 stride = vec2(rippleStride) / resolution;
  vec4 hC = sampleTex(prevTex, uv);
  vec4 hL = sampleTex(prevTex, uv - vec2(stride.x, 0.0));
  vec4 hR = sampleTex(prevTex, uv + vec2(stride.x, 0.0));
  vec4 hT = sampleTex(prevTex, uv + vec2(0.0, stride.y));
  vec4 hB = sampleTex(prevTex, uv - vec2(0.0, stride.y));

  float t = hL.w * 0.5 + hR.w * 0.5 + hT.w * 0.5 + hB.w * 0.5;

  float new_height = (hL.x + hR.x + hT.x + hB.x) / t - hC.y;
  float dist = distance(fragCoord, pointerPos);

  if (pointerDown) {
    new_height += rippleStrength * exp(-dist/rippleRadius);
  }

  new_height *= rippleDamping;

  gl_FragColor = vec4(new_height, hC.x, hC.y, 1.0);
}
`;

export const SCALE_DOWN = 5;

export function RippleGL({
  ...ogOptions
}: {
  class?: string;
} & Partial<RippleGLOptions>) {
  const options: RippleGLOptions = { ...defaultOptions, ...ogOptions };
  const rippleProgramRef = useRef<twgl.ProgramInfo | null>(null);
  const rippleTexRef = useRef<[WebGLTexture, WebGLTexture] | null>(null);
  const rippleFBORef = useRef<twgl.FramebufferInfo | null>(null);

  const [gl, glCanvas, _setCanvas] = useCanvas<'webgl'>({
    contextId: 'webgl',
    autoResize: true,
    setup: (gl, canvas) => {
      // Basic WebGL setup
      gl.clearColor(0, 0, 0, 0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      rippleProgramRef.current = twgl.createProgramInfo(gl, [
        vertexShader,
        rippleFragShader,
      ]);
    },

    resize: (gl, canvas) => {
      canvas.width = canvas.clientWidth / SCALE_DOWN;
      canvas.height = canvas.clientHeight / SCALE_DOWN;
      gl.viewport(0, 0, canvas.width, canvas.height);

      if (!rippleProgramRef.current) {
        return;
      }

      const tex1 = twgl.createTexture(gl, {
        width: canvas.width,
        height: canvas.height,
        mag: gl.LINEAR,
        min: gl.LINEAR,
      });
      const tex2 = twgl.createTexture(gl, {
        width: canvas.width,
        height: canvas.height,
        mag: gl.LINEAR,
        min: gl.LINEAR,
      });
      rippleTexRef.current = [tex1, tex2];

      const fbo = twgl.createFramebufferInfo(
        gl,
        [{ attachment: tex1 }],
        canvas.width,
        canvas.height,
      );
      rippleFBORef.current = fbo;
    },
  });

  const pointer = usePointerPosition(glCanvas) || new Vector2(-1000, -1000);
  const prevPointer = useRef<Vector2>(new Vector2(-1000, -1000));

  useAnimationLoop((dt, t) => {
    if (
      !gl ||
      !glCanvas ||
      !rippleProgramRef.current ||
      !rippleTexRef.current ||
      !rippleFBORef.current
    ) {
      return;
    }

    const rippleProgramInfo = rippleProgramRef.current;
    const [rippleTex1, rippleTex2] = rippleTexRef.current;
    const fbo = rippleFBORef.current;

    // Now draw to WebGL canvas
    twgl.bindFramebufferInfo(gl, fbo);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      rippleTex2,
      0,
    );

    gl.viewport(0, 0, glCanvas.width, glCanvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const arrays = {
      position: {
        numComponents: 2,
        // prettier-ignore
        data: [
          -1, -1,
           1, -1,
          -1,  1,
          -1,  1,
           1, -1,
           1,  1,
        ],
      },
      texcoord: {
        numComponents: 2,
        // prettier-ignore
        data: [
          0, 1,
          1, 1,
          0, 0,
          0, 0,
          1, 1,
          1, 0,
        ],
      },
    };
    const bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);

    // Ripple pass and swap
    gl.useProgram(rippleProgramInfo.program);
    twgl.setBuffersAndAttributes(gl, rippleProgramInfo, bufferInfo);
    twgl.setUniforms(rippleProgramInfo, {
      prevTex: rippleTex1,
      time: t,
      dt: dt,
      pointerPos: pointer.div(SCALE_DOWN).a,
      pointerDown: pointer.distSq(prevPointer.current) > 1,
      resolution: [glCanvas.width, glCanvas.height],
      rippleStrength: options.rippleStrength,
      rippleDamping: options.rippleDamping,
      rippleRadius: options.rippleRadius,
      rippleStride: options.rippleStride,
    });
    twgl.drawBufferInfo(gl, bufferInfo);
    twgl.bindFramebufferInfo(gl, null);
    twgl.drawBufferInfo(gl, bufferInfo);
    rippleTexRef.current = [rippleTex2, rippleTex1];

    prevPointer.current = pointer;
  });

  const setCanvas = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      _setCanvas(canvas);
      rippleCanvasStore.set(canvas);
    },
    [_setCanvas],
  );

  return (
    <div class="fancy-thingamajig pointer-events-none fixed inset-0 -z-50 opacity-100">
      <canvas
        ref={setCanvas}
        className="pointer-events-none absolute inset-[-50%] h-[200%] w-[200%] -scale-y-100"
      />
    </div>
  );
}
