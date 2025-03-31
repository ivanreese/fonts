import { execSync } from "node:child_process"
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { basename } from "node:path"

// These are the big source fonts that'll be subset and then optimized
let fonts = ["some/font.ttf", "and/another.oft"]

// Saner default for execSync
let exec = (cmd:string)=> execSync(cmd, { stdio: "inherit" })

// The `text` should be the text content of every page, css file, JS file, JSON, etc… on your whole website.
// Computers are fast — it should only take a few ms to load them all and concat them into one big string.
export const generateFontSubsets = (text: string) => {
  // Generated fonts and metadata are placed in this folder
  const outPath = "out/"

  // This file will hold each unique character that appears on your site.
  // It's cool to look at — but we use it for memoization.
  const charFile = `${outPath}/chars.txt`

  // Load the existing chars from the most recent run (if any)
  let lastChars = readFileSync(charFile).toString()

  // Get every unique char across the site, sorted, as a string
  const everyChar = Array.from(text)
  const uniqueChars = Array.from(new Set(everyChar))
  const newChars = uniqueChars.sort().join("").toWellFormed()

  // If the set of chars has changed, we need to regenerate the font subsets
  if (newChars !== lastChars) {
    lastChars = newChars

    try {
      exec("which -s hb-subset woff2_compress")
    } catch {
      console.log("Binary deps missing — skipping font regeneration")
      return false
    }

    rmSync(outPath, { recursive: true })
    mkdirSync(outPath, { recursive: true })
    writeFileSync(charFile, newChars, { flag: "wx" })

    for (const file of fonts) {
      const dest = `${outPath}/${basename(file)}`

      // Subset the font — requires harfbuzz
      exec(`hb-subset "${file}" --text-file="${charFile}" --layout-features=kern -o "${dest}"`)

      // Make an optimized copy — requires woff2
      exec(`woff2_compress ${dest}`)
      
      // Remove the non-optimized copy
      rmSync(dest)
    }
  }
}
