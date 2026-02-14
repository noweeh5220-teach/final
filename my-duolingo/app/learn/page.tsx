"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

export default function LearnPage() {
  const totalUnits = 20;
  const chaptersPerUnit = 25;
  const MAX_HEARTS = 25;
  // ✅ 퀴즈 페이지와 동일하게 10분으로 수정
  const REFILL_TIME = 10 * 60 * 1000; 

  // 1️⃣ 초기 상태 설정 및 충전 계산
  const [currentProgress, setCurrentProgress] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("duo_progress");
      // 기본 데이터 구조 통일
      const data = saved ? JSON.parse(saved) : { unit: 1, chapter: 1, hearts: 25, streak: 0, lastDate: "", lastHeartTime: null };
      
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // 스트릭 초기화 검사
      if (data.lastDate !== today && data.lastDate !== yesterdayStr && data.streak > 0) {
        data.streak = 0;
      }

      // ✅ 접속 시 부재중 흘러간 시간만큼 하트 충전 로직 최적화
      if (data.hearts < MAX_HEARTS && data.lastHeartTime) {
        const now = Date.now();
        const diff = now - data.lastHeartTime;
        const heartsToAdd = Math.floor(diff / REFILL_TIME);
        
        if (heartsToAdd > 0) {
          data.hearts = Math.min(MAX_HEARTS, data.hearts + heartsToAdd);
          // 충전 후 남은 시간을 계산하여 lastHeartTime 재설정 (하트가 풀이면 null)
          data.lastHeartTime = data.hearts >= MAX_HEARTS ? null : data.lastHeartTime + (heartsToAdd * REFILL_TIME);
        }
      }
      
      localStorage.setItem("duo_progress", JSON.stringify(data));
      return data;
    }
    return { unit: 1, chapter: 1, hearts: 25, streak: 0, lastDate: "", lastHeartTime: null };
  });

  const [showTopBtn, setShowTopBtn] = useState(false);
  const [showHeartInfo, setShowHeartInfo] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>("");

  // 2️⃣ 실시간 하트 충전 타이머 및 동기화
  useEffect(() => {
    const tick = setInterval(() => {
      const saved = localStorage.getItem("duo_progress");
      if (!saved) return;
      const data = JSON.parse(saved);

      if (data.hearts < MAX_HEARTS && data.lastHeartTime) {
        const now = Date.now();
        const diff = now - data.lastHeartTime;
        
        if (diff >= REFILL_TIME) {
          // 시간이 다 차면 하트 1개 증가 및 저장
          const newHearts = Math.min(MAX_HEARTS, data.hearts + 1);
          const updated = {
            ...data,
            hearts: newHearts,
            lastHeartTime: newHearts >= MAX_HEARTS ? null : data.lastHeartTime + REFILL_TIME
          };
          setCurrentProgress(updated);
          localStorage.setItem("duo_progress", JSON.stringify(updated));
        } else {
          // 남은 시간 계산 (퀴즈 페이지와 동일한 포맷)
          const remaining = REFILL_TIME - diff;
          const mins = Math.floor(remaining / 60000);
          const secs = Math.floor((remaining % 60000) / 1000);
          setTimeLeft(`${mins}:${secs < 10 ? "0" : ""}${secs}`);
          
          // 실시간 화면 갱신을 위해 상태 동기화 (선택 사항)
          if (data.hearts !== currentProgress.hearts) {
            setCurrentProgress(data);
          }
        }
      } else {
        setTimeLeft("가득 참");
        if (data.hearts !== currentProgress.hearts) {
          setCurrentProgress(data);
        }
      }
    }, 1000);

    const handleScroll = () => setShowTopBtn(window.scrollY > 400);
    const handleFocus = () => {
      const saved = localStorage.getItem("duo_progress");
      if (saved) setCurrentProgress(JSON.parse(saved));
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("focus", handleFocus);
    
    return () => {
      clearInterval(tick);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("focus", handleFocus);
    };
  }, [currentProgress.hearts]);

  const units = Array.from({ length: totalUnits }, (_, i) => i + 1);
  const chapters = Array.from({ length: chaptersPerUnit }, (_, i) => i + 1);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <div className="min-h-screen bg-white pb-24 font-sans relative select-none">
      <header className="sticky top-0 z-50 bg-white border-b-2 border-gray-200 p-5">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-black text-[#58CC02] tracking-tighter">MY DUOLINGO</h1>
          
          <div className="flex gap-8 items-center font-black">
            <div className={`flex items-center gap-2 text-2xl ${currentProgress.streak > 0 ? "text-orange-500" : "text-gray-300"}`}>
              <span className="text-4xl">🔥</span> 
              <span>{currentProgress.streak ?? 0}</span>
            </div>

            <div 
              className="relative flex items-center gap-2 text-2xl text-red-500 cursor-pointer active:scale-95 transition-transform"
              onClick={() => setShowHeartInfo(!showHeartInfo)}
            >
              <span className="text-4xl">❤️</span>
              <span className={currentProgress.hearts < MAX_HEARTS ? "animate-pulse" : ""}>
                {currentProgress.hearts ?? 25}
              </span>

              {showHeartInfo && (
                <div className="absolute top-14 right-0 bg-white border-2 border-gray-200 p-4 rounded-2xl shadow-xl w-48 text-center z-50 animate-in fade-in zoom-in duration-200">
                  <p className="text-sm text-gray-400 font-bold mb-1">다음 하트 충전</p>
                  <p className="text-2xl text-blue-500 font-black">
                    {currentProgress.hearts >= MAX_HEARTS ? "가득 참" : timeLeft}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 pt-8">
        {units.map((unit) => (
          <section key={unit} className="mb-16">
            <div className={`p-8 rounded-2xl mb-12 text-white shadow-lg transition-all
                ${unit > currentProgress.unit 
                  ? "bg-gray-300 shadow-[0_5px_0_#AFAFAF]" 
                  : unit % 2 === 0 ? "bg-[#1CB0F6] shadow-[0_5px_0_#1899D6]" : "bg-[#58CC02] shadow-[0_5px_0_#46A302]"}
              `}
            >
              <h2 className="text-xl font-black opacity-80 uppercase tracking-wide">Unit {unit}</h2>
              <p className="text-3xl font-black italic mt-1">
                {unit > currentProgress.unit ? "잠겨 있음" : `기초 단어 정복하기 #${unit}`}
              </p>
            </div>

            <div className="flex flex-col items-center gap-8">
              {chapters.map((chapter, idx) => {
                const offsets: number[] = [0, 35, 60, 45, 0, -45, -60, -35];
                const translateX: number = offsets[idx % offsets.length];
                const isLocked = unit > currentProgress.unit || (unit === currentProgress.unit && chapter > currentProgress.chapter);
                const isReviewChapter = (idx + 1) % 5 === 0;
                const reviewCountSoFar = Math.floor(idx / 5);
                const adjustedIdx = idx - reviewCountSoFar;
                const isLearningStep = !isReviewChapter && (adjustedIdx % 2 === 0);
                const mode = isReviewChapter ? "review" : isLearningStep ? "learn" : "test";

                return (
                  <div key={`${unit}-${chapter}`} style={{ transform: `translateX(${translateX}px)` }} className="relative group">
                    {isLocked ? (
                      <div className="w-20 h-20 rounded-full bg-[#E5E5E5] border-b-8 border-[#AFAFAF] flex items-center justify-center text-gray-400">
                        <span className="text-2xl">🔒</span>
                      </div>
                    ) : (
                      <Link
                        href={`/learn/quiz/${unit}?chapter=${chapter}&mode=${mode}`}
                        className="block transition-transform active:scale-95"
                      >
                        <div className={`
                          w-20 h-20 rounded-full flex items-center justify-center 
                          text-2xl font-black border-b-8 transition-all
                          ${isReviewChapter 
                            ? "bg-[#A346FF] border-[#7F26D9] text-white shadow-[0_4px_0_#7F26D9]" 
                            : isLearningStep 
                              ? "bg-yellow-400 border-yellow-600 text-white shadow-[0_4px_0_#CA8A04]" 
                              : "bg-white border-gray-200 text-[#1CB0F6] hover:bg-gray-100 shadow-[0_4px_0_#E5E5E5]"}
                        `}>
                          {isReviewChapter ? "🏆" : isLearningStep ? "📖" : chapter}
                        </div>
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </main>

      <button onClick={scrollToTop} className={`fixed bottom-28 right-6 w-14 h-14 bg-white border-2 border-gray-200 rounded-2xl shadow-xl flex items-center justify-center transition-all duration-300 z-50 ${showTopBtn ? "opacity-100" : "opacity-0"}`}>
        <span className="text-2xl font-bold">↑</span>
      </button>

      <nav className="fixed bottom-0 w-full bg-white border-t-2 border-gray-200 py-4 px-6 z-50">
        <div className="max-w-2xl mx-auto flex justify-around items-center text-4xl">
          <button className="grayscale-0">🏠</button>
          <button className="grayscale">🏆</button>
          <button className="grayscale">👤</button>
          <button className="grayscale">⚙️</button>
        </div>
      </nav>
    </div>
  );
}