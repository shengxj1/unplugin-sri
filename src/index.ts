import type { UnpluginFactory } from 'unplugin'
import type { Options } from './types'
import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createUnplugin } from 'unplugin'

export const unpluginFactory: UnpluginFactory<Options | undefined> = (options) => {
  const defaultOptions = {
    algorithm: 'sha384',
    outputFile: 'integrity.json',
    extensions: ['.js', '.css'],
    includeImages: false,
    ...options,
  }

  // 图片扩展名
  const imageExtensions = defaultOptions.includeImages ? ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'] : []
  const allExtensions = [...defaultOptions.extensions, ...imageExtensions]
  
  const integrityMap: Record<string, string> = {}

  return {
    name: 'unplugin-sri',

    // 处理所有资源文件
    transformInclude(id) {
      const ext = path.extname(id).toLowerCase()
      return allExtensions.includes(ext)
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

    // 构建完成后写入完整性哈希文件并更新HTML文件
    async buildEnd() {
      try {
        // 写入JSON文件
        const outputPath = path.resolve(process.cwd(), defaultOptions.outputFile)
        await fs.writeFile(
          outputPath,
          JSON.stringify(integrityMap, null, 2),
          'utf-8',
        )
        console.log(`SRI integrity values written to ${outputPath}`)
        
        // 处理HTML文件
        await processHtmlFiles()
      }
      catch (error) {
        console.error('Failed to write SRI integrity file or process HTML:', error)
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
      },
    },
  }
  
  // 处理HTML文件的函数
  async function processHtmlFiles() {
    const outDir = path.resolve(process.cwd(), 'dist') // 假设输出目录是dist
    
    try {
      // 查找所有HTML文件
      const htmlFiles = await findFiles(outDir, ['.html'])
      
      for (const htmlFile of htmlFiles) {
        let htmlContent = await fs.readFile(htmlFile, 'utf-8')
        
        // 处理script标签
        htmlContent = processScriptTags(htmlContent, outDir)
        
        // 处理link标签
        htmlContent = processLinkTags(htmlContent, outDir)
        
        // 写回文件
        await fs.writeFile(htmlFile, htmlContent, 'utf-8')
        
        console.log(`${htmlFile} 处理完成, 生成 integrity 值`)
      }
    } catch (error) {
      console.error('处理HTML文件时出错:', error)
    }
  }
  
  // 查找指定目录下的所有符合扩展名的文件
  async function findFiles(dir: string, extensions: string[]): Promise<string[]> {
    let results: string[] = []
    
    try {
      const list = await fs.readdir(dir)
      
      for (const file of list) {
        const filePath = path.join(dir, file)
        const stat = await fs.stat(filePath)
        
        if (stat.isDirectory()) {
          const subResults = await findFiles(filePath, extensions)
          results = results.concat(subResults)
        } else {
          const ext = path.extname(file).toLowerCase()
          if (extensions.includes(ext)) {
            results.push(filePath)
          }
        }
      }
    } catch (error) {
      console.error(`查找文件时出错: ${dir}`, error)
    }
    
    return results
  }
  
  // 处理HTML中的script标签
  function processScriptTags(htmlContent: string, outDir: string): string {
    const scriptRegex = /<script[^>]*src="([^"]+)"[^>]*><\/script>/g
    
    return htmlContent.replace(scriptRegex, (match, src) => {
      // 跳过外部链接和已有integrity属性的标签
      if (src.startsWith('http') || match.includes('integrity=')) {
        return match
      }
      
      const ext = path.extname(src).toLowerCase()
      if (!allExtensions.includes(ext)) {
        return match
      }
      
      try {
        // 获取文件名
        const fileName = src.split('/').pop() || src
        
        // 从integrityMap中获取integrity值
        if (integrityMap[fileName]) {
          // 在标签中添加integrity属性
          return match.replace('<script', `<script integrity="${integrityMap[fileName]}" crossorigin="anonymous"`)
        }
      } catch (error) {
        console.error(`处理脚本文件时出错: ${src}`, error)
      }
      
      return match
    })
  }
  
  // 处理HTML中的link标签
  function processLinkTags(htmlContent: string, outDir: string): string {
    const linkRegex = /<link[^>]*href="([^"]+)"[^>]*>/g
    
    return htmlContent.replace(linkRegex, (match, href) => {
      // 跳过外部链接和已有integrity属性的标签
      if (href.startsWith('http') || match.includes('integrity=')) {
        return match
      }
      
      const ext = path.extname(href).toLowerCase()
      if (!allExtensions.includes(ext)) {
        return match
      }
      
      try {
        // 获取文件名
        const fileName = href.split('/').pop() || href
        
        // 从integrityMap中获取integrity值
        if (integrityMap[fileName]) {
          // 在标签中添加integrity属性
          return match.replace('<link', `<link integrity="${integrityMap[fileName]}" crossorigin="anonymous"`)
        }
      } catch (error) {
        console.error(`处理链接文件时出错: ${href}`, error)
      }
      
      return match
    })
  }
}

export const unplugin = /* #__PURE__ */ createUnplugin(unpluginFactory)

export default unplugin
