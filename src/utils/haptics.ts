import * as Haptics from 'expo-haptics';

// 손맛: 짧은 진동. 새 개발 빌드 전(네이티브 모듈 없음)이거나 기기에서 꺼 두었으면 조용히 넘어간다.
// (expo-haptics 는 모듈이 없을 때 import 는 되고 호출만 실패한다.)

// 핀이 꽂힐 때·스티커를 붙일 때·한 획을 마쳤을 때
export function tapHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

// 필통에서 도구를 바꿀 때
export function selectHaptic() {
  Haptics.selectionAsync().catch(() => {});
}
