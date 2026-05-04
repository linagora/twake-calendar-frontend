import { api } from '@/utils/apiUtils'
import { OpenPaasUserData } from './type/OpenPaasUserData'
import { ModuleConfiguration, SearchResponseItem } from './userDataTypes'

export async function fetchCurrentUser(): Promise<OpenPaasUserData> {
  const response = await api.get(`api/user`)
  return response.json()
}

export async function fetchUserByEmail(
  email: string
): Promise<Array<Record<string, string>>> {
  const r = await api(`api/users?email=${encodeURIComponent(email)}`)
  if (!r.ok) {
    return []
  }
  return r.json()
}

export async function fetchUserById(id: string): Promise<OpenPaasUserData> {
  const user = await api.get(`api/users/${id}`).json()
  return user as OpenPaasUserData
}

export async function searchPeople(
  query: string,
  objectTypes: string[] = ['user', 'contact']
): Promise<SearchResponseItem[]> {
  const response: SearchResponseItem[] = await api
    .post(`api/people/search`, {
      body: JSON.stringify({
        limit: 10,
        objectTypes,
        q: query
      })
    })
    .json()
  return response
}

export async function patchConfigurations(modules: ModuleConfiguration[]) {
  return await api.patch(`api/configurations?scope=user`, {
    json: modules
  })
}
