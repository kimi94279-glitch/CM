import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { colors, radius, shadows, spacing, typography, type Ink } from '../constants/theme';
import {
  isTextSticker,
  STICKER_TABS,
  STICKER_TEXT_MAX,
  stickerText,
  type StickerTabKey,
} from '../constants/stickers';
import { Icon } from './Icon';

// 스티커 서랍: 필통 위로 열리는 판(인스타 스토리 스티커처럼 위에 탭, 아래 판). 하나 고르면 접히고,
// 접힌 자리엔 고른 스티커 쪽지가 남는다 — 지도를 누를 때마다 그 스티커가 붙는다. 쪽지를 누르면 다시 연다.
export function StickerDrawer({
  ink,
  value,
  recent,
  onPick,
}: {
  ink: Ink;
  value: string;
  recent: string[];
  onPick: (sticker: string) => void;
}) {
  const [tab, setTab] = useState<StickerTabKey>(recent.length ? 'recent' : 'mood');
  const [custom, setCustom] = useState('');
  // 눕힌 폰처럼 키가 낮은 화면에선 판을 한 줄 반 높이로(지도가 남도록)
  const { height } = useWindowDimensions();
  const boardHeight = height < 500 ? 96 : 148;
  const items = tab === 'recent' ? recent : (STICKER_TABS.find((t) => t.key === tab)?.items ?? []);
  const emojis = items.filter((s) => !isTextSticker(s));
  const words = items.filter(isTextSticker);
  const submitCustom = () => {
    const t = custom.trim();
    if (!t) return;
    setCustom('');
    onPick(`t:${t}`);
  };

  return (
    <View style={styles.drawer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
        keyboardShouldPersistTaps="handled"
      >
        {STICKER_TABS.map((t) => {
          const on = t.key === tab;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              style={styles.tab}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.tabText, on && styles.tabTextOn]}>{t.label}</Text>
              <View style={[styles.tabRule, on && { backgroundColor: ink.solid }]} />
            </Pressable>
          );
        })}
      </ScrollView>
      <ScrollView
        style={[styles.board, { height: boardHeight }]}
        contentContainerStyle={styles.boardContent}
        keyboardShouldPersistTaps="handled"
      >
        {tab === 'word' ? (
          <View style={styles.customRow}>
            <TextInput
              value={custom}
              onChangeText={setCustom}
              placeholder="직접 쓰기"
              placeholderTextColor={colors.textFaint}
              maxLength={STICKER_TEXT_MAX}
              style={styles.customInput}
              returnKeyType="done"
              onSubmitEditing={submitCustom}
            />
            <Pressable
              onPress={submitCustom}
              disabled={!custom.trim()}
              style={({ pressed }) => [
                styles.customGo,
                { backgroundColor: ink.solid },
                !custom.trim() && styles.off,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="이 글자로 스티커 만들기"
            >
              <Icon name="check" size={20} color={colors.onPrimary} />
            </Pressable>
          </View>
        ) : null}
        {emojis.length ? (
          <View style={styles.grid}>
            {emojis.map((s) => (
              <Pressable
                key={s}
                onPress={() => onPick(s)}
                style={({ pressed }) => [
                  styles.cell,
                  value === s && { backgroundColor: ink.tint },
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`스티커 ${s}`}
                accessibilityState={{ selected: value === s }}
              >
                <Text style={styles.emoji}>{s}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {words.length ? (
          <View style={styles.words}>
            {words.map((s) => (
              <Pressable
                key={s}
                onPress={() => onPick(s)}
                style={({ pressed }) => [pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={`글자 스티커 ${stickerText(s)}`}
                accessibilityState={{ selected: value === s }}
              >
                <StickerFace sticker={s} ink={ink} selected={value === s} />
              </Pressable>
            ))}
          </View>
        ) : null}
        {tab === 'recent' && !recent.length ? (
          <Text style={styles.empty}>붙인 스티커가 여기 모여요</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

// 접힌 서랍: 지금 든 스티커 + 안내. 누르면 서랍을 다시 연다.
export function StickerChip({
  ink,
  value,
  onOpen,
}: {
  ink: Ink;
  value: string;
  onOpen: () => void;
}) {
  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`든 스티커 ${stickerText(value)}, 바꾸려면 누르세요`}
    >
      <StickerFace sticker={value} ink={ink} small />
      <Text style={styles.chipText}>지도를 누르면 붙어요</Text>
      <Text style={styles.chipChange}>바꾸기</Text>
    </Pressable>
  );
}

// 스티커 한 장의 얼굴(서랍·쪽지에서). 글자 스티커는 지도에 붙는 모양과 같은 흰 딱지 + 내 잉크 테두리.
function StickerFace({
  sticker,
  ink,
  selected = false,
  small = false,
}: {
  sticker: string;
  ink: Ink;
  selected?: boolean;
  small?: boolean;
}) {
  if (!isTextSticker(sticker)) {
    return <Text style={small ? styles.emojiSmall : styles.emoji}>{sticker}</Text>;
  }
  return (
    <View
      style={[
        styles.label,
        small && styles.labelSmall,
        { borderColor: ink.solid },
        selected && { backgroundColor: ink.tint },
      ]}
    >
      <Text style={[styles.labelText, small && styles.labelTextSmall, { color: ink.text }]}>
        {stickerText(sticker)}
      </Text>
    </View>
  );
}

const CELL = 48;

const styles = StyleSheet.create({
  drawer: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    paddingBottom: spacing.xs,
    ...shadows.lifted,
  },
  tabs: { paddingHorizontal: spacing.sm, gap: spacing.xs },
  tab: { paddingHorizontal: spacing.sm, paddingTop: spacing.sm + 2, alignItems: 'center' },
  tabText: { ...typography.label, color: colors.textMuted },
  tabTextOn: { color: colors.textStrong },
  tabRule: {
    marginTop: 6,
    height: 2,
    alignSelf: 'stretch',
    borderRadius: 1,
    backgroundColor: 'transparent',
  },
  board: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  boardContent: { padding: spacing.sm, gap: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  cell: {
    width: CELL,
    height: CELL,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.field,
  },
  emoji: { fontSize: 30, lineHeight: 38 },
  emojiSmall: { fontSize: 22, lineHeight: 28 },
  words: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  label: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  labelSmall: { borderWidth: 1.5, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  labelText: { fontSize: 15, lineHeight: 20, fontWeight: '800' },
  labelTextSmall: { fontSize: 13, lineHeight: 18 },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  customInput: {
    flex: 1,
    ...typography.body,
    color: colors.textStrong,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.field,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  customGo: {
    width: 40,
    height: 40,
    borderRadius: radius.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    paddingTop: spacing.lg,
  },
  chip: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.round,
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    paddingVertical: 6,
    ...shadows.paper,
  },
  chipText: { ...typography.caption, color: colors.textStrong },
  chipChange: { ...typography.caption, color: colors.textMuted, textDecorationLine: 'underline' },
  off: { opacity: 0.35 },
  pressed: { opacity: 0.6 },
});
