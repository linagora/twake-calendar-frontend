import { api } from '@common/utils/apiUtils'
import { HTTPError } from 'ky'

interface CreateVideoConferenceResponse {
  url?: string
}

/**
 * Ask the server to create a video conference room and return its link.
 *
 * The link used to be invented in the browser — three then four then three
 * random letters — and written straight into the event. Nothing told the
 * conferencing backend about it, so on any deployment that refuses
 * unregistered rooms every generated link was dead. Asking the server fixes
 * that at the source, and makes the organiser the room's owner, which a
 * locally minted code could never do.
 *
 * Resolves to `null` when this deployment does not mint rooms: the route
 * answers 404 when the server has no conferencing credentials, and the caller
 * then falls back to generating a link itself — the behaviour deployments
 * running with unregistered rooms enabled still rely on.
 */
export async function createVideoConference(): Promise<string | null> {
  let response
  try {
    response = await api.post('api/videoconference')
  } catch (error) {
    if (error instanceof HTTPError && error.response.status === 404) {
      return null
    }
    throw error
  }

  const body = await response.json<CreateVideoConferenceResponse>()
  if (!body.url) {
    // A room without a link would put an empty href in an invitation, which
    // reads as a broken product rather than a broken deployment.
    throw new Error('createVideoConference returned no url')
  }
  return body.url
}
