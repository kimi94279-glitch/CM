// 지도 바탕 스타일 — "내비게이션 이전의 종이 지도 위에 지금의 UI"(2026-10-31 방향, docs/design/map-style-drafts.html).
// 3종을 같은 데이터(OpenFreeMap 벡터 타일 + 지형 타일)로 그린다. 핀·말풍선·펜 선·스티커는 그 위에 따로 얹는다(mapWebViewHtml).
// 지금은 설정의 비교 스위치로 고른다(시험). 정해지면 기본값만 남기거나 지도마다 고르게 한다.
//
// 스타일은 MapLibre style JSON 그대로다. 지형(산 음영·높이 색)과 등고선 소스는 WebView 안에서만 만들 수 있어서
// 타일 주소 자리에 '@dem' · '@contours' 를 두고 WebView 가 채운다. metadata 의 cm:* 는 지도 위 종이 효과·격자 설정.

export type MapStyleName = 'roadmap' | 'atlas' | 'topo';

export const DEFAULT_MAP_STYLE: MapStyleName = 'roadmap';

export const MAP_STYLE_OPTIONS: { name: MapStyleName; label: string; hint: string }[] = [
  { name: 'roadmap', label: '도로지도', hint: '90년대 접는 도로지도' },
  { name: 'atlas', label: '지도책', hint: '사회과부도 — 높이에 따라 색' },
  { name: 'topo', label: '지형도', hint: '등고선·방안 격자' },
];

export function isMapStyleName(v: unknown): v is MapStyleName {
  return v === 'roadmap' || v === 'atlas' || v === 'topo';
}

// 지형 타일(Mapzen Terrain Tiles, AWS Open Data — 무료·키리스, terrarium 인코딩). 출처는 설정 "정보"와 지도 출처 표시.
export const TERRAIN_URL =
  'https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png';
const TERRAIN_ATTRIBUTION = 'Terrain © Mapzen, AWS';

type Json = Record<string, unknown>;
// [색, 테두리색(없으면 null), 굵기 배수, 점선]
type Road = [string, string | null, number, number[]?];
type RoadKind = 'motorway' | 'major' | 'secondary' | 'tertiary' | 'minor' | 'path';

interface Theme {
  paper: string;
  relief?: (number | string)[]; // 높이(m)·색 정지점 — 지도책
  urban: [string, number] | null;
  wood: [string, number] | null;
  park: [string, number] | null;
  pattern: [string, number] | null; // 숲·공원 무늬(WebView 가 캔버스로 그려 넣는 이미지 이름)
  hillshade: { shadow: string; highlight: string; accent: string; ex: number };
  contours: { color: string; index: string; label: string } | null;
  water: string;
  coast: [string, number];
  ripples: [string, number[], number[]] | null; // 해안선 안쪽 물결선 [색, 간격(px), 투명도]
  waterway: string;
  building: [string, number, number] | null; // [색, 투명도, 보이기 시작하는 줌]
  roads: Partial<Record<RoadKind, Road | null>>;
  casing?: [number, number, number]; // 테두리 두께(줌 10/14/17)
  rail: [string, 'ticks' | 'dashes'];
  grid: [string, string] | null; // 경위선 격자 [0.01° 색, 0.1° 색]
  shields?: boolean;
  peaks?: boolean;
  text: string;
  halo: string;
  waterText: string;
  spacing: number;
  paperFx: 'creases' | null;
  grain: number;
}

const THEMES: Record<MapStyleName, Theme> = {
  // 주유소에서 받던 접는 도로지도: 빨강·주황·노랑 도로에 테두리, 연한 주황 시가지, 도로 번호 방패, 접힌 자국
  roadmap: {
    paper: '#FBF6E9',
    urban: ['#F6E2C2', 1],
    wood: ['#D3E5BA', 1],
    park: ['#BFDDA2', 1],
    pattern: null,
    hillshade: {
      shadow: 'rgba(110,90,60,0.28)',
      highlight: 'rgba(255,255,255,0.3)',
      accent: 'rgba(0,0,0,0)',
      ex: 0.3,
    },
    contours: null,
    water: '#9DCAE6',
    coast: ['#4D8FC0', 0.9],
    ripples: null,
    waterway: '#6FAED8',
    building: ['#E7D3B6', 1, 14],
    roads: {
      motorway: ['#E0393E', '#8E1C20', 1.15],
      major: ['#F28B30', '#A8561A', 1.05],
      secondary: ['#F7D046', '#B39020', 1],
      tertiary: ['#FFFFFF', '#BFAE92', 1],
      minor: ['#FFFFFF', '#D2C5AE', 1],
      path: ['#B19F80', null, 1, [2, 1.5]],
    },
    rail: ['#2A2A2A', 'dashes'],
    grid: null,
    shields: true,
    text: '#252525',
    halo: 'rgba(255,255,255,0.92)',
    waterText: '#2D6E9E',
    spacing: 0,
    paperFx: 'creases',
    grain: 0.25,
  },
  // 학교 지도책(사회과부도): 높이에 따라 초록→노랑→갈색 + 산 음영, 붉은 시가지, 큰 길만 빨간 선, 산 이름·높이
  atlas: {
    paper: '#BCD99C',
    relief: [
      0,
      '#B5D596',
      25,
      '#C9E0A0',
      80,
      '#DDE8AA',
      160,
      '#EFE6A6',
      300,
      '#EED196',
      500,
      '#E2B57C',
      800,
      '#CF9765',
      1200,
      '#B27A4F',
      1700,
      '#8F5E3B',
    ],
    urban: ['#E28C79', 0.42],
    wood: null,
    park: null,
    pattern: null,
    hillshade: {
      shadow: 'rgba(55,40,24,0.5)',
      highlight: 'rgba(255,255,255,0.35)',
      accent: 'rgba(60,40,20,0.25)',
      ex: 0.5,
    },
    contours: null,
    water: '#9BCDEA',
    coast: ['#3D84BD', 1.1],
    ripples: ['#4A90C6', [2, 5, 9], [0.45, 0.28, 0.14]],
    waterway: '#5B9FD0',
    building: null,
    roads: {
      motorway: ['#C0392B', '#FFFFFF', 0.75],
      major: ['#C8452F', null, 0.6],
      secondary: ['#C86A4A', null, 0.45],
      tertiary: ['rgba(110,90,70,0.55)', null, 0.4],
      minor: ['rgba(110,90,70,0.4)', null, 0.4],
      path: null,
    },
    rail: ['#222222', 'dashes'],
    grid: ['rgba(40,100,160,0.25)', 'rgba(40,100,160,0.45)'],
    peaks: true,
    text: '#1F1F1F',
    halo: 'rgba(255,255,255,0.75)',
    waterText: '#1F5F94',
    spacing: 0.04,
    paperFx: null,
    grain: 0.18,
  },
  // 1:25,000 지형도: 갈색 등고선(계곡선에 높이), 점무늬 숲, 가는 테두리 도로, 파란 방안 격자 — 선은 가늘게(2026-10-31)
  topo: {
    paper: '#F6F3EA',
    urban: ['#EBDFD5', 0.8],
    wood: ['#D9E8C6', 1],
    park: ['#D9E8C6', 1],
    pattern: ['dots', 0.8],
    hillshade: {
      shadow: 'rgba(90,80,60,0.3)',
      highlight: 'rgba(255,255,255,0.2)',
      accent: 'rgba(0,0,0,0)',
      ex: 0.3,
    },
    contours: { color: 'rgba(168,110,62,0.55)', index: 'rgba(150,92,46,0.9)', label: '#8A5530' },
    water: '#BDE0F2',
    coast: ['#2F7FC1', 1],
    ripples: null,
    waterway: '#2F7FC1',
    building: ['#6B6B6B', 0.35, 14],
    roads: {
      motorway: ['#E5662E', '#3A3A3A', 0.6],
      major: ['#F2A65A', '#3A3A3A', 0.55],
      secondary: ['#FFF3C4', '#555555', 0.5],
      tertiary: ['#FFFFFF', '#6E6E6E', 0.45],
      minor: ['#FFFFFF', '#9A9A9A', 0.4],
      path: ['#555555', null, 0.7, [2.2, 1.6]],
    },
    casing: [0.4, 0.8, 1.2],
    rail: ['#333333', 'ticks'],
    grid: ['rgba(47,127,193,0.16)', 'rgba(47,127,193,0.32)'],
    peaks: true,
    text: '#1E1E1E',
    halo: 'rgba(246,243,234,0.9)',
    waterText: '#1F6FB0',
    spacing: 0,
    paperFx: null,
    grain: 0.16,
  },
};

// 한국어 이름 먼저, 없으면 현지 이름
const KO = ['coalesce', ['get', 'name:ko'], ['get', 'name']];
const ROAD_W: Record<RoadKind, [number, number, number]> = {
  motorway: [1.4, 4, 11],
  major: [1, 3.2, 10],
  secondary: [0.6, 2.6, 8],
  tertiary: [0.3, 2, 7],
  minor: [0, 1.2, 5],
  path: [0, 0.7, 1.6],
};
const ROAD_CLASS: Record<RoadKind, string[]> = {
  motorway: ['motorway'],
  major: ['trunk', 'primary'],
  secondary: ['secondary'],
  tertiary: ['tertiary'],
  minor: ['minor', 'service'],
  path: ['path', 'track'],
};
const ROAD_MINZOOM: Record<RoadKind, number> = {
  motorway: 6,
  major: 7,
  secondary: 9,
  tertiary: 10,
  minor: 12,
  path: 12.8,
};
// 작은 길부터 쌓는다(큰 길이 위)
const ROAD_ORDER: RoadKind[] = ['path', 'minor', 'tertiary', 'secondary', 'major', 'motorway'];
// 등고선 간격(m): 줌 이상에서 [보통선, 계곡선]
const CONTOUR_THRESHOLDS = {
  8: [200, 1000],
  10: [100, 500],
  11: [50, 250],
  12: [20, 100],
  14: [10, 50],
};

function zw(a: number, b: number, c: number) {
  return ['interpolate', ['exponential', 1.5], ['zoom'], 10, a, 14, b, 17, c];
}

function omt(layer: Json): Json {
  return { ...layer, source: 'omt' };
}

function layers(t: Theme): Json[] {
  const L: Json[] = [];
  const notTunnel = ['!=', ['get', 'brunnel'], 'tunnel'];
  const halo = {
    'text-color': t.text,
    'text-halo-color': t.halo,
    'text-halo-width': 1.4,
    'text-halo-blur': 0.3,
  };

  L.push({ id: 'bg', type: 'background', paint: { 'background-color': t.paper } });
  if (t.relief) {
    L.push({
      id: 'relief',
      type: 'color-relief',
      source: 'dem',
      paint: { 'color-relief-color': ['interpolate', ['linear'], ['elevation'], ...t.relief] },
    });
  }
  if (t.urban) {
    L.push(
      omt({
        id: 'urban',
        type: 'fill',
        'source-layer': 'landuse',
        filter: [
          'in',
          ['get', 'class'],
          [
            'literal',
            [
              'residential',
              'suburb',
              'neighbourhood',
              'commercial',
              'retail',
              'industrial',
              'quarter',
            ],
          ],
        ],
        paint: { 'fill-color': t.urban[0], 'fill-opacity': t.urban[1] },
      })
    );
  }
  const woodFilter = ['in', ['get', 'class'], ['literal', ['wood', 'forest']]];
  if (t.wood)
    L.push(
      omt({
        id: 'wood',
        type: 'fill',
        'source-layer': 'landcover',
        filter: woodFilter,
        paint: { 'fill-color': t.wood[0], 'fill-opacity': t.wood[1] },
      })
    );
  if (t.park)
    L.push(
      omt({
        id: 'park',
        type: 'fill',
        'source-layer': 'park',
        paint: { 'fill-color': t.park[0], 'fill-opacity': t.park[1] },
      })
    );
  if (t.pattern) {
    L.push(
      omt({
        id: 'wood-pattern',
        type: 'fill',
        'source-layer': 'landcover',
        filter: woodFilter,
        paint: { 'fill-pattern': t.pattern[0], 'fill-opacity': t.pattern[1] },
      })
    );
    L.push(
      omt({
        id: 'park-pattern',
        type: 'fill',
        'source-layer': 'park',
        paint: { 'fill-pattern': t.pattern[0], 'fill-opacity': t.pattern[1] },
      })
    );
  }
  L.push({
    id: 'hillshade',
    type: 'hillshade',
    source: 'dem',
    paint: {
      'hillshade-shadow-color': t.hillshade.shadow,
      'hillshade-highlight-color': t.hillshade.highlight,
      'hillshade-accent-color': t.hillshade.accent,
      'hillshade-exaggeration': t.hillshade.ex,
      'hillshade-illumination-direction': 315,
    },
  });
  if (t.contours) {
    const isIndex = ['>', ['get', 'level'], 0];
    L.push({
      id: 'contour',
      type: 'line',
      source: 'contours',
      'source-layer': 'contours',
      paint: {
        'line-color': ['case', isIndex, t.contours.index, t.contours.color],
        'line-width': ['case', isIndex, 1.1, 0.55],
      },
    });
  }

  L.push(
    omt({ id: 'water', type: 'fill', 'source-layer': 'water', paint: { 'fill-color': t.water } })
  );
  // 해안선·물결선은 강을 뺀다 — OSM 강 면은 여러 조각이라 조각 경계가 강을 가로지르는 선으로 보인다.
  const shoreFilter = ['!=', ['get', 'class'], 'river'];
  if (t.ripples) {
    const [color, offsets, opacities] = t.ripples;
    offsets.forEach((off, i) => {
      L.push(
        omt({
          id: `ripple-${i}`,
          type: 'line',
          'source-layer': 'water',
          filter: shoreFilter,
          paint: {
            'line-color': color,
            'line-width': 0.8,
            'line-offset': off,
            'line-opacity': opacities[i],
          },
        })
      );
    });
  }
  L.push(
    omt({
      id: 'coast',
      type: 'line',
      'source-layer': 'water',
      filter: shoreFilter,
      paint: { 'line-color': t.coast[0], 'line-width': t.coast[1] },
    })
  );
  L.push(
    omt({
      id: 'waterway',
      type: 'line',
      'source-layer': 'waterway',
      // 큰 강은 물 면으로 그려지므로 가운데 선(강 중심선)은 뺀다 — 넓은 강 위를 가로지르는 선으로 보인다.
      filter: ['!=', ['get', 'class'], 'river'],
      paint: {
        'line-color': t.waterway,
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.6, 15, 1.8],
      },
    })
  );
  if (t.building) {
    L.push(
      omt({
        id: 'building',
        type: 'fill',
        'source-layer': 'building',
        minzoom: t.building[2],
        paint: { 'fill-color': t.building[0], 'fill-opacity': t.building[1] },
      })
    );
  }

  // 도로: 테두리(아래) → 안쪽(위). 터널은 뺀다.
  const casing = t.casing ?? [1, 2, 3];
  for (const k of ROAD_ORDER) {
    const r = t.roads[k];
    if (!r || !r[1]) continue;
    const [w, m] = [ROAD_W[k], r[2]];
    L.push(
      omt({
        id: `road-${k}-casing`,
        type: 'line',
        'source-layer': 'transportation',
        minzoom: ROAD_MINZOOM[k],
        filter: ['all', ['in', ['get', 'class'], ['literal', ROAD_CLASS[k]]], notTunnel],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': r[1],
          'line-width': zw(w[0] * m + casing[0], w[1] * m + casing[1], w[2] * m + casing[2]),
        },
      })
    );
  }
  for (const k of ROAD_ORDER) {
    const r = t.roads[k];
    if (!r) continue;
    const [w, m, dash] = [ROAD_W[k], r[2], r[3]];
    L.push(
      omt({
        id: `road-${k}`,
        type: 'line',
        'source-layer': 'transportation',
        minzoom: ROAD_MINZOOM[k],
        filter: ['all', ['in', ['get', 'class'], ['literal', ROAD_CLASS[k]]], notTunnel],
        layout: { 'line-cap': dash ? 'butt' : 'round', 'line-join': 'round' },
        paint: {
          'line-color': r[0],
          'line-width': zw(w[0] * m, w[1] * m, w[2] * m),
          ...(dash ? { 'line-dasharray': dash } : {}),
        },
      })
    );
  }
  const railFilter = ['all', ['in', ['get', 'class'], ['literal', ['rail']]], notTunnel];
  if (t.rail[1] === 'ticks') {
    // 가는 선 + 침목 눈금
    L.push(
      omt({
        id: 'rail',
        type: 'line',
        'source-layer': 'transportation',
        minzoom: 9,
        filter: railFilter,
        paint: {
          'line-color': t.rail[0],
          'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.8, 15, 1.6],
        },
      })
    );
    L.push(
      omt({
        id: 'rail-ticks',
        type: 'line',
        'source-layer': 'transportation',
        minzoom: 12,
        filter: railFilter,
        paint: {
          'line-color': t.rail[0],
          'line-width': ['interpolate', ['linear'], ['zoom'], 12, 4, 16, 7],
          'line-dasharray': [0.25, 2.5],
        },
      })
    );
  } else {
    // 검은 선 위 흰 점선(옛 지도의 철도)
    L.push(
      omt({
        id: 'rail',
        type: 'line',
        'source-layer': 'transportation',
        minzoom: 9,
        filter: railFilter,
        paint: {
          'line-color': t.rail[0],
          'line-width': ['interpolate', ['linear'], ['zoom'], 9, 1, 11, 2.4, 16, 4],
        },
      })
    );
    L.push(
      omt({
        id: 'rail-dash',
        type: 'line',
        'source-layer': 'transportation',
        minzoom: 11,
        filter: railFilter,
        paint: {
          'line-color': '#FFFFFF',
          'line-width': ['interpolate', ['linear'], ['zoom'], 11, 1.2, 16, 2.2],
          'line-dasharray': [3, 3],
        },
      })
    );
  }
  if (t.grid) {
    // 경위선 격자: 데이터는 WebView 가 지금 보이는 범위로 만든다(updateGrid)
    L.push({
      id: 'grid-minor',
      type: 'line',
      source: 'grid',
      minzoom: 11.5,
      filter: ['!', ['get', 'major']],
      paint: { 'line-color': t.grid[0], 'line-width': 0.6 },
    });
    L.push({
      id: 'grid-major',
      type: 'line',
      source: 'grid',
      filter: ['get', 'major'],
      paint: { 'line-color': t.grid[1], 'line-width': 0.9 },
    });
  }

  // 글자
  if (t.contours) {
    L.push({
      id: 'contour-label',
      type: 'symbol',
      source: 'contours',
      'source-layer': 'contours',
      minzoom: 11,
      filter: ['>', ['get', 'level'], 0],
      layout: {
        'symbol-placement': 'line',
        'text-field': ['to-string', ['get', 'ele']],
        'text-font': ['Noto Sans Regular'],
        'text-size': 10,
      },
      paint: { 'text-color': t.contours.label, 'text-halo-color': t.halo, 'text-halo-width': 1.2 },
    });
  }
  L.push(
    omt({
      id: 'river-label',
      type: 'symbol',
      'source-layer': 'waterway',
      minzoom: 11,
      filter: ['all', ['==', ['get', 'class'], 'river'], ['has', 'name']],
      layout: {
        'symbol-placement': 'line',
        'text-field': KO,
        'text-font': ['Noto Sans Italic'],
        'text-size': 14,
        'text-letter-spacing': 0.4,
        'symbol-spacing': 400,
      },
      paint: { 'text-color': t.waterText, 'text-halo-color': t.halo, 'text-halo-width': 1.2 },
    })
  );
  L.push(
    omt({
      id: 'water-label',
      type: 'symbol',
      'source-layer': 'water_name',
      filter: ['has', 'name'],
      layout: {
        'text-field': KO,
        'text-font': ['Noto Sans Italic'],
        'text-size': 14,
        'text-letter-spacing': 0.3,
      },
      paint: { 'text-color': t.waterText, 'text-halo-color': t.halo, 'text-halo-width': 1.2 },
    })
  );
  L.push(
    omt({
      id: 'road-label',
      type: 'symbol',
      'source-layer': 'transportation_name',
      minzoom: 12.5,
      filter: ['in', ['get', 'class'], ['literal', ['primary', 'secondary', 'tertiary', 'trunk']]],
      layout: {
        'symbol-placement': 'line',
        'text-field': KO,
        'text-font': ['Noto Sans Regular'],
        'text-size': 11,
        'symbol-spacing': 300,
      },
      paint: halo,
    })
  );
  if (t.shields) {
    L.push(
      omt({
        id: 'road-shield',
        type: 'symbol',
        'source-layer': 'transportation_name',
        minzoom: 8,
        filter: [
          'all',
          ['has', 'ref'],
          ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary']]],
          ['<=', ['length', ['to-string', ['get', 'ref']]], 4],
        ],
        layout: {
          'symbol-placement': 'line',
          'symbol-spacing': 420,
          'text-field': ['to-string', ['get', 'ref']],
          'text-font': ['Noto Sans Bold'],
          'text-size': 10,
          'icon-image': 'shield',
          'icon-text-fit': 'both',
          'icon-text-fit-padding': [2, 5, 2, 5],
          'text-rotation-alignment': 'viewport',
          'icon-rotation-alignment': 'viewport',
        },
        paint: { 'text-color': '#FFFFFF' },
      })
    );
  }
  if (t.peaks) {
    L.push(
      omt({
        id: 'peak',
        type: 'symbol',
        'source-layer': 'mountain_peak',
        minzoom: 8,
        filter: ['has', 'name'],
        layout: {
          'icon-image': 'peak',
          'icon-size': 0.8,
          'text-field': ['concat', KO, '\n', ['to-string', ['get', 'ele']], 'm'],
          'text-font': ['Noto Sans Bold'],
          'text-size': 11,
          'text-offset': [0, 0.6],
          'text-anchor': 'top',
        },
        paint: { 'text-color': '#5A3A1E', 'text-halo-color': t.halo, 'text-halo-width': 1.2 },
      })
    );
  }
  L.push(
    omt({
      id: 'park-label',
      type: 'symbol',
      'source-layer': 'park',
      minzoom: 11,
      filter: ['has', 'name'],
      layout: {
        'text-field': KO,
        'text-font': ['Noto Sans Italic'],
        'text-size': 12,
        'text-letter-spacing': t.spacing,
      },
      paint: halo,
    })
  );
  L.push(
    omt({
      id: 'place-small',
      type: 'symbol',
      'source-layer': 'place',
      minzoom: 11.5,
      filter: ['in', ['get', 'class'], ['literal', ['quarter', 'neighbourhood']]],
      layout: {
        'text-field': KO,
        'text-font': ['Noto Sans Regular'],
        'text-size': 12,
        'text-letter-spacing': t.spacing,
      },
      paint: halo,
    })
  );
  L.push(
    omt({
      id: 'place-mid',
      type: 'symbol',
      'source-layer': 'place',
      minzoom: 8,
      filter: ['in', ['get', 'class'], ['literal', ['suburb', 'village', 'hamlet', 'island']]],
      layout: {
        'text-field': KO,
        'text-font': ['Noto Sans Bold'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 9, 11, 14, 15],
        'text-letter-spacing': t.spacing,
      },
      paint: halo,
    })
  );
  L.push(
    omt({
      id: 'place-big',
      type: 'symbol',
      'source-layer': 'place',
      filter: ['in', ['get', 'class'], ['literal', ['city', 'town']]],
      layout: {
        'text-field': KO,
        'text-font': ['Noto Sans Bold'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 6, 13, 12, 20],
        'text-letter-spacing': t.spacing,
      },
      paint: halo,
    })
  );
  return L;
}

// 스타일 이름 → MapLibre style JSON(WebView 로 그대로 넘긴다)
export function buildMapStyle(name: MapStyleName): Json {
  const t = THEMES[name];
  const sources: Json = {
    omt: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' },
    dem: {
      type: 'raster-dem',
      encoding: 'terrarium',
      tiles: ['@dem'],
      tileSize: 256,
      maxzoom: 13,
      attribution: TERRAIN_ATTRIBUTION,
    },
  };
  if (t.contours) sources.contours = { type: 'vector', tiles: ['@contours'], maxzoom: 15 };
  if (t.grid) sources.grid = { type: 'geojson', data: { type: 'FeatureCollection', features: [] } };
  return {
    version: 8,
    name: `cm-${name}`,
    metadata: {
      'cm:paper': t.paperFx,
      'cm:grain': t.grain,
      'cm:contourThresholds': CONTOUR_THRESHOLDS,
    },
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources,
    layers: layers(t),
  };
}
