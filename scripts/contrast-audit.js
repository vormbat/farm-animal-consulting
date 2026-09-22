/**
 * 화면에 보이는 글자의 명암비를 재서 WCAG AA 에 못 미치는 것만 돌려준다.
 *
 * 개발자 도구 콘솔에 통째로 붙여 넣은 뒤 `await auditAllTabs()` 를 부른다.
 * 자동화된 검사가 아니라 눈으로 확인하기 전에 훑어보는 도구다 — 그래서
 * 저장소에는 두되 CI 에는 걸지 않는다(실제 렌더가 필요하고, 데이터에 따라
 * 나오는 색이 달라져 결과가 매번 같지 않다).
 *
 * 계산에서 빠지는 것:
 *   - 배경이 그라데이션인 곳(헤더). 픽셀마다 달라 한 값으로 못 잰다.
 *   - `aria-hidden` · `.sr-only`. 장식이거나 눈에 안 보이는 글자다.
 */

const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
probe.canvas.width = probe.canvas.height = 1;

/** 어떤 CSS 색 표기든 rgba 로. color-mix() 같은 것도 브라우저가 풀어 준다. */
function resolve(css) {
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = '#000';
  probe.fillStyle = css;
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data;
  return [r, g, b, a / 255];
}

function luminance([r, g, b]) {
  const channel = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function over(fg, bg) {
  const alpha = fg[3] ?? 1;
  return [0, 1, 2].map((i) => fg[i] * alpha + bg[i] * (1 - alpha));
}

function contrast(a, b) {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

/** 이 요소가 실제로 깔고 앉은 배경색. 잴 수 없으면 null. */
function backgroundOf(element) {
  let node = element;
  while (node) {
    const style = getComputedStyle(node);
    if (style.backgroundImage !== 'none') return null;
    const color = resolve(style.backgroundColor);
    if (color[3] > 0.95) return color.slice(0, 3);
    if (color[3] > 0) return null; // 반투명 위 — 눈으로 본다
    node = node.parentElement;
  }
  return [255, 255, 255];
}

function auditVisible() {
  const failures = [];
  for (const element of document.querySelectorAll('header *, main *, footer *')) {
    const text = [...element.childNodes]
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent.trim())
      .join('');
    if (!text) continue;
    if (element.closest('[aria-hidden="true"], .sr-only')) continue;

    const style = getComputedStyle(element);
    if (style.visibility === 'hidden' || style.display === 'none') continue;
    if (Number(style.opacity) < 0.5) continue;
    const box = element.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) continue;

    const background = backgroundOf(element);
    if (!background) continue;

    const foreground = over(resolve(style.color), background);
    const size = parseFloat(style.fontSize);
    const bold = Number(style.fontWeight) >= 700;
    // WCAG 의 '큰 글씨' = 24px 이상, 또는 굵고 18.66px 이상.
    const required = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5;
    const ratio = contrast(foreground, background);

    if (ratio < required - 0.005) {
      failures.push({
        text: text.slice(0, 24),
        size,
        ratio: Math.round(ratio * 100) / 100,
        required,
      });
    }
  }
  return failures;
}

async function auditAllTabs(
  ids = ['price', 'weather', 'vent', 'consult', 'disease', 'hpai', 'briefing', 'premium'],
) {
  const report = {};
  for (const id of ids) {
    location.hash = id;
    await new Promise((done) => setTimeout(done, 1800)); // lazy 청크 + 데이터
    report[id] = auditVisible();
  }
  return report;
}
