import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, spacing, typography } from '../constants/theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClose: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

// 활성 검색 입력(지도 위 상단 floating pill). 표시 전용 MapSearchBar 와 시각 토큰을 맞춘다.
// 좌측 ‹ = 검색 닫기, 우측 ✕ = 입력 지우기. 검색은 호출측에서 디바운스로 처리.
export function SearchBar({
  value,
  onChangeText,
  onClose,
  placeholder = '어디 가고 싶어?',
  autoFocus = true,
}: SearchBarProps) {
  return (
    <View style={styles.bar}>
      <Pressable
        onPress={onClose}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="검색 닫기"
      >
        <Text style={styles.back}>‹</Text>
      </Pressable>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoFocus={autoFocus}
        autoCorrect={false}
        returnKeyType="search"
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="입력 지우기"
        >
          <Text style={styles.clear}>✕</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Floating pill: 보더 대신 그림자 중심 + 큰 라운드로 "지도 위에 떠 있는 탐색 도구" 인상.
  bar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  back: { fontSize: 26, lineHeight: 28, color: colors.textStrong, paddingHorizontal: spacing.xs },
  input: { flex: 1, ...typography.body, color: colors.textStrong, paddingVertical: 0 },
  clear: { fontSize: 16, color: colors.textMuted, paddingHorizontal: spacing.xs },
});
