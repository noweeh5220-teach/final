"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { words, getWordsByChapter, Word } from "../../quiz/words";

// --- 타입 정의 ---
type QuestionType = "choice_meaning" | "choice_word" | "input_word";
interface QuizQuestion { 
  id: number; 
  type: QuestionType; 
  q: string; 
  a: string; 
  options?: string[]; 
  meaningHint?: string; 
}
interface ConfettiPiece { 
  id: number; 
  left: string; 
  delay: string; 
  duration: string; 
  color: string; 
}

function generateQuestions(unitWords: Word[], allWords: Word[], isFirstChapter: boolean): QuizQuestion[] {
  let lastType: QuestionType | null = null;
  return unitWords.map((word) => {
    const commonProps = { meaningHint: word.meaning };
    const others = [...allWords].filter((w) => w.id !== word.id).sort(() => Math.random() - 0.5).slice(0, 3);
    
    if (isFirstChapter) {
      return { ...commonProps, id: word.id, type: "choice_meaning", q: word.word, a: word.meaning, options: [word.meaning, ...others.map(o => o.meaning)].sort(() => Math.random() - 0.5) };
    }
    const types: QuestionType[] = ["choice_meaning", "choice_word", "input_word"];
    const availableTypes = lastType ? types.filter(t => t !== lastType) : types;
    const randomType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    lastType = randomType;
    
    if (randomType === "choice_meaning") return { ...commonProps, id: word.id, type: "choice_meaning", q: word.word, a: word.meaning, options: [word.meaning, ...others.map(o => o.meaning)].sort(() => Math.random() - 0.5) };
    if (randomType === "choice_word") return { ...commonProps, id: word.id, type: "choice_word", q: word.meaning, a: word.word, options: [word.word, ...others.map(o => o.word)].sort(() => Math.random() - 0.5) };
    return { ...commonProps, id: word.id, type: "input_word", q: word.meaning, a: word.word.toLowerCase() };
  });
}

export default function QuizPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const unitId = Number(params.id) || 1;
  const chapterId = Number(searchParams.get("chapter")) || 1; 
  const mode = searchParams.get("mode") || "learn";
  const isLearningMode = mode === "learn";

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

  useEffect(() => {
    setMounted(true);
    const targetWords = getWordsByChapter(unitId, chapterId);
    setCurrentQuestions(generateQuestions(targetWords, words, isLearningMode));
  }, [unitId, chapterId, isLearningMode]);

  useEffect(() => {
    if (showSpecialCelebration) {
      const timer = setTimeout(() => setShowSpecialCelebration(false), 5000); 
      return () => clearTimeout(timer);
    }
  }, [showSpecialCelebration]);

  const handleCheck = () => {
    if (!selected.trim() || status !== "none") return;
    setShowHint(false);
    const currentQ = currentQuestions[step];
    const isCorrect = currentQ.type === "input_word" ? selected.trim().toLowerCase() === currentQ.a.toLowerCase() : selected === currentQ.a;

    if (isCorrect) {
      setStatus("correct");
      const newCombo = combo + 1;
      setCombo(newCombo);
      if (newCombo % 5 === 0) {
        setConfettiPieces(Array.from({ length: 30 }).map((_, i) => ({ id: i, left: `${Math.random() * 100}%`, delay: `${Math.random() * 0.5}s`, duration: `${2}s`, color: ['#58CC02', '#1CB0F6', '#FFC800'][i % 3] })));
        setShowSpecialCelebration(true);
      }
    } else {
      setStatus("wrong");
      setCombo(0);
      setHearts(prev => Math.max(0, prev - 1));
    }
  };

  if (!mounted || currentQuestions.length === 0) return null;
  const currentQuestion = currentQuestions[step];
  const progress = ((step + 1) / currentQuestions.length) * 100;

  return (
    <div className="h-[100dvh] flex flex-col bg-white overflow-hidden select-none text-[#4B4B4B]">
      
      {/* 5초 콤보 팝업 */}
      {showSpecialCelebration && (
        <div className="fixed inset-0 z-[500] bg-white/90 flex flex-col items-center justify-center animate-[flash_0.3s]">
          <div className="scale-75 text-center animate-[combo-pop_0.5s_forwards]">
            <div className="text-5xl mb-2">🔥</div>
            <h1 className="text-2xl font-black text-orange-500 italic">{combo} COMBO!</h1>
          </div>
          <div className="absolute inset-0 pointer-events-none">
            {confettiPieces.map((p) => (
              <div key={p.id} className="confetti" style={{ left: p.left, backgroundColor: p.color, animationDelay: p.delay, animationDuration: p.duration }} />
            ))}
          </div>
        </div>
      )}

      {/* 헤더 */}
      <header className="h-10 px-4 flex items-center gap-3 w-full max-w-md mx-auto">
        <Link href="/learn" className="text-gray-400 text-lg font-bold">✕</Link>
        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-[#58CC02] transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="text-red-500 font-bold text-xs">❤️ {hearts}</div>
      </header>

      {/* 메인 퀴즈 영역 */}
      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="mb-4 relative inline-block">
            {/* ✅ 주황색 텍스트 힌트 (말풍선 배경 제거 버전) */}
            {showHint && (
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-orange-500 text-sm font-black whitespace-nowrap animate-[hint-fade_0.3s_ease-out]">
                {currentQuestion.meaningHint}
              </div>
            )}
            
            <h1 
              onClick={() => isLearningMode && setShowHint(!showHint)} 
              className={`text-2xl font-black leading-tight transition-all cursor-pointer ${isLearningMode ? "text-[#1CB0F6] border-b-2 border-dotted border-[#1CB0F6]" : ""}`}
            >
              {currentQuestion?.q}
            </h1>
          </div>

          <div className="grid gap-2 w-full">
            {currentQuestion?.type === "input_word" ? (
              <input type="text" value={selected} disabled={status !== "none"} onChange={(e) => setSelected(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCheck()} placeholder="정답 입력" className="w-full p-2.5 text-lg font-bold border-2 rounded-xl outline-none text-center bg-gray-50 border-gray-200" />
            ) : (
              currentQuestion?.options?.map((opt) => (
                <button 
                  key={opt} 
                  disabled={status !== "none"} 
                  onClick={() => { setSelected(opt); setShowHint(false); }} 
                  className={`p-2 border-2 rounded-xl text-sm font-bold border-b-4 transition-all ${selected === opt ? "border-[#84D8FF] bg-[#E5F3FF] text-[#1CB0F6]" : "border-gray-200 active:translate-y-0.5 active:border-b-0"} ${status === "correct" && opt === currentQuestion.a ? "!border-[#B8F28B] !bg-[#D7FFB8] !text-[#58A700]" : ""} ${status === "wrong" && selected === opt ? "!border-[#FFC1C1] !bg-[#FFF1F1] !text-[#EA2B2B]" : ""}`}
                >
                  {opt}
                </button>
              ))
            )}
          </div>
        </div>
      </main>

      {/* 푸터 */}
      <footer className={`p-3 border-t-2 transition-colors ${status === "correct" ? "bg-[#D7FFB8] border-[#B8F28B]" : status === "wrong" ? "bg-[#FFDFE0] border-[#FFC1C1]" : "bg-white border-gray-100"}`}>
        <div className="max-w-sm mx-auto flex flex-col gap-1.5">
          {status !== "none" && (
            <div className="px-1">
              <h3 className={`text-sm font-black ${status === "correct" ? "text-[#58A700]" : "text-[#EA2B2B]"}`}>{status === "correct" ? "정답입니다!" : "아쉬워요!"}</h3>
              {status === "wrong" && <p className="text-[#EA2B2B] text-[11px] font-bold">정답: {currentQuestion.a}</p>}
            </div>
          )}
          <button 
            onClick={status === "none" ? handleCheck : (step < currentQuestions.length - 1 ? () => {setStep(step+1); setSelected(""); setStatus("none");} : () => router.push("/learn"))} 
            disabled={status === "none" && !selected.trim()} 
            className={`w-full py-2.5 rounded-xl font-black text-white text-sm shadow-[0_3px_0_rgba(0,0,0,0.15)] active:shadow-none active:translate-y-0.5 transition-all ${status === "none" ? (selected.trim() ? "bg-[#58CC02]" : "bg-[#E5E5E5] text-[#AFAFAF] shadow-none") : (status === "correct" ? "bg-[#58CC02]" : "bg-[#FF4B4B]")}`}
          >
            {status === "none" ? "확인하기" : "계속하기"}
          </button>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fall { 0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; } 100% { transform: translateY(110vh) rotate(720deg); opacity: 0; } }
        .confetti { position: absolute; width: 8px; height: 8px; top: -10px; border-radius: 2px; animation: fall linear forwards; }
        @keyframes combo-pop { 0% { transform: scale(0.5); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes hint-fade { 0% { opacity: 0; transform: translate(-50%, 5px); } 100% { opacity: 1; transform: translate(-50%, 0); } }
      `}} />
    </div>
  );
}