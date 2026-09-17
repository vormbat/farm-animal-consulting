/**
 * 수집 스키마(JSON Schema) -> 프런트엔드 타입.
 *
 * 데이터 계약의 단일 진실원은 pipeline/schemas/ 의 Pydantic 모델이다.
 * 모델을 고치면 이 두 단계를 거쳐 화면 타입까지 따라온다.
 *
 *   uv run python -m pipeline gen-schemas   # 모델 -> schemas/*.schema.json
 *   node scripts/gen-types.mjs              # schemas/ -> src/types/data*.d.ts
 *
 * 둘을 합친 것이 `npm run gen:types` 이고, CI 는 이걸 돌린 뒤 git diff 가
 * 비었는지 본다. 모델과 화면 타입이 어긋난 채로 머지되지 않게 하는 장치다.
 *
 * 수집원마다 파일을 따로 낸다. json-schema-to-typescript 는 속성마다 이름 붙은
 * 타입을 만들어 내는데(`period` -> `Period`), 한 파일에 몰아 넣으면 서로 다른
 * 수집원의 속성 이름이 부딪혀 엉뚱한 타입이 조용히 쓰인다. 파일이 나뉘면
 * 각자의 이름 공간을 가지므로 그럴 일이 없다.
 */
import { readFile, writeFile, readdir, mkdir, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from 'json-schema-to-typescript';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCHEMA_DIR = join(ROOT, 'schemas');
const TYPES_DIR = join(ROOT, 'src', 'types');
const PER_SOURCE_DIR = join(TYPES_DIR, 'data');

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

  // 최상위 타입 이름이 겹치면 배럴에서 부딪힌다. 생성 전에 잡는다.
  const roots = index.map((entry) => entry.typeName);
  const duplicates = roots.filter((name, at) => roots.indexOf(name) !== at);
  if (duplicates.length > 0) {
    throw new Error(`수집원의 모델 이름이 겹칩니다: ${[...new Set(duplicates)].join(', ')}`);
  }

  // 지워진 수집원의 타입 파일이 남지 않도록 통째로 다시 만든다.
  await rm(PER_SOURCE_DIR, { recursive: true, force: true });
  await mkdir(PER_SOURCE_DIR, { recursive: true });

  const imports = [];
  const entries = [];
  const reexports = [];

  for (const entry of index) {
    const schema = JSON.parse(await readFile(join(SCHEMA_DIR, entry.schema), 'utf8'));
    const body = (await compile(schema, entry.typeName, COMPILE_OPTIONS)).trim();
    await writeFile(join(PER_SOURCE_DIR, `${entry.id}.d.ts`), `${BANNER}\n${body}\n`, 'utf8');

    imports.push(`import type { ${entry.typeName} } from './data/${entry.id}';`);
    reexports.push(`export type { ${entry.typeName} } from './data/${entry.id}';`);
    entries.push(`  /** ${entry.title} */\n  '${entry.output}': ${entry.typeName};`);
  }

  const barrel = [
    BANNER,
    imports.join('\n'),
    '',
    '/** 수집 산출물 경로와 그 내용의 대응. `data/` 기준 상대 경로다. */',
    'export interface DataMap {',
    entries.join('\n'),
    '}',
    '',
    'export type DataPath = keyof DataMap;',
    '',
    '// 속성에서 파생된 하위 타입(PriceSeries 등)은 수집원별 파일에서 가져온다.',
    '// 이름이 겹칠 수 있어 여기서 한꺼번에 내보내지 않는다.',
    reexports.join('\n'),
    '',
  ].join('\n');

  await writeFile(join(TYPES_DIR, 'data.d.ts'), barrel, 'utf8');
  console.log(`✓ src/types/data.d.ts + data/*.d.ts (${index.length}개 수집원)`);
}

await main();
