/**
 * 원본 `khmass-liturgy/pb` 의 `index.html` 에 인라인으로 박혀 있는 도메인 상수를
 * `src/data/*.ts` 로 뽑아 온다.
 *
 * 손으로 옮겨 적지 않는 이유는 분량 때문이 아니라 **틀려도 모르기 때문**이다.
 * 사육표준 표는 숫자 하나가 어긋나도 화면에서는 그럴듯해 보인다. 기계로 옮기면
 * 적어도 옮기는 과정에서는 틀릴 수 없고, 어디서 왔는지가 이 파일에 남는다.
 *
 * 한 번 뽑고 나면 `src/data/` 는 우리 것이다. 생성물이지만 다시 만들지 않는다
 * — 원본은 계속 바뀌고, 우리는 특정 시점의 값을 가져온 것이기 때문이다.
 * 그래서 CI 의 drift 검사 대상이 아니다(`src/types/` 와 다른 점).
 *
 *   node scripts/extract-original-constants.mjs            # 원본을 내려받아 추출
 *   node scripts/extract-original-constants.mjs --from a.html
 *
 * 뽑은 뒤에는 `npm run format` 을 한 번 돌린다. 여기서는 JSON 으로 찍기만 하고
 * 줄바꿈은 Prettier 에 맡긴다 — 그래서 두 번째 실행은 늘 '다름' 으로 나온다.
 * 비교용 플래그를 두지 않은 이유다.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'src', 'data');
const SOURCE_URL = 'https://raw.githubusercontent.com/khmass-liturgy/pb/main/index.html';

/**
 * 뽑아 올 상수들.
 *
 * `as` 는 원본 이름이 그 화면 밖에서는 뜻이 흐릿할 때만 바꾼다
 * (예: 원본의 `SPECIES` 는 열스트레스 지수 표의 축종이다).
 * `type` 은 추론만으로 부족한 곳에만 붙인다 — 숫자 키 조회가 필요한 사전 같은 것.
 */
const FILES = [
  {
    file: 'solar-terms.ts',
    title: '24절기',
    note: '태양 황경 15° 간격. 날짜는 해마다 달라지므로 값이 아니라 황경을 저장하고 그때그때 계산한다.',
    exports: [{ name: 'SOLAR_TERMS' }],
  },
  {
    file: 'regions.ts',
    title: '날씨 지역 목록',
    note: '자주 찾는 시군의 좌표. 목록에 없는 곳은 지오코딩으로 검색한다.',
    exports: [{ name: 'REGIONS' }],
  },
  {
    file: 'weather-codes.ts',
    title: 'WMO 날씨 코드',
    note: 'Open-Meteo 가 돌려주는 코드 → 아이콘·설명.',
    exports: [
      { name: 'WX_ICONS', type: 'Record<number, string>' },
      { name: 'WX_DESC', type: 'Record<number, string>' },
    ],
  },
  {
    file: 'heat-stress.ts',
    title: '고온·한랭 스트레스 판정표',
    note:
      'THI(USDA/Clemson) · 열스트레스 지수(Hy-Line) · 체감 계사온도(Aviagen) · ' +
      '음수:사료 비율. 출처는 각 상수 주석에 있다.',
    exports: [
      { name: 'SPECIES', as: 'THI_SPECIES' },
      { name: 'ZONES', as: 'THI_ZONES' },
      // 한랭 쪽은 원본에서 모달 함수 안의 지역 상수라 같은 이름이 두 번 나온다.
      { name: 'ZONES', as: 'COLD_ZONES', occurrence: 2 },
      { name: 'HYLINE_HSI' },
      { name: 'HSI_LEVELS' },
      { name: 'HSI_ACTIONS' },
      { name: 'AVIAGEN_APPARENT_TEMP' },
      { name: 'WF_RATIO' },
      { name: 'WF_RATIO_BY_TEMP' },
      { name: 'DRINKER_FLOW_BROILER' },
    ],
  },
  {
    file: 'target-temp.ts',
    title: '축종별 목표온도',
    note: '육계=Aviagen Ross · 산란계=Hy-Line · 양돈=PIC Wean to Finish.',
    exports: [
      { name: 'BROILER_TARGET_TEMP' },
      { name: 'LAYER_TARGET_TEMP' },
      { name: 'PIG_TARGET_TEMP' },
    ],
  },
  {
    file: 'vent-stages.ts',
    title: '환기 단계',
    note: '사육단계별 최소환기량·목표온도·요령.',
    exports: [
      { name: 'POULTRY_VENT_STAGES' },
      { name: 'SWINE_VENT_STAGES' },
      { name: 'LS_SPECIES' },
    ],
  },
  {
    file: 'breeds.ts',
    title: '품종별 사육표준',
    note: [
      '육계 Ross 308 / Cobb 500 / Arbor Acres Plus · 산란계 Hy-Line Brown·W-36 / ISA Brown / Lohmann.',
      '',
      '표는 열 이름 없는 숫자 배열이다. 원본의 열 정의를 그대로 옮긴다.',
      '',
      '  육계        [일령, 목표체중(g), 일당증체(g), 누적사료섭취(g), 누적FCR]',
      '  산란 육성기 [주령, 목표체중(g), 사료섭취(g/일), 음수섭취(ml/일), 누적폐사율(%)]',
      '  산란 산란기 [주령, 산란율(%), 목표체중(g), 사료섭취(g/일), 음수섭취(ml/일), 평균난중(g), 누적폐사율(%)]',
    ].join('\n * '),
    exports: [
      // 품종표는 CONSULT_BREEDS 안에 그대로 담기므로 따로 내보내지 않는다.
      // 두 번 실으면 같은 숫자가 파일에 두 벌 남아 어느 쪽이 진짜인지 흐려진다.
      { name: 'ROSS308_DATA', internal: true },
      { name: 'COBB500_DATA', internal: true },
      { name: 'ARBORACRES_DATA', internal: true },
      { name: 'HYLINE_BROWN_DATA', internal: true },
      { name: 'HYLINE_W36_DATA', internal: true },
      { name: 'ISABROWN_DATA', internal: true },
      { name: 'LOHMANN_DATA', internal: true },
      { name: 'CONSULT_BREEDS' },
    ],
  },
  {
    file: 'mgmt-points.ts',
    title: '사육 관리 포인트',
    note: '일령·주령 구간별로 챙길 것.',
    exports: [{ name: 'BROILER_MGMT_POINTS' }, { name: 'LAYER_MGMT_POINTS' }],
  },
];

/** `const NAME = [...]` / `{...}` 의 균형 잡힌 리터럴 본문을 잘라 낸다. */
function literalOf(text, name, occurrence = 1) {
  const declaration = new RegExp(String.raw`(?:const|let|var)\s+${name}\s*=\s*`, 'g');
  let match;
  let seen = 0;
  while ((match = declaration.exec(text)) !== null) {
    seen += 1;
    if (seen !== occurrence) continue;

    const start = match.index + match[0].length;
    const open = text[start];
    if (open !== '[' && open !== '{') return null;
    const close = open === '[' ? ']' : '}';

    let depth = 0;
    let quote = null;
    let escaped = false;
    for (let i = start; i < text.length; i += 1) {
      const character = text[i];
      if (quote) {
        if (escaped) escaped = false;
        else if (character === '\\') escaped = true;
        else if (character === quote) quote = null;
        continue;
      }
      if (character === '"' || character === "'" || character === '`') quote = character;
      // 리터럴 사이의 `// 주석` 안에 괄호가 있으면 깊이가 틀어진다.
      else if (character === '/' && text[i + 1] === '/') i = text.indexOf('\n', i);
      else if (character === open) depth += 1;
      else if (character === close) {
        depth -= 1;
        if (depth === 0) return text.slice(start, i + 1);
      }
    }
    return null;
  }
  return null;
}

/**
 * 리터럴을 평가한다.
 *
 * 원본 상수는 순수 데이터지만 `CONSULT_BREEDS` 처럼 앞서 나온 표를 참조하는 것이
 * 있어, 지금까지 뽑은 값을 넣은 채로 실행한다. 전역이 비어 있는 컨텍스트라
 * 파일이나 네트워크에는 닿지 못한다.
 */
function evaluate(literal, scope) {
  const context = vm.createContext({ ...scope });
  return vm.runInContext(`(${literal})`, context, { timeout: 5000 });
}

/** 생성 파일 본문. JSON 으로 다시 찍어 원본의 들여쓰기·주석 흔적을 남기지 않는다. */
function render({ title, note, values }) {
  const body = values
    .map(({ name, type, value }) => {
      const annotation = type ? `: ${type}` : '';
      return `export const ${name}${annotation} = ${JSON.stringify(value, null, 2)};\n`;
    })
    .join('\n');

  return `/**
 * ${title}
 *
 * ${note}
 *
 * 원본 khmass-liturgy/pb 의 index.html 에서
 * \`node scripts/extract-original-constants.mjs\` 로 옮겨 왔다.
 * 다시 생성하지 않는다 — 고칠 일이 생기면 이 파일을 직접 고친다.
 */

${body}`;
}

async function loadSource() {
  const fromIndex = process.argv.indexOf('--from');
  if (fromIndex >= 0) return readFile(process.argv[fromIndex + 1], 'utf8');
  const response = await fetch(SOURCE_URL);
  if (!response.ok) throw new Error(`원본을 받지 못했습니다: HTTP ${response.status}`);
  return response.text();
}

async function main() {
  const source = await loadSource();
  await mkdir(OUT_DIR, { recursive: true });

  // 앞 파일에서 뽑은 값을 뒤 파일이 참조할 수 있게 한 곳에 모아 둔다.
  const scope = Object.create(null);

  for (const spec of FILES) {
    const values = [];
    for (const item of spec.exports) {
      const literal = literalOf(source, item.name, item.occurrence);
      if (!literal) throw new Error(`${item.name} 를 원본에서 찾지 못했습니다`);
      const value = evaluate(literal, scope);
      scope[item.name] = value;
      if (item.internal) continue;
      values.push({ name: item.as ?? item.name, type: item.type, value });
    }

    const content = render({ ...spec, values });
    const path = join(OUT_DIR, spec.file);
    const previous = await readFile(path, 'utf8').catch(() => null);

    if (previous === content) {
      console.log(`  = src/data/${spec.file}`);
      continue;
    }
    await writeFile(path, content, 'utf8');
    console.log(`✓ src/data/${spec.file} (${values.map((v) => v.name).join(', ')})`);
  }

  console.log('\n다 뽑았으면 `npm run format` 을 한 번 돌리세요.');
}

await main();
