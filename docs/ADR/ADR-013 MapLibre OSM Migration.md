---
title: MapLibre + OSM Migration
status: accepted
owner: project
last_review: 2026-06-20
category: adr
related:
  - ADR-008 Map Canvas Architecture.md
  - ADR-001 Map Provider Selection
  - MAP CANVAS.md
adr: "013"
date: 2026-06-19
tags:
  - adr
  - architecture
  - map-canvas
  - map-provider
  - cost
---

# ADR-013 MapLibre + OSM 이전 기술 설계서

Date: 2026-06-19
Status: Accepted — 1차 이전 구현 완료(2026-06-20). MapHost 시리즈(4/4) 이후 적용.

구현 요약(옵션 A): `mapWebViewHtml.ts` CDN을 MapLibre GL JS `5.24.0`로 교체, `mapboxgl`→`maplibregl`,
access token 제거, 스타일 `https://tiles.openfreemap.org/styles/positron`. `MapWebView.tsx` 토큰 게이트 제거,
`.env`에서 `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` 제거. typecheck/lint 통과. **런타임(실기기) 검증 대기** — 특히
한글 라벨 표기(positron 기본 로마자 가능성)와 glyph CJK 커버리지, positron 시각 톤 확인 필요.

---

## 1. 요약 (TL;DR)

현재 지도는 **WebView 안에서 Mapbox GL JS v3.9.0** 를 CDN 로드해 렌더한다. Mapbox 의존성은 전부
`mapWebViewHtml.ts` 한 파일의 GL JS 코드와 access token 참조에 격리돼 있고, RN 네이티브 쪽은
`injectJavaScript` + `postMessage` 브리지만 사용한다.

MapLibre GL JS 는 Mapbox GL JS v1.x 의 오픈소스 포크(BSD-3)라 **API가 사실상 동일**하다.
이 설계의 핵심 작업은 **(a) CDN 라이브러리 교체, (b) access token 제거, (c) `mapbox://` 스타일 →
무료 스타일 JSON URL 교체** 3가지다. 나머지(Marker, LngLatBounds, fitBounds, jumpTo, unproject,
이벤트, 드래그 비활성화)는 전부 그대로 동작한다.

> **결론: 반나절(키리스 스타일 채택 시) ~ 1일 규모의 저위험 이전.** 깨지는 기능은 거의 없고,
> 실질적 변수는 "어떤 무료 스타일을 쓸 것이냐"와 "OSM 저작권 표기 의무" 두 가지다.

---

## 2. 영향 파일

| 파일 | 변경 내용 | 작업량 |
|---|---|---|
| `src/components/mapWebViewHtml.ts` | **핵심.** CDN `<link>`/`<script>` URL 교체, `mapboxgl`→`maplibregl` 식별자 치환, `accessToken` 제거, `MAP_STYLE` 을 무료 스타일 JSON URL 로 교체, 주석의 "Mapbox" 표현 갱신 | 이전 작업의 ~80% |
| `src/components/MapWebView.tsx` | `MAPBOX_TOKEN` 상수/`EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` env 제거 또는 스타일 키로 용도 변경. 키리스 스타일이면 L196~202 토큰 게이트(fallback) 제거 | 소 |
| `.env.example` | `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` 제거. 키 필요한 provider면 `EXPO_PUBLIC_MAP_STYLE_KEY` 추가 | 미미 |
| `.env` (로컬, 미커밋) | 위와 동일하게 사용자 갱신 | 미미 |
| `docs/ADR/ADR-008 Map Canvas Architecture.md`, `docs/MAP CANVAS.md` | 본문의 provider 서술(Mapbox/Kakao) 갱신, 본 ADR 링크 | 소 |
| `docs/ADR/ADR-013` (본 문서) | 신규 ADR | — |

> `MapHost.tsx`, `MapHostContext.tsx`, `BoardDetailScreen.tsx` 는 **변경 없음.** 컨트롤러/콜백
> 계약(`recenter`, `onMarkerPress`, `onMapPress`, `onObjectPress`, `onObjectMove`)은 GL 라이브러리에
> 독립적이다. 이게 이전이 싼 근본 이유다.

---

## 3. 예상 소요시간

| 단계 | 내용 | 시간 |
|---|---|---|
| 코드 스왑 | CDN URL, 식별자, 토큰 제거, 스타일 URL | 1~2h |
| 스타일 선정·튜닝 | 무료 스타일 결정, 줌 체감(EMPTY/SINGLE_ZOOM) 재조정, fitBounds 패딩 재확인, attribution 위치 | 1h |
| QA (iOS/Android WebView) | 마커 탭, 배경 탭, 스티커 드래그/리사이즈/cull, 경로 폴리라인, recenter, 회전/피치 비활성 확인 | 1~2h |
| 문서 | ADR-013 + ADR-008/MAP CANVAS 갱신 | 0.5h |
| **합계 (키리스 OpenFreeMap)** | | **~0.5일** |
| PMTiles 자가 호스팅 채택 시 | 타일 빌드 + glyphs/sprite/스토리지 인프라 (4절 참고) | **+1~3일** |

---

## 4. 깨지는 기능 / 주의점

대부분 **무손상**. MapLibre가 Mapbox GL v1 포크라 아래 API는 시그니처가 동일하다:
`Map`, `Marker({element, anchor, offset})`, `LngLatBounds().extend()`, `fitBounds(b,{padding,animate})`,
`jumpTo`, `unproject`, `getZoom()`, `getSource().setData()`, `addSource`/`addLayer`(geojson line),
`on('load'|'click'|'zoom'|'error')`, `dragRotate.disable()`, `touchZoomRotate.disableRotation()`,
`touchPitch.disable()`. → 현재 코드의 마커/경로/카메라/스티커 월드스케일/드래그 로직 전부 그대로.

**반드시 손봐야 하는 것 (= "깨지는" 항목):**

1. **스타일 URL** — `mapbox://styles/mapbox/light-v11` 은 MapLibre에서 무효. 무료 스타일 JSON URL로 교체 필수.
2. **access token** — `mapboxgl.accessToken` API 자체가 MapLibre에 없음. 제거. (키 기반 provider면 토큰 대신 스타일 URL 쿼리스트링에 키 포함)
3. **CSS 링크** — `mapbox-gl.css` → `maplibre-gl.css`.
4. **OSM 저작권 표기 (법적 의무)** — `attributionControl: true` 는 그대로 켜되, 선택 스타일이
   `© OpenStreetMap contributors` 출처를 노출하는지 확인. 현재 앱이 attribution을 숨기지 않으므로 OK.
   (커스텀으로 가릴 경우 ODbL 위반 위험.)

**잠재적 미세 차이 (검증 필요, 대개 무영향):**

- Mapbox GL v3는 기본 투영이 globe일 수 있으나 MapLibre v5 기본은 mercator(평면) → 오히려 현재 "캔버스=평면" 요구에 부합.
- 줌 레벨 스케일 정의(2^Δ)는 두 엔진 동일 → `worldScaleFontPx` 로직 불변.
- 커스텀 DOM 마커를 쓰므로 `.mapboxgl-marker`→`.maplibregl-marker` 내부 클래스 변경의 영향 없음.

---

## 5. 대체 방법 (이전 전략 옵션)

### 옵션 A — MapLibre GL JS (WebView 유지) ★권장
현재 구조를 그대로 두고 GL JS 라이브러리만 교체. 변경 표면 최소, RN 브리지/싱글톤 MapHost 무손상.
- 장점: 최저 위험·최저 공수, 기존 증분 렌더/스티커 로직 100% 재사용, 라이선스/비용 해방.
- 단점: WebView 오버헤드는 그대로(현 구조의 기지(旣知) 트레이드오프).

### 옵션 B — `@maplibre/maplibre-react-native` (네이티브 모듈)
WebView를 버리고 네이티브 MapLibre로 전환.
- 장점: 성능/제스처 네이티브 품질, 메모리 우위.
- 단점: **대규모 리팩토링.** Expo dev client/prebuild 필요(Expo Go 불가), 커스텀 DOM 마커→`PointAnnotation`/`MarkerView` 재작성, 스티커 월드스케일·터치 드래그 로직 전면 재구현. ADR-008의 "대규모 리팩토링 금지" 제약과 충돌. → **현 시점 비권장.**

### 옵션 C — 래스터 OSM 타일만 (스타일 JSON 없이)
`tile.openstreetmap.org` 래스터를 raster source로.
- 단점: **OSM 공식 타일 사용정책상 앱/상업적 트래픽 금지.** 프로덕션 부적합. PoC 한정.

→ **옵션 A 채택 권장.** B는 성능 병목이 실측될 때 별도 ADR로.

---

## 6. 추천 무료 스타일

현재 `light-v11`(밝은 미니멀, 캔버스 위 요소 강조)을 대체할 후보. **Positron 계열**이 가장 근접.

| Provider | 스타일 | 키 필요 | 라이선스/비용 | 비고 |
|---|---|---|---|---|
| **OpenFreeMap** ★1순위 | `positron` / `liberty` / `bright` | **불필요(키리스)** | 완전 무료, 무가입 | `https://tiles.openfreemap.org/styles/positron`. 토큰 게이트 제거 가능. 단 커뮤니티 펀딩이라 SLA 보장 없음 |
| **Stadia Maps** ★프로덕션 | `alidade_smooth` | 필요(무료 티어) | 무료 티어 넉넉, 도메인 화이트리스트 | light-v11 와 가장 유사한 미니멀. 안정적 |
| **CARTO** | `positron` (`voyager`/`dark-matter`) | 불필요(basemaps CDN) | 비상업 무료 | `https://basemaps.cartocdn.com/gl/positron-gl-style/style.json` |
| **MapTiler** | `streets-v2` / `dataviz-light` / `basic` | 필요(무료 티어) | 월 호출 제한 | 품질 좋음, 키 노출 주의(EXPO_PUBLIC_* 는 클라 노출) |

**권장 조합:**
- **MVP/베타:** OpenFreeMap `positron` (키리스 → 토큰 인프라 즉시 제거, 코드 가장 단순).
- **정식/안정성 중시:** Stadia `alidade_smooth` 또는 자가 호스팅(7절).

> 참고: `EXPO_PUBLIC_*` env 는 번들에 그대로 노출되므로 키 기반 provider 채택 시 반드시
> 도메인/Referer 화이트리스트로 키를 보호할 것. 키리스 OpenFreeMap은 이 문제 자체가 없음.

---

## 7. PMTiles 적용 가능성

**가능하며, 비용·독립성 측면에서 매력적이나 MVP에는 과함.**

PMTiles = 타일 셋 전체를 단일 파일로 묶고 HTTP Range 요청으로 조각만 받는 포맷. 타일 서버 불필요,
정적 스토리지(S3/Cloudflare R2)+CDN 만으로 vector 지도 서빙 가능.

**적용 방법 (WebView/옵션 A 기준):**
1. `pmtiles` JS 라이브러리를 CDN 로드 후 `maplibregl.addProtocol('pmtiles', protocol.tile)` 등록.
2. 스타일 JSON 의 source url 을 `pmtiles://https://<cdn>/korea.pmtiles` 로 지정.
3. 타일 빌드: `planetiler` 로 OSM 추출(한국 region은 수백 MB 수준, planet 대비 작음).
4. glyphs(폰트), sprite(아이콘), style.json 도 정적 호스팅 필요.

**장단:**
- 장점: 외부 provider/API 의존 0, 호출량 비용 0(스토리지/대역폭만), 버전 고정, OSM 표기만 지키면 됨.
- 단점: **초기 인프라·운영 부담.** 타일 빌드 파이프라인, 스타일/glyph/sprite 자가 호스팅, region 갱신 주기 관리. WebView가 cross-origin Range 요청을 정상 처리하는지(특히 iOS WKWebView CORS) 검증 필요.

**판단:** 이전 1차에서는 **옵션 A + OpenFreeMap(키리스)** 로 출시하고, 트래픽/비용이 실제 문제로
드러나거나 오프라인/완전 독립이 요구될 때 **PMTiles 자가 호스팅으로 후속 전환**(별도 ADR). 본 설계상
PMTiles 전환도 `mapWebViewHtml.ts` 의 스타일/source 부분 교체로 흡수되므로, 1차 이전이 2차의 발목을 잡지 않는다.

---

## 8. 권장 결정 (Proposed)

1. **옵션 A(MapLibre GL JS, WebView 유지)** 로 이전한다.
2. 1차 스타일은 **OpenFreeMap `positron`(키리스)** 로 하고 access token 인프라를 제거한다.
3. OSM `attributionControl` 을 유지해 ODbL 표기 의무를 충족한다.
4. PMTiles 자가 호스팅은 비용/오프라인 요구 발생 시 후속 ADR로 분리한다.

---

## Related Documents

- ADR-001 Map Provider Selection
- ADR-003 Kakao WebView Strategy
- ADR-008 Map Canvas Architecture
- ADR-012 Recenter Action
- MAP CANVAS.md
