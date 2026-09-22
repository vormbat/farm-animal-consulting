/**
 * 협회·매체 게시판 바로가기
 *
 * 뉴스 탭 아래에 두는 공식 게시판 목록. 기사를 모아 오는 것과 별개로,
 * 농가가 직접 들어가 봐야 하는 공지·입찰·관측정보 같은 곳이다.
 * 
 * 사용자가 더한 항목은 저장소가 아니라 브라우저(localStorage)에 남는다.
 *
 * 원본 khmass-liturgy/pb 의 index.html 에서
 * `node scripts/extract-original-constants.mjs` 로 옮겨 왔다.
 * 다시 생성하지 않는다 — 고칠 일이 생기면 이 파일을 직접 고친다.
 */

export const BOARD_SITES = [
  {
    "id": "poultry",
    "name": "대한양계협회",
    "color": "#E8530A",
    "icon": "🥚",
    "home": "https://www.poultry.or.kr",
    "boards": [
      {
        "label": "공지사항",
        "url": "https://www.poultry.or.kr/bbs/board.php?bo_table=notice"
      },
      {
        "label": "산란계 관측정보",
        "url": "https://poultry.or.kr/bbs/board.php?bo_table=egg_watch_info"
      },
      {
        "label": "양계 정보마당",
        "url": "https://www.poultry.or.kr/bbs/board.php?bo_table=info"
      },
      {
        "label": "계란 수급예측시스템",
        "url": "https://egg.poultry.or.kr"
      }
    ]
  },
  {
    "id": "chicken",
    "name": "대한계육협회",
    "color": "#1B7A3E",
    "icon": "🍗",
    "home": "https://chicken.or.kr/home/start.php",
    "boards": [
      {
        "label": "공지사항",
        "url": "https://chicken.or.kr/bbs/boardlist_2025.php?Ncode=b3_1"
      },
      {
        "label": "최신육계뉴스",
        "url": "https://chicken.or.kr/bbs/boardlist_2025.php?Ncode=b3_2"
      },
      {
        "label": "입찰정보",
        "url": "https://chicken.or.kr/bbs/boardlist_2025.php?Ncode=b3_3"
      },
      {
        "label": "협회동향",
        "url": "https://chicken.or.kr/bbs/boardlist_2025.php?Ncode=b3_6"
      }
    ]
  },
  {
    "id": "country",
    "name": "농축산저널",
    "color": "#1565C0",
    "icon": "📰",
    "home": "https://countrynews.co.kr/ko-kr",
    "boards": [
      {
        "label": "전체 뉴스",
        "url": "https://countrynews.co.kr/ko-kr"
      },
      {
        "label": "축산 뉴스",
        "url": "https://countrynews.co.kr/ko-kr"
      }
    ]
  },
  {
    "id": "vet",
    "name": "수의사전문채널",
    "color": "#7B1FA2",
    "icon": "🩺",
    "home": "https://www.dailyvet.co.kr",
    "boards": [
      {
        "label": "산업동물 뉴스",
        "url": "https://www.dailyvet.co.kr/category/news/practice/industrial-animal"
      },
      {
        "label": "전체 뉴스",
        "url": "https://www.dailyvet.co.kr"
      }
    ]
  }
];
