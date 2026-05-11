import { api } from '@/utils/apiUtils'
import { ResourceData } from './type/ResourceData'

export async function fetchResourceById(id: string): Promise<ResourceData> {
  const resource = await api.get(`api/resources/${id}`).json()
  return resource as ResourceData
}
