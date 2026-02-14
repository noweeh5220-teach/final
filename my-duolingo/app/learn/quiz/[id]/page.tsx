"use client";

import { useState, useEffect, useCallback } from "react";
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
interface ConfettiPiece { 
  id: number; left: string; delay: string; duration: string; color: string; 
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
    // 기본 학습 모드
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

  // 기존 상태들 복구
  const [hearts, setHearts] = useState(25);
  const [currentQuestions, setCurrentQuestions] = useState<QuizQuestion[]>([]);
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState("");
  const [status, setStatus] = useState<"none" | "correct" | "wrong">("none");
  const [showHint, setShowHint] = useState(false);
  const [combo, setCombo] = useState(0);
  const [showSpecialCelebration, setShowSpecialCelebration] = useState(false);
  const [confettiPieces, setConfettiPieces] = useState<ConfettiPiece[]>([]);
  
  // 퀴즈 타입 전용 상태들
  const [scrambleAnswer, setScrambleAnswer] = useState<string[]>([]);
  const [matchStatus, setMatchStatus] = useState<{en: string, ko: string}>({en: "", ko: ""});
  const [solvedPairs, setSolvedPairs] = useState<string[]>([]);

  // 하트 로직 복구
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("duo_progress");
    if (saved) {
      const data = JSON.parse(saved);
      setHearts(data.hearts ?? 25);
    }
    const targetWords = getWordsByChapter(unitId, chapterId);
    setCurrentQuestions(generateQuestions(targetWords, words, mode));
  }, [unitId, chapterId, mode]);

  const updateProgress = (isCorrect: boolean) => {
    const saved = localStorage.getItem("duo_progress");
    if (!saved) return;
    const data = JSON.parse(saved);
    
    if (!isCorrect) {
      const newHearts = Math.max(0, data.hearts - 1);
      data.hearts = newHearts;
      if (!data.lastHeartTime) data.lastHeartTime = Date.now();
      setHearts(newHearts);
    }
    
    if (isCorrect && step === currentQuestions.length - 1) {
      if (unitId === data.unit && chapterId === data.chapter) {
        data.chapter += 1;
        if (data.chapter > 25) { data.unit += 1; data.chapter = 1; }
      }
      data.streak = (data.streak || 0) + 1;
      data.lastDate = new Date().toISOString().split('T')[0];
    }
    localStorage.setItem("duo_progress", JSON.stringify(data));
  };

  const handleCheck = () => {
    if (status !== "none") return;
    const currentQ = currentQuestions[step];
    let isCorrect = false;

    if (currentQ.type === "scramble") isCorrect = scrambleAnswer.join("") === currentQ.a;
    else if (currentQ.type === "matching") isCorrect = solvedPairs.length === 4;
    else if (currentQ.type === "input_word") isCorrect = selected.trim().toLowerCase() === currentQ.a.toLowerCase();
    else isCorrect = selected === currentQ.a;

    if (isCorrect) {
      setStatus("correct");
      const newCombo = combo + 1;
      setCombo(newCombo);
      if (newCombo % 5 === 0) {
        setConfettiPieces(Array.from({ length: 30 }).map((_, i) => ({ id: i, left: `${Math.random() * 100}%`, delay: `${Math.random() * 0.5}s`, duration: `${2}s`, color: ['#000', '#666', '#CCC'][i % 3] })));
        setShowSpecialCelebration(true);
      }
      updateProgress(true);
    } else {
      setStatus("wrong");
      setCombo(0);
      updateProgress(false);
    }
  };

  if (!mounted || currentQuestions.length === 0) return null;
  const currentQuestion = currentQuestions[step];
  const progress = ((step + 1) / currentQuestions.length) * 100;

  return (
    <div className="h-[100dvh] flex flex-col bg-white text-black select-none overflow-hidden font-sans">
      
      {/* 5초 콤보 팝업 (무채색 버전) */}
      {showSpecialCelebration && (
        <div className="fixed inset-0 z-[500] bg-white/95 flex flex-col items-center justify-center animate-[flash_0.3s]">
          <div className="scale-75 text-center animate-[combo-pop_0.5s_forwards]">
            <div className="text-5xl mb-2">🔥</div>
            <h1 className="text-3xl font-black italic">{combo} COMBO!</h1>
          </div>
          <div className="absolute inset-0 pointer-events-none">
            {confettiPieces.map((p) => (
              <div key={p.id} className="confetti" style={{ left: p.left, backgroundColor: p.color, animationDelay: p.delay, animationDuration: p.duration }} />
            ))}
          </div>
        </div>
      )}

      <header className="h-10 px-4 flex items-center gap-3 w-full max-w-md mx-auto">
        <Link href="/learn" className="text-gray-400 text-lg font-bold">✕</Link>
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-black transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="text-xs font-black">❤️ {hearts}</div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="mb-6 relative inline-block">
            {showHint && (
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-orange-500 text-xs font-black whitespace-nowrap animate-bounce">
                {currentQuestion.meaningHint}
              </div>
            )}
            <h1 
              onClick={() => mode === "learn" && setShowHint(!showHint)} 
              className={`text-2xl font-black leading-tight cursor-pointer transition-all ${mode === "learn" ? "text-[#1CB0F6] border-b-2 border-dotted border-[#1CB0F6]" : "text-black"}`}
            >
              {currentQuestion.q}
            </h1>
          </div>

          <div className="w-full">
            {currentQuestion.type === "matching" ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-2">
                  {currentQuestion.pairs?.map(p => (
                    <button key={p.en} onClick={() => setMatchStatus({...matchStatus, en: p.en})} disabled={solvedPairs.includes(p.en) || status !== "none"} className={`p-2 border-2 rounded-xl text-xs font-bold transition-all ${matchStatus.en === p.en ? "bg-black text-white border-black" : "bg-white border-gray-100"} ${solvedPairs.includes(p.en) ? "opacity-0 invisible" : ""}`}>{p.en}</button>
                  ))}
                </div>
                <div className="flex flex-col gap-2">
                  {currentQuestion.pairs?.slice().sort(() => idxSeed).map(p => (
                    <button key={p.ko} onClick={() => {
                      if(matchStatus.en && currentQuestion.pairs?.find(pair=>pair.en === matchStatus.en)?.ko === p.ko) {
                        setSolvedPairs([...solvedPairs, matchStatus.en]); setMatchStatus({en:"", ko:""});
                      }
                    }} disabled={solvedPairs.includes(currentQuestion.pairs?.find(pair=>pair.ko === p.ko)?.en || "") || status !== "none"} className="p-2 border-2 border-gray-100 rounded-xl text-xs font-bold transition-all active:bg-gray-50">{p.ko}</button>
                  ))}
                </div>
              </div>
            ) : currentQuestion.type === "scramble" ? (
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap justify-center gap-1 min-h-[40px] border-b-2 border-gray-100">{scrambleAnswer.map((l, i) => <span key={i} className="text-xl font-bold border-b-2 border-black px-1">{l}</span>)}</div>
                <div className="flex flex-wrap justify-center gap-2">{currentQuestion.letters?.map((l, i) => <button key={i} disabled={status !== "none"} onClick={() => setScrambleAnswer([...scrambleAnswer, l])} className="px-3 py-1.5 border-2 border-gray-100 rounded-xl font-bold text-sm hover:border-black transition-all">{l}</button>)}</div>
                <button onClick={() => setScrambleAnswer([])} disabled={status !== "none"} className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Reset</button>
              </div>
            ) : currentQuestion.type === "input_word" ? (
              <input type="text" value={selected} disabled={status !== "none"} onChange={(e) => setSelected(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCheck()} placeholder="정답을 입력하세요" className="w-full p-2 text-lg font-bold border-b-2 border-black outline-none text-center bg-transparent" />
            ) : (
              <div className="grid gap-2">{currentQuestion.options?.map((opt) => <button key={opt} disabled={status !== "none"} onClick={() => setSelected(opt)} className={`p-2.5 border-2 rounded-xl text-sm font-bold border-b-4 transition-all ${selected === opt ? "bg-black text-white border-black" : "bg-white border-gray-200 active:translate-y-0.5 active:border-b-0"} ${status === "correct" && opt === currentQuestion.a ? "!border-black !bg-black !text-white" : ""} ${status === "wrong" && selected === opt ? "!border-red-500 !bg-red-50 !text-red-500" : ""}`}>{opt}</button>)}</div>
            )}
          </div>
        </div>
      </main>

      <footer className={`p-4 border-t-2 transition-all ${status === "correct" ? "bg-gray-50 border-gray-200" : status === "wrong" ? "bg-red-50 border-red-100" : "bg-white border-gray-100"}`}>
        <div className="max-w-sm mx-auto flex flex-col gap-2">
          {status !== "none" && (
            <div className="mb-1 animate-[fadeIn_0.2s]">
              <h3 className={`text-sm font-black ${status === "correct" ? "text-black" : "text-red-600"}`}>{status === "correct" ? "정답입니다!" : "틀렸습니다"}</h3>
              {status === "wrong" && <p className="text-red-600 text-[11px] font-bold">정답: {currentQuestions[step].a}</p>}
            </div>
          )}
          <button 
            onClick={status === "none" ? handleCheck : (step < currentQuestions.length - 1 ? () => {setStep(step+1); setSelected(""); setScrambleAnswer([]); setSolvedPairs([]); setStatus("none"); setShowHint(false);} : () => router.push("/learn"))} 
            className={`w-full py-3 rounded-xl font-black text-sm shadow-[0_3px_0_rgba(0,0,0,0.1)] transition-all ${status === "none" ? (selected || scrambleAnswer.length > 0 || solvedPairs.length > 0 ? "bg-black text-white" : "bg-gray-100 text-gray-400 shadow-none") : (status === "correct" ? "bg-black text-white" : "bg-red-500 text-white")}`}
          >
            {status === "none" ? "확인하기" : "계속하기"}
          </button>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fall { 0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; } 100% { transform: translateY(110vh) rotate(720deg); opacity: 0; } }
        .confetti { position: absolute; width: 8px; height: 8px; top: -10px; border-radius: 2px; animation: fall linear forwards; }
        @keyframes combo-pop { 0% { transform: scale(0.5); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
      `}} />
    </div>
  );
}
// 정렬 셔플을 위한 임시 변수
const idxSeed = Math.random() - 0.5;