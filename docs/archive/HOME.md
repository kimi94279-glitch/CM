# Current Snapshot

Last Updated: 2026-06-03

## 현재 상태

### 지도(Map)

상태: ✅ 동작

결정:
- Kakao JS SDK + WebView 채택
- 네이티브 카카오 지도 사용 안 함

검증 완료:
- SDK 로드 성공
- 지도 렌더 성공
- 마커 렌더 성공
- 폴리라인 렌더 성공
- RN ↔ WebView 통신 성공
- fitBounds 성공

구현 상태:
- BoardDetail 지도 탭 구현 완료
- 마커 표시 완료
- 장소 연결선 완료

---

### 장소 검색(Search)

상태: ❌ 미동작

원인:
- Supabase Edge Function `place-search` 미배포

확인 사항:
- Dashboard Edge Functions 목록에 `place-search` 없음
- 앱은 `supabase.functions.invoke('place-search')` 호출 중

다음 작업:
1. place-search 배포
2. NAVER_CLIENT_ID Secret 등록
3. NAVER_CLIENT_SECRET Secret 등록
4. 검색 동작 검증

---

### 장소 저장(Place)

상태: ✅ 동작

구현:
- 장소 목록 조회
- 장소 추가
- Board 연결

주의:
- 검색 기능이 막혀 있어 실제 추가 검증 필요

---

### 보드(Board)

상태: ✅ 동작

구현:
- 보드 생성
- 보드 목록 조회
- 보드 상세 화면

---

### 데이터베이스

상태: ✅ 정상

주요 테이블:
- boards
- places

최근 변경:
- 없음

---

### 배포 상태

Frontend:
- Expo Dev Client

Backend:
- Supabase Cloud

Edge Functions:
- ❌ place-search 미배포

---

## 현재 가장 중요한 문제

P1:
- place-search 배포

P2:
- 검색 → 장소 추가 → 지도 표시 전체 플로우 검증

P3:
- 장소 메모 기능

---

## 다음 세션 시작 시 해야 할 일

1. place-search Edge Function 배포
2. NAVER Secret 등록
3. 장소 검색 검증
4. 지도에 실제 저장 장소 표시 검증
5. MVP 완료 여부 재평가