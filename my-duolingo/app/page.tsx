// app/page.tsx
import Link from "next/link";

// 1. 버튼 모양을 만드는 작은 레고 블록 (버튼 컴포넌트)
function Button({ text }: { text: string }) {
  return (
    <div className="w-full bg-[#000000] border-b-4 border-[#000000] text-white font-bold text-xl rounded-2xl py-3 px-8 active:border-b-0 active:translate-y-1 transition-all text-center cursor-pointer">
      {text}
    </div>
  );
}

// 2. 실제 화면에 보여질 메인 페이지
export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-white">
      {/* 둥둥 떠있는 토끼 이모지 */}
      <div className="text-9xl mb-10 animate-bounce">🐰</div>

      <h1 className="text-3xl font-black text-[#4B4B4B] text-center mb-8 leading-tight">
        빗취 <br /> 공부해라이냔아
      </h1>

      <div className="w-full max-w-xs flex flex-col gap-4">
        {/* 클릭하면 /learn 페이지로 이동하는 링크 */}
        <Link href="/learn" className="w-full">
          <Button text="시작하기" />
        </Link>
        
      </div>
    </main>
  );
}