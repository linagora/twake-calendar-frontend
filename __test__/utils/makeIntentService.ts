import type { IntentService } from 'cozy-interapp'

/** cozy-interapp intent service whose every method is a jest mock. */
export const makeIntentService = (): IntentService => ({
  getData: jest.fn(),
  getIntent: jest.fn(),
  terminate: jest.fn(),
  cancel: jest.fn(),
  throw: jest.fn(),
  notifyReadyToUse: jest.fn()
})
