import { colors } from '../constants/theme';
import type { Place } from '../types/models';
import { MAPLIBRE_CSS, MAPLIBRE_JS, MAPLIBRE_VERSION } from './vendor/maplibreAssets';

// WebView 에 전달할 최소 장소 정보
export interface MapPlace {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  order_index: number;
  mine: boolean; // 작성자 = 나(핀 색: you / partner)
}

export function toMapPlaces(places: Place[], myId: string | null): MapPlace[] {
  // 방어적 정렬: DB 가 정렬되어 있어도 order_index 기준으로 한 번 더 정렬
  return [...places]
    .sort((a, b) => a.order_index - b.order_index)
    .map((p) => ({
      id: p.id,
      name: p.name,
      latitude: p.latitude,
      longitude: p.longitude,
      order_index: p.order_index,
      mine: p.created_by === myId,
    }));
}

// JSON 을 <script> 안에 안전하게 주입 (script 종료 태그 주입 방지)
// RN→WebView injectJavaScript 시에도 동일 이스케이프를 재사용한다.
export function safeJson(data: unknown): string {
  return JSON.stringify(data).split('<').join('\\u003c');
}

// 기본 중심(서울시청)
const DEFAULT_CENTER = { lat: 37.5666, lng: 126.9784 };
// 시작 지도 스타일 — OpenFreeMap positron(무료·키리스, OSM/OpenMapTiles). Light/미니멀이라 캔버스 위 요소가 돋보인다.
// 추후 CM Style V1(자체 style.json)로 교체 예정 — source URL만 바꾸면 PMTiles 자가호스팅으로도 전환 가능(ADR-013).
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron';
// 카메라 줌(GL zoom, 높을수록 확대). Kakao level 대체값 — 디바이스에서 미세조정 가능.
const EMPTY_ZOOM = 11; // 핀 0개: 도시 레벨
const SINGLE_ZOOM = 14; // 핀 1개: 동네 레벨
const FOCUS_ZOOM = 16; // 알림 탭 등으로 특정 핀/좌표에 맞출 때: 골목 레벨
// 펜: 그린 줌에서의 선 굵기(px)와 줌인 시 굵기 상한(px). 상한이 없으면 크게 확대할 때 선이 화면을 덮는다.
const PEN_WIDTH = 4;
const DRAW_CAP = 40;

export function buildMapHtml(places: MapPlace[]): string {
  const placesJson = safeJson(places);
  const centerJson = safeJson(DEFAULT_CENTER);

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
    // 작성자 잉크(DESIGN.md 사람마다 잉크): 지금은 나=라일락, 상대=스카이. 선택 링은 잉크와 겹치지 않게 검정.
    var YOU_COLOR = '${colors.you}', PARTNER_COLOR = '${colors.partner}', SELECT_COLOR = '${colors.textStrong}';
    // 펜 선은 잉크 soft(파스텔) 톤.
    var YOU_SOFT = '${colors.youSoft}', PARTNER_SOFT = '${colors.partnerSoft}';
    var PEN_WIDTH = ${PEN_WIDTH}, DRAW_CAP = ${DRAW_CAP};
    var map, bounds;
    var styleLoaded = false;   // 'load' 이후에만 source/layer 추가 가능
    var drawReady = false;     // 그림 source/layer 1회 생성 여부
    var PEN_MODE = false;      // 펜 모드: 지도 제스처 잠금 + 캔버스로 선 입력
    var PENDING = [];          // 방금 그려 RN 저장 응답을 기다리는 선(다음 renderObjects 때 비움)
    var markers = [];          // 장소(번호 핀) 마커
    var annotationMarkers = []; // 핀 위 주석(말풍선 + 반응 칩) 마커 — 장소당 1개
    var REACTIONS = {};        // 마지막 반응 입력 { placeId: { mine:[], partner:[] } }
    var MEMOS = {};            // 마지막 메모 입력 { placeId: [{ text, mine }] }
    var routeReady = false;    // 경로 source/layer 1회 생성 여부
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
    window.recenter = function(){ FOCUS = null; applyCamera(); };
    // 카메라 고정 설정(null = 해제). 보드 전환 시 RN 이 null 로 이전 보드 고정을 지운다.
    window.setFocus = function(p){ FOCUS = p; if (p) applyCamera(); };

    // 기존 마커/폴리라인 정리(WebView는 유지). 증분 갱신 시 ghost/메모리 누수 방지.
    function clearOverlays(){
      for (var i = 0; i < markers.length; i++){ markers[i].remove(); }
      markers = [];
      // 경로는 layer를 유지하고 데이터만 비운다(스타일 재생성 비용 회피).
      if (routeReady && map.getSource('route')){
        map.getSource('route').setData({ type:'FeatureCollection', features:[] });
      }
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

    // 경로 source/layer를 1회 생성(이후 setData로만 갱신). 스타일 로드 이후 호출.
    function ensureRoute(){
      if (routeReady) return;
      map.addSource('route', { type:'geojson', data:{ type:'FeatureCollection', features:[] } });
      map.addLayer({
        id:'route-line', type:'line', source:'route',
        layout:{ 'line-cap':'round', 'line-join':'round' },
        paint:{ 'line-color':'${colors.route}', 'line-width':3, 'line-opacity':0.85 }
      });
      routeReady = true;
    }

    // 장소 배열로 마커/폴리라인/카메라를 재구성. 초기 로드와 RN 증분 업데이트가 공용 사용(단일 경로).
    function applyPlaces(list){
      if (!map) return;
      PLACES = list || [];
      clearOverlays();
      bounds = new maplibregl.LngLatBounds();
      var coords = [];
      // 번호형 핀: 배열 순서(1..N) = order_index 정렬 결과. 번호는 UI 파생값(미저장).
      // 핀 색 = 장소를 추가한 사람의 잉크. 동선(폴리라인)은 잉크와 겹치지 않는 중립 회색.
      PLACES.forEach(function(p, i){
        var lngLat = [p.longitude, p.latitude];
        bounds.extend(lngLat);
        coords.push(lngLat);

        var el = document.createElement('div');
        el.style.cssText = 'width:28px;height:28px;line-height:28px;border-radius:14px;background:' + (p.mine ? YOU_COLOR : PARTNER_COLOR) + ';color:#fff;text-align:center;font-weight:700;font-size:13px;box-shadow:0 1px 3px rgba(0,0,0,0.3);cursor:pointer;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;';
        el.textContent = String(i + 1);
        // GL 마커는 click 을 가로채지 않음 → 전파 차단해야 map 'click'(배경 탭)이 따라오지 않는다.
        el.addEventListener('click', function(e){ e.stopPropagation(); send({ type:'markerClick', id: p.id }); });

        var marker = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(lngLat).addTo(map);
        markers.push(marker);
      });

      // order_index 순서대로 폴리라인 (2개 이상일 때)
      if (coords.length >= 2) {
        ensureRoute();
        map.getSource('route').setData({
          type:'Feature', properties:{},
          geometry:{ type:'LineString', coordinates: coords }
        });
      }

      // 카메라: applyCamera()로 위임 — 초기/Recenter/증분 갱신 모두 동일 0/1/2+ 로직.
      applyCamera();
      // 주석은 PLACES 좌표에 매달리므로 장소가 바뀌면 다시 붙인다(삭제된 장소의 잔상 제거).
      applyAnnotations();
    }
    // RN → WebView(injectJavaScript) 진입점. ready 이전 호출은 호출측(RN)에서 가드.
    window.renderPlaces = function(list){ applyPlaces(list); };

    // 작성자별 반응 칩(테두리 = 작성자 색).
    function reactionChip(emojis, color){
      var chip = document.createElement('span');
      chip.style.cssText = 'display:inline-block;padding:0 4px;border-radius:10px;background:rgba(255,255,255,0.95);border:2px solid ' + color + ';box-shadow:0 1px 2px rgba(0,0,0,0.25);font-size:13px;line-height:16px;';
      chip.textContent = emojis.join('');
      return chip;
    }

    // 한 줄 메모 말풍선(테두리 = 작성자 색). 길면 말줄임.
    function memoBubble(text, color){
      var b = document.createElement('div');
      b.style.cssText = 'max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:2px 8px;border-radius:12px;background:#fff;border:2px solid ' + color + ';box-shadow:0 1px 2px rgba(0,0,0,0.25);font-size:12px;line-height:16px;color:' + SELECT_COLOR + ';';
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
        var hasReactions = !!group && (group.mine.length > 0 || group.partner.length > 0);
        if (!hasReactions && !memos.length) return;
        var el = document.createElement('div');
        el.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:2px;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;';
        memos.forEach(function(m){ el.appendChild(memoBubble(m.text, m.mine ? YOU_COLOR : PARTNER_COLOR)); });
        if (hasReactions){
          var row = document.createElement('div');
          row.style.cssText = 'display:flex;gap:2px;white-space:nowrap;';
          if (group.mine.length) row.appendChild(reactionChip(group.mine, YOU_COLOR));
          if (group.partner.length) row.appendChild(reactionChip(group.partner, PARTNER_COLOR));
          el.appendChild(row);
        }
        // 주석 탭 = 그 핀 탭(반응/메모 바 열기). 배경 탭(선택 해제)으로 새지 않게 전파 차단.
        el.addEventListener('click', function(e){ e.stopPropagation(); send({ type:'markerClick', id: place.id }); });
        // 핀(번호 원) 위에 떠 있도록 anchor 'bottom' + 위로 오프셋.
        var marker = new maplibregl.Marker({ element: el, anchor: 'bottom', offset: [0, -22] }).setLngLat([place.longitude, place.latitude]).addTo(map);
        annotationMarkers.push(marker);
      });
    }
    // RN → WebView(injectJavaScript) 진입점. ready 이전 호출은 호출측(RN)에서 가드.
    window.renderReactions = function(byPlaceId){ REACTIONS = byPlaceId || {}; applyAnnotations(); };
    window.renderMemos = function(byPlaceId){ MEMOS = byPlaceId || {}; applyAnnotations(); };

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
      var c = o.mine ? YOU_COLOR : PARTNER_COLOR;
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
        id:'draw-line', type:'line', source:'draw',
        layout:{ 'line-cap':'round', 'line-join':'round' },
        paint:{ 'line-color':['case', ['get', 'mine'], YOU_SOFT, PARTNER_SOFT], 'line-opacity':0.95, 'line-width': drawWidthExpr(0) }
      });
      drawReady = true;
    }
    function drawFeature(id, payload, mine, zoomLevel){
      var pts = payload && payload.points;
      if (!pts || pts.length < 2) return null;
      return {
        type:'Feature',
        properties:{ id: id, mine: !!mine, w: payload.w || PEN_WIDTH, s: payload.scale || 1, z: payload.z != null ? payload.z : zoomLevel },
        geometry:{ type:'LineString', coordinates: pts }
      };
    }
    function applyDrawings(){
      if (!map || !styleLoaded) return;
      ensureDrawLayers();
      var feats = [];
      OBJECTS.forEach(function(o){
        if (o && o.type === 'draw'){ var f = drawFeature(o.id, o.payload, o.mine, o.zoom_level); if (f) feats.push(f); }
      });
      PENDING.forEach(function(p){ var f = drawFeature(p.id, p.payload, true, p.payload.z); if (f) feats.push(f); });
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
    pen.addEventListener('pointerdown', function(e){
      if (!PEN_MODE || !map) return;
      e.preventDefault();
      try { pen.setPointerCapture(e.pointerId); } catch (_){}
      stroke = [localPt(e)];
      clearPen();
      penCtx.strokeStyle = YOU_SOFT; penCtx.lineWidth = PEN_WIDTH; penCtx.lineCap = 'round'; penCtx.lineJoin = 'round';
    });
    pen.addEventListener('pointermove', function(e){
      if (!stroke) return;
      e.preventDefault();
      var p = localPt(e), last = stroke[stroke.length - 1];
      if (Math.abs(p[0] - last[0]) + Math.abs(p[1] - last[1]) < 2) return; // 손떨림 점 줄이기
      stroke.push(p);
      penCtx.beginPath(); penCtx.moveTo(last[0], last[1]); penCtx.lineTo(p[0], p[1]); penCtx.stroke();
    });
    function endStroke(){
      if (!stroke) return;
      var eps = 1.2, pts = simplify(stroke, eps);
      while (pts.length > 400){ eps *= 1.5; pts = simplify(stroke, eps); } // 한 획 최대 400점
      stroke = null;
      if (pts.length < 2){ clearPen(); return; } // 점 하나(탭)는 선이 아니다
      var ll = pts.map(function(p){ var q = map.unproject(p); return [round6(q.lng), round6(q.lat)]; });
      var z = Math.round(map.getZoom() * 100) / 100;
      // 저장 응답 전에도 선이 남도록 레이어에 먼저 그린 뒤 캔버스를 비운다.
      PENDING.push({ id: 'pending-' + Date.now(), payload: { points: ll, z: z, w: PEN_WIDTH } });
      applyDrawings();
      clearPen();
      send({ type:'drawEnd', points: ll, zoom: z, width: PEN_WIDTH });
    }
    pen.addEventListener('pointerup', endStroke);
    pen.addEventListener('pointercancel', endStroke);
    window.addEventListener('resize', function(){ if (PEN_MODE) sizePen(); });

    // RN → WebView 진입점: 펜 모드 켜기/끄기. 켜면 지도 이동·확대를 잠그고 캔버스가 터치를 받는다.
    window.setPenMode = function(on){
      PEN_MODE = !!on;
      stroke = null;
      pen.style.display = PEN_MODE ? 'block' : 'none';
      if (PEN_MODE) sizePen(); else clearPen();
      if (!map) return;
      [map.dragPan, map.scrollZoom, map.touchZoomRotate, map.doubleClickZoom, map.boxZoom, map.keyboard].forEach(function(h){
        if (h) { if (PEN_MODE) h.disable(); else h.enable(); }
      });
      if (!PEN_MODE) map.touchZoomRotate.disableRotation(); // enable() 이 회전까지 켜므로 다시 끈다
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

    // 지도를 못 띄우는 오류 → RN 이 실패 화면(다시 시도)을 보여준다(MapHost).
    // 첫 스타일 로드 전 오류는 잠깐 기다려 본다 — 스프라이트 하나가 늦는 정도면 곧 load 가 온다.
    var fatalTimer = null;
    function failSoon(stage, message){
      if (styleLoaded || fatalTimer) return;
      fatalTimer = setTimeout(function(){ if (!styleLoaded) send({ type:'fatal', stage: stage, message: message }); }, 4000);
    }

    // MapLibre GL JS ${MAPLIBRE_VERSION} 는 위 <script> 로 앱 안에 들어 있다(CDN 없음 — vendor/maplibreAssets).
    (function init(){
      if(!window.maplibregl){ send({ type:'fatal', stage:'sdk', message:'maplibregl undefined' }); return; }
      try {
        // MapLibre는 access token이 없다(OpenFreeMap 키리스). 스타일 JSON URL만 지정.
        map = new maplibregl.Map({
          container: 'map',
          style: '${MAP_STYLE}',
          center: [DEFAULT_CENTER.lng, DEFAULT_CENTER.lat],
          zoom: EMPTY_ZOOM,
          attributionControl: true
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
            var hit = map.queryRenderedFeatures([[pt.x - b, pt.y - b], [pt.x + b, pt.y + b]], { layers:['draw-line'] })
              .filter(function(f){ var id = String(f.properties.id); return id.indexOf('temp-') !== 0 && id.indexOf('pending-') !== 0; })[0];
            if (hit){ send({ type:'objectTap', id: hit.properties.id }); return; }
          }
          // level = 생성 줌(world-space 스케일 기준). zoom_level 컬럼이 integer 라 반올림해 전달.
          send({ type:'mapTap', lat: e.lngLat.lat, lng: e.lngLat.lng, level: Math.round(map.getZoom()) });
        });

        // 줌 변경 시 객체 크기를 world-space 기준으로 재계산(GL JS는 줌 중 연속 발화 → 부드러움).
        map.on('zoom', resizeObjects);

        // 사용자가 직접 지도를 움직이면 카메라 고정 해제(코드의 jumpTo/fitBounds 는 originalEvent 없음).
        map.on('dragstart', function(){ FOCUS = null; });
        map.on('zoomstart', function(e){ if (e && e.originalEvent) FOCUS = null; });

        map.on('load', function(){
          styleLoaded = true;
          // 초기 마커/폴리라인/카메라: 증분 갱신과 동일 경로(applyPlaces) 사용.
          applyPlaces(PLACES);
          applyDrawings();
          send({ type:'ready', count: PLACES.length });
        });
        map.on('error', function(ev){
          var message = ev && ev.error ? String(ev.error.message || ev.error) : 'map error';
          // 첫 로드 전(오프라인·스타일 서버 장애)이면 치명, 이후(타일 하나 실패 등)는 진단용.
          if (!styleLoaded) failSoon('style', message);
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
