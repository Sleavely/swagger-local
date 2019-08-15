#!/usr/bin/env node
'use strict'

const getStdin = require('get-stdin')
const meow = require('meow')
const ora = require('ora')

const self = require('../package.json')
const main = require('.')

const cli = meow(`
Usage
  $ ${Object.keys(self.bin)[0]} <swaggerfile>

Starts a temporary local Swagger server

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

const input = cli.input[0]

if (!input && process.stdin.isTTY) {
  cli.showHelp()
}

if (cli.flags.port) {
  main.setPort(cli.flags.port)
}

const spinners = {
  input: ora(),
  stdin: ora(),
  server: ora(),
  browser: ora(),
}

const fail = (err) => {
  for (let step in spinners) {
    if (spinners[step].isSpinning) spinners[step].fail()
  }
  console.error(`\n${err.stack}`)
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
