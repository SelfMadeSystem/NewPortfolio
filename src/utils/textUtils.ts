export const chars =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789[]{}<>?/|\\`~!@#$%^&*()-_=+';

export function randSubsetOfChars(length: number) {
  let result = '';
  for (let i = 0; i < length; i++) {
    const randIndex = Math.floor(Math.random() * chars.length);
    result += chars[randIndex];
  }
  return result;
}

export function textButRandom(text: string, chars: string) {
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
