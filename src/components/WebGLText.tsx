import * as twgl from 'twgl.js';
import { useAnimationLoop } from '../utils/hooks/useAnimationLoop';
import { useCanvas } from '../utils/hooks/useCanvas';
import { usePointerPosition } from '../utils/hooks/usePointerPosition';
import { Vector2 } from '../utils/vec';
import { getLines } from '../utils/wordWrap';
import { SCALE_DOWN } from './RippleGL';
import { rippleCanvasStore } from './rippleStore';
import { useRef } from 'preact/hooks';

const defaultOptions = {
  fontSize: 24,
  fontFamily: 'monospace',
  randChars: 3,
  randDuration: 500,
  maxThreshold: 0.6,
  minThreshold: 0.1,
  colorBoost: 0.2,
  colorBoostBlue: 0.5,
};

type WebGLTextOptions = typeof defaultOptions;

const chars =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789[]{}<>?/|\\`~!@#$%^&*()-_=+';

function randSubsetOfChars(length: number) {
  let result = '';
  for (let i = 0; i < length; i++) {
    const randIndex = Math.floor(Math.random() * chars.length);
    result += chars[randIndex];
  }
  return result;
}

function textButRandom(text: string, options: WebGLTextOptions) {
  const chars = randSubsetOfChars(options.randChars);
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const t = text[i];
    if (t.trim() === '') {
      result += t;
    } else {
      const randIndex = Math.floor(Math.random() * chars.length);
      result += chars[randIndex];
    }
  }
  return result;
}

function getFont(options: WebGLTextOptions) {
  return `${options.fontSize}px ${options.fontFamily}`;
}

function getLineHeight(options: WebGLTextOptions) {
  const fontSize = options.fontSize || 16;
  const lineHeight = Math.ceil(fontSize * 1.2);
  return lineHeight;
}

function drawTextLines(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  text: string,
  options: WebGLTextOptions,
) {
  const lines = text.split('\n');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.font = getFont(options);
  context.textAlign = 'left';
  // use top baseline so we can control vertical centering precisely
  context.textBaseline = 'bottom';
  context.fillStyle = 'white';

  const lineHeight = getLineHeight(options);

  const startY = lineHeight;

  let maxWidth = 0;
  for (const line of lines) {
    const metrics = context.measureText(line);
    if (metrics.width > maxWidth) {
      maxWidth = metrics.width;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const y = startY + i * lineHeight;
    context.fillText(line, 0, y);
  }
}

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
  return charUV;
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

  if (!inBounds) {
    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); // Red for out-of-bounds
    return;
  }

  // Calculate position within the character cell
  vec2 cellPos = mod(fragCoord - charOffset, charSize);

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

export function WebGLText({
  class: className,
  children,
  ...ogOptions
}: {
  class?: string;
  children: string;
} & Partial<WebGLTextOptions>) {
  const options: WebGLTextOptions = { ...defaultOptions, ...ogOptions };
  const shaderOffsetRef = useRef<Vector2>(new Vector2(0, 0));
  const charSizeRef = useRef<Vector2>(new Vector2(0, 0));
  const textProgramRef = useRef<twgl.ProgramInfo | null>(null);
  const spanRef = useRef<HTMLDivElement | null>(null);
  const rippleTexRef = useRef<WebGLTexture | null>(null);
  const lastRandTimeRef = useRef<number>(0);

  const getText = () => {
    if (!spanRef.current) return children;
    const lines = getLines(spanRef.current);
    let result = lines.join('\n');
    return result;
  };

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
  const [textCtx, textCanvas, setTextCanvas] = useCanvas<'2d'>({
    contextId: '2d',
    autoResize: true,
    resize(context, canvas) {
      console.log(getLines(spanRef.current!));
      // only need to draw to this once
      drawTextLines(context, canvas, getText(), options);
      // measure character size
      context.font = getFont(options);
      const metrics = context.measureText('M');
      const width = metrics.width;
      const height = getLineHeight(options);
      charSizeRef.current = new Vector2(width, height);
    },
  });
  const [randCtx, randCanvas, setRandCanvas] = useCanvas<'2d'>({
    contextId: '2d',
    autoResize: true,
  });

  const pointer = usePointerPosition(glCanvas) || new Vector2(-1000, -1000);
  const prevPointer = useRef<Vector2>(new Vector2(-1000, -1000));

  useAnimationLoop((dt, t) => {
    if (
      !gl ||
      !textCtx ||
      !randCtx ||
      !textCanvas ||
      !randCanvas ||
      !glCanvas ||
      !textProgramRef.current
    ) {
      return;
    }

    const rippleCanvas = rippleCanvasStore.get();

    if (!rippleCanvas) {
      return;
    }

    let rippleTex = rippleTexRef.current;

    if (!rippleTex) {
      // create texture from ripple canvas
      rippleTex = twgl.createTexture(gl, {
        src: rippleCanvas,
        mag: gl.LINEAR,
        min: gl.LINEAR,
      });
      rippleTexRef.current = rippleTex;
    } else {
      // update texture
      gl.bindTexture(gl.TEXTURE_2D, rippleTex);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        rippleCanvas,
      );
    }

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

    const textProgramInfo = textProgramRef.current;

    // draw random text for the rand canvas (centered, multiline-capable)
    if (t - lastRandTimeRef.current > options.randDuration) {
      lastRandTimeRef.current = t;
      drawTextLines(
        randCtx,
        randCanvas,
        textButRandom(getText(), options),
        options,
      );
    }

    // Now draw to WebGL canvas
    gl.viewport(0, 0, glCanvas.width, glCanvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const textTex = twgl.createTexture(gl, {
      src: textCanvas,
      mag: gl.LINEAR,
      min: gl.LINEAR,
    });
    const randTex = twgl.createTexture(gl, {
      src: randCanvas,
      mag: gl.LINEAR,
      min: gl.LINEAR,
    });

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
      charSize: charSizeRef.current.a,
      charOffset: shaderOffsetRef.current.a,
      maxThreshold: options.maxThreshold,
      minThreshold: options.minThreshold,
      colorBoost: options.colorBoost,
      colorBoostBlue: options.colorBoostBlue,
    });
    twgl.drawBufferInfo(gl, bufferInfo);

    // Clean up
    gl.deleteTexture(textTex);
    gl.deleteTexture(randTex);

    prevPointer.current = pointer;
  });

  return (
    <div
      class={className || ''}
      style={{
        fontFamily: options.fontFamily,
        fontSize: `${options.fontSize}px`,
        lineHeight: `${getLineHeight(options)}px`,
      }}
    >
      <div className="relative">
        <span ref={spanRef} class="text-transparent">
          {children}
        </span>
        <canvas
          ref={setTextCanvas}
          className="pointer-events-none invisible absolute inset-0 h-full w-full"
        />
        <canvas
          ref={setRandCanvas}
          className="pointer-events-none invisible absolute inset-0 h-full w-full"
        />
        <canvas
          ref={setCanvas}
          className="pointer-events-none absolute inset-0 h-full w-full"
        />
      </div>
    </div>
  );
}
