/**
 * 클래스 이름 병합.
 *
 * shadcn CLI 가 생성하는 컴포넌트는 `import { cn } from 'cn'` 을 쓴다
 * (shadcn-ui/cn — clsx + tailwind-merge 를 대체하는 공식 패키지).
 * 프로젝트 코드가 `@/lib/utils` 를 쓰든 `cn` 을 쓰든 같은 구현을 가리키도록
 * 여기서 그대로 다시 내보낸다. 구현을 두 벌 두지 않기 위한 얇은 재수출이다.
 */
export { cn } from 'cn';

/**
 * 데이터에서 온 강조색을 **글자에** 쓸 때 어둡게 낮춘다.
 *
 * 매체·협회 색은 수집 산출물에 들어 있어 우리가 고를 수 없는데, 그중에는
 * 흰 바탕에서 3:1 밖에 안 되는 밝은 주황도 있다(농수축산신문 #EF6C00).
 * 띠나 점으로 쓸 때는 그대로 두고, 글자일 때만 이걸 거친다 — 색은 그대로
 * 알아볼 수 있으면서 4.5:1 을 넘는다.
 */
export function inkFrom(color: string): string {
  return `color-mix(in srgb, ${color} 75%, black)`;
}
