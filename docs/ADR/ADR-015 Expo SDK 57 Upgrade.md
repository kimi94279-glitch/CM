---
title: Expo SDK 57 Upgrade — Hermes V1 메모리 회귀 경고 대응
status: Proposed
owner: project
last_review: 2026-10-25
category: adr
related:
  - ADR-013 MapLibre OSM Migration
adr: '015'
date: 2026-10-25
tags:
  - adr
  - expo
  - sdk-upgrade
  - hermes
  - android
  - build
---

# ADR-015 Expo SDK 57 Upgrade — Hermes V1 메모리 회귀 경고 대응

Date: 2026-10-25
Status: Proposed (권고만 — 실제 SDK 메이저 업그레이드는 하지 않음)

---

## Context

`npx expo-doctor` 22개 체크 중 2개가 실패했다.

1. **패키지 버전 불일치** — SDK 56 범위 안의 패치/마이너 뒤처짐. `npx expo install --fix` 로 해결함(같은 커밋).
   - `expo` 56.0.8→56.0.24, `expo-build-properties` 56.0.16→56.0.27, `expo-clipboard` 56.0.3→56.0.4,
     `expo-crypto` 56.0.4→56.0.5, `expo-dev-client` 56.0.18→56.0.28, `expo-linking` 56.0.13→56.0.19,
     `react-native-screens` 4.25.2→~4.26.0(설치 4.26.2). `react-native` 0.85.3·`react-native-webview` 13.16.1 은 그대로.
   - 푸시 알림 커밋(f87f301)이 추가한 `expo-constants` ~56.0.27·`expo-notifications` ~56.0.26 은 이미 SDK 56 권장 버전이라
     그대로 유지(main 병합 후 `expo install --check` 범위에 포함해 확인).
   - `--fix` 직후 npm 이 `expo-constants` 를 `expo/` 와 `expo-linking/` 아래 두 벌로 중첩 설치해 doctor 의
     중복 네이티브 모듈 체크가 새로 실패 → `npm dedupe` 로 루트 1벌로 정리.
   - `@expo/metro`(metro 0.84.5)와 RN CLI(metro 0.84.4)가 metro 를 따로 갖는 건 expo 56.0.24 의 정상 구성(네이티브 모듈 아님).
2. **Hermes V1 메모리 회귀** (`HermesV1VersionCheck`)
   - `expo@56.x` + React Native 0.85.3 에 번들된 Hermes V1 `250829098.0.10` 이 영향 범위(`≤ 250829098.0.15`).
   - doctor 권고: Expo SDK 57 / `expo@57.0.9+` / RN `0.86.2+` 로 업그레이드.

### 회귀의 실체 (expo/expo#46519, Software Mansion 분석)

- Hermes V1 이 **eval 로 평가되는 worklet 함수마다 ~512KB 디버그 메타데이터**를 붙인다.
  `react-native-worklets` / `react-native-reanimated` 의 Legacy Eval Mode 가 UI 런타임에 worklet 을 문자열로 보내 eval 하므로,
  이 두 라이브러리를 **import 만 해도** 메모리가 25–30% 이상(사례: 149MB → 266MB) 늘어난다.
- SDK 56(RN 0.85.x)에는 **백포트되지 않았다**. 최신 SDK 56 번들도 `react-native@0.85.3` 그대로라 SDK 56 안에서는 doctor 경고를 없앨 방법이 없다.
- 수정: `expo@57.0.9`(RN 0.86.2). `expo@57.0.17`(RN 0.86.3)은 개발 모드 시작 지연 회귀까지 수정.
- doctor 체크는 **worklets/reanimated 설치 여부를 보지 않고** SDK 55–57.0.8 + Hermes V1 이면 일괄 경고한다
  (`packages/expo-doctor/src/checks/HermesV1VersionCheck.ts`). `expo.doctor` 설정으로 끌 수도 없다.

### 이 앱에 대한 실제 영향

- `package.json` / `package-lock.json` 에 `react-native-reanimated`·`react-native-worklets` 가 **직접·전이 모두 없음**. `src/` 에도 import 없음.
- 지도는 WebView(MapLibre GL JS) 안에서 돌고, 애니메이션은 WebView 쪽 JS 엔진이 담당한다 — RN Hermes worklet 경로를 타지 않는다.
- 따라서 **현재 구성에서는 이 회귀가 실질적으로 발생하지 않는다.** doctor 경고는 SDK 버전만 보고 내는 보수적 경고다.
- 단, 나중에 Reanimated 를 넣는 순간(바텀시트·제스처 라이브러리 다수가 의존) 바로 영향권에 들어간다.

---

## SDK 57 업그레이드 영향 조사

| 항목                                                                                                      | SDK 56 (현재)            | SDK 57 (최신 `~57.0.31`) | 영향                                                     |
| --------------------------------------------------------------------------------------------------------- | ------------------------ | ------------------------ | -------------------------------------------------------- |
| React Native                                                                                              | 0.85.3                   | 0.86.3                   | RN 팀 표기상 "0.85 대비 breaking change 없음" (601 커밋) |
| React                                                                                                     | 19.2.3                   | 19.2.3                   | 동일                                                     |
| Hermes V1                                                                                                 | 250829098.0.10 (영향)    | 250829098.0.17 (수정)    | doctor 경고 해소                                         |
| `react-native-webview`                                                                                    | 13.16.1                  | 13.16.1                  | **동일 버전** — 지도 WebView 영향 없음                   |
| `react-native-screens`                                                                                    | ~4.26.0                  | ~4.26.0                  | 동일 (4.26.x 는 RN 0.84+ 지원)                           |
| `react-native-safe-area-context`                                                                          | ~5.7.0                   | ~5.7.0                   | 동일                                                     |
| `@react-native-async-storage/async-storage`                                                               | 2.2.0                    | 2.2.0                    | 동일                                                     |
| `@react-navigation/*` v7                                                                                  | —                        | —                        | 순수 JS + screens/safe-area peer 만 요구 → 영향 없음     |
| `expo-*` (build-properties, clipboard, crypto, dev-client, linking, status-bar, constants, notifications) | 56.x                     | 57.x                     | `npx expo install --fix` 가 일괄 정렬                    |
| Gradle wrapper (prebuild 템플릿)                                                                          | 9.3.1                    | 9.3.1                    | 동일                                                     |
| AGP / Kotlin (RN libs.versions.toml)                                                                      | 8.12.0 / 2.1.20          | 8.12.0 / 2.1.20          | 동일                                                     |
| `@react-native/gradle-plugin` foojay                                                                      | **0.5.0** (패치로 1.0.0) | **1.0.0** (upstream)     | **패치 불필요 → 반드시 삭제**                            |

### patch-package 패치 (`patches/@react-native+gradle-plugin+0.85.3.patch`)

- RN 0.86-stable 부터 upstream `packages/gradle-plugin/settings.gradle.kts` 가 이미
  `foojay-resolver-convention` **1.0.0** 이다(0.86.2·0.86.3 태그 확인). 우리 패치가 하던 일이 그대로 들어갔다.
- SDK 57 로 올리면 설치되는 `@react-native/gradle-plugin` 이 0.86.x 가 되어 패치 파일명(0.85.3)과 맞지 않고,
  대상 줄이 이미 바뀌어 있어 **hunk 적용이 실패한다.** patch-package 는 로컬에서는 경고 후 exit 0 이지만
  **CI(EAS Build)에서는 exit 1 → `npm ci` postinstall 실패 → 빌드 실패**.
- 따라서 업그레이드 커밋에서 패치 파일을 삭제해야 한다. 다른 패치가 없으면 `patch-package` devDependency 와
  `postinstall` 스크립트도 함께 제거할 수 있다(남겨 두면 "No patch files found" 로 무해).

### 그 밖의 SDK 57 변경

- `expo prebuild` 가 기본으로 `android/`·`ios/` 를 **지우고 재생성**한다(`--no-clean` 으로 기존 방식).
  이 레포는 네이티브 폴더를 커밋하지 않는 CNG 구성이라 영향 없음. 로컬 `android/` 에 손으로 고친 게 있다면 사라진다.
- iOS 27 SDK 로 빌드하려면 scene 기반 생명주기가 필요 — SDK 57 은 `expo@57.0.23+` 에서
  `expo-build-properties` 의 `ios.enableSceneSupport` 로 opt-in(SDK 58 은 기본). 현재 Android 우선이라 당장은 무관.
- Expo Go: 이 앱은 dev client(EAS development build) 기반이라 무관. 단, **SDK 업그레이드 후 dev client 를 다시 빌드**해야 한다(네이티브 런타임 변경).

### 참고: SDK 58 (2026-10-15 출시)

- RN 0.88, Expo Router 네비게이션 코어 재작성, `NODE_ENV` 처리 변경, RN 0.87/0.88 의 API 제거(InteractionManager 등)·Strict TS API 기본 등
  breaking change 가 많다. Hermes 회귀 해결만이 목적이면 **57 이 위험이 훨씬 작다.**

---

## Options Considered

### Option A — SDK 56 유지, 경고를 알려진 예외로 기록 (현재)

장점

- 변경 0. 출시 직전 네이티브 리빌드·재검증 비용 없음.
- worklets/reanimated 미사용이라 실제 메모리 회귀 없음.

단점

- `expo-doctor` 가 계속 1개 체크 실패로 나와 CI 게이트로 쓰기 어렵다.
- SDK 56 은 이미 두 세대 전(현재 최신 58) — 지원 종료가 가까워진다.
- Reanimated 도입 시 즉시 영향권.

### Option B — SDK 57 로 업그레이드 (권장)

장점

- doctor 2개 체크 모두 통과, Hermes 회귀·개발 시작 지연 회귀 해소.
- webview / screens / safe-area / async-storage / Gradle / AGP / Kotlin 이 **모두 동일** → 지도·네비게이션 위험이 작다.
- 유지보수 중인 Gradle 플러그인 패치를 없앨 수 있다(기술 부채 감소).

단점

- dev client 재빌드 + 실기기 회귀 테스트(지도 WebView, 초대 딥링크, 푸시) 필요.
- RN 0.85→0.86 사이 601 커밋 — "breaking 없음"이지만 Android 15+ edge-to-edge 지원이 대폭 바뀌어 화면 인셋 확인 필요.

### Option C — SDK 58 로 바로 업그레이드

장점

- 최신 지원 창 확보, iOS 27 scene 생명주기 기본 대응.

단점

- breaking change 다수(위 참고). Hermes 회귀만을 이유로 하기엔 범위가 크다.

### 기각한 우회책

- `expo-build-properties` 에 `useHermesV1: false` 를 넣으면 doctor 체크는 통과하지만,
  SDK 56 에서 이 플래그는 **deprecated·무효**(Hermes V1 이 RN 0.84 부터 기본)라 경고만 숨기고 실제 엔진은 그대로다. 쓰지 않는다.
- Worklets bundle mode — 이 앱은 worklets 를 안 쓰므로 해당 없음. Expo 도 프로덕션 비권장.

---

## Recommendation

**Option B — 다음 개발 빌드(dev client)를 새로 만들기 전에 SDK 57 로 올린다.**
급하지 않다: 지금 앱 구성으로는 회귀가 실제로 발생하지 않는다. 그 전까지는 Option A 로 두고 이 문서를 근거로 doctor 경고를 알려진 예외로 취급한다.
다만 푸시 알림(f87f301) 실수신에는 어차피 FCM/APNs 설정과 **새 개발 빌드**가 필요하다. 그 빌드 직전에 SDK 57 로 올리면
네이티브 리빌드·실기기 검증을 한 번으로 합칠 수 있어 가장 싸다.
Reanimated(또는 그것에 의존하는 라이브러리)를 넣기로 하면 **그 전에** SDK 57 업그레이드를 먼저 한다.

### 업그레이드 절차 (실행 시)

```bash
npx expo install expo@^57.0.17 --fix
git rm patches/@react-native+gradle-plugin+0.85.3.patch
npm ci
grep foojay node_modules/@react-native/gradle-plugin/settings.gradle.kts   # 1.0.0 이어야 함(upstream)
npm run typecheck && npm run lint && npx expo-doctor
eas build --profile development --platform android
```

실기기 확인 항목

- 지도 WebView 로드·제스처·핀/스티커/메모 표시, 외부 이동 차단(onShouldStartLoadWithRequest)
- 초대 딥링크(`couplemap://invite?token=...`) → InviteJoin 진입(expo-linking)
- 푸시 알림 토큰 등록·수신·알림 탭 → 해당 핀 이동(expo-notifications config plugin, expo-constants projectId)
- 네이티브 스택 화면 헤더/하단 인셋(edge-to-edge)

---

## Sources

- Expo SDK 57 changelog — https://expo.dev/changelog/sdk-57
- Expo SDK 58 changelog — https://expo.dev/changelog/sdk-58
- React Native 0.86 release post — https://reactnative.dev/blog/2026/06/11/react-native-0.86
- expo/expo#46519 "[SDK 56] Worklets memory regression with Hermes v1" — https://github.com/expo/expo/issues/46519
- Software Mansion, "How Worklets Bundle Mode accidentally fixed Hermes V1 memory regression" — https://rec.swmansion.com/blog/how-worklets-bundle-mode-accidentally-fixed-Hermes-v1-memory-regression/
- expo-doctor `HermesV1VersionCheck.ts` — https://github.com/expo/expo/blob/main/packages/expo-doctor/src/checks/HermesV1VersionCheck.ts
- `bundledNativeModules.json` (sdk-56 / sdk-57 브랜치) — https://github.com/expo/expo/blob/sdk-57/packages/expo/bundledNativeModules.json
- RN gradle-plugin `settings.gradle.kts` (v0.85.3 / v0.86.2 / v0.86.3) — https://github.com/facebook/react-native/blob/v0.86.3/packages/gradle-plugin/settings.gradle.kts
- react-native-screens 4.26.x releases — https://github.com/software-mansion/react-native-screens/releases
