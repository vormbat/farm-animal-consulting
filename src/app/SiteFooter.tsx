/** 원본 하단 고지를 그대로 계승한다. 출처 표기는 데이터 이용 조건이기도 하다. */
export function SiteFooter() {
  return (
    <footer className="mx-auto max-w-[900px] px-4 pb-10 text-center text-[11px] leading-relaxed text-[var(--color-ink-muted)]">
      <p>데이터 출처 · 대한양계협회 · 대한계육협회 · 농축산저널 · 수의사전문채널</p>
      <p className="mt-1">
        ※ 시세는 업계 평균 수준을 반영한 참고 데이터입니다. 정확한 시세·공지는 각 협회 공식 사이트를
        확인하세요.
      </p>
    </footer>
  );
}
