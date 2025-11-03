/**
 * A utility function that mimics setInterval using requestAnimationFrame.
 * Calls the provided callback approximately every `interval` milliseconds, even
 * multiple times per frame if necessary.
 */
export function intervalAnimationFrame(
  // t: time since start in ms
  // dt: time since last call in ms
  callback: (t: number, dt: number) => void,
  interval: number,
): () => void {
  const maxCallsPerFrame = 4;
  let startTime = performance.now();
  let lastTime = performance.now();
  let accumulatedTime = 0;
  let cancelled = false;

  function tick(now: number) {
    if (cancelled) return;
    const deltaTime = now - lastTime;
    lastTime = now;
    accumulatedTime += deltaTime;

    let i = 0;
    while (accumulatedTime >= interval && i < maxCallsPerFrame) {
      i++;
      callback(now - startTime, deltaTime);
      accumulatedTime -= interval;
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);

  return () => {
    cancelled = true;
  };
}
