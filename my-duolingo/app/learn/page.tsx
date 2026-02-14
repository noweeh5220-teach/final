"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface ProgressType {
  unit: number;
  chapter: number;
  hearts: number;
  streak: number;
  lastHeartTime: number | null;
}

export default function LearnPage() {
  const [currentProgress, setCurrentProgress] = useState<ProgressType>({
    unit: 1,
    chapter: 1,
    hearts: 25,
    streak: 0,
    lastHeartTime: null,
  });

  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [showHeartInfo, setShowHeartInfo] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const MAX_HEARTS = 25;
  const REFILL_TIME = 10 * 60 * 1000;

  useEffect(() => {
    const saved = localStorage.getItem("duo_progress");
    let initialProgress: ProgressType = { 
      unit: 1, 
      chapter: 1, 
      hearts: 25, 
      streak: 0, 
      lastHeartTime: null 
    };
    
    if (saved) {
      try {
        initialProgress = JSON.parse(saved);
        setCurrentProgress(initialProgress);
      } catch (e) {
        console.error("Failed to parse progress", e);
      }
    }

    const timer = setInterval(() => {
      if (initialProgress.hearts < MAX_HEARTS && initialProgress.lastHeartTime) {
        const now = Date.now();
        const diff = now - initialProgress.lastHeartTime;
        
        if (diff >= REFILL_TIME) {
          const refillAmount = Math.floor(diff / REFILL_TIME);
          const newHearts = Math.min(MAX_HEARTS, initialProgress.hearts + refillAmount);
          const newTime = newHearts === MAX_HEARTS ? null : initialProgress.lastHeartTime + (refillAmount * REFILL_TIME);
          
          const updated: ProgressType = { 
            ...initialProgress, 
            hearts: newHearts, 
            lastHeartTime: newTime 
          };
          initialProgress = updated;
          setCurrentProgress(updated);
          localStorage.setItem("duo_progress", JSON.stringify(updated));
        }

        const remaining = REFILL_TIME - (diff % REFILL_TIME);
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        setTimeLeft(`${mins}:${secs < 10 ? "0" : ""}${secs}`);
      } else {
        setTimeLeft("");
      }
    }, 1000);

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveTooltip(null);
        setShowHeartInfo(false);
      }
    };

    window.addEventListener("click", handleClickOutside);
    return () => {
      clearInterval(timer);
      window.removeEventListener("click", handleClickOutside);
    };
  }, []);

  const units = Array.from({ length: 10 }, (_, i) => i + 1);
  const chapters = Array.from({ length: 25 }, (_, i) => i + 1);

  return (
    <div ref={containerRef} className="min-h-screen bg-white pb-24 font-sans text-black select-none">
      <header className="sticky top-0 z-[100] bg-white border-b border-gray-100 px-4 py-2">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <h1 className="text-lg font-black tracking-tighter cursor-default italic">VOCAB MASTER</h1>
          <div className="flex gap-4 items-center font-bold text-sm relative">
            <div className="flex items-center gap-1">🔥 {currentProgress.streak}</div>
            <div 
              className="flex items-center gap-1 cursor-pointer bg-gray-50 px-2 py-1 rounded-lg active:scale-95 transition-all"
              onClick={(e) => { e.stopPropagation(); setShowHeartInfo(!showHeartInfo); }}
            >
              ❤️ {currentProgress.hearts}
            </div>

            {showHeartInfo && (
              <div className="absolute top-10 right-0 bg-black text-white text-[10px] px-3 py-2 rounded-xl shadow-xl z-[110] whitespace-nowrap animate-in fade-in slide-in-from-top-1">
                {currentProgress.hearts >= MAX_HEARTS 
                  ? "하트가 가득 찼습니다!" 
                  : `다음 충전까지: ${timeLeft}`}
                <div className="absolute -top-1 right-4 w-2 h-2 bg-black rotate-45"></div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-6">
        {units.map((unit) => (
          <section key={unit} className="mb-12">
            <div 
              onClick={(e) => {
                if (unit > currentProgress.unit) {
                  e.stopPropagation();
                  setActiveTooltip(`unit-${unit}`);
                }
              }}
              className={`p-4 rounded-xl mb-10 border transition-all relative cursor-pointer ${
                unit > currentProgress.unit ? "bg-gray-50 border-gray-100 text-gray-300" : "bg-black border-black text-white"
              }`}
            >
              <h2 className="text-[10px] font-black opacity-70">UNIT {unit}</h2>
              <p className="text-base font-black italic">
                {unit > currentProgress.unit ? "Locked Unit" : `Essential Vocab Section #${unit}`}
              </p>
              
              {activeTooltip === `unit-${unit}` && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-500 text-white text-[11px] px-3 py-1 rounded-lg font-bold z-50 animate-in zoom-in">
                  이전 유닛을 완료하세요
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-500 rotate-45"></div>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center gap-6">
              {chapters.map((chapter, idx) => {
                const isLocked = unit > currentProgress.unit || (unit === currentProgress.unit && chapter > currentProgress.chapter);
                const chapterKey = `${unit}-${chapter}`;
                
                // 굴곡진 경로 표현
                const offsets = [0, 30, 55, 30, 0, -30, -55, -30];
                const translateX = offsets[idx % offsets.length];

                // 🎯 챕터별 모드 설정 (유닛 페이지와 동일한 로직)
                let modeName = "";
                let modeQuery = "";
                const isCumulativeReview = chapter % 5 === 0; // 5, 10... 누적 복습
                const isOddChapter = chapter % 2 !== 0;      // 1, 3, 5... (학습 챕터)

                if (isCumulativeReview) {
                  modeName = "유닛 누적 복습";
                  modeQuery = "review";
                } else if (!isOddChapter) {
                  modeName = "직전 단어 테스트";
                  modeQuery = "test";
                } else {
                  modeName = "새 단어 학습";
                  modeQuery = "learn";
                }

                return (
                  <div key={chapterKey} style={{ transform: `translateX(${translateX}px)` }} className="relative">
                    {activeTooltip === chapterKey && (
                      <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-[90] animate-in fade-in zoom-in duration-150">
                        <div className={`${isLocked ? "bg-gray-400" : "bg-black"} text-white text-[11px] font-black px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl flex flex-col items-center`}>
                          {isLocked ? "잠겨있습니다" : modeName}
                          <div className={`w-2 h-2 ${isLocked ? "bg-gray-400" : "bg-black"} rotate-45 -mb-2 mt-1`}></div>
                        </div>
                      </div>
                    )}

                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTooltip(activeTooltip === chapterKey ? null : chapterKey);
                      }}
                      className="relative cursor-pointer"
                    >
                      {isLocked ? (
                        <div className="w-14 h-14 rounded-full bg-gray-50 border-b-4 border-gray-200 flex items-center justify-center text-gray-300">
                          <span className="text-lg">🔒</span>
                        </div>
                      ) : (
                        <div className={`
                          w-14 h-14 rounded-full flex items-center justify-center 
                          text-lg font-black border-b-4 transition-all active:translate-y-0.5 active:border-b-0
                          ${unit === currentProgress.unit && chapter === currentProgress.chapter
                            ? "bg-black border-gray-700 text-white ring-4 ring-black ring-offset-2"
                            : isCumulativeReview 
                              ? "bg-orange-400 border-orange-600 text-white" 
                              : "bg-white border-black text-black"}
                        `}>
                          {isCumulativeReview ? "★" : chapter}
                        </div>
                      )}

                      {activeTooltip === chapterKey && !isLocked && (
                        <Link 
                          href={`/learn/quiz/${unit}?chapter=${chapter}&mode=${modeQuery}`}
                          className="absolute inset-0 z-10"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </main>

      <nav className="fixed bottom-0 w-full bg-white border-t border-gray-100 py-4 z-[100]">
        <div className="max-w-md mx-auto flex justify-around items-center">
          <button className="text-2xl hover:scale-110 transition-transform">🏠</button>
          <button className="text-2xl hover:scale-110 transition-transform opacity-30">👤</button>
          <button className="text-2xl hover:scale-110 transition-transform opacity-30">🏆</button>
        </div>
      </nav>
    </div>
  );
}