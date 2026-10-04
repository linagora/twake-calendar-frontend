import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react'

interface InvalidTimeInputContextValue {
  hasInvalidTimeInput: boolean
  reportInvalidTimeInput: (fieldId: string, invalid: boolean) => void
}

const InvalidTimeInputContext = createContext<InvalidTimeInputContextValue>({
  hasInvalidTimeInput: false,
  reportInvalidTimeInput: () => undefined
})

/**
 * Tracks time fields whose typed text cannot be parsed (e.g. "25:99"). Such
 * text never reaches the form state, which keeps the last valid time: the form
 * must be held invalid while it is displayed, lest the hidden value be saved.
 */
export const InvalidTimeInputProvider: React.FC<{
  onChange?: (hasInvalidTimeInput: boolean) => void
  children: React.ReactNode
}> = ({ onChange, children }) => {
  const [invalidFieldIds, setInvalidFieldIds] = useState<ReadonlySet<string>>(
    new Set()
  )

  const reportInvalidTimeInput = useCallback(
    (fieldId: string, invalid: boolean) => {
      setInvalidFieldIds(current => {
        if (current.has(fieldId) === invalid) return current
        const next = new Set(current)
        if (invalid) {
          next.add(fieldId)
        } else {
          next.delete(fieldId)
        }
        return next
      })
    },
    []
  )

  const hasInvalidTimeInput = invalidFieldIds.size > 0

  useEffect(() => {
    onChange?.(hasInvalidTimeInput)
  }, [hasInvalidTimeInput, onChange])

  const value = useMemo(
    () => ({ hasInvalidTimeInput, reportInvalidTimeInput }),
    [hasInvalidTimeInput, reportInvalidTimeInput]
  )

  return (
    <InvalidTimeInputContext.Provider value={value}>
      {children}
    </InvalidTimeInputContext.Provider>
  )
}

export const useInvalidTimeInput = (): InvalidTimeInputContextValue =>
  useContext(InvalidTimeInputContext)
