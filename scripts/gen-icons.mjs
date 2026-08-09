// Generates square app icons (build/icon.png + build/icon.ico) from assets/logo.png.
// Run: node scripts/gen-icons.mjs
import Jimp from 'jimp'
import pngToIco from 'png-to-ico'
import { mkdirSync, writeFileSync } from 'node:fs'

const SRC = 'assets/logo.png'
mkdirSync('build', { recursive: true })

// 512px square PNG (electron-builder app icon source).
const big = await Jimp.read(SRC)
big.cover(512, 512)
const png512 = await big.getBufferAsync(Jimp.MIME_PNG)
writeFileSync('build/icon.png', png512)

// Multi-resolution .ico for the installer + exe.
const sizes = [256, 128, 64, 48, 32, 16]
const pngs = []
for (const size of sizes) {
  const img = await Jimp.read(SRC)
  img.cover(size, size)
  pngs.push(await img.getBufferAsync(Jimp.MIME_PNG))
}
writeFileSync('build/icon.ico', await pngToIco(pngs))

console.log('Wrote build/icon.png (512) and build/icon.ico', sizes.join('/'))
