import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { REGIONS } from '@/data/regions';
import { setLocation, type FarmLocation } from '@/lib/location';
import { searchPlaces, type GeocodeResult } from '../api';

/**
 * 농장 위치 고르기.
 *
 * 세 갈래로 둔다. 자주 쓰는 시군은 목록에서 바로, 목록에 없으면 검색으로,
 * 현장에서는 GPS 로. 원본과 같은 구성이되 **GPS 실패를 alert 로 알리지 않는다**
 * — 화면 안에 문구로 남겨야 무엇을 해야 할지가 같이 보인다.
 */

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function pick(place: FarmLocation, close: () => void) {
  setLocation(place);
  close();
}

export function LocationPicker({ open, onOpenChange }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => onOpenChange(false);

  async function runSearch(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setSearching(true);
    setError(null);
    try {
      const found = await searchPlaces(trimmed);
      setResults(found);
      if (found.length === 0) setError(`'${trimmed}' 로 찾은 지역이 없습니다.`);
    } catch {
      setError('지역 검색에 실패했습니다. 잠시 후 다시 시도하세요.');
    } finally {
      setSearching(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>🌤️ 지역 선택</DialogTitle>
          <DialogDescription>날씨를 확인할 지역을 선택하세요</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {REGIONS.map((group) => (
            <div key={group.group}>
              <p className="mb-1.5 text-[11px] font-bold text-[var(--color-ink-muted)]">
                {group.group}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {group.list.map((city) => (
                  <button
                    key={city.name}
                    type="button"
                    onClick={() => pick({ name: city.name, lat: city.lat, lng: city.lng }, close)}
                    className="rounded-lg border border-black/10 bg-white px-2.5 py-1 text-xs font-semibold hover:bg-black/[0.04]"
                  >
                    {city.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={runSearch} className="mt-2 border-t border-black/[0.08] pt-3">
          <label
            htmlFor="region-search"
            className="mb-1.5 block text-[11px] font-bold text-[var(--color-ink-muted)]"
          >
            목록에 없는 지역은 직접 검색하세요
          </label>
          <div className="flex gap-2">
            <input
              id="region-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="예: 홍천, 영암"
              className="min-w-0 flex-1 rounded-lg border border-black/15 px-3 py-1.5 text-sm"
            />
            <button
              type="submit"
              disabled={searching}
              className="shrink-0 rounded-lg bg-[var(--color-header-to)] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {searching ? '검색 중…' : '검색'}
            </button>
          </div>

          {error ? <p className="mt-2 text-xs text-[var(--color-col-today)]">{error}</p> : null}

          {results && results.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {results.map((place) => (
                <li key={place.id}>
                  <button
                    type="button"
                    onClick={() =>
                      pick({ name: place.name, lat: place.lat, lng: place.lng }, close)
                    }
                    className="w-full rounded-lg border border-black/10 px-3 py-2 text-left text-sm hover:bg-black/[0.04]"
                  >
                    <span className="font-semibold">{place.name}</span>
                    {place.detail ? (
                      <span className="ml-2 text-[11px] text-[var(--color-ink-muted)]">
                        {place.detail}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </form>
      </DialogContent>
    </Dialog>
  );
}
