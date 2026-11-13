export interface TdriveFile {
  id: string
  name: string
  url: string
  type: 'sharingLink' | 'downloadLink'
  mimeType: string | null
}

/** A file the user stored in their own Drive, e.g. by the UPLOAD intent */
export interface SavedDriveFile {
  id: string
  name: string
  // The folder it got stored in: the Calendar folder of the Drive
  dirId: string
}

/** A file the MOVE intent moved, with its new absolute path */
export interface MovedDriveFile {
  id: string
  name: string
  path: string
}
