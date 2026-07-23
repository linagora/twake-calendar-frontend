/**
 * @jest-environment jsdom
 */

import { exchangeToken, createIntent } from '@common/features/Tdrive/TdriveDao'
import { api } from '@common/utils/apiUtils'

jest.mock('@common/utils/apiUtils')

describe('TdriveDao', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('exchangeToken', () => {
    it('exchanges token with correct endpoint and body', async () => {
      const mockResponse = {
        json: jest.fn().mockResolvedValue({
          token_type: 'bearer',
          scope: 'io.cozy.files',
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          client_id: 'client-123',
          client_secret: 'secret-123',
          registration_access_token: 'reg-token'
        })
      }
      ;(api.post as jest.Mock).mockResolvedValue(mockResponse)

      const result = await exchangeToken(
        'https://drive.example.com',
        'user-id-token'
      )

      expect(api.post).toHaveBeenCalledWith('auth/token_exchange', {
        prefixUrl: 'https://drive.example.com',
        json: {
          id_token: 'user-id-token',
          exchange_type: 'app'
        }
      })
      expect(result.access_token).toBe('test-access-token')
    })

    it('throws when API call fails', async () => {
      ;(api.post as jest.Mock).mockRejectedValue(new Error('Network error'))

      await expect(
        exchangeToken('https://drive.example.com', 'token')
      ).rejects.toThrow('Network error')
    })
  })

  describe('createIntent', () => {
    it('creates intent with correct payload', async () => {
      const mockResponse = {
        json: jest.fn().mockResolvedValue({
          data: {
            type: 'io.cozy.intents',
            id: 'intent-123',
            attributes: {
              action: 'PICK',
              type: 'io.cozy.files',
              permissions: ['GET'],
              client: 'client-123',
              services: [
                {
                  slug: 'drive',
                  href: 'https://drive.example.com/intents?intent=intent-123'
                }
              ],
              availableApps: null
            },
            meta: { rev: '1' },
            links: {
              self: '/intents/intent-123',
              permissions: '/permissions/123'
            }
          }
        })
      }
      ;(api.post as jest.Mock).mockResolvedValue(mockResponse)

      const result = await createIntent(
        'https://drive.example.com',
        'test-access-token'
      )

      expect(api.post).toHaveBeenCalledWith('intents', {
        prefixUrl: 'https://drive.example.com',
        json: {
          data: {
            type: 'io.cozy.intents',
            attributes: {
              action: 'PICK',
              type: 'io.cozy.files',
              permissions: ['GET'],
              actions: [
                {
                  sharingLink: { label: 'Add as link' }
                }
              ]
            }
          }
        },
        headers: {
          Authorization: 'Bearer test-access-token'
        }
      })
      expect(result.data.id).toBe('intent-123')
      expect(result.data.attributes.services[0].href).toBe(
        'https://drive.example.com/intents?intent=intent-123'
      )
    })
  })
})
