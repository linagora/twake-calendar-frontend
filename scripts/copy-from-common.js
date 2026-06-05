import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const args = process.argv.slice(2)
if (args.length === 0) {
  console.error(
    'Usage: npm run copy-from-common <path-relative-to-common/src> [private|public]'
  )
  process.exit(1)
}

const inputPath = args[0]
const targetApp = args[1] || 'private'

if (targetApp !== 'private' && targetApp !== 'public') {
  console.error(
    'Error: Target app must be either "private" or "public" (default is "private")'
  )
  process.exit(1)
}

const rootDir = path.resolve(__dirname, '..')
const sourcePath = path.join(rootDir, 'common/src', inputPath)
const targetPath = path.join(rootDir, 'apps', targetApp, 'src', inputPath)

if (!fs.existsSync(sourcePath)) {
  console.error(`Error: Source file does not exist at ${sourcePath}`)
  process.exit(1)
}

const targetDir = path.dirname(targetPath)
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true })
}

fs.copyFileSync(sourcePath, targetPath)
console.log(
  `Successfully copied:\n  From: ${sourcePath}\n  To:   ${targetPath}`
)
