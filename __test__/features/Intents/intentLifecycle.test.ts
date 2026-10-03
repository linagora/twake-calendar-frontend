import {
  failIntent,
  notifyIntentReady,
  terminateIntent
} from '@common/features/Intents/intentLifecycle'
import { makeIntentService } from '../../utils/makeIntentService'

describe('intentLifecycle', () => {
  it('notifies the caller only once', () => {
    const service = makeIntentService()
    notifyIntentReady(service)
    notifyIntentReady(service)
    expect(service.notifyReadyToUse).toHaveBeenCalledTimes(1)
  })

  it('ends the intent only once, whatever the way', () => {
    const service = makeIntentService()
    terminateIntent(service, null)
    failIntent(service, new Error('late'))
    terminateIntent(service, null)
    expect(service.terminate).toHaveBeenCalledTimes(1)
    expect(service.terminate).toHaveBeenCalledWith(null)
    expect(service.throw).not.toHaveBeenCalled()
  })

  it('fails the intent with the error', () => {
    const service = makeIntentService()
    const error = new Error('boom')
    failIntent(service, error)
    expect(service.throw).toHaveBeenCalledWith(error)
  })
})
