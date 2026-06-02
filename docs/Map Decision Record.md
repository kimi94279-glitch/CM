# Map Decision Record

## 문제

지도 위에:

- 장소 마커
- 방문 순서
- 코스 연결

이 필요함.

---

## 검토안

### 1. Naver Native

장점

- RN 지원

단점

- 검색과 지도 플랫폼 분리
- NCP 의존

---

### 2. Kakao Native

검토 결과

라이브러리:

@react-native-kakao/map

발견:

- 마커 부족
- 오버레이 부족
- 폴리라인 부족

결론:

기각

---

### 3. Kakao JS SDK + WebView

결과

성공

지원:

- Marker
- Polyline
- InfoWindow
- CustomOverlay

RN 통신:

- postMessage 가능

---

## 최종 결정

채택:

Kakao JS SDK + WebView

이유:

제품 요구사항 충족

- 장소 핀
- 코스 연결
- 커스텀 UI

모두 구현 가능

---

## 검증 결과

성공

- SDK 로드
- 지도 렌더
- 마커
- 폴리라인
- 이벤트 전달
---

## Architecture Decisions

- [[ADR-001 Map Provider Selection]]
- [[ADR-002 Supabase Adoption]]
- [[ADR-003 Kakao WebView Strategy]]
- [[ADR-004 Search Architecture]]
