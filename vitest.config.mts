import path from 'node:path'

import { configDefaults, defineConfig } from 'vitest/config'
import type { Plugin, UserConfig } from 'vite'

// Set timezone to UTC for consistent test results across all environments
process.env.TZ = 'UTC'

const fromRoot = (file: string): string =>
  path.resolve(import.meta.dirname, file)

// The packages that are not valid for Node as published (ESM with extensionless
// imports, or CSS imports), or that must see the aliases and mocks below. They
// go through Vite, every other dependency being loaded by Node.
const inlineFrom = (packages: string[]): RegExp[] => [
  new RegExp(`/node_modules/(${packages.join('|')})/`)
]
const NODE_INLINE = [
  'ky',
  '@linagora/twake-mui',
  '@linagora/twake-oidc',
  '@linagora/twake-icons',
  '@linagora/twake-utils',
  '@linagora/twake-sdk',
  '@linagora/twake-bar',
  '@linagora/twake-websocket',
  'html-react-parser',
  'domhandler',
  'htmlparser2',
  'domutils',
  'entities',
  'domelementtype',
  'dom-serializer'
]
const DOM_INLINE = [
  ...NODE_INLINE,
  'preact',
  '@fullcalendar',
  'react-calendar',
  'get-user-locale',
  'memoize',
  'mimic-function',
  '@wojtekmaj',
  'cozy-ui',
  'p-map',
  '@linagora/twake-embed',
  'mime'
]

// Components render their images under the name of the file, which is what the
// tests look for
const BINARY_ASSET =
  /\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$/
const assetsAsBasename = (): Plugin => ({
  name: 'assets-as-basename',
  enforce: 'pre',
  load(id) {
    if (BINARY_ASSET.test(id)) {
      return `export default ${JSON.stringify(path.basename(id))}`
    }
  }
})

// `@/` is the `src` directory of the app of the importing file, like in the
// rsbuild config of each app
const appRelativeImports = (): Plugin => ({
  name: 'app-relative-imports',
  enforce: 'pre',
  resolveId(source, importer, options) {
    const app = importer?.match(/\/apps\/(private|public)\/src\//)?.[1]
    if (!app || !source.startsWith('@/') || source.startsWith('@/common/')) {
      return null
    }
    return this.resolve(
      fromRoot(`apps/${app}/src/${source.slice(2)}`),
      importer,
      { ...options, skipSelf: true }
    )
  }
})

const sharedAliases = [
  {
    find: /^.+\.(css|scss|sass|less|styl|stylus)$/,
    replacement: fromRoot('__test__/utils/styleStub.ts')
  },
  {
    find: /^.+\.svg\?react$/,
    replacement: fromRoot('__test__/utils/svgComponentStub.tsx')
  },
  {
    find: /^(react-markdown|remark-gfm)$/,
    replacement: fromRoot('__test__/utils/markdownStub.ts')
  },
  { find: /^@\/common\/(.*)$/, replacement: fromRoot('common/src/$1') },
  { find: /^@common\/(.*)$/, replacement: fromRoot('common/src/$1') },
  { find: /^@private\/(.*)$/, replacement: fromRoot('apps/private/src/$1') },
  { find: /^@public\/(.*)$/, replacement: fromRoot('apps/public/src/$1') }
]

const domProject = (
  name: string,
  injectedDir: string,
  include: string[],
  exclude: string[] = []
): UserConfig => ({
  extends: true,
  resolve: {
    alias: [
      {
        find: /^@injected\/(.*)$/,
        replacement: fromRoot(`${injectedDir}/$1`)
      }
    ]
  },
  test: {
    name,
    environment: 'jsdom',
    environmentOptions: { jsdom: { url: 'http://localhost/' } },
    include,
    exclude: [...configDefaults.exclude, ...exclude],
    server: { deps: { inline: inlineFrom(DOM_INLINE) } }
  }
})

export default defineConfig({
  plugins: [assetsAsBasename(), appRelativeImports()],
  resolve: {
    alias: sharedAliases,
    // A single copy, whichever package imports them
    dedupe: [
      'react',
      'react-dom',
      'preact',
      '@linagora/twake-mui',
      '@linagora/twake-icons',
      '@linagora/twake-oidc',
      '@linagora/twake-utils',
      '@linagora/twake-websocket'
    ]
  },
  test: {
    globals: true,
    clearMocks: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    // A `$property` in the title of `it.each` is cut at 40 characters by default
    taskTitleValueFormatTruncate: 0,
    env: { TZ: 'UTC' },
    setupFiles: [fromRoot('common/src/setupTests.ts')],
    coverage: {
      enabled: true,
      provider: 'v8',
      reportsDirectory: 'coverage',
      reporter: ['clover', 'json', 'lcov', 'text'],
      reportOnFailure: true
    },
    projects: [
      domProject(
        'dom',
        'apps/private/src',
        ['**/*.test.tsx'],
        ['**/*.public.test.tsx', '**/apps/public/**']
      ),
      domProject('public-dom', 'apps/public/src', [
        '**/*.public.test.tsx',
        '**/apps/public/**/*.test.tsx'
      ]),
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['**/*.test.ts'],
          server: { deps: { inline: inlineFrom(NODE_INLINE) } }
        }
      }
    ]
  }
})
