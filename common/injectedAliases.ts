import path from 'path'

/**
 * Returns a mapping of injected component aliases for Rsbuild.
 * @param appDir The root directory of the application (e.g. __dirname from rsbuild.config.ts)
 * @param overrides A mapping of specific @injected/* paths to their custom implementations
 */
export function getInjectedAliases(
  appDir: string,
  overrides: string[]
): Record<string, string> {
  // Base aliases mapping to their exact default locations in the common package
  const baseAliases: Record<string, string> = {
    '@injected': path.resolve(appDir, '../../common/src')
  }

  // Apply application-specific overrides
  const resolvedOverrides = overrides.reduce(
    (acc, override) => {
      acc[`@injected/${override}`] = path.resolve(appDir, `./src/${override}`)
      return acc
    },
    {} as Record<string, string>
  )

  return { ...resolvedOverrides, ...baseAliases }
}
