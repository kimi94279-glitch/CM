import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import React from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { MAP_STYLE_OPTIONS } from '../components/mapStyles';
import { ScreenContainer } from '../components/ScreenContainer';
import { SocialButtons } from '../components/SocialButtons';
import {
  colors,
  INK_ORDER,
  inkLabels,
  inks as palette,
  numeric,
  radius,
  spacing,
  typography,
  type InkName,
} from '../constants/theme';
import { useAuth } from '../hooks/useAuthState';
import { useInks } from '../hooks/useInks';
import { useMapStyle, useSetMapStyle } from '../hooks/useMapStyle';
import { usePartnerProfile } from '../hooks/usePartnerProfile';
import {
  deleteMyAccount,
  getMyProfile,
  isGuest,
  signOut,
  updateMyInk,
} from '../services/authService';
import { leaveWorkspace } from '../services/coupleService';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

// 계정·연결 설정: 같이 그리는 사람 / 연결 끊기 / 로그아웃 / 계정 삭제 (0010)
// 로그인 없이 쓰는 중(게스트)이면: 로그인해서 지도 지키기 · 기존 계정으로 로그인 · 기록 지우기 (로그아웃은 없음 — 지도를 잃는다)
export function SettingsScreen({ navigation }: Props) {
  const { session, workspace, refresh } = useAuth();
  const guest = isGuest(session);
  const profileQuery = useQuery({ queryKey: ['my-profile'], queryFn: getMyProfile });
  const partnerQuery = usePartnerProfile();
  const queryClient = useQueryClient();
  const inks = useInks();
  const mapStyle = useMapStyle();
  const setMapStyle = useSetMapStyle();

  // 내 잉크 바꾸기(0012) — 바로 보이게 먼저 바꿔 두고, 실패하면 되돌린다. 지도는 useInks 로 다시 칠해진다.
  const inkMutation = useMutation({
    mutationFn: (name: InkName) => updateMyInk(name),
    onMutate: (name: InkName) => {
      const prev = queryClient.getQueryData(['my-profile']);
      queryClient.setQueryData(['my-profile'], (old: object | null | undefined) =>
        old ? { ...old, ink: name } : old
      );
      return { prev };
    },
    onError: (_e, _name, ctx) => {
      queryClient.setQueryData(['my-profile'], ctx?.prev);
      Alert.alert('잉크를 바꾸지 못했어요', '잠시 후 다시 시도해 주세요.');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['my-profile'] }),
  });

  const isActive = workspace?.status === 'active';
  const isSolo = workspace?.status === 'solo';
  const partnerName = partnerQuery.data?.nickname ?? '상대';

  // 연결 끊기 → 나는 공간 없는 상태로(게이팅이 첫 화면으로 전환), 지도는 상대에게 남는다
  const leave = useMutation({
    mutationFn: leaveWorkspace,
    onSuccess: () => refresh(),
    onError: () => Alert.alert('연결을 끊지 못했어요', '잠시 후 다시 시도해 주세요.'),
  });

  // 계정 삭제 → 세션 정리(onAuthStateChange)로 로그인 화면으로 전환
  const remove = useMutation({
    mutationFn: deleteMyAccount,
    onSuccess: () => {
      if (!guest) Alert.alert('계정을 삭제했어요', '그동안 함께해 줘서 고마워요.');
    },
    onError: () => Alert.alert('지우지 못했어요', '잠시 후 다시 시도해 주세요.'),
  });

  const logout = useMutation({ mutationFn: signOut });

  const confirmLeave = () => {
    Alert.alert(
      '연결을 끊을까요?',
      `같이 그린 지도는 ${partnerName}님에게 남고, 나는 빈 상태에서 다시 시작해요. 내가 남긴 흔적은 그 지도에 그대로 남아요.`,
      [
        { text: '취소', style: 'cancel' },
        { text: '연결 끊기', style: 'destructive', onPress: () => leave.mutate() },
      ]
    );
  };

  // 게스트가 기존 계정으로 들어가려면 지금 기기의 지도를 정리하고 로그인 화면으로 간다(두 기록을 합치지는 않는다).
  const confirmSwitchAccount = () => {
    Alert.alert(
      '기존 계정으로 로그인할까요?',
      '로그인하지 않고 그린 지금 지도는 지워지고, 로그인 화면으로 가요. 지금 지도를 지키려면 위에서 로그인해 주세요.',
      [
        { text: '취소', style: 'cancel' },
        { text: '지우고 로그인하기', style: 'destructive', onPress: () => remove.mutate() },
      ]
    );
  };

  const confirmDelete = () => {
    if (guest) {
      Alert.alert(
        '기록을 지우고 처음으로 갈까요?',
        '지금까지 그린 지도와 흔적이 모두 지워져요. 되돌릴 수 없어요.',
        [
          { text: '취소', style: 'cancel' },
          { text: '지우기', style: 'destructive', onPress: () => remove.mutate() },
        ]
      );
      return;
    }
    const what = isActive
      ? `같이 그린 지도는 ${partnerName}님에게 남아요. 내가 쓴 메모와 반응은 지워지고, 내가 찍은 장소와 그림은 이름 없이 남아요.`
      : isSolo
        ? '내 지도와 그 안의 모든 흔적이 지워져요.'
        : '계정과 내가 보낸 초대가 지워져요.';
    Alert.alert('계정을 삭제할까요?', `${what}\n\n삭제하면 되돌릴 수 없어요.`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => remove.mutate() },
    ]);
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>설정</Text>

        <Text style={styles.section}>계정</Text>
        <View style={styles.card}>
          <Row label="이름" value={profileQuery.data?.nickname ?? ''} />
          <View style={styles.divider} />
          {guest ? (
            <Row label="로그인" value="안 함" />
          ) : (
            <Row label="이메일" value={session?.user?.email ?? ''} />
          )}
        </View>

        {guest ? (
          <View style={styles.guestBox}>
            <Text style={styles.guestText}>
              로그인하지 않으면 앱을 지우거나 폰을 바꿀 때 지도가 사라져요. 로그인하면 지금 지도가
              그대로 이어지고, 같이 그릴 사람도 초대할 수 있어요.
            </Text>
            <SocialButtons mode="link" onSuccess={() => refresh()} />
            <Pressable onPress={confirmSwitchAccount} hitSlop={8} style={styles.switchRow}>
              <Text style={styles.switchText}>기존 계정으로 로그인</Text>
            </Pressable>
          </View>
        ) : null}

        <Text style={styles.section}>내 잉크</Text>
        <View style={styles.inkRow}>
          {INK_ORDER.map((name) => {
            const selected = inks.myInk === name;
            return (
              <Pressable
                key={name}
                onPress={() => inkMutation.mutate(name)}
                disabled={selected || inkMutation.isPending}
                accessibilityRole="button"
                accessibilityLabel={`${inkLabels[name]} 잉크`}
                accessibilityState={{ selected }}
                style={[
                  styles.inkSwatch,
                  {
                    backgroundColor: palette[name].soft,
                    borderColor: selected ? palette[name].solid : 'transparent',
                  },
                ]}
              >
                <View style={[styles.inkDot, { backgroundColor: palette[name].solid }]} />
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.inkHint}>
          내가 꽂은 핀과 쪽지, 그린 선이 {inkLabels[inks.myInk]} 색으로 보여요.
          {isActive ? ' 상대와 같은 색을 고르면 내 화면에선 상대가 다른 색으로 보여요.' : ''}
        </Text>

        {/* 종이 지도 3종 비교(시험 중) — 이 기기에만 저장. 정해지면 기본값만 남기거나 지도마다 고르게 바꾼다. */}
        <Text style={styles.section}>지도 바탕</Text>
        <View style={styles.styleRow}>
          {MAP_STYLE_OPTIONS.map((o) => {
            const selected = mapStyle === o.name;
            return (
              <Pressable
                key={o.name}
                onPress={() => setMapStyle(o.name)}
                disabled={selected}
                accessibilityRole="button"
                accessibilityLabel={`지도 바탕 ${o.label}`}
                accessibilityState={{ selected }}
                style={[styles.styleOption, selected && styles.styleOptionOn]}
              >
                <Text style={[styles.styleLabel, selected && styles.styleLabelOn]}>{o.label}</Text>
                <Text style={styles.styleHint} numberOfLines={2}>
                  {o.hint}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {isActive || isSolo ? (
          <>
            <Text style={styles.section}>같이 그리기</Text>
            <View style={styles.card}>
              <Row
                label={isActive ? '같이 그리는 사람' : '혼자 그리는 중'}
                value={isActive ? partnerName : ''}
              />
            </View>
            {isActive ? (
              <Button
                title="연결 끊기"
                variant="secondary"
                onPress={confirmLeave}
                loading={leave.isPending}
                style={styles.gap}
              />
            ) : (
              <Button
                title="같이 그릴 사람 초대"
                variant="secondary"
                onPress={() => navigation.navigate('InviteCreate')}
                style={styles.gap}
              />
            )}
          </>
        ) : null}

        {/* 데이터 출처(ADR-016·docs/Place Matching.md) — 공공데이터는 출처 표시 권장, OSM 은 ODbL 출처 표시 */}
        <Text style={styles.section}>정보</Text>
        <View style={styles.card}>
          {CREDITS.map((c, i) => (
            <View key={c.label}>
              {i > 0 ? <View style={styles.divider} /> : null}
              <Pressable
                onPress={c.url ? () => Linking.openURL(c.url as string).catch(() => {}) : undefined}
                disabled={!c.url}
                accessibilityRole={c.url ? 'link' : undefined}
                style={styles.credit}
              >
                <Text style={styles.creditLabel}>{c.label}</Text>
                <Text style={[styles.creditText, c.url ? styles.creditLink : null]}>{c.text}</Text>
              </Pressable>
            </View>
          ))}
        </View>
        <Text style={styles.version}>버전 {Constants.expoConfig?.version ?? '-'}</Text>

        {guest ? null : (
          <Button
            title="로그아웃"
            variant="secondary"
            onPress={() => logout.mutate()}
            loading={logout.isPending}
            style={styles.logout}
          />
        )}

        <Pressable
          onPress={confirmDelete}
          disabled={remove.isPending}
          hitSlop={8}
          style={styles.deleteRow}
        >
          <Text style={styles.delete}>
            {remove.isPending ? '지우는 중' : guest ? '기록 지우고 처음으로' : '계정 삭제'}
          </Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

// 앱이 쓰는 데이터의 출처. 장소를 더 붙이면(공원·박물관 표준데이터 등) 여기에 더한다.
const CREDITS: { label: string; text: string; url?: string }[] = [
  {
    label: '장소 정보',
    text: '소상공인시장진흥공단 상가(상권)정보 · 공공데이터포털',
    url: 'https://www.data.go.kr/data/15083033/fileData.do',
  },
  {
    label: '장소 검색',
    text: '카카오: 검색 결과와 카카오 위치로 꽂은 핀의 위치는 저장하지 않고 볼 때마다 불러와요',
  },
  {
    label: '지도',
    text: '© OpenStreetMap contributors · © OpenMapTiles · OpenFreeMap',
    url: 'https://www.openstreetmap.org/copyright',
  },
  {
    label: '지형(산 음영·등고선)',
    text: 'Mapzen Terrain Tiles · AWS Open Data (SRTM·GMTED·ETOPO1 등)',
    url: 'https://github.com/tilezen/joerd/blob/master/docs/attribution.md',
  },
  { label: '지도 엔진', text: 'MapLibre GL JS · maplibre-contour (BSD 3-Clause)' },
];

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing.xl,
  },
  title: {
    ...typography.title,
    color: colors.textStrong,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  section: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  // 설정 묶음: 둥근 회색 카드 대신 흰 종이에 괘선(지도책 차례처럼)
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.field,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  rowLabel: {
    ...typography.body,
    color: colors.textStrong,
  },
  rowValue: {
    ...typography.body,
    color: colors.textMuted,
    flexShrink: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  gap: {
    marginTop: spacing.md,
  },
  logout: {
    marginTop: spacing.xl,
  },
  inkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  inkSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inkDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  inkHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  styleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  styleOption: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.field,
    borderWidth: 2,
    borderColor: 'transparent',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  styleOptionOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  styleLabel: {
    ...typography.label,
    color: colors.textMuted,
  },
  styleLabelOn: {
    color: colors.textStrong,
    fontWeight: '700',
  },
  styleHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  guestBox: {
    marginTop: spacing.md,
  },
  guestText: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  switchRow: {
    alignSelf: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
  },
  switchText: {
    ...typography.label,
    color: colors.textMuted,
  },
  credit: {
    paddingVertical: spacing.sm,
  },
  creditLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  creditText: {
    ...typography.body,
    color: colors.textStrong,
    marginTop: 2,
  },
  creditLink: {
    textDecorationLine: 'underline',
  },
  version: {
    ...typography.caption,
    ...numeric,
    color: colors.textMuted,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  deleteRow: {
    alignSelf: 'center',
    marginTop: spacing.xl,
    paddingVertical: spacing.sm,
  },
  delete: {
    ...typography.label,
    color: colors.danger,
  },
});
