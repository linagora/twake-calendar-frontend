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

    it('masks email addresses with non-ASCII characters', () => {
      for (const address of [
        'a@bücher.de',
        'ünal@bücher.de',
        'ünal@例え.jp',
        'josé@example.fr',
        'josé@example.fr',
        'δοκιμή@παράδειγμα.δοκιμή'
      ]) {
        const scrubbed = scrubText(`invite ${address} failed`)
        expect(scrubbed).toBe('invite [email] failed')
      }
    })

    it('masks every address of a run of non-ASCII addresses', () => {
      const scrubbed = scrubText('       a@bücher.deünal@bücher.dea@bücher.de')
      expect(scrubbed).not.toContain('bücher')
      expect(scrubbed).not.toContain('a@')
    })

    it('masks a URL encoded non-ASCII address', () => {
      expect(scrubText('?attendee=ünal%40例え.jp')).toBe('?attendee=[email]')
    })

    it('masks an address whose domain is percent-encoded UTF-8', () => {
      expect(scrubText('?attendee=%C3%BCnal%40b%C3%BCcher.de')).toBe(
        '?attendee=[email]'
      )
      expect(scrubText('?attendee=a%40%E4%BE%8B.%E6%97%A5%E6%9C%AC')).toBe(
        '?attendee=[email]'
      )
    })

    it('stops an encoded address at the encoded separator after it', () => {
      expect(scrubText('?to=a%40b%C3%BC.de%2Cnote')).toBe('?to=[email]%2Cnote')
    })

    it('masks an email address with a long local part', () => {
      expect(scrubText(`to ${'a.'.repeat(100)}b@gouv.fr`)).toBe('to [email]')
    })

    it('masks several URL encoded addresses in a single run', () => {
      expect(scrubText('attendees=x;a%40b.fr%2Cc%40d.fr')).toBe(
        'attendees=x;[email]'
      )
    })

    it('masks an address glued after another one', () => {
      expect(
        scrubText(
          'GET /api/x?body=Contact%20alice@example.org%0Abob@example.net'
        )
      ).toBe('GET /api/x?body=[email][email]')
      expect(scrubText('alice@example.org-bob@example.net')).not.toMatch(/bob/)
      expect(scrubText('alice@example.org2bob@example.net')).toBe(
        '[email][email]'
      )
      expect(
        scrubText('ri8f1x@jym8h82g.mah8zcr.z548s8@3.1x.kxk"')
      ).not.toContain('@')
    })

    it('masks the domain of an address glued by letters after another one', () => {
      expect(scrubText('alice@example.orgbob@example.net')).toBe('[email]')
      expect(scrubText('alice@example.orgbob%40example.net')).toBe('[email]')
      expect(scrubText('alice@example.org@example.net')).toBe('[email]')
      expect(
        scrubText('a alice@example.orgbob@example.netcarol@example.com b')
      ).toBe('a [email] b')
    })

    it('keeps the text glued after an address that has no domain', () => {
      expect(scrubText('alice@example.org@nowhere')).toBe('[email]@nowhere')
    })

    it('is idempotent on glued addresses', () => {
      for (const text of [
        'alice@example.org2bob@example.net',
        'alice@example.org2bob',
        'alice@example.orgbob@example.net',
        'x@@alice@example.org-suffix@nowhere',
        'GET /api/x?body=Contact%20alice@example.org%0Abob@example.net'
      ]) {
        const once = scrubText(text)
        expect(scrubText(once)).toBe(once)
      }
    })

    it('keeps the text glued after an address that is not an address', () => {
      expect(scrubText('alice@example.org2bob')).toBe('[email]2bob')
    })

    it('masks a run of glued addresses in linear time', () => {
      for (const unit of ['a@b.cc2', 'a@b.cc%0A', 'a@b.cc-x%40', 'a@b.cca']) {
        const text = unit.repeat(Math.floor(65536 / unit.length))
        const t0 = performance.now()
        expect(scrubText(text)).not.toContain('a@')
        expect(performance.now() - t0).toBeLessThan(200)
      }
    })

    it('scrubs a long run without an address in linear time', () => {
      for (const unit of [
        'a.',
        '-',
        'a',
        '%',
        '%40',
        'a%40',
        'x@a.',
        'a%40%C3%BC',
        'x%40a.%C3'
      ]) {
        const text = unit.repeat(Math.floor(65536 / unit.length))
        const t0 = performance.now()
        scrubText(text)
        expect(performance.now() - t0).toBeLessThan(200)
      }
    })

    it('scrubs a long URL without an address in linear time', () => {
      const t0 = performance.now()
      scrubDeep({ request: { url: 'a.'.repeat(32768) } })
      expect(performance.now() - t0).toBeLessThan(200)
    })

    it('does not mask words merely ending like a parameter name', () => {
      expect(scrubText('barcode=12')).toBe('barcode=12')
      expect(scrubText('?u=a%3Fbarcode%3D12')).toBe('?u=a%3Fbarcode%3D12')
    })

    it('does not mask hyphenated names ending like a parameter name', () => {
      expect(scrubText('?status-code=200')).toBe('?status-code=200')
      expect(scrubText('?u=a%3Fstatus-code%3D200')).toBe(
        '?u=a%3Fstatus-code%3D200'
      )
    })

    it('masks a parameter at the start of the text', () => {
      expect(scrubText('jwt=eyJ.a.b')).toBe('jwt=[Filtered]')
      expect(scrubText('jwt%3DeyJ')).toBe('jwt%3D[Filtered]')
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

    it('masks a parameter whose name is percent-encoded', () => {
      const secret = 'oK7iXAAAAAAAAAAAAAAAps0lylkdlvivvr'
      for (const text of [
        `?return=https%3A%2F%2Fcal.example%2Fcb%3F%6Awt%3D${secret}`,
        `?return=https%3A%2F%2Fcal.example%2Fcb%3F%4A%57%54%3D${secret}`,
        `?access%5Ftoken=${secret}`,
        `?%63ode=${secret}`
      ]) {
        expect(scrubText(text)).not.toContain(secret)
      }
      expect(scrubText('?bar%63ode=12')).toBe('?bar%63ode=12')
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

    it('is idempotent when a lone % follows an encoded value', () => {
      const text =
        '&redirect_uri=https%3A%2F%2Fcal.example%2Fcb%3Fcode%3Dabc123%zz-alice@example.org'
      const once = scrubText(text)
      expect(once).not.toContain('abc123')
      expect(once).not.toContain('alice')
      expect(scrubText(once)).toBe(once)
      expect(scrubDeep(scrubDeep({ message: text }))).toEqual(
        scrubDeep({ message: text })
      )
    })

    it('keeps the encoded separators ending an encoded value after a lone %', () => {
      expect(scrubText('%3Fcode%3Dab%zz%26iss%3Dsso%23top')).toBe(
        '%3Fcode%3D[Filtered]%26iss%3Dsso%23top'
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
