"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { words, getWordsByChapter, Word } from "../../words"; // 경로를 프로젝트 구조에 맞게 확인하세요

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

// 🎯 질문 생성 로직 (학습/테스트/복습 모드 반영)
function generateQuestions(unitId: number, chapterId: number): QuizQuestion[] {
  let targetWords: Word[] = [];
  
  if (chapterId % 5 === 0) {
    for (let i = 1; i <= chapterId; i++) {
      targetWords = [...targetWords, ...getWordsByChapter(unitId, i)];
    }
    targetWords = targetWords.sort(() => Math.random() - 0.5).slice(0, 15);
  } else if (chapterId % 2 === 0) {
    targetWords = getWordsByChapter(unitId, chapterId - 1);
  } else {
    targetWords = getWordsByChapter(unitId, chapterId);
  }

  const isTestMode = (chapterId % 2 === 0 || chapterId % 5 === 0);

  return targetWords.map((word) => {
    const common = { meaningHint: word.meaning, id: word.id };
    const others = words.filter((w) => w.word !== word.word).sort(() => Math.random() - 0.5);
    
    if (isTestMode) {
      const typeSeed = Math.random() * 3;
      if (typeSeed < 1) {
        return { ...common, type: "scramble", q: word.meaning, a: word.word, letters: word.word.split("").sort(() => Math.random() - 0.5) };
      }
      if (typeSeed < 2) {
        const matchSet = [word, ...others.slice(0, 3)].sort(() => Math.random() - 0.5);
        return { ...common, type: "matching", q: "알맞은 짝을 찾으세요", a: "done", pairs: matchSet.map(w => ({ en: w.word, ko: w.meaning })) };
      }
      return { ...common, type: "input_word", q: word.meaning, a: word.word.toLowerCase() };
    }
    
    return { ...common, type: "choice_meaning", q: word.word, a: word.meaning, options: [word.meaning, ...others.slice(0, 3).map(o => o.meaning)].sort(() => Math.random() - 0.5) };
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
  const [matchSelection, setMatchSelection] = useState({ en: "", ko: "" });
  const [solvedPairs, setSolvedPairs] = useState<string[]>([]);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("duo_progress");
    if (saved) setHearts(JSON.parse(saved).hearts ?? 25);
    setQuizQueue(generateQuestions(unitId, chapterId));
  }, [unitId, chapterId]);

  // 💖 하트 차감 및 게임오버 처리
  const handleWrongAnswer = () => {
    const saved = localStorage.getItem("duo_progress");
    if (!saved) return;
    const data = JSON.parse(saved);
    
    const newHearts = Math.max(0, data.hearts - 1);
    data.hearts = newHearts;
    
    if (newHearts < 25 && !data.lastHeartTime) {
      data.lastHeartTime = Date.now();
    }
    
    localStorage.setItem("duo_progress", JSON.stringify(data));
    setHearts(newHearts);

    if (newHearts <= 0) {
      alert("하트가 모두 소진되었습니다! 10분마다 1개씩 충전됩니다.");
      router.push("/learn");
    }
  };

  // 🔥 스트릭 상승 및 진도 저장
  const handleFinish = () => {
    const saved = localStorage.getItem("duo_progress");
    if (!saved) return;
    const data = JSON.parse(saved);

    // 진도 업데이트
    if (unitId === data.unit && chapterId === data.chapter) {
      data.chapter += 1;
    }

    // 스트릭 업데이트 (하루 한 번)
    const today = new Date().toISOString().split('T')[0];
    if (data.lastStudyDate !== today) {
      data.streak = (data.streak || 0) + 1;
      data.lastStudyDate = today;
    }

    localStorage.setItem("duo_progress", JSON.stringify(data));
    router.push("/learn");
  };

  const handleCheck = () => {
    if (status !== "none") return;
    const cur = quizQueue[step];
    let isCorrect = false;

    if (cur.type === "scramble") isCorrect = scrambleAnswer.join("") === cur.a;
    else if (cur.type === "matching") isCorrect = solvedPairs.length === 4;
    else if (cur.type === "input_word") isCorrect = selected.trim().toLowerCase() === cur.a.toLowerCase();
    else isCorrect = selected === cur.a;

    if (isCorrect) {
      setStatus("correct");
    } else {
      setStatus("wrong");
      handleWrongAnswer();
      setQuizQueue(prev => [...prev, cur]); // 틀린 문제 복습 위해 맨 뒤로
    }
  };

  const nextStep = () => {
    if (step < quizQueue.length - 1) {
      setStep(step + 1);
      setSelected(""); 
      setScrambleAnswer([]); 
      setSolvedPairs([]); 
      setMatchSelection({ en: "", ko: "" }); 
      setStatus("none");
    } else {
      handleFinish();
    }
  };

  if (!mounted || quizQueue.length === 0) return null;
  const currentQ = quizQueue[step];
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
          <h1 className="text-2xl font-black mb-8">{currentQ.q}</h1>
          <div className="min-h-[250px] flex flex-col justify-center">
            {currentQ.type === "matching" ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-2">
                  {currentQ.pairs?.map(p => (
                    <button key={p.en} onClick={() => setMatchSelection(prev => ({...prev, en: p.en}))} className={`p-3 border-2 rounded-xl text-xs font-bold ${solvedPairs.includes(p.en) ? "opacity-0" : matchSelection.en === p.en ? "bg-black text-white" : "bg-white"}`}>{p.en}</button>
                  ))}
                </div>
                <div className="flex flex-col gap-2">
                  {currentQ.pairs?.map(p => (
                    <button key={p.ko} onClick={() => setMatchSelection(prev => ({...prev, ko: p.ko}))} className={`p-3 border-2 rounded-xl text-xs font-bold ${solvedPairs.includes(currentQ.pairs?.find(x=>x.ko===p.ko)?.en||"") ? "opacity-0" : matchSelection.ko === p.ko ? "bg-black text-white" : "bg-white"}`}>{p.ko}</button>
                  ))}
                </div>
              </div>
            ) : currentQ.type === "scramble" ? (
              <div className="flex flex-col gap-6">
                <div className="flex flex-wrap justify-center gap-1.5 min-h-[50px] border-b-2 relative">
                  {scrambleAnswer.map((l, i) => <span key={i} className="text-2xl font-black border-b-4 border-black px-1">{l}</span>)}
                  {scrambleAnswer.length > 0 && status === "none" && (
                    <button onClick={() => setScrambleAnswer(p => p.slice(0, -1))} className="absolute -right-6 bottom-1 text-gray-400">✕</button>
                  )}
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {currentQ.letters?.map((l, i) => (
                    <button key={i} disabled={status !== "none"} onClick={() => setScrambleAnswer([...scrambleAnswer, l])} className="px-4 py-2 border-2 rounded-2xl font-black shadow-[0_4px_0_#E5E5E5] active:translate-y-1 active:shadow-none transition-all">{l}</button>
                  ))}
                </div>
                <button onClick={() => setScrambleAnswer([])} className="text-[10px] text-gray-400 font-bold uppercase">Reset</button>
              </div>
            ) : (
              <div className="grid gap-2">
                {currentQ.options?.map(o => (
                  <button key={o} disabled={status !== "none"} onClick={() => setSelected(o)} className={`p-4 border-2 rounded-2xl font-black border-b-4 transition-all ${selected === o ? "bg-black text-white border-black" : "bg-white border-gray-100"}`}>{o}</button>
                ))}
                {currentQ.type === "input_word" && (
                  <input autoFocus value={selected} disabled={status !== "none"} onChange={e => setSelected(e.target.value)} placeholder="영단어 입력" className="p-2 text-center text-xl font-black border-b-4 border-black outline-none" />
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className={`p-6 border-t-2 ${status === "correct" ? "bg-green-50" : status === "wrong" ? "bg-red-50" : "bg-white"}`}>
        <div className="max-w-sm mx-auto">
          {status !== "none" && (
            <div className="mb-4">
              <h3 className={`font-black ${status === "correct" ? "text-green-600" : "text-red-600"}`}>{status === "correct" ? "참 잘했어요!" : `정답: ${currentQ.a}`}</h3>
            </div>
          )}
          <button onClick={status === "none" ? handleCheck : nextStep} className={`w-full py-4 rounded-2xl font-black transition-all ${status === "none" ? (selected || scrambleAnswer.length > 0 ? "bg-black text-white" : "bg-gray-100 text-gray-400") : (status === "correct" ? "bg-green-500 text-white" : "bg-red-500 text-white")}`}>
            {status === "none" ? "확인" : "계속하기"}
          </button>
        </div>
      </footer>
      <style jsx>{`
        @keyframes shake { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(5px); } }
        .animate-shake { animation: shake 0.2s ease-in-out 2; }
      `}</style>
    </div>
  );
}