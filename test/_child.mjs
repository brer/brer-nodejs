import { asFulfilled, asRejected, serializeError } from '../lib/util.mjs'

if (!process.send) {
  throw new Error('Not a child process')
}

if (process.env.BRER_NODEJS_MODE === 'fulfilled') {
  process.send(asFulfilled(42))

  console.log('hello')
  console.error('some')
  console.log('world')
  console.error('privacy')
} else if (process.env.BRER_NODEJS_MODE === 'rejected') {
  process.send(asRejected(serializeError(new Error('Oh no'))))

  console.log('oh')
  console.error('some')
  console.log('no')
  console.error('privacy')
} else if (process.env.BRER_NODEJS_MODE === 'exit') {
  console.log('moon')
  console.error('some')
  console.log('moon')
  console.error('privacy')

  process.exit(0)
} else {
  process.exit(1)
}
