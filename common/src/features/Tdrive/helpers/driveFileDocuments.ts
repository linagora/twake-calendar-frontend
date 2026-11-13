import { MovedDriveFile, SavedDriveFile } from '../types'

const str = (v: unknown): string | undefined =>
  typeof v === 'string' && v.length > 0 ? v : undefined

/**
 * Reads the io.cozy.files document the UPLOAD intent answers with, or null
 * when it lacks what the MOVE intent needs.
 */
export function toSavedDriveFile(document: unknown): SavedDriveFile | null {
  if (!document || typeof document !== 'object') return null
  const doc = document as Record<string, unknown>
  const id = str(doc._id) ?? str(doc.id)
  const dirId = str(doc.dir_id)
  const name = str(doc.name)
  if (!id || !dirId || !name) return null
  return { id, name, dirId }
}

// The MOVE intent answers with the updated documents of the moved files: a
// move across drives may give a file a new id
export function toMovedFiles(result: unknown): MovedDriveFile[] {
  if (!Array.isArray(result)) return []
  return result.flatMap(doc => {
    if (!doc || typeof doc !== 'object') return []
    const { _id, name, path } = doc as Record<string, unknown>
    const id = str(_id)
    const fileName = str(name)
    const filePath = str(path)
    return id && fileName && filePath
      ? [{ id, name: fileName, path: filePath }]
      : []
  })
}
