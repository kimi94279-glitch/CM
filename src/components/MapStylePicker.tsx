import React from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';

import { colors, radius, spacing, typography } from '../constants/theme';
import { Icon } from './Icon';
import { MAP_STYLE_OPTIONS, type MapStyleName } from './mapStyles';

// 바탕마다 미리보기 그림(같은 자리 — 남산·한강 근처 — 를 그 바탕으로 그린 240×320). 바탕을 더하면 여기도 더한다.
const THUMBS: Record<MapStyleName, ImageSourcePropType> = {
  roadmap: require('../../assets/map-styles/roadmap.jpg'),
  atlas: require('../../assets/map-styles/atlas.jpg'),
  topo: require('../../assets/map-styles/topo.jpg'),
  relief: require('../../assets/map-styles/relief.jpg'),
  city: require('../../assets/map-styles/city.jpg'),
};

// 지도 바탕 고르기: 미리보기 그림을 옆으로 넘겨 보며 고른다. 지도 화면(이 지도의 바탕)과 설정(새 지도 기본 바탕)이 같이 쓴다.
export function MapStylePicker({
  value,
  onPick,
}: {
  value: MapStyleName;
  onPick: (style: MapStyleName) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {MAP_STYLE_OPTIONS.map((o) => {
        const on = o.name === value;
        return (
          <Pressable
            key={o.name}
            onPress={() => onPick(o.name)}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`${o.label}, ${o.hint}`}
            accessibilityState={{ selected: on }}
          >
            <View style={[styles.thumbWrap, on && styles.thumbOn]}>
              <Image source={THUMBS[o.name]} style={styles.thumb} />
              {on ? (
                <View style={styles.check}>
                  <Icon name="check" size={14} color={colors.onPrimary} />
                </View>
              ) : null}
            </View>
            <Text style={[styles.label, on && styles.labelOn]} numberOfLines={1}>
              {o.label}
            </Text>
            <Text style={styles.hint} numberOfLines={2}>
              {o.hint}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const ITEM = 104;

const styles = StyleSheet.create({
  row: { gap: spacing.sm + 4, paddingVertical: 2 },
  item: { width: ITEM },
  pressed: { opacity: 0.7 },
  // 미리보기: 3:4, 고른 것은 군청 테두리 + 체크
  thumbWrap: {
    width: ITEM,
    height: Math.round((ITEM * 4) / 3),
    borderRadius: radius.field,
    borderWidth: 2,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  thumbOn: { borderColor: colors.primary },
  thumb: { width: '100%', height: '100%' },
  check: {
    position: 'absolute',
    right: 6,
    top: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { ...typography.label, color: colors.textMuted, marginTop: spacing.xs },
  labelOn: { color: colors.textStrong, fontWeight: '700' },
  hint: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
});
