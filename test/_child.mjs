import { asFulfilled, asRejected, serializeError } from '../lib/util.mjs'

if (!process.send) {
  throw new Error('Not a child process')
}

if (process.env.BRER_NODEJS_MODE === 'fulfilled') {
  process.send(asFulfilled(42))

  console.log('hello world')
  console.error('world hello')
} else if (process.env.BRER_NODEJS_MODE === 'rejected') {
  process.send(asRejected(serializeError(new Error('Oh no'))))

  console.log('oh no')
  console.error('not again')
} else if (process.env.BRER_NODEJS_MODE === 'exit') {
  console.log('moon moon')
  console.error('woff woff')

  process.exit(0)
} else {
  process.exit(1)
}
