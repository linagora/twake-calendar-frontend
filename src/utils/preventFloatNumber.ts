export const preventFloatNumber = (
  event: React.KeyboardEvent<HTMLInputElement>
) => {
  if (/^[-+,.]$/.test(event?.key)) {
    event.preventDefault()
  }
}

export const toPositiveInt = (raw: string, fallback = 1): number => {
  const n = Math.trunc(Number(raw))
  return n > 0 ? n : fallback
}
