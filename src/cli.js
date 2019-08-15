#!/usr/bin/env node
'use strict'

const getStdin = require('get-stdin')
const meow = require('meow')
const ora = require('ora')
const path = require('path')

const { getDirectoryFiles, lstatAsync } = require('./utils/fs')
const self = require('../package.json')
const main = require('.')

const cli = meow(`
Usage
  $ ${Object.keys(self.bin)[0]} <swaggerfile>

Starts a temporary local Swagger server

The swaggerfile argument can be either a file or
a directory containing swagger.y[a]ml

Options
  --help
  --no-stop    Dont stop the server after launching browser
  --port       Set the port to use

For more information, see:
${self.homepage}
`, {
  description: false,
  flags: {
    port: {
      type: 'string',
    },
    stop: {
      type: 'boolean',
      default: true,
    },
  },
})

let input = cli.input[0]

if (!input && process.stdin.isTTY) {
  // Use '.' to look through current dir
  input = '.'
  // cli.showHelp()
}

if (cli.flags.port) {
  main.setPort(cli.flags.port)
}

const spinners = {
  directory: ora(),
  input: ora(),
  stdin: ora(),
  server: ora(),
  browser: ora(),
}

const fail = (err) => {
  for (let step in spinners) {
    if (spinners[step].isSpinning) spinners[step].fail()
  }
  if (err) console.error(`\n${err.stack}`)
  process.exit(1)
}

const showDoc = async (swaggerDocument) => {
  spinners.server.start('Launching local server..')
  await main.startServer(swaggerDocument)
  spinners.server.succeed(`Temporary server started.`)

  spinners.browser.start('Opening browser..')
  await main.openBrowser()
  spinners.browser.succeed('Browser opened.')

  if (cli.flags.stop) {
    setTimeout(() => {
      ora('Stopping server (your browser should have loaded the page by now).').info()
      process.exit(0)
    }, 5000)
  } else {
    ora('Server left running because --no-stop was supplied.').info()
  }
}

(async () => {
  if (input) {
    const resolvedInput = path.resolve(process.cwd(), input)
    const inputStat = await lstatAsync(resolvedInput)
    if (inputStat.isDirectory()) {
      spinners.directory.start(`searching ${input} for swagger files..`)
      // Lets try to find a default file (swagger\.ya?ml)
      const dirFiles = await getDirectoryFiles(resolvedInput)
      const swaggerFileName = dirFiles.find((item) => !!item.match(/^swagger\.ya?ml$/))
      if (!swaggerFileName) {
        spinners.directory.fail(`Could not find a swagger file in "${input}"`)
        fail()
      }

      spinners.directory.succeed(`Found ${[input, swaggerFileName].join(input.endsWith('/') ? '' : '/')}`)
      // point `input` to that file
      input = path.resolve(resolvedInput, swaggerFileName)
    }
    spinners.input.start(`Opening ${input}..`)
    const swaggerDocument = await main.loadYaml(input)
    spinners.input.succeed(`Parsed ${input}`)

    showDoc(swaggerDocument)
  } else {
    (async () => {
      spinners.stdin.start('Reading stdin..')
      const stdinBuffer = await getStdin.buffer()
      const stdinString = stdinBuffer.toString('utf-8')

      const swaggerDocument = (() => {
        if (stdinString.startsWith('{')) return JSON.parse(stdinString)
        return main.loadYaml(stdinString)
      })()
      spinners.stdin.succeed(`Parsed stdin.`)
      showDoc(swaggerDocument)
    })()
  }
})().catch((err) => fail(err))
