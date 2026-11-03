import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, numeric, radius, spacing, typography, type Ink } from '../constants/theme';
import type { CanvasTool } from '../hooks/useCanvasTools';
import { useSeenHints } from '../hooks/useSeenHints';
import { prefersReducedMotion, SNAPPY_EASING } from '../utils/motion';
import { Icon, type IconName } from './Icon';
import { StickerChip, StickerDrawer } from './StickerDrawer';

// 필통: 지도 아래에 늘 놓인 도구 줄. 그리기가 숨은 모드가 아니라 손에 드는 도구가 되도록(2026-10-31 경험 설계).
// 아무것도 안 든 게 기본(한 손가락 = 지도 이동). 도구를 들면 한 손가락은 그 도구, 두 손가락은 지도 이동. 든 도구를 다시 누르면 내려놓는다.
// 2026-11-03 섞은 시안(A 조용한 한 줄 + B 지도 앱 문법): 떠 있는 하얀 판 여러 개 대신 먹색 필통 하나 —
// 맨 앞 빨간 핀, 그다음 그리기 도구 다섯(아이콘만, 이름은 읽어 주기와 든 도구 표시로). 바탕 고르기는 위쪽 "더 보기"로 옮겼다.
// 필통 위 줄: 왼쪽 "꽂은 곳 N"(누르면 아래에서 꽂은 곳 시트 — 찾기도 거기), 오른쪽 되돌리기·전체 보기.
// 도구를 들면 더 조용하게: 왼쪽은 든 도구 이름, 오른쪽은 되돌리기만. 도구 설명은 처음 들 때 한 번만(먹색 말풍선).

const TOOLS: { tool: CanvasTool; icon: IconName; label: string }[] = [
  { tool: 'pencil', icon: 'pencil', label: '연필' },
  { tool: 'ink', icon: 'pen', label: '잉크' },
  { tool: 'marker', icon: 'marker', label: '형광펜' },
  { tool: 'string', icon: 'string', label: '실 자' },
  { tool: 'sticker', icon: 'sticker', label: '스티커' },
];
const TOOL_LABEL: Partial<Record<CanvasTool, string>> = {
  ...Object.fromEntries(TOOLS.map((t) => [t.tool, t.label])),
  pin: '핀',
};

// 처음 들 때 한 번만 보여 주는 설명
const HINTS: Partial<Record<CanvasTool, string>> = {
  pencil: '아직 정하지 않은 길은 연필로 그어요',
  ink: '정한 길, 다녀온 길은 잉크로 그어요',
  marker: '마음에 드는 동네를 칠해요',
  string: '두 곳을 차례로 누르면 거리를 재요',
  sticker: '고른 스티커는 지도를 누르면 붙어요',
  pin: '가게 근처를 누르면 가장 가까운 가게에 꽂혀요',
};
// 든 도구 이름 옆 짧은 손짓 안내(늘 보임 — 지금 한 손가락이 무엇을 하는지)
const HELD_NOTE: Partial<Record<CanvasTool, string>> = {
  pencil: '두 손가락으로 지도 이동',
  ink: '두 손가락으로 지도 이동',
  marker: '두 손가락으로 지도 이동',
  string: '두 곳을 차례로',
  pin: '가게 근처를 눌러요',
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
  onOpenPlaces,
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
  onOpenPlaces?: () => void; // 꽂은 곳 시트 열기. 태블릿·가로는 옆 패널이 늘 목록이라 없음
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
  const holding = tool !== 'hand';
  const heldNote = HELD_NOTE[tool];

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
          <View style={styles.over} pointerEvents="box-none">
            {holding && !stickerOn ? (
              // 든 도구: 이름 + 지금 한 손가락이 하는 일
              <View style={styles.held} accessibilityLiveRegion="polite">
                <View style={[styles.heldDot, { backgroundColor: ink.solid }]} />
                <Text style={styles.heldName}>{TOOL_LABEL[tool]}</Text>
                {heldNote ? <Text style={styles.heldNote}>{heldNote}</Text> : null}
              </View>
            ) : !holding && onOpenPlaces ? (
              // 꽂은 곳 쪽지: 위에 손잡이 — 누르면(끌어올리면) 아래에서 꽂은 곳 시트
              <Pressable
                style={({ pressed }) => [styles.peek, pressed && styles.pressed]}
                onPress={onOpenPlaces}
                hitSlop={{ top: 8, bottom: 4 }}
                accessibilityRole="button"
                accessibilityLabel={`꽂은 곳 ${placeCount}곳, 목록과 찾기 열기`}
              >
                <View style={styles.peekGrab} />
                <Icon name="legend" size={16} color={colors.onPrimary} />
                <Text style={styles.peekText}>꽂은 곳</Text>
                <Text style={styles.peekCount}>{placeCount}</Text>
              </Pressable>
            ) : (
              <View />
            )}
            <View style={styles.minis}>
              {canUndo ? <Mini icon="undo" label="방금 한 것 되돌리기" onPress={onUndo} /> : null}
              {holding ? null : <Mini icon="compass" label="장소 전체 보기" onPress={onRecenter} />}
            </View>
          </View>
        )}

        <View style={styles.pillRow}>
          <View style={styles.pill}>
            {/* 핀: 맨 앞 빨간 동그라미. 들고 가게 근처를 누르면 가장 가까운 가게에 꽂힌다 */}
            <ToolButton
              icon="pin"
              label="핀"
              on={tool === 'pin'}
              ink={ink}
              accent={colors.roadRed}
              busy={pinBusy}
              onPress={() => pick('pin')}
            />
            <View style={styles.gap} />
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
        </View>
      </View>
    </View>
  );
}

function Mini({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.mini, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Icon name={icon} size={22} color={colors.onPrimary} />
    </Pressable>
  );
}

// 필통의 도구 하나: 먹색 판 위 흰 아이콘. 들면 흰 동그라미 위 내 잉크색으로 0.12초 만에 살짝 들린다
// (하루에도 수십 번 누르는 것이라 짧게, 빨리 닿고 천천히 멈추는 곡선). 진동(selectHaptic)은 같은 순간 onPick 에서.
// accent 가 있으면(핀) 내려놓은 상태도 그 색 동그라미. 동작 줄이기면 움직이지 않고 바로 그 자리.
function ToolButton({
  icon,
  label,
  on,
  ink,
  accent,
  busy = false,
  onPress,
}: {
  icon: IconName;
  label: string;
  on: boolean;
  ink: Ink;
  accent?: string;
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
  const bg = on ? colors.surface : (accent ?? 'transparent');
  const fg = on ? (accent ?? ink.solid) : colors.onPrimary;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={on ? `${label}, 들고 있음. 다시 누르면 내려놓기` : label}
      accessibilityState={{ selected: on, busy }}
    >
      <Animated.View
        style={[styles.tool, { backgroundColor: bg }, { transform: [{ translateY: lift }] }]}
      >
        {busy ? (
          <ActivityIndicator size="small" color={fg} />
        ) : (
          <Icon name={icon} size={24} color={fg} />
        )}
      </Animated.View>
    </Pressable>
  );
}

const LIFT = -3;
const DARK = 'rgba(28, 28, 26, 0.92)'; // 인쇄 먹(textStrong) 판

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    alignItems: 'center',
  },
  // 가로 화면·태블릿에서 양끝까지 늘어나지 않게
  column: { width: '100%', maxWidth: 420, gap: spacing.sm },
  // 먹색 필통: 떠 있는 판 하나. 도구는 48dp 동그라미(안드로이드 최소 터치)
  pillRow: { alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
    borderRadius: 32,
    backgroundColor: DARK,
    paddingHorizontal: 8,
    gap: 2,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  gap: { width: 6 },
  tool: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 처음 한 번 도구 설명: 먹색 말풍선(잠깐 떴다 사라진다, 누르면 바로 닫힘)
  hint: {
    alignSelf: 'center',
    maxWidth: '100%',
    backgroundColor: DARK,
    borderRadius: radius.field,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  hintText: { ...typography.label, color: colors.onPrimary, textAlign: 'center' },
  hintSub: { ...typography.caption, color: 'rgba(255,255,255,0.78)', textAlign: 'center' },
  pressed: { opacity: 0.7 },
  // 필통 위 줄: 꽂은 곳 쪽지(또는 든 도구 이름) | 되돌리기 · 전체 보기
  over: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.xs,
  },
  peek: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 12,
    paddingRight: 14,
    borderRadius: 20,
    backgroundColor: DARK,
  },
  // 쪽지 위 작은 손잡이: 끌어올리면 시트가 나온다는 표시
  peekGrab: {
    position: 'absolute',
    top: -7,
    left: '50%',
    marginLeft: -12,
    width: 24,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(28, 28, 26, 0.5)',
  },
  peekText: { ...typography.label, fontSize: 13.5, color: colors.onPrimary },
  peekCount: {
    ...typography.label,
    ...numeric,
    fontSize: 13.5,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },
  held: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    backgroundColor: DARK,
    maxWidth: 260,
  },
  heldDot: { width: 9, height: 9, borderRadius: 5 },
  heldName: { ...typography.label, fontSize: 13, color: colors.onPrimary },
  heldNote: { ...typography.caption, color: 'rgba(255,255,255,0.72)', flexShrink: 1 },
  minis: { flexDirection: 'row', gap: spacing.sm },
  mini: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: DARK,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
