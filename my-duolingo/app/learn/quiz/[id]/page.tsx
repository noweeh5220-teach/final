"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { words, getWordsByChapter, Word } from "../../quiz/words";

// --- 타입 정의 ---
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

function generateQuestions(unitWords: Word[], allWords: Word[], mode: string): QuizQuestion[] {
  return unitWords.map((word, idx) => {
    const commonProps = { meaningHint: word.meaning };
    const others = [...allWords].filter((w) => w.id !== word.id).sort(() => Math.random() - 0.5);
    
    if (mode === "test" || mode === "review") {
      const typeSeed = (idx + Math.random()) % 3;
      if (typeSeed < 1) return { ...commonProps, id: word.id, type: "scramble", q: word.meaning, a: word.word, letters: word.word.split("").sort(() => Math.random() - 0.5) };
      if (typeSeed < 2) {
        const matchSet = [word, ...others.slice(0, 3)].sort(() => Math.random() - 0.5);
        return { ...commonProps, id: word.id, type: "matching", q: "알맞은 짝을 찾으세요", a: "done", pairs: matchSet.map(w => ({ en: w.word, ko: w.meaning })) };
      }
      return { ...commonProps, id: word.id, type: "input_word", q: word.meaning, a: word.word.toLowerCase() };
    }
    return { ...commonProps, id: word.id, type: "choice_meaning", q: word.word, a: word.meaning, options: [word.meaning, ...others.slice(0, 3).map(o => o.meaning)].sort(() => Math.random() - 0.5) };
  });
}

export default function QuizPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const unitId = Number(params.id) || 1;
  const chapterId = Number(searchParams.get("chapter")) || 1; 
  const mode = searchParams.get("mode") || "learn";

  const [hearts, setHearts] = useState(25);
  const [quizQueue, setQuizQueue] = useState<QuizQuestion[]>([]); // 큐 방식으로 관리
  const [step, setStep] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [selected, setSelected] = useState("");
  const [status, setStatus] = useState<"none" | "correct" | "wrong">("none");
  const [showHint, setShowHint] = useState(false);
  const [combo, setCombo] = useState(0);
  const [scrambleAnswer, setScrambleAnswer] = useState<string[]>([]);
  const [matchStatus, setMatchStatus] = useState<{en: string, ko: string}>({en: "", ko: ""});
  const [solvedPairs, setSolvedPairs] = useState<string[]>([]);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("duo_progress");
    if (saved) setHearts(JSON.parse(saved).hearts ?? 25);
    
    const targetWords = getWordsByChapter(unitId, chapterId);
    setQuizQueue(generateQuestions(targetWords, words, mode));
  }, [unitId, chapterId, mode]);

  const updateHeartsInStorage = (newHearts: number) => {
    const saved = localStorage.getItem("duo_progress");
    if (!saved) return;
    const data = JSON.parse(saved);
    data.hearts = newHearts;
    if (newHearts < 25 && !data.lastHeartTime) data.lastHeartTime = Date.now();
    localStorage.setItem("duo_progress", JSON.stringify(data));
    setHearts(newHearts);
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
      setCombo(prev => prev + 1);
    } else {
      setStatus("wrong");
      setCombo(0);
      // ✅ 오답 시 해당 문제를 큐의 맨 뒤에 추가 (다시 풀게 함)
      setQuizQueue(prev => [...prev, currentQ]);
    }
  };

  const nextStep = () => {
    // ✅ "한 문제(Step)"가 끝날 때 하트 차감 로직
    if (status === "wrong") {
      updateHeartsInStorage(Math.max(0, hearts - 1));
    }

    if (step < quizQueue.length - 1) {
      setStep(step + 1);
      setSelected("");
      setScrambleAnswer([]);
      setSolvedPairs([]);
      setStatus("none");
      setShowHint(false);
    } else {
      // 모든 퀴즈 완료 시 (오답까지 다 맞췄을 때)
      router.push("/learn");
    }
  };

  if (!mounted || quizQueue.length === 0) return null;
  const currentQuestion = quizQueue[step];
  // 진행도는 '원래 문제 수' 대비 '맞춘 문제 수'로 계산하는 게 좋지만, 
  // 여기서는 단순하게 현재 위치로 표시
  const progress = (step / quizQueue.length) * 100;

  return (
    <div className="h-[100dvh] flex flex-col bg-white text-black select-none overflow-hidden">
      <header className="h-12 px-4 flex items-center gap-3 w-full max-w-md mx-auto">
        <Link href="/learn" className="text-gray-300 font-bold">✕</Link>
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-black transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <div className={`text-xs font-black transition-transform ${status === 'wrong' ? 'animate-shake text-red-500' : ''}`}>❤️ {hearts}</div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="mb-8 relative inline-block">
            {showHint && (
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-orange-500 text-[10px] font-black animate-bounce uppercase">
                {currentQuestion.meaningHint}
              </div>
            )}
            <h1 
              onClick={() => mode === "learn" && setShowHint(!showHint)} 
              className={`text-3xl font-black transition-all ${mode === "learn" ? "text-[#1CB0F6] border-b-2 border-dotted border-[#1CB0F6] cursor-pointer" : "text-black"}`}
            >
              {currentQuestion.q}
            </h1>
          </div>

          <div className="w-full min-h-[200px] flex flex-col justify-center">
            {currentQuestion.type === "scramble" ? (
              <div className="flex flex-col gap-6">
                <div className="flex flex-wrap justify-center gap-1.5 min-h-[50px] border-b-2 border-gray-100">
                  {scrambleAnswer.map((l, i) => <span key={i} className="text-2xl font-black border-b-4 border-black px-1.5 animate-[pop_0.2s_ease-out]">{l}</span>)}
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {currentQuestion.letters?.map((l, i) => (
                    <button key={i} disabled={status !== "none"} onClick={() => setScrambleAnswer([...scrambleAnswer, l])} className="px-4 py-2 border-2 border-gray-100 rounded-2xl font-black shadow-[0_4px_0_#E5E5E5] active:translate-y-1 active:shadow-none active:scale-90 transition-all">{l}</button>
                  ))}
                </div>
              </div>
            ) : currentQuestion.type === "matching" ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  {currentQuestion.pairs?.map(p => (
                    <button key={p.en} onClick={() => setMatchStatus({...matchStatus, en: p.en})} disabled={solvedPairs.includes(p.en) || status !== "none"} className={`p-3 border-2 rounded-2xl text-xs font-black ${matchStatus.en === p.en ? "bg-black text-white" : "bg-white border-gray-100"} ${solvedPairs.includes(p.en) ? "opacity-0" : ""}`}>{p.en}</button>
                  ))}
                </div>
                <div className="flex flex-col gap-2">
                  {currentQuestion.pairs?.slice().sort(() => 0.5 - Math.random()).map(p => (
                    <button key={p.ko} onClick={() => {
                      if(matchStatus.en && currentQuestion.pairs?.find(pair=>pair.en === matchStatus.en)?.ko === p.ko) {
                        setSolvedPairs([...solvedPairs, matchStatus.en]); setMatchStatus({en:"", ko:""});
                      }
                    }} disabled={solvedPairs.includes(currentQuestion.pairs?.find(pair=>pair.ko === p.ko)?.en || "") || status !== "none"} className="p-3 border-2 border-gray-100 rounded-2xl text-xs font-black active:scale-95 transition-all">{p.ko}</button>
                  ))}
                </div>
              </div>
            ) : currentQuestion.type === "input_word" ? (
              <input type="text" value={selected} disabled={status !== "none"} onChange={(e) => setSelected(e.target.value)} placeholder="Type in English" className="w-full p-2 text-xl font-black border-b-4 border-black outline-none text-center bg-transparent" />
            ) : (
              <div className="grid gap-3">
                {currentQuestion.options?.map((opt) => (
                  <button key={opt} disabled={status !== "none"} onClick={() => setSelected(opt)} className={`p-4 border-2 rounded-2xl text-base font-black border-b-4 transition-all ${selected === opt ? "bg-black text-white border-black" : "bg-white border-gray-100"} ${status === "correct" && opt === currentQuestion.a ? "!bg-black !text-white" : ""} ${status === "wrong" && selected === opt ? "!bg-red-50 !border-red-500 !text-red-500" : ""}`}>{opt}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className={`p-6 border-t-2 transition-all ${status === "correct" ? "bg-gray-50" : status === "wrong" ? "bg-red-50" : "bg-white"}`}>
        <div className="max-w-sm mx-auto">
          {status !== "none" && (
            <div className="mb-4 animate-[pop_0.3s]">
              <h3 className={`text-lg font-black ${status === "correct" ? "text-black" : "text-red-600"}`}>{status === "correct" ? "Excellent!" : "Correct Answer:"}</h3>
              {status === "wrong" && <p className="text-red-600 font-bold">{currentQuestion.a}</p>}
            </div>
          )}
          <button 
            onClick={status === "none" ? handleCheck : nextStep} 
            className={`w-full py-4 rounded-2xl font-black text-base shadow-[0_4px_0_rgba(0,0,0,0.1)] active:translate-y-1 active:shadow-none transition-all ${status === "none" ? (selected || scrambleAnswer.length > 0 || solvedPairs.length > 0 ? "bg-black text-white" : "bg-gray-100 text-gray-400 shadow-none") : (status === "correct" ? "bg-black text-white" : "bg-red-500 text-white")}`}
          >
            {status === "none" ? "CHECK" : "CONTINUE"}
          </button>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pop { 0% { transform: scale(0.9); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}} />
    </div>
  );
}