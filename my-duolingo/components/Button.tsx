// components/Button.tsx
import React from "react";

// 버튼이 받을 수 있는 속성(Props)을 정의합니다.
// text: 버튼에 들어갈 글자
// onClick: 클릭했을 때 실행할 함수 (선택사항)
interface ButtonProps {
  text: string;
  onClick?: () => void;
}

export default function Button({ text, onClick }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className="
        w-full                   /* 너비 꽉 차게 */
        bg-duoGreen              /* 배경색: 아까 설정한 초록 */
        border-b-4 border-duoGreen-dark /* 아래쪽 테두리(그림자 효과) */
        text-white font-bold text-xl    /* 글자색, 굵기, 크기 */
        rounded-2xl              /* 모서리 둥글게 */
        py-3 px-8                /* 안쪽 여백: 위아래 3, 좌우 8 */
        uppercase                /* 대문자로 변환 */
        transition-all           /* 애니메이션 부드럽게 */
        
        /* 마우스 올렸을 때(hover) 조금 밝게 */
        hover:bg-green-400       
        
        /* 눌렀을 때(active) 효과: 테두리 없애고 아래로 살짝 이동 */
        active:border-b-0 active:translate-y-1 
      "
    >
      {text}
    </button>
  );
}