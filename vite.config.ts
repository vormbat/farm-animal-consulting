import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath, URL } from 'node:url';
import { join, normalize, sep } from 'node:path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const DATA_DIR = fileURLToPath(new URL('./data', import.meta.url));

/**
 * 개발 중에는 저장소의 `data/` 를 `/data/...` 로 그대로 내준다.
 *
 * 배포된 화면은 raw.githubusercontent.com 에서 JSON 을 읽지만, 개발 중에는
 * 방금 `uv run python -m pipeline run ...` 으로 만든 로컬 결과를 바로 보는 편이
 * 훨씬 빠르다. `data/` 를 public/ 으로 복사하지 않는 이유는, 복사본이 생기면
 * 어느 쪽이 진짜인지 헷갈리고 빌드 산출물에도 딸려 들어가기 때문이다.
 */
function serveLocalData(): Plugin {
  return {
    name: 'farm-animal-consulting:serve-local-data',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/data', (request, response, next) => {
        const relative = decodeURIComponent((request.url ?? '/').split('?')[0] ?? '/');
        const target = normalize(join(DATA_DIR, relative));

        // data/ 밖으로 나가는 경로는 거절한다.
        if (!target.startsWith(DATA_DIR + sep)) {
          response.statusCode = 403;
          response.end('forbidden');
          return;
        }

        // 스트림이 아니라 한 번에 읽어 바로 닫는다. 윈도우에서는 열린 읽기 핸들이
        // 있으면 수집 스크립트의 원자적 교체(os.replace)가 거부당해, 개발 서버를
        // 켜 둔 채로는 `pipeline run` 이 실패한다. 산출 JSON 은 작아서 통째로 읽어도 된다.
        stat(target)
          .then(async (info) => {
            if (!info.isFile()) {
              next();
              return;
            }
            const payload = await readFile(target);
            response.setHeader('Content-Type', 'application/json; charset=utf-8');
            response.setHeader('Cache-Control', 'no-store');
            response.end(payload);
          })
          .catch(() => {
            response.statusCode = 404;
            response.setHeader('Content-Type', 'application/json; charset=utf-8');
            response.end(
              JSON.stringify({
                error: `${relative} 가 아직 없습니다. uv run python -m pipeline run <수집원> 을 먼저 실행하세요.`,
              }),
            );
          });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // GitHub Pages 프로젝트 사이트는 /<repo>/ 하위에 배포되므로 base 를 환경변수로 받는다.
  // 배포 워크플로가 저장소 컨텍스트에서 채워 넣는다. 로컬은 '/'.
  const env = loadEnv(mode, process.cwd(), '');
  const base = env.VITE_BASE || '/';

  return {
    base,
    plugins: [react(), tailwindcss(), serveLocalData()],
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
