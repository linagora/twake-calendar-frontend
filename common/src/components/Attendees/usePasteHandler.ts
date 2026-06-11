import { useCallback } from 'react'
import type { SyntheticEvent } from 'react'
import { isValidEmail } from '@common/utils/isValidEmail'
import type { User } from './types'

export function usePasteHandler({
  freeSolo,
  selectedUsers,
  onChange,
  setQuery,
  setInputError,
  t,
  enableEmailAutocompleteAndCommit
}: {
  freeSolo?: boolean
  selectedUsers: User[]
  onChange: (event: SyntheticEvent, users: User[]) => void
  setQuery: (value: string) => void
  setInputError: (error: string | null) => void
  t: (key: string) => string
  enableEmailAutocompleteAndCommit?: boolean
}): (event: React.ClipboardEvent<HTMLInputElement>) => void {
  return useCallback(
    (event: React.ClipboardEvent<HTMLInputElement>) => {
      if (!freeSolo) return

      const pasted = event.clipboardData.getData('text/plain')
      if (!pasted) return

      // Split by comma, semicolon, newline, or whitespace
      const chunks = pasted
        .split(/[,;\n\r\s]+/)
        .map(s => s.trim())
        .filter(Boolean)

      if (chunks.length === 0) return

      // Single chunk without enableEmailAutocompleteAndCommit: let the input handle it normally
      if (chunks.length === 1 && !enableEmailAutocompleteAndCommit) return

      event.preventDefault()

      const existingEmails = new Set(selectedUsers.map(u => u.email))
      const validUsers: User[] = []
      const invalid: string[] = []

      for (const chunk of chunks) {
        if (!isValidEmail(chunk)) {
          invalid.push(chunk)
        } else if (!existingEmails.has(chunk)) {
          existingEmails.add(chunk)
          validUsers.push({ email: chunk, displayName: chunk })
        }
        // silently skip duplicates
      }

      if (validUsers.length > 0) {
        onChange(event, [...selectedUsers, ...validUsers])
      }

      if (invalid.length > 0) {
        // Leave the invalid text in the input for manual correction
        setQuery(invalid.join(', '))
        setInputError(
          t('peopleSearch.invalidEmail').replace('%{email}', invalid.join(', '))
        )
      } else {
        setQuery('')
        setInputError(null)
      }
    },
    [
      freeSolo,
      selectedUsers,
      onChange,
      setQuery,
      setInputError,
      t,
      enableEmailAutocompleteAndCommit
    ]
  )
}
