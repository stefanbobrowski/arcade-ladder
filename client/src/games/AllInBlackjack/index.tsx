import { useState, useRef, useEffect } from 'react';
import { Coins } from '@phosphor-icons/react';
import type { GameProps } from '../../types';
import { getVolume } from '../../lib/audio';
import VolumeControl from '../../components/ui/VolumeControl';
import styles from './AllInBlackjack.module.scss';

// ── Web Audio helpers ──────────────────────────────────────────────────────────
let _audioCtx: AudioContext | null = null;
function ac(): AudioContext {
  if (!_audioCtx) _audioCtx = new AudioContext();
  return _audioCtx;
}

function playCard() {
  try {
    const v = getVolume();
    if (v === 0) return;
    const ctx = ac();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.06, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] =
        (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2) * 0.35 * v;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(1, ctx.currentTime);
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  } catch {
    /* noop */
  }
}

function playChipSlide() {
  try {
    const v = getVolume();
    if (v === 0) return;
    const ctx = ac();
    const dur = 0.35;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + dur);
    gain.gain.setValueAtTime(0.22 * v, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + dur);
    // secondary clink
    setTimeout(() => {
      try {
        const v2 = getVolume();
        if (v2 === 0) return;
        const ctx2 = ac();
        const o2 = ctx2.createOscillator();
        const g2 = ctx2.createGain();
        o2.connect(g2);
        g2.connect(ctx2.destination);
        o2.type = 'sine';
        o2.frequency.value = 2200;
        g2.gain.setValueAtTime(0.12 * v2, ctx2.currentTime);
        g2.gain.exponentialRampToValueAtTime(0.001, ctx2.currentTime + 0.08);
        o2.start(ctx2.currentTime);
        o2.stop(ctx2.currentTime + 0.1);
      } catch {
        /* noop */
      }
    }, 200);
  } catch {
    /* noop */
  }
}

function playKnock() {
  try {
    const v = getVolume();
    if (v === 0) return;
    const ctx = ac();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const env = Math.pow(1 - i / data.length, 3);
      data[i] = (Math.random() * 2 - 1) * env * 0.6 * v;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 400;
    src.connect(lp);
    lp.connect(ctx.destination);
    src.start();
    setTimeout(() => {
      try {
        const v2 = getVolume();
        if (v2 === 0) return;
        const ctx2 = ac();
        const b2 = ctx2.createBuffer(1, ctx2.sampleRate * 0.1, ctx2.sampleRate);
        const d2 = b2.getChannelData(0);
        for (let i = 0; i < d2.length; i++)
          d2[i] =
            (Math.random() * 2 - 1) * Math.pow(1 - i / d2.length, 3) * 0.5 * v2;
        const s2 = ctx2.createBufferSource();
        s2.buffer = b2;
        const lp2 = ctx2.createBiquadFilter();
        lp2.type = 'lowpass';
        lp2.frequency.value = 350;
        s2.connect(lp2);
        lp2.connect(ctx2.destination);
        s2.start();
      } catch {
        /* noop */
      }
    }, 140);
  } catch {
    /* noop */
  }
}

function playWin() {
  try {
    const v = getVolume();
    if (v === 0) return;
    const ctx = ac();
    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.1;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.2 * v, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  } catch {
    /* noop */
  }
}

function playLose() {
  try {
    const v = getVolume();
    if (v === 0) return;
    const ctx = ac();
    const notes = [330, 277, 220, 185]; // descending tones
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0.15 * v, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  } catch {
    /* noop */
  }
}

function playBlackjack() {
  try {
    const v = getVolume();
    if (v === 0) return;
    const ctx = ac();
    const fanfare = [523, 659, 784, 659, 1047];
    fanfare.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.08;
      gain.gain.setValueAtTime(0.22 * v, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  } catch {
    /* noop */
  }
}

function playPush() {
  try {
    const v = getVolume();
    if (v === 0) return;
    const ctx = ac();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = 440;
    osc.frequency.linearRampToValueAtTime(440, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.1 * v, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    /* noop */
  }
}

function speak(text: string) {
  try {
    if (!window.speechSynthesis) return;
    if (getVolume() === 0) return;
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 1.1;
    utt.pitch = 0.9;
    utt.volume = Math.min(1, getVolume() * 1.2);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utt);
  } catch {
    /* noop */
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────
type Suit = '♠' | '♥' | '♦' | '♣';
type Rank =
  | 'A'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K';

interface Card {
  suit: Suit;
  rank: Rank;
  faceDown?: boolean;
}

interface Hand {
  cards: Card[];
  doubled: boolean;
  done: boolean;
  result?: 'win' | 'lose' | 'push' | 'blackjack';
}

type Phase = 'idle' | 'player' | 'dealer' | 'result' | 'gameOver';

// ── Card helpers ──────────────────────────────────────────────────────────────
const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
const RANKS: Rank[] = [
  'A',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
];
const START_CHIPS = 100;

function cardVal(r: Rank): number {
  if (r === 'A') return 11;
  if (r === 'J' || r === 'Q' || r === 'K') return 10;
  return parseInt(r, 10);
}

function handTotal(cards: Card[]): number {
  let t = 0,
    aces = 0;
  for (const c of cards) {
    if (c.faceDown) continue;
    t += cardVal(c.rank);
    if (c.rank === 'A') aces++;
  }
  while (t > 21 && aces > 0) {
    t -= 10;
    aces--;
  }
  return t;
}

function isBust(cards: Card[]) {
  return handTotal(cards) > 21;
}
function isBJ(cards: Card[]) {
  return cards.length === 2 && handTotal(cards) === 21;
}
function isRed(s: Suit) {
  return s === '♥' || s === '♦';
}

function makeDeck(): Card[] {
  const d: Card[] = [];
  for (const s of SUITS) for (const r of RANKS) d.push({ suit: s, rank: r });
  return d;
}

function shuffled(d: Card[]): Card[] {
  const a = [...d];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Card component ─────────────────────────────────────────────────────────────
function CardView({ card }: { card: Card }) {
  if (card.faceDown) {
    return <div className={`${styles.card} ${styles.faceDown}`} />;
  }
  const red = isRed(card.suit);
  return (
    <div className={`${styles.card} ${red ? styles.red : styles.black}`}>
      <div className={styles.cardCorner}>
        <span>{card.rank}</span>
        <span>{card.suit}</span>
      </div>
      <div className={styles.cardCenter}>{card.suit}</div>
      <div className={`${styles.cardCorner} ${styles.cardCornerBot}`}>
        <span>{card.rank}</span>
        <span>{card.suit}</span>
      </div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function AllInBlackjack({
  isPlaying,
  onScoreUpdate,
  onGameOver,
}: GameProps) {
  const deckRef = useRef<Card[]>([]);
  const chipsRef = useRef(START_CHIPS);
  const chipsAtStartRef = useRef(START_CHIPS);
  const scoreRef = useRef(0);
  const usedLoanRef = useRef(false);

  const [chips, setChips] = useState(START_CHIPS);
  const [betAmount, setBetAmount] = useState(0);
  const [coinAnimating, setCoinAnimating] = useState(false);
  const [doubleAnimating, setDoubleAnimating] = useState(false);
  const [dealerCards, setDealerCards] = useState<Card[]>([]);
  const [hands, setHands] = useState<Hand[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!isPlaying) return;
    deckRef.current = shuffled(makeDeck());
    chipsRef.current = START_CHIPS;
    chipsAtStartRef.current = START_CHIPS;
    scoreRef.current = 0;
    usedLoanRef.current = false;
    setChips(START_CHIPS);
    setBetAmount(0);
    setCoinAnimating(false);
    setDoubleAnimating(false);
    setDealerCards([]);
    setHands([]);
    setActiveIdx(0);
    setPhase('idle');
    setMsg('');
    onScoreUpdate(0);
  }, [isPlaying]); // eslint-disable-line react-hooks/exhaustive-deps

  function drawCard(faceDown = false): Card {
    if (deckRef.current.length < 15) {
      deckRef.current = shuffled(makeDeck());
    }
    const [c, ...rest] = deckRef.current;
    deckRef.current = rest;
    return { ...c, faceDown };
  }

  // ── Deal a new hand ────────────────────────────────────────────────────────
  function allIn() {
    if (coinAnimating) return;
    const cs = chipsRef.current;
    usedLoanRef.current = false;
    setBetAmount(cs);
    setCoinAnimating(true);
    playChipSlide();
    speak('All in');
    setTimeout(() => {
      setCoinAnimating(false);
      chipsAtStartRef.current = cs;

      const pCard1 = drawCard();
      const dCard1 = drawCard();
      const pCard2 = drawCard();
      const dCard2 = drawCard(true); // hole card face down

      const pCards = [pCard1, pCard2];
      const dCards = [dCard1, dCard2];
      const hand: Hand = { cards: pCards, doubled: false, done: false };

      // Card deal sounds
      [0, 80, 160, 240].forEach((delay) => setTimeout(playCard, delay));

      setDealerCards(dCards);
      setHands([hand]);
      setActiveIdx(0);
      setMsg('');

      // Immediate blackjack check
      if (isBJ(pCards)) {
        const revealed = dCards.map((c) => ({ ...c, faceDown: false }));
        setDealerCards(revealed);
        if (isBJ(revealed)) {
          playPush();
          setMsg('Both Blackjack — Push! Bet returned.');
          setPhase('result');
        } else {
          // Blackjack pays 3:2
          const win = Math.floor(cs * 1.5);
          const nc = cs + win;
          chipsRef.current = nc;
          scoreRef.current = nc;
          setBetAmount(nc);
          setChips(nc);
          onScoreUpdate(nc);
          playBlackjack();
          setMsg(`Blackjack! +${win} chips 🎉`);
          setHands([{ ...hand, done: true, result: 'blackjack' }]);
          setPhase('result');
        }
        return;
      }

      setPhase('player');
    }, 650);
  }

  // ── Player actions ─────────────────────────────────────────────────────────
  function doHit() {
    speak('Hit');
    playKnock();
    const card = drawCard();
    setTimeout(playCard, 120);
    const newCards = [...hands[activeIdx].cards, card];
    const done = isBust(newCards) || handTotal(newCards) === 21;
    const newHands = hands.map((h, i) =>
      i === activeIdx ? { ...h, cards: newCards, done } : h
    );
    setHands(newHands);
    if (done) advance(newHands, activeIdx);
  }

  function doStand() {
    speak('Stand');
    const newHands = hands.map((h, i) =>
      i === activeIdx ? { ...h, done: true } : h
    );
    setHands(newHands);
    advance(newHands, activeIdx);
  }

  function doDouble() {
    // Takes a loan — one more card, then stand; marks loan used
    speak('Double down');
    playChipSlide();
    usedLoanRef.current = true;
    const cs = chipsAtStartRef.current;
    setBetAmount(cs * 2);
    setDoubleAnimating(true);
    setTimeout(() => setDoubleAnimating(false), 600);
    const card = drawCard();
    const newCards = [...hands[activeIdx].cards, card];
    const newHands = hands.map((h, i) =>
      i === activeIdx ? { ...h, cards: newCards, doubled: true, done: true } : h
    );
    setHands(newHands);
    advance(newHands, activeIdx);
  }

  function doSplit() {
    // Takes a loan — split pair into two hands, each gets a new card
    speak('Split');
    playChipSlide();
    usedLoanRef.current = true;
    const [c1, c2] = hands[activeIdx].cards;
    const extra1 = drawCard();
    const extra2 = drawCard();
    const hand1: Hand = { cards: [c1, extra1], doubled: false, done: false };
    const hand2: Hand = { cards: [c2, extra2], doubled: false, done: false };
    const newHands = [
      ...hands.slice(0, activeIdx),
      hand1,
      hand2,
      ...hands.slice(activeIdx + 1),
    ];
    setHands(newHands);
    setActiveIdx(activeIdx); // stay on hand1
  }

  // Advance to next undone hand, or trigger dealer turn
  function advance(currentHands: Hand[], fromIdx: number) {
    const nextIdx = currentHands.findIndex((h, i) => i > fromIdx && !h.done);
    if (nextIdx !== -1) {
      setActiveIdx(nextIdx);
    } else {
      runDealer(currentHands);
    }
  }

  function handleEndGame() {
    const fs = scoreRef.current;
    onScoreUpdate(fs);
    onGameOver(fs);
  }

  // ── Dealer turn ────────────────────────────────────────────────────────────
  function runDealer(finalHands: Hand[]) {
    setPhase('dealer');
    // Reveal hole card then draw until 17+
    let dHand: Card[] = dealerCards.map((c) => ({ ...c, faceDown: false }));
    while (handTotal(dHand) < 17) {
      dHand = [...dHand, drawCard()];
    }
    setDealerCards(dHand);
    setTimeout(() => {
      resolveHands(finalHands, dHand);
    }, 900);
  }

  // ── Resolve all hands against dealer ──────────────────────────────────────
  function resolveHands(finalHands: Hand[], dHand: Card[]) {
    const dTotal = handTotal(dHand);
    const dBust = isBust(dHand);
    const cs = chipsAtStartRef.current;
    const usedLoan = usedLoanRef.current;

    let wins = 0,
      losses = 0;
    const resolved = finalHands.map((h) => {
      const pt = handTotal(h.cards);
      if (isBust(h.cards)) {
        losses++;
        return { ...h, result: 'lose' as const };
      }
      if (dBust || pt > dTotal) {
        wins++;
        return { ...h, result: 'win' as const };
      }
      if (pt === dTotal) {
        return { ...h, result: 'push' as const };
      }
      losses++;
      return { ...h, result: 'lose' as const };
    });
    setHands(resolved);

    const net = wins - losses;

    if (net > 0) {
      // Sum each hand's payout individually so split + double is calculated correctly.
      // Each hand's bet: doubled hands wagered cs×2, normal hands wagered cs.
      // Win pays 2× the hand's bet; push returns the hand's bet.
      const nc = resolved.reduce((sum, h) => {
        const handBet = h.doubled ? cs * 2 : cs;
        if (h.result === 'win') return sum + handBet * 2;
        if (h.result === 'push') return sum + handBet;
        return sum;
      }, 0);
      chipsRef.current = nc;
      scoreRef.current = nc;
      setBetAmount(nc);
      setChips(nc);
      onScoreUpdate(nc);
      playWin();
      setMsg(`You win! ${cs} → ${nc} chips 🎉`);
      setPhase('result');
    } else if (net === 0) {
      // Push: chips returned
      chipsRef.current = cs;
      setChips(cs);
      playPush();
      setMsg('Push — bet returned.');
      setPhase('result');
    } else {
      // Loss — loan = score wiped to 0; normal = keep previous score
      const finalScore = usedLoan ? 0 : scoreRef.current;
      chipsRef.current = 0;
      setChips(0);
      playLose();
      const label = usedLoan
        ? `Lost the loan. Score wiped — final: ${finalScore}`
        : `Dealer wins. Final score: ${finalScore} chips`;
      setMsg(label);
      setPhase('gameOver');
      onScoreUpdate(finalScore);
    }
  }

  // ── Button visibility ──────────────────────────────────────────────────────
  const curHand = hands[activeIdx];
  const inTurn = phase === 'player' && curHand && !curHand.done;
  const curTotal = curHand ? handTotal(curHand.cards) : 0;
  const canHit = inTurn && !isBust(curHand.cards) && curTotal < 21;
  const canStand = inTurn;
  const canDouble = inTurn && curHand.cards.length === 2;
  const canSplit =
    inTurn &&
    curHand.cards.length === 2 &&
    curHand.cards[0].rank === curHand.cards[1].rank;

  const visibleDealer = dealerCards.filter((c) => !c.faceDown);
  const dealerShown =
    visibleDealer.length > 0 ? handTotal(visibleDealer) : null;

  return (
    <div className={styles.game}>
      <VolumeControl className={styles.volumeCtrl} />
      <div className={styles.section}>
        <div className={styles.sectionLabel}>
          Dealer
          {dealerShown !== null && ` — ${dealerShown}`}
          {isBust(dealerCards) && ' (BUST)'}
        </div>
        <div className={styles.handRow}>
          {dealerCards.map((c, i) => (
            <CardView key={i} card={c} />
          ))}
        </div>
      </div>

      {/* Table center: etched logo + bet coin area */}
      <div className={styles.tableCenter}>
        <div className={styles.tableLogo}>All‑In Blackjack</div>
        <div className={styles.betArea}>
          {phase !== 'idle' && phase !== 'gameOver' && (
            <div
              className={`${styles.betCoin} ${
                coinAnimating ? styles.coinSlideIn : ''
              } ${phase === 'result' ? styles.betCoinReturn : ''}`}
            >
              <Coins size={22} weight='fill' className={styles.betCoinIcon} />
              <div className={styles.coinAmount}>{betAmount}</div>
              <div className={styles.coinLabel}>
                {phase === 'result' ? 'won' : 'bet'}
              </div>
            </div>
          )}
          {doubleAnimating && (
            <div className={`${styles.betCoin} ${styles.doubleCoin}`}>
              <Coins size={18} weight='fill' className={styles.betCoinIcon} />
              <div className={styles.coinAmount}>{chipsAtStartRef.current}</div>
              <div className={styles.coinLabel}>×2</div>
            </div>
          )}
        </div>
        {/* Message */}
        <div className={styles.status}>
          {msg && <div className={styles.msg}>{msg}</div>}
        </div>
      </div>

      {/* Player hands – bottom, above controls */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>
          You
          <span className={styles.chipsDisplay}>
            <Coins size={16} weight='fill' />
            {chips}
          </span>
        </div>
        {hands.length === 0 ? (
          <div className={styles.emptyHint}>Press ALL IN to deal</div>
        ) : (
          <div className={styles.handsWrap}>
            {hands.map((h, hi) => (
              <div
                key={hi}
                className={`${styles.handWrap} ${
                  hi === activeIdx && phase === 'player' ? styles.active : ''
                }`}
              >
                {hands.length > 1 && (
                  <div className={styles.handLabel}>
                    Hand {hi + 1}
                    {h.doubled && ' ×2'}
                  </div>
                )}
                <div className={styles.handRow}>
                  {h.cards.map((c, ci) => (
                    <CardView key={ci} card={c} />
                  ))}
                </div>
                <div
                  className={`${styles.handTotal} ${
                    h.result === 'win' || h.result === 'blackjack'
                      ? styles.win
                      : h.result === 'lose'
                        ? styles.lose
                        : h.result === 'push'
                          ? styles.push
                          : ''
                  }`}
                >
                  {handTotal(h.cards)}
                  {isBust(h.cards) && ' BUST'}
                  {h.result === 'win' && ' — WIN'}
                  {h.result === 'blackjack' && ' — BLACKJACK'}
                  {h.result === 'lose' && !isBust(h.cards) && ' — LOSE'}
                  {h.result === 'push' && ' — PUSH'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Controls – flush to bottom */}
      <div className={styles.controls}>
        {(phase === 'idle' || phase === 'result') && (
          <button
            className={`${styles.btn} ${styles.btnAllIn}`}
            onClick={allIn}
            disabled={coinAnimating}
          >
            ALL IN
            <span className={styles.allInChips}>
              <Coins size={14} weight='fill' /> {chips}
            </span>
          </button>
        )}

        {phase === 'player' && (
          <>
            <button className={styles.btn} onClick={doHit} disabled={!canHit}>
              Hit
            </button>
            <button
              className={styles.btn}
              onClick={doStand}
              disabled={!canStand}
            >
              Stand
            </button>
            {canDouble && (
              <button
                className={`${styles.btn} ${styles.btnDouble}`}
                onClick={doDouble}
              >
                Double ×2
              </button>
            )}
            {canSplit && (
              <button
                className={`${styles.btn} ${styles.btnSplit}`}
                onClick={doSplit}
              >
                Split
              </button>
            )}
          </>
        )}

        {phase === 'gameOver' && (
          <div className={styles.gameOverMsg}>
            Game Over — score: {scoreRef.current} chips
          </div>
        )}

        {(phase === 'result' || phase === 'gameOver') && (
          <button
            className={`${styles.btn} ${styles.btnEndGame}`}
            onClick={handleEndGame}
          >
            End Game
          </button>
        )}
      </div>
    </div>
  );
}
