# 앱 아이콘 굽기: assets/icons/source/icons.html(손으로 그린 선 아이콘 한 벌)을 칸별로 잘라
# assets/icons/<이름>.png · @2x · @3x(검은 선 → 알파 마스크)로 만들고, src/components/iconAssets.ts(require 목록)를 다시 쓴다.
# 앱은 <Icon name color> 가 Image tintColor 로 칠한다 — react-native-svg 없이(새 네이티브 빌드 없이) 쓰려고 PNG 로 굽는다.
#
# 사용: python scripts/build-icons.py [스크린샷.png]
#   스크린샷을 주지 않으면 Microsoft Edge(헤드리스)로 직접 찍는다. 막혀 있으면 아래처럼 찍어서 경로를 넘긴다.
#   msedge --headless=new --hide-scrollbars --force-device-scale-factor=2 --window-size=576,<96×행 수>
#          --screenshot=<png> file:///<repo>/assets/icons/source/icons.html
# 크기: 2배로 찍어(칸 192px, 그림 144px) @3x = 144px. 그래서 48pt 까지 선명하다(스플래시 40pt·빈 서랍 32pt 아이콘).
#   @1x 48 · @2x 96 · @3x 144px — 화면에서는 <Icon size> 로 늘 크기를 정해 주므로 기본 크기(48)는 쓰이지 않는다.
import os
import re
import subprocess
import sys
import tempfile

from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'icons', 'source', 'icons.html')
OUT = os.path.join(ROOT, 'assets', 'icons')
TS = os.path.join(ROOT, 'src', 'components', 'iconAssets.ts')
SCALE = 2  # 스크린샷 배율(--force-device-scale-factor)
COLS, CELL, ART = 6, 96 * SCALE, 72 * SCALE  # 칸 192px, 그림 144px(= @3x 48pt)
BASE = 48  # @1x 크기(pt)

names = re.findall(r"\['([a-z]+)', '", open(SRC, encoding='utf-8').read())
rows = (len(names) + COLS - 1) // COLS

shot = sys.argv[1] if len(sys.argv) > 1 else None
if not shot:
    shot = os.path.join(tempfile.gettempdir(), 'cm-icons.png')
    edge = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
    url = 'file:///' + SRC.replace('\\', '/')
    subprocess.run([edge, '--headless=new', '--hide-scrollbars', f'--force-device-scale-factor={SCALE}',
                    f'--window-size={COLS * CELL // SCALE},{rows * CELL // SCALE}', f'--screenshot={shot}', url],
                   check=True)

sheet = ImageOps.grayscale(Image.open(shot))
os.makedirs(OUT, exist_ok=True)
pad = (CELL - ART) // 2
for i, name in enumerate(names):
    x, y = (i % COLS) * CELL + pad, (i // COLS) * CELL + pad
    art = sheet.crop((x, y, x + ART, y + ART))
    alpha = ImageOps.invert(art)  # 흰 바탕 검은 선 → 선만 불투명
    for scale, suffix in ((3, '@3x'), (2, '@2x'), (1, '')):
        size = BASE * scale
        a = alpha if size == ART else alpha.resize((size, size), Image.LANCZOS)
        img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        img.putalpha(a)
        img.save(os.path.join(OUT, f'{name}{suffix}.png'))

lines = [
    '// 자동 생성 — scripts/build-icons.py (원본 assets/icons/source/icons.html). 직접 고치지 않는다.',
    'export const iconAssets = {',
    *[f"  {n}: require('../../assets/icons/{n}.png')," for n in names],
    '} as const;',
    '',
    'export type IconName = keyof typeof iconAssets;',
    '',
]
open(TS, 'w', encoding='utf-8', newline='\n').write('\n'.join(lines))
print(f'{len(names)} icons -> {OUT}')
