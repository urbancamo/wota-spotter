import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { VantResolver } from '@vant/auto-import-resolver'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    base: '/spotter/',
    plugins: [
      vue(),
      Components({
        resolvers: [VantResolver()],
      }),
    ],
    server: {
      host: true,
      port: 3000,
      allowedHosts: [
        '.m5tea.uk',
        '.vault',
        'localhost',
      ],
      proxy: {
        '/spotter/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/spotter\/api/, '/api'),
        },
        '/data/api': {
          target: env.DATA_API_PROXY_TARGET || 'http://localhost:3003',
          changeOrigin: true,
        },
      },
    },
  }
})
