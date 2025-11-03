import * as twgl from 'twgl.js';
import { useAnimationLoop } from '../utils/hooks/useAnimationLoop';
import { useCanvas } from '../utils/hooks/useCanvas';
import { usePointerPosition } from '../utils/hooks/usePointerPosition';
import { Vector2 } from '../utils/vec';
import { SCALE_DOWN } from './RippleGL';
import { ScreenText } from './ScreenText';
import { type TextOnScreen, TextOnScreenElement } from './TextOnScreen';
import { rippleCanvasStore } from './canvasStore';
import type { PropsWithChildren } from 'preact/compat';
import { useRef, useState } from 'preact/hooks';

const defaultOptions = {
  maxThreshold: 0.6,
  minThreshold: 0.1,
  colorBoost: 0.2,
  colorBoostBlue: 0.5,
};

type WebGLTextOptions = typeof defaultOptions;

const vertexShader = /* glsl */ `
attribute vec4 position;
attribute vec2 texcoord;
varying vec2 v_texcoord;
void main() {
  gl_Position = position;
  v_texcoord = texcoord;
}
`;

const textFragShader = /* glsl */ `
precision mediump float;
varying vec2 v_texcoord;
uniform sampler2D textTex;
uniform sampler2D randTex;
uniform sampler2D rippleTex;
uniform vec4 ripplePosition; // x, y, width, height
uniform float time;
uniform vec2 pointerPos;
uniform vec2 resolution;
uniform vec2 charSize;
uniform vec2 charOffset;
uniform float maxThreshold;
uniform float minThreshold;
uniform float colorBoost;
uniform float colorBoostBlue;

vec2 getCharPos(vec2 uv) {
  // Calculate character grid position
  vec2 fragCoord = uv * resolution;
  vec2 charIndex = floor((fragCoord - charOffset) / charSize);
  vec2 charUV = (charIndex * charSize) / resolution;
  return charUV + charOffset / resolution;
}

vec4 getRipple(vec2 uv) {
  uv.y = 1.0 - uv.y;
  // uv is local uv in this texture. we need to map to ripple texture space
  vec2 rippleUV = uv * ripplePosition.zw + ripplePosition.xy;
  return texture2D(rippleTex, rippleUV);
}

vec4 getAvgRipple(vec2 charCoord) {
  // Average height over the character cell
  vec2 charPixelSize = charSize / resolution;
  vec4 h1 = getRipple(charCoord + vec2(0.0, 0.0) * charPixelSize);
  vec4 h2 = getRipple(charCoord + vec2(1.0, 0.0) * charPixelSize);
  vec4 h3 = getRipple(charCoord + vec2(0.0, 1.0) * charPixelSize);
  vec4 h4 = getRipple(charCoord + vec2(1.0, 1.0) * charPixelSize);
  return (h1 + h2 + h3 + h4) / 4.0;
}

void main() {
  // Draw randTex if close to pointer, else textTex
  vec2 uv = v_texcoord;
  vec2 fragCoord = uv * resolution;
  // gl_FragColor = getRipple(uv);
  // return;
  vec2 charCoord = getCharPos(uv);

  vec2 charIndex = floor((fragCoord - charOffset) / charSize);
  vec2 gridSize = (resolution - charOffset) / charSize;
  bool inBounds = charIndex.x >= 0.0 && charIndex.x < gridSize.x &&
                  charIndex.y >= 0.0 && charIndex.y < gridSize.y;

  // if (!inBounds) {
  //   gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); // Red for out-of-bounds
  //   return;
  // }

  // Calculate position within the character cell
  vec2 cellPos = mod(fragCoord - charOffset, charSize);

  // --- Debug grid overlay ---
  if (false) {
    float gridThickness = 1.0;
    float edgeX = step(cellPos.x, gridThickness) + step(charSize.x - cellPos.x, gridThickness);
    float edgeY = step(cellPos.y, gridThickness) + step(charSize.y - cellPos.y, gridThickness);
    float edge = max(edgeX, edgeY);
    if (edge > 0.0) {
      gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0); // Green grid lines
      return;
    }
  }

  vec4 ripple = getAvgRipple(charCoord);
  float height = abs(ripple.x);
  vec4 textTexel = texture2D(textTex, uv);
  vec4 randTexel = texture2D(randTex, uv);

  // Get the velocity/direction from ripple data
  // rippleTexel.y contains the previous height
  float currentHeight = ripple.x;
  float prevHeight = ripple.y;
  float velocity = currentHeight - prevHeight;

  vec4 color;
  if (height > 0.0) {
    // if between min and max threshold, fully rand
    float mixAmount = smoothstep(minThreshold, maxThreshold, height);
    
    // Only show random characters when the wave is moving in the positive direction (expanding)
    float isExpanding = step(0.0, velocity);
    float randomness = mixAmount * isExpanding;

    color = mix(textTexel, randTexel, randomness);

    color.rgb -= vec3(colorBoostBlue, colorBoostBlue, colorBoost) * mixAmount;
  } else {
    color = textTexel;
  }

  gl_FragColor = color;
}
`;

function updateTexOrNew(
  tex: WebGLTexture | null,
  gl: WebGLRenderingContext,
  canvas: HTMLCanvasElement,
): WebGLTexture {
  if (!gl.isTexture(tex)) {
    tex = null;
  }
  if (tex) {
    // update existing texture
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    return tex;
  }
  return twgl.createTexture(gl, {
    src: canvas,
    mag: gl.LINEAR,
    min: gl.LINEAR,
  });
}

export function WebGLText({
  children,
  ...ogOptions
}: PropsWithChildren<Partial<WebGLTextOptions>>) {
  const options: WebGLTextOptions = { ...defaultOptions, ...ogOptions };
  const textProgramRef = useRef<twgl.ProgramInfo | null>(null);
  const rippleTexRef = useRef<WebGLTexture | null>(null);
  const [textCanvas, setTextCanvas] = useState<HTMLCanvasElement | null>(null);
  const [randCanvas, setRandCanvas] = useState<HTMLCanvasElement | null>(null);
  const [text, setText] = useState<TextOnScreen | null>(null);
  const textTexRef = useRef<WebGLTexture | null>(null);
  const randTexRef = useRef<WebGLTexture | null>(null);

  const [gl, glCanvas, setCanvas] = useCanvas<'webgl'>({
    contextId: 'webgl',
    autoResize: true,
    setup: (gl, canvas) => {
      // Basic WebGL setup
      gl.clearColor(0, 0, 0, 0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      textProgramRef.current = twgl.createProgramInfo(gl, [
        vertexShader,
        textFragShader,
      ]);
    },

    resize: (gl, canvas) => {
      gl.viewport(0, 0, canvas.width, canvas.height);
    },
  });

  const pointer = usePointerPosition(glCanvas) || new Vector2(-1000, -1000);
  const prevPointer = useRef<Vector2>(new Vector2(-1000, -1000));

  useAnimationLoop((dt, t) => {
    if (
      !gl ||
      !glCanvas ||
      !textProgramRef.current ||
      !textCanvas ||
      !randCanvas ||
      !text
    ) {
      return;
    }

    const rippleCanvas = rippleCanvasStore.get();

    if (!rippleCanvas || !textCanvas || !randCanvas) {
      return;
    }

    const rippleTex = updateTexOrNew(rippleTexRef.current, gl, rippleCanvas);
    rippleTexRef.current = rippleTex;

    const textTex = updateTexOrNew(textTexRef.current, gl, textCanvas);
    textTexRef.current = textTex;

    const randTex = updateTexOrNew(randTexRef.current, gl, randCanvas);
    randTexRef.current = randTex;

    const textProgramInfo = textProgramRef.current;

    // Now draw to WebGL canvas
    gl.viewport(0, 0, glCanvas.width, glCanvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const canvasRect = rippleCanvas.getBoundingClientRect();
    const thisRect = glCanvas.getBoundingClientRect();
    const ripplePosX =
      (thisRect.left - canvasRect.left) / rippleCanvas.width / SCALE_DOWN;
    const ripplePosY =
      1.0 -
      (thisRect.top - canvasRect.top + thisRect.height) /
        rippleCanvas.height /
        SCALE_DOWN;
    const rippleWidth = thisRect.width / rippleCanvas.width / SCALE_DOWN;
    const rippleHeight = thisRect.height / rippleCanvas.height / SCALE_DOWN;

    const charSize = new Vector2(text.metrics.width, text.lineHeight);

    const topLeft = new Vector2(text.pos.x, text.pos.y - window.scrollY).div(
      new Vector2(glCanvas.width, glCanvas.height),
    );
    const bottomRight = new Vector2(
      text.pos.x + text.size.x,
      text.pos.y + text.size.y - window.scrollY,
    ).div(new Vector2(glCanvas.width, glCanvas.height));

    const arrays = {
      position: {
        numComponents: 2,
        data: topLeft
          .mult(2, -2)
          .sub(new Vector2(1, -1))
          .iTexCoords(bottomRight.mult(2, -2).sub(new Vector2(1, -1))),
      },
      texcoord: {
        numComponents: 2,
        data: topLeft.iTexCoords(bottomRight),
      },
    };
    const bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);

    gl.useProgram(textProgramInfo.program);
    twgl.setBuffersAndAttributes(gl, textProgramInfo, bufferInfo);
    twgl.setUniforms(textProgramInfo, {
      textTex: textTex,
      randTex: randTex,
      rippleTex: rippleTex,
      ripplePosition: [ripplePosX, ripplePosY, rippleWidth, rippleHeight],
      time: t,
      pointerPos: pointer.a,
      resolution: [glCanvas.width, glCanvas.height],
      charSize: charSize.a,
      charOffset: [text.pos.x, text.pos.y - window.scrollY],
      maxThreshold: options.maxThreshold,
      minThreshold: options.minThreshold,
      colorBoost: options.colorBoost,
      colorBoostBlue: options.colorBoostBlue,
    });
    twgl.drawBufferInfo(gl, bufferInfo);

    prevPointer.current = pointer;
  });

  // Only render the WebGL canvas, since text/rand canvases are managed globally
  return (
    <div class="relative">
      <ScreenText
        text={text}
        setText={setText}
        rCanvasRef={setRandCanvas}
        tCanvasRef={setTextCanvas}
      >
        {children}
      </ScreenText>
      <canvas
        ref={setCanvas}
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
    </div>
  );
}
