# MAP CANVAS.md

# Couple Map — Map Canvas Architecture

> 결정 근거: ADR-008 Map Canvas Architecture
> 핵심 원칙: **"모든 행동은 지도 위에서 시작한다."**

Couple Map은 "장소 저장 앱"이 아니라 **지도 위에서 함께 계획하는 캔버스**다. 사용자는 지도를 열고 그 위에 오브젝트를 배치한다.

---

## 0. UX 원칙

### 0.1 Surface First Principle

Map Canvas에서 **지도는 단순 컴포넌트가 아니라 화면(Surface) 그 자체**다. 모든 UI는 지도 위에 Overlay 된다.

❌ 잘못된 구조 (Page가 지도를 담는다)

```text
Page
 ├─ Header
 ├─ Search
 ├─ Map
 └─ List
```

✅ 올바른 구조 (Map이 Surface이고 UI가 그 위에 뜬다)

```text
Map
 ├─ Search Overlay
 ├─ Floating Actions
 ├─ Object Overlay
 └─ Bottom Sheet
```

### 0.2 Information Hierarchy (정보 우선순위)

1. Map
2. Canvas Objects
3. Search
4. Actions
5. Metadata

> Canvas 이름(예: "성수")은 **지도보다 우선하지 않는다.** 제목 Header가 아니라 Overlay Metadata로 다룬다.

### 0.3 Layout (반응형)

| | Mobile | Tablet |
| --- | --- | --- |
| Map | Fullscreen | Fullscreen |
| Search | Floating | Floating |
| 목록 | Bottom Sheet | Right Side Panel |

---

## 1. 개념 매핑 (기존 → Canvas)

| Canvas 개념 | 물리 저장소 | 비고 |
| --- | --- | --- |
| Canvas | `boards` (rename 없음) | 1 board = 1 지도 캔버스 |
| Place 오브젝트 | `places` (유지) | 좌표 + order_index + 번호 핀 |
| Note / Sticker 오브젝트 | `map_objects` (가산) | 좌표 앵커 + payload(jsonb) |
| Route(동선) | `places.order_index` + Polyline | 신규 테이블 없음 |
| Drawing | (범위 제외) | 좌표변환 스파이크 후 결정 |

- 물리적 테이블 통합 금지. **논리적 일반화는 클라이언트 어댑터로** 수행.

---

## 2. CanvasObject 일반화 (Adapter 패턴)

### 공통 모델(타입 레벨, 구현 예시)

```ts
type CanvasObjectKind = 'place' | 'note' | 'sticker';

interface CanvasObject {
  id: string;
  boardId: string;
  kind: CanvasObjectKind;
  latitude: number;
  longitude: number;
  place?: { name: string; provider: string | null; providerPlaceId: string | null; orderIndex: number };
  note?: { text: string };
  sticker?: { emoji: string };
}
```

### 어댑터

- `places` 행 → `kind:'place'` CanvasObject 로 변환.
- `map_objects` 행 → `kind:'note'|'sticker'` CanvasObject 로 변환.
- DB는 두 테이블 그대로. **앱에서 하나의 `CanvasObject[]`로 병합**해 단일 파이프라인으로 렌더.

### 서비스 레이어

- `canvasService.listObjects(boardId)` = `listPlaces` + `listMapObjects` 병합 → `CanvasObject[]`.
- 생성/삭제는 kind 분기: place → 기존 `placeService`(무변경), note/sticker → 신규 `mapObjectService`.

### 렌더

- `MapWebView`가 `CanvasObject[]`를 받아 kind별 오버레이:
  - place: 번호 CustomOverlay + order_index Polyline(기존 그대로)
  - note: 텍스트 CustomOverlay
  - sticker: 이모지 CustomOverlay

---

## 3. 데이터 모델 (가산)

```text
map_objects
  id          uuid PK
  board_id    uuid FK→boards            -- 캔버스 소속 (RLS: board→couple)
  type        text CHECK ('note','sticker')   -- 추후 확장(드로잉 등)
  latitude    double precision NOT NULL  -- 앵커 좌표
  longitude   double precision NOT NULL
  payload     jsonb NOT NULL DEFAULT '{}' -- note{text} / sticker{emoji}
  created_by  uuid FK→users
  created_at / updated_at
```

- RLS: places와 동일하게 `board→couple` 멤버. SELECT/INSERT/UPDATE/DELETE.
- 좌표 기반 → 지도 확대/축소/이동 시 오버레이가 함께 이동.

---

## 4. UX 흐름도

```text
앱 진입
  └─(워크스페이스 보유)→ Canvas (지도 풀스크린)
        상단(고정): [🔍 검색] [☕ 🍜 🍺 🌳 📸] 카테고리 필터(검색 결과 필터, 추천 아님)
        지도: 현재 위치 중심 / places=번호핀+연결선 / note·sticker 오버레이
        하단: [ + 도구 ] → 📍Place  📝Note  ❤️Sticker
              도구 선택 → 지도 더블탭 = 선택 도구 배치(latlng)
        오브젝트 탭 → 편집/삭제 시트
  (검색 → 결과 선택 → Place 오브젝트로 배치)
```

- **더블탭 = 현재 선택된 도구 배치**(더블탭=생성 아님).
- 검색창 상단 고정, 카테고리는 **검색 필터 UI**(맛집 추천 아님).

---

## 5. 확대/축소 정책 (요약)

| 오브젝트 | 동작 |
| --- | --- |
| Place | 항상 표시, 지도와 함께 이동 |
| Note | 지도와 함께 이동(줌 레벨에 따라 축약 가능) |
| Sticker | 지도와 함께 확대/축소, 항상 표시 |
| Route | 지도와 함께 확대/축소(Polyline) |
| Drawing | (범위 제외) |

---

## 6. 위험 요소

- 🔴 Drawing 좌표 변환(Kakao JS 화면↔latlng) — 범위 제외, 후속 스파이크.
- 🟠 RN→WebView 양방향 통신(더블탭 생성/이동/삭제) 신규.
- 🟠 진입 UX 전환(BoardList→지도) 시 워크스페이스/캔버스 선택 정합.
- 🟠 위치 권한(expo-location), 더블탭 vs 줌 제스처 충돌(도구 모드일 때만 생성).
- 🟢 데이터/RLS: 가산 테이블 + 동일 RLS로 위험 낮음. Place 자산 보존.

---

## 7. 단계 로드맵

- **Phase 2a**: BoardDetail → 지도 중심 풀스크린 + 상단 검색 고정 + 기존 Place 기능 유지.
- **Phase 2b**: `map_objects` + Note/Sticker + 도구 팔레트 + 더블탭 생성.
- **Phase 2c**: 현재 위치 진입 + 카테고리 필터.
- **(후속)** Drawing(스파이크 후), Realtime 협업.

---

## 8. 비범위 (이번 전환에서 제외)

- 물리 테이블 통합 / places 마이그레이션.
- Route 전용 테이블(현재 order_index 재사용).
- Drawing.
- 실시간 협업(Phase 4).
