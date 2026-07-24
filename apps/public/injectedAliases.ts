/**
 * Overridden injected aliases for the public application.
 *
 * To override an `@injected/*` path with a custom implementation inside the public app:
 * 1. Create your custom implementation under `src/` (e.g. `src/components/MyCustomComponent.tsx`).
 * 2. Add the path relative to `src/` into the array below (e.g. `'components/MyCustomComponent'`).
 */
export const injectedAliases: string[] = [
  'components/Attendees/AttendeeActions'
]
