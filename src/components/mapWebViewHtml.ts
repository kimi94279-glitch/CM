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
function safeJson(data: unknown): string {
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
  <style>html,body,#map{margin:0;padding:0;width:100%;height:100%;}</style>
</head>
<body>
  <div id="map"></div>
  <script>
    function send(o){ try{ if(window.ReactNativeWebView){ window.ReactNativeWebView.postMessage(JSON.stringify(o)); } }catch(e){} }
    var PLACES = ${placesJson};
    var DEFAULT_CENTER = ${centerJson};

    var s = document.createElement('script');
    s.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=${jsKey}&autoload=false';
    s.onerror = function(){ send({ type:'error', stage:'script', message:'SDK script load failed' }); };
    s.onload = function(){
      if(!window.kakao || !window.kakao.maps){ send({ type:'error', stage:'sdk', message:'kakao.maps undefined' }); return; }
      kakao.maps.load(function(){
        try {
          var map = new kakao.maps.Map(document.getElementById('map'), {
            center: new kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
            level: 5
          });

          var bounds = new kakao.maps.LatLngBounds();
          var path = [];

          PLACES.forEach(function(p){
            var pos = new kakao.maps.LatLng(p.latitude, p.longitude);
            var marker = new kakao.maps.Marker({ position: pos, map: map, title: p.name });
            bounds.extend(pos);
            path.push(pos);
            kakao.maps.event.addListener(marker, 'click', function(){
              send({ type:'markerClick', id: p.id });
            });
          });

          // order_index 순서대로 폴리라인 (2개 이상일 때)
          if (path.length >= 2) {
            var line = new kakao.maps.Polyline({ path: path, strokeWeight: 4, strokeColor: '#FF6B81', strokeOpacity: 0.9 });
            line.setMap(map);
          }

          // 카메라: 0개=기본 중심 / 1개=해당 장소 / 2개 이상=fitBounds
          if (PLACES.length === 1) {
            map.setCenter(new kakao.maps.LatLng(PLACES[0].latitude, PLACES[0].longitude));
            map.setLevel(4);
          } else if (PLACES.length >= 2) {
            map.setBounds(bounds);
          }

          send({ type:'ready', count: PLACES.length });
        } catch(e){ send({ type:'error', stage:'map', message:String(e) }); }
      });
    };
    document.head.appendChild(s);
  </script>
</body>
</html>`;
}
