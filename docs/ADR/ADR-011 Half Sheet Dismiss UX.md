---
title: Half Sheet Dismiss UX
status: active
owner: project
last_review: 2026-06-07
category: adr
note: final (accepted — Option A 구현·운영 중; gesture-handler 도입 시 신규 ADR로 재검토)
related:
  - ADR-009 Adaptive Canvas Layout
  - ADR-010 Floating Actions Architecture
adr: "011"
date: 2026-06-06
tags:
  - adr
  - mobile
  - half-sheet
  - gesture
---

# ADR-011 Half Sheet Dismiss UX

Status: Accepted (Final)

> 이전에는 임시 결정(accepted-temporary)이었으나, Option A가 코드에 구현·운영 중이므로 **최종 결정으로 승격**한다. 단 `react-native-gesture-handler` 도입 시 "Future Considerations"의 목표 UX를 신규 ADR로 재검토한다.

## Context

모바일 환경에서 Half Sheet를 아래 방향으로 끌어 닫는 UX를 검토했다.

초기 목표는 사용자가 목록을 아래로 스와이프하여 자연스럽게 시트를 닫을 수 있도록 하는 것이었다.

현재 프로젝트는 react-native-gesture-handler 및 reanimated를 사용하지 않으며, React Native 코어의 Animated + PanResponder만 사용한다.

## Options Considered

### Option A

Grabber 전용 Drag Dismiss

- PanResponder를 grabber 영역에만 부착
    
- FlatList 영역은 터치 불가침
    
- 최소 수정
    
- 회귀 위험 낮음
    

### Option B

목록 전체 Pull-to-Dismiss

- scrollY === 0 상태에서만 dismiss 허용
    
- FlatList와 responder 협상 필요
    
- Android 스크롤 경계 처리 복잡
    
- 연속 스크롤 → dismiss 전환 불완전
    

### Option C

헤더 영역 전체 Drag Zone

- Grabber + Header 영역만 drag zone
    
- FlatList 불가침 유지
    
- 사용성 개선 가능
    

## Decision

Option A(Grabber 전용 Drag Dismiss)를 **최종 채택**한다. (`src/screens/BoardDetailScreen.tsx`의 grabber 전용 PanResponder로 구현됨)

구현 상태:

- Grabber hit area = 48px
    
- PanResponder = grabber 전용
    
- FlatList = 불가침
    
- Dismiss 조건
    

```text
dy > cardHeight * 0.25
OR
vy > 0.5
```

## Rationale

실제 기기 테스트(Galaxy S25 Ultra) 결과:

- Grabber만 사용하는 UX는 동작은 하나 사용성이 다소 부족함
    
- 사용자는 목록 자체를 아래로 당겨 닫기를 기대하는 경향이 있음
    

그러나 현 기술 스택에서는 다음 문제가 존재한다.

- FlatList와 responder 충돌 위험
    
- Android 스크롤 경계 처리 복잡성
    
- JS 기반 제스처 한계
    
- 스크롤 → dismiss 자연 전환 불가
    

따라서 현 단계에서는 안정성을 우선한다.

## Future Considerations

react-native-gesture-handler 도입 시 재검토한다.

목표 UX:

- scrollY === 0
    
- pull down dismiss
    
- FlatList와 자연스러운 공존
    
- 네이티브 수준 제스처 품질
    

## Validation

확인 항목:

- grabber drag dismiss
    
- grabber tap dismiss
    
- close button dismiss
    
- FlatList scroll 정상 동작
    
- 지도 영역 pass-through 유지
    

## Consequences

장점:

- 구현 단순
    
- 회귀 위험 낮음
    
- FlatList 안정성 보존
    

단점:

- 사용자가 기대하는 "목록을 당겨 닫기" UX 미충족
    
- grabber 발견성이 낮음