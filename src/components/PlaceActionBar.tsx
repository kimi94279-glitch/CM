import React, { useMemo, useState } from 'react';
import {
  Alert,
  Keyboard,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { MEMO_MAX_LENGTH } from '../constants/config';
import { REACTION_EMOJI, REACTION_ORDER } from '../constants/reactions';
import { colors, radius, spacing, typography } from '../constants/theme';
import type { PeopleInks } from '../hooks/useInks';
import { useAddMemo, useRemoveMemo } from '../hooks/usePlaceMemos';
import { useAddReaction, useRemoveReaction } from '../hooks/usePlaceReactions';
import type { PlaceMemo, PlaceReaction, ReactionType } from '../types/models';
import { friendlyError } from '../utils/errors';
import { kakaoPlaceUrl } from '../utils/kakaoMap';
import { whoOf } from '../utils/who';
import { FloatingBar, floatingShadow } from './FloatingBar';

export interface PlaceActions {
  toggleReaction: (placeId: string, type: ReactionType, mine: boolean) => void;
  sendMemo: (placeId: string, content: string) => void;
  removeMemo: (memoId: string) => void;
}

// 반응·메모 저장. 바가 아니라 화면에서 부른다 — 바는 핀을 바꾸거나 닫으면 언마운트되는데,
// TanStack v5 는 mutate 에 넘긴 onError 를 구독자가 없으면 부르지 않아 실패 알림이 사라진다.
// (낙관 반영은 훅에서 롤백 — 말풍선·배지가 되돌아간다.)
export function usePlaceActions(boardId: string): PlaceActions {
  const addReaction = useAddReaction(boardId);
  const removeReaction = useRemoveReaction(boardId);
  const addMemo = useAddMemo(boardId);
  const removeMemo = useRemoveMemo(boardId);
  return {
    toggleReaction: (placeId, type, mine) => {
      const onError = (e: unknown) => Alert.alert('반응 저장 실패', friendlyError(e));
      if (mine) removeReaction.mutate({ placeId, type }, { onError });
      else addReaction.mutate({ placeId, type }, { onError });
    },
    sendMemo: (placeId, content) =>
      addMemo.mutate(
        { placeId, content },
        { onError: (e) => Alert.alert('메모 저장 실패', friendlyError(e)) }
      ),
    removeMemo: (memoId) =>
      removeMemo.mutate(memoId, {
        onError: (e) => Alert.alert('메모 삭제 실패', friendlyError(e)),
      }),
  };
}

// 핀을 탭하면 뜨는 바(ADR-014 대화): 반응(banter) 토글 + 💬 한 줄 메모 + 카카오맵 링크.
// 💬 로 입력창(+ 이 핀의 최근 대화)을 바 위에 열고, 입력 중에는 키보드 위로 올린다.
// 화면에서 핀마다 key 를 달아 쓰므로 다른 핀으로 바뀌면 입력창은 닫힌 채로 새로 시작한다.
// 반응·메모 목록은 화면이 지도에 주입하는 것을 그대로 받는다(바가 열릴 때마다 다시 불러오지 않게).
export function PlaceActionBar({
  placeId,
  kakaoPlaceId,
  reactions,
  memos,
  actions,
  myId,
  partnerId,
  inks,
  keyboardHeight,
  restingBottom,
  onClose,
}: {
  placeId: string;
  kakaoPlaceId: string | null; // 카카오로 찾아 꽂은 핀이면 링크(영업시간·리뷰는 카카오맵에서)
  reactions: PlaceReaction[];
  memos: PlaceMemo[];
  actions: PlaceActions;
  myId: string | null;
  partnerId: string | null;
  inks: PeopleInks;
  keyboardHeight: number;
  restingBottom: number; // 키보드가 없을 때 바닥에서의 높이
  onClose: () => void;
}) {
  const mineInkStyle = { backgroundColor: inks.me.tint, borderColor: inks.me.solid };

  // 이 핀에서 내가 이미 누른 반응(내 색 강조 + 토글 판정).
  const myReactionTypes = useMemo(
    () =>
      new Set(
        reactions
          .filter((r) => r.place_id === placeId && r.user_id === myId)
          .map((r) => r.reaction_type)
      ),
    [reactions, placeId, myId]
  );
  const toggleReaction = (type: ReactionType) =>
    actions.toggleReaction(placeId, type, myReactionTypes.has(type));

  const [memoOpen, setMemoOpen] = useState(false);
  const [memoText, setMemoText] = useState('');
  // 입력창 위에 보여줄 이 핀의 최근 대화(최대 3줄, 오래된 → 최근).
  const placeMemos = useMemo(
    () => memos.filter((m) => m.place_id === placeId).slice(-3),
    [memos, placeId]
  );
  const toggleMemo = () => {
    setMemoText('');
    if (memoOpen) Keyboard.dismiss();
    setMemoOpen(!memoOpen);
  };
  const sendMemo = () => {
    const content = memoText.trim();
    if (content.length === 0) return;
    actions.sendMemo(placeId, content);
    // 낙관 반영으로 말풍선이 바로 보이므로 입력창을 닫고 지도를 보여준다.
    setMemoText('');
    setMemoOpen(false);
    Keyboard.dismiss();
  };

  const memoCard = memoOpen ? (
    <View style={styles.memoCard}>
      {placeMemos.map((m) => {
        const isTemp = m.id.startsWith('temp-');
        const mine = isTemp || m.user_id === myId;
        const who = mine ? 'me' : whoOf(m.user_id, myId, partnerId);
        return (
          <View key={m.id} style={styles.memoRow}>
            <View style={[styles.memoDot, { backgroundColor: inks[who].solid }]} />
            <Text style={styles.memoRowText} numberOfLines={2}>
              {m.content}
            </Text>
            {mine && !isTemp ? (
              <Pressable
                onPress={() => actions.removeMemo(m.id)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="메모 삭제"
              >
                <Text style={styles.memoDelete}>✕</Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}
      <View style={styles.memoInputRow}>
        <TextInput
          style={styles.memoInput}
          value={memoText}
          onChangeText={setMemoText}
          placeholder="한 줄 남기기 (예: 여기 웨이팅 있대)"
          placeholderTextColor={colors.textMuted}
          maxLength={MEMO_MAX_LENGTH}
          autoFocus
          returnKeyType="send"
          onSubmitEditing={sendMemo}
        />
        <Pressable
          style={[styles.memoSend, !memoText.trim() && styles.memoSendDisabled]}
          onPress={sendMemo}
          disabled={!memoText.trim()}
          accessibilityRole="button"
          accessibilityLabel="메모 보내기"
        >
          <Text style={styles.memoSendText}>보내기</Text>
        </Pressable>
      </View>
    </View>
  ) : null;

  return (
    <FloatingBar
      bottom={memoOpen && keyboardHeight > 0 ? keyboardHeight + spacing.sm : restingBottom}
      above={memoCard}
      onClose={() => {
        Keyboard.dismiss();
        onClose();
      }}
      closeLabel="반응 닫기"
    >
      {REACTION_ORDER.map((type) => (
        <Pressable
          key={type}
          style={[styles.emojiBtn, myReactionTypes.has(type) && [styles.emojiMine, mineInkStyle]]}
          onPress={() => toggleReaction(type)}
          accessibilityRole="button"
          accessibilityLabel={`반응 ${type}`}
          accessibilityState={{ selected: myReactionTypes.has(type) }}
        >
          <Text style={styles.emoji}>{REACTION_EMOJI[type]}</Text>
        </Pressable>
      ))}
      {/* 한 줄 메모 입력 토글(열림 = 내 색 강조). */}
      <Pressable
        style={[styles.emojiBtn, memoOpen && [styles.emojiMine, mineInkStyle]]}
        onPress={toggleMemo}
        accessibilityRole="button"
        accessibilityLabel="한 줄 메모"
        accessibilityState={{ selected: memoOpen }}
      >
        <Text style={styles.emoji}>💬</Text>
      </Pressable>
      {kakaoPlaceId ? (
        <Pressable
          style={styles.kakaoLinkBtn}
          onPress={() => Linking.openURL(kakaoPlaceUrl(kakaoPlaceId)).catch(() => {})}
          accessibilityRole="link"
          accessibilityLabel="카카오맵에서 보기"
        >
          <Text style={styles.kakaoLinkText}>카카오맵</Text>
        </Pressable>
      ) : null}
    </FloatingBar>
  );
}

const styles = StyleSheet.create({
  emojiBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 내가 이미 누른 반응: 내 잉크 테두리 + 잉크 tint 배경(색은 mineInkStyle 로 각자 잉크).
  emojiMine: {
    borderRadius: radius.card,
    borderWidth: 2,
  },
  emoji: { fontSize: 24 },
  kakaoLinkBtn: {
    height: 44,
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
  },
  kakaoLinkText: { ...typography.caption, fontWeight: '600', color: colors.textStrong },

  // 한 줄 메모 입력 카드(바 위). 최근 대화 + 입력 줄. 바와 같은 톤.
  memoCard: {
    alignSelf: 'stretch',
    maxWidth: 480,
    marginHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    ...floatingShadow,
  },
  memoRow: { flexDirection: 'row', alignItems: 'center' },
  memoDot: { width: 10, height: 10, borderRadius: 5, marginRight: spacing.xs },
  memoRowText: { ...typography.label, color: colors.textStrong, flex: 1 },
  memoDelete: { ...typography.caption, color: colors.textMuted, paddingHorizontal: spacing.xs },
  memoInputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  memoInput: {
    flex: 1,
    ...typography.body,
    color: colors.textStrong,
    height: 40,
    paddingVertical: 0,
  },
  memoSend: {
    height: 32,
    paddingHorizontal: spacing.md,
    borderRadius: radius.button,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memoSendDisabled: { opacity: 0.4 },
  memoSendText: { ...typography.label, color: colors.surface, fontWeight: '700' },
});
