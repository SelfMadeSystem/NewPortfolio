import { clamp, random } from '../utils/mathUtils';
import n from 'noisejs';
import { useEffect, useRef, useState } from 'react';

// the package is kinda broken
const { Noise } = n as any as { Noise: typeof n };

const displacement = 400;
const duration = 0.3; // in s

export default function ScreenMelt() {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [width, setWidth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);
  const [isMelting, setIsMelting] = useState<boolean>(false);
  const topThingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const meltContainer = document.getElementById('melt-container')!;

    const doStuff = () => {
      const canvas = document.createElement('canvas');

      const scaleDown = 1;
      const pixelWidth = 8;
      canvas.width = Math.ceil(document.body.scrollWidth / scaleDown);
      canvas.height = 1;

      setWidth(canvas.width);
      setHeight(canvas.height);

      const ctx = canvas.getContext('2d')!;

      // Perlin noise setup
      const waveAmplitude = 187;
      const noise = new Noise(Math.random()); // Seed for randomness
      const noiseScales = [0.05, 0.1, 0.2, 0.4];
      const randOffset = 10;

      for (let i = 0; i < Math.ceil(canvas.width / pixelWidth); i++) {
        // Use Perlin noise for smooth randomness
        let g = waveAmplitude / 2; // Base value
        for (let j = 0; j < noiseScales.length; j++) {
          const scale = noiseScales[j];
          // smaller scales have less influence
          const influence = waveAmplitude / 2 ** (j + 1);
          g += noise.perlin2(i * scale, 0) * influence;
        }
        g += random(-randOffset, randOffset); // add some random noise
        g = clamp(0, 187, Math.floor(g));
        ctx.fillStyle = `rgb(187.5,${g},0)`;
        ctx.fillRect(i * pixelWidth, 0, pixelWidth, canvas.height);
      }

      setImageSrc(canvas.toDataURL());
    };

    doStuff();

    (window as any).meltScreen = () => {
      if (!topThingRef.current) return;
      const topThing = topThingRef.current;

      topThing.classList.remove('opacity-0');

      // move top thing to just above the viewport
      topThing.style.top = `${document.documentElement.scrollTop - topThing.clientHeight}px`;

      meltContainer.classList.add('screenmelt');
      document.body.style.overflow = 'hidden';
      setIsMelting(true);

      meltContainer.animate(
        [
          { transform: 'translateY(0)' },
          {
            transform: `translateY(${window.innerHeight}px)`,
          },
        ],
        {
          duration: (window.innerHeight * 2000 * duration) / displacement,
          delay: duration * 1000,
          easing: 'linear',
          fill: 'forwards',
        },
      ).onfinish = () => {
        // window.location.href = '/game';
        window.location.reload();
      };
    };

    window.addEventListener('resize', doStuff);
    return () => {
      window.removeEventListener('resize', doStuff);
    };
  }, []);

  return (
    <>
      <div
        ref={topThingRef}
        className="absolute right-0 bottom-0 left-0 z-9999 h-[200vh] bg-black opacity-0"
      ></div>
      {isMelting && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          xmlnsXlink="http://www.w3.org/1999/xlink"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 9999,
            imageRendering: 'pixelated',
          }}
          width={width}
          height={height}
        >
          <defs>
            <filter id="f1" x="0" y="0" width="100%" height="100%">
              <feImage
                xlinkHref={imageSrc}
                result="img"
                preserveAspectRatio="none"
                style={{ imageRendering: 'pixelated' }}
              />
              <feDisplacementMap
                in2="img"
                in="SourceGraphic"
                scale="0"
                xChannelSelector="R"
                yChannelSelector="G"
              >
                <animate
                  attributeName="scale"
                  values={`0;${displacement}`}
                  dur={`${duration}s`}
                  fill="freeze"
                />
              </feDisplacementMap>
            </filter>
          </defs>
        </svg>
      )}
    </>
  );
}
