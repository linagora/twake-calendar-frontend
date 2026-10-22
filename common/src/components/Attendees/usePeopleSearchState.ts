import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type SyntheticEvent
} from 'react'
import { useI18n } from 'twake-i18n'
import { useAppSelector } from '@common/app/hooks'
import { EmailAddress } from '@common/types/EmailAddress'
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
  showWarningOnDuplicate?: boolean
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
  hasSearched,
  inputValue,
  setQuery,
  onSearchStateChangeRef
}: {
  hideOptions?: boolean
  queryTime: number
  query: string
  options: User[]
  loading: boolean
  hasSearched: boolean
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
      onSearchStateChangeRef.current?.({
        query,
        options,
        loading,
        hasSearched
      })
    }
  }, [
    queryTime,
    query,
    options,
    loading,
    hasSearched,
    hideOptions,
    onSearchStateChangeRef
  ])

  // Clearing the field runs no search (queryTime does not move): report the
  // empty query so callers drop the results of the previous one.
  const hadQueryRef = useRef(false)

  useEffect(() => {
    const hasQuery = !!query.trim()
    if (hideOptions && hadQueryRef.current && !hasQuery) {
      onSearchStateChangeRef.current?.({
        query,
        options: [],
        loading: false,
        hasSearched: false
      })
    }
    hadQueryRef.current = hasQuery
  }, [query, hideOptions, onSearchStateChangeRef])

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
      const trimmed = query.trim()
      if (!trimmed) return
      const result = validateAndAddUser(trimmed, selectedUsers, t)
      if (result.error !== null && !trimmed.includes('@')) {
        setQuery('')
        setInputError(null)
        return
      }
      applyValidationResult(result, event, onChange, setInputError, setQuery)
    },
    [query, selectedUsers, onChange, t, setInputError, setQuery]
  )
}

const useHandleAutocompleteChange = (
  onChange: (event: SyntheticEvent, users: User[]) => void,
  setInputError: (val: string | null) => void,
  setQuery: (val: string) => void,
  t: (key: string) => string
): ((event: SyntheticEvent, value: (string | User)[]) => void) => {
  return useCallback(
    (event: SyntheticEvent, value: (string | User)[]) => {
      const error = getAutocompleteError(value, t)
      if (error) {
        setInputError(error)
        return
      }
      setInputError(null)
      onChange(event, dedupeByEmail(value.map(normaliseUser)))
      setQuery('')
    },
    [onChange, setInputError, setQuery, t]
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
        // Not an email yet: the space belongs to the search (e.g. a full name)
        if (!trimmed || !EmailAddress.parse(trimmed)) {
          return
        }
        event.preventDefault()
        const result = validateAndAddUser(trimmed, selectedUsers, t)
        applyValidationResult(result, event, onChange, setInputError, setQuery)
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
  setInputError: (val: string | null) => void
): ((_event: SyntheticEvent, value: string, reason: string) => void) => {
  return useCallback(
    (_event: SyntheticEvent, value: string, reason: string) => {
      setQuery(value)
      if (['input', 'clear'].includes(reason) || !value.trim()) {
        setInputError(null)
      }
    },
    [setQuery, setInputError]
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
  users.filter(
    (u, i, arr) =>
      arr.findIndex(x => EmailAddress.sameAddress(x.email, u.email)) === i
  )

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
  const email = EmailAddress.parse(trimmed)
  if (!email) {
    return {
      error: t('peopleSearch.invalidEmail').replace('%{email}', trimmed),
      shouldClearQuery: false
    }
  }
  if (isAlreadyAdded(email.value, selectedUsers)) {
    return {
      error: t('peopleSearch.emailAlreadyAdded'),
      shouldClearQuery: true
    }
  }
  const newUser: User = { email: email.value, displayName: email.value }
  return {
    error: null,
    updatedUsers: [...selectedUsers, newUser],
    shouldClearQuery: true
  }
}

const applyValidationResult = (
  result: ValidateUserResult,
  event: SyntheticEvent,
  onChange: (event: SyntheticEvent, users: User[]) => void,
  setInputError: (val: string | null) => void,
  setQuery: (val: string) => void
): void => {
  setInputError(result.error)
  if (result.updatedUsers) {
    onChange(event, result.updatedUsers)
  }
  if (result.shouldClearQuery) {
    setQuery('')
  }
}

const isAlreadyAdded = (email: string, users: User[]): boolean =>
  users.some(u => EmailAddress.sameAddress(u.email, email))

const getAutocompleteError = (
  value: (string | User)[],
  t: (key: string) => string
): string | null => {
  const lastValue = value[value.length - 1]
  if (lastValue === undefined) return null
  if (typeof lastValue === 'string' && !EmailAddress.parse(lastValue)) {
    return t('peopleSearch.invalidEmail').replace('%{email}', lastValue)
  }
  const previousUsers = value.slice(0, -1).map(normaliseUser)
  if (isAlreadyAdded(normaliseUser(lastValue).email, previousUsers)) {
    return t('peopleSearch.emailAlreadyAdded')
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
    setQuery,
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

  const handleInputChange = useHandleInputChange(setQuery, setInputError)

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

interface UseDisplayOptionsProps {
  options: User[]
  query: string
  selectedUsers: User[]
  enableEmailAutocompleteAndCommit?: boolean
  showWarningOnDuplicate?: boolean
}

const useDisplayOptions = ({
  options,
  query,
  selectedUsers,
  enableEmailAutocompleteAndCommit,
  showWarningOnDuplicate
}: UseDisplayOptionsProps): User[] => {
  return useMemo(() => {
    let baseOptions = options

    const shouldAddEmailOption =
      baseOptions.length === 0 &&
      Boolean(query) &&
      enableEmailAutocompleteAndCommit

    if (shouldAddEmailOption) {
      const email = EmailAddress.parse(query.trim())
      if (email) {
        baseOptions = [{ email: email.value, displayName: email.value }]
      }
    }

    if (!showWarningOnDuplicate) {
      baseOptions = baseOptions.filter(
        opt =>
          !selectedUsers.some(u => EmailAddress.sameAddress(u.email, opt.email))
      )
    }

    return baseOptions
  }, [
    options,
    query,
    enableEmailAutocompleteAndCommit,
    showWarningOnDuplicate,
    selectedUsers
  ])
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
  enableEmailAutocompleteAndCommit,
  showWarningOnDuplicate = false
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
    hasSearched: userSearch.hasSearched,
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

  const displayOptions = useDisplayOptions({
    options: userSearch.options,
    query: userSearch.query,
    selectedUsers,
    enableEmailAutocompleteAndCommit,
    showWarningOnDuplicate
  })

  return {
    ...userSearch,
    ...handlers,
    options: displayOptions
  }
}
