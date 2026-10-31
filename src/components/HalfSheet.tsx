import React, { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, PanResponder, Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, shadows, spacing } from '../constants/theme';
import {
  prefersReducedMotion,
  projectedDistance,
  rubberBand,
  SHEET_EASING,
  SPRING_DISMISS,
  SPRING_SETTLE,
} from '../utils/motion';

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
  // 처음엔 닫힌 자리(height)에서 시작해 올라온다. 동작 줄이기 설정이면 연 자리에서 투명도로만 나타난다.
  const [reduced] = useState(prefersReducedMotion);
  const [translateY] = useState(() => new Animated.Value(reduced ? 0 : height));
  const [opacity] = useState(() => new Animated.Value(reduced ? 0 : 1));
  useEffect(() => {
    if (reduced) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
      return;
    }
    Animated.timing(translateY, {
      toValue: 0,
      duration: 280,
      easing: SHEET_EASING,
      useNativeDriver: true,
    }).start();
    // 열릴 때 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 닫기. 여는 중에 닫아도 여는 움직임을 멈추고 닫는다(새 움직임이 앞의 것을 대신한다).
  // 끌다가 놓으면 손가락 속도(px/ms)를 스프링이 이어받고, 탭·버튼으로 닫으면 같은 곡선으로 미끄러진다.
  const close = (velocity: number) => {
    translateY.stopAnimation();
    const anim = reduced
      ? Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        })
      : velocity > 0
        ? Animated.spring(translateY, {
            toValue: height,
            velocity: velocity * 1000, // RN 스프링 속도 단위는 px/s
            overshootClamping: true,
            ...SPRING_DISMISS,
            useNativeDriver: true,
          })
        : Animated.timing(translateY, {
            toValue: height,
            duration: 200,
            easing: SHEET_EASING,
            useNativeDriver: true,
          });
    anim.start(({ finished }) => {
      if (finished) onDismissed();
    });
  };
  const dismiss = () => close(0);

  // 화면에 쓰는 값: 연 자리(0)보다 위로 끌면 고무줄처럼 덜 따라온다(놓으면 제자리로).
  // interpolate 는 직선 구간만 되므로 고무줄 곡선을 몇 점으로 나눠 근사한다.
  const shownY = useMemo(() => {
    const over = [-800, -400, -200, -100, -40, 0];
    return translateY.interpolate({
      inputRange: [...over, 1],
      outputRange: [...over.map((o) => rubberBand(o, height)), 1],
      extrapolateLeft: 'clamp',
      extrapolateRight: 'extend',
    });
  }, [translateY, height]);

  // grabber 전용 PanResponder. start에서 선점하지 않고(탭=일반 탭), 아래로 끄는 드래그에서만 responder 획득.
  // height가 회전 등으로 바뀌면 임계값이 함께 갱신되도록 deps에 둔다(별도 ref 불필요).
  const panResponder = useMemo(() => {
    const settle = (velocity: number) =>
      Animated.spring(translateY, {
        toValue: 0,
        velocity: velocity * 1000,
        ...SPRING_SETTLE,
        useNativeDriver: true,
      }).start();
    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && g.dy > Math.abs(g.dx),
      // 끌기 시작한 자리(여는 중에 잡으면 0 이 아니다)를 offset 으로 빼 두고 그 자리에서부터 따라오게 — 위로 튀지 않게.
      onPanResponderGrant: () => {
        translateY.stopAnimation();
        translateY.extractOffset();
      },
      onPanResponderMove: (_, g) => translateY.setValue(g.dy),
      // 놓은 속도로 멈출 자리를 예측해, 시트 높이의 40% 를 넘어가면 닫고 아니면 제자리로.
      onPanResponderRelease: (_, g) => {
        translateY.flattenOffset();
        if (g.dy > 0 && g.dy + projectedDistance(g.vy) > height * 0.4) close(Math.max(g.vy, 0));
        else settle(g.vy);
      },
      onPanResponderTerminate: () => {
        translateY.flattenOffset();
        settle(0);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height]);

  return (
    <View style={[styles.sheet, { paddingBottom: bottomInset }]} pointerEvents="box-none">
      {/* 그림자는 바깥 판, 둥근 모서리 자르기는 안쪽 판 — iOS 는 overflow:hidden 인 판의 그림자를 같이 잘라 버린다. */}
      <Animated.View
        style={[styles.shadow, { height, opacity, transform: [{ translateY: shownY }] }]}
      >
        <View style={styles.card}>
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
        </View>
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
  // 높이는 인라인으로 확정 px 주입(퍼센트-of-불확정 회피). 그림자를 그리려면 배경이 있어야 해서 바깥 판에도 같은 색·둥글기.
  shadow: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    ...shadows.lifted,
  },
  card: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    borderColor: colors.border,
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
