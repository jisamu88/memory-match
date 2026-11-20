import { useEffect, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

const EMOJIS = ['🐢', '🦊', '🐙', '🦋', '🌵', '🍉', '🚀', '🎈'];
const COLUMNS = 4;
const GAP = 10;

type Card = {
  id: number;
  emoji: string;
  flipped: boolean;
  matched: boolean;
};

// Fisher-Yates shuffle: gives a fair, unbiased shuffle
function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildDeck(): Card[] {
  return shuffle([...EMOJIS, ...EMOJIS]).map((emoji, i) => ({
    id: i,
    emoji,
    flipped: false,
    matched: false,
  }));
}

export default function MemoryMatchScreen() {
  const { width } = useWindowDimensions();
  const [cards, setCards] = useState<Card[]>([]);
  const [picked, setPicked] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);

  // Shuffle after the screen loads (avoids the web hydration error)
  useEffect(() => {
    setCards(buildDeck());
  }, []);

  const locked = picked.length === 2;
  const won = cards.length > 0 && cards.every((c) => c.matched);

  const boardWidth = Math.min(width - 32, 420);
  const cardSize = (boardWidth - GAP * (COLUMNS - 1)) / COLUMNS;

  function handlePress(index: number) {
    if (locked) return;
    const card = cards[index];
    if (!card || card.flipped || card.matched) return;

    setCards((prev) =>
      prev.map((c, i) => (i === index ? { ...c, flipped: true } : c))
    );
    setPicked((prev) => [...prev, index]);
  }

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

  function restart() {
    setCards(buildDeck());
    setPicked([]);
    setMoves(0);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.title}>Memory Match</Text>
      <Text style={styles.moves}>Moves: {moves}</Text>

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
        <View style={styles.winBox}>
          <Text style={styles.winText}>You won in {moves} moves!</Text>
        </View>
      )}

      <Pressable onPress={restart} style={styles.button}>
        <Text style={styles.buttonText}>{won ? 'Play again' : 'Restart'}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#14213D',
    paddingVertical: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  moves: {
    fontSize: 18,
    color: '#C9D1E3',
    marginBottom: 20,
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
  winBox: {
    marginTop: 24,
  },
  winText: {
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