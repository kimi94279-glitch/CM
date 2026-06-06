import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../constants/theme';
import type { Place } from '../types/models';
import { Button } from './Button';
import { PlaceCard } from './PlaceCard';

interface CanvasObjectListProps {
  places: Place[];
  highlightedId: string | null;
  deletingId: string | null;
  onAdd: () => void;
  onDelete: (place: Place) => void;
  // 닫기 핸들러가 있으면 헤더에 ✕ 노출(모바일 Half Sheet). 태블릿 Side Panel은 미전달.
  onClose?: () => void;
}

// Canvas Object 목록(현재는 Place 전용). 모바일 Half Sheet / 태블릿 Side Panel이 공용으로 사용한다.
// 표시 전용 컴포넌트: 데이터/뮤테이션은 상위(BoardDetailScreen)에서 주입한다.
export function CanvasObjectList({
  places,
  highlightedId,
  deletingId,
  onAdd,
  onDelete,
  onClose,
}: CanvasObjectListProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>목록 {places.length}</Text>
        {onClose ? (
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={styles.close}>✕</Text>
          </Pressable>
        ) : null}
      </View>

      {places.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>검색으로 가고 싶은 장소를 추가해보세요.</Text>
          <Button title="장소 추가하기" variant="secondary" onPress={onAdd} />
        </View>
      ) : (
        <FlatList
          data={places}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <PlaceCard
              place={item}
              index={index + 1}
              highlighted={item.id === highlightedId}
              onDelete={() => onDelete(item)}
              deleting={deletingId === item.id}
            />
          )}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  title: { ...typography.label, color: colors.textStrong },
  close: { ...typography.body, color: colors.textMuted },
  empty: { paddingTop: spacing.sm, paddingBottom: spacing.lg, gap: spacing.md },
  emptyText: { ...typography.body, color: colors.textMuted },
  list: { flex: 1 },
  listContent: { paddingBottom: spacing.lg },
});
