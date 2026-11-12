import { useCallback, useRef, useState } from 'react'
import type { useSubmitCreateEvent } from './useSubmitCreateEvent'

type Submit = ReturnType<typeof useSubmitCreateEvent>['handleSubmit']

/**
 * Lets a form submit once. Framed, the form stays on screen while the server
 * saves, and after, until Chat closes the frame (elsewhere it closes at
 * once): a second Save or Enter would create the event twice. Only a failed
 * save unlocks it. The ref drops a submit that comes before the re-render,
 * `saving` greys Save out. `onSavingChange` tells the page around the same
 * fact: true when the save is sent, then whether it saved (a saved one stays
 * saving). Used by EventModal, embedded.
 */
export function useSubmitOnce(
  submit: Submit,
  onSavingChange?: (isSaving: boolean) => void
): {
  submitOnce: Submit
  saving: boolean
} {
  const savingRef = useRef(false)
  const [saving, setSaving] = useState(false)
  const submitOnce: Submit = useCallback(
    async (values, organizer) => {
      if (savingRef.current) return false
      savingRef.current = true
      setSaving(true)
      onSavingChange?.(true)
      let saved = false
      try {
        saved = await submit(values, organizer)
      } finally {
        savingRef.current = saved
        setSaving(saved)
        onSavingChange?.(saved)
      }
      return saved
    },
    [submit, onSavingChange]
  )
  return { submitOnce, saving }
}
