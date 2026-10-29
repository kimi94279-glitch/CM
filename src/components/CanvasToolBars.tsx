import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, type Ink } from '../constants/theme';
import { STICKER_EMOJIS } from '../hooks/useCanvasTools';
import type { MapObject } from '../types/models';
import { FloatingBar } from './FloatingBar';

// 캔버스 도구 바들(지도 아래 가운데). 상태·저장은 useCanvasTools, 여기는 보이는 것만.

// 스티커 도구 바(P0): 이모지 선택 + 종료.
export function StickerBar({
  bottom,
  emoji,
  onPick,
  onClose,
}: {
  bottom: number;
  emoji: string;
  onPick: (emoji: string) => void;
  onClose: () => void;
}) {
  return (
    <FloatingBar
      bottom={bottom}
      hint={`지도를 탭해 ${emoji} 스티커를 놓으세요`}
      onClose={onClose}
      closeLabel="스티커 모드 종료"
    >
      {STICKER_EMOJIS.map((e) => (
        <Pressable
          key={e}
          style={[styles.emojiBtn, emoji === e && styles.emojiSelected]}
          onPress={() => onPick(e)}
          accessibilityRole="button"
          accessibilityLabel={`스티커 ${e}`}
        >
          <Text style={styles.emoji}>{e}</Text>
        </Pressable>
      ))}
    </FloatingBar>
  );
}

// 펜 바: 내 잉크 표시 + 되돌리기(이번 펜 모드에서 그린 선) + 종료.
export function PenBar({
  bottom,
  ink,
  canUndo,
  onUndo,
  onClose,
}: {
  bottom: number;
  ink: Ink;
  canUndo: boolean;
  onUndo: () => void;
  onClose: () => void;
}) {
  return (
    <FloatingBar
      bottom={bottom}
      hint="손가락으로 그려요 · 지도를 움직이려면 펜을 꺼요"
      onClose={onClose}
      closeLabel="펜 끄기"
    >
      <View style={[styles.penInk, { backgroundColor: ink.soft, borderColor: ink.solid }]} />
      <Pressable
        style={[styles.iconBtn, !canUndo && styles.undoEmpty]}
        onPress={onUndo}
        disabled={!canUndo}
        accessibilityRole="button"
        accessibilityLabel="마지막 선 지우기"
      >
        <Text style={styles.icon}>↶</Text>
      </Pressable>
    </FloatingBar>
  );
}

// 편집 툴바(객체 선택 시): 크기 −/＋ · 삭제. 이동은 지도에서 객체를 드래그.
export function ObjectEditBar({
  bottom,
  object,
  onResize,
  onDelete,
  onClose,
}: {
  bottom: number;
  object: MapObject;
  onResize: (factor: number) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <FloatingBar
      bottom={bottom}
      hint={
        object.type === 'draw' ? '굵기 조정은 자동 저장' : '드래그로 이동 · 크기 조정은 자동 저장'
      }
      onClose={onClose}
      closeLabel="선택 해제"
    >
      <Pressable
        style={styles.iconBtn}
        onPress={() => onResize(1 / 1.25)}
        accessibilityRole="button"
        accessibilityLabel="크기 줄이기"
      >
        <Text style={styles.icon}>➖</Text>
      </Pressable>
      <Pressable
        style={styles.iconBtn}
        onPress={() => onResize(1.25)}
        accessibilityRole="button"
        accessibilityLabel="크기 키우기"
      >
        <Text style={styles.icon}>➕</Text>
      </Pressable>
      <Pressable
        style={styles.iconBtn}
        onPress={onDelete}
        accessibilityRole="button"
        accessibilityLabel="삭제"
      >
        <Text style={styles.icon}>🗑</Text>
      </Pressable>
    </FloatingBar>
  );
}

const styles = StyleSheet.create({
  emojiBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.card,
  },
  emojiSelected: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  emoji: { fontSize: 22 },
  // 내 잉크 견본(soft 채움 + solid 테두리)
  penInk: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    marginHorizontal: spacing.xs,
  },
  // 되돌릴 선이 없으면 흐리게
  undoEmpty: { opacity: 0.3 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 20 },
});
