import type { UnpluginFactory } from 'unplugin'
import type { Options } from './types'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { createUnplugin } from 'unplugin'

export const unpluginFactory: UnpluginFactory<Options | undefined> = (options) => {
  const defaultOptions = {
    algorithm: 'sha384',
    extensions: ['.js', '.css'],
    includeImages: false,
    ...options,
  }

  // 图片扩展名
  const imageExtensions = defaultOptions.includeImages ? ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'] : []
  const allExtensions = [...defaultOptions.extensions, ...imageExtensions]

  return {
    name: 'unplugin-sri',

    // 构建完成后处理HTML文件
    async closeBundle() {
      try {
        // 处理HTML文件
        await processHtmlFiles()
      }
      catch (error) {
        console.error('Failed to process HTML:', error)
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
        let htmlContent = await fs.promises.readFile(htmlFile, 'utf-8')
        // 处理script标签
        htmlContent = await processScriptTags(htmlContent, outDir)
        // 处理link标签
        htmlContent = await processLinkTags(htmlContent, outDir)
        // 写回文件
        await fs.promises.writeFile(htmlFile, htmlContent, 'utf-8') 
        console.log(`${htmlFile} finished`)
        defaultOptions.onComplete && defaultOptions.onComplete()
      }
    } catch (error) {
      console.error('处理HTML文件时出错:', error)
    }
  }
  
  // 查找指定目录下的所有符合扩展名的文件
  async function findFiles(dir: string, extensions: string[]): Promise<string[]> {
    let results: string[] = []
    
    try { 
      const list = await fs.promises.readdir(dir)
      
      for (const file of list) {
        const filePath = path.join(dir, file)
        const stat = await fs.promises.stat(filePath)
        
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
  
  function generateIntegrity(fileContent: string, algorithm: string): string {
    const hash = createHash(algorithm).update(fileContent).digest('base64');
    return `${algorithm}-${hash}`;
  }

  // 处理HTML中的script标签
  async function processScriptTags(htmlContent: string, outDir: string): Promise<string> {
    const scriptRegex = /<script[^>]*src="([^"]+)"[^>]*><\/script>/g
    let result = htmlContent;
    let match;
    
    while ((match = scriptRegex.exec(htmlContent)) !== null) {
      const fullMatch = match[0];
      const src = match[1];
      
      // 跳过外部链接和已有integrity属性的标签
      if (src.startsWith('http') || fullMatch.includes('integrity=')) {
        continue;
      }
      
      const ext = path.extname(src).toLowerCase();
      if (!allExtensions.includes(ext)) {
        continue;
      }
      
      try {
        // 获取文件的绝对路径
        const filePath = path.join(outDir, src.startsWith('/') ? src.slice(1) : src);
        const fileContent = await fs.promises.readFile(filePath, 'utf-8');
        const integrity = generateIntegrity(fileContent, defaultOptions.algorithm);
        
        // 修复：正确处理 crossorigin 属性
        const crossoriginAttr = fullMatch.includes('crossorigin') ? "" : ' crossorigin="anonymous"';
        const newTag = fullMatch.replace('<script', `<script integrity="${integrity}"${crossoriginAttr}`);
        result = result.replace(fullMatch, newTag);
      } catch (error) {
        console.error(`处理脚本文件时出错: ${src}`, error);
      }
    }
    
    return result;
  }
  
  // 处理HTML中的link标签
  async function processLinkTags(htmlContent: string, outDir: string): Promise<string> {
    const linkRegex = /<link[^>]*href="([^"]+)"[^>]*>/g
    let result = htmlContent;
    let match;
    
    while ((match = linkRegex.exec(htmlContent)) !== null) {
      const fullMatch = match[0];
      const href = match[1];
      
      // 跳过外部链接和已有integrity属性的标签
      if (href.startsWith('http') || fullMatch.includes('integrity=')) {
        continue;
      }
      
      const ext = path.extname(href).toLowerCase();
      if (!allExtensions.includes(ext)) {
        continue;
      }
      
      try {
        // 获取文件的绝对路径
        const filePath = path.join(outDir, href.startsWith('/') ? href.slice(1) : href);
        
        const fileContent = await fs.promises.readFile(filePath, 'utf-8');
        // 计算 integrity 值
        const integrity = generateIntegrity(fileContent, defaultOptions.algorithm);
        
        // 修复：正确处理 crossorigin 属性
        const crossoriginAttr = fullMatch.includes('crossorigin') ? "" : ' crossorigin="anonymous"';
        const newTag = fullMatch.replace('<link', `<link integrity="${integrity}" ${crossoriginAttr}`);
        result = result.replace(fullMatch, newTag);
      } catch (error) {
        console.error(`处理链接文件时出错: ${href}`, error);
      }
    }
    
    return result;
  }
}

export const unplugin = /* #__PURE__ */ createUnplugin(unpluginFactory)

export default unplugin
