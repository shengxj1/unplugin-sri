# unplugin-sri

[![NPM version](https://img.shields.io/npm/v/unplugin-sri?color=a1b858&label=)](https://www.npmjs.com/package/unplugin-sri)

A universal plugin for adding Subresource Integrity (SRI) attributes to your HTML files.

## Features

- 🔒 Automatically adds integrity attributes to script and link tags
- 🔄 Supports various hash algorithms (default: sha384)
- 🖼️ Optional support for image files
- 🛠️ Works with Vite, Webpack, Rollup, and more

## Installation

```
pnpm install unplugin-sri
```

## Usage

<details>
<summary>Vite</summary>

```js
// vite.config.js
import { defineConfig } from 'vite'
import SRI from 'unplugin-sri/vite'

export default defineConfig({
  plugins: [
    SRI({
      // options
    }),
  ],
})
```
</details>

<details>
<summary>Webpack</summary>

```js
// webpack.config.js
module.exports = {
  plugins: [
    require('unplugin-sri/webpack')({
      // options
    }),
  ],
}
```
</details>

<details>
<summary>Rollup</summary>

```js
// rollup.config.js
import SRI from 'unplugin-sri/rollup'

export default {
  plugins: [
    SRI({
      // options
    }),
  ],
}
```
</details>

<details>
<summary>esbuild</summary>

```js
// esbuild.config.js
import { build } from 'esbuild'
import SRI from 'unplugin-sri/esbuild'

build({
  plugins: [
    SRI({
      // options
    }),
  ],
})
```
</details>

<details>
<summary>Nuxt</summary>

```js
// nuxt.config.js
export default {
  buildModules: [
    ['unplugin-sri/nuxt', {
      // options
    }],
  ],
}
```
</details>

<details>
<summary>Vue CLI</summary>

```js
// vue.config.js
module.exports = {
  configureWebpack: {
    plugins: [
      require('unplugin-sri/webpack')({
        // options
      }),
    ],
  },
}
```
</details>

## Options
```javascript
interface Options {
  /**
   * Hash algorithm to use for SRI
   * @default 'sha384'
   */
  algorithm?: string
  
  /**
   * File extensions to process
   * @default ['.js', '.css']
   */
  extensions?: string[]
  
  /**
   * Whether to include image files
   * @default false
   */
  includeImages?: boolean
  
  /**
   * Callback function to execute when processing is complete
   */
  onComplete?: () => void
}
```
## How It Works

The plugin works by:

1. Waiting for the build process to complete
2. Finding all HTML files in the output directory (defaults to `dist`)
3. Processing each HTML file to:
   - Find all `<script>` and `<link>` tags that reference local resources
   - Calculate the SRI hash for each referenced file
   - Add `integrity` and `crossorigin="anonymous"` attributes to the tags
4. Writing the modified HTML files back to disk

## Features

- Automatically adds SRI attributes to JavaScript and CSS resources
- Optionally processes image files
- Skips external resources (URLs starting with `http`)
- Skips resources that already have an `integrity` attribute
- Adds `crossorigin="anonymous"` attribute when needed
- Works with all major bundlers through the unplugin interface

## Example

Before:
```html
<link href="styles.css" rel="stylesheet">
<script src="main.js"></script>
```

After:
```html
<link href="styles.css" rel="stylesheet" integrity="sha384-1234abcd..." crossorigin="anonymous">
<script src="main.js" integrity="sha384-5678efgh..." crossorigin="anonymous"></script>
```

## License

[MIT](./LICENSE)