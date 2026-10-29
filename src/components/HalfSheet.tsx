import React, { useMemo, useState } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../constants/theme';

// 모바일 Half Sheet(아래에서 올라오는 카드, 고정 높이). backdrop 없음 → 시트 밖 지도는 계속 보이고 조작 가능(Surface First).
// 컨테이너 box-none + 카드만 터치 수신. grabber 탭 = 닫기, 아래로 끌기 = 닫기.
// 닫힘 애니메이션이 끝난 뒤 onDismissed — 그때 상위가 언마운트한다. children 은 dismiss 를 받아 자체 닫기 버튼에 쓴다.
export function HalfSheet({
  height,
  bottomInset,
  onDismissed,
  closeLabel,
  children,
}: {
  height: number;
  bottomInset: number;
  onDismissed: () => void;
  closeLabel: string;
  children: (dismiss: () => void) => React.ReactNode;
}) {
  // 시트 Y 오프셋(0=완전 열림, height=완전 닫힘). transform은 native driver 사용.
  // Animated.Value는 안정 인스턴스라 useState lazy-init로 보관(ref 접근 금지 규칙 회피).
  const [translateY] = useState(() => new Animated.Value(0));

  const dismiss = () => {
    Animated.timing(translateY, {
      toValue: height,
      duration: 200,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onDismissed();
    });
  };

  // grabber 전용 PanResponder. start에서 선점하지 않고(탭=일반 탭), 아래로 끄는 드래그에서만 responder 획득.
  // height가 회전 등으로 바뀌면 임계값이 함께 갱신되도록 deps에 둔다(별도 ref 불필요).
  const panResponder = useMemo(() => {
    const springBack = () =>
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && g.dy > Math.abs(g.dx),
      onPanResponderMove: (_, g) => translateY.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_, g) => {
        if (g.dy > height * 0.25 || g.vy > 0.5) dismiss();
        else springBack();
      },
      onPanResponderTerminate: springBack,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height]);

  return (
    <View style={[styles.sheet, { paddingBottom: bottomInset }]} pointerEvents="box-none">
      <Animated.View style={[styles.card, { height, transform: [{ translateY }] }]}>
        {/* 드래그(아래로 끌어 닫기)는 외부 View가 move 시 responder 획득.
            탭(닫기)은 내부 Pressable onPress가 처리 → 탭/드래그 자연 분기. */}
        <View {...panResponder.panHandlers}>
          <Pressable
            style={styles.grabberHit}
            onPress={dismiss}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
          >
            <View style={styles.grabber} />
          </Pressable>
        </View>
        {children(dismiss)}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
  },
  card: {
    // 높이는 인라인으로 확정 px 주입(퍼센트-of-불확정 회피).
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 4,
  },
  // grabber 탭/드래그 hit area. 시각 막대(36×4)만으로는 너무 작아 드래그가 거의 인식되지 않으므로
  // 시트 상단 48px를 통째로 hit area로 확보(탭=닫기, 아래 드래그=dismiss 공용). 외부 panHandlers View가 감싼다.
  grabberHit: {
    alignSelf: 'stretch',
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
});
