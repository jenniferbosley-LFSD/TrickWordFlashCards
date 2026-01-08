import React, { useEffect, useRef, useState } from "react";

const GAME_VERSION = "2025-11-13 10:00"; // date-hour-minute of latest update

/************** Utilities **************/
function shuffle(array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalizeWords(text) {
  const seen = new Set();
  return (text || "")
    .split(/[\n,\t ]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0)
    .filter((w) => {
      const lower = w.toLowerCase();
      if (seen.has(lower)) return false;
      seen.add(lower);
      return true;
    });
}

function ensureNoImmediateRepeats(array) {
  const a = [...array];
  for (let i = 1; i < a.length; i++) {
    if (a[i] === a[i - 1]) {
      const j = (i + 1) % a.length;
      [a[i], a[j]] = [a[j], a[i]];
    }
  }
  return a;
}

/************** Data **************/
const samplePacks = {
  "Unit 2": ["the", "a", "and", "is", "his", "of"],
  "Unit 3": ["as", "has", "to", "into", "we", "he", "she", "be", "me", "for", "or"],
  "Unit 4": ["you", "your", "I", "they", "was", "one", "said"],
  "Unit 5": ["from", "have", "do", "does"],
  "Unit 6": ["were", "are", "who", "what", "when", "where", "there", "here"],
  "Unit 7": ["why", "by", "my", "try", "put", "two", "too", "very", "also", "some", "come"],
  "Unit 8": ["would", "could", "should", "her", "over", "number"],
  "Unit 9": ["say", "says", "see", "between", "each"],
  "Unit 10": ["any", "many", "how", "now", "down", "out", "about", "our"],
  "Unit 11": ["friend", "other", "another", "none", "nothing"],
  "Unit 12": ["people", "month", "little", "been", "own", "want", "Mr.", "Mrs."],
  "Unit 13": ["work", "word", "write", "being", "their", "first", "look", "good", "new"],
  "Unit 14": ["water", "called", "day", "may", "way"],
};

/************** Visuals **************/
const Smiley = ({ level, celebrating = false }) => {
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const idx = clamp(level + 3, 0, 12);
  const faces = ["😢", "😟", "🙁", "🙂", "😊", "😀", "😄", "😁", "😆", "😅", "🤗", "😍", "🤩"];
  return <div className="text-5xl">{celebrating ? "🤩" : faces[idx]}</div>;
};

/************** Main Component **************/
export default function App() {
  const [phase, setPhase] = useState("setup"); // setup | play | done
  const [input, setInput] = useState("");
  const inputRef = useRef(null);

  const [selectedPacks, setSelectedPacks] = useState(() => {
    try {
      const saved = localStorage.getItem("lfds_selected_units");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);
  const [cleared, setCleared] = useState([]);
  const [attempts, setAttempts] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [moodLevel, setMoodLevel] = useState(0);
  const [celebrate, setCelebrate] = useState(false);

  // Focus input on setup screen
  useEffect(() => {
    if (phase === "setup" && inputRef.current) inputRef.current.focus();
  }, [phase]);

  // Auto-save selected units
  useEffect(() => {
    try {
      localStorage.setItem("lfds_selected_units", JSON.stringify(selectedPacks));
    } catch {}
  }, [selectedPacks]);

  const startGame = () => {
    const typed = normalizeWords(input);
    const packWords = selectedPacks.flatMap((p) => samplePacks[p] || []);
    const combined = normalizeWords([...packWords, ...typed].join(" "));

    if (combined.length === 0) {
      alert("Please choose at least one unit or enter words.");
      return;
    }

    const randomized = ensureNoImmediateRepeats(shuffle(combined));
    setQueue(randomized);
    setCurrent(randomized[0]);
    setCleared([]);
    setAttempts(0);
    setCorrectCount(0);
    setMoodLevel(0);
    setPhase("play");
  };

    // Reinsert a word 2–4 positions later (or at end if queue is short)
  const reinsertLater = (q) => {
    if (q.length <= 1) return q;
    const delay = Math.min(q.length - 1, Math.max(2, Math.floor(Math.random() * 3) + 2)); // 2–4
    const [first, ...rest] = q;
    const idx = Math.min(delay, rest.length);
    return [...rest.slice(0, idx), first, ...rest.slice(idx)];
  };

  const advance = (wasCorrect) => {
    setAttempts((a) => a + 1);

    if (wasCorrect) {
      setCorrectCount((c) => c + 1);
      setMoodLevel((m) => Math.min(9, m + 1));
      setCleared((c) => [...c, current]);

      setQueue((q) => {
        const rest = q.slice(1);
        if (rest.length === 0) {
          setPhase("done");
          setCurrent(null);
          return [];
        }
        setCurrent(rest[0]);
        return rest;
      });
      return;
    }

    // Try Again → reinsert 2–4 cards later
    setMoodLevel((m) => Math.max(-3, m - 1));
    setQueue((q) => {
      const next = reinsertLater(q);
      setCurrent(next[0]);
      return next;
    });
  };

  const reset = () => {
    setPhase("setup");
    setInput("");
    setQueue([]);
    setCurrent(null);
    setCleared([]);
    setAttempts(0);
    setCorrectCount(0);
    setMoodLevel(0);
    setCelebrate(false);
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-stone-800 p-6 rounded-3xl">
        {phase === "setup" && (
          <div className="space-y-4">
            <h1 className="text-3xl font-bold text-center">Fundations Trick Words</h1>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={4}
              className="w-full p-3 rounded-xl bg-stone-900 border border-stone-700"
              placeholder="Optional: enter extra words"
            />
            <h2 className="font-bold">Choose Units</h2>
            <div className="flex gap-2">
              <button onClick={() => setSelectedPacks(Object.keys(samplePacks))} className="px-3 py-1 bg-stone-700 rounded">Select All</button>
              <button onClick={() => setSelectedPacks([])} className="px-3 py-1 bg-stone-700 rounded">Clear All</button>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {Object.keys(samplePacks).map((k) => (
                <label key={k} className="flex gap-2 items-center">
                  <input type="checkbox" checked={selectedPacks.includes(k)} onChange={(e) => setSelectedPacks((p) => e.target.checked ? [...p, k] : p.filter((x) => x !== k))} />
                  {k}
                </label>
              ))}
            </div>
            <button onClick={startGame} className="w-full py-3 bg-amber-500 text-black rounded-xl font-bold">Start</button>
            <div className="text-xs text-stone-500 text-center">Version {GAME_VERSION}</div>
          </div>
        )}

        {phase === "play" && current && (
          <div className="text-center space-y-4">
            <div className="text-6xl font-bold">{current}</div>
            <Smiley level={moodLevel} celebrating={celebrate} />
            <div className="flex gap-4 justify-center">
              <button onClick={() => advance(true)} className="px-6 py-3 bg-emerald-500 text-black rounded">Correct</button>
              <button onClick={() => advance(false)} className="px-6 py-3 bg-rose-500 text-black rounded">Try Again</button>
            </div>
          </div>
        )}

        {phase === "done" && (
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold">Finished! 🎉</h2>
            <p>Correct: {correctCount} / Attempts: {attempts}</p>
            <button onClick={reset} className="px-6 py-3 bg-stone-700 rounded">Play Again</button>
          </div>
        )}
      </div>
    </div>
  );
}
