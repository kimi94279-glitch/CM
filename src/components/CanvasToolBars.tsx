import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { colors } from '../constants/theme';
import type { MapObject } from '../types/models';
import { FloatingBar } from './FloatingBar';
import { Icon } from './Icon';

// 편집 툴바(객체 선택 시, 지도 아래 가운데). 상태·저장은 useCanvasTools, 여기는 보이는 것만.
// 스티커·펜 바는 필통(ToolTray)으로 옮겼다(2026-10-31).

// 편집 툴바(객체 선택 시): 크기 줄이기·키우기, 지우기. 이동은 지도에서 객체를 끌어서.
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
  const isLine = object.type === 'draw';
  return (
    <FloatingBar
      bottom={bottom}
      hint={isLine ? '굵기는 바꾸는 대로 저장돼요' : '끌어서 옮겨요. 크기는 바꾸는 대로 저장돼요'}
      onClose={onClose}
      closeLabel="선택 풀기"
    >
      <Pressable
        style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
        onPress={() => onResize(1 / 1.25)}
        accessibilityRole="button"
        accessibilityLabel={isLine ? '가늘게' : '작게'}
      >
        <Icon name="minus" size={22} />
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
        onPress={() => onResize(1.25)}
        accessibilityRole="button"
        accessibilityLabel={isLine ? '굵게' : '크게'}
      >
        <Icon name="plus" size={22} />
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
        onPress={onDelete}
        accessibilityRole="button"
        accessibilityLabel="지우기"
      >
        <Icon name="trash" size={22} color={colors.danger} />
      </Pressable>
    </FloatingBar>
  );
}

const styles = StyleSheet.create({
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
});
