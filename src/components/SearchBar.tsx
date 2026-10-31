import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { Icon } from './Icon';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClose: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

// 활성 검색 입력(지도 위 상단에 뜬 판). 돋보기를 누르면 종이 꼬리표 자리에 뜬다.
// 왼쪽 뒤로 = 검색 닫기, 오른쪽 닫기 = 입력 지우기. 검색은 호출측에서 디바운스로 처리.
export function SearchBar({
  value,
  onChangeText,
  onClose,
  placeholder = '가고 싶은 곳 이름',
  autoFocus = true,
}: SearchBarProps) {
  return (
    <View style={styles.bar}>
      <Pressable
        onPress={onClose}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="검색 닫기"
        style={styles.side}
      >
        <Icon name="back" size={22} />
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
          style={styles.side}
        >
          <Icon name="close" size={18} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // 입력칸 판: 지도 위에 떠 있는 판(그림자 lifted), 입력칸 둥글기.
  bar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: radius.field,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xs,
    gap: spacing.xs,
    ...shadows.lifted,
  },
  side: { padding: spacing.xs },
  // 한 줄 입력칸은 줄 간격 없이(iOS 에서 글자가 아래로 치우친다)
  input: {
    flex: 1,
    ...typography.body,
    lineHeight: undefined,
    color: colors.textStrong,
    paddingVertical: 0,
  },
});
