import { useState, useEffect, useRef } from 'react'
import { searchUsers } from '@/features/User/userAPI'

export interface UseUserSearchProps {
  objectTypes: string[]
  errorMessage: string
}

export function useUserSearch<T>({
  objectTypes,
  errorMessage
}: UseUserSearchProps): {
  query: string
  setQuery: (query: string) => void
  loading: boolean
  options: T[]
  hasSearched: boolean
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  inputError: string | null
  setInputError: (error: string | null) => void
  snackbarOpen: boolean
  setSnackbarOpen: (open: boolean) => void
  snackbarMessage: string
  setSnackbarMessage: (message: string) => void
  queryTime: number
} {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [options, setOptions] = useState<T[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const [inputError, setInputError] = useState<string | null>(null)
  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState('')

  const [queryTime, setQueryTime] = useState(0)

  const objectTypesRef = useRef(objectTypes)

  useEffect(() => {
    objectTypesRef.current = objectTypes
  }, [objectTypes])

  useEffect(() => {
    let cancelled = false

    const handleQueryChange = async (): Promise<void> => {
      if (!query.trim()) {
        if (!cancelled) {
          setOptions([])
          setLoading(false)
          setHasSearched(false)
        }
        return
      }

      if (cancelled) return

      setLoading(true)
      setHasSearched(false)

      try {
        const res = await searchUsers(query, objectTypesRef.current)
        setOptions(res as unknown as T[])
        setHasSearched(true)
      } catch {
        setHasSearched(false)
        setSnackbarMessage(errorMessage)
        setSnackbarOpen(true)
      } finally {
        if (!cancelled) {
          setLoading(false)
          setQueryTime(Date.now())
        }
      }
    }

    const delayDebounceFn = setTimeout(() => {
      void handleQueryChange()
    }, 300)

    return (): void => {
      cancelled = true
      clearTimeout(delayDebounceFn)
    }
  }, [objectTypesRef, query, errorMessage])

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
    setSnackbarMessage,
    queryTime
  }
}
