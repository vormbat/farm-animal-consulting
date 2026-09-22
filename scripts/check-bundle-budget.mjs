/**
 * 초기 번들 예산.
 *
 * 원본은 574KB 짜리 `index.html` 한 장이었다. 탭을 쪼개 놓아도 공통 코드에
 * 하나씩 얹다 보면 조용히 그 크기로 돌아간다 — 늘어나는 순간에는 아무도
 * 눈치채지 못하고, 6개월 뒤에 "왜 이렇게 느리지" 가 된다. 그래서 숫자로 막는다.
 *
 * '초기' 의 정의는 추측하지 않는다. `dist/index.html` 이 실제로 걸어 둔
 * 스크립트·모듈프리로드·스타일시트만 센다. 탭은 lazy 라 여기 들어오지 않는다.
 *
 *   node scripts/check-bundle-budget.mjs
 *
 * 예산을 넘으면 실패한다. 정당한 이유로 넘겼다면 아래 숫자를 고치고,
 * 왜 늘렸는지 커밋 메시지에 남긴다.
 */

import { readFile, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

/** gzip 기준 KB. 브라우저가 실제로 받는 크기다. */
const BUDGET = {
  /** 첫 화면이 받는 JS+CSS 전부. */
  initial: 130,
  /** 탭 하나(가장 큰 것). 질병 사전 JSON 은 여기 포함되지 않는다 — 런타임에 따로 받는다. */
  lazyChunk: 40,
};

function kb(bytes) {
  return Math.round((bytes / 1024) * 10) / 10;
}

async function gzipped(relative) {
  const file = join(DIST, relative);
  return gzipSync(await readFile(file)).length;
}

const html = await readFile(join(DIST, 'index.html'), 'utf8').catch(() => {
  throw new Error('dist/index.html 이 없습니다. npm run build 를 먼저 실행하세요.');
});

/** index.html 이 직접 거는 자산 = 첫 화면이 기다리는 것. */
const initial = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)]
  .map((match) => match[1])
  .filter((url) => !url.startsWith('http'))
  // base 가 붙어 있으므로 assets/ 부터 잘라 쓴다.
  .map((url) => url.slice(url.indexOf('assets/')))
  .filter((url, index, all) => all.indexOf(url) === index);

if (initial.length === 0) throw new Error('index.html 에서 자산을 찾지 못했습니다');

let initialBytes = 0;
for (const asset of initial) initialBytes += await gzipped(asset);
initialBytes += gzipSync(Buffer.from(html)).length;

const { readdir } = await import('node:fs/promises');
const all = await readdir(join(DIST, 'assets'));
let worst = { name: '', bytes: 0 };
for (const name of all) {
  if (!name.endsWith('.js') || initial.includes(`assets/${name}`)) continue;
  const bytes = gzipSync(await readFile(join(DIST, 'assets', name))).length;
  if (bytes > worst.bytes) worst = { name, bytes };
}

const publicBytes = (await stat(join(DIST, 'og-card.png'))).size;

console.log(
  `초기 로드   ${kb(initialBytes)} KB / ${BUDGET.initial} KB (gzip, ${initial.length}개 + html)`,
);
console.log(`가장 큰 탭  ${kb(worst.bytes)} KB / ${BUDGET.lazyChunk} KB (${worst.name})`);
console.log(`og-card.png ${kb(publicBytes)} KB (예산 밖 — 링크 미리보기용이라 첫 화면과 무관)`);

const over = [];
if (kb(initialBytes) > BUDGET.initial)
  over.push(`초기 로드 ${kb(initialBytes)} KB > ${BUDGET.initial} KB`);
if (kb(worst.bytes) > BUDGET.lazyChunk)
  over.push(`${worst.name} ${kb(worst.bytes)} KB > ${BUDGET.lazyChunk} KB`);

if (over.length > 0) {
  console.error(`\n✗ 번들 예산 초과\n  ${over.join('\n  ')}`);
  process.exit(1);
}
console.log('\n✓ 예산 안');
