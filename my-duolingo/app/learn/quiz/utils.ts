// 1. 여기서 { words } 로 정확히 가져오는지 확인
import { words, Word } from './words';

export type QuizType = 'EN_TO_KR_SELECT' | 'KR_TO_EN_SELECT' | 'EN_TO_KR_INPUT' | 'KR_TO_EN_INPUT';

export const checkIsCorrect = (input: string, word: string, meaning: string, type: QuizType) => {
  const userAnswer = input.trim().toLowerCase();
  if (type === 'EN_TO_KR_INPUT' || type === 'EN_TO_KR_SELECT') {
    const validMeanings = meaning.split(',').map(m => m.trim().toLowerCase());
    return validMeanings.includes(userAnswer);
  }
  return userAnswer === word.trim().toLowerCase();
};

export const getRandomOptions = (correctValue: string, isMeaning: boolean) => {
  const options = [correctValue];
  while (options.length < 4) {
    // 여기서 words는 위에 정의된 '데이터 배열(값)'로 인식됩니다.
    const randomWord: Word = words[Math.floor(Math.random() * words.length)];
    const option = isMeaning ? randomWord.meaning : randomWord.word;
    if (!options.includes(option)) {
      options.push(option);
    }
  }
  return options.sort(() => Math.random() - 0.5);
};