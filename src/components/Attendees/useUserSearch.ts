import { useState, useEffect } from 'react'
import { searchUsers } from '@/features/User/userAPI'

export interface UseUserSearchProps {
  objectTypes: string[]
  errorMessage: string
}

export function useUserSearch<T>({
  objectTypes,
  errorMessage
}: UseUserSearchProps) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [options, setOptions] = useState<T[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const [inputError, setInputError] = useState<string | null>(null)
  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState('')

  useEffect(() => {
    let cancelled = false

    const delayDebounceFn = setTimeout(async () => {
      if (!query.trim()) {
        if (!cancelled) {
          setOptions([])
          setLoading(false)
          setHasSearched(false)
        }
        return
      }

      if (!cancelled) {
        setLoading(true)
        setHasSearched(false)
      }

      try {
        const res = await searchUsers(query, objectTypes)
        if (!cancelled) {
          setOptions(res as unknown as T[])
          setHasSearched(true)
        }
      } catch {
        if (!cancelled) {
          setHasSearched(false)
          setSnackbarMessage(errorMessage)
          setSnackbarOpen(true)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(delayDebounceFn)
    }
  }, [objectTypes, query, errorMessage])

  return {
    query,
    setQuery,
    loading,
    options,
    hasSearched,
    isOpen,
    setIsOpen,
    inputError,
    setInputError,
    snackbarOpen,
    setSnackbarOpen,
    snackbarMessage,
    setSnackbarMessage
  }
}
