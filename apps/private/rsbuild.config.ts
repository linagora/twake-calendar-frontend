import path from 'path'
import { defineConfig } from '@rsbuild/core'
import { pluginReact } from '@rsbuild/plugin-react'
import { pluginStylus } from '@rsbuild/plugin-stylus'
import { pluginSvgr } from '@rsbuild/plugin-svgr'

import { getInjectedAliases } from '../../common/injectedAliases'
import {
  isSentryConfigured,
  setupSentryPlugin
} from '../../common/sentryBuildUtils'
import { injectedAliases } from './injectedAliases'

const lottiePlayerWasm =
  require.resolve('@lottiefiles/dotlottie-web/dotlottie-player.wasm')

export default defineConfig({
  plugins: [pluginReact(), pluginStylus(), pluginSvgr()],
  html: {
    template: '../../public/index.html'
  },
  server: {
    port: 5000,
    historyApiFallback: true,
    publicDir: [{ name: '../../public' }, { name: 'public' }]
  },
  source: {
    entry: {
      index: './src/index.tsx'
    }
  },
  output: {
    distPath: {
      root: 'dist'
    },
    // The Lottie player runtime, served locally rather than from its CDN
    copy: [{ from: lottiePlayerWasm, to: 'dotlottie-player.wasm' }],
    minify: true,
    sourceMap: {
      js: isSentryConfigured() ? 'source-map' : false
    }
  },
  performance: {
    chunkSplit: {
      strategy: 'split-by-experience',
      forceSplitting: {
        mui: /node_modules\/(@mui|@emotion)/,
        fullcalendar: /node_modules\/@fullcalendar/,
        sentry: /node_modules\/@sentry/,
        date: /node_modules\/(moment|date-fns|dayjs)/
      }
    }
  },
  resolve: {
    aliasStrategy: 'prefer-alias',
    alias: {
      ...getInjectedAliases(__dirname, injectedAliases),
      '@': path.resolve(__dirname, './src'),
      '@common': path.resolve(__dirname, '../../common/src'),
      react: require.resolve('react'),
      'react-dom': require.resolve('react-dom')
    }
  },
  tools: {
    rspack(_, { appendPlugins }) {
      setupSentryPlugin(appendPlugins, 'dist')
    }
  }
})
