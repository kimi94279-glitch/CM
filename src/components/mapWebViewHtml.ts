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

export function buildMapHtml(jsKey: string, places: MapPlace[]): string {
  const placesJson = safeJson(places);
  const centerJson = safeJson(DEFAULT_CENTER);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
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
    var map, bounds;
    var overlays = [];
    var polyline = null;
    var reactionOverlays = [];
    var objectOverlayMap = {}; // id -> { overlay, el } (증분 렌더: clear+rebuild 대신 id diff)
    var OBJECTS = [];        // 마지막 렌더된 객체 목록(선택 갱신 시 재사용)
    var SELECTED_ID = null;  // 편집 선택된 객체 id
    // fitBounds 패딩(px). 현재 하드코딩 — Search 상단 영역/우하단 FAB에 핀이 가려지지 않도록 한 근사치.
    // TODO: 추후 RN safe area / insets(상단 Search, 우하단 Utility FAB 높이) 기반 계산값을 주입해 대체 예정.
    var PAD = { top: 96, right: 80, bottom: 112, left: 24 };

    // 0/1/2+ 카메라 단일 진입점 — 초기 로드와 window.recenter()가 공용 사용(분기 중복 제거).
    function applyCamera(){
      if (!map) return;
      if (PLACES.length === 0) {
        map.setLevel(5);
        map.setCenter(new kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng));
      } else if (PLACES.length === 1) {
        map.setLevel(4);
        map.setCenter(new kakao.maps.LatLng(PLACES[0].latitude, PLACES[0].longitude));
      } else {
        map.setBounds(bounds, PAD.top, PAD.right, PAD.bottom, PAD.left);
      }
    }
    // RN → WebView(injectJavaScript) 진입점. ready 이전 호출은 호출측(RN)에서 가드.
    window.recenter = function(){ applyCamera(); };

    // 기존 마커/폴리라인 정리(WebView는 유지). 증분 갱신 시 ghost/메모리 누수 방지.
    function clearOverlays(){
      for (var i = 0; i < overlays.length; i++){ overlays[i].setMap(null); }
      overlays = [];
      if (polyline){ polyline.setMap(null); polyline = null; }
    }

    // 반응 배지 전용 정리(장소 오버레이와 분리 — 서로 지우지 않는다).
    function clearReactionOverlays(){
      for (var i = 0; i < reactionOverlays.length; i++){ reactionOverlays[i].setMap(null); }
      reactionOverlays = [];
    }

    // 지리 객체(스티커 등) 전체 정리(full reset 용). 증분 갱신은 applyObjects diff가 담당.
    function clearObjectOverlays(){
      for (var id in objectOverlayMap){
        if (Object.prototype.hasOwnProperty.call(objectOverlayMap, id)) objectOverlayMap[id].overlay.setMap(null);
      }
      objectOverlayMap = {};
    }

    // world-space 크기: 객체는 "지도 위에 실제 크기를 가진 것". BASE 24px = 생성 레벨에서의 크기,
    // 현재 레벨과의 차이를 2^Δ로 환산 → 줌인 시 거대화(일부만 보임)·줌아웃 시 축소.
    // CAP(2500px)=브라우저 크래시 가드, MIN(6px) 밑은 cull(소멸).
    function worldScaleFontPx(createLvl){
      if (createLvl == null || isNaN(createLvl)) createLvl = map.getLevel();
      return Math.min(2500, 24 * Math.pow(2, createLvl - map.getLevel()));
    }
    // cull 히스테리시스: 표시중이면 4px 미만에서 숨김, 숨김중이면 6px 이상에서 표시.
    // 경계(정확히 6px)에서 display none↔'' 가 반복 토글되는 줌 중 깜빡임을 방지한다.
    function applyCull(el, px){
      var shown = el.dataset.vis !== '0';
      if (shown && px < 4){ el.style.display = 'none'; el.dataset.vis = '0'; }
      else if (!shown && px >= 6){ el.style.display = ''; el.dataset.vis = '1'; }
    }
    function resizeObjects(){
      for (var id in objectOverlayMap){
        if (!Object.prototype.hasOwnProperty.call(objectOverlayMap, id)) continue;
        var el = objectOverlayMap[id].el;
        if (!el || !el.dataset) continue;
        var px = worldScaleFontPx(parseFloat(el.dataset.lvl)) * (parseFloat(el.dataset.scale) || 1);
        el.style.fontSize = px + 'px';
        applyCull(el, px);
      }
    }

    // 장소 배열로 마커/폴리라인/카메라를 재구성. 초기 로드와 RN 증분 업데이트가 공용 사용(단일 경로).
    // 주의: 워커 함수명은 window.renderPlaces 와 반드시 달라야 한다.
    // (classic script에서 최상위 function 선언은 전역 프로퍼티가 되어, 동명 window.x 재할당 시
    //  맨이름 호출이 자기 자신을 가리켜 무한 재귀 → Maximum call stack 발생.)
    function applyPlaces(list){
      if (!map) return;
      PLACES = list || [];
      clearOverlays();
      bounds = new kakao.maps.LatLngBounds();
      var path = [];
      // 번호형 핀: 배열 순서(1..N) = order_index 정렬 결과. 번호는 UI 파생값(미저장).
      PLACES.forEach(function(p, i){
        var pos = new kakao.maps.LatLng(p.latitude, p.longitude);
        bounds.extend(pos);
        path.push(pos);

        var el = document.createElement('div');
        el.style.cssText = 'width:28px;height:28px;line-height:28px;border-radius:14px;background:#FF6B81;color:#fff;text-align:center;font-weight:700;font-size:13px;box-shadow:0 1px 3px rgba(0,0,0,0.3);cursor:pointer;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;';
        el.textContent = String(i + 1);
        el.addEventListener('click', function(){ send({ type:'markerClick', id: p.id }); });

        var overlay = new kakao.maps.CustomOverlay({ position: pos, content: el, yAnchor: 0.5, xAnchor: 0.5, clickable: true });
        overlay.setMap(map);
        overlays.push(overlay);
      });

      // order_index 순서대로 폴리라인 (2개 이상일 때)
      if (path.length >= 2) {
        polyline = new kakao.maps.Polyline({ path: path, strokeWeight: 4, strokeColor: '#FF6B81', strokeOpacity: 0.9 });
        polyline.setMap(map);
      }

      // 카메라: applyCamera()로 위임 — 초기/Recenter/증분 갱신 모두 동일 0/1/2+ 로직.
      applyCamera();
    }
    // RN → WebView(injectJavaScript) 진입점. ready 이전 호출은 호출측(RN)에서 가드.
    window.renderPlaces = function(list){ applyPlaces(list); };

    // 장소별 반응 배지 재구성. 입력: { placeId: [이모지, ...] } (RN이 type→이모지 변환·유니크화 후 전달).
    // 좌표는 현재 PLACES 에서 동일 id 조회(없으면 skip). 핀 위에 작은 이모지 칩으로 표시.
    // 주의(전역명 충돌): 워커 함수명(applyReactions)은 window.renderReactions 와 반드시 달라야 한다.
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
        var pos = new kakao.maps.LatLng(place.latitude, place.longitude);
        var el = document.createElement('div');
        el.style.cssText = 'display:inline-block;padding:1px 5px;border-radius:10px;background:rgba(255,255,255,0.95);box-shadow:0 1px 2px rgba(0,0,0,0.25);font-size:13px;line-height:16px;white-space:nowrap;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;';
        el.textContent = emojis.join('');
        // 핀(번호 원, yAnchor 0.5) 위에 떠 있도록 yAnchor 를 1보다 크게.
        var overlay = new kakao.maps.CustomOverlay({ position: pos, content: el, yAnchor: 1.7, xAnchor: 0.5, clickable: false, zIndex: 5 });
        overlay.setMap(map);
        reactionOverlays.push(overlay);
      }
    }
    // RN → WebView(injectJavaScript) 진입점. ready 이전 호출은 호출측(RN)에서 가드.
    window.renderReactions = function(byPlaceId){ applyReactions(byPlaceId); };

    // 지리 객체 렌더. 입력: [{ id, type, latitude, longitude, payload }, ...].
    // P0: type==='sticker' 만 렌더(payload.emoji). text/arrow/draw 는 데이터만 존재하고 렌더 금지.
    // 좌표 고정 + world-space 크기: 생성 줌(zoom_level) 기준 스케일(worldScaleFontPx), 줌 변경 시 갱신.
    // 주의(전역명 충돌): 워커 함수명(applyObjects)은 window.renderObjects 와 반드시 달라야 한다.
    // el 의 데이터/시각(크기·이모지·가시성·선택링)을 객체 상태에 맞춰 갱신. ADD/UPDATE 공용.
    function styleObjectEl(el, o){
      var scale = (o.payload && o.payload.scale) ? o.payload.scale : 1;
      el.dataset.lvl = (o.zoom_level == null ? map.getLevel() : o.zoom_level);
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
    // 핸들러는 id·overlay(안정)만 참조 → 생성 시 1회만 부착(UPDATE 시 재부착 불필요).
    function attachObjectHandlers(el, overlay, id){
      el.addEventListener('click', function(){
        if (el.dataset.dragging === '1'){ el.dataset.dragging = '0'; return; }
        send({ type:'objectTap', id: id });
      });
      el.addEventListener('touchstart', function(e){ if (id !== SELECTED_ID) return; e.stopPropagation(); }, { passive:false });
      el.addEventListener('touchmove', function(e){
        if (id !== SELECTED_ID) return;
        e.preventDefault(); e.stopPropagation();
        el.dataset.dragging = '1';
        var t = e.touches[0];
        var coords = map.getProjection().coordsFromContainerPoint(new kakao.maps.Point(t.clientX, t.clientY));
        overlay.setPosition(coords);
      }, { passive:false });
      el.addEventListener('touchend', function(e){
        if (id !== SELECTED_ID) return;
        e.stopPropagation();
        if (el.dataset.dragging === '1'){ var p = overlay.getPosition(); send({ type:'objectMove', id:id, lat:p.getLat(), lng:p.getLng() }); }
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
      for (var id in objectOverlayMap){
        if (!Object.prototype.hasOwnProperty.call(objectOverlayMap, id)) continue;
        if (!incoming[id]){ objectOverlayMap[id].overlay.setMap(null); delete objectOverlayMap[id]; }
      }
      // ADD / UPDATE.
      Object.keys(incoming).forEach(function(id){
        var o = incoming[id];
        var entry = objectOverlayMap[id];
        if (entry){
          // UPDATE: 기존 overlay 재사용 — 위치/스타일만 갱신(DOM 유지).
          entry.overlay.setPosition(new kakao.maps.LatLng(o.latitude, o.longitude));
          styleObjectEl(entry.el, o);
        } else {
          // ADD: 신규 생성.
          var el = document.createElement('div');
          el.style.cssText = 'line-height:1;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;';
          styleObjectEl(el, o);
          var overlay = new kakao.maps.CustomOverlay({ position: new kakao.maps.LatLng(o.latitude, o.longitude), content: el, yAnchor: 0.5, xAnchor: 0.5, clickable: true, zIndex: 4 });
          overlay.setMap(map);
          objectOverlayMap[id] = { overlay: overlay, el: el };
          attachObjectHandlers(el, overlay, id);
        }
      });
    }
    // RN → WebView(injectJavaScript) 진입점. ready 이전 호출은 호출측(RN)에서 가드.
    window.renderObjects = function(list){ applyObjects(list); };
    // 편집 선택 갱신: 선택 id 설정 후 diff 재적용(선택 링만 UPDATE, 재빌드 없음). null 이면 해제.
    window.selectObject = function(id){ SELECTED_ID = id; applyObjects(OBJECTS); };

    var s = document.createElement('script');
    s.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=${jsKey}&autoload=false';
    s.onerror = function(){ send({ type:'error', stage:'script', message:'SDK script load failed' }); };
    s.onload = function(){
      if(!window.kakao || !window.kakao.maps){ send({ type:'error', stage:'sdk', message:'kakao.maps undefined' }); return; }
      kakao.maps.load(function(){
        try {
          map = new kakao.maps.Map(document.getElementById('map'), {
            center: new kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
            level: 5
          });

          // 빈 지도(핀 외 배경) 탭 → RN에 알림(반응 팔레트 닫기 등).
          // 핀(CustomOverlay clickable:true)은 이벤트를 가로채 여기로 전파되지 않는다.
          kakao.maps.event.addListener(map, 'click', function(mouseEvent){
            var ll = mouseEvent && mouseEvent.latLng;
            send({ type:'mapTap', lat: ll ? ll.getLat() : null, lng: ll ? ll.getLng() : null, level: map.getLevel() });
          });

          // 줌 변경 시 객체 크기를 world-space 기준으로 재계산.
          kakao.maps.event.addListener(map, 'zoom_changed', resizeObjects);

          // 초기 마커/폴리라인/카메라: 증분 갱신과 동일 경로(applyPlaces) 사용.
          applyPlaces(PLACES);

          send({ type:'ready', count: PLACES.length });
        } catch(e){ send({ type:'error', stage:'map', message:String(e) }); }
      });
    };
    document.head.appendChild(s);
  </script>
</body>
</html>`;
}
