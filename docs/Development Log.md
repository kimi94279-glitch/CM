# Development Log

## 초기 방향 설정

목표:

커플 전용 장소 기록 앱

---

## Supabase 구축

완료

- Auth
- DB
- Board 모델
- Place 모델

---

## 장소 기능 구현

완료

- Place 추가 화면
- Place 리스트
- Board 연결

---

## 네이버 검색 경로 설계

결정:

RN
→ Edge Function
→ Naver API

이유:

- 키 보호
- 서버 측 제어

---

## 지도 공급자 검토

검토:

- 네이버
- 카카오

---

## 네이티브 카카오 지도 스파이크

결과:

실패(제품 요구 미충족)

발견:

- 마커 API 부족
- 폴리라인 지원 부족

결론:

채택하지 않음

---

## WebView 카카오 지도 스파이크

결과:

성공

검증:

- SDK 로드 성공
- 지도 렌더 성공
- 마커 성공
- 폴리라인 성공
- RN 통신 성공

결론:

채택

---

## Map MVP 구현

완료

- 지도 탭
- 마커 표시
- 폴리라인
- fitBounds
- 장소 강조

---

## 현재 문제

장소 검색 미동작

원인 확인:

- place-search Edge Function 미배포

증거:

Supabase Dashboard에 배포 함수 없음

다음 작업:

- place-search 배포
- Naver Secret 등록
