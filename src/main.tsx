import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from '@/app/AppShell';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 수집 파이프라인이 분 단위로 커밋하므로 5분 정도는 재요청하지 않는다.
      staleTime: 5 * 60_000,
      gcTime: 30 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const container = document.getElementById('root');
if (!container) throw new Error('#root 엘리먼트를 찾을 수 없습니다.');

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  </StrictMode>,
);
