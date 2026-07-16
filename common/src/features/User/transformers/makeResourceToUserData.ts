import { ResourceData } from '../type/ResourceData'
import { OpenPaasUserData } from '../type/OpenPaasUserData'

export interface ResourceOwnerData {
  owner: OpenPaasUserData
  resourceIcon?: string
}

export function makeResourceToUserData(
  resourceData: ResourceData,
  ownerData: OpenPaasUserData
): ResourceOwnerData {
  return {
    owner: {
      ...ownerData,
      administrators: resourceData.administrators
    },
    resourceIcon:
      window.CALENDAR_BASE_URL && resourceData.icon
        ? `${window.CALENDAR_BASE_URL}/images/icon/${resourceData.icon}.svg`
        : undefined
  }
}
