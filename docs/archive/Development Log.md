# Development Log

## 제품 방향 변화

초기 목표:

커플 전용 장소 기록 앱

현재 목표:

Map Canvas 기반 커플 공유 지도

핵심 원칙:

> 모든 행동은 지도 위에서 시작한다.

---

## Supabase 구축

완료

- Auth
    
- DB
    
- RLS
    
- Workspace(Board) 모델
    
- Place 모델
    

---

## 장소 기능 구현

완료

- Place 추가 화면
    
- Place 리스트
    
- Board 연결
    
- Place 삭제
    
- 번호 핀 표시
    
- 장소 강조
    

---

## 장소 검색 아키텍처

최종 결정:

RN  
→ Supabase Edge Function  
→ Kakao Local API

이유:

- API Key 보호
    
- 서버 측 제어
    
- 공급자 변경 용이
    
- 검색 로직 중앙화
    

---

## 지도 공급자 검토

검토:

- Naver Map
    
- Kakao Map
    

결론:

Kakao 채택

---

## 네이티브 카카오 지도 스파이크

결과:

실패 (제품 요구 미충족)

발견:

- 마커 커스터마이징 제약
    
- Polyline 활용 한계
    
- Web 수준의 Overlay 유연성 부족
    

결론:

채택하지 않음

---

## WebView 카카오 지도 스파이크

결과:

성공

검증:

- SDK 로드 성공
    
- 지도 렌더 성공
    
- Marker 성공
    
- CustomOverlay 성공
    
- Polyline 성공
    
- fitBounds 성공
    
- RN ↔ WebView 통신 성공
    

결론:

채택

---

## Map MVP 구현

완료

- 지도 탭
    
- 번호 핀
    
- Polyline
    
- fitBounds
    
- 장소 강조
    
- Marker 클릭 이벤트
    

---

## 번호 핀 설계 결정

결정:

번호는 Place 데이터가 아니다.

번호는 현재 정렬(order_index)에 의해 계산되는 UI 표현이다.

원칙:

- DB 저장 금지
    
- 재인덱싱 금지
    
- 렌더 시 계산
    
- Route 도입 시 충돌 없음
    

---

## Place 삭제 구현

완료

구성:

- placeService.removePlace
    
- useDeletePlace
    
- Alert 확인
    
- Query Invalidation
    

원칙:

- DB 스키마 변경 없음
    
- order_index 재정렬 없음
    
- 번호는 UI에서 재계산
    

---

## ADR 채택

### ADR-008 Map Canvas Architecture

채택

결정:

- places 유지
    
- map_objects 가산 예정
    
- CanvasObject Adapter 채택
    
- Route는 order_index 재사용
    
- Drawing 제외
    

---

### ADR-009 Adaptive Canvas Layout

채택

결정:

- Surface First Principle
    
- Map > UI 구조
    
- Overlay Search
    
- Overlay Bottom Sheet
    
- Adaptive Layout
    
- Tablet 대응 고려
    

---

## Map Canvas 전환

진행 중

완료:

- 지도 중심 구조 정의
    
- Surface First 원칙 수립
    
- Information Hierarchy 정의
    

---

## Phase 2a

완료

BoardDetailScreen 리팩터링:

기존:

Page  
├─ Header  
├─ Search  
├─ Map  
└─ List

현재:

Map  
├─ Search Overlay  
├─ Floating Actions  
└─ Bottom Sheet

결과:

- 지도 Surface화
    
- Header 제거
    
- Canvas Metadata 제거
    
- Bottom Sheet Overlay 적용
    

---

## 현재 상태

완료:

- Supabase
    
- Auth
    
- Workspace
    
- Place CRUD
    
- Kakao WebView 지도
    
- 번호 핀
    
- Polyline
    
- 삭제
    
- Surface Layout
    

진행 중:

- UI Polish
    
- Bottom Sheet 개선
    
- Search Overlay 개선
    

미완료:

- map_objects
    
- Note
    
- Sticker
    
- Drawing
    
- Realtime
    

---

## 현재 이슈

장소 검색 미동작

원인 확인:

- place-search Edge Function 미배포
    

확인 내용:

- Supabase Dashboard에 함수 없음
    
- Kakao Secret 미등록 가능성 존재
    

다음 작업:

1. place-search Edge Function 배포
    
2. KAKAO_REST_API_KEY Secret 등록
    
3. 검색 기능 검증
    
4. Phase 2 UI Polish
    

---

## 다음 목표

Phase 2 UI Polish

목표:

- Bottom Sheet 개선
    
- Search Overlay 개선
    
- 지도 노출 영역 최대화
    
- PlaceCard 정보 정리
    

이후:

Phase 2b

- map_objects
    
- Note
    
- Sticker
    
- CanvasObject Adapter
    
- Tool Palette