import '../styles/shuffleText.css';
import { intervalAnimationFrame } from '../utils/intervalAnimationFrame';
import { randSubsetOfChars, textButRandom } from '../utils/textUtils';
import { getLines } from '../utils/wordWrap';

export class ShuffleText extends HTMLElement {
  private noShuffle: boolean = false;
  private originalText: string = '';
  private isSmall: boolean = false;
  private startIndex: number = 0;
  private endIndex: number = 0;
  private maxLength: number = 40;
  private started: boolean = false;
  private charChangeInterval: number = 250;
  private cancelInterval: () => void = () => {};

  constructor() {
    super();
  }

  connectedCallback() {
    this.noShuffle = !this.hasAttribute('shuffle');
    const lines = getLines(this);
    if (lines.length > 1) {
      this.outerHTML = lines
        .map(
          line =>
            `<shuffle-text style="display: block;" ${this.noShuffle ? '' : 'shuffle'}>${line}</shuffle-text>`,
        )
        .join('');
      return;
    }
    this.originalText = this.innerText;
    this.isSmall = this.originalText.length < 10;

    if (!this.noShuffle) {
      this.addEventListener('mouseenter', () => {
        if (!this.started) return;
        this.stopShuffling();
        this.startShuffling();
      });
    }

    this.innerText = '\u00A0'.repeat(this.originalText.length);
    this.classList.add('loaded');
    // Start shuffling immediately if visible. If not visible, shuffle when
    // becomes visible.
    const rect = this.getBoundingClientRect();
    if (
      rect.top < window.innerHeight &&
      rect.bottom > 0 &&
      rect.left < window.innerWidth &&
      rect.right > 0
    ) {
      const delay = Math.max(
        0,
        (rect.top / window.innerHeight) * 1000 +
          (rect.left / window.innerWidth) * 500,
      );
      setTimeout(() => {
        this.started = true;
        this.startShuffling();
      }, delay);
      return;
    }

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.started = true;
          this.startShuffling();
          observer.disconnect();
        }
      });
    });
    observer.observe(this);
  }

  disconnectedCallback() {
    this.stopShuffling();
  }

  private getStartEndIndices() {
    if (this.isSmall) {
      return {
        start: Math.floor(this.startIndex / 2),
        end: Math.floor(this.endIndex / 2) + 1,
      };
    } else {
      return {
        start: this.startIndex,
        end: this.endIndex + 1,
      };
    }
  }

  private startShuffling() {
    this.startIndex = 0;
    let characters = randSubsetOfChars(3);
    let lastCharChange = performance.now();

    this.cancelInterval = intervalAnimationFrame(t => {
      if (t - lastCharChange > this.charChangeInterval) {
        characters = randSubsetOfChars(3);
        lastCharChange = t;
      }

      const { start, end } = this.getStartEndIndices();
      const shuffled = textButRandom(
        this.originalText.substring(start, end),
        characters,
      );
      this.innerText =
        this.originalText.substring(0, start) +
        shuffled +
        '\u00A0'.repeat(this.originalText.length - end);

      if (end < this.originalText.length) {
        this.endIndex++;
      }
      if (end >= this.originalText.length || end - start > this.maxLength) {
        this.startIndex++;
      }

      if (start >= this.originalText.length) {
        this.stopShuffling();
      }
    }, 25);
  }

  private stopShuffling() {
    this.cancelInterval();
    // this.innerText = this.originalText;
  }
}

if (!customElements.get('shuffle-text')) {
  customElements.define('shuffle-text', ShuffleText);
}
