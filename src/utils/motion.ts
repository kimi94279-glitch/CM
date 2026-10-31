import { AccessibilityInfo, Easing } from 'react-native';

// 기기의 "동작 줄이기" 설정을 앱이 켜질 때 한 번 읽고, 바뀌면 따라간다.
// 움직임을 시작하는 순간 바로 알아야 해서(비동기로 묻고 기다리면 그 사이 닫기와 엉킨다) 값을 들고 있는다.
// 동작 줄이기는 움직임을 끄는 게 아니라 줄인다: 미끄러짐·튕김 대신 짧게 나타나고 사라지기(투명도).
let reduceMotion = false;
AccessibilityInfo.isReduceMotionEnabled()
  .then((v) => {
    reduceMotion = v;
  })
  .catch(() => {});
AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => {
  reduceMotion = v;
});

export function prefersReducedMotion(): boolean {
  return reduceMotion;
}

// 움직임 값(2026-10-31, Emil Kowalski 의 animate-expo·apple-design 스킬에서 — 원칙만, reanimated 없이 RN Animated 로).

// 판이 미끄러질 때의 곡선(iOS 시트와 같은 감속). 열 때·닫을 때 모두 이것 — 화면 안 움직임에 ease-in 은 쓰지 않는다.
export const SHEET_EASING = Easing.bezier(0.32, 0.72, 0, 1);
// 자주 누르는 것(하루 수십 번)이 살짝 움직일 때의 곡선 — 빨리 닿고 천천히 멈춘다.
export const SNAPPY_EASING = Easing.bezier(0.23, 1, 0.32, 1);

// 스프링: Apple 의 감쇠·응답(초)을 RN stiffness·damping(질량 1)으로 바꾼 값. 손을 놓은 속도를 이어받을 때 쓴다.
// 닫기 = 감쇠 0.8 · 0.3초(조금 경쾌하게), 제자리 = 감쇠 1 · 0.4초(튀지 않게).
export const SPRING_DISMISS = { stiffness: 439, damping: 33.5, mass: 1 };
export const SPRING_SETTLE = { stiffness: 247, damping: 31.4, mass: 1 };

// 손을 놓은 뒤 판이 멈출 자리 예측(감속률 0.998/ms — iOS 스크롤 기본). 속도는 PanResponder 의 vy(px/ms).
export function projectedDistance(velocityPxPerMs: number): number {
  return velocityPxPerMs * 499;
}

// 고무줄: 한계 너머로 끈 거리 o 를 줄여서 보여 준다(Apple 0.55 공식). h = 판 크기.
export function rubberBand(o: number, h: number): number {
  const a = Math.abs(o);
  return (Math.sign(o) * (a * h * 0.55)) / (h + 0.55 * a);
}
