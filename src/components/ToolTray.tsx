import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  colors,
  numeric,
  radius,
  shadows,
  spacing,
  typography,
  type Ink,
} from '../constants/theme';
import type { CanvasTool } from '../hooks/useCanvasTools';
import { useSeenHints } from '../hooks/useSeenHints';
import { prefersReducedMotion, SNAPPY_EASING } from '../utils/motion';
import { Icon, type IconName } from './Icon';
import { StickerChip, StickerDrawer } from './StickerDrawer';

// 필통: 지도 아래에 늘 놓인 도구 줄. 그리기가 숨은 모드가 아니라 손에 드는 도구가 되도록(2026-10-31 경험 설계).
// 아무것도 안 든 게 기본(한 손가락 = 지도 이동). 도구를 들면 한 손가락은 그 도구, 두 손가락은 지도 이동. 든 도구를 다시 누르면 내려놓는다.
// 2026-11-01 실기기 의견으로 다시 짰다: "이동" 칸을 빼고(내려놓기 = 다시 누르기), 핀은 그리기 도구와 떨어진 칸에,
// 되돌리기는 도구와 상관없이 늘 같은 자리(오른쪽 위 둥근 단추 줄)에, 도구 설명은 그 도구를 처음 들 때 한 번만.
// 위쪽 줄: 왼쪽 범례(장소 목록), 오른쪽 되돌리기 · 바탕 고르기 · 전체 보기. 스티커를 들면 그 위에 스티커 서랍.

const TOOLS: { tool: CanvasTool; icon: IconName; label: string }[] = [
  { tool: 'pencil', icon: 'pencil', label: '연필' },
  { tool: 'ink', icon: 'pen', label: '잉크' },
  { tool: 'marker', icon: 'marker', label: '형광펜' },
  { tool: 'string', icon: 'string', label: '실 자' },
  { tool: 'sticker', icon: 'sticker', label: '스티커' },
];

// 처음 들 때 한 번만 보여 주는 설명
const HINTS: Partial<Record<CanvasTool, string>> = {
  pencil: '아직 정하지 않은 길은 연필로 그어요',
  ink: '정한 길, 다녀온 길은 잉크로 그어요',
  marker: '마음에 드는 동네를 칠해요',
  string: '두 곳을 차례로 누르면 거리를 재요',
  sticker: '고른 스티커는 지도를 누르면 붙어요',
  pin: '가게 근처를 누르면 가장 가까운 가게에 꽂혀요',
};
const DRAW_TOOLS: CanvasTool[] = ['pencil', 'ink', 'marker', 'string'];
// 도구 설명에 처음 한 번 덧붙이는 공통 안내
const TWO_FINGER = { key: 'two-finger', text: '지도는 두 손가락으로 움직여요' };
const PUT_DOWN = { key: 'put-down', text: '다시 누르면 내려놓아요' };
const HINT_MS = 4500;

export function ToolTray({
  bottom,
  ink,
  tool,
  onPick,
  pinBusy = false,
  sticker,
  recentStickers,
  onPickSticker,
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
  onPick: (tool: CanvasTool) => void; // 같은 도구를 다시 고르면 내려놓는다(useCanvasTools)
  pinBusy?: boolean; // 핀 도구로 누른 자리 둘레 가게를 찾는 중
  sticker: string;
  recentStickers: string[];
  onPickSticker: (sticker: string) => void;
  canUndo: boolean;
  onUndo: () => void;
  placeCount: number;
  onOpenLegend?: () => void; // 태블릿은 옆 패널이 늘 목록이라 없음
  onOpenStyles: () => void; // 이 지도의 바탕 고르기
  onRecenter: () => void;
}) {
  const seen = useSeenHints();
  const [hint, setHint] = useState<{ tool: CanvasTool; lines: string[] } | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (hintTimer.current) clearTimeout(hintTimer.current);
    },
    []
  );
  // 스티커 서랍: 스티커를 들 때 열리고, 하나 고르면 접힌다
  const [drawerOpen, setDrawerOpen] = useState(false);

  const pick = (next: CanvasTool) => {
    onPick(next);
    if (next === tool) return; // 내려놓기
    if (next === 'sticker') setDrawerOpen(true);
    if (!seen.loaded) return;
    const lines: string[] = [];
    const text = HINTS[next];
    if (text && !seen.hasSeen(next)) {
      lines.push(text);
      seen.markSeen(next);
      if (DRAW_TOOLS.includes(next) && !seen.hasSeen(TWO_FINGER.key)) {
        lines.push(TWO_FINGER.text);
        seen.markSeen(TWO_FINGER.key);
      }
      if (!seen.hasSeen(PUT_DOWN.key)) {
        lines.push(PUT_DOWN.text);
        seen.markSeen(PUT_DOWN.key);
      }
    }
    if (hintTimer.current) clearTimeout(hintTimer.current);
    if (!lines.length) {
      setHint(null);
      return;
    }
    setHint({ tool: next, lines });
    hintTimer.current = setTimeout(() => setHint(null), HINT_MS + (lines.length - 1) * 1500);
  };
  const pickSticker = (s: string) => {
    onPickSticker(s);
    setDrawerOpen(false);
  };

  const shownHint = hint && hint.tool === tool ? hint.lines : null;
  const stickerOn = tool === 'sticker';

  return (
    <View style={[styles.wrap, { bottom }]} pointerEvents="box-none">
      <View style={styles.column} pointerEvents="box-none">
        {shownHint ? (
          <Pressable
            style={styles.hint}
            onPress={() => setHint(null)}
            accessibilityRole="text"
            accessibilityLiveRegion="polite"
          >
            {shownHint.map((line, i) => (
              <Text key={line} style={i === 0 ? styles.hintText : styles.hintSub}>
                {line}
              </Text>
            ))}
          </Pressable>
        ) : null}

        {stickerOn && drawerOpen ? (
          <StickerDrawer ink={ink} value={sticker} recent={recentStickers} onPick={pickSticker} />
        ) : null}
        {stickerOn && !drawerOpen ? (
          <StickerChip ink={ink} value={sticker} onOpen={() => setDrawerOpen(true)} />
        ) : null}

        {stickerOn && drawerOpen ? null : (
          <View style={styles.corners} pointerEvents="box-none">
            {onOpenLegend ? (
              <Pressable
                style={({ pressed }) => [styles.legend, pressed && styles.pressed]}
                hitSlop={{ top: 6, bottom: 6 }}
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
              {canUndo ? (
                <RoundButton icon="undo" label="방금 한 것 되돌리기" onPress={onUndo} />
              ) : null}
              <RoundButton icon="layers" label="지도 바탕 고르기" onPress={onOpenStyles} />
              <RoundButton icon="compass" label="장소 전체 보기" onPress={onRecenter} />
            </View>
          </View>
        )}

        <View style={styles.trayRow}>
          <View style={styles.tray}>
            {TOOLS.map((t) => (
              <ToolButton
                key={t.tool}
                icon={t.icon}
                label={t.label}
                on={tool === t.tool}
                ink={ink}
                onPress={() => pick(t.tool)}
              />
            ))}
          </View>
          {/* 핀: 그리기 도구와 떨어진 칸. 들고 가게 근처를 누르면 가장 가까운 가게에 꽂힌다 */}
          <View style={styles.pinTray}>
            <ToolButton
              icon="pin"
              label="핀"
              on={tool === 'pin'}
              ink={ink}
              iconColor={colors.roadRed}
              busy={pinBusy}
              onPress={() => pick('pin')}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

function RoundButton({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.round, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Icon name={icon} size={22} />
    </Pressable>
  );
}

// 필통의 도구 하나. 들면 0.12초 만에 5px 들린다(하루에도 수십 번 누르는 것이라 짧게, 빨리 닿고 천천히 멈추는 곡선).
// 진동(selectHaptic)은 같은 순간 onPick 에서 울린다. 동작 줄이기면 움직이지 않고 바로 그 자리.
function ToolButton({
  icon,
  label,
  on,
  ink,
  iconColor = colors.textStrong,
  busy = false,
  onPress,
}: {
  icon: IconName;
  label: string;
  on: boolean;
  ink: Ink;
  iconColor?: string;
  busy?: boolean; // 아이콘 자리에 도는 표시
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
      accessibilityLabel={on ? `${label}, 들고 있음. 다시 누르면 내려놓기` : label}
      accessibilityState={{ selected: on }}
    >
      <Animated.View
        style={[
          styles.tool,
          on && { backgroundColor: ink.tint },
          { transform: [{ translateY: lift }] },
        ]}
      >
        {busy ? (
          <ActivityIndicator size="small" color={ink.solid} style={styles.busy} />
        ) : (
          <Icon name={icon} size={24} color={on ? ink.solid : iconColor} />
        )}
        {/* 칸 폭이 정해진 도구 줄이라 큰 글씨 설정에서도 1.3배까지만(뜻은 아이콘·읽어 주기 이름이 같이 전한다) */}
        <Text
          style={[styles.toolLabel, on && { color: ink.text }]}
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
        >
          {label}
        </Text>
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
    alignItems: 'center',
  },
  // 가로 화면·태블릿에서 양끝까지 늘어나지 않게
  column: { width: '100%', maxWidth: 560, gap: spacing.sm },
  // 필통 판 + 핀 칸: 떠 있는 두 판(그림자 lifted). 도구는 아이콘 + 이름, 든 도구는 살짝 들려 잉크색.
  trayRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  tray: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    paddingVertical: spacing.xs,
    paddingHorizontal: 6,
    ...shadows.lifted,
  },
  pinTray: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    paddingVertical: spacing.xs,
    paddingHorizontal: 6,
    ...shadows.lifted,
  },
  tool: {
    width: 50,
    paddingTop: 6,
    paddingBottom: 4,
    alignItems: 'center',
    borderRadius: radius.field,
  },
  busy: { width: 24, height: 24 },
  toolLabel: { ...typography.caption, fontSize: 11, color: colors.textMuted, marginTop: 2 },
  // 처음 한 번 도구 설명: 먹색 말풍선(잠깐 떴다 사라진다, 누르면 바로 닫힘)
  hint: {
    alignSelf: 'center',
    maxWidth: '100%',
    backgroundColor: 'rgba(28, 28, 26, 0.92)',
    borderRadius: radius.field,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  hintText: { ...typography.label, color: colors.onPrimary, textAlign: 'center' },
  hintSub: { ...typography.caption, color: 'rgba(255,255,255,0.78)', textAlign: 'center' },
  pressed: { opacity: 0.6 },
  // 위쪽 줄: 범례(종이 꼬리표) · 되돌리기 · 바탕 · 전체 보기
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
  // 둥근 단추: 안드로이드 최소 터치 48dp
  round: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.paper,
  },
});
