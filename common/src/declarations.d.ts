declare module '*.styl'
declare module 'cozy-interapp' {
  export default class Intents {
    constructor(options?: Record<string, unknown>)
    create(
      action: string,
      type: string,
      data?: Record<string, unknown>,
      permissions?: string[]
    ): unknown
  }
}

declare module 'classnames' {
  type ClassValue =
    string | number | boolean | null | undefined | ClassArray | ClassDictionary
  interface ClassDictionary {
    [id: string]: boolean | undefined | null
  }
  type ClassArray = ClassValue[]
  function classnames(...args: ClassValue[]): string
  export = classnames
}

declare const process: {
  env: {
    [key: string]: string | undefined
  }
}

declare module 'twake-i18n' {
  export function useI18n(): {
    t: (key: string, options?: Record<string, unknown>) => string
    f: (date: string, format: string) => string
    lang: string
  }
  export const I18nContext: import('react').Context<unknown>
  export const DEFAULT_LANG: string
  const I18n: import('react').ComponentType<unknown>
  export default I18n
}
