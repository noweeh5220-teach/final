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
}
interface ConfettiPiece { 
  id: number; 
  left: string; 
  delay: string; 
  duration: string; 
  color: string; 
}

// --- 문제 생성 함수 ---
function generateQuestions(unitWords: Word[], allWords: Word[], isFirstChapter: boolean): QuizQuestion[] {
  let lastType: QuestionType | null = null;
  return unitWords.map((word) => {
    if (isFirstChapter) {
      const others = [...allWords].filter((w) => w.id !== word.id).sort(() => Math.random() - 0.5).slice(0, 3);
      return { 
        id: word.id, 
        type: "choice_meaning", 
        q: word.word, 
        a: word.meaning, 
        options: [word.meaning, ...others.map(o => o.meaning)].sort(() => Math.random() - 0.5) 
      };
    }
    const types: QuestionType[] = ["choice_meaning", "choice_word", "input_word"];
    const availableTypes = lastType ? types.filter(t => t !== lastType) : types;
    const randomType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    lastType = randomType;
    const others = [...allWords].filter((w) => w.id !== word.id).sort(() => Math.random() - 0.5).slice(0, 3);
    
    if (randomType === "choice_meaning") {
      return { id: word.id, type: "choice_meaning", q: word.word, a: word.meaning, options: [word.meaning, ...others.map(o => o.meaning)].sort(() => Math.random() - 0.5) };
    }
    if (randomType === "choice_word") {
      return { id: word.id, type: "choice_word", q: word.meaning, a: word.word, options: [word.word, ...others.map(o => o.word)].sort(() => Math.random() - 0.5) };
    }
    return { id: word.id, type: "input_word", q: word.meaning, a: word.word.toLowerCase() };
  });
}

export default function QuizPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const unitId = Number(params.id) || 1;
  const chapterId = Number(searchParams.get("chapter")) || 1; 
  const mode = searchParams.get("mode") || "learn";
  const isTotalReviewMode = mode === "review";
  const isLearningMode = mode === "learn";
  const isTestMode = mode === "test";

  const inputRef = useRef<HTMLInputElement>(null);

  const [hearts, setHearts] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("duo_progress");
      if (saved) return JSON.parse(saved).hearts ?? 25;
    }
    return 25;
  });

  const [currentQuestions, setCurrentQuestions] = useState<QuizQuestion[]>(() => {
    let targetWords: Word[] = [];
    if (isTotalReviewMode) {
      const prevLearningWords: Word[] = [];
      for (let i = 1; i < chapterId; i++) {
        const reviewCountSoFar = Math.floor((i - 1) / 5);
        const adjustedIdx = (i - 1) - reviewCountSoFar;
        if ((i % 5 !== 0) && (adjustedIdx % 2 === 0)) prevLearningWords.push(...getWordsByChapter(unitId, i));
      }
      targetWords = [...prevLearningWords].sort(() => Math.random() - 0.5).slice(0, 15);
    } else if (isTestMode) {
      targetWords = getWordsByChapter(unitId, chapterId - 1);
    } else {
      targetWords = getWordsByChapter(unitId, chapterId);
    }
    return generateQuestions(targetWords, words, isLearningMode);
  });

  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState("");
  const [status, setStatus] = useState<"none" | "correct" | "wrong">("none");
  const [isFinished, setIsFinished] = useState(false);
  const [failedQuestions, setFailedQuestions] = useState<QuizQuestion[]>([]);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [showReviewIntro, setShowReviewIntro] = useState(false);
  const [combo, setCombo] = useState(0);
  const [confettiPieces, setConfettiPieces] = useState<ConfettiPiece[]>([]);
  const [showSpecialCelebration, setShowSpecialCelebration] = useState(false);
  const [isHeartModalOpen, setIsHeartModalOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // 콤보 팝업 1.5초 후 자동 종료
  useEffect(() => {
    if (showSpecialCelebration) {
      const timer = setTimeout(() => {
        setShowSpecialCelebration(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [showSpecialCelebration]);

  useEffect(() => {
    if (!isHeartModalOpen) return;
    const REGEN_TIME = 10 * 60 * 1000;
    const updateTimer = () => {
      const saved = localStorage.getItem("duo_progress");
      if (!saved) return;
      const { lastHeartTime } = JSON.parse(saved);
      if (!lastHeartTime) { setTimeLeft("곧 충전됩니다"); return; }
      const diff = REGEN_TIME - (Date.now() - lastHeartTime);
      if (diff <= 0) setTimeLeft("충전 완료!");
      else {
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${m}:${s < 10 ? "0" : ""}${s}`);
      }
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isHeartModalOpen]);

  const updateStorage = useCallback((newHearts: number, nextChapterFlag: boolean = false) => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("duo_progress");
    const current = saved ? JSON.parse(saved) : { unit: 1, chapter: 1, hearts: 25, streak: 0, lastDate: "", lastHeartTime: null };
    
    let lastHeartTime = current.lastHeartTime;
    if (newHearts < 25 && !lastHeartTime) lastHeartTime = Date.now();
    else if (newHearts >= 25) lastHeartTime = null;

    let nextUnit = current.unit;
    let nextChapter = current.chapter;
    let newStreak = current.streak ?? 0;
    let newLastDate = current.lastDate ?? "";

    if (nextChapterFlag) {
      if (unitId === current.unit && chapterId === current.chapter) {
        nextChapter = chapterId + 1;
        if (nextChapter > 25) { nextUnit += 1; nextChapter = 1; }
      }
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      if (current.lastDate !== today) {
        newStreak = (current.lastDate === yesterdayStr) ? newStreak + 1 : 1;
        newLastDate = today;
      }
    }

    localStorage.setItem("duo_progress", JSON.stringify({ 
      ...current, unit: nextUnit, chapter: nextChapter, hearts: newHearts, streak: newStreak, lastDate: newLastDate, lastHeartTime: lastHeartTime
    }));
  }, [unitId, chapterId]);

  const handleCheck = () => {
    if (!selected.trim() || status !== "none") return;
    if (hearts <= 0) { setIsHeartModalOpen(true); return; }

    const newHearts = Math.max(0, hearts - 1);
    setHearts(newHearts);
    updateStorage(newHearts);

    const currentQ = currentQuestions[step];
    const isCorrect = currentQ.type === "input_word" 
      ? selected.trim().toLowerCase() === currentQ.a.toLowerCase()
      : selected === currentQ.a;

    if (isCorrect) {
      setStatus("correct");
      const newCombo = combo + 1;
      setCombo(newCombo);
      if (newCombo % 5 === 0) {
        const colors = ['#58CC02', '#FF4B4B', '#1CB0F6', '#FFC800', '#FF9600'];
        setConfettiPieces(Array.from({ length: 40 }).map((_, i) => ({
          id: i, left: `${Math.random() * 100}%`, delay: `${Math.random() * 0.5}s`,
          duration: `${1.5 + Math.random() * 2}s`, color: colors[i % colors.length]
        })));
        setShowSpecialCelebration(true);
      }
    } else {
      setStatus("wrong");
      setCombo(0);
      if (!failedQuestions.find(q => q.id === currentQ.id)) {
        setFailedQuestions(prev => [...prev, currentQ]);
      }
    }
    if (newHearts === 0 && !isCorrect) {
      setTimeout(() => setIsHeartModalOpen(true), 800);
    }
  };

  const handleNext = useCallback(() => {
    if (step < currentQuestions.length - 1) {
      setStep((prev) => prev + 1);
      setSelected("");
      setStatus("none");
    } else {
      if (failedQuestions.length > 0 && !isReviewMode) { 
        setShowReviewIntro(true); 
      } else { 
        updateStorage(hearts, true); 
        setIsFinished(true); 
      }
    }
  }, [step, currentQuestions.length, hearts, failedQuestions.length, isReviewMode, updateStorage]);

  if (!mounted || currentQuestions.length === 0) return <div className="min-h-screen bg-white" />;

  if (showReviewIntro) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
      <div className="text-4xl mb-4">🎯</div>
      <h1 className="text-2xl font-black text-orange-500 mb-6">틀린 문제를 복습해요</h1>
      <button onClick={() => {
        setCurrentQuestions([...failedQuestions]);
        setFailedQuestions([]);
        setStep(0);
        setSelected("");
        setStatus("none");
        setIsReviewMode(true);
        setShowReviewIntro(false);
      }} className="w-full max-w-[280px] bg-orange-500 text-white py-3.5 rounded-xl font-bold text-lg shadow-[0_4px_0_#C2410C]">복습 시작</button>
    </div>
  );

  if (isFinished) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
      <div className="text-4xl mb-4">🏆</div>
      <h1 className="text-2xl font-black text-[#58CC02] mb-6">학습 완료!</h1>
      <button onClick={() => router.push("/learn")} className="w-full max-w-[280px] bg-[#58CC02] text-white py-3.5 rounded-xl font-bold text-lg shadow-[0_4px_0_#46A302]">계속하기</button>
    </div>
  );

  const currentQuestion = currentQuestions[step];
  const progress = ((step + 1) / currentQuestions.length) * 100;

  return (
    <div className="h-screen flex flex-col bg-white relative overflow-hidden font-sans select-none">
      
      {/* 콤보 팝업 - 크기 30% 축소 */}
      {showSpecialCelebration && (
        <div className="fixed inset-0 z-[200] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-[flash_0.3s_ease-out]">
          <div className="z-10 animate-[combo-pop_0.5s_cubic-bezier(0.34,1.56,0.64,1)_forwards]">
            <div className="text-6xl mb-3">🔥</div>
            <h1 className="text-3xl font-black text-orange-500 mb-1 italic">{combo} COMBO!</h1>
            <p className="text-orange-400 font-bold text-lg">완벽해요!</p>
          </div>
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {confettiPieces.map((p) => (
              <div key={p.id} className="confetti" style={{ left: p.left, backgroundColor: p.color, animationDelay: p.delay, animationDuration: p.duration }} />
            ))}
          </div>
        </div>
      )}

      {/* 헤더 - 콤팩트화 */}
      <header className="px-4 pt-4 pb-1 flex flex-col items-center max-w-xl mx-auto w-full relative">
        <div className="h-6 mb-1">
          {combo >= 2 && <div key={combo} className="text-orange-500 font-black text-lg italic animate-[combo-event_1s_ease-in-out_forwards]">{combo} COMBO!</div>}
        </div>
        <div className="flex items-center gap-2 w-full">
          <Link href="/learn" className="text-gray-400 text-xl font-bold p-1">✕</Link>
          <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
            <div className={`h-full transition-all duration-500 ${isReviewMode ? 'bg-orange-400' : 'bg-[#58CC02]'}`} style={{ width: `${progress}%` }} />
          </div>
          <div className="text-red-500 font-black text-lg flex items-center gap-1 min-w-[60px] justify-end">
            <span>❤️</span> {hearts}
          </div>
        </div>
      </header>

      {/* 메인 - 질문 크기 대폭 축소 (text-3xl) */}
      <main className="flex-1 flex flex-col items-center px-4 justify-center overflow-y-auto">
        <div className="max-w-md w-full text-center">
          <div className="mb-6 md:mb-10">
            <h1 className="text-3xl md:text-5xl font-black p-1 text-[#4B4B4B] break-keep leading-snug">
              {currentQuestion?.q}
            </h1>
          </div>
          
          {currentQuestion?.type === "input_word" ? (
             <input ref={inputRef} type="text" value={selected} disabled={status !== "none"} onChange={(e) => setSelected(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCheck()} placeholder="정답 입력" className={`w-full p-3.5 md:p-6 text-xl md:text-2xl font-black border-2 rounded-xl outline-none text-center transition-all ${status === "none" ? "border-gray-200 focus:border-[#1CB0F6] bg-gray-50 text-[#4B4B4B]" : status === "correct" ? "border-[#B8F28B] bg-[#D7FFB8] !text-[#58A700]" : "border-[#FFC1C1] bg-[#FFF1F1] !text-[#EA2B2B]"}`} />
          ) : (
            <div className="grid gap-2.5 md:gap-4 w-full px-1">
              {currentQuestion?.options?.map((opt) => (
                <button key={opt} disabled={status !== "none"} onClick={() => setSelected(opt)} className={`p-3.5 md:p-5 border-2 rounded-xl md:rounded-2xl text-base md:text-xl font-bold transition-all text-left border-b-4 md:border-b-8 active:scale-[0.98] ${selected === opt ? "border-[#84D8FF] bg-[#E5F3FF] text-[#1CB0F6]" : "border-gray-200 text-[#4B4B4B] hover:bg-gray-100"} ${status === "correct" && opt === currentQuestion.a ? "border-[#B8F28B] bg-[#D7FFB8] text-[#58A700]" : ""} ${status === "wrong" && selected === opt ? "border-[#FFC1C1] bg-[#FFF1F1] text-[#EA2B2B]" : ""}`}> {opt} </button>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* 푸터 - 버튼 높이 대폭 축소 (py-3.5) */}
      <footer className={`p-4 pb-6 md:p-8 md:pb-12 border-t-2 transition-colors duration-300 ${status === "correct" ? "bg-[#D7FFB8] border-[#B8F28B]" : status === "wrong" ? "bg-[#FFDFE0] border-[#FFC1C1]" : "bg-white border-gray-100"}`}>
        <div className="max-w-md mx-auto flex flex-col gap-2.5">
          {status === "none" ? (
            <button onClick={handleCheck} disabled={!selected.trim()} className={`w-full py-3.5 md:py-5 rounded-xl md:rounded-2xl font-black text-white text-lg md:text-xl uppercase transition-all ${selected.trim() ? "bg-[#58CC02] shadow-[0_4px_0_#46A302] active:translate-y-0.5 active:shadow-none" : "bg-[#E5E5E5] text-[#AFAFAF] cursor-not-allowed"}`}>확인하기</button>
          ) : (
            <>
              <h3 className={`text-xl md:text-2xl font-black ${status === "correct" ? "text-[#58A700]" : "text-[#EA2B2B]"}`}>{status === "correct" ? "정답입니다!" : "틀렸어요!"}</h3>
              {status === "wrong" && <p className="text-[#EA2B2B] font-bold text-base md:text-lg">정답: {currentQuestion.a}</p>}
              <button onClick={handleNext} className={`w-full py-3.5 md:py-5 rounded-xl md:rounded-2xl font-black text-white text-lg md:text-xl uppercase shadow-md active:translate-y-0.5 active:shadow-none transition-all ${status === "correct" ? "bg-[#58CC02] shadow-[0_4px_0_#46A302]" : "bg-[#FF4B4B] shadow-[0_4px_0_#D33131]"}`}>계속하기</button>
            </>
          )}
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fall { 0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; } 100% { transform: translateY(110vh) rotate(720deg); opacity: 0; } }
        .confetti { position: absolute; width: 10px; height: 10px; top: -20px; border-radius: 2px; animation: fall linear forwards; }
        @keyframes combo-event { 0% { transform: translateY(15px) scale(0); opacity: 0; } 25% { transform: translateY(-3px) scale(1.1); opacity: 1; } 50% { transform: translateY(0) scale(1); opacity: 1; } 100% { transform: translateY(-20px) scale(0.8); opacity: 0; } }
        @keyframes flash { 0% { opacity: 0; } 100% { opacity: 1; } }
        @keyframes combo-pop { 0% { transform: scale(0.3) rotate(-10deg); opacity: 0; } 100% { transform: scale(1) rotate(0deg); opacity: 1; } }
      `}} />
    </div>
  );
}