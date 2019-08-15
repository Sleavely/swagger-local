'use strict'

const fs = require('fs')
const path = require('path')
const { promisify } = require('util')
const lstatAsync = promisify(fs.lstat)
const readDirAsync = promisify(fs.readdir)
const readFileAsync = promisify(fs.readFile)
const writeFileAsync = promisify(fs.writeFile)
const unlinkAsync = promisify(fs.unlink)

const getDirectoryFiles = async (directoryPath) => {
  // Note: withFileTypes requires Node 10+
  const dir = await readDirAsync(directoryPath, { withFileTypes: true })

  // Backwards compatibility
  const dirItems = await Promise.all(
    dir.map(async (item) => {
      // node 10.10+
      if (item.isDirectory) return item
      // Node 8 mostly
      const fsStatsObject = await lstatAsync(path.join(directoryPath, item))
      fsStatsObject.name = item
      return fsStatsObject
    })
  )

  return dirItems
    .filter(item => !item.isDirectory())
    .map(item => item.name)
}

module.exports = {
  getDirectoryFiles,
  lstatAsync,
  readDirAsync,
  readFileAsync,
  writeFileAsync,
  unlinkAsync,
}
