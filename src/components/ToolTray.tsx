import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography, type Ink } from '../constants/theme';
import { STICKER_EMOJIS, type CanvasTool } from '../hooks/useCanvasTools';

// 필통: 지도 아래에 늘 놓인 도구 줄. 그리기가 숨은 모드가 아니라 손에 드는 도구가 되도록(2026-10-31 경험 설계).
// 도구를 들면 한 손가락은 그리기, 두 손가락은 지도 이동. 같은 도구를 다시 누르면 손(지도 이동)으로 돌아간다.
// 위쪽 줄: 왼쪽 범례(장소 목록), 오른쪽 전체 보기. 도구를 들면 그 자리에 도구 안내 + 되돌리기(스티커는 이모지 고르기).

const TOOLS: { tool: CanvasTool; icon: string; label: string }[] = [
  { tool: 'hand', icon: '✋', label: '이동' },
  { tool: 'pencil', icon: '✏️', label: '연필' },
  { tool: 'ink', icon: '🖋️', label: '잉크' },
  { tool: 'marker', icon: '🖍️', label: '형광펜' },
  { tool: 'string', icon: '🧵', label: '실 자' },
  { tool: 'sticker', icon: '✨', label: '스티커' },
];

const HINTS: Partial<Record<CanvasTool, string>> = {
  pencil: '연필 — 아직 정하지 않은 길 · 두 손가락으로 지도 이동',
  ink: '잉크 — 정한 길, 다녀온 길',
  marker: '형광펜 — 이 동네 좋아',
  string: '실 자 — 두 곳 사이를 끌어서 거리 재기',
};

export function ToolTray({
  bottom,
  ink,
  tool,
  onPick,
  onPin,
  stickerEmoji,
  onPickEmoji,
  canUndo,
  onUndo,
  placeCount,
  onOpenLegend,
  onRecenter,
}: {
  bottom: number;
  ink: Ink; // 내 잉크 — 든 도구 강조색
  tool: CanvasTool;
  onPick: (tool: CanvasTool) => void;
  onPin: () => void; // 📌: 지금 지도 가운데에 핀 꽂기
  stickerEmoji: string;
  onPickEmoji: (emoji: string) => void;
  canUndo: boolean;
  onUndo: () => void;
  placeCount: number;
  onOpenLegend?: () => void; // 태블릿은 옆 패널이 늘 목록이라 없음
  onRecenter: () => void;
}) {
  const hint = HINTS[tool];
  return (
    <View style={[styles.wrap, { bottom }]} pointerEvents="box-none">
      {tool === 'sticker' ? (
        <View style={styles.context}>
          {STICKER_EMOJIS.map((e) => (
            <Pressable
              key={e}
              style={[styles.emojiBtn, stickerEmoji === e && styles.emojiOn]}
              onPress={() => onPickEmoji(e)}
              accessibilityRole="button"
              accessibilityLabel={`스티커 ${e}`}
            >
              <Text style={styles.emoji}>{e}</Text>
            </Pressable>
          ))}
        </View>
      ) : hint ? (
        <View style={styles.context}>
          <Text style={styles.hint} numberOfLines={1}>
            {hint}
          </Text>
          <Pressable
            style={[styles.undo, !canUndo && styles.undoOff]}
            onPress={onUndo}
            disabled={!canUndo}
            accessibilityRole="button"
            accessibilityLabel="마지막 선 지우기"
          >
            <Text style={styles.undoIcon}>↶</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.corners} pointerEvents="box-none">
          {onOpenLegend ? (
            <Pressable
              style={styles.legend}
              onPress={onOpenLegend}
              accessibilityRole="button"
              accessibilityLabel={`범례 ${placeCount}곳 열기`}
            >
              <Text style={styles.legendText}>범례</Text>
              <Text style={styles.legendCount}>{placeCount}</Text>
            </Pressable>
          ) : (
            <View />
          )}
          <Pressable
            style={styles.round}
            onPress={onRecenter}
            accessibilityRole="button"
            accessibilityLabel="전체 장소 보기"
          >
            <Text style={styles.roundIcon}>⊙</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.tray}>
        {TOOLS.map((t) => {
          const on = tool === t.tool;
          return (
            <Pressable
              key={t.tool}
              style={[styles.tool, on && [styles.toolOn, { backgroundColor: ink.tint }]]}
              onPress={() => onPick(t.tool)}
              accessibilityRole="button"
              accessibilityLabel={t.label}
              accessibilityState={{ selected: on }}
            >
              <Text style={styles.toolIcon}>{t.icon}</Text>
              <Text style={[styles.toolLabel, on && [styles.toolLabelOn, { color: ink.text }]]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          style={styles.tool}
          onPress={onPin}
          accessibilityRole="button"
          accessibilityLabel="지도 가운데에 핀 꽂기"
        >
          <Text style={styles.toolIcon}>📌</Text>
          <Text style={styles.toolLabel}>핀</Text>
        </Pressable>
      </View>
    </View>
  );
}

const shadow = {
  shadowColor: '#000',
  shadowOpacity: 0.16,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 3 },
  elevation: 5,
} as const;

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    gap: spacing.sm,
  },
  tray: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 22,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    ...shadow,
  },
  tool: {
    width: 46,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    borderRadius: 14,
  },
  toolOn: {
    transform: [{ translateY: -5 }],
  },
  toolIcon: { fontSize: 21 },
  toolLabel: { ...typography.caption, fontSize: 10.5, color: colors.textMuted, marginTop: 1 },
  toolLabelOn: { fontWeight: '800' },
  // 도구를 들었을 때 위쪽 줄: 안내 + 되돌리기, 스티커는 이모지 고르기
  context: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    maxWidth: '100%',
    ...shadow,
  },
  hint: { ...typography.caption, color: colors.textStrong, flexShrink: 1, paddingLeft: spacing.xs },
  undo: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  undoOff: { opacity: 0.3 },
  undoIcon: { fontSize: 20, color: colors.textStrong },
  emojiBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.card,
  },
  emojiOn: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.primary },
  emoji: { fontSize: 22 },
  // 손일 때 위쪽 줄: 범례(종이 꼬리표 모양) · 전체 보기
  corners: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.xs,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    backgroundColor: '#FFFAF0',
    borderWidth: 1,
    borderColor: '#E3D6BD',
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...shadow,
  },
  legendText: { ...typography.label, fontWeight: '800', color: '#3A2F22' },
  legendCount: { ...typography.caption, fontWeight: '700', color: '#8A7A62' },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  roundIcon: { fontSize: 18, color: colors.textStrong },
});
