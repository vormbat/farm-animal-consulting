/**
 * 수집 스키마(JSON Schema) -> 프런트엔드 타입(src/types/data.d.ts).
 *
 * 데이터 계약의 단일 진실원은 pipeline/schemas/ 의 Pydantic 모델이다.
 * 모델을 고치면 이 두 단계를 거쳐 화면 타입까지 따라온다.
 *
 *   uv run python -m pipeline gen-schemas   # 모델 -> schemas/*.schema.json
 *   node scripts/gen-types.mjs              # schemas/ -> src/types/data.d.ts
 *
 * 둘을 합친 것이 `npm run gen:types` 이고, CI 는 이걸 돌린 뒤
 * git diff 가 비었는지 본다. 모델과 화면 타입이 어긋난 채로 머지되지 않게 하는 장치다.
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from 'json-schema-to-typescript';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCHEMA_DIR = join(ROOT, 'schemas');
const OUT_FILE = join(ROOT, 'src', 'types', 'data.d.ts');

const BANNER = `/**
 * 이 파일은 \`npm run gen:types\` 가 만든다. 직접 고치지 않는다.
 *
 * 고칠 곳은 pipeline/schemas/ 의 Pydantic 모델이다.
 * 거기서 바꾼 내용이 JSON Schema 를 거쳐 여기로 내려온다.
 */

/* eslint-disable */
`;

const COMPILE_OPTIONS = {
  bannerComment: '',
  additionalProperties: false,
  style: { singleQuote: true, printWidth: 100 },
};

async function main() {
  const index = JSON.parse(await readFile(join(SCHEMA_DIR, 'index.json'), 'utf8'));

  const known = new Set(await readdir(SCHEMA_DIR));
  for (const entry of index) {
    if (!known.has(entry.schema)) {
      throw new Error(
        `${entry.schema} 가 없습니다. 먼저 \`uv run python -m pipeline gen-schemas\` 를 실행하세요.`,
      );
    }
  }

  const blocks = [];
  for (const entry of index) {
    const schema = JSON.parse(await readFile(join(SCHEMA_DIR, entry.schema), 'utf8'));
    blocks.push((await compile(schema, entry.typeName, COMPILE_OPTIONS)).trim());
  }

  // 경로 -> 타입 대응표. data-client 가 이걸로 get() 의 반환 타입을 정한다.
  const entries = index
    .map((entry) => `  /** ${entry.title} */\n  '${entry.output}': ${entry.typeName};`)
    .join('\n');

  const map = [
    '/** 수집 산출물 경로와 그 내용의 대응. `data/` 기준 상대 경로다. */',
    'export interface DataMap {',
    entries,
    '}',
    '',
    'export type DataPath = keyof DataMap;',
  ].join('\n');

  await writeFile(OUT_FILE, `${BANNER}\n${blocks.join('\n\n')}\n\n${map}\n`, 'utf8');
  console.log(`✓ src/types/data.d.ts (${index.length}개 수집원)`);
}

await main();
