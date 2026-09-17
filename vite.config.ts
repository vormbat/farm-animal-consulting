import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  // GitHub Pages 프로젝트 사이트는 /<repo>/ 하위에 배포되므로 base 를 환경변수로 받는다.
  // 저장소 이름이 정해지면 배포 워크플로에서 VITE_BASE 를 넘겨준다. 로컬은 '/'.
  const env = loadEnv(mode, process.cwd(), '');
  const base = env.VITE_BASE || '/';

  return {
    base,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      // 탭별 lazy 청크가 잘 쪼개졌는지 눈으로 확인할 수 있게 유지한다.
      chunkSizeWarningLimit: 600,
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: false,
    },
  };
});
