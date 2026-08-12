import { sentryWebpackPlugin } from '@sentry/webpack-plugin'

export function isSentryConfigured(): boolean {
  return Boolean(
    process.env.SENTRY_URL &&
    process.env.SENTRY_AUTH_TOKEN &&
    process.env.SENTRY_ORG &&
    process.env.SENTRY_PROJECT
  )
}

/**
 * Utility function to configure and attach the Sentry Webpack/Rspack plugin to Rsbuild.
 *
 * @param appendPlugins Function provided by Rsbuild tools.rspack context to register Rspack plugins
 * @param outputDir The directory where build outputs are placed (defaults to 'dist')
 */
export function setupSentryPlugin(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  appendPlugins: (plugin: any) => void,
  outputDir: string = 'dist'
): void {
  if (!isSentryConfigured()) {
    return
  }

  const sentryUrl = process.env.SENTRY_URL
  const org = process.env.SENTRY_ORG
  const project = process.env.SENTRY_PROJECT
  const authToken = process.env.SENTRY_AUTH_TOKEN

  const cleanOutputDir = outputDir.replace(/\/+$/, '')

  appendPlugins(
    sentryWebpackPlugin({
      url: sentryUrl,
      org,
      project,
      authToken,
      telemetry: false,
      sourcemaps: {
        filesToDeleteAfterUpload: `${cleanOutputDir}/**/*.map`
      }
    })
  )
}
