/**
 * Extract Product Photos Dermatology.rar (pure-JS unrar, no system binary)
 * into C:\Users\63950\hdimg\dermatology so apply-hd-images.mjs can use it.
 */
import { createExtractorFromData } from 'node-unrar-js'
import fs from 'fs'
import path from 'path'

const RAR = 'C:/Users/63950/Downloads/Product Photos Dermatology.rar'
const OUT = 'C:/Users/63950/hdimg/dermatology'

async function main() {
  if (!fs.existsSync(RAR)) { console.error('RAR not found:', RAR); process.exit(1) }
  fs.mkdirSync(OUT, { recursive: true })

  const buf = fs.readFileSync(RAR)
  const data = new Uint8Array(buf).buffer
  const extractor = await createExtractorFromData({ data })

  const list = extractor.getFileList()
  const headers = [...list.fileHeaders].filter(h => !h.flags.directory)
  const imgs = headers.filter(h => /\.(jpg|jpeg|png|webp|avif)$/i.test(h.name))
  console.log(`Archive entries: ${headers.length} | image files: ${imgs.length}`)

  const extracted = extractor.extract({ files: imgs.map(h => h.name) })
  let n = 0
  for (const file of extracted.files) {
    if (!file.extraction) continue
    // flatten any internal folders to a single directory
    const base = path.basename(file.fileHeader.name)
    fs.writeFileSync(path.join(OUT, base), Buffer.from(file.extraction))
    n++
  }
  console.log(`Extracted ${n} images to ${OUT}`)
  // show a sample of names
  fs.readdirSync(OUT).slice(0, 15).forEach(f => console.log('  ', f))
}

main().catch(e => { console.error(e); process.exit(1) })
