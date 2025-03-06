import type { UnpluginFactory } from 'unplugin'
import type { Options } from './types'
import { createUnplugin } from 'unplugin'
import { createHash } from 'crypto'
import fs from 'fs/promises'
import path from 'path'

export const unpluginFactory: UnpluginFactory<Options | undefined> = options => {
  const defaultOptions = {
    algorithm: 'sha384',
    outputFile: 'integrity.json',
    ...options
  }

  const integrityMap: Record<string, string> = {}

  return {
    name: 'unplugin-sri',
    
    // 处理所有资源文件
    transformInclude(id) {
      // 可以根据需要调整匹配的文件类型
      return /\.(js|css|html)$/.test(id)
    },
    
    transform(code, id) {
      // 计算文件的完整性哈希值
      const hash = createHash(defaultOptions.algorithm).update(code).digest('base64')
      const integrity = `${defaultOptions.algorithm}-${hash}`
      
      // 存储文件路径和对应的完整性哈希
      const relativePath = id.split('/').pop() || id
      integrityMap[relativePath] = integrity
      
      return code
    },
    
    // 构建完成后写入完整性哈希文件
    async buildEnd() {
      try {
        const outputPath = path.resolve(process.cwd(), defaultOptions.outputFile)
        await fs.writeFile(
          outputPath,
          JSON.stringify(integrityMap, null, 2),
          'utf-8'
        )
        console.log(`SRI integrity values written to ${outputPath}`)
      } catch (error) {
        console.error('Failed to write SRI integrity file:', error)
      }
    },
    
    // 提供验证函数供运行时使用
    vite: {
      configureServer(server) {
        // 在开发服务器中添加中间件来验证完整性
        server.middlewares.use(async (req, res, next) => {
          // 这里可以添加验证逻辑
          next()
        })
      }
    }
  }
}

export const unplugin = /* #__PURE__ */ createUnplugin(unpluginFactory)

export default unplugin
