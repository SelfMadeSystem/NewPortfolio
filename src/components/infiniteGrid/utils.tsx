import { Vector2 } from '../../utils/vec';

export type ResponsiveImageMetadata = {
  small: string;
  big: string;
};

export type InfiniteImagesType = {
  name: string;
  images: ResponsiveImageMetadata[];
  tech: string[];
  description: string;
  link: string;
};

export const cellSize = new Vector2(512, 288);
export const padding = 16;
export const widthPerCol = cellSize.x + padding;
export const heightPerRow = cellSize.y + padding;

// deterministic 2D -> int hash (returns unsigned 32-bit)
export function hash2Ints(x: number, y: number): number {
  // combine coordinates into one seed
  let h = ((x | 0) * 0x9e3769b1 + 15) ^ ((y | 0) + 29);
  // mix (Wang/Jenkins style) to spread bits
  h = h ^ 61 ^ (h >>> 16);
  h = h + (h << 3);
  h = h ^ (h >>> 4);
  h = Math.imul(h, 0x27d4db3d);
  h = h ^ (h >>> 15);
  return h >>> 0;
}
// deterministic index in range [0, n)
export function deterministicIndex(x: number, y: number, n: number): number {
  if (n <= 0) return 0;
  return hash2Ints(x, y) % n;
}
