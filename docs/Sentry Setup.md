# Sentry 설정 (오류 수집)

앱 코드는 준비돼 있다(2026-10-27). **DSN 을 넣는 순간 켜지고**, 비워 두면 아무것도 보내지 않는다.

## 코드 위치

- `src/services/monitoring.ts` — `initMonitoring`(App.tsx 맨 위) · `wrapRoot` · `reportError` · `reportMessage` · `setMonitoringUser`
- 보내는 것
  - 화면 오류: `AppErrorBoundary` (하얀 화면 대신 "다시 시도" + 전송)
  - 예상 밖 오류: `friendlyError` 기본 분기(네트워크·권한 오류는 소음이라 제외)
  - 지도 못 뜸: `MapHost` → `map fatal: style|timeout|sdk|crash` (warning)
  - 네이티브 크래시: SDK 기본
- 개인정보: `sendDefaultPii: false`(IP 등 미전송), 사용자는 내부 uid 만(닉네임·이메일 미전송). 성능 추적·세션 리플레이 끔.

## 직접 할 일

1. [sentry.io](https://sentry.io) 가입 → 프로젝트 만들기(플랫폼 React Native)
2. **DSN** 복사
   - 로컬: `.env` 에 `EXPO_PUBLIC_SENTRY_DSN=...`
   - EAS 빌드: Expo 대시보드 → 프로젝트 → Environment variables 에 같은 이름으로(공개값이라 plain 가능)
3. (출시 빌드 전) 소스맵 업로드 — 오류 위치를 원본 코드로 보려면 필요
   - app.json 플러그인을 옵션형으로: `["@sentry/react-native", { "organization": "<org-slug>", "project": "<project-slug>" }]`
   - Sentry → Settings → Auth Tokens 에서 토큰 발급 → EAS 시크릿 `SENTRY_AUTH_TOKEN` (로컬은 `.env.local`, **커밋 금지**)
   - `eas.json` development·preview 는 `SENTRY_DISABLE_AUTO_UPLOAD=true` 로 업로드를 건너뛴다. **production 프로필은 토큰이 없으면 빌드가 실패**할 수 있으니 토큰을 먼저 넣거나 같은 값을 넣는다.
4. 확인: 개발 빌드에서 일부러 오류를 내 Sentry Issues 에 뜨는지 본다.

## 개인정보처리방침에 적을 것

Sentry 는 오류 정보(기기 모델·OS·앱 버전·오류 내용·내부 사용자 ID)를 해외(미국 또는 EU — 가입 시 선택한 데이터 지역)로 보낸다 → **처리 위탁 + 국외 이전** 항목에 포함한다. (Supabase 시드니 리전·Expo 푸시도 같은 항목)
