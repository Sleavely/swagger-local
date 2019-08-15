
const express = require('express')
const fs = require('fs')
const open = require('open')
const path = require('path')
const { promisify } = require('util')
const swaggerUi = require('swagger-ui-express')
const yaml = require('js-yaml')
//TODO: support --watch with chokidar?
const readFile = promisify(fs.readFile)

let PORT = process.env.PORT || Math.floor(Math.random() * (56000 - 25000 + 1) + 25000)
exports.setPort = (port) => { PORT = port }

exports.loadYaml = async (filePath) => {
  const swaggerFile = await readFile(path.resolve(filePath))
  const swaggerDocument = yaml.safeLoad(swaggerFile, 'utf-8')
  return swaggerDocument
}

exports.startServer = async (swaggerDocument) => {
  const app = express()
  app.use('/', swaggerUi.serve, swaggerUi.setup(swaggerDocument))
  return new Promise((resolve) => {
    app.listen(PORT, resolve)
  })
}
exports.openBrowser = async () => open(`http://localhost:${PORT}/`)
