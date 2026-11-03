import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../constants/theme';
import { Icon } from './Icon';

const TOUCH = 48; // 안드로이드 최소 터치 48dp

// 보드 지도 위 상단(2026-11-03 섞은 시안 — A 조용한 한 줄): 하얀 꼬리표·둥근 판 대신, 지도 이름을 인쇄 지도 지명처럼
// 지도 위에 바로 얹는다(종이색 후광). 왼쪽 뒤로, 오른쪽 "더 보기" 하나(바탕 고르기·지도 한 장으로 접기·이름 바꾸기 —
// MapMoreMenu). 찾기는 엄지 닿는 아래로 옮겼다(꽂은 곳 시트 맨 위 · 찾는 중엔 아래 입력칸).
export function BoardTopOverlay({
  topInset,
  title,
  people,
  onBack,
  onPressTitle,
  onPressMore,
  busy,
}: {
  topInset: number;
  title: string;
  people: { name: string; color: string }[];
  onBack: () => void;
  // 이름을 누르면 지도 이름 바꾸기
  onPressTitle: () => void;
  onPressMore: () => void;
  busy: boolean; // 지도 한 장 굽는 중 — 더 보기 자리에 도는 표시
}) {
  return (
    <View style={[styles.bar, { paddingTop: topInset + spacing.xs }]} pointerEvents="box-none">
      <Pressable
        style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="지도 서랍으로"
      >
        <View style={styles.paper}>
          <Icon name="back" size={22} />
        </View>
      </Pressable>
      <Pressable
        onPress={onPressTitle}
        style={({ pressed }) => [styles.titleBox, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`${title}, 이름 바꾸기`}
      >
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.people}>
          {people.map((p) => (
            <View key={p.name} style={styles.person}>
              <View style={[styles.dot, { backgroundColor: p.color }]} />
              <Text style={styles.personName} numberOfLines={1}>
                {p.name}
              </Text>
            </View>
          ))}
        </View>
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
        onPress={onPressMore}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel="더 보기: 지도 바탕, 지도 한 장으로 접기, 이름 바꾸기"
        accessibilityState={{ busy }}
      >
        <View style={styles.paper}>
          {busy ? (
            <ActivityIndicator size="small" color={colors.textStrong} />
          ) : (
            <Icon name="more" size={22} />
          )}
        </View>
      </Pressable>
    </View>
  );
}

// 지도 위 글자 후광: 인쇄 지도 지명처럼 종이색 테두리(어떤 바탕 위에서도 읽히게)
const HALO = {
  textShadowColor: 'rgba(250, 247, 240, 0.95)',
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: 5,
} as const;

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.xs,
  },
  btn: { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center' },
  // 아이콘 뒤 옅은 종이 동그라미 — 판처럼 떠 보이지 않고 지도 위에서 아이콘만 또렷하게
  paper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(250, 247, 240, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
  titleBox: { flex: 1, paddingTop: 6, paddingHorizontal: spacing.xs, minHeight: TOUCH },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.2,
    color: colors.textStrong,
    ...HALO,
  },
  people: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm + 2, marginTop: 1 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: 120 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  personName: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    color: colors.textStrong,
    flexShrink: 1,
    ...HALO,
  },
});
