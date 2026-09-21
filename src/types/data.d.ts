/**
 * 이 파일은 `npm run gen:types` 가 만든다. 직접 고치지 않는다.
 *
 * 고칠 곳은 pipeline/schemas/ 의 Pydantic 모델이다.
 * 거기서 바꾼 내용이 JSON Schema 를 거쳐 여기로 내려온다.
 */

/* eslint-disable */

import type { BroilerToday } from './data/broiler_price_today';
import type { EggReport } from './data/egg_report';
import type { LayerPrice } from './data/layer_price';
import type { PoultryStats } from './data/poultry_stats';
import type { PulletPrice } from './data/pullet_price';

/** 수집 산출물 경로와 그 내용의 대응. `data/` 기준 상대 경로다. */
export interface DataMap {
  /** 금일 육계시세(대한양계협회) */
  'price/broiler_today.json': BroilerToday;
  /** 주간 계란 수급 정보(다봄) */
  'price/egg_report.json': EggReport;
  /** 산란계 관련시세(다봄) */
  'price/layer.json': LayerPrice;
  /** 산란계·육계 사육 통계(통계누리) */
  'price/poultry_stats.json': PoultryStats;
  /** 산란계 중추가격(대한산란계협회) */
  'price/pullet.json': PulletPrice;
}

export type DataPath = keyof DataMap;

// 속성에서 파생된 하위 타입(PriceSeries 등)은 수집원별 파일에서 가져온다.
// 이름이 겹칠 수 있어 여기서 한꺼번에 내보내지 않는다.
export type { BroilerToday } from './data/broiler_price_today';
export type { EggReport } from './data/egg_report';
export type { LayerPrice } from './data/layer_price';
export type { PoultryStats } from './data/poultry_stats';
export type { PulletPrice } from './data/pullet_price';
