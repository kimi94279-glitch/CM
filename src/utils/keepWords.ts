// 한국어 글줄이 어절(띄어쓰기) 단위로만 줄바꿈되게: 어절 안 글자 사이에 보이지 않는 단어 잇기(U+2060)를 넣는다.
// 안드로이드 Text 는 한글을 글자마다 끊어서 큰 글씨 설정에서 "바/꿔도"처럼 낱말이 갈린다
// (iOS 는 lineBreakStrategyIOS="hangul-word" 로도 된다). 두 줄이 될 수 있는 짧은 안내 문구에만 쓴다.
export function keepWords(text: string): string {
  return text
    .split(' ')
    .map((word) => Array.from(word).join('⁠'))
    .join(' ');
}
