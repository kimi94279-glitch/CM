import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, spacing, typography } from '../constants/theme';
import { Button } from './Button';

interface PlaceDraftCardProps {
  name: string;
  onChangeName: (name: string) => void;
  fromKakao: boolean;
  saving: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  // 키보드가 올라오면 그만큼 카드를 올린다
  lift: number;
  bottomInset: number;
}

const NAME_MAX = 40;

// 핀 확정 카드: 지도를 움직여 가운데 핀 자리를 맞추고, 이름을 확인(고칠 수 있음)한 뒤 꽂는다.
// 저장되는 것은 사용자가 확정한 위치·이름뿐(ADR-016 Option C).
export function PlaceDraftCard({
  name,
  onChangeName,
  fromKakao,
  saving,
  error,
  onConfirm,
  onCancel,
  lift,
  bottomInset,
}: PlaceDraftCardProps) {
  const canSave = name.trim().length > 0 && !saving;
  return (
    <View style={[styles.card, { bottom: lift, paddingBottom: bottomInset + spacing.md }]}>
      <Text style={styles.hint}>지도를 움직여 가운데 핀을 정확한 자리에 맞춰 주세요</Text>
      <TextInput
        value={name}
        onChangeText={onChangeName}
        placeholder="장소 이름"
        placeholderTextColor={colors.textMuted}
        maxLength={NAME_MAX}
        style={styles.input}
        returnKeyType="done"
      />
      {fromKakao ? (
        <Text style={styles.source}>카카오에서 찾은 곳 · 이름은 바꿔도 돼요</Text>
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
