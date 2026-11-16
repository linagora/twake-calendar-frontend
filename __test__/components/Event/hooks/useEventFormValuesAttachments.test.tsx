import { useEventFormValues } from '@common/components/Event/hooks/useEventFormValues'
import { Attachment } from '@common/types/Attachment'
import { act, renderHook } from '@testing-library/react'

describe('useEventFormValues addAttachments', () => {
  it('keeps both lists added before the form renders again', () => {
    const existing = new Attachment('https://drive.example.com/a', '', 'a.pdf')
    const uploaded = new Attachment('https://drive.example.com/b', '', 'b.pdf')
    const picked = new Attachment('https://drive.example.com/c', '', 'c.pdf')
    const { result } = renderHook(() =>
      useEventFormValues({
        initialValues: { attachments: [existing] },
        isOpen: true,
        tempStorageKey: 'create'
      })
    )

    // An upload and the Drive picker finish in the same tick
    act(() => {
      result.current.addAttachments([uploaded])
      result.current.addAttachments([picked])
    })

    expect(result.current.formValues.attachments).toEqual([
      existing,
      uploaded,
      picked
    ])
  })
})
