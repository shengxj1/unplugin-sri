import type { Options } from './types'

import unplugin from '.'

export default (options: Options): any => ({
  name: 'unplugin-sri',
  hooks: {
    'astro:config:setup': async (astro: any) => {
      astro.config.vite.plugins ||= []
      astro.config.vite.plugins.push(unplugin.vite(options))
    },
  },
})
