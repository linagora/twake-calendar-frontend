import type { IntentService } from 'cozy-interapp'

// cozy-interapp throws when a service is notified or ended twice, which a
// double click or React's double effects in development would do.
const readyServices = new WeakSet<IntentService>()
const endedServices = new WeakSet<IntentService>()

export const notifyIntentReady = (service: IntentService): void => {
  if (readyServices.has(service)) return
  readyServices.add(service)
  service.notifyReadyToUse()
}

export const terminateIntent = (service: IntentService, doc: unknown): void => {
  if (endedServices.has(service)) return
  endedServices.add(service)
  service.terminate(doc)
}

export const failIntent = (service: IntentService, error: Error): void => {
  if (endedServices.has(service)) return
  endedServices.add(service)
  service.throw(error)
}
