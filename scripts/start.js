process.env.NODE_ENV = process.env.NODE_ENV || 'development'

console.log('NODE_ENV:', process.env.NODE_ENV)

const os = require('os')

const chalk = require('chalk')
const webpack = require('webpack')
const WebpackDevServer = require('webpack-dev-server')
const config = require('../config/webpack.config.dev')

// TODO: hide this behind a flag and eliminate dead code on eject.
// This shouldn't be exposed to the user.
let handleCompile
const isSmokeTest = process.argv.some(arg =>
  arg.indexOf('--smoke-test') > -1
)
if (isSmokeTest) {
  handleCompile = function (err, stats) {
    if (err || stats.hasErrors() || stats.hasWarnings()) {
      process.exit(1)
    } else {
      process.exit(0)
    }
  }
}

const friendlySyntaxErrorLabel = 'Syntax error:'

function isLikelyASyntaxError (message) {
  return message.indexOf(friendlySyntaxErrorLabel) !== -1
}

// This is a little hacky.
// It would be easier if webpack provided a rich error object.

function formatMessage (message) {
  return message
  // Make some common errors shorter:
    .replace(
      // Babel syntax error
      'Module build failed: SyntaxError:',
      friendlySyntaxErrorLabel
    )
    .replace(
      // Webpack file not found error
      /Module not found: Error: Cannot resolve 'file' or 'directory'/,
      'Module not found:'
    )
    // Internal stacks are generally useless so we strip them
    .replace(/^\s*at\s.*:\d+:\d+[\s)]*\n/gm, '') // at ... ...:x:y
    // Webpack loader names obscure CSS filenames
    .replace('./~/css-loader!./~/postcss-loader!', '')
}

function clearConsole () {
  // process.stdout.write('\x1B[2J\x1B[0f');
}

const compiler = webpack(config, handleCompile)

compiler.plugin('invalid', function () {
  clearConsole()
  console.log('Compiling...')
})
compiler.plugin('done', function (stats) {
  clearConsole()
  const hasErrors = stats.hasErrors()
  const hasWarnings = stats.hasWarnings()
  if (!hasErrors && !hasWarnings) {
    let showStats = process.argv.some(arg =>
      arg.indexOf('--stats') > -1
    )
    if (showStats) {
      let decycle = obj => {
        let pathArr = []
        let recurs = obj => {
          pathArr.push(obj)
          for (let o in obj) {
            if (obj.hasOwnProperty(o)) {
              if (pathArr.includes(obj[o])) {
                obj[o] = 'Circular'
              } else {
                recurs(obj[o])
              }
            }
          }
          pathArr.pop()
        }
        recurs(obj)
      }

      decycle(stats)
      let str = JSON.stringify(stats)
      console.log(str)
      process.exit(0)
    }
    console.log(chalk.green('Compiled successfully!'))
    console.log()
    console.log('The layout is running at http://localhost:3000/')
    console.log()


    // print local addresses
    console.log('External access:')

    const interfaces = os.networkInterfaces()
    for (let k in interfaces) {
      for (let k2 in interfaces[k]) {
        let address = interfaces[k][k2]
        if (address.family === 'IPv4' && !address.internal) {
          console.log('http://' + address.address + ':3000/')
        }
      }
    }
    return
  }

  const json = stats.toJson()
  let formattedErrors = json.errors.map(message =>
    'Error in ' + formatMessage(message)
  )
  const formattedWarnings = json.warnings.map(message =>
    'Warning in ' + formatMessage(message)
  )

  if (hasErrors) {
    console.log(chalk.red('Failed to compile.'))
    console.log()
    if (formattedErrors.some(isLikelyASyntaxError)) {
      // If there are any syntax errors, show just them.
      // This prevents a confusing ESLint parsing error
      // preceding a much more useful Babel syntax error.
      formattedErrors = formattedErrors.filter(isLikelyASyntaxError)
    }
    formattedErrors.forEach(message => {
      console.log(message)
      console.log()
    })
    // If errors exist, ignore warnings.
    return
  }

  if (hasWarnings) {
    console.log(chalk.yellow('Compiled with warnings.'))
    console.log()
    formattedWarnings.forEach(message => {
      console.log(message)
      console.log()
    })

    console.log('You may use special comments to disable some warnings.')
    console.log('Use ' + chalk.yellow('// eslint-disable-next-line') + ' to ignore the next line.')
    console.log('Use ' + chalk.yellow('/* eslint-disable */') + ' to ignore all warnings in a file.')
  }
})

new WebpackDevServer(compiler, {
  historyApiFallback: true,
  hot: true, // Note: only CSS is currently hot reloaded
  publicPath: config.output.publicPath,
  // for local access
  quiet: true,
  host: '0.0.0.0',
  open: true,
  disableHostCheck: true,
}).listen(3000, '0.0.0.0', function (err, result) {
  if (err) {
    return console.log(err)
  }

  clearConsole()
  console.log(chalk.cyan('Starting the development server...'))
  console.log()
})
