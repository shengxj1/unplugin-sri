import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';


// createHash('sha384').update('filecontent').digest('base64')
/**
 * 生成子资源完整性验证的 Vite 插件
 * @param {Object} options 插件配置选项
 * @param {string[]} options.algorithms 哈希算法，默认为 ['sha384']
 * @param {string[]} options.extensions 需要处理的文件扩展名，默认为 ['.js', '.css']
 * @param {boolean} options.includeImages 是否包含图片文件，默认为 false
 * @returns {import('vite').Plugin}
 */
export default function vitePluginSRI(options = {}) {
  const {
    algorithms = ['sha384'],
    extensions = ['.js', '.css'],
    includeImages = false
  } = options;

  // 图片扩展名
  const imageExtensions = includeImages ? ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'] : [];
  const allExtensions = [...extensions, ...imageExtensions];

  return {
    name: 'vite-plugin-sri',
    apply: 'build',
    enforce: 'post',

    // 在构建完成后执行
    closeBundle: async () => {
      const outDir = path.resolve(process.cwd(), 'dist');
      
      // 查找所有 HTML 文件
      const htmlFiles = findFiles(outDir, ['.html']);
      
      for (const htmlFile of htmlFiles) {
        let htmlContent = fs.readFileSync(htmlFile, 'utf-8');
        
        // 处理 script 标签
        htmlContent = processScriptTags(htmlContent, outDir, algorithms, allExtensions);
        
        // 处理 link 标签 (CSS)
        htmlContent = processLinkTags(htmlContent, outDir, algorithms, allExtensions);
        
        // 写回文件
        fs.writeFileSync(htmlFile, htmlContent, 'utf-8');


        console.log(`${htmlFile} 处理完成, 生成 integrity 值: ${generateIntegrity(htmlFile,algorithms)}`);
        // html文件存数据库，每分钟获取一次官网的html文件，计算integrity和数据库对比
        // 不一致直接群里发通知or邮件预警
        // 用本地文件模拟数据库
        fs.writeFileSync('./sri',generateIntegrity(htmlFile,algorithms),'utf-8')
      }
    
    }
  };
}

/**
 * 查找指定目录下的所有符合扩展名的文件
 * @param {string} dir 目录路径
 * @param {string[]} extensions 文件扩展名
 * @returns {string[]} 文件路径列表
 */
function findFiles(dir, extensions) {
  let results = [];
  const list = fs.readdirSync(dir);
  
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      results = results.concat(findFiles(filePath, extensions));
    } else {
      const ext = path.extname(file).toLowerCase();
      if (extensions.includes(ext)) {
        results.push(filePath);
      }
    }
  }
  
  return results;
}

/**
 * 处理 HTML 中的 script 标签
 * @param {string} htmlContent HTML 内容
 * @param {string} outDir 输出目录
 * @param {string[]} algorithms 哈希算法
 * @param {string[]} extensions 文件扩展名
 * @returns {string} 处理后的 HTML 内容
 */
function processScriptTags(htmlContent, outDir, algorithms, extensions) {
  const scriptRegex = /<script[^>]*src="([^"]+)"[^>]*><\/script>/g;
  
  return htmlContent.replace(scriptRegex, (match, src) => {
    // 跳过外部链接和已有 integrity 属性的标签
    if (src.startsWith('http') || match.includes('integrity=')) {
      return match;
    }
    
    const ext = path.extname(src).toLowerCase();
    if (!extensions.includes(ext)) {
      return match;
    }
    
    try {
      // 获取文件的绝对路径
      const filePath = path.join(outDir, src.startsWith('/') ? src.slice(1) : src);
      
      // 计算 integrity 值
      const integrity = generateIntegrity(filePath, algorithms);
      
      // 在标签中添加 integrity 属性
      return match.replace('<script', `<script integrity="${integrity}" crossorigin="anonymous"`);
    } catch (error) {
      console.error(`处理脚本文件时出错: ${src}`, error);
      return match;
    }
  });
}

/**
 * 处理 HTML 中的 link 标签
 * @param {string} htmlContent HTML 内容
 * @param {string} outDir 输出目录
 * @param {string[]} algorithms 哈希算法
 * @param {string[]} extensions 文件扩展名
 * @returns {string} 处理后的 HTML 内容
 */
function processLinkTags(htmlContent, outDir, algorithms, extensions) {
  const linkRegex = /<link[^>]*href="([^"]+)"[^>]*>/g;
  
  return htmlContent.replace(linkRegex, (match, href) => {
    // 跳过外部链接和已有 integrity 属性的标签
    if (href.startsWith('http') || match.includes('integrity=')) {
      return match;
    }
    
    const ext = path.extname(href).toLowerCase();
    if (!extensions.includes(ext)) {
      return match;
    }
    
    try {
      // 获取文件的绝对路径
      const filePath = path.join(outDir, href.startsWith('/') ? href.slice(1) : href);
      
      // 计算 integrity 值
      const integrity = generateIntegrity(filePath, algorithms);
      
      // 在标签中添加 integrity 属性
      return match.replace('<link', `<link integrity="${integrity}" crossorigin="anonymous"`);
    } catch (error) {
      console.error(`处理链接文件时出错: ${href}`, error);
      return match;
    }
  });
}

/**
 * 生成文件的 integrity 值
 * @param {string} filePath 文件路径
 * @param {string[]} algorithms 哈希算法
 * @returns {string} integrity 值
 */
export function generateIntegrity(filePath, algorithms) {
  const fileContent = fs.readFileSync(filePath);
  
  const hashes = algorithms.map(algo => {
    const hash = createHash(algo).update(fileContent).digest('base64');
    return `${algo}-${hash}`;
  });
  
  return hashes.join(' ');
}