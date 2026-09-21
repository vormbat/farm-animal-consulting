/**
 * 축종별 목표온도
 *
 * 육계=Aviagen Ross · 산란계=Hy-Line · 양돈=PIC Wean to Finish.
 *
 * 원본 khmass-liturgy/pb 의 index.html 에서
 * `node scripts/extract-original-constants.mjs` 로 옮겨 왔다.
 * 다시 생성하지 않는다 — 고칠 일이 생기면 이 파일을 직접 고친다.
 */

export const BROILER_TARGET_TEMP = [
  {
    "day": "1~3일",
    "t": 33
  },
  {
    "day": "4~7일",
    "t": 31
  },
  {
    "day": "8~14일",
    "t": 29
  },
  {
    "day": "15~21일",
    "t": 27
  },
  {
    "day": "22~28일",
    "t": 25
  },
  {
    "day": "29~35일",
    "t": 22
  },
  {
    "day": "36일~",
    "t": 20
  }
];

export const LAYER_TARGET_TEMP = [
  {
    "wk": "1주령",
    "t": 34,
    "range": "33~35",
    "stage": "육추"
  },
  {
    "wk": "2주령",
    "t": 32,
    "range": "31~33",
    "stage": "육추"
  },
  {
    "wk": "3주령",
    "t": 30,
    "range": "29~31",
    "stage": "육추"
  },
  {
    "wk": "4주령",
    "t": 28,
    "range": "27~29",
    "stage": "육추"
  },
  {
    "wk": "5주령",
    "t": 26,
    "range": "25~27",
    "stage": "육추"
  },
  {
    "wk": "6주령",
    "t": 24,
    "range": "23~25",
    "stage": "육추"
  },
  {
    "wk": "7주령",
    "t": 22,
    "range": "21~23",
    "stage": "육추"
  },
  {
    "wk": "8~17주",
    "t": 21,
    "range": "20~22",
    "stage": "육성"
  },
  {
    "wk": "18주~ 산란",
    "t": 24,
    "range": "21~27",
    "stage": "산란"
  }
];

export const PIG_TARGET_TEMP = [
  {
    "stage": "입식(이유)",
    "t": 23,
    "wk": "0주",
    "weight": "5kg"
  },
  {
    "stage": "자돈 전기",
    "t": 21,
    "wk": "2주",
    "weight": "9kg"
  },
  {
    "stage": "자돈 후기",
    "t": 25,
    "wk": "4주",
    "weight": "14kg"
  },
  {
    "stage": "육성 전기",
    "t": 21,
    "wk": "6주",
    "weight": "23kg"
  },
  {
    "stage": "육성 중기",
    "t": 19,
    "wk": "8주",
    "weight": "33kg"
  },
  {
    "stage": "육성 후기",
    "t": 18,
    "wk": "10주",
    "weight": "45kg"
  },
  {
    "stage": "비육 전기",
    "t": 16,
    "wk": "14주",
    "weight": "71kg"
  },
  {
    "stage": "비육 후기(출하)",
    "t": 14,
    "wk": "17주",
    "weight": "91kg"
  }
];
