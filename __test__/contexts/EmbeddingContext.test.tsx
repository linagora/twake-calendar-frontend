/**
 * @jest-environment jsdom
 */

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'

const mockIsInIframe = jest.fn()
const mockRequestParentOrigin = jest.fn()
const mockSetupBridge = jest.fn()
const mockFetchJSON = jest.fn()

jest.mock('cozy-external-bridge', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    isInIframe: mockIsInIframe,
    requestParentOrigin: mockRequestParentOrigin,
    setupBridge: mockSetupBridge,
    fetchJSON: mockFetchJSON
  }))
}))

import CozyBridge from 'cozy-external-bridge'
import {
  EmbeddingProvider,
  useEmbedding,
  useIsInIframe
} from '@common/contexts/EmbeddingContext'

const MockedCozyBridge = CozyBridge as unknown as jest.Mock

describe('EmbeddingContext', () => {
  beforeEach(() => {
    mockIsInIframe.mockReset()
    mockRequestParentOrigin.mockReset()
    mockSetupBridge.mockReset()
    mockFetchJSON.mockReset()
    MockedCozyBridge.mockClear()
    mockRequestParentOrigin.mockResolvedValue('https://container.example.com')
    mockSetupBridge.mockReturnValue(true)
  })

  it('should expose the embedding state detected by the bridge', async () => {
    mockIsInIframe.mockReturnValue(true)
    const { result } = renderHook(() => useIsInIframe(), {
      wrapper: ({ children }) => (
        <EmbeddingProvider>{children}</EmbeddingProvider>
      )
    })
    await waitFor(() => expect(mockSetupBridge).toHaveBeenCalled())
    expect(result.current).toBe(true)
  })

  it('should detect only once for every consumer under the provider', () => {
    mockIsInIframe.mockReturnValue(false)
    const { result } = renderHook(
      () => [useIsInIframe(), useIsInIframe(), useIsInIframe()],
      {
        wrapper: ({ children }) => (
          <EmbeddingProvider>{children}</EmbeddingProvider>
        )
      }
    )
    expect(result.current).toEqual([false, false, false])
    expect(MockedCozyBridge).toHaveBeenCalledTimes(1)
  })

  it('should fall back to detecting on the spot outside the provider', () => {
    mockIsInIframe.mockReturnValue(true)
    const { result } = renderHook(() => useIsInIframe())
    expect(result.current).toBe(true)
  })

  it('should not setup the bridge when not embedded', () => {
    mockIsInIframe.mockReturnValue(false)
    renderHook(() => useEmbedding(), {
      wrapper: ({ children }) => (
        <EmbeddingProvider>{children}</EmbeddingProvider>
      )
    })
    expect(mockRequestParentOrigin).not.toHaveBeenCalled()
    expect(mockSetupBridge).not.toHaveBeenCalled()
  })

  it('should setup the bridge with the parent origin when embedded', async () => {
    mockIsInIframe.mockReturnValue(true)
    renderHook(() => useEmbedding(), {
      wrapper: ({ children }) => (
        <EmbeddingProvider>{children}</EmbeddingProvider>
      )
    })
    await waitFor(() => expect(mockSetupBridge).toHaveBeenCalledTimes(1))
    expect(mockRequestParentOrigin).toHaveBeenCalledTimes(1)
    expect(mockSetupBridge).toHaveBeenCalledWith(
      'https://container.example.com'
    )
  })

  it('should expose fetchJSON once the bridge is set up', async () => {
    mockIsInIframe.mockReturnValue(true)
    const { result } = renderHook(() => useEmbedding(), {
      wrapper: ({ children }) => (
        <EmbeddingProvider>{children}</EmbeddingProvider>
      )
    })
    await waitFor(() => expect(result.current.fetchJSON).not.toBeNull())
    expect(result.current.fetchJSON).toBe(mockFetchJSON)
  })

  it('should not expose fetchJSON before the bridge is set up', () => {
    mockIsInIframe.mockReturnValue(true)
    mockRequestParentOrigin.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useEmbedding(), {
      wrapper: ({ children }) => (
        <EmbeddingProvider>{children}</EmbeddingProvider>
      )
    })
    expect(result.current.fetchJSON).toBeNull()
  })

  it('should not expose fetchJSON when not embedded', () => {
    mockIsInIframe.mockReturnValue(false)
    const { result } = renderHook(() => useEmbedding(), {
      wrapper: ({ children }) => (
        <EmbeddingProvider>{children}</EmbeddingProvider>
      )
    })
    expect(result.current.fetchJSON).toBeNull()
  })
})
