import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../constants/theme';

// 모바일 Floating 버튼 묶음(오른쪽 아래): 펜 · 스티커 · 전체 보기 · 목록(개수). ADR-010 빈도순.
// 중립색(흰 배경+보더) + 44 + 약한 그림자 — 색은 지도 위 잉크(사람) 전용으로 보존.
export function BoardFabGroup({
  bottom,
  penMode,
  stickerMode,
  count,
  onTogglePen,
  onToggleSticker,
  onRecenter,
  onOpenList,
}: {
  bottom: number;
  penMode: boolean;
  stickerMode: boolean;
  count: number;
  onTogglePen: () => void;
  onToggleSticker: () => void;
  onRecenter: () => void;
  onOpenList: () => void;
}) {
  return (
    <View style={[styles.group, { bottom }]} pointerEvents="box-none">
      {/* 펜: ON 시 지도 이동이 잠기고 손가락으로 선을 그린다(내 잉크 soft 색). */}
      <Pressable
        style={[styles.fab, penMode && styles.fabActive]}
        onPress={onTogglePen}
        accessibilityRole="button"
        accessibilityLabel="펜으로 그리기"
        accessibilityState={{ selected: penMode }}
      >
        <Text style={[styles.icon, penMode && styles.iconActive]}>✎</Text>
      </Pressable>
      {/* 스티커 도구(P0): ON 시 지도 탭으로 지리 고정 스티커 배치. */}
      <Pressable
        style={[styles.fab, stickerMode && styles.fabActive]}
        onPress={onToggleSticker}
        accessibilityRole="button"
        accessibilityLabel="스티커 모드"
      >
        <Text style={styles.icon}>✨</Text>
      </Pressable>
      {/* Recenter(Utility): 전체 장소 fitBounds. 목록 위에 위치. */}
      <Pressable
        style={styles.fab}
        onPress={onRecenter}
        accessibilityRole="button"
        accessibilityLabel="전체 장소 보기"
      >
        <Text style={styles.icon}>⊙</Text>
      </Pressable>
      <Pressable
        style={styles.fab}
        onPress={onOpenList}
        accessibilityRole="button"
        accessibilityLabel={`목록 ${count}개 열기`}
      >
        <Text style={styles.icon}>☰</Text>
        <Text style={styles.count}>{count}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    position: 'absolute',
    right: spacing.lg,
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  fabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  icon: { fontSize: 16, color: colors.textStrong, marginRight: spacing.xs },
  iconActive: { color: colors.onPrimary },
  count: { ...typography.label, color: colors.textStrong, fontWeight: '700' },
});
