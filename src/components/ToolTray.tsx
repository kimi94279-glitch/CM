import React, { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  colors,
  numeric,
  radius,
  shadows,
  spacing,
  typography,
  type Ink,
} from '../constants/theme';
import { STICKER_EMOJIS, type CanvasTool } from '../hooks/useCanvasTools';
import { prefersReducedMotion, SNAPPY_EASING } from '../utils/motion';
import { Icon, type IconName } from './Icon';

// 필통: 지도 아래에 늘 놓인 도구 줄. 그리기가 숨은 모드가 아니라 손에 드는 도구가 되도록(2026-10-31 경험 설계).
// 도구를 들면 한 손가락은 그리기, 두 손가락은 지도 이동. 같은 도구를 다시 누르면 손(지도 이동)으로 돌아간다.
// 위쪽 줄: 왼쪽 범례(장소 목록), 오른쪽 전체 보기. 도구를 들면 그 자리에 도구 안내 + 되돌리기(스티커는 스티커 고르기).

const TOOLS: { tool: CanvasTool; icon: IconName; label: string }[] = [
  { tool: 'hand', icon: 'hand', label: '이동' },
  { tool: 'pencil', icon: 'pencil', label: '연필' },
  { tool: 'ink', icon: 'pen', label: '잉크' },
  { tool: 'marker', icon: 'marker', label: '형광펜' },
  { tool: 'string', icon: 'string', label: '실 자' },
  { tool: 'sticker', icon: 'sticker', label: '스티커' },
];

const HINTS: Partial<Record<CanvasTool, string>> = {
  pencil: '아직 정하지 않은 길은 연필로. 지도는 두 손가락으로 움직여요',
  ink: '정한 길, 다녀온 길은 잉크로',
  marker: '마음에 드는 동네를 칠해요',
  string: '두 곳 사이를 끌면 거리를 재요',
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
  onOpenStyles,
  onRecenter,
}: {
  bottom: number;
  ink: Ink; // 내 잉크 — 든 도구 강조색
  tool: CanvasTool;
  onPick: (tool: CanvasTool) => void;
  onPin: () => void; // 핀: 지금 지도 가운데에 핀 꽂기
  stickerEmoji: string;
  onPickEmoji: (emoji: string) => void;
  canUndo: boolean;
  onUndo: () => void;
  placeCount: number;
  onOpenLegend?: () => void; // 태블릿은 옆 패널이 늘 목록이라 없음
  onOpenStyles: () => void; // 이 지도의 바탕 고르기
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
              style={[styles.emojiBtn, stickerEmoji === e && { backgroundColor: ink.tint }]}
              onPress={() => onPickEmoji(e)}
              accessibilityRole="button"
              accessibilityLabel={`스티커 ${e}`}
              accessibilityState={{ selected: stickerEmoji === e }}
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
            style={({ pressed }) => [
              styles.undo,
              !canUndo && styles.off,
              pressed && styles.pressed,
            ]}
            onPress={onUndo}
            disabled={!canUndo}
            accessibilityRole="button"
            accessibilityLabel="마지막 선 지우기"
          >
            <Icon name="undo" size={20} />
          </Pressable>
        </View>
      ) : (
        <View style={styles.corners} pointerEvents="box-none">
          {onOpenLegend ? (
            <Pressable
              style={({ pressed }) => [styles.legend, pressed && styles.pressed]}
              onPress={onOpenLegend}
              accessibilityRole="button"
              accessibilityLabel={`범례 열기, 장소 ${placeCount}곳`}
            >
              <Icon name="legend" size={16} color={colors.tagInk} />
              <Text style={styles.legendText}>범례</Text>
              <Text style={styles.legendCount}>{placeCount}</Text>
            </Pressable>
          ) : (
            <View />
          )}
          <View style={styles.roundGroup}>
            <Pressable
              style={({ pressed }) => [styles.round, pressed && styles.pressed]}
              onPress={onOpenStyles}
              accessibilityRole="button"
              accessibilityLabel="지도 바탕 고르기"
            >
              <Icon name="layers" size={22} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.round, pressed && styles.pressed]}
              onPress={onRecenter}
              accessibilityRole="button"
              accessibilityLabel="장소 전체 보기"
            >
              <Icon name="compass" size={22} />
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.tray}>
        {TOOLS.map((t) => (
          <ToolButton
            key={t.tool}
            icon={t.icon}
            label={t.label}
            on={tool === t.tool}
            ink={ink}
            onPress={() => onPick(t.tool)}
          />
        ))}
        <View style={styles.rule} />
        <Pressable
          style={({ pressed }) => [styles.tool, pressed && styles.pressed]}
          onPress={onPin}
          accessibilityRole="button"
          accessibilityLabel="지도 가운데에 핀 꽂기"
        >
          <Icon name="pin" size={24} color={colors.roadRed} />
          <Text style={styles.toolLabel}>핀</Text>
        </Pressable>
      </View>
    </View>
  );
}

// 필통의 도구 하나. 들면 0.12초 만에 5px 들린다(하루에도 수십 번 누르는 것이라 짧게, 빨리 닿고 천천히 멈추는 곡선).
// 진동(selectHaptic)은 같은 순간 onPick 에서 울린다. 동작 줄이기면 움직이지 않고 바로 그 자리.
function ToolButton({
  icon,
  label,
  on,
  ink,
  onPress,
}: {
  icon: IconName;
  label: string;
  on: boolean;
  ink: Ink;
  onPress: () => void;
}) {
  const [lift] = useState(() => new Animated.Value(on ? LIFT : 0));
  useEffect(() => {
    const to = on ? LIFT : 0;
    if (prefersReducedMotion()) {
      lift.setValue(to);
      return;
    }
    Animated.timing(lift, {
      toValue: to,
      duration: 120,
      easing: SNAPPY_EASING,
      useNativeDriver: true,
    }).start();
  }, [on, lift]);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: on }}
    >
      <Animated.View
        style={[
          styles.tool,
          on && { backgroundColor: ink.tint },
          { transform: [{ translateY: lift }] },
        ]}
      >
        <Icon name={icon} size={24} color={on ? ink.solid : colors.textStrong} />
        <Text style={[styles.toolLabel, on && { color: ink.text }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

const LIFT = -5;

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    gap: spacing.sm,
  },
  // 필통 판: 떠 있는 판(그림자 lifted). 도구는 아이콘 + 이름, 든 도구는 살짝 들려 잉크색.
  tray: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    ...shadows.lifted,
  },
  tool: {
    width: 46,
    paddingTop: 6,
    paddingBottom: 4,
    alignItems: 'center',
    borderRadius: radius.field,
  },
  toolLabel: { ...typography.caption, fontSize: 11, color: colors.textMuted, marginTop: 2 },
  // 그리기 도구와 핀 사이 괘선
  rule: { width: 1, height: 28, backgroundColor: colors.border },
  // 도구를 들었을 때 위쪽 줄: 안내 + 되돌리기, 스티커는 스티커 고르기
  context: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.field,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    maxWidth: '100%',
    ...shadows.paper,
  },
  hint: { ...typography.caption, color: colors.textStrong, flexShrink: 1, paddingLeft: spacing.xs },
  undo: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  off: { opacity: 0.3 },
  pressed: { opacity: 0.6 },
  emojiBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.field,
  },
  emoji: { fontSize: 22 },
  // 손일 때 위쪽 줄: 범례(종이 꼬리표) · 전체 보기
  corners: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.xs,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.tag,
    borderWidth: 1,
    borderColor: colors.tagRule,
    borderRadius: radius.tag,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.sm,
    ...shadows.paper,
  },
  legendText: { ...typography.label, color: colors.tagInk },
  legendCount: { ...typography.caption, ...numeric, color: colors.textMuted },
  roundGroup: { flexDirection: 'row', gap: spacing.sm },
  round: {
    width: 44,
    height: 44,
    borderRadius: radius.round,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.paper,
  },
});
