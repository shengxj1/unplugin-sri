export interface Options {
  /**
   * 哈希算法，默认为 sha384
   * @default 'sha384'
   */
  algorithm?: string

  /**
   * 要处理的文件扩展名
   * @default ['.js', '.css']
   */
  extensions?: string[]

  /**
   * 是否包含图片文件
   * @default false
   */
  includeImages?: boolean

  /**
   * 插件执行完成后的回调函数
   * @default null
   */
  onComplete?: () => Promise<void> | void
}
