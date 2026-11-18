import { api } from '@common/utils/apiUtils'
import { EntityResponse } from './type/EntityData'

export async function fetchEntityById(id: string): Promise<EntityResponse> {
  const entity = await api.get(`api/entity/${encodeURIComponent(id)}`).json()
  return entity as EntityResponse
}
