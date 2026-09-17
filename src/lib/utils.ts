/**
 * 클래스 이름 병합.
 *
 * shadcn CLI 가 생성하는 컴포넌트는 `import { cn } from 'cn'` 을 쓴다
 * (shadcn-ui/cn — clsx + tailwind-merge 를 대체하는 공식 패키지).
 * 프로젝트 코드가 `@/lib/utils` 를 쓰든 `cn` 을 쓰든 같은 구현을 가리키도록
 * 여기서 그대로 다시 내보낸다. 구현을 두 벌 두지 않기 위한 얇은 재수출이다.
 */
export { cn } from 'cn';
