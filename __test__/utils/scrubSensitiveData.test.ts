import {
  scrubDeep,
  scrubText,
  scrubUrl
} from '@common/utils/scrubSensitiveData'

describe('scrubSensitiveData', () => {
  describe('scrubText', () => {
    it('masks the participation JWT', () => {
      expect(
        scrubText(
          'GET https://cal.example/calendar/api/calendars/event/participation?jwt=eyJ.a.b failed'
        )
      ).toBe(
        'GET https://cal.example/calendar/api/calendars/event/participation?jwt=[Filtered] failed'
      )
    })

    it('masks the OIDC code and state and keeps the other parameters', () => {
      expect(
        scrubText('/callback?code=abc&state=def&iss=https%3A%2F%2Fsso')
      ).toBe('/callback?code=[Filtered]&state=[Filtered]&iss=https%3A%2F%2Fsso')
    })

    it('masks the WebSocket ticket and the booking confirmation token', () => {
      expect(
        scrubText(
          'wss://cal.example/ws?ticket=t1 api/booked-event?bookingConfirmationToken=t2'
        )
      ).toBe(
        'wss://cal.example/ws?ticket=[Filtered] api/booked-event?bookingConfirmationToken=[Filtered]'
      )
    })

    it('masks the booking token carried in the path', () => {
      expect(
        scrubText('https://cal.example/booking/confirmed/tok123?x=1')
      ).toBe('https://cal.example/booking/confirmed/[Filtered]?x=1')
    })

    it('masks email addresses, plain or URL encoded', () => {
      expect(
        scrubText('user alice.b@gouv.fr and bob%40gouv.fr not found')
      ).toBe('user [email] and [email] not found')
    })

    it('does not mask words merely ending like a parameter name', () => {
      expect(scrubText('barcode=12')).toBe('barcode=12')
      expect(scrubText('?u=a%3Fbarcode%3D12')).toBe('?u=a%3Fbarcode%3D12')
    })

    it('masks a credential in a percent-encoded nested URL', () => {
      const secret = 'oK7iXAAAAAAAAAAAAAAAps0lylkdlvivvr'
      for (const text of [
        `?return=https%3A%2F%2Fcal.example%2Fcb%3Fsession_state%3D${secret}`,
        `&redirect_uri=https%3A%2F%2Fcal.example%2Fcb%3Fx%3D1%26jwt%3D${secret}`,
        ` next=https%3A%2F%2Fcal.example%2Fcb%3FCODE%3D${secret}`
      ]) {
        expect(scrubText(text)).not.toContain(secret)
      }
    })

    it('masks an encoded value up to the next encoded separator only', () => {
      expect(
        scrubText(
          '?return=https%3A%2F%2Fcal.example%2Fcb%3Fstate%3Dab%2Fcd%26iss%3Dsso%23top'
        )
      ).toBe(
        '?return=https%3A%2F%2Fcal.example%2Fcb%3Fstate%3D[Filtered]%26iss%3Dsso%23top'
      )
    })
  })

  describe('scrubUrl', () => {
    it('drops the query string and the fragment', () => {
      expect(scrubUrl('https://cal.example/excal?jwt=abc#frag')).toBe(
        'https://cal.example/excal'
      )
    })

    it('masks email addresses in DAV paths', () => {
      expect(
        scrubUrl('https://cal.example/dav/calendars/alice@gouv.fr/cal.json')
      ).toBe('https://cal.example/dav/calendars/[email]/cal.json')
    })
  })

  describe('scrubDeep', () => {
    it('scrubs a Sentry event', () => {
      const event = {
        message: 'Failed to fetch event participation: jwt=abc',
        request: {
          url: 'https://cal.example/excal?jwt=abc',
          query_string: 'jwt=abc',
          headers: {
            Referer: 'https://cal.example/booking/confirmed/tok?x=1',
            Authorization: 'Bearer secret'
          }
        },
        exception: {
          values: [{ value: 'Request failed: GET api/users?email=a@b.fr' }]
        },
        breadcrumbs: [
          {
            category: 'navigation',
            data: { from: '/callback?code=c&state=s', to: '/calendar' }
          },
          {
            category: 'fetch',
            data: { url: 'api/users?email=a@b.fr', status_code: 404 }
          }
        ],
        extra: { arguments: [{ title: 'Secret meeting', mail: 'x@y.fr' }] }
      }

      expect(scrubDeep(event)).toEqual({
        message: 'Failed to fetch event participation: jwt=[Filtered]',
        request: {
          url: 'https://cal.example/excal',
          headers: {
            Referer: 'https://cal.example/booking/confirmed/[Filtered]'
          }
        },
        exception: {
          values: [{ value: 'Request failed: GET api/users?email=[Filtered]' }]
        },
        breadcrumbs: [
          {
            category: 'navigation',
            data: { from: '/callback', to: '/calendar' }
          },
          {
            category: 'fetch',
            data: { url: 'api/users', status_code: 404 }
          }
        ],
        extra: { arguments: [{ title: 'Secret meeting', mail: '[email]' }] }
      })
    })

    it('leaves non string values untouched', () => {
      expect(scrubDeep({ a: 1, b: true, c: null })).toEqual({
        a: 1,
        b: true,
        c: null
      })
    })
  })
})
