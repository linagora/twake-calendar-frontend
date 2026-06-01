import { defineConfig } from '@rsbuild/core'
import { pluginReact } from '@rsbuild/plugin-react'
import { pluginStylus } from '@rsbuild/plugin-stylus'
import { pluginSvgr } from '@rsbuild/plugin-svgr'

export default defineConfig({
  plugins: [pluginReact(), pluginStylus(), pluginSvgr()],
  html: {
    template: './public/index.html'
  },
  server: {
    port: 5000,
    historyApiFallback: true
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
      js: process.env.NODE_ENV === 'production' ? 'hidden-source-map' : 'source-map'
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
      react: require.resolve('react'),
      'react-dom': require.resolve('react-dom')
    }
  }
})
