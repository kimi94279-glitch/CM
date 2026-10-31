import React from 'react';
import { Image, type ImageStyle, type StyleProp } from 'react-native';

import { colors } from '../constants/theme';
import { iconAssets, type IconName } from './iconAssets';

export type { IconName };

// 앱 아이콘 한 벌(손으로 그린 선, 같은 굵기 — assets/icons/source/icons.html). 이모지·유니코드 기호를 아이콘으로 쓰지 않는다.
// PNG 알파 마스크를 tintColor 로 칠한다(react-native-svg 없이). 장식이면 accessible={false} — 이름은 감싼 버튼에 단다.
export function Icon({
  name,
  size = 22,
  color = colors.textStrong,
  style,
}: {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      source={iconAssets[name]}
      style={[{ width: size, height: size, tintColor: color }, style]}
      resizeMode="contain"
      accessible={false}
    />
  );
}
