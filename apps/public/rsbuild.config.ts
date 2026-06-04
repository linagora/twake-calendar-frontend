import { defineConfig } from '@rsbuild/core'
import { pluginReact } from '@rsbuild/plugin-react'
import { pluginStylus } from '@rsbuild/plugin-stylus'
import { pluginSvgr } from '@rsbuild/plugin-svgr'

import { getInjectedAliases } from '../../common/injectedAliases'
import { injectedAliases } from './injectedAliases'

export default defineConfig({
  plugins: [pluginReact(), pluginStylus(), pluginSvgr()],
  html: {
    template: '../../public/index.html'
  },
  server: {
    port: 5001,
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
    minify: true,
    sourceMap: {
      js: 'source-map'
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
    alias: {
      ...getInjectedAliases(__dirname, injectedAliases),
      '@': './src',
      react: require.resolve('react'),
      'react-dom': require.resolve('react-dom')
    }
  }
})
