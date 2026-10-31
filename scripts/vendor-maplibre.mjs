// MapLibre GL JS 를 앱 안에 넣는다: node_modules/maplibre-gl/dist 의 JS·CSS 를 문자열 모듈로 만든다.
// 지도 WebView 가 CDN(unpkg) 없이 뜨게 하려는 것(지도 안정성). 스타일·타일은 여전히 네트워크(OpenFreeMap).
// 등고선 플러그인 maplibre-contour(지형 타일 → 등고선을 기기에서 계산)도 같이 넣는다.
// 사용: npm run vendor:maplibre  (maplibre-gl·maplibre-contour 버전을 올린 뒤 다시 실행하고 결과 파일을 커밋)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkgDir = join(root, 'node_modules', 'maplibre-gl');
const { version } = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));
const js = readFileSync(join(pkgDir, 'dist', 'maplibre-gl.js'), 'utf8');
const css = readFileSync(join(pkgDir, 'dist', 'maplibre-gl.css'), 'utf8');
const contourDir = join(root, 'node_modules', 'maplibre-contour');
const contourVersion = JSON.parse(readFileSync(join(contourDir, 'package.json'), 'utf8')).version;
const contourJs = readFileSync(join(contourDir, 'dist', 'index.min.js'), 'utf8');

// <script>/<style> 안에 그대로 넣으므로 닫는 태그가 섞여 있으면 HTML 이 깨진다.
if (/<\/script/i.test(js)) throw new Error('maplibre-gl.js contains </script');
if (/<\/style/i.test(css)) throw new Error('maplibre-gl.css contains </style');
if (/<\/script/i.test(contourJs)) throw new Error('maplibre-contour contains </script');

const out = join(root, 'src', 'components', 'vendor', 'maplibreAssets.ts');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(
  out,
  [
    `// 자동 생성 — scripts/vendor-maplibre.mjs (maplibre-gl ${version}, maplibre-contour ${contourVersion}, 둘 다 BSD-3-Clause). 직접 고치지 않는다.`,
    `// License: https://github.com/maplibre/maplibre-gl-js/blob/v${version}/LICENSE.txt`,
    `// License: https://github.com/onthegomap/maplibre-contour/blob/v${contourVersion}/LICENSE`,
    `export const MAPLIBRE_VERSION = ${JSON.stringify(version)};`,
    `export const MAPLIBRE_CSS = ${JSON.stringify(css)};`,
    `export const MAPLIBRE_JS = ${JSON.stringify(js)};`,
    `export const MAPLIBRE_CONTOUR_JS = ${JSON.stringify(contourJs)};`,
    '',
  ].join('\n'),
  'utf8'
);
console.log(
  `wrote ${out} (maplibre-gl ${version}, js ${js.length} chars, css ${css.length} chars; maplibre-contour ${contourVersion}, ${contourJs.length} chars)`
);
