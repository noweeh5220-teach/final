"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";

export default function LearnPage() {
  const [currentProgress, setCurrentProgress] = useState({
    unit: 1,
    chapter: 1,
    hearts: 25,
    streak: 0,
  });

  // 어떤 챕터의 말풍선을 보여줄지 관리하는 상태
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("duo_progress");
      if (saved) setCurrentProgress(JSON.parse(saved));
    }

    // 화면 다른 곳 누르면 말풍선 닫기
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveTooltip(null);
      }
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  const units = Array.from({ length: 10 }, (_, i) => i + 1);
  const chapters = Array.from({ length: 25 }, (_, i) => i + 1);

  return (
    <div ref={containerRef} className="min-h-screen bg-white pb-24 font-sans text-black select-none">
      {/* 헤더 */}
      <header className="sticky top-0 z-[100] bg-white border-b border-gray-100 px-4 py-2">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <h1 className="text-lg font-black tracking-tighter">LEARN</h1>
          <div className="flex gap-4 items-center font-bold text-sm">
            <span>🔥 {currentProgress.streak}</span>
            <span>❤️ {currentProgress.hearts}</span>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-6">
        {units.map((unit) => (
          <section key={unit} className="mb-12">
            <div className={`p-4 rounded-xl mb-8 border transition-all ${
              unit > currentProgress.unit ? "bg-gray-50 border-gray-100 text-gray-300" : "bg-black border-black text-white"
            }`}>
              <h2 className="text-[10px] font-black opacity-70">UNIT {unit}</h2>
              <p className="text-base font-black italic">
                {unit > currentProgress.unit ? "Locked Unit" : `Essential Vocab #${unit}`}
              </p>
            </div>

            <div className="flex flex-col items-center gap-4">
              {chapters.map((chapter, idx) => {
                const isLocked = unit > currentProgress.unit || (unit === currentProgress.unit && chapter > currentProgress.chapter);
                const chapterKey = `${unit}-${chapter}`;
                
                // 지그재그 좌표
                const offsets = [0, 25, 45, 25, 0, -25, -45, -25];
                const translateX = offsets[idx % offsets.length];

                // 모드 판별
                const isReview = (idx + 1) % 5 === 0;
                const modeName = isReview ? "복습 도전" : (idx % 2 === 0 ? "단어 학습" : "실력 테스트");
                const modeQuery = isReview ? "review" : (idx % 2 === 0 ? "learn" : "test");

                return (
                  <div key={chapterKey} style={{ transform: `translateX(${translateX}px)` }} className="relative">
                    
                    {/* 💬 말풍선 (Tooltip) */}
                    {activeTooltip === chapterKey && !isLocked && (
                      <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-[90] animate-in fade-in zoom-in duration-150">
                        <div className="bg-black text-white text-[11px] font-black px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl flex flex-col items-center">
                          {modeName}
                          <div className="w-2 h-2 bg-black rotate-45 -mb-2 mt-1"></div>
                        </div>
                      </div>
                    )}

                    {isLocked ? (
                      <div className="w-12 h-12 rounded-full bg-gray-50 border-b-4 border-gray-200 flex items-center justify-center text-gray-300">
                        <span className="text-xs">🔒</span>
                      </div>
                    ) : (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveTooltip(activeTooltip === chapterKey ? null : chapterKey);
                        }}
                        className="relative cursor-pointer"
                      >
                        <div className={`
                          w-12 h-12 rounded-full flex items-center justify-center 
                          text-sm font-black border-b-4 transition-all active:translate-y-0.5 active:border-b-0
                          ${unit === currentProgress.unit && chapter === currentProgress.chapter
                            ? "bg-black border-gray-700 text-white"
                            : "bg-white border-black text-black"}
                        `}>
                          {isReview ? "★" : chapter}
                        </div>
                        
                        {/* 말풍선이 열려있을 때만 '시작' 버튼 노출 (선택 시 이동) */}
                        {activeTooltip === chapterKey && (
                          <Link 
                            href={`/learn/quiz/${unit}?chapter=${chapter}&mode=${modeQuery}`}
                            className="absolute inset-0 z-10"
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </main>

      {/* 하단 네비게이션 */}
      <nav className="fixed bottom-0 w-full bg-white border-t border-gray-100 py-3 z-[100]">
        <div className="max-w-md mx-auto flex justify-around items-center">
          <button className="text-xl">🏠</button>
          <button className="text-xl opacity-20">👤</button>
        </div>
      </nav>
    </div>
  );
}