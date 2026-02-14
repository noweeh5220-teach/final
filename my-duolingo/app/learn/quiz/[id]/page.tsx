"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { words, getWordsByChapter, Word } from "../../quiz/words";

type QuestionType = "choice_meaning" | "choice_word" | "input_word" | "scramble" | "matching";

interface QuizQuestion { 
  id: number; 
  type: QuestionType; 
  q: string; 
  a: string; 
  options?: string[]; 
  meaningHint?: string; 
  letters?: string[];
  pairs?: { en: string; ko: string }[];
}

// 🎯 챕터 규칙에 따른 질문 생성기
function generateQuestions(unitId: number, chapterId: number): QuizQuestion[] {
  let targetWords: Word[] = [];
  
  // 1. 단어 추출 로직 적용
  if (chapterId % 5 === 0) {
    // 5, 10, 15... 챕터: 유닛 내 1챕터부터 현재까지 누적 복습
    for (let i = 1; i <= chapterId; i++) {
      targetWords = [...targetWords, ...getWordsByChapter(unitId, i)];
    }
    targetWords = targetWords.sort(() => Math.random() - 0.5).slice(0, 15);
  } 
  else if (chapterId % 2 === 0) {
    // 2, 4, 6... 챕터: 직전 챕터(홀수) 단어 다시 테스트
    targetWords = getWordsByChapter(unitId, chapterId - 1);
  } 
  else {
    // 1, 3, 7... 챕터: 이번 챕터 새로운 단어 학습
    targetWords = getWordsByChapter(unitId, chapterId);
  }

  // 2. 질문 객체 변환 (테스트/복습 모드 여부 판단)
  const isTestMode = (chapterId % 2 === 0 || chapterId % 5 === 0);

  return targetWords.map((word) => {
    const commonProps = { meaningHint: word.meaning };
    const others = words.filter((w) => w.word !== word.word).sort(() => Math.random() - 0.5);
    
    if (isTestMode) {
      const typeSeed = Math.random() * 3;
      if (typeSeed < 1) {
        return { 
          ...commonProps, 
          id: word.id, 
          type: "scramble", 
          q: word.meaning, 
          a: word.word, 
          letters: word.word.split("").sort(() => Math.random() - 0.5) 
        };
      }
      if (typeSeed < 2) {
        const matchSet = [word, ...others.slice(0, 3)].sort(() => Math.random() - 0.5);
        return { 
          ...commonProps, 
          id: word.id, 
          type: "matching", 
          q: "알맞은 짝을 찾으세요", 
          a: "done", 
          pairs: matchSet.map(w => ({ en: w.word, ko: w.meaning })) 
        };
      }
      return { ...commonProps, id: word.id, type: "input_word", q: word.meaning, a: word.word.toLowerCase() };
    }
    
    return { 
      ...commonProps, 
      id: word.id, 
      type: "choice_meaning", 
      q: word.word, 
      a: word.meaning, 
      options: [word.meaning, ...others.slice(0, 3).map(o => o.meaning)].sort(() => Math.random() - 0.5) 
    };
  });
}

export default function QuizPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const unitId = Number(params.id) || 1;
  const chapterId = Number(searchParams.get("chapter")) || 1; 

  const [hearts, setHearts] = useState(25);
  const [quizQueue, setQuizQueue] = useState<QuizQuestion[]>([]);
  const [step, setStep] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [selected, setSelected] = useState("");
  const [status, setStatus] = useState<"none" | "correct" | "wrong">("none");
  const [scrambleAnswer, setScrambleAnswer] = useState<string[]>([]);
  const [matchSelection, setMatchSelection] = useState<{ en: string; ko: string }>({ en: "", ko: "" });
  const [solvedPairs, setSolvedPairs] = useState<string[]>([]);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("duo_progress");
    if (saved) setHearts(JSON.parse(saved).hearts ?? 25);
    setQuizQueue(generateQuestions(unitId, chapterId));
  }, [unitId, chapterId]);

  const updateHeartsInStorage = (newHearts: number) => {
    const saved = localStorage.getItem("duo_progress");
    if (!saved) return;
    const data = JSON.parse(saved);
    data.hearts = newHearts;
    if (newHearts < 25 && !data.lastHeartTime) data.lastHeartTime = Date.now();
    localStorage.setItem("duo_progress", JSON.stringify(data));
    setHearts(newHearts);
  };

  const handleMatchClick = (type: 'en' | 'ko', value: string) => {
    if (status !== "none") return;
    const newSelection = { ...matchSelection, [type]: value };
    setMatchSelection(newSelection);

    if (newSelection.en && newSelection.ko) {
      const currentQ = quizQueue[step];
      const correctPair = currentQ.pairs?.find(p => p.en === newSelection.en);
      if (correctPair && correctPair.ko === newSelection.ko) {
        setSolvedPairs(prev => [...prev, newSelection.en]);
        setMatchSelection({ en: "", ko: "" });
      } else {
        setTimeout(() => setMatchSelection({ en: "", ko: "" }), 300);
      }
    }
  };

  const handleCheck = () => {
    if (status !== "none") return;
    const currentQ = quizQueue[step];
    let isCorrect = false;

    if (currentQ.type === "scramble") isCorrect = scrambleAnswer.join("") === currentQ.a;
    else if (currentQ.type === "matching") isCorrect = solvedPairs.length === 4;
    else if (currentQ.type === "input_word") isCorrect = selected.trim().toLowerCase() === currentQ.a.toLowerCase();
    else isCorrect = selected === currentQ.a;

    if (isCorrect) {
      setStatus("correct");
    } else {
      setStatus("wrong");
      setQuizQueue(prev => [...prev, currentQ]);
    }
  };

  const nextStep = () => {
    if (status === "wrong") updateHeartsInStorage(Math.max(0, hearts - 1));
    if (step < quizQueue.length - 1) {
      setStep(step + 1);
      setSelected("");
      setScrambleAnswer([]);
      setSolvedPairs([]);
      setMatchSelection({ en: "", ko: "" });
      setStatus("none");
    } else {
      router.push("/learn");
    }
  };

  if (!mounted || quizQueue.length === 0) return null;
  const currentQuestion = quizQueue[step];
  const progress = (step / quizQueue.length) * 100;

  return (
    <div className="h-[100dvh] flex flex-col bg-white text-black select-none overflow-hidden font-sans">
      <header className="h-12 px-4 flex items-center gap-3 w-full max-w-md mx-auto">
        <Link href="/learn" className="text-gray-300 font-bold">✕</Link>
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-black transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <div className={`text-xs font-black ${status === 'wrong' ? 'animate-shake text-red-500' : ''}`}>❤️ {hearts}</div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-3xl font-black mb-8">{currentQuestion.q}</h1>

          <div className="w-full min-h-[250px] flex flex-col justify-center">
            {currentQuestion.type === "matching" ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  {currentQuestion.pairs?.map(p => (
                    <button key={p.en} onClick={() => handleMatchClick('en', p.en)} disabled={solvedPairs.includes(p.en) || status !== "none"} className={`p-3 border-2 rounded-2xl text-[13px] font-black transition-all ${solvedPairs.includes(p.en) ? "opacity-0 invisible" : (matchSelection.en === p.en ? "bg-black text-white border-black" : "bg-white border-gray-100")}`}>{p.en}</button>
                  ))}
                </div>
                <div className="flex flex-col gap-2">
                  {currentQuestion.pairs?.slice().sort((a,b) => a.ko.localeCompare(b.ko)).map(p => (
                    <button key={p.ko} onClick={() => handleMatchClick('ko', p.ko)} disabled={solvedPairs.includes(currentQuestion.pairs?.find(pair=>pair.ko === p.ko)?.en || "") || status !== "none"} className={`p-3 border-2 rounded-2xl text-[13px] font-black transition-all ${solvedPairs.includes(currentQuestion.pairs?.find(pair=>pair.ko === p.ko)?.en || "") ? "opacity-0 invisible" : (matchSelection.ko === p.ko ? "bg-black text-white border-black" : "bg-white border-gray-100")}`}>{p.ko}</button>
                  ))}
                </div>
              </div>
            ) : currentQuestion.type === "scramble" ? (
              <div className="flex flex-col gap-6 w-full">
                <div className="flex flex-wrap justify-center gap-1.5 min-h-[60px] border-b-2 border-gray-100 mb-2 relative group">
                  {scrambleAnswer.map((l, i) => (
                    <span key={i} className="text-2xl font-black border-b-4 border-black px-1 animate-[pop_0.2s_ease-out]">{l}</span>
                  ))}
                  {scrambleAnswer.length > 0 && status === "none" && (
                    <button onClick={() => setScrambleAnswer(prev => prev.slice(0, -1))} className="absolute -right-2 bottom-2 text-gray-400 hover:text-black transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path><line x1="18" y1="9" x2="12" y2="15"></line><line x1="12" y1="9" x2="18" y2="15"></line></svg>
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {currentQuestion.letters?.map((l, i) => (
                    <button key={i} disabled={status !== "none"} onClick={() => setScrambleAnswer([...scrambleAnswer, l])} className="px-4 py-2 border-2 border-gray-100 rounded-2xl font-black shadow-[0_4px_0_#E5E5E5] active:translate-y-1 active:shadow-none transition-all hover:bg-gray