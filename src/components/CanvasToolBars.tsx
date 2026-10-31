import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import type { MapObject } from '../types/models';
import { FloatingBar } from './FloatingBar';

// 편집 툴바(객체 선택 시, 지도 아래 가운데). 상태·저장은 useCanvasTools, 여기는 보이는 것만.
// 스티커·펜 바는 필통(ToolTray)으로 옮겼다(2026-10-31).

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
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 20 },
});
