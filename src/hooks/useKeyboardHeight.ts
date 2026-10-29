import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';

// 키보드 높이(닫혀 있으면 0). 지도 위 시트·카드를 키보드 위로 올릴 때 쓴다(라이브러리 없이 결정적 제어).
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}
