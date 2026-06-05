import { useEffect, useRef, useState } from 'react';
import type { GameProps } from '../../types';
import styles from './TypingSpeed.module.scss';

// Official typing-test word bank (common English words used in competitive typing)
const WORDS = [
  'the',
  'be',
  'to',
  'of',
  'and',
  'a',
  'in',
  'that',
  'have',
  'it',
  'for',
  'not',
  'on',
  'with',
  'he',
  'as',
  'you',
  'do',
  'at',
  'this',
  'but',
  'his',
  'by',
  'from',
  'they',
  'we',
  'say',
  'her',
  'she',
  'or',
  'an',
  'will',
  'my',
  'one',
  'all',
  'would',
  'there',
  'their',
  'what',
  'so',
  'up',
  'out',
  'if',
  'about',
  'who',
  'get',
  'which',
  'go',
  'me',
  'when',
  'make',
  'can',
  'like',
  'time',
  'no',
  'just',
  'him',
  'know',
  'take',
  'people',
  'into',
  'year',
  'your',
  'good',
  'some',
  'could',
  'them',
  'see',
  'other',
  'than',
  'then',
  'now',
  'look',
  'only',
  'come',
  'its',
  'over',
  'think',
  'also',
  'back',
  'after',
  'use',
  'two',
  'how',
  'our',
  'work',
  'first',
  'well',
  'way',
  'even',
  'new',
  'want',
  'because',
  'any',
  'these',
  'give',
  'day',
  'most',
  'us',
  'great',
  'between',
  'need',
  'large',
  'often',
  'hand',
  'high',
  'place',
  'hold',
  'turn',
  'here',
  'why',
  'ask',
  'went',
  'men',
  'read',
  'need',
  'land',
  'different',
  'home',
  'move',
  'try',
  'kind',
  'hand',
  'picture',
  'again',
  'change',
  'off',
  'play',
  'spell',
  'air',
  'away',
  'animal',
  'house',
  'point',
  'page',
  'letter',
  'mother',
  'answer',
  'found',
  'study',
  'still',
  'learn',
  'plant',
  'cover',
  'food',
  'sun',
  'four',
  'between',
  'state',
  'keep',
  'eye',
  'never',
  'last',
  'let',
  'thought',
  'city',
  'tree',
  'cross',
  'farm',
  'hard',
  'start',
  'might',
  'story',
  'saw',
  'far',
  'sea',
  'draw',
  'left',
  'late',
  'run',
  'while',
  'press',
  'close',
  'night',
  'real',
  'life',
  'few',
  'north',
  'open',
  'seem',
  'together',
  'next',
  'white',
  'children',
  'begin',
  'got',
  'walk',
  'example',
  'ease',
  'paper',
  'group',
  'always',
  'music',
  'those',
  'both',
  'mark',
  'book',
  'carry',
  'took',
  'science',
  'eat',
  'room',
  'friend',
  'began',
  'idea',
  'fish',
  'mountain',
  'stop',
  'once',
  'base',
  'hear',
  'horse',
  'cut',
  'sure',
  'watch',
  'color',
  'face',
  'wood',
  'main',
  'enough',
  'plain',
  'girl',
  'usual',
  'young',
  'ready',
  'above',
  'ever',
  'red',
  'list',
  'though',
  'feel',
  'talk',
  'bird',
  'soon',
  'body',
  'dog',
  'family',
  'direct',
  'pose',
  'leave',
  'song',
  'measure',
  'door',
  'product',
  'black',
  'short',
  'numeral',
  'class',
  'wind',
  'question',
  'happen',
  'complete',
  'ship',
  'area',
  'half',
  'rock',
  'order',
  'fire',
  'south',
  'miss',
  'brought',
  'heat',
  'snow',
  'tire',
  'bring',
  'yes',
  'distant',
  'fill',
  'east',
  'paint',
  'language',
  'among',
  'result',
  'side',
  'vowel',
  'toward',
  'hundred',
  'table',
  'north',
  'slow',
  'common',
  'gold',
  'possible',
  'plane',
  'age',
  'dry',
  'wonder',
  'laugh',
  'thousand',
  'ran',
  'check',
  'game',
  'shape',
  'miss',
  'ground',
  'king',
  'space',
  'heard',
  'best',
  'hour',
  'better',
  'true',
];

const GAME_DURATION = 30; // seconds

// Build a shuffled queue; refill and re-shuffle when exhausted
function makeQueue(): string[] {
  const arr = [...WORDS];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildWordList(n: number): string[] {
  const result: string[] = [];
  let queue = makeQueue();
  while (result.length < n) {
    if (queue.length === 0) queue = makeQueue();
    result.push(queue.shift()!);
  }
  return result;
}

export default function TypingSpeed({
  onScoreUpdate,
  onGameOver,
  isPlaying,
}: GameProps) {
  const [words] = useState(() => buildWordList(120));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [input, setInput] = useState('');
  const [correct, setCorrect] = useState(0);
  const [errors, setErrors] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isPlaying) return;
    inputRef.current?.focus();
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  useEffect(() => {
    if (timeLeft === 0 && isPlaying) {
      const wpm = Math.round((correct / GAME_DURATION) * 60);
      const accuracy =
        correct + errors > 0
          ? Math.round((correct / (correct + errors)) * 100)
          : 100;
      const score = Math.round(wpm * (accuracy / 100));
      onGameOver(score);
    }
  }, [timeLeft]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const elapsed = Math.max(1, GAME_DURATION - timeLeft);
    const wpm = Math.round((correct / elapsed) * 60);
    const accuracy =
      correct + errors > 0
        ? Math.round((correct / (correct + errors)) * 100)
        : 100;
    onScoreUpdate(Math.round(wpm * (accuracy / 100)));
  }, [correct, errors, timeLeft]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (val.endsWith(' ')) {
      const typed = val.trim();
      if (typed === words[currentIndex]) {
        setCorrect((c) => c + 1);
      } else {
        setErrors((e) => e + 1);
      }
      setCurrentIndex((i) => i + 1);
      setInput('');
    } else {
      setInput(val);
    }
  }

  const elapsed = Math.max(1, GAME_DURATION - timeLeft);
  const wpm = Math.round((correct / elapsed) * 60);
  const accuracy =
    correct + errors > 0
      ? Math.round((correct / (correct + errors)) * 100)
      : 100;
  const liveScore = Math.round(wpm * (accuracy / 100));
  const progress = ((GAME_DURATION - timeLeft) / GAME_DURATION) * 100;

  return (
    <div className={styles.game}>
      <div className={styles.timer}>{timeLeft}s</div>
      <div className={styles.scoreLive}>
        <span className={styles.wpm}>
          {wpm} <small>WPM</small>
        </span>
        <span className={styles.accuracy}>
          {accuracy}
          <small>%</small>
        </span>
        <span className={styles.scoreVal}>
          {liveScore} <small>pts</small>
        </span>
      </div>
      <div className={styles.wordDisplay}>
        {words
          .slice(Math.max(0, currentIndex - 2), currentIndex + 12)
          .map((word, i) => {
            const actualIndex = Math.max(0, currentIndex - 2) + i;
            return (
              <span
                key={actualIndex}
                className={`${styles.word} ${actualIndex === currentIndex ? styles.current : ''} ${actualIndex < currentIndex ? styles.done : ''}`}
              >
                {word}
              </span>
            );
          })}
      </div>
      <input
        ref={inputRef}
        className={styles.input}
        value={input}
        onChange={handleInput}
        placeholder='Type here...'
        disabled={!isPlaying || timeLeft === 0}
        autoComplete='off'
        autoCorrect='off'
        autoCapitalize='off'
        spellCheck={false}
      />
      <span className={styles.hint}>Press Spacebar to submit</span>
      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
