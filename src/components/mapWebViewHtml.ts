import type { Place } from '../types/models';

// WebView 에 전달할 최소 장소 정보
export interface MapPlace {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  order_index: number;
}

export function toMapPlaces(places: Place[]): MapPlace[] {
  // 방어적 정렬: DB 가 정렬되어 있어도 order_index 기준으로 한 번 더 정렬
  return [...places]
    .sort((a, b) => a.order_index - b.order_index)
    .map((p) => ({
      id: p.id,
      name: p.name,
      latitude: p.latitude,
      longitude: p.longitude,
      order_index: p.order_index,
    }));
}

// JSON 을 <script> 안에 안전하게 주입 (script 종료 태그 주입 방지)
// RN→WebView injectJavaScript 시에도 동일 이스케이프를 재사용한다.
export function safeJson(data: unknown): string {
  return JSON.stringify(data).split('<').join('\\u003c');
}

// 기본 중심(서울시청)
const DEFAULT_CENTER = { lat: 37.5666, lng: 126.9784 };
// Mapbox GL JS CDN 버전 (style/marker API 안정 버전).
const MAPBOX_GL_VERSION = 'v3.9.0';
// 시작 지도 스타일 — Light/미니멀(캔버스 위 요소가 돋보이도록). 추후 Studio 커스텀 URL로 교체.
const MAP_STYLE = 'mapbox://styles/mapbox/light-v11';
// 카메라 줌(Mapbox zoom, 높을수록 확대). Kakao level 대체값 — 디바이스에서 미세조정 가능.
const EMPTY_ZOOM = 11; // 핀 0개: 도시 레벨
const SINGLE_ZOOM = 14; // 핀 1개: 동네 레벨

export function buildMapHtml(accessToken: string, places: MapPlace[]): string {
  const placesJson = safeJson(places);
  const centerJson = safeJson(DEFAULT_CENTER);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link href="https://api.mapbox.com/mapbox-gl-js/${MAPBOX_GL_VERSION}/mapbox-gl.css" rel="stylesheet" />
  <style>
    html,body,#map{margin:0;padding:0;width:100%;height:100%;}
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
  <script>
    function send(o){ try{ if(window.ReactNativeWebView){ window.ReactNativeWebView.postMessage(JSON.stringify(o)); } }catch(e){} }
    // 보강: long-press 텍스트 선택/컨텍스트 메뉴 차단 (CSS user-select가 놓치는 잔여 케이스 대비)
    document.addEventListener('selectstart', function(e){ e.preventDefault(); }, { passive:false });
    document.addEventListener('contextmenu', function(e){ e.preventDefault(); }, { passive:false });
    var PLACES = ${placesJson};
    var DEFAULT_CENTER = ${centerJson};
    var EMPTY_ZOOM = ${EMPTY_ZOOM}, SINGLE_ZOOM = ${SINGLE_ZOOM};
    var map, bounds;
    var markers = [];          // 장소(번호 핀) 마커
    var reactionMarkers = [];  // 반응 배지 마커
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
      if (PLACES.length === 0) {
        map.jumpTo({ center: [DEFAULT_CENTER.lng, DEFAULT_CENTER.lat], zoom: EMPTY_ZOOM });
      } else if (PLACES.length === 1) {
        map.jumpTo({ center: [PLACES[0].longitude, PLACES[0].latitude], zoom: SINGLE_ZOOM });
      } else if (bounds) {
        map.fitBounds(bounds, { padding: PAD, animate: false });
      }
    }
    // RN → WebView(injectJavaScript) 진입점. ready 이전 호출은 호출측(RN)에서 가드.
    window.recenter = function(){ applyCamera(); };

    // 기존 마커/폴리라인 정리(WebView는 유지). 증분 갱신 시 ghost/메모리 누수 방지.
    function clearOverlays(){
      for (var i = 0; i < markers.length; i++){ markers[i].remove(); }
      markers = [];
      // 경로는 layer를 유지하고 데이터만 비운다(스타일 재생성 비용 회피).
      if (routeReady && map.getSource('route')){
        map.getSource('route').setData({ type:'FeatureCollection', features:[] });
      }
    }

    // 반응 배지 전용 정리(장소 마커와 분리 — 서로 지우지 않는다).
    function clearReactionOverlays(){
      for (var i = 0; i < reactionMarkers.length; i++){ reactionMarkers[i].remove(); }
      reactionMarkers = [];
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
    // Mapbox zoom은 높을수록 확대 → (getZoom - createZoom). CAP(2500px)=크래시 가드, MIN(6px) 밑은 cull.
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
        paint:{ 'line-color':'#FF6B81', 'line-width':4, 'line-opacity':0.9 }
      });
      routeReady = true;
    }

    // 장소 배열로 마커/폴리라인/카메라를 재구성. 초기 로드와 RN 증분 업데이트가 공용 사용(단일 경로).
    function applyPlaces(list){
      if (!map) return;
      PLACES = list || [];
      clearOverlays();
      bounds = new mapboxgl.LngLatBounds();
      var coords = [];
      // 번호형 핀: 배열 순서(1..N) = order_index 정렬 결과. 번호는 UI 파생값(미저장).
      PLACES.forEach(function(p, i){
        var lngLat = [p.longitude, p.latitude];
        bounds.extend(lngLat);
        coords.push(lngLat);

        var el = document.createElement('div');
        el.style.cssText = 'width:28px;height:28px;line-height:28px;border-radius:14px;background:#FF6B81;color:#fff;text-align:center;font-weight:700;font-size:13px;box-shadow:0 1px 3px rgba(0,0,0,0.3);cursor:pointer;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;';
        el.textContent = String(i + 1);
        // Mapbox 마커는 click 을 가로채지 않음 → 전파 차단해야 map 'click'(배경 탭)이 따라오지 않는다.
        el.addEventListener('click', function(e){ e.stopPropagation(); send({ type:'markerClick', id: p.id }); });

        var marker = new mapboxgl.Marker({ element: el, anchor: 'center' }).setLngLat(lngLat).addTo(map);
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
    }
    // RN → WebView(injectJavaScript) 진입점. ready 이전 호출은 호출측(RN)에서 가드.
    window.renderPlaces = function(list){ applyPlaces(list); };

    // 장소별 반응 배지 재구성. 입력: { placeId: [이모지, ...] } (RN이 type→이모지 변환·유니크화 후 전달).
    // 좌표는 현재 PLACES 에서 동일 id 조회(없으면 skip). 핀 위에 작은 이모지 칩으로 표시.
    function applyReactions(byPlaceId){
      if (!map) return;
      clearReactionOverlays();
      if (!byPlaceId) return;
      for (var pid in byPlaceId){
        if (!Object.prototype.hasOwnProperty.call(byPlaceId, pid)) continue;
        var emojis = byPlaceId[pid];
        if (!emojis || !emojis.length) continue;
        var place = null;
        for (var i = 0; i < PLACES.length; i++){ if (PLACES[i].id === pid){ place = PLACES[i]; break; } }
        if (!place) continue;
        var el = document.createElement('div');
        el.style.cssText = 'display:inline-block;padding:1px 5px;border-radius:10px;background:rgba(255,255,255,0.95);box-shadow:0 1px 2px rgba(0,0,0,0.25);font-size:13px;line-height:16px;white-space:nowrap;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;';
        el.textContent = emojis.join('');
        el.addEventListener('click', function(e){ e.stopPropagation(); }); // 배지 탭이 배경 탭(선택 해제)으로 새지 않게.
        // 핀(번호 원) 위에 떠 있도록 anchor 'bottom' + 위로 오프셋.
        var marker = new mapboxgl.Marker({ element: el, anchor: 'bottom', offset: [0, -22] }).setLngLat([place.longitude, place.latitude]).addTo(map);
        reactionMarkers.push(marker);
      }
    }
    // RN → WebView(injectJavaScript) 진입점. ready 이전 호출은 호출측(RN)에서 가드.
    window.renderReactions = function(byPlaceId){ applyReactions(byPlaceId); };

    // el 의 데이터/시각(크기·이모지·가시성·선택링)을 객체 상태에 맞춰 갱신. ADD/UPDATE 공용.
    // dataset.lvl = 생성 당시 Mapbox zoom(zoom_level). 좌표 고정 + world-space 크기.
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
      // 선택 링(선택 시 표시, 아니면 해제) — UPDATE 시 토글도 처리.
      el.style.outline = (o.id === SELECTED_ID) ? '3px solid #FF6B81' : 'none';
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
    // 증분 렌더: id 기반 diff(REMOVE/UPDATE/ADD). 전체 clear 없음 → 미변경 객체 DOM 유지(깜빡임 제거).
    function applyObjects(list){
      if (!map) return;
      OBJECTS = list || [];
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
          var marker = new mapboxgl.Marker({ element: el, anchor: 'center' }).setLngLat([o.longitude, o.latitude]).addTo(map);
          objectMarkerMap[id] = { marker: marker, el: el };
          attachObjectHandlers(el, marker, id);
        }
      });
    }
    // RN → WebView(injectJavaScript) 진입점. ready 이전 호출은 호출측(RN)에서 가드.
    window.renderObjects = function(list){ applyObjects(list); };
    // 편집 선택 갱신: 선택 id 설정 후 diff 재적용(선택 링/드래그가능만 UPDATE, 재빌드 없음). null 이면 해제.
    window.selectObject = function(id){ SELECTED_ID = id; applyObjects(OBJECTS); };

    var s = document.createElement('script');
    s.src = 'https://api.mapbox.com/mapbox-gl-js/${MAPBOX_GL_VERSION}/mapbox-gl.js';
    s.onerror = function(){ send({ type:'error', stage:'script', message:'Mapbox GL JS script load failed' }); };
    s.onload = function(){
      if(!window.mapboxgl){ send({ type:'error', stage:'sdk', message:'mapboxgl undefined' }); return; }
      try {
        mapboxgl.accessToken = '${accessToken}';
        map = new mapboxgl.Map({
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
          // level = 생성 줌(world-space 스케일 기준). zoom_level 컬럼이 integer 라 반올림해 전달.
          send({ type:'mapTap', lat: e.lngLat.lat, lng: e.lngLat.lng, level: Math.round(map.getZoom()) });
        });

        // 줌 변경 시 객체 크기를 world-space 기준으로 재계산(GL JS는 줌 중 연속 발화 → 부드러움).
        map.on('zoom', resizeObjects);

        map.on('load', function(){
          // 초기 마커/폴리라인/카메라: 증분 갱신과 동일 경로(applyPlaces) 사용.
          applyPlaces(PLACES);
          send({ type:'ready', count: PLACES.length });
        });
        map.on('error', function(ev){ send({ type:'error', stage:'map', message: ev && ev.error ? String(ev.error.message || ev.error) : 'map error' }); });
      } catch(e){ send({ type:'error', stage:'map', message:String(e) }); }
    };
    document.head.appendChild(s);
  </script>
</body>
</html>`;
}
