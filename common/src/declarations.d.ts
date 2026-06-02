declare module '*.styl'

declare module 'classnames' {
  type ClassValue =
    | string
    | number
    | boolean
    | null
    | undefined
    | ClassArray
    | ClassDictionary
  interface ClassDictionary {
    [id: string]: boolean | undefined | null
  }
  type ClassArray = ClassValue[]
  function classnames(...args: ClassValue[]): string
  export = classnames
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const process: {
  env: {
    [key: string]: string | undefined
  }
}

declare module 'twake-i18n' {
  export function useI18n(): {
    t: (key: string, options?: Record<string, any>) => string
    f: (date: string, format: string) => string
    lang: string
  }
  export const I18nContext: import('react').Context<any>
  export const DEFAULT_LANG: string
  export default class I18n extends import('react').Component<any, any, any> {}
}
