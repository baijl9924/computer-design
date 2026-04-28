import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiServiceTarget = env.VITE_API_SERVICE_TARGET || 'http://127.0.0.1:8080';
  const yoloServiceTarget = env.VITE_YOLO_SERVICE_TARGET || 'http://127.0.0.1:8001';
  const accountServiceTarget = env.VITE_ACCOUNT_SERVICE_TARGET || 'http://127.0.0.1:8002';

  return {
    base: env.VITE_PUBLIC_BASE || '/',
    plugins: [
      vue({
        template: {
          compilerOptions: {
            isCustomElement: (tag) => tag === 'iconify-icon'
          }
        }
      })
    ],
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/api-service': {
          target: apiServiceTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api-service/, '')
        },
        '/yolo-service': {
          target: yoloServiceTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/yolo-service/, '')
        },
        '/account-service': {
          target: accountServiceTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/account-service/, '')
        }
      }
    }
  };
})
