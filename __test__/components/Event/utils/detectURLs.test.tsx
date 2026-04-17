import { detectUrls } from '@/components/Event/utils/detectUrls'
import React from 'react'

describe('detectUrls', () => {
  it('returns plain text when no URL present', () => {
    const result = detectUrls('Hello world')
    expect(result).toHaveLength(1)
    const hasLink = result.some((el: any) => Boolean(el?.props?.href))
    expect(hasLink).toBe(false)
  })

  it('wraps https URLs in a Link', () => {
    const result = detectUrls('Visit https://example.com today')
    const link = result.find(
      el => (el as any).type?.displayName === 'Link' || (el as any).props?.href
    )
    expect(link).toBeDefined()
    expect((link as any).props.href).toBe('https://example.com')
  })

  it('prefixes www URLs with https://', () => {
    const result = detectUrls('See www.example.com for more')
    const link = result.find((el: any) => el.props?.href)
    expect((link as any).props.href).toBe('https://www.example.com')
  })

  it('preserves text between two URLs', () => {
    const result = detectUrls('Go to https://a.com and https://b.com')
    const texts = result.filter((el: any) => el.type === React.Fragment)
    expect(texts.some((el: any) => el.props.children.includes(' and '))).toBe(
      true
    )
  })

  it('preserves ponctuation after URL', () => {
    const result = detectUrls('Go to https://a.com.')
    const link = result.find((el: any) => el.props?.href)

    const texts = result.filter((el: any) => el.type === React.Fragment)
    expect(texts.some((el: any) => el.props.children.includes('.'))).toBe(true)
    expect((link as any).props.href).toBe('https://a.com')
  })

  it('handles URLs wrapped in angle brackets', () => {
    const result = detectUrls('Meeting: <https://teams.microsoft.com/join/abc>')
    const link = result.find((el: any) => el.props?.href)
    expect((link as any).props.href).toContain('teams.microsoft.com')
  })

  it('handles URLs wrapped in parentheses', () => {
    const result = detectUrls('Meeting: (https://teams.microsoft.com/join/abc)')
    const link = result.find((el: any) => el.props?.href)
    expect((link as any).props.href).toContain('teams.microsoft.com')
  })

  it('handles URLs with uppercase HTTPS://', () => {
    const result = detectUrls('Meeting: (HTTPS://teams.microsoft.com/join/abc)')
    const link = result.find((el: any) => el.props?.href)
    expect((link as any).props.href).toContain('teams.microsoft.com')
  })

  it('does not include trailing punctuation in URL', () => {
    const result = detectUrls('Visit https://example.com.')
    const link = result.find((el: any) => el.props?.href)
    expect((link as any).props.href).toBe('https://example.com') // no trailing dot
  })

  it('handles URLs with parentheses (Wikipedia-style)', () => {
    const url = 'https://en.wikipedia.org/wiki/Rust_(programming_language)'
    const result = detectUrls(url)
    const link = result.find((el: any) => el.props?.href)
    expect((link as any).props.href).toBe(url)
  })
})
