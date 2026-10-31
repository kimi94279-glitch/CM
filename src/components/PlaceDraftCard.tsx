import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, shadows, spacing, typography } from '../constants/theme';
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
  // publicUnsure: "다른 곳이에요" → 카카오 실시간 핀(가능하면) 또는 직접 찍기로 바꾼다
  onSwitchOther?: () => void;
  canSwitchToLive?: boolean;
  // live: 카카오에서 불러온 이름·주소(표시만, 저장하지 않음)
  liveInfo?: { name: string; address: string } | null;
  // 키보드가 올라오면 그만큼 카드를 올린다
  lift: number;
  bottomInset: number;
}

const NAME_MAX = 40;

const HINT_TEXT: Record<PlaceDraftKind, string> = {
  public: '지도를 움직여 가운데 핀을 정확한 자리에 맞춰 주세요',
  publicUnsure: '지도를 움직여 가운데 핀을 정확한 자리에 맞춰 주세요',
  live: '카카오 지도의 위치로 꽂아요. 위치는 볼 때마다 카카오에서 불러와요',
  noMatch: '근처까지 왔어요. 지도를 움직여 가운데 핀을 그 자리에 맞춰 주세요',
  direct: '지도를 움직여 가운데 핀을 정확한 자리에 맞춰 주세요',
};

const SOURCE_TEXT: Record<PlaceDraftKind, string | null> = {
  public: '공공데이터에 등록된 이름이에요. 바꿔도 돼요',
  publicUnsure: '가까이 등록된 가게예요. 찾던 곳이 맞나요?',
  live: '부를 이름을 붙여도 되고, 비워 두면 카카오 이름으로 보여요',
  noMatch: '저장할 수 있는 장소 정보가 없어서 직접 꽂아요. 이름도 직접 써 주세요',
  direct: null,
};

// 핀 확정 카드: 지도를 움직여 가운데 핀 자리를 맞추고, 이름을 확인(고칠 수 있음)한 뒤 꽂는다.
// 저장되는 이름·위치는 공공데이터 레코드 또는 사용자가 정한 값뿐 — 실시간 핀은 카카오 장소 ID·검색어만(ADR-016 하이브리드).
export function PlaceDraftCard({
  kind,
  name,
  onChangeName,
  saving,
  error,
  onConfirm,
  onCancel,
  onSwitchOther,
  canSwitchToLive = false,
  liveInfo = null,
  lift,
  bottomInset,
}: PlaceDraftCardProps) {
  const canSave = (kind === 'live' || name.trim().length > 0) && !saving;
  const source = SOURCE_TEXT[kind];
  return (
    <View style={[styles.card, { bottom: lift, paddingBottom: bottomInset + spacing.md }]}>
      <Text style={styles.hint}>{HINT_TEXT[kind]}</Text>
      {kind === 'live' && liveInfo ? (
        <View style={styles.liveInfo}>
          <Text style={styles.liveName} numberOfLines={1}>
            {liveInfo.name}
          </Text>
          <Text style={styles.liveAddress} numberOfLines={1}>
            {liveInfo.address}, 카카오 제공
          </Text>
        </View>
      ) : null}
      <TextInput
        value={name}
        onChangeText={onChangeName}
        placeholder={
          kind === 'noMatch'
            ? '이름을 직접 써 주세요'
            : kind === 'live'
              ? '부를 이름(안 써도 돼요)'
              : '장소 이름'
        }
        placeholderTextColor={colors.textFaint}
        maxLength={NAME_MAX}
        style={styles.input}
        returnKeyType="done"
      />
      {source ? <Text style={styles.source}>{source}</Text> : null}
      {kind === 'publicUnsure' && onSwitchOther ? (
        <Text style={styles.switchLink} onPress={onSwitchOther} accessibilityRole="button">
          {canSwitchToLive
            ? '여기가 아니에요. 카카오 위치로 꽂을게요'
            : '여기가 아니에요. 직접 꽂을게요'}
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

// 지도 가운데 고정 압정(누르면 지나감). 바늘 끝이 화면 정중앙을 가리킨다. 지도 압정 핀과 같은 모양.
export function CenterPin({ color }: { color: string }) {
  return (
    <View style={styles.pinWrap} pointerEvents="none">
      <View style={[styles.pinHead, { backgroundColor: color }]}>
        <View style={styles.pinShine} />
      </View>
      <View style={styles.pinStem} />
      <View style={styles.pinShadow} />
    </View>
  );
}

const PIN_HEAD = 24;
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
    ...shadows.lifted,
  },
  hint: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.sm },
  input: {
    ...typography.body,
    lineHeight: undefined, // 한 줄 입력칸은 줄 간격 없이(iOS 에서 글자가 아래로 치우친다)
    color: colors.textStrong,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.field,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  source: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  liveInfo: { marginBottom: spacing.sm },
  liveName: { ...typography.body, fontWeight: '600', color: colors.textStrong },
  liveAddress: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
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
    ...shadows.paper,
  },
  pinShine: {
    position: 'absolute',
    top: 4,
    left: 5,
    width: 8,
    height: 6,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  // 바늘(금속 회색)과 종이에 떨어진 그림자
  pinStem: { width: 2, height: PIN_STEM, marginTop: -1, backgroundColor: '#8E8A82' },
  pinShadow: {
    position: 'absolute',
    bottom: -2,
    width: 10,
    height: 4,
    borderRadius: 5,
    backgroundColor: 'rgba(58,46,28,0.25)',
  },
});
