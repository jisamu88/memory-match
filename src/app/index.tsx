import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

const EMOJIS = ['🐢', '🦊', '🐙', '🦋', '🌵', '🍉', '🚀', '🎈', '🍕', '🐳'];
const GAP = 10;
const STORAGE_KEY = 'memorymatch:best';

type Level = 'easy' | 'medium' | 'hard';

const LEVELS: Record<Level, { label: string; pairs: number; columns: number }> = {
  easy: { label: 'Easy', pairs: 6, columns: 3 }, // 12 cards
  medium: { label: 'Medium', pairs: 8, columns: 4 }, // 16 cards
  hard: { label: 'Hard', pairs: 10, columns: 4 }, // 20 cards
};

type Card = {
  id: number;
  emoji: string;
  flipped: boolean;
  matched: boolean;
};

type BestScores = Partial<Record<Level, { moves: number; seconds: number }>>;

// Fisher-Yates shuffle: gives a fair, unbiased shuffle
function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildDeck(pairs: number): Card[] {
  const chosen = EMOJIS.slice(0, pairs);
  return shuffle([...chosen, ...chosen]).map((emoji, i) => ({
    id: i,
    emoji,
    flipped: false,
    matched: false,
  }));
}

export default function MemoryMatchScreen() {
  const { width } = useWindowDimensions();
  const [level, setLevel] = useState<Level>('medium');
  const [cards, setCards] = useState<Card[]>([]);
  const [picked, setPicked] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [started, setStarted] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [best, setBest] = useState<BestScores>({});

  // Runs once after the screen loads: shuffle and load saved best scores
  useEffect(() => {
    setCards(buildDeck(LEVELS.medium.pairs));
    setMounted(true);
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setBest(JSON.parse(raw));
      })
      .catch(() => {});
  }, []);

  const locked = picked.length === 2;
  const won = cards.length > 0 && cards.every((c) => c.matched);

  // Timer: starts on the first tap, stops when the game is won
  useEffect(() => {
    if (!started || won) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [started, won]);

  // When the game is won, update and save the best scores for this level
  useEffect(() => {
    if (!won) return;
    const current = best[level];
    const next: BestScores = {
      ...best,
      [level]: {
        moves: Math.min(current?.moves ?? moves, moves),
        seconds: Math.min(current?.seconds ?? seconds, seconds),
      },
    };
    setBest(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, [won]);

  // Check a pair after two cards are picked
  useEffect(() => {
    if (picked.length !== 2) return;

    setMoves((m) => m + 1);
    const [a, b] = picked;
    const isMatch = cards[a].emoji === cards[b].emoji;

    const timer = setTimeout(
      () => {
        setCards((prev) =>
          prev.map((c, i) => {
            if (i !== a && i !== b) return c;
            return isMatch
              ? { ...c, matched: true }
              : { ...c, flipped: false };
          })
        );
        setPicked([]);
      },
      isMatch ? 300 : 900
    );

    return () => clearTimeout(timer);
  }, [picked]);

  const { columns, pairs } = LEVELS[level];
  const availableWidth = Math.min((mounted ? width : 360) - 32, 420);
  const cardSize = Math.min(
    90,
    (availableWidth - GAP * (columns - 1)) / columns
  );
  const boardWidth = cardSize * columns + GAP * (columns - 1);

  function startGame(nextLevel: Level) {
    setLevel(nextLevel);
    setCards(buildDeck(LEVELS[nextLevel].pairs));
    setPicked([]);
    setMoves(0);
    setSeconds(0);
    setStarted(false);
  }

  function handlePress(index: number) {
    if (locked) return;
    const card = cards[index];
    if (!card || card.flipped || card.matched) return;

    setStarted(true);
    setCards((prev) =>
      prev.map((c, i) => (i === index ? { ...c, flipped: true } : c))
    );
    setPicked((prev) => [...prev, index]);
  }

  const levelBest = best[level];

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Memory Match</Text>

        <View style={styles.levelRow}>
          {(Object.keys(LEVELS) as Level[]).map((key) => (
            <Pressable
              key={key}
              onPress={() => startGame(key)}
              style={[
                styles.levelButton,
                key === level && styles.levelButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.levelText,
                  key === level && styles.levelTextActive,
                ]}
              >
                {LEVELS[key].label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.moves}>
          Moves: {moves}  |  Time: {seconds}s
        </Text>
        <Text style={styles.best}>
          {levelBest
            ? `Best: ${levelBest.moves} moves, ${levelBest.seconds}s`
            : 'No best score yet'}
        </Text>

        <View style={[styles.board, { width: boardWidth }]}>
          {cards.map((card, index) => {
            const faceUp = card.flipped || card.matched;
            return (
              <Pressable
                key={card.id}
                onPress={() => handlePress(index)}
                style={[
                  styles.card,
                  { width: cardSize, height: cardSize },
                  faceUp ? styles.cardFaceUp : styles.cardFaceDown,
                  card.matched && styles.cardMatched,
                ]}
              >
                <Text style={[styles.emoji, { fontSize: cardSize * 0.5 }]}>
                  {faceUp ? card.emoji : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {won && (
          <Text style={styles.winText}>
            You won in {moves} moves and {seconds}s!
          </Text>
        )}

        <Pressable onPress={() => startGame(level)} style={styles.button}>
          <Text style={styles.buttonText}>{won ? 'Play again' : 'Restart'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#14213D',
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  levelRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  levelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FCA311',
  },
  levelButtonActive: {
    backgroundColor: '#FCA311',
  },
  levelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FCA311',
  },
  levelTextActive: {
    color: '#14213D',
  },
  moves: {
    fontSize: 18,
    color: '#C9D1E3',
    marginBottom: 4,
  },
  best: {
    fontSize: 14,
    color: '#8E9AB8',
    marginBottom: 16,
  },
  board: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  card: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFaceDown: {
    backgroundColor: '#FCA311',
  },
  cardFaceUp: {
    backgroundColor: '#F1F3F8',
  },
  cardMatched: {
    backgroundColor: '#B7E4C7',
  },
  emoji: {
    textAlign: 'center',
  },
  winText: {
    marginTop: 24,
    fontSize: 22,
    fontWeight: '700',
    color: '#B7E4C7',
  },
  button: {
    marginTop: 24,
    backgroundColor: '#FCA311',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#14213D',
  },
});