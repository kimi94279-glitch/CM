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

    // 장소 배열로 마커/폴리라인/카메라를 재구성. 초기 로드와 RN 증분 업데이트가 공용 사용(단일 경로).
    function renderPlaces(list){
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
    window.renderPlaces = function(list){ renderPlaces(list); };

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

          // 초기 마커/폴리라인/카메라: 증분 갱신과 동일 경로(renderPlaces) 사용.
          renderPlaces(PLACES);

          send({ type:'ready', count: PLACES.length });
        } catch(e){ send({ type:'error', stage:'map', message:String(e) }); }
      });
    };
    document.head.appendChild(s);
  </script>
</body>
</html>`;
}
