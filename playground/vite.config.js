import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import vueDevTools from 'vite-plugin-vue-devtools'
import SRI from 'unplugin-sri/vite'
import fs from 'node:fs'
import crypto from 'node:crypto'
// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    SRI({
      onComplete() {
        const fileContent = fs.readFileSync('./dist/index.html', 'utf-8') 
        const algo = 'sha384'
        const hash = crypto.createHash(algo).update(fileContent).digest('base64')
        // 实际情况应该存数据库里，带上每次打包的时间戳和细节
        fs.writeFileSync('./integrity.txt', hash, 'utf-8')
      }
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
