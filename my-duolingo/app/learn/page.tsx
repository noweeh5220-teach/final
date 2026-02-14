"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

export default function LearnPage() {
  const totalUnits = 20;
  const chaptersPerUnit = 25;
  const MAX_HEARTS = 25;
  const REFILL_TIME = 10 * 60 * 1000; 

  const [currentProgress, setCurrentProgress] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("duo_progress");
      const data = saved ? JSON.parse(saved) : { unit: 1, chapter: 1, hearts: 25, streak: 0, lastDate: "", lastHeartTime: null };
      
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (data.lastDate !== today && data.lastDate !== yesterdayStr && data.streak > 0) {
        data.streak = 0;
      }

      if (data.hearts < MAX_HEARTS && data.lastHeartTime) {
        const now = Date.now();
        const diff = now - data.lastHeartTime;
        const heartsToAdd = Math.floor(diff / REFILL_TIME);
        if (heartsToAdd > 0) {
          data.hearts = Math.min(MAX_HEARTS, data.hearts + heartsToAdd);
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

  useEffect(() => {
    const tick = setInterval(() => {
      const saved = localStorage.getItem("duo_progress");
      if (!saved) return;
      const data = JSON.parse(saved);

      if (data.hearts < MAX_HEARTS && data.lastHeartTime) {
        const now = Date.now();
        const diff = now - data.lastHeartTime;
        if (diff >= REFILL_TIME) {
          const newHearts = Math.min(MAX_HEARTS, data.hearts + 1);
          const updated = { ...data, hearts: newHearts, lastHeartTime: newHearts >= MAX_HEARTS ? null : data.lastHeartTime + REFILL_TIME };
          setCurrentProgress(updated);
          localStorage.setItem("duo_progress", JSON.stringify(updated));
        } else {
          const remaining = REFILL_TIME - diff;
          const mins = Math.floor(remaining / 60000);
          const secs = Math.floor((remaining % 60000) / 1000);
          setTimeLeft(`${mins}:${secs < 10 ? "0" : ""}${secs}`);
        }
      }
    }, 1000);

    const handleScroll = () => setShowTopBtn(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll);
    return () => {
      clearInterval(tick);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const units = Array.from({ length: totalUnits }, (_, i) => i + 1);
  const chapters = Array.from({ length: chaptersPerUnit }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-[#F7F7F7] pb-20 font-sans relative select-none text-[#2D2D2D]">
      {/* 헤더 - 높이 축소 및 블랙 테마 */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <h1 className="text-xl font-black tracking-tighter text-black">VOCAB</h1>
          
          <div className="flex gap-4 items-center font-bold">
            <div className={`flex items-center gap-1 text-sm ${currentProgress.streak > 0 ? "text-black" : "text-gray-300"}`}>
              <span>🔥</span> <span>{currentProgress.streak ?? 0}</span>
            </div>

            <div 
              className="relative flex items-center gap-1 text-sm text-black cursor-pointer"
              onClick={() => setShowHeartInfo(!showHeartInfo)}
            >
              <span>❤️</span> <span>{currentProgress.hearts ?? 25}</span>
              {showHeartInfo && (
                <div className="absolute top-10 right-0 bg-white border border-black p-3 rounded-xl shadow-lg w-32 text-center z-50">
                  <p className="text-[10px] text-gray-400 uppercase">Next Heart</p>
                  <p className="text-sm font-black">{currentProgress.hearts >= MAX_HEARTS ? "Full" : timeLeft}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-6">
        {units.map((unit) => (
          <section key={unit} className="mb-10">
            {/* 유닛 헤더 - 블랙 앤 화이트 디자인 */}
            <div className={`p-5 rounded-xl mb-6 transition-all border ${
                unit > currentProgress.unit 
                  ? "bg-gray-100 border-gray-200 text-gray-400" 
                  : "bg-black border-black text-white shadow-md"
              }`}
            >
              <h2 className="text-[10px] font-black uppercase tracking-widest opacity-70">Unit {unit}</h2>
              <p className="text-lg font-black mt-0.5">
                {unit > currentProgress.unit ? "Locked" : `Level ${unit}`}
              </p>
            </div>

            {/* 챕터 아이콘 - 크기 대폭 축소 (w-12 h-12) */}
            <div className="flex flex-col items-center gap-4">
              {chapters.map((chapter, idx) => {
                const offsets = [0, 25, 45, 25, 0, -25, -45, -25];
                const translateX = offsets[idx % offsets.length];
                const isLocked = unit > currentProgress.unit || (unit === currentProgress.unit && chapter > currentProgress.chapter);
                const isReviewChapter = (idx + 1) % 5 === 0;
                const isLearningStep = !isReviewChapter && (idx % 2 === 0);
                const mode = isReviewChapter ? "review" : isLearningStep ? "learn" : "test";

                return (
                  <div key={`${unit}-${chapter}`} style={{ transform: `translateX(${translateX}px)` }} className="relative">
                    {isLocked ? (
                      <div className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-300">
                        <span className="text-xs">🔒</span>
                      </div>
                    ) : (
                      <Link
                        href={`/learn/quiz/${unit}?chapter=${chapter}&mode=${mode}`}
                        className="block active:scale-90 transition-transform"
                      >
                        <div className={`
                          w-12 h-12 rounded-full flex items-center justify-center 
                          text-sm font-black border-b-4 transition-all
                          ${isReviewChapter 
                            ? "bg-black border-gray-700 text-white" 
                            : isLearningStep 
                              ? "bg-white border-black text-black" 
                              : "bg-gray-100 border-gray-300 text-gray-500"}
                        `}>
                          {isReviewChapter ? "★" : isLearningStep ? "●" : chapter}
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

      {/* 하단 내비게이션 - 콤팩트 및 흑백 */}
      <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 py-3 z-50">
        <div className="max-w-md mx-auto flex justify-around items-center">
          <button className="text-xl">🏠</button>
          <button className="text-xl opacity-30">👤</button>
        </div>
      </nav>
    </div>
  );
}