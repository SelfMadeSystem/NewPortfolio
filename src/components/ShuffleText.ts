import '../styles/shuffleText.css';
import { randSubsetOfChars, textButRandom } from '../utils/textUtils';
import { getLines } from '../utils/wordWrap';

export class ShuffleText extends HTMLElement {
  private noShuffle: boolean = false;
  private originalText: string = '';
  private isSmall: boolean = false;
  private startIndex: number = 0;
  private endIndex: number = 0;
  private maxLength: number = 40;
  private intervalId: number | null = null;

  constructor() {
    super();
  }

  connectedCallback() {
    this.noShuffle = this.hasAttribute('no-shuffle');
    const lines = getLines(this);
    if (lines.length > 1) {
      this.outerHTML = lines
        .map(
          line =>
            `<shuffle-text style="display: block;" ${this.noShuffle ? 'no-shuffle' : ''}>${line}</shuffle-text>`,
        )
        .join('');
      return;
    }
    this.originalText = this.innerText;
    this.isSmall = this.originalText.length < 10;

    if (!this.noShuffle)
      this.addEventListener('mouseenter', () => {
        this.stopShuffling();
        this.startShuffling();
      });

    this.innerText = '\u00A0'; // prevent layout shift
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
      setTimeout(() => this.startShuffling(), delay);
      return;
    }

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
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
    const characters = randSubsetOfChars(3);
    this.intervalId = window.setInterval(() => {
      const { start, end } = this.getStartEndIndices();
      const shuffled = textButRandom(
        this.originalText.substring(start, end),
        characters,
      );
      this.innerText = this.originalText.substring(0, start) + shuffled;

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
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.innerText = this.originalText;
    }
  }
}

if (!customElements.get('shuffle-text')) {
  customElements.define('shuffle-text', ShuffleText);
}
