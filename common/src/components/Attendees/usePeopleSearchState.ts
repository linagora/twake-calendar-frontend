import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type SyntheticEvent
} from 'react'
import { useI18n } from 'twake-i18n'
import { useAppSelector } from '@common/app/hooks'
import { isValidEmail } from '@common/utils/isValidEmail'
import { useUserSearch } from './useUserSearch'
import { usePasteHandler } from './usePasteHandler'
import { User } from './types'
import { SearchState } from '@common/components/Calendar/utils/tempSearchUtil'

interface UsePeopleSearchStateProps {
  objectTypes: string[]
  showCurrentUser?: boolean
  hideOptions?: boolean
  onSearchStateChange?: (state: SearchState) => void
  inputValue?: string
  selectedUsers: User[]
  onChange: (event: SyntheticEvent, users: User[]) => void
  freeSolo?: boolean
  enableEmailAutocompleteAndCommit?: boolean
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
  handleKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void
  handleInputChange: (
    event: SyntheticEvent,
    value: string,
    reason: string
  ) => void
  handleSnackbarOpenChange: (open: boolean) => void
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

const useHandleBlurCommit = (
  query: string,
  selectedUsers: User[],
  onChange: (event: SyntheticEvent, users: User[]) => void,
  t: (key: string) => string,
  setInputError: (val: string | null) => void,
  setQuery: (val: string) => void
): ((event: SyntheticEvent) => void) => {
  return useCallback(
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
}

const useHandleAutocompleteChange = (
  onChange: (event: SyntheticEvent, users: User[]) => void,
  setInputError: (val: string | null) => void,
  t: (key: string) => string
): ((event: SyntheticEvent, value: (string | User)[]) => void) => {
  return useCallback(
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
}

const useHandleKeyDown = (
  query: string,
  selectedUsers: User[],
  onChange: (event: SyntheticEvent, users: User[]) => void,
  t: (key: string) => string,
  setInputError: (val: string | null) => void,
  setQuery: (val: string) => void,
  enableEmailAutocompleteAndCommit?: boolean
): ((event: React.KeyboardEvent<HTMLInputElement>) => void) => {
  return useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (enableEmailAutocompleteAndCommit && event.key === ' ') {
        const trimmed = query.trim()
        if (!trimmed) {
          return
        }
        event.preventDefault()
        const result = validateAndAddUser(trimmed, selectedUsers, t)
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
      }
    },
    [
      query,
      selectedUsers,
      onChange,
      t,
      setInputError,
      setQuery,
      enableEmailAutocompleteAndCommit
    ]
  )
}

const useHandleInputChange = (
  setQuery: (val: string) => void,
  setInputError: (val: string | null) => void,
  enableEmailAutocompleteAndCommit?: boolean
): ((_event: SyntheticEvent, value: string, reason: string) => void) => {
  return useCallback(
    (_event: SyntheticEvent, value: string, reason: string) => {
      setQuery(value)
      if (!enableEmailAutocompleteAndCommit) return

      if (['input', 'clear'].includes(reason) || !value.trim()) {
        setInputError(null)
      }
    },
    [setQuery, setInputError, enableEmailAutocompleteAndCommit]
  )
}

const useHandleSnackbarOpenChange = (
  setSnackbarOpen: (val: boolean) => void,
  setSnackbarMessage: (val: string) => void
): ((open: boolean) => void) => {
  return useCallback(
    (open: boolean): void => {
      setSnackbarOpen(open)
      if (!open) {
        setSnackbarMessage('')
      }
    },
    [setSnackbarOpen, setSnackbarMessage]
  )
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

interface UsePeopleSearchHandlersProps {
  query: string
  setQuery: (val: string) => void
  setInputError: (val: string | null) => void
  setSnackbarOpen: (val: boolean) => void
  setSnackbarMessage: (val: string) => void
  selectedUsers: User[]
  onChange: (event: SyntheticEvent, users: User[]) => void
  t: (key: string) => string
  freeSolo?: boolean
  enableEmailAutocompleteAndCommit?: boolean
}

interface UsePeopleSearchHandlersReturn {
  handlePaste: (event: React.ClipboardEvent<HTMLInputElement>) => void
  handleBlurCommit: (event: SyntheticEvent) => void
  handleAutocompleteChange: (
    event: SyntheticEvent,
    value: (string | User)[]
  ) => void
  handleKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void
  handleInputChange: (
    event: SyntheticEvent,
    value: string,
    reason: string
  ) => void
  handleSnackbarOpenChange: (open: boolean) => void
}

const usePeopleSearchHandlers = ({
  query,
  setQuery,
  setInputError,
  setSnackbarOpen,
  setSnackbarMessage,
  selectedUsers,
  onChange,
  t,
  freeSolo,
  enableEmailAutocompleteAndCommit
}: UsePeopleSearchHandlersProps): UsePeopleSearchHandlersReturn => {
  const handleBlurCommit = useHandleBlurCommit(
    query,
    selectedUsers,
    onChange,
    t,
    setInputError,
    setQuery
  )

  const handleAutocompleteChange = useHandleAutocompleteChange(
    onChange,
    setInputError,
    t
  )

  const handleKeyDown = useHandleKeyDown(
    query,
    selectedUsers,
    onChange,
    t,
    setInputError,
    setQuery,
    enableEmailAutocompleteAndCommit
  )

  const handleInputChange = useHandleInputChange(
    setQuery,
    setInputError,
    enableEmailAutocompleteAndCommit
  )

  const handleSnackbarOpenChange = useHandleSnackbarOpenChange(
    setSnackbarOpen,
    setSnackbarMessage
  )

  const handlePaste = usePasteHandler({
    freeSolo,
    selectedUsers,
    onChange,
    setQuery,
    setInputError,
    t,
    enableEmailAutocompleteAndCommit
  })

  return {
    handlePaste,
    handleBlurCommit,
    handleAutocompleteChange,
    handleKeyDown,
    handleInputChange,
    handleSnackbarOpenChange
  }
}

export const usePeopleSearchState = ({
  objectTypes,
  showCurrentUser,
  hideOptions,
  onSearchStateChange,
  inputValue,
  selectedUsers,
  onChange,
  freeSolo,
  enableEmailAutocompleteAndCommit
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

  const handlers = usePeopleSearchHandlers({
    query: userSearch.query,
    setQuery: userSearch.setQuery,
    setInputError: userSearch.setInputError,
    setSnackbarOpen: userSearch.setSnackbarOpen,
    setSnackbarMessage: userSearch.setSnackbarMessage,
    selectedUsers,
    onChange,
    t,
    freeSolo,
    enableEmailAutocompleteAndCommit
  })

  const displayOptions = useMemo(() => {
    if (!enableEmailAutocompleteAndCommit) {
      return userSearch.options
    }
    if (userSearch.options.length === 0 && userSearch.query) {
      const email = userSearch.query.trim()
      const isNewEmail = !selectedUsers.some(u => u.email === email)
      if (isValidEmail(email) && isNewEmail) {
        return [{ email, displayName: email } as User]
      }
    }
    return userSearch.options
  }, [
    userSearch.options,
    userSearch.query,
    selectedUsers,
    enableEmailAutocompleteAndCommit
  ])

  return {
    ...userSearch,
    ...handlers,
    options: displayOptions
  }
}
