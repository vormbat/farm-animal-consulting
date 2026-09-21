import { useState } from 'react';
import { setLocation } from '@/lib/location';

/** GPS 로 현재 위치를 잡는다. 실패 사유를 사용자 말로 돌려준다. */
export function useCurrentPosition() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detect = () => {
    if (!('geolocation' in navigator)) {
      setError('이 브라우저는 위치 기능을 지원하지 않습니다. 지역을 직접 선택하세요.');
      return;
    }
    setBusy(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setBusy(false);
        setLocation({
          // 역지오코딩으로 행정구역 이름을 받아 올 수도 있지만, 그러자고
          // 사용자의 좌표를 한 번 더 외부로 보내지는 않는다. 이름은 고정 문구로 둔다.
          name: '현재 위치',
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (failure) => {
        setBusy(false);
        setError(
          failure.code === failure.PERMISSION_DENIED
            ? '위치 권한이 거부됐습니다. 지역을 직접 선택하세요.'
            : '위치를 잡지 못했습니다. 지역을 직접 선택하세요.',
        );
      },
      { timeout: 10_000, maximumAge: 5 * 60 * 1000 },
    );
  };

  return { detect, busy, error };
}
