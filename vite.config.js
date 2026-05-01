import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // Remove comments and whitespace in production
          comments: false,
          whitespace: 'condense'
        }
      }
    }),
    tailwindcss()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  base: './',
  server: {
    port: 5173,
  },
  build: {
    // Aggressive minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
        passes: 2
      },
      mangle: {
        safari10: true
      },
      format: {
        comments: false
      }
    },
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          'ui-vendor': ['radix-vue', 'reka-ui', 'lucide-vue-next'],
          'utils-vendor': ['@vueuse/core', 'clsx', 'tailwind-merge']
        },
        // Smaller chunk names
        chunkFileNames: 'js/[hash:8].js',
        entryFileNames: 'js/[hash:8].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.')
          const ext = info[info.length - 1]
          if (/\.(css)$/.test(assetInfo.name)) {
            return `css/[hash:8].${ext}`
          }
          if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name)) {
            return `img/[hash:8].${ext}`
          }
          return `assets/[hash:8].${ext}`
        }
      }
    },
    // Reduce bundle size
    chunkSizeWarningLimit: 500,
    // Enable source maps only in dev
    sourcemap: false,
    // Optimize CSS
    cssCodeSplit: true,
    // Reduce asset inline threshold
    assetsInlineLimit: 2048
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['vue', 'vue-router', 'pinia'],
    exclude: ['@vueuse/core']
  }
})
