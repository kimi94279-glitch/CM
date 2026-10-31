import { colors } from '../constants/theme';
import type { PeopleInks } from '../hooks/useInks';
import type { Place } from '../types/models';
import { whoOf, type Who } from '../utils/who';
import { buildMapStyle, TERRAIN_URL, type MapStyleName } from './mapStyles';
import {
  MAPLIBRE_CONTOUR_JS,
  MAPLIBRE_CSS,
  MAPLIBRE_JS,
  MAPLIBRE_VERSION,
} from './vendor/maplibreAssets';

// WebView 에 전달할 최소 장소 정보
export interface MapPlace {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  order_index: number;
  who: Who; // 작성자: 나 · 지금 상대 · 그 밖(예전 상대·탈퇴) — 핀 색
}

export function toMapPlaces(
  places: Place[],
  myId: string | null,
  partnerId: string | null
): MapPlace[] {
  // 방어적 정렬: DB 가 정렬되어 있어도 order_index 기준으로 한 번 더 정렬
  return [...places]
    .sort((a, b) => a.order_index - b.order_index)
    .map((p) => ({
      id: p.id,
      name: p.name,
      latitude: p.latitude,
      longitude: p.longitude,
      order_index: p.order_index,
      who: whoOf(p.created_by, myId, partnerId),
    }));
}

// JSON 을 <script> 안에 안전하게 주입 (script 종료 태그 주입 방지)
// RN→WebView injectJavaScript 시에도 동일 이스케이프를 재사용한다.
export function safeJson(data: unknown): string {
  return JSON.stringify(data).split('<').join('\\u003c');
}

// 기본 중심(서울시청)
const DEFAULT_CENTER = { lat: 37.5666, lng: 126.9784 };
// 지도 바탕 스타일은 mapStyles.ts(종이 지도 3종, OpenFreeMap 벡터 + 지형 타일). 바꾸면 setMapStyle 로 갈아 끼운다.
// 카메라 줌(GL zoom, 높을수록 확대). Kakao level 대체값 — 디바이스에서 미세조정 가능.
const EMPTY_ZOOM = 11; // 핀 0개: 도시 레벨
const SINGLE_ZOOM = 14; // 핀 1개: 동네 레벨
const FOCUS_ZOOM = 16; // 알림 탭 등으로 특정 핀/좌표에 맞출 때: 골목 레벨
// 펜: 그린 줌에서의 선 굵기(px)와 줌인 시 굵기 상한(px). 상한이 없으면 크게 확대할 때 선이 화면을 덮는다.
const PEN_WIDTH = 4;
const DRAW_CAP = 40;

// WebView 로 넘기는 잉크: 사람 구분별 solid(핀·테두리)·soft(펜 선)
export function toMapInks(inks: PeopleInks) {
  const pick = (who: Who) => ({ solid: inks[who].solid, soft: inks[who].soft });
  return { me: pick('me'), partner: pick('partner'), other: pick('other') };
}

export function buildMapHtml(places: MapPlace[], inks: PeopleInks, mapStyle: MapStyleName): string {
  const placesJson = safeJson(places);
  const inksJson = safeJson(toMapInks(inks));
  const centerJson = safeJson(DEFAULT_CENTER);
  const styleJson = safeJson(buildMapStyle(mapStyle));

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>${MAPLIBRE_CSS}</style>
  <style>
    html,body,#map{margin:0;padding:0;width:100%;height:100%;}
    /* 펜 모드 전용 투명 캔버스: 지도 위를 덮고 손가락 선을 받는다(평소 숨김). */
    #pen{position:absolute;left:0;top:0;width:100%;height:100%;display:none;touch-action:none;z-index:5;}
    /* 압정 핀: 작성자 잉크 머리 + 바늘. 이름은 머리 오른쪽(손으로 적은 지명처럼) — 멀리서 보면 숨긴다. */
    .tack{width:24px;height:31px;cursor:pointer;} /* position 은 MapLibre 마커의 absolute 그대로(덮으면 핀이 밀린다) */
    .tack-head{position:absolute;left:0;top:0;width:24px;height:24px;border-radius:12px;border:2.5px solid #fff;box-sizing:border-box;
      box-shadow:0 2px 3px rgba(0,0,0,0.35), inset 0 -3px 0 rgba(0,0,0,0.15);}
    .tack-needle{position:absolute;left:11px;top:22px;width:2px;height:9px;border-radius:1px;background:linear-gradient(#a0a0a0,#505050);
      box-shadow:1px 1px 1px rgba(0,0,0,0.25);}
    .tack-name{position:absolute;left:27px;top:3px;white-space:nowrap;max-width:140px;overflow:hidden;text-overflow:ellipsis;
      font-size:12px;font-weight:700;line-height:16px;color:#2b2b2e;
      text-shadow:0 0 3px #fffdf6,0 0 3px #fffdf6,0 0 3px #fffdf6;}
    /* 핀 위 쪽지·반응: 메신저 말풍선이 아니라 지도에 붙인 종이 조각(왼쪽 잉크 띠 = 쓴 사람). 조금씩 기울여 손으로 붙인 느낌. */
    .note{max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;box-sizing:border-box;
      padding:3px 8px 3px 9px;border-radius:2px;background:#FFFBF2;border:1px solid #E3D6BD;border-left:3px solid;
      box-shadow:0 1px 2px rgba(58,46,28,0.28);font-size:12px;line-height:16px;color:#3A2F22;}
    .note:nth-child(odd){transform:rotate(-1.2deg);}
    .note:nth-child(even){transform:rotate(0.9deg);}
    .chip{display:inline-block;padding:0 5px 0 6px;border-radius:2px;background:#FFFBF2;border:1px solid #E3D6BD;border-left:3px solid;
      box-shadow:0 1px 2px rgba(58,46,28,0.28);font-size:13px;line-height:18px;}
    .far .tack-name{display:none;}
    /* 지도 출처(ODbL)는 늘 보여야 한다 — 아래 필통 위로 올린다 */
    .maplibregl-ctrl-bottom-right{bottom:170px;}
    /* 새로 꽂힌 핀은 위에서 '퐁' 떨어진다(손맛) */
    /* 0.32초: 떨어질 땐 점점 빨리(중력), 바늘이 2px 박혔다가 제자리. 튐은 이 2px 하나뿐(곡선으로 또 튀기지 않는다). */
    .tack.drop .tack-head,.tack.drop .tack-needle{animation:tackDrop .32s both;}
    @keyframes tackDrop{
      0%{transform:translateY(-40px);opacity:0;animation-timing-function:cubic-bezier(.55,0,1,.45)}
      20%{opacity:1}
      60%{transform:translateY(2px);animation-timing-function:cubic-bezier(.23,1,.32,1)}
      100%{transform:none;opacity:1}}
    /* 지도 펼치기(window.unfold): 세 폭으로 접힌 종이 — 가운데 폭 위에 양쪽 날개가 접혀 있다가 펴진다.
       펴는 동안만 있고 끝나면 없어진다(접힌 자국은 남기지 않는다). 탭하면 건너뛴다. */
    #unfold{position:fixed;left:0;top:0;width:100%;height:100%;z-index:50;background:${colors.bg};perspective:1800px;overflow:hidden;}
    #unfold .sheet{position:absolute;top:0;width:calc(100% / 3 + 1px);height:100%;transform-style:preserve-3d;
      transition:transform .68s cubic-bezier(.32,.72,0,1);}
    #unfold .face,#unfold .back,#unfold .shade{position:absolute;left:0;top:0;width:100%;height:100%;}
    #unfold .face,#unfold .back{backface-visibility:hidden;-webkit-backface-visibility:hidden;}
    #unfold .face{background:${colors.bg};}
    #unfold .back{background:#F2ECDF;transform:rotateY(180deg);box-shadow:inset 0 0 0 1px rgba(90,70,40,.14),0 6px 18px rgba(58,46,28,.18);}
    #unfold .shade{pointer-events:none;transition:opacity .68s cubic-bezier(.32,.72,0,1);}
    #unfold .l{left:0;transform-origin:100% 50%;transform:rotateY(178deg);}
    #unfold .m{left:calc(100% / 3);}
    #unfold .r{left:calc(200% / 3);transform-origin:0 50%;transform:rotateY(-176deg);}
    #unfold .l .shade{background:linear-gradient(to left, rgba(58,46,28,.32), rgba(58,46,28,0) 70%);}
    #unfold .r .shade{background:linear-gradient(to right, rgba(58,46,28,.32), rgba(58,46,28,0) 70%);}
    #unfold .m .shade{background:rgba(58,46,28,.12);}
    #unfold.open .r{transform:none;}
    #unfold.open .l{transform:none;transition-delay:.1s;}
    #unfold.open .shade{opacity:0;}
    #unfold.open .l .shade{transition-delay:.1s;}
    #unfold.done{opacity:0;transition:opacity .18s ease-out;}
    /* 동작 줄이기: 끄지 않고 줄인다 — 떨어지지 않고 0.18초 동안 나타나기만 */
    @media (prefers-reduced-motion: reduce){.tack.drop .tack-head,.tack.drop .tack-needle{animation:tackFade .18s ease-out both;}}
    @keyframes tackFade{from{opacity:0}to{opacity:1}}
    /* 종이 효과: 지도 그림 바로 위, 핀·스티커 아래(캔버스 바로 뒤에 끼운다). 손가락은 지도로 통과. */
    #paper{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;}
    #paper .grain{position:absolute;left:0;top:0;width:100%;height:100%;mix-blend-mode:multiply;
      background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.36  0 0 0 0 0.26  0 0 0 0 0.13  0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");}
    /* 지도를 앱처럼: 텍스트/번호 핀 선택 및 long-press 콜아웃/하이라이트 차단 (지도 제스처에는 영향 없음) */
    *{
      -webkit-user-select:none;
      user-select:none;
      -webkit-touch-callout:none;
      -webkit-tap-highlight-color:transparent;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <canvas id="pen"></canvas>
  <script>${MAPLIBRE_JS}</script>
  <script>${MAPLIBRE_CONTOUR_JS}</script>
  <script>
    function send(o){ try{ if(window.ReactNativeWebView){ window.ReactNativeWebView.postMessage(JSON.stringify(o)); } }catch(e){} }
    // 보강: long-press 텍스트 선택/컨텍스트 메뉴 차단 (CSS user-select가 놓치는 잔여 케이스 대비)
    document.addEventListener('selectstart', function(e){ e.preventDefault(); }, { passive:false });
    document.addEventListener('contextmenu', function(e){ e.preventDefault(); }, { passive:false });
    var PLACES = ${placesJson};
    var DEFAULT_CENTER = ${centerJson};
    var EMPTY_ZOOM = ${EMPTY_ZOOM}, SINGLE_ZOOM = ${SINGLE_ZOOM}, FOCUS_ZOOM = ${FOCUS_ZOOM};
    // 카메라 고정 대상 { lat, lng } (알림 탭 진입). 사용자가 지도를 움직이거나 Recenter 하기 전까지
    // 장소 갱신(renderPlaces → applyCamera)이 와도 이 위치를 유지한다 — 데이터 도착 순서와 무관하게 동작.
    var FOCUS = null;
    // 작성자 잉크(DESIGN.md 사람마다 잉크): 나 · 지금 상대 · 그 밖(예전 상대·탈퇴 — 회색). 각자 고른 색을 RN 이 주입,
    // 바뀌면 setInks 로 다시 칠한다. solid = 핀·테두리, soft = 펜 선. 선택 링은 잉크와 겹치지 않게 검정.
    var INKS = ${inksJson}, SELECT_COLOR = '${colors.textStrong}';
    function inkOf(who){ return INKS[who] || INKS.other; }
    // 이 보드에서 마지막으로 보던 카메라 {lng, lat, zoom} — 다시 들어오면 그 자리(RN 이 보드별로 기억).
    var CAMERA = null;
    // 사용자가 지도를 직접 움직였으면 장소가 바뀌어도 카메라를 건드리지 않는다(Recenter 전까지).
    var USER_MOVED = false;
    var PEN_WIDTH = ${PEN_WIDTH}, DRAW_CAP = ${DRAW_CAP};
    // 지도 바탕 스타일(mapStyles.ts) — '@dem'·'@contours' 타일 자리는 resolveStyle 이 채운다.
    var STYLE = ${styleJson};
    var TERRAIN_URL = '${TERRAIN_URL}';
    var SWITCHING = false;     // 스타일을 갈아 끼우는 중(새 스타일 로드 전엔 우리 레이어를 건드리지 않는다)
    var map, bounds;
    var styleLoaded = false;   // 'load' 이후에만 source/layer 추가 가능
    var drawReady = false;     // 그림 source/layer 1회 생성 여부
    var DRAW_TOOL = null;      // 든 도구: 'pencil' 연필 · 'ink' 잉크 · 'marker' 형광펜 · 'string' 실 자 · null(손 = 지도 이동)
    var PENDING = [];          // 방금 그려 RN 저장 응답을 기다리는 선(다음 renderObjects 때 비움)
    var markers = [];          // 장소(번호 핀) 마커
    var annotationMarkers = []; // 핀 위 주석(말풍선 + 반응 칩) 마커 — 장소당 1개
    var REACTIONS = {};        // 마지막 반응 입력 { placeId: { me:[], partner:[], other:[] } }
    var MEMOS = {};            // 마지막 메모 입력 { placeId: [{ text, who }] }
    var DROP_NEXT = {};         // RN 이 "방금 꽂음"을 알려 준 핀 id — 그 핀만 '퐁' 떨어진다(window.dropPin)
    var markerEls = {};         // 핀 id → 마커 요소
    var objectMarkerMap = {};  // id -> { marker, el } (증분 렌더: clear+rebuild 대신 id diff)
    var OBJECTS = [];          // 마지막 렌더된 객체 목록(선택 갱신 시 재사용)
    var SELECTED_ID = null;    // 편집 선택된 객체 id
    // fitBounds 패딩(px). 현재 하드코딩 — Search 상단 영역/우하단 FAB에 핀이 가려지지 않도록 한 근사치.
    // TODO: 추후 RN safe area / insets(상단 Search, 우하단 Utility FAB 높이) 기반 계산값을 주입해 대체 예정.
    var PAD = { top: 96, right: 80, bottom: 112, left: 24 };

    // 0/1/2+ 카메라 단일 진입점 — 초기 로드와 window.recenter()가 공용 사용(분기 중복 제거).
    function applyCamera(){
      if (!map) return;
      if (FOCUS) {
        map.jumpTo({ center: [FOCUS.lng, FOCUS.lat], zoom: FOCUS_ZOOM });
        return;
      }
      if (USER_MOVED) return;
      if (CAMERA) {
        map.jumpTo({ center: [CAMERA.lng, CAMERA.lat], zoom: CAMERA.zoom });
        return;
      }
      if (PLACES.length === 0) {
        map.jumpTo({ center: [DEFAULT_CENTER.lng, DEFAULT_CENTER.lat], zoom: EMPTY_ZOOM });
      } else if (PLACES.length === 1) {
        map.jumpTo({ center: [PLACES[0].longitude, PLACES[0].latitude], zoom: SINGLE_ZOOM });
      } else if (bounds) {
        map.fitBounds(bounds, { padding: PAD, animate: false });
      }
    }
    // RN → WebView(injectJavaScript) 진입점. ready 이전 호출은 호출측(RN)에서 가드.
    // Recenter 는 고정을 풀고 전체 장소 기준으로 돌아간다.
    window.recenter = function(){ FOCUS = null; CAMERA = null; USER_MOVED = false; applyCamera(); };
    // 보드에 들어올 때 RN 이 그 보드의 마지막 카메라(없으면 null = 장소 기준)를 준다.
    window.setCamera = function(c){ CAMERA = c || null; USER_MOVED = false; applyCamera(); };
    // 카메라 고정 설정(null = 해제). 보드 전환 시 RN 이 null 로 이전 보드 고정을 지운다.
    window.setFocus = function(p){ FOCUS = p; if (p) applyCamera(); };

    // 기존 핀 마커 정리(WebView는 유지). 증분 갱신 시 ghost/메모리 누수 방지.
    // 핀을 잇는 자동 동선은 없다 — 선은 사람이 긋는다(2026-10-31 경험 설계).
    function clearOverlays(){
      for (var i = 0; i < markers.length; i++){ markers[i].remove(); }
      markers = [];
    }

    // 핀 위 주석 전용 정리(장소 마커와 분리 — 서로 지우지 않는다).
    function clearAnnotationOverlays(){
      for (var i = 0; i < annotationMarkers.length; i++){ annotationMarkers[i].remove(); }
      annotationMarkers = [];
    }

    // 지리 객체(스티커 등) 전체 정리(full reset 용). 증분 갱신은 applyObjects diff가 담당.
    function clearObjectOverlays(){
      for (var id in objectMarkerMap){
        if (Object.prototype.hasOwnProperty.call(objectMarkerMap, id)) objectMarkerMap[id].marker.remove();
      }
      objectMarkerMap = {};
    }

    // world-space 크기: 객체는 "지도 위에 실제 크기를 가진 것". BASE 24px = 생성 줌에서의 크기,
    // 현재 줌과의 차이를 2^Δ로 환산 → 줌인 시 거대화(일부만 보임)·줌아웃 시 축소.
    // GL zoom은 높을수록 확대 → (getZoom - createZoom). CAP(2500px)=크래시 가드, MIN(6px) 밑은 cull.
    function worldScaleFontPx(createZoom){
      if (createZoom == null || isNaN(createZoom)) createZoom = map.getZoom();
      return Math.min(2500, 24 * Math.pow(2, map.getZoom() - createZoom));
    }
    // cull 히스테리시스: 표시중이면 4px 미만에서 숨김, 숨김중이면 6px 이상에서 표시.
    // 경계(정확히 6px)에서 display none↔'' 가 반복 토글되는 줌 중 깜빡임을 방지한다.
    function applyCull(el, px){
      var shown = el.dataset.vis !== '0';
      if (shown && px < 4){ el.style.display = 'none'; el.dataset.vis = '0'; }
      else if (!shown && px >= 6){ el.style.display = ''; el.dataset.vis = '1'; }
    }
    function resizeObjects(){
      for (var id in objectMarkerMap){
        if (!Object.prototype.hasOwnProperty.call(objectMarkerMap, id)) continue;
        var el = objectMarkerMap[id].el;
        if (!el || !el.dataset) continue;
        var px = worldScaleFontPx(parseFloat(el.dataset.lvl)) * (parseFloat(el.dataset.scale) || 1);
        el.style.fontSize = px + 'px';
        applyCull(el, px);
      }
    }

    // 장소 배열로 핀 마커/카메라를 재구성. 초기 로드와 RN 증분 업데이트가 공용 사용(단일 경로).
    // 압정 핀: 머리 색 = 장소를 추가한 사람의 잉크, 오른쪽에 이름. 번호·자동 동선은 없다(순서는 사람이 긋는 선으로).
    function applyPlaces(list, keepCamera){
      if (!map) return;
      PLACES = list || [];
      clearOverlays();
      bounds = new maplibregl.LngLatBounds();
      markerEls = {};
      PLACES.forEach(function(p){
        var lngLat = [p.longitude, p.latitude];
        bounds.extend(lngLat);

        var el = document.createElement('div');
        el.className = 'tack';
        if (DROP_NEXT[p.id]) startDrop(el);
        delete DROP_NEXT[p.id];
        markerEls[p.id] = el;
        el.innerHTML = '<div class="tack-head"></div><div class="tack-needle"></div><div class="tack-name"></div>';
        el.firstChild.style.background = inkOf(p.who).solid;
        el.lastChild.textContent = p.name;
        // GL 마커는 click 을 가로채지 않음 → 전파 차단해야 map 'click'(배경 탭)이 따라오지 않는다.
        el.addEventListener('click', function(e){ e.stopPropagation(); send({ type:'markerClick', id: p.id }); });

        // 바늘 끝(아래 가운데)이 그 자리를 찌른다
        var marker = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat(lngLat).addTo(map);
        markers.push(marker);
      });

      // 카메라: applyCamera()로 위임 — 초기/Recenter/증분 갱신 모두 동일 0/1/2+ 로직(색만 다시 칠할 땐 그대로).
      if (!keepCamera) applyCamera();
      // 주석은 PLACES 좌표에 매달리므로 장소가 바뀌면 다시 붙인다(삭제된 장소의 잔상 제거).
      applyAnnotations();
    }
    // RN → WebView(injectJavaScript) 진입점. ready 이전 호출은 호출측(RN)에서 가드.
    window.renderPlaces = function(list){ applyPlaces(list); };
    // RN → WebView: 방금 꽂은 핀 — 이미 그려져 있으면 지금, 아니면 목록이 도착할 때 떨어진다.
    window.dropPin = function(id){
      var el = markerEls[id];
      if (!el){ DROP_NEXT[id] = true; return; }
      startDrop(el);
    };
    // RN → WebView: 지도를 열 때 종이 지도 펼치기(docs/Experience Design.md ② 펼친다 — 하루 한 번은 RN 이 정한다).
    // 1) 접힌 종이(가운데 폭 + 그 위에 접힌 양 날개)로 화면을 덮고 — 타일이 뜨는 동안을 가려 준다.
    // 2) 지도가 다 그려지면(idle, 늦어도 1.6초) 지금 그림을 세 폭에 나눠 담고 날개를 편다(0.68초, 오른쪽 먼저).
    // 3) 다 펴지면 덮개를 걷는다 — 아래 살아 있는 지도와 그림이 같아서 이음매가 없고, 핀·쪽지는 이때 드러난다.
    // 탭하면 바로 건너뛴다. 동작 줄이기면 접고 펴지 않고 종이 덮개가 짧게 사라지기만.
    window.unfold = function(){
      if (!map) return;
      var old = document.getElementById('unfold');
      if (old) old.remove();
      var root = document.createElement('div');
      root.id = 'unfold';
      var faces = [];
      ['l', 'm', 'r'].forEach(function(k){
        var s = document.createElement('div');
        s.className = 'sheet ' + k;
        var face = document.createElement('canvas');
        face.className = 'face';
        s.appendChild(face);
        var back = document.createElement('div');
        back.className = 'back';
        s.appendChild(back);
        var shade = document.createElement('div');
        shade.className = 'shade';
        s.appendChild(shade);
        root.appendChild(s);
        faces.push(face);
      });
      document.body.appendChild(root);
      var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var opened = false, finished = false;
      function finish(){
        if (finished) return;
        finished = true;
        root.classList.add('done');
        setTimeout(function(){ root.remove(); }, 220);
      }
      root.addEventListener('pointerdown', function(e){ e.stopPropagation(); finish(); });
      function open(){
        if (opened || finished) return;
        // 바탕을 갈아 끼우는 중이면(보드 바탕이 막 정해짐) 새 바탕이 다 그려진 뒤에 편다
        if (SWITCHING){ map.once('idle', open); return; }
        opened = true;
        if (reduce){ finish(); return; }
        // 지금 지도 그림을 세 폭에 나눠 담는다(그림 버퍼가 살아 있는 render 순간에)
        map.once('render', function(){
          try {
            var src = map.getCanvas(), third = src.width / 3;
            faces.forEach(function(c, i){
              c.width = Math.round(third); c.height = src.height;
              c.getContext('2d').drawImage(src, third * i, 0, third, src.height, 0, 0, c.width, c.height);
            });
          } catch (e) {}
          requestAnimationFrame(function(){ requestAnimationFrame(function(){ root.classList.add('open'); }); });
          setTimeout(finish, 900);
        });
        map.triggerRepaint();
      }
      map.once('idle', open);
      map.triggerRepaint();
      setTimeout(open, 1600);
    };
    // '퐁' 0.32초. 바늘이 종이에 닿는 순간(60%, 약 0.19초)에 RN 이 진동을 울린다 — 보이는 것과 손에 오는 것이 같은 순간.
    // 동작 줄이기면 떨어지지 않고 나타나기만 하고, 진동은 바로.
    function startDrop(el){
      el.classList.remove('drop'); void el.offsetWidth; el.classList.add('drop');
      var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      setTimeout(function(){ send({ type:'pinLanded' }); }, reduce ? 0 : 190);
    }

    // 작성자별 반응 칩(종이 조각, 왼쪽 띠 = 작성자 잉크).
    function reactionChip(emojis, color){
      var chip = document.createElement('span');
      chip.className = 'chip';
      chip.style.borderLeftColor = color;
      chip.textContent = emojis.join('');
      return chip;
    }

    // 한 줄 쪽지(종이 조각, 왼쪽 띠 = 작성자 잉크). 길면 말줄임.
    function memoBubble(text, color){
      var b = document.createElement('div');
      b.className = 'note';
      b.style.borderLeftColor = color;
      b.textContent = text;
      return b;
    }

    // 장소별 주석 재구성: 위에서부터 메모 말풍선(오래된 → 최근) + 반응 칩 줄(내 칩 먼저).
    // 입력은 REACTIONS / MEMOS(RN이 작성자 분리·정리 후 전달). 좌표는 현재 PLACES 에서 동일 id 조회(없으면 skip).
    function applyAnnotations(){
      if (!map) return;
      clearAnnotationOverlays();
      PLACES.forEach(function(place){
        var group = REACTIONS[place.id];
        var memos = MEMOS[place.id] || [];
        var hasReactions = !!group && ['me', 'partner', 'other'].some(function(w){ return group[w] && group[w].length > 0; });
        if (!hasReactions && !memos.length) return;
        var el = document.createElement('div');
        el.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:2px;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;';
        memos.forEach(function(m){ el.appendChild(memoBubble(m.text, inkOf(m.who).solid)); });
        if (hasReactions){
          var row = document.createElement('div');
          row.style.cssText = 'display:flex;gap:2px;white-space:nowrap;';
          ['me', 'partner', 'other'].forEach(function(w){
            if (group[w] && group[w].length) row.appendChild(reactionChip(group[w], inkOf(w).solid));
          });
          el.appendChild(row);
        }
        // 주석 탭 = 그 핀 탭(반응/메모 바 열기). 배경 탭(선택 해제)으로 새지 않게 전파 차단.
        el.addEventListener('click', function(e){ e.stopPropagation(); send({ type:'markerClick', id: place.id }); });
        // 압정 머리 위에 떠 있도록 anchor 'bottom' + 위로 오프셋(핀 높이 31px).
        var marker = new maplibregl.Marker({ element: el, anchor: 'bottom', offset: [0, -34] }).setLngLat([place.longitude, place.latitude]).addTo(map);
        annotationMarkers.push(marker);
      });
    }
    // RN → WebView(injectJavaScript) 진입점. ready 이전 호출은 호출측(RN)에서 가드.
    window.renderReactions = function(byPlaceId){ REACTIONS = byPlaceId || {}; applyAnnotations(); };
    window.renderMemos = function(byPlaceId){ MEMOS = byPlaceId || {}; applyAnnotations(); };
    // 잉크가 바뀌면(내가 색을 고르거나 상대가 바꿈) 카메라는 그대로 두고 핀·주석·스티커·선을 다시 칠한다.
    window.setInks = function(next){
      if (!next) return;
      INKS = next;
      if (!map) return;
      applyPlaces(PLACES, true);
      applyObjects(OBJECTS);
      if (drawReady) map.setPaintProperty('draw-line', 'line-color', drawColorExpr());
    };

    // el 의 데이터/시각(크기·이모지·가시성·선택링)을 객체 상태에 맞춰 갱신. ADD/UPDATE 공용.
    // dataset.lvl = 생성 당시 GL zoom(zoom_level). 좌표 고정 + world-space 크기.
    function styleObjectEl(el, o){
      var scale = (o.payload && o.payload.scale) ? o.payload.scale : 1;
      el.dataset.lvl = (o.zoom_level == null ? map.getZoom() : o.zoom_level);
      el.dataset.scale = scale;
      el.dataset.id = o.id;
      el.textContent = (o.payload && o.payload.emoji) || '';
      var px = worldScaleFontPx(parseFloat(el.dataset.lvl)) * scale;
      el.style.fontSize = px + 'px';
      // 가시성 기준선(이후 줌 변경은 resizeObjects 히스테리시스가 관리).
      el.dataset.vis = px >= 6 ? '1' : '0';
      el.style.display = el.dataset.vis === '1' ? '' : 'none';
      // 작성자 색 외곽선(다이컷 스티커처럼 글리프 둘레). em 단위라 world-space 크기와 함께 스케일된다.
      var c = inkOf(o.who).solid;
      el.style.textShadow = '0.05em 0 0 ' + c + ',-0.05em 0 0 ' + c + ',0 0.05em 0 ' + c + ',0 -0.05em 0 ' + c;
      // 선택 링(선택 시 표시, 아니면 해제) — UPDATE 시 토글도 처리. 작성자 색과 겹치지 않게 잉크색 점선.
      el.style.outline = (o.id === SELECTED_ID) ? '3px dashed ' + SELECT_COLOR : 'none';
      el.style.outlineOffset = '4px';
      el.style.borderRadius = '6px';
    }
    // 핸들러는 id·marker(안정)만 참조 → 생성 시 1회만 부착(UPDATE 시 재부착 불필요).
    // 이동은 수동 터치 드래그: 선택된 객체만 동작. Marker draggable 은 터치에서 합성 click 을
    // 삼켜 objectTap 이 죽으므로 사용하지 않는다. touchmove 좌표는 map.unproject 로 환산.
    function attachObjectHandlers(el, marker, id){
      el.addEventListener('click', function(e){
        e.stopPropagation(); // map 'click'(배경 탭) 동반 발화 차단 → 선택 직후 즉시 해제 방지
        if (el.dataset.dragging === '1'){ el.dataset.dragging = '0'; return; } // 드래그 직후 잔여 click 소거
        send({ type:'objectTap', id: id });
      });
      el.addEventListener('touchstart', function(e){ if (id !== SELECTED_ID) return; e.stopPropagation(); }, { passive:false });
      el.addEventListener('touchmove', function(e){
        if (id !== SELECTED_ID) return;
        e.preventDefault(); e.stopPropagation(); // 지도 팬 차단 + 브라우저 기본 제스처 차단
        el.dataset.dragging = '1';
        var t = e.touches[0];
        var rect = map.getContainer().getBoundingClientRect();
        var ll = map.unproject([t.clientX - rect.left, t.clientY - rect.top]);
        marker.setLngLat(ll);
      }, { passive:false });
      el.addEventListener('touchend', function(e){
        if (id !== SELECTED_ID) return;
        e.stopPropagation();
        if (el.dataset.dragging === '1'){ var p = marker.getLngLat(); send({ type:'objectMove', id:id, lat:p.lat, lng:p.lng }); }
      }, { passive:false });
    }
    // ── 펜 그림(draw) ─────────────────────────────────────────────
    // 그린 선 = 지도 좌표 LineString(GeoJSON 레이어) → 지도와 함께 움직인다.
    // 굵기는 스티커와 같은 world-space 규칙: 그린 줌(z)에서 w px, 줌 차이 2^Δ 배, DRAW_CAP 상한.
    // 'zoom' 은 최상위 interpolate 입력으로만 쓸 수 있어 상한을 줌 레벨마다 정지점으로 넣는다.
    function drawWidthExpr(extra){
      var e = ['interpolate', ['exponential', 2], ['zoom']];
      for (var z = 0; z <= 22; z++){
        e.push(z, ['+', extra, ['min', DRAW_CAP, ['*', ['get', 'w'], ['get', 's'], ['^', 2, ['-', z, ['get', 'z']]]]]]);
      }
      return e;
    }
    // 선 종류(payload.k): 'pencil' 연필(아직 정하지 않은 길 — 흐린 흑연 점선) · 'ink' 잉크(정한 길 — 작성자 잉크) ·
    // 'marker' 형광펜(이 동네 좋아 — 넓은 반투명) · 'string' 실 자(두 점 사이 거리감, 굵기 고정 + 거리 꼬리표). 예전 선은 잉크.
    var DRAW_LAYERS = ['draw-marker', 'draw-pencil', 'draw-line', 'draw-string'];
    function kindIs(k){ return ['==', ['get', 'k'], k]; }
    function ensureDrawLayers(){
      if (drawReady) return;
      map.addSource('draw', { type:'geojson', data:{ type:'FeatureCollection', features:[] } });
      // 선택 표시: 선 아래 잉크색(검정) 반투명 테두리.
      map.addLayer({
        id:'draw-selected', type:'line', source:'draw', filter:['==', ['get', 'id'], ''],
        layout:{ 'line-cap':'round', 'line-join':'round' },
        paint:{ 'line-color': SELECT_COLOR, 'line-opacity':0.35, 'line-width': drawWidthExpr(6) }
      });
      map.addLayer({
        id:'draw-marker', type:'line', source:'draw', filter: kindIs('marker'),
        layout:{ 'line-cap':'round', 'line-join':'round' },
        paint:{ 'line-color':'#FFD84A', 'line-opacity':0.5, 'line-width': drawWidthExpr(0) }
      });
      // 연필·잉크·실 밑에 종이색 테두리 한 겹(Strava·구글 지도의 경로 테두리처럼) — 길·지명이 빽빽한 곳에서도 선이 지도와 섞이지 않게.
      // 연필은 점선이라 테두리를 끊지 않고 이어 깔아 점선이 종이 길 위에 놓이게 한다. 형광펜은 바탕을 칠하는 것이라 두르지 않는다.
      map.addLayer({
        id:'draw-casing', type:'line', source:'draw', filter: ['in', ['get', 'k'], ['literal', ['pencil', 'ink']]],
        layout:{ 'line-cap':'round', 'line-join':'round' },
        paint:{ 'line-color':'${colors.bg}', 'line-opacity':0.85, 'line-width': drawWidthExpr(3) }
      });
      map.addLayer({
        id:'draw-string-casing', type:'line', source:'draw', filter: kindIs('string'),
        layout:{ 'line-cap':'round', 'line-join':'round' },
        paint:{ 'line-color':'${colors.bg}', 'line-opacity':0.85, 'line-width':4.6 }
      });
      map.addLayer({
        id:'draw-pencil', type:'line', source:'draw', filter: kindIs('pencil'),
        layout:{ 'line-cap':'butt', 'line-join':'round' },
        paint:{ 'line-color':'#5B5B5B', 'line-opacity':0.8, 'line-width': drawWidthExpr(0), 'line-dasharray':[1.4, 1.1] }
      });
      map.addLayer({
        id:'draw-line', type:'line', source:'draw', filter: kindIs('ink'),
        layout:{ 'line-cap':'round', 'line-join':'round' },
        paint:{ 'line-color': drawColorExpr(), 'line-opacity':0.95, 'line-width': drawWidthExpr(0) }
      });
      map.addLayer({
        id:'draw-string', type:'line', source:'draw', filter: kindIs('string'),
        layout:{ 'line-cap':'round', 'line-join':'round' },
        paint:{ 'line-color':'#B5502F', 'line-opacity':0.95, 'line-width':1.8 }
      });
      // 실 자 거리 글자: 선을 따라(line-center) 놓으면 지도 타일 경계를 넘는 실에서 타일마다 한 번씩, 두 번 찍힌다.
      // 그래서 실 가운데 점 하나에 실 방향으로 돌려 놓는다(applyDrawings 의 stringLabel).
      map.addLayer({
        id:'draw-string-label', type:'symbol', source:'draw', filter: kindIs('string-label'),
        layout:{ 'symbol-placement':'point', 'text-field':['get', 'label'], 'text-font':['Noto Sans Bold'], 'text-size':13,
          'text-rotation-alignment':'map', 'text-rotate':['get', 'rot'],
          'text-offset':[0, -0.9], 'text-allow-overlap':true },
        paint:{ 'text-color':'#8A3A20', 'text-halo-color':'#FFFDF6', 'text-halo-width':2 }
      });
      drawReady = true;
    }
    // 잉크 선 색 = 작성자 잉크. setInks 때 setPaintProperty 로 갈아 끼운다.
    function drawColorExpr(){
      return ['match', ['get', 'who'], 'me', INKS.me.solid, 'partner', INKS.partner.solid, INKS.other.solid];
    }
    // 실 자: 두 점 사이 거리 → "약 1.6km, 걸어서 24분"(직선 거리, 시간은 우회 1.3배·걸음 4.5km/h·차 30~60km/h 어림)
    function meters(a, b){
      var R = 6371000, t = Math.PI / 180;
      var dLat = (b[1] - a[1]) * t, dLng = (b[0] - a[0]) * t;
      var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a[1] * t) * Math.cos(b[1] * t) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
      return 2 * R * Math.asin(Math.sqrt(h));
    }
    function minutesText(min){
      if (min < 60) return Math.max(1, Math.round(min)) + '분';
      var h = Math.floor(min / 60), m = Math.round(min % 60);
      return h + '시간' + (m ? ' ' + m + '분' : '');
    }
    function rulerLabel(a, b){
      var d = meters(a, b);
      var dist = d < 1000 ? (Math.max(10, Math.round(d / 10) * 10)) + 'm' : (d < 10000 ? (d / 1000).toFixed(1) : Math.round(d / 1000)) + 'km';
      var walkMin = d * 1.3 / 4500 * 60;
      if (walkMin <= 60) return '약 ' + dist + ', 걸어서 ' + minutesText(walkMin);
      var carMin = d * 1.3 / (d < 30000 ? 30000 : 60000) * 60;
      return '약 ' + dist + ', 차로 ' + minutesText(carMin);
    }
    // 실은 살짝 처지게(손으로 실을 댄 느낌) — 저장은 두 점, 그릴 때 곡선을 만든다.
    function sagLine(a, b){
      var pts = [], dx = b[0] - a[0], dy = b[1] - a[1], depth = Math.sqrt(dx * dx + dy * dy) * 0.08;
      for (var i = 0; i <= 16; i++){ var t = i / 16; pts.push([a[0] + dx * t, a[1] + dy * t - Math.sin(Math.PI * t) * depth]); }
      return pts;
    }
    function drawFeature(id, payload, who, zoomLevel){
      var pts = payload && payload.points;
      if (!pts || pts.length < 2) return null;
      var k = payload.k || 'ink';
      var a = pts[0], b = pts[pts.length - 1];
      return {
        type:'Feature',
        properties:{ id: id, who: who || 'other', k: k, label: k === 'string' ? rulerLabel(a, b) : '',
          w: payload.w || PEN_WIDTH, s: payload.scale || 1, z: payload.z != null ? payload.z : zoomLevel },
        geometry:{ type:'LineString', coordinates: k === 'string' ? sagLine(a, b) : pts }
      };
    }
    // 실 자 거리 글자 자리: 처진 실의 가운데 점, 양 끝을 잇는 방향(메르카토르 화면 기준)으로 돌리되 글자가 뒤집히지 않게.
    function stringLabel(f){
      var c = f.geometry.coordinates, a = c[0], b = c[c.length - 1], mid = c[Math.floor(c.length / 2)];
      function mercY(lat){ return Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)); }
      var rot = -Math.atan2(mercY(b[1]) - mercY(a[1]), (b[0] - a[0]) * Math.PI / 180) * 180 / Math.PI;
      if (rot > 90) rot -= 180; else if (rot < -90) rot += 180;
      return { type:'Feature', properties:{ id: f.properties.id, k:'string-label', label: f.properties.label, rot: rot },
        geometry:{ type:'Point', coordinates: mid } };
    }
    function applyDrawings(){
      if (!map || !styleLoaded || SWITCHING) return;
      ensureDrawLayers();
      var feats = [];
      function add(f){
        if (!f) return;
        feats.push(f);
        if (f.properties.k === 'string') feats.push(stringLabel(f));
      }
      OBJECTS.forEach(function(o){
        if (o && o.type === 'draw') add(drawFeature(o.id, o.payload, o.who, o.zoom_level));
      });
      PENDING.forEach(function(p){ add(drawFeature(p.id, p.payload, 'me', p.payload.z)); });
      map.getSource('draw').setData({ type:'FeatureCollection', features: feats });
      map.setFilter('draw-selected', ['==', ['get', 'id'], SELECTED_ID || '']);
    }

    // 펜 입력: 화면 좌표로 받아 단순화(Douglas–Peucker) 후 map.unproject 로 지도 좌표로 바꿔 RN 에 보낸다.
    var pen = document.getElementById('pen');
    var penCtx = pen.getContext('2d');
    var stroke = null;
    function sizePen(){
      var r = window.devicePixelRatio || 1;
      pen.width = pen.clientWidth * r;
      pen.height = pen.clientHeight * r;
      penCtx.setTransform(r, 0, 0, r, 0, 0);
    }
    function clearPen(){ penCtx.clearRect(0, 0, pen.clientWidth, pen.clientHeight); }
    function segDist(p, a, b){
      var dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy;
      if (!l) return Math.hypot(p[0] - a[0], p[1] - a[1]);
      var t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l));
      return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
    }
    function simplify(pts, eps){
      if (pts.length < 3) return pts;
      var keep = new Array(pts.length);
      keep[0] = keep[pts.length - 1] = true;
      var stack = [[0, pts.length - 1]];
      while (stack.length){
        var seg = stack.pop(), a = seg[0], b = seg[1], maxD = 0, idx = -1;
        for (var i = a + 1; i < b; i++){ var d = segDist(pts[i], pts[a], pts[b]); if (d > maxD){ maxD = d; idx = i; } }
        if (maxD > eps && idx > 0){ keep[idx] = true; stack.push([a, idx], [idx, b]); }
      }
      return pts.filter(function(_, i){ return keep[i]; });
    }
    function localPt(e){ var r = pen.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    function round6(v){ return Math.round(v * 1e6) / 1e6; }
    // 도구별 획 굵기(그린 줌에서의 px)와 캔버스 미리보기 모양
    var TOOL_WIDTH = { pencil: 3, ink: PEN_WIDTH, marker: 16, string: 2 };
    function strokeStyle(){
      penCtx.setLineDash([]);
      penCtx.globalAlpha = 1;
      if (DRAW_TOOL === 'pencil'){ penCtx.strokeStyle = '#5B5B5B'; penCtx.setLineDash([5, 4]); }
      else if (DRAW_TOOL === 'marker'){ penCtx.strokeStyle = '#FFD84A'; penCtx.globalAlpha = 0.5; }
      else if (DRAW_TOOL === 'string'){ penCtx.strokeStyle = '#B5502F'; }
      else { penCtx.strokeStyle = INKS.me.solid; }
      penCtx.lineWidth = TOOL_WIDTH[DRAW_TOOL] || PEN_WIDTH; penCtx.lineCap = 'round'; penCtx.lineJoin = 'round';
    }
    // 실 자 미리보기: 시작점에서 손가락까지 곧은 실 + 거리 꼬리표
    function drawRulerPreview(a, p){
      clearPen();
      strokeStyle();
      penCtx.beginPath(); penCtx.moveTo(a[0], a[1]); penCtx.lineTo(p[0], p[1]); penCtx.stroke();
      var qa = map.unproject(a), qb = map.unproject(p);
      var text = rulerLabel([qa.lng, qa.lat], [qb.lng, qb.lat]);
      penCtx.font = 'bold 14px sans-serif';
      var w = penCtx.measureText(text).width + 14, x = (a[0] + p[0]) / 2 - w / 2, y = (a[1] + p[1]) / 2 - 34;
      penCtx.fillStyle = '#FFFDF6'; penCtx.strokeStyle = '#B5502F'; penCtx.lineWidth = 1.5; penCtx.setLineDash([]);
      penCtx.fillRect(x, y, w, 22); penCtx.strokeRect(x, y, w, 22);
      penCtx.fillStyle = '#8A3A20'; penCtx.fillText(text, x + 7, y + 16);
    }
    // 두 손가락 = 언제나 지도 이동·확대(도구를 들고 있어도). 한 손가락 = 그리기.
    var touches = {}, gesture = null;
    function touchList(){ return Object.keys(touches).map(function(k){ return touches[k]; }); }
    function startGesture(){
      var t = touchList(), c = [(t[0][0] + t[1][0]) / 2, (t[0][1] + t[1][1]) / 2];
      gesture = { c: c, d: Math.hypot(t[0][0] - t[1][0], t[0][1] - t[1][1]) || 1, z: map.getZoom() };
      FOCUS = null; USER_MOVED = true;
    }
    function moveGesture(){
      var t = touchList(); if (t.length < 2) return;
      var c = [(t[0][0] + t[1][0]) / 2, (t[0][1] + t[1][1]) / 2];
      var d = Math.hypot(t[0][0] - t[1][0], t[0][1] - t[1][1]) || 1;
      map.panBy([gesture.c[0] - c[0], gesture.c[1] - c[1]], { animate: false });
      map.zoomTo(gesture.z + Math.log2(d / gesture.d), { duration: 0, around: map.unproject(c) });
      gesture.c = c;
    }
    var penPointer = null; // 애플펜슬로 그리는 중이면 그 포인터(손바닥 터치는 무시)
    pen.addEventListener('pointerdown', function(e){
      if (!DRAW_TOOL || !map) return;
      e.preventDefault();
      try { pen.setPointerCapture(e.pointerId); } catch (_){}
      if (e.pointerType === 'pen'){
        penPointer = e.pointerId; touches = {}; gesture = null;
        stroke = [localPt(e)]; clearPen(); strokeStyle(); return;
      }
      if (penPointer !== null) return; // 펜슬로 그리는 중 닿은 손바닥
      if (e.isPrimary) { touches = {}; gesture = null; } // 새 터치의 첫 손가락 — 지난번에 놓친 기록은 버린다
      touches[e.pointerId] = localPt(e);
      if (Object.keys(touches).length >= 2){ // 두 번째 손가락 → 그리던 획은 버리고 지도 이동
        stroke = null; clearPen(); startGesture(); return;
      }
      if (gesture) return;
      stroke = [localPt(e)];
      clearPen();
      strokeStyle();
    });
    pen.addEventListener('pointermove', function(e){
      if (penPointer !== null && e.pointerId !== penPointer) return;
      if (touches[e.pointerId]) touches[e.pointerId] = localPt(e);
      if (gesture){ e.preventDefault(); moveGesture(); return; }
      if (!stroke) return;
      e.preventDefault();
      var p = localPt(e), last = stroke[stroke.length - 1];
      if (Math.abs(p[0] - last[0]) + Math.abs(p[1] - last[1]) < 2) return; // 손떨림 점 줄이기
      if (DRAW_TOOL === 'string'){ stroke = [stroke[0], p]; drawRulerPreview(stroke[0], p); return; }
      stroke.push(p);
      penCtx.beginPath(); penCtx.moveTo(last[0], last[1]); penCtx.lineTo(p[0], p[1]); penCtx.stroke();
    });
    function endStroke(e){
      if (penPointer !== null){
        if (e && e.pointerId !== penPointer) return; // 손바닥이 떨어진 것
        penPointer = null;
      }
      if (e && touches[e.pointerId]) delete touches[e.pointerId];
      if (gesture){ if (Object.keys(touches).length === 0) gesture = null; return; }
      if (!stroke) return;
      var kind = DRAW_TOOL || 'ink';
      var pts = stroke;
      if (kind !== 'string'){
        var eps = 1.2; pts = simplify(stroke, eps);
        while (pts.length > 400){ eps *= 1.5; pts = simplify(stroke, eps); } // 한 획 최대 400점
      }
      stroke = null;
      if (pts.length < 2){ clearPen(); return; } // 점 하나(탭)는 선이 아니다
      if (kind === 'string' && Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]) < 12){ clearPen(); return; }
      var ll = pts.map(function(p){ var q = map.unproject(p); return [round6(q.lng), round6(q.lat)]; });
      var z = Math.round(map.getZoom() * 100) / 100;
      var w = TOOL_WIDTH[kind] || PEN_WIDTH;
      // 저장 응답 전에도 선이 남도록 레이어에 먼저 그린 뒤 캔버스를 비운다.
      PENDING.push({ id: 'pending-' + Date.now(), payload: { points: ll, z: z, w: w, k: kind } });
      applyDrawings();
      clearPen();
      send({ type:'drawEnd', points: ll, zoom: z, width: w, kind: kind });
    }
    pen.addEventListener('pointerup', endStroke);
    pen.addEventListener('pointercancel', endStroke);
    pen.addEventListener('lostpointercapture', function(e){ if (touches[e.pointerId]) delete touches[e.pointerId]; });
    window.addEventListener('resize', function(){ if (DRAW_TOOL) sizePen(); });

    // RN → WebView 진입점: 도구 들기/내려놓기(null = 손). 들면 한 손가락은 그리기(지도 끌기 잠금), 두 손가락은 지도 이동.
    window.setDrawTool = function(tool){
      DRAW_TOOL = tool || null;
      stroke = null; gesture = null; touches = {}; penPointer = null;
      pen.style.display = DRAW_TOOL ? 'block' : 'none';
      if (DRAW_TOOL) sizePen(); else clearPen();
      if (!map) return;
      [map.dragPan, map.scrollZoom, map.touchZoomRotate, map.doubleClickZoom, map.boxZoom, map.keyboard].forEach(function(h){
        if (h) { if (DRAW_TOOL) h.disable(); else h.enable(); }
      });
      if (!DRAW_TOOL) map.touchZoomRotate.disableRotation(); // enable() 이 회전까지 켜므로 다시 끈다
    };

    // 증분 렌더: id 기반 diff(REMOVE/UPDATE/ADD). 전체 clear 없음 → 미변경 객체 DOM 유지(깜빡임 제거).
    function applyObjects(list){
      if (!map) return;
      OBJECTS = list || [];
      // RN 데이터가 갱신되면(낙관 반영 포함) 방금 그린 선도 그 안에 있으므로 임시 선은 비운다.
      PENDING = [];
      applyDrawings();
      // incoming: 유효한 sticker 만 id 맵으로.
      var incoming = {};
      OBJECTS.forEach(function(o){
        if (!o || o.type !== 'sticker') return; // P0: sticker 외 렌더 금지
        if (!(o.payload && o.payload.emoji)) return;
        incoming[o.id] = o;
      });
      // REMOVE: 기존에 있으나 incoming 에 없는 것.
      for (var id in objectMarkerMap){
        if (!Object.prototype.hasOwnProperty.call(objectMarkerMap, id)) continue;
        if (!incoming[id]){ objectMarkerMap[id].marker.remove(); delete objectMarkerMap[id]; }
      }
      // ADD / UPDATE.
      Object.keys(incoming).forEach(function(id){
        var o = incoming[id];
        var entry = objectMarkerMap[id];
        if (entry){
          // UPDATE: 기존 marker 재사용 — 위치/스타일만 갱신(DOM 유지). 드래그는 핸들러가 SELECTED_ID 로 게이팅.
          entry.marker.setLngLat([o.longitude, o.latitude]);
          styleObjectEl(entry.el, o);
        } else {
          // ADD: 신규 생성.
          var el = document.createElement('div');
          el.style.cssText = 'line-height:1;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;';
          styleObjectEl(el, o);
          var marker = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([o.longitude, o.latitude]).addTo(map);
          objectMarkerMap[id] = { marker: marker, el: el };
          attachObjectHandlers(el, marker, id);
        }
      });
    }
    // RN → WebView(injectJavaScript) 진입점. ready 이전 호출은 호출측(RN)에서 가드.
    window.renderObjects = function(list){ applyObjects(list); };
    // 편집 선택 갱신: 선택 id 설정 후 diff 재적용(선택 링/드래그가능만 UPDATE, 재빌드 없음). null 이면 해제.
    window.selectObject = function(id){ SELECTED_ID = id; applyObjects(OBJECTS); };

    // 멀리서 보면(도시 전체) 핀 이름이 서로 겹치므로 숨긴다.
    function markFar(){ if (map) document.body.classList.toggle('far', map.getZoom() < 12.5); }

    // ── 지도 한 장으로 접기(내보내기) ─────────────────────────────
    // 9:16(1080×1920) 종이 한 장. 액자(위 제목 띠 + 테두리 친 지도 + 아래 범례 — 흔한 포스터 틀) 대신 지도가 종이를 꽉 채우고,
    // 제목·날짜·범례·축척은 인쇄 지도처럼 지도 귀퉁이의 네모 칸(표제란)에, 출처는 아래 귀퉁이 작은 칸(판권 — 끌 수 없음)에 둔다.
    // 핀·스티커·쪽지는 지도 그림 위에 다시 그린다. 접힌 자국은 넣지 않는다. 결과는 jpeg base64 로 RN 에 보낸다.
    // opts = { title, dateText, people:[{name, color}], names:{placeId: 이름}, credit }
    var CARD_FONT = '-apple-system, "Apple SD Gothic Neo", "Noto Sans KR", Roboto, sans-serif';
    function cardFont(weight, px){ return weight + ' ' + Math.round(px) + 'px ' + CARD_FONT; }
    // 축척 막대 길이: 1·2·5 × 10ⁿ m 중 maxM 을 넘지 않는 가장 긴 것
    function niceMeters(maxM){
      var p = Math.pow(10, Math.floor(Math.log(maxM) / Math.LN10)), n = maxM / p;
      return (n >= 5 ? 5 : n >= 2 ? 2 : 1) * p;
    }
    function composeCard(opts){
      var W = 1080, H = 1920, PAD = 48, INK = '${colors.textStrong}';
      var out = document.createElement('canvas'); out.width = W; out.height = H;
      var g = out.getContext('2d');
      g.fillStyle = '${colors.bg}'; g.fillRect(0, 0, W, H);
      var src = map.getCanvas(), r = src.width / src.clientWidth;
      // 지도 그림을 종이 비율에 맞게 가운데를 잘라 종이 전체에 깐다(cover)
      var sw = src.width, sh = src.height, want = W / H, sx = 0, sy = 0;
      if (sw / sh > want){ var nw = sh * want; sx = (sw - nw) / 2; sw = nw; } else { var nh = sw / want; sy = (sh - nh) / 2; sh = nh; }
      g.drawImage(src, sx, sy, sw, sh, 0, 0, W, H);
      var k = W / sw * r; // 화면 CSS px → 카드 px
      function toCard(lng, lat){ var p = map.project([lng, lat]); return [(p.x * r - sx) / r * k, (p.y * r - sy) / r * k]; }
      function inside(q){ return q[0] > -40 && q[0] < W + 40 && q[1] > -40 && q[1] < H + 40; }
      // 스티커(이모지)
      OBJECTS.forEach(function(o){
        if (!o || o.type !== 'sticker' || !(o.payload && o.payload.emoji)) return;
        var q = toCard(o.longitude, o.latitude); if (!inside(q)) return;
        var px = worldScaleFontPx(o.zoom_level) * ((o.payload && o.payload.scale) || 1) * k;
        if (px < 8) return;
        g.font = Math.min(px, 400) + 'px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(o.payload.emoji, q[0], q[1]);
      });
      // 핀(압정) + 이름(지도 지명처럼 굵은 고딕) + 최근 쪽지 한 줄
      var names = opts.names || {};
      PLACES.forEach(function(p){
        var q = toCard(p.longitude, p.latitude); if (!inside(q)) return;
        // 화면의 압정(머리 반지름 12px, 바늘 끝에서 머리 가운데까지 19px)을 카드 배율 k 로 키워 그린다
        var hx = q[0], hy = q[1] - 19 * k, hr = 12 * k;
        g.strokeStyle = '#555'; g.lineWidth = 2 * k; g.beginPath(); g.moveTo(hx, q[1]); g.lineTo(hx, hy); g.stroke();
        g.beginPath(); g.arc(hx, hy, hr, 0, Math.PI * 2); g.fillStyle = inkOf(p.who).solid; g.fill();
        g.lineWidth = 2.5 * k; g.strokeStyle = '#fff'; g.stroke();
        var name = names[p.id] || '';
        if (name){
          g.font = cardFont(700, 12 * k); g.textAlign = 'left'; g.textBaseline = 'middle';
          g.lineWidth = 3 * k; g.strokeStyle = '#FFFDF6'; g.strokeText(name, hx + 15 * k, hy);
          g.fillStyle = '#2b2b2e'; g.fillText(name, hx + 15 * k, hy);
        }
        var memos = MEMOS[p.id] || [];
        var memo = memos[memos.length - 1];
        if (memo){
          // 화면의 쪽지와 같은 종이 조각(왼쪽 잉크 띠, 살짝 기울게)
          g.font = cardFont(400, 13 * k); g.textBaseline = 'middle';
          var text = memo.text.length > 18 ? memo.text.slice(0, 17) + '…' : memo.text;
          var bh = 22 * k, tw = g.measureText(text).width + 18 * k, by = hy - hr - 6 * k - bh;
          g.save(); g.translate(hx, by + bh / 2); g.rotate(-0.02);
          g.shadowColor = 'rgba(58,46,28,0.28)'; g.shadowBlur = 2 * k; g.shadowOffsetY = 1 * k;
          g.fillStyle = '${colors.tag}'; g.fillRect(-tw / 2, -bh / 2, tw, bh);
          g.shadowColor = 'transparent';
          g.strokeStyle = '${colors.tagRule}'; g.lineWidth = 1 * k; g.strokeRect(-tw / 2, -bh / 2, tw, bh);
          g.fillStyle = inkOf(memo.who).solid; g.fillRect(-tw / 2, -bh / 2, 3 * k, bh);
          g.fillStyle = '${colors.tagInk}'; g.textAlign = 'center'; g.fillText(text, 1.5 * k, 0);
          g.restore();
        }
      });

      // 표제란(왼쪽 위): 제목 · 날짜 · 사람별 잉크 범례 · 축척. 흰 종이에 먹 괘선, 모서리는 각지게.
      var title = opts.title || '우리 지도', IN = 30, maxInner = W - PAD * 2 - IN * 2;
      var tSize = 64;
      g.font = cardFont(800, tSize);
      while (tSize > 40 && g.measureText(title).width > maxInner){ tSize -= 2; g.font = cardFont(800, tSize); }
      var titleW = Math.min(g.measureText(title).width, maxInner);
      g.font = cardFont(500, 28); var dateW = g.measureText(opts.dateText || '').width;
      g.font = cardFont(600, 28);
      var people = opts.people || [], peopleW = 0;
      people.forEach(function(pp, i){ peopleW += 34 + g.measureText(pp.name).width + (i ? 32 : 0); });
      // 축척: 지도 가운데 위도에서 카드 1px 이 몇 m 인지(MapLibre 타일 512px 기준)
      var c = map.getCenter();
      var mPerCss = 40075016.686 * Math.cos(c.lat * Math.PI / 180) / (512 * Math.pow(2, map.getZoom()));
      var mPerCard = mPerCss / k;
      var barM = niceMeters(260 * mPerCard), barPx = barM / mPerCard;
      var barLabel = barM < 1000 ? barM + 'm' : (barM / 1000) + 'km';
      g.font = cardFont(600, 24); var barW = barPx + 14 + g.measureText(barLabel).width;
      var boxW = Math.max(titleW, dateW, peopleW, barW) + IN * 2;
      var y0 = PAD, x0 = PAD + IN;
      var titleY = y0 + IN + tSize * 0.82, dateY = titleY + 46, ruleY = dateY + 26;
      var peopleY = ruleY + 40, barY = peopleY + (people.length ? 48 : 0);
      var boxH = barY + 22 + IN - y0;
      g.fillStyle = '#FFFFFF'; g.fillRect(PAD, y0, boxW, boxH);
      g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(PAD, y0, boxW, boxH);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = INK;
      g.font = cardFont(800, tSize); g.fillText(title, x0, titleY, maxInner);
      g.font = cardFont(500, 28); g.fillStyle = '${colors.textMuted}'; g.fillText(opts.dateText || '', x0, dateY);
      g.fillStyle = '${colors.border}'; g.fillRect(x0, ruleY, boxW - IN * 2, 2);
      g.textBaseline = 'middle'; g.font = cardFont(600, 28);
      var lx = x0;
      people.forEach(function(pp){
        g.fillStyle = pp.color; g.beginPath(); g.arc(lx + 11, peopleY, 11, 0, Math.PI * 2); g.fill();
        g.fillStyle = INK; g.fillText(pp.name, lx + 34, peopleY);
        lx += 34 + g.measureText(pp.name).width + 32;
      });
      // 축척 막대: 검정·흰 두 칸
      g.fillStyle = INK; g.fillRect(x0, barY - 5, barPx / 2, 10);
      g.fillStyle = '#FFFFFF'; g.fillRect(x0 + barPx / 2, barY - 5, barPx / 2, 10);
      g.strokeStyle = INK; g.lineWidth = 2; g.strokeRect(x0, barY - 5, barPx, 10);
      g.fillStyle = INK; g.font = cardFont(600, 24); g.fillText(barLabel, x0 + barPx + 14, barY);

      // 판권(출처 — 지도 데이터 ODbL, 읽히는 크기): 왼쪽 아래 귀퉁이 작은 칸
      var credit = opts.credit || [];
      if (credit.length){
        var cSize = 20, cMax = W - PAD * 2 - 32;
        g.font = cardFont(400, cSize);
        // 칸 폭에 맞게 글자를 줄인다(그래도 16px 아래로는 안 내림 — 읽혀야 한다)
        var widest = function(){ return Math.max.apply(null, credit.map(function(l){ return g.measureText(l).width; })); };
        while (cSize > 16 && widest() > cMax){ cSize -= 1; g.font = cardFont(400, cSize); }
        var cW = Math.min(widest(), cMax) + 32, cH = credit.length * (cSize + 10) + 22;
        g.fillStyle = 'rgba(255,255,255,0.92)'; g.fillRect(PAD, H - PAD - cH, cW, cH);
        g.fillStyle = '${colors.textMuted}'; g.textAlign = 'left'; g.textBaseline = 'middle';
        credit.forEach(function(line, i){ g.fillText(line, PAD + 16, H - PAD - cH + 11 + (cSize + 10) * (i + 0.5), cMax); });
      }
      return out.toDataURL('image/jpeg', 0.9).split(',')[1];
    }
    // RN → WebView 진입점: 지금 화면 그대로 한 번 다시 그린 직후(그림 버퍼가 살아 있을 때) 카드로 굽는다.
    // (안쪽 함수 이름을 exportCard 로 두면 window.exportCard 와 같은 전역이라 덮어써진다 — composeCard.)
    window.exportCard = function(opts, reqId){
      if (!map) return;
      map.once('render', function(){
        try { send({ type:'exportCard', id: reqId, data: composeCard(opts || {}) }); }
        catch (e) { send({ type:'exportCard', id: reqId, error: String(e) }); }
      });
      map.triggerRepaint();
    };

    // ── 지도 바탕(종이 지도) ─────────────────────────────────────
    // 지형 타일 → 산 음영·높이 색(raster-dem)과 등고선(maplibre-contour 가 기기에서 계산)을 같은 캐시로 쓴다.
    var demSource = null, contourUrl = null;
    function setupTerrain(thresholds){
      try {
        if (!demSource && window.mlcontour){
          demSource = new mlcontour.DemSource({ url: TERRAIN_URL, encoding:'terrarium', maxzoom: 13, worker: true });
          demSource.setupMaplibre(maplibregl);
        }
        if (demSource) contourUrl = demSource.contourProtocolUrl({ thresholds: thresholds, contourLayer:'contours', elevationKey:'ele', levelKey:'level' });
      } catch (e) { demSource = null; contourUrl = null; }
    }
    // '@dem' → 지형 타일, '@contours' → 등고선 프로토콜. 플러그인이 없으면 등고선만 빼고 그린다.
    function resolveStyle(s){
      var out = JSON.parse(JSON.stringify(s));
      setupTerrain((out.metadata || {})['cm:contourThresholds'] || {});
      Object.keys(out.sources).forEach(function(k){
        var src = out.sources[k];
        if (!src.tiles) return;
        if (src.tiles[0] === '@dem') src.tiles = [demSource ? demSource.sharedDemProtocolUrl : TERRAIN_URL];
        else if (src.tiles[0] === '@contours'){
          if (contourUrl) src.tiles = [contourUrl];
          else { delete out.sources[k]; out.layers = out.layers.filter(function(l){ return l.source !== k; }); }
        }
      });
      return out;
    }
    // 스타일이 쓰는 무늬·아이콘은 캔버스로 그려 넣는다(스프라이트 파일 없음).
    function canvasImage(w, h, draw){
      var c = document.createElement('canvas'); c.width = w; c.height = h;
      var g = c.getContext('2d'); draw(g);
      return g.getImageData(0, 0, w, h);
    }
    function roundRect(g, x, y, w, h, r){
      g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
      g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
    }
    var IMAGES = {
      // 지형도 숲 점무늬
      dots: function(){ return canvasImage(16, 16, function(g){
        g.fillStyle = 'rgba(70,140,70,0.85)';
        [[4, 4], [12, 12]].forEach(function(p){ g.beginPath(); g.arc(p[0], p[1], 1.4, 0, Math.PI * 2); g.fill(); });
      }); },
      // 산꼭대기 ▲
      peak: function(){ return canvasImage(18, 16, function(g){
        g.fillStyle = '#5A3A1E'; g.beginPath(); g.moveTo(9, 2); g.lineTo(16, 14); g.lineTo(2, 14); g.closePath(); g.fill();
      }); },
      // 도로 번호 방패(초록 바탕 흰 테두리)
      shield: function(){ return canvasImage(40, 28, function(g){
        g.fillStyle = '#FFFFFF'; roundRect(g, 0, 0, 40, 28, 7); g.fill();
        g.fillStyle = '#1F6B3A'; roundRect(g, 2.5, 2.5, 35, 23, 5); g.fill();
      }); }
    };
    // 종이 결을 캔버스 바로 뒤에 둔다 → 핀·스티커 마커는 그 위에 온다. (접힌 자국은 2026-10-31 뺐다 — 접힌 느낌은 내지 않는다.)
    function applyPaper(){
      var meta = STYLE.metadata || {};
      var paper = document.getElementById('paper');
      if (!paper){
        paper = document.createElement('div'); paper.id = 'paper';
        var canvas = map.getCanvas();
        canvas.parentNode.insertBefore(paper, canvas.nextSibling);
      }
      paper.innerHTML = '<div class="grain" style="opacity:' + (meta['cm:grain'] || 0) + '"></div>';
    }
    // 경위선 격자: 지금 보이는 범위만 만든다(0.1° 굵은 선, 확대하면 0.01° 가는 선 — 멀리선 1°).
    function updateGrid(){
      var src = map && map.getSource('grid');
      if (!src) return;
      var b = map.getBounds(), z = map.getZoom();
      var major = z >= 7 ? 0.1 : 1, step = z >= 11.5 ? 0.01 : major;
      var w = Math.max(-180, b.getWest() - major), e = Math.min(180, b.getEast() + major);
      var s = Math.max(-85, b.getSouth() - major), n = Math.min(85, b.getNorth() + major);
      var f = [], k, v;
      function isMajor(x){ return Math.abs(x / major - Math.round(x / major)) < 1e-6; }
      for (k = Math.ceil(w / step); k * step <= e; k++){
        v = Math.round(k * step * 100) / 100;
        f.push({ type:'Feature', properties:{ major: isMajor(v) }, geometry:{ type:'LineString', coordinates:[[v, s], [v, n]] } });
      }
      for (k = Math.ceil(s / step); k * step <= n; k++){
        v = Math.round(k * step * 100) / 100;
        f.push({ type:'Feature', properties:{ major: isMajor(v) }, geometry:{ type:'LineString', coordinates:[[w, v], [e, v]] } });
      }
      src.setData({ type:'FeatureCollection', features: f });
    }
    // RN → WebView 진입점: 지도 바탕 바꾸기. 경로·그림 레이어는 새 스타일이 뜬 뒤 다시 만든다(카메라·마커는 그대로).
    window.setMapStyle = function(next){
      if (!next) return;
      STYLE = next;
      if (!map || !styleLoaded) return;
      SWITCHING = true;
      map.once('style.load', function(){
        SWITCHING = false;
        drawReady = false;
        applyPlaces(PLACES, true);
        applyDrawings();
        applyPaper();
        updateGrid();
      });
      map.setStyle(resolveStyle(STYLE), { diff: false });
    };

    // 지도를 못 띄우는 오류 → RN 이 실패 화면(다시 시도)을 보여준다(MapHost).
    // 첫 스타일 로드 전 오류는 잠깐 기다려 본다 — 타일 하나가 늦는 정도면 곧 load 가 온다.
    var fatalTimer = null;
    function failSoon(stage, message){
      if (styleLoaded || fatalTimer) return;
      fatalTimer = setTimeout(function(){ if (!styleLoaded) send({ type:'fatal', stage: stage, message: message }); }, 4000);
    }

    // MapLibre GL JS ${MAPLIBRE_VERSION} 는 위 <script> 로 앱 안에 들어 있다(CDN 없음 — vendor/maplibreAssets).
    (function init(){
      if(!window.maplibregl){ send({ type:'fatal', stage:'sdk', message:'maplibregl undefined' }); return; }
      try {
        // MapLibre는 access token이 없다(OpenFreeMap·지형 타일 모두 키리스). 스타일 JSON 은 앱이 만든다(mapStyles.ts).
        map = new maplibregl.Map({
          container: 'map',
          style: resolveStyle(STYLE),
          center: [DEFAULT_CENTER.lng, DEFAULT_CENTER.lat],
          zoom: EMPTY_ZOOM,
          attributionControl: true
        });
        map.on('styleimagemissing', function(e){
          var make = IMAGES[e.id];
          if (make && !map.hasImage(e.id)) map.addImage(e.id, make(), { pixelRatio: 2 });
        });
        // 캔버스 앱 느낌: 회전/피치 비활성(평면 유지).
        map.dragRotate.disable();
        map.touchZoomRotate.disableRotation();
        map.touchPitch.disable();

        // 빈 지도(핀 외 배경) 탭 → RN에 알림(반응 팔레트 닫기 등).
        // 마커는 캔버스 밖 DOM이라 map 'click'을 발화시키지 않는다(핀이 가로채는 효과).
        map.on('click', function(e){
          // 그린 선 위 탭 → 그 선을 편집 선택(손가락 오차 ±8px). 저장 전 임시 선(temp-/pending-)은 제외.
          if (drawReady){
            var b = 8, pt = e.point;
            var hit = map.queryRenderedFeatures([[pt.x - b, pt.y - b], [pt.x + b, pt.y + b]], { layers: DRAW_LAYERS })
              .filter(function(f){ var id = String(f.properties.id); return id.indexOf('temp-') !== 0 && id.indexOf('pending-') !== 0; })[0];
            if (hit){ send({ type:'objectTap', id: hit.properties.id, lat: e.lngLat.lat, lng: e.lngLat.lng, level: Math.round(map.getZoom()) }); return; }
          }
          // level = 생성 줌(world-space 스케일 기준). zoom_level 컬럼이 integer 라 반올림해 전달.
          send({ type:'mapTap', lat: e.lngLat.lat, lng: e.lngLat.lng, level: Math.round(map.getZoom()) });
        });

        // 줌 변경 시 객체 크기를 world-space 기준으로 재계산(GL JS는 줌 중 연속 발화 → 부드러움).
        map.on('zoom', function(){ resizeObjects(); markFar(); });

        // 사용자가 직접 지도를 움직이면 카메라 고정 해제(코드의 jumpTo/fitBounds 는 originalEvent 없음).
        map.on('dragstart', function(){ FOCUS = null; USER_MOVED = true; });
        map.on('zoomstart', function(e){ if (e && e.originalEvent){ FOCUS = null; USER_MOVED = true; } });
        // 카메라가 멈추면 RN 에 알려 보드별로 기억한다(잦은 저장을 피해 잠깐 모아서).
        var cameraTimer = null;
        map.on('moveend', function(){
          if (!styleLoaded) return;
          updateGrid();
          clearTimeout(cameraTimer);
          cameraTimer = setTimeout(function(){
            var c = map.getCenter();
            send({ type:'camera', lng: c.lng, lat: c.lat, zoom: map.getZoom() });
          }, 400);
        });

        map.on('load', function(){
          styleLoaded = true;
          // 초기 마커/폴리라인/카메라: 증분 갱신과 동일 경로(applyPlaces) 사용.
          applyPlaces(PLACES);
          applyDrawings();
          applyPaper();
          updateGrid();
          markFar();
          send({ type:'ready', count: PLACES.length });
        });
        map.on('error', function(ev){
          var message = ev && ev.error ? String(ev.error.message || ev.error) : 'map error';
          // 지형(산 음영·등고선)이 안 와도 지도는 쓸 수 있다 → 치명으로 치지 않는다.
          var terrain = ev && (ev.sourceId === 'dem' || ev.sourceId === 'contours');
          // 첫 로드 전(오프라인·타일 서버 장애)이면 치명, 이후(타일 하나 실패 등)는 진단용.
          if (!styleLoaded && !terrain) failSoon('style', message);
          else send({ type:'error', stage:'map', message: message });
        });
        // 느린 망 대비 30초. 실패 화면이 뜬 뒤라도 늦게 load 되면 ready 가 화면을 걷는다(MapHost).
        setTimeout(function(){ if (!styleLoaded) send({ type:'fatal', stage:'timeout', message:'style load timeout' }); }, 30000);
      } catch(e){ send({ type:'fatal', stage:'sdk', message:String(e) }); }
    })();
  </script>
</body>
</html>`;
}
