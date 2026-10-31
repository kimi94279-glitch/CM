import { requireOptionalNativeModule } from 'expo';

// 지도 한 장(jpeg base64)을 캐시 파일로 만들고 공유 창(인스타 스토리·저장·카톡 등)을 연다.
// expo-file-system · expo-sharing 은 네이티브 모듈이라 새 개발 빌드 전엔 없다 — 그냥 import 하면 앱이 죽으므로
// 있는지 먼저 보고 그때만 불러온다. 없으면 false(호출측이 "새 버전에서 돼요" 안내).
export async function shareJpegBase64(base64: string, fileName: string): Promise<boolean> {
  if (!requireOptionalNativeModule('FileSystem') || !requireOptionalNativeModule('ExpoSharing')) {
    return false;
  }
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { File, Paths } = require('expo-file-system') as typeof import('expo-file-system');
  const Sharing = require('expo-sharing') as typeof import('expo-sharing');
  /* eslint-enable @typescript-eslint/no-require-imports */
  if (!(await Sharing.isAvailableAsync())) return false;
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  file.write(base64, { encoding: 'base64' });
  await Sharing.shareAsync(file.uri, {
    mimeType: 'image/jpeg',
    UTI: 'public.jpeg',
    dialogTitle: '지도 한 장',
  });
  return true;
}
