import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, spacing, typography } from '../constants/theme';
import type { PlaceDraftKind } from '../utils/placeDraft';
import { Button } from './Button';

interface PlaceDraftCardProps {
  kind: PlaceDraftKind;
  name: string;
  onChangeName: (name: string) => void;
  saving: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  // publicUnsure: "다른 곳이에요" → 직접 찍기로 바꾼다
  onSwitchDirect?: () => void;
  // 키보드가 올라오면 그만큼 카드를 올린다
  lift: number;
  bottomInset: number;
}

const NAME_MAX = 40;

const SOURCE_TEXT: Record<PlaceDraftKind, string | null> = {
  public: '공공데이터에 등록된 이름이에요 · 바꿔도 돼요',
  publicUnsure: '가까이 등록된 가게예요. 찾던 곳이 맞나요?',
  noMatch: '저장할 수 있는 장소 정보가 없어서 직접 찍어요 · 이름도 직접 써 주세요',
  direct: null,
};

// 핀 확정 카드: 지도를 움직여 가운데 핀 자리를 맞추고, 이름을 확인(고칠 수 있음)한 뒤 꽂는다.
// 저장되는 이름·위치는 공공데이터 레코드 또는 사용자가 정한 값뿐(ADR-016 Option D′).
export function PlaceDraftCard({
  kind,
  name,
  onChangeName,
  saving,
  error,
  onConfirm,
  onCancel,
  onSwitchDirect,
  lift,
  bottomInset,
}: PlaceDraftCardProps) {
  const canSave = name.trim().length > 0 && !saving;
  const source = SOURCE_TEXT[kind];
  return (
    <View style={[styles.card, { bottom: lift, paddingBottom: bottomInset + spacing.md }]}>
      <Text style={styles.hint}>
        {kind === 'noMatch'
          ? '근처까지 왔어요. 지도를 움직여 가운데 핀을 그 자리에 맞춰 주세요'
          : '지도를 움직여 가운데 핀을 정확한 자리에 맞춰 주세요'}
      </Text>
      <TextInput
        value={name}
        onChangeText={onChangeName}
        placeholder={kind === 'noMatch' ? '이름을 직접 써 주세요' : '장소 이름'}
        placeholderTextColor={colors.textMuted}
        maxLength={NAME_MAX}
        style={styles.input}
        returnKeyType="done"
      />
      {source ? <Text style={styles.source}>{source}</Text> : null}
      {kind === 'publicUnsure' && onSwitchDirect ? (
        <Text style={styles.switchLink} onPress={onSwitchDirect} accessibilityRole="button">
          다른 곳이에요 → 직접 찍기
        </Text>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.actions}>
        <Button title="취소" variant="secondary" onPress={onCancel} style={styles.action} />
        <Button
          title="여기에 핀 꽂기"
          onPress={onConfirm}
          disabled={!canSave}
          loading={saving}
          style={styles.action}
        />
      </View>
    </View>
  );
}

// 지도 가운데 고정 핀(누르면 지나감). 핀 끝이 화면 정중앙을 가리킨다.
export function CenterPin({ color }: { color: string }) {
  return (
    <View style={styles.pinWrap} pointerEvents="none">
      <View style={[styles.pinHead, { backgroundColor: color }]} />
      <View style={[styles.pinStem, { backgroundColor: color }]} />
    </View>
  );
}

const PIN_HEAD = 22;
const PIN_STEM = 14;

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 4,
  },
  hint: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.sm },
  input: {
    ...typography.body,
    color: colors.textStrong,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.field,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  source: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  switchLink: {
    ...typography.caption,
    color: colors.textStrong,
    fontWeight: '600',
    marginTop: spacing.xs,
    paddingVertical: spacing.xs,
  },
  error: { ...typography.caption, color: colors.danger, marginTop: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  action: { flex: 1 },
  pinWrap: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -PIN_HEAD / 2,
    marginTop: -(PIN_HEAD + PIN_STEM),
    alignItems: 'center',
  },
  pinHead: {
    width: PIN_HEAD,
    height: PIN_HEAD,
    borderRadius: PIN_HEAD / 2,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  pinStem: { width: 3, height: PIN_STEM, marginTop: -2, borderRadius: 1.5 },
});
