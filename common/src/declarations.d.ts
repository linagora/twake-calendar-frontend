declare module '*.styl'
declare module 'cozy-interapp' {
  /** The intent as the stack keeps it (`GET /intents/:id`) */
  export interface IntentDocument {
    _id: string
    attributes: {
      action: string
      type: string
      /** Origin of the app that started the intent */
      client: string
      /**
       * The origins that may frame a service of the intent
       * (linagora/cozy-stack#4978)
       */
      frameAncestors?: unknown
    }
  }

  /** The service side of an intent: what the `/intents` page uses */
  export interface IntentService {
    getIntent: () => IntentDocument
    /** What the client sent with the intent */
    getData: () => unknown
    /** Done: the client gets the document. Once only */
    terminate: (document: unknown) => void
    /** The client gets null. Once only */
    cancel: () => void
    /** The client gets the error. Once only */
    throw: (error: Error) => void
    /** The service is shown. Once only */
    notifyReadyToUse: () => void
    hideCross: () => void
    showCross: () => void
  }

  export default class Intents {
    constructor(options?: Record<string, unknown>)
    create(
      action: string,
      type: string,
      data?: Record<string, unknown>,
      permissions?: string[]
    ): unknown
    /**
     * Reads the intent (`GET /intents/:id`), then waits for the data of the
     * client (its answer to the `ready` message). With
     * `requireFrameAncestors`, a page framed by an origin the intent does not
     * allow (`frameAncestors`, or none given) cancels the intent and rejects
     * with `Intent service is framed by a page the intent does not allow`
     */
    createService(
      intentId: string,
      serviceWindow: Window,
      options?: { requireFrameAncestors?: boolean }
    ): Promise<IntentService>
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
