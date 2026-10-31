// 자동 생성 — scripts/build-icons.py (원본 assets/icons/source/icons.html). 직접 고치지 않는다.
export const iconAssets = {
  back: require('../../assets/icons/back.png'),
  close: require('../../assets/icons/close.png'),
  search: require('../../assets/icons/search.png'),
  fold: require('../../assets/icons/fold.png'),
  hand: require('../../assets/icons/hand.png'),
  pencil: require('../../assets/icons/pencil.png'),
  pen: require('../../assets/icons/pen.png'),
  marker: require('../../assets/icons/marker.png'),
  string: require('../../assets/icons/string.png'),
  sticker: require('../../assets/icons/sticker.png'),
  pin: require('../../assets/icons/pin.png'),
  undo: require('../../assets/icons/undo.png'),
  compass: require('../../assets/icons/compass.png'),
  minus: require('../../assets/icons/minus.png'),
  plus: require('../../assets/icons/plus.png'),
  trash: require('../../assets/icons/trash.png'),
  memo: require('../../assets/icons/memo.png'),
  more: require('../../assets/icons/more.png'),
  legend: require('../../assets/icons/legend.png'),
  check: require('../../assets/icons/check.png'),
  forward: require('../../assets/icons/forward.png'),
  sliders: require('../../assets/icons/sliders.png'),
  paste: require('../../assets/icons/paste.png'),
  stamp: require('../../assets/icons/stamp.png'),
} as const;

export type IconName = keyof typeof iconAssets;
