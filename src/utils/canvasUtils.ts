const metricsCache = new Map<string, TextMetrics>();

export function getCachedMetrics(font: string) {
  if (metricsCache.has(font)) {
    return metricsCache.get(font)!;
  }
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D context for text measurement.');
  }
  ctx.font = font;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const metrics = ctx.measureText('M');
  metricsCache.set(font, metrics);
  return metrics;
}
