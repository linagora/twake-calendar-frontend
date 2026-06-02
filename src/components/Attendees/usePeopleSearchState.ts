import { useCallback, useEffect, useRef, type SyntheticEvent } from 'react'
import { useI18n } from 'twake-i18n'
import { useAppSelector } from '@/app/hooks'
import { isValidEmail } from '../../utils/isValidEmail'
import { useUserSearch } from './useUserSearch'
import { usePasteHandler } from './usePasteHandler'
import { User } from './types'
import { SearchState } from '../Calendar/utils/tempSearchUtil'

interface UsePeopleSearchStateProps {
  objectTypes: string[]
  showCurrentUser?: boolean
  hideOptions?: boolean
  onSearchStateChange?: (state: SearchState) => void
  inputValue?: string
  selectedUsers: User[]
  onChange: (event: SyntheticEvent, users: User[]) => void
  freeSolo?: boolean
}

interface UsePeopleSearchStateReturn {
  query: string
  setQuery: (val: string) => void
  loading: boolean
  options: User[]
  hasSearched: boolean
  isOpen: boolean
  setIsOpen: (val: boolean) => void
  inputError: string | null
  setInputError: (val: string | null) => void
  snackbarOpen: boolean
  setSnackbarOpen: (val: boolean) => void
  snackbarMessage: string
  setSnackbarMessage: (val: string) => void
  queryTime: number
  handleBlurCommit: (event: SyntheticEvent) => void
  handlePaste: (event: React.ClipboardEvent<HTMLInputElement>) => void
  handleAutocompleteChange: (
    event: SyntheticEvent,
    value: (string | User)[]
  ) => void
}

interface UsePeopleSearchCallbacksProps {
  query: string
  selectedUsers: User[]
  onChange: (event: SyntheticEvent, users: User[]) => void
  t: (key: string) => string
  setInputError: (val: string | null) => void
  setQuery: (val: string) => void
}

interface UsePeopleSearchCallbacksReturn {
  handleBlurCommit: (event: SyntheticEvent) => void
  handleAutocompleteChange: (
    event: SyntheticEvent,
    value: (string | User)[]
  ) => void
}

const useSearchStateSync = ({
  hideOptions,
  queryTime,
  query,
  options,
  loading,
  inputValue,
  setQuery,
  onSearchStateChangeRef
}: {
  hideOptions?: boolean
  queryTime: number
  query: string
  options: User[]
  loading: boolean
  inputValue?: string
  setQuery: (val: string) => void
  onSearchStateChangeRef: React.MutableRefObject<
    ((state: SearchState) => void) | undefined
  >
}): void => {
  const lastQueryTimeRef = useRef(0)

  useEffect(() => {
    if (hideOptions && queryTime !== lastQueryTimeRef.current) {
      lastQueryTimeRef.current = queryTime
      onSearchStateChangeRef.current?.({ query, options, loading })
    }
  }, [queryTime, query, options, loading, hideOptions, onSearchStateChangeRef])

  useEffect(() => {
    if (inputValue !== undefined) {
      setQuery(inputValue)
    }
  }, [inputValue, setQuery])
}

const usePeopleSearchCallbacks = ({
  query,
  selectedUsers,
  onChange,
  t,
  setInputError,
  setQuery
}: UsePeopleSearchCallbacksProps): UsePeopleSearchCallbacksReturn => {
  const handleBlurCommit = useCallback(
    (event: SyntheticEvent) => {
      const result = validateAndAddUser(query.trim(), selectedUsers, t)
      if (result.error !== null) {
        setInputError(result.error)
        return
      }
      setInputError(null)
      if (result.updatedUsers) {
        onChange(event, result.updatedUsers)
      }
      if (result.shouldClearQuery) {
        setQuery('')
      }
    },
    [query, selectedUsers, onChange, t, setInputError, setQuery]
  )

  const handleAutocompleteChange = useCallback(
    (event: SyntheticEvent, value: (string | User)[]) => {
      const error = getAutocompleteError(value[value.length - 1], t)
      if (error) {
        setInputError(error)
        return
      }
      setInputError(null)
      onChange(event, dedupeByEmail(value.map(normaliseUser)))
    },
    [onChange, setInputError, t]
  )

  return {
    handleBlurCommit,
    handleAutocompleteChange
  }
}

export const normaliseUser = (v: string | User): User =>
  typeof v === 'string' ? { email: v.trim(), displayName: v.trim() } : v

export const dedupeByEmail = (users: User[]): User[] =>
  users.filter((u, i, arr) => arr.findIndex(x => x.email === u.email) === i)

interface ValidateUserResult {
  error: string | null
  updatedUsers?: User[]
  shouldClearQuery: boolean
}

const validateAndAddUser = (
  trimmed: string,
  selectedUsers: User[],
  t: (key: string) => string
): ValidateUserResult => {
  if (!trimmed) {
    return { error: null, shouldClearQuery: false }
  }
  if (!isValidEmail(trimmed)) {
    return {
      error: t('peopleSearch.invalidEmail').replace('%{email}', trimmed),
      shouldClearQuery: false
    }
  }
  if (selectedUsers.some(u => u.email === trimmed)) {
    return { error: null, shouldClearQuery: true }
  }
  const newUser: User = { email: trimmed, displayName: trimmed }
  return {
    error: null,
    updatedUsers: [...selectedUsers, newUser],
    shouldClearQuery: true
  }
}

const getAutocompleteError = (
  lastValue: string | User | undefined,
  t: (key: string) => string
): string | null => {
  if (typeof lastValue === 'string' && !isValidEmail(lastValue.trim())) {
    return t('peopleSearch.invalidEmail').replace('%{email}', lastValue)
  }
  return null
}

export const usePeopleSearchState = ({
  objectTypes,
  showCurrentUser,
  hideOptions,
  onSearchStateChange,
  inputValue,
  selectedUsers,
  onChange,
  freeSolo
}: UsePeopleSearchStateProps): UsePeopleSearchStateReturn => {
  const { t } = useI18n()
  const currentUser = useAppSelector(state => state.user?.userData)

  const userSearch = useUserSearch<User>({
    objectTypes,
    errorMessage: t('peopleSearch.searchError'),
    showCurrentUser,
    currentUser
  })

  const onSearchStateChangeRef = useRef(onSearchStateChange)

  useEffect(() => {
    onSearchStateChangeRef.current = onSearchStateChange
  }, [onSearchStateChange])

  useSearchStateSync({
    hideOptions,
    queryTime: userSearch.queryTime,
    query: userSearch.query,
    options: userSearch.options,
    loading: userSearch.loading,
    inputValue,
    setQuery: userSearch.setQuery,
    onSearchStateChangeRef
  })

  const { handleBlurCommit, handleAutocompleteChange } =
    usePeopleSearchCallbacks({
      query: userSearch.query,
      selectedUsers,
      onChange,
      t,
      setInputError: userSearch.setInputError,
      setQuery: userSearch.setQuery
    })

  const handlePaste = usePasteHandler({
    freeSolo,
    selectedUsers,
    onChange,
    setQuery: userSearch.setQuery,
    setInputError: userSearch.setInputError,
    t
  })

  return {
    ...userSearch,
    handleBlurCommit,
    handlePaste,
    handleAutocompleteChange
  }
}
