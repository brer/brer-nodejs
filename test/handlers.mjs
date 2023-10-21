import test from 'ava'

import {
  getHandler,
  mergeHandlers,
  registerGlobalHandler,
  registerHandler
} from '../lib/handlers.mjs'

test('handlers registration', t => {
  const noop = () => {}
  const obj = {}

  t.throws(() => registerHandler(obj, null))
  t.throws(() => registerHandler(obj, 'asdf', null))

  registerHandler(obj, 'test', noop)
  t.is(getHandler(obj, 'test'), noop)
  t.throws(() => getHandler(obj, 'nope'))

  mergeHandlers(obj, { prop: noop })
  t.is(getHandler(obj, 'prop'), noop)
  t.throws(() => mergeHandlers(obj, { test: noop }))
  t.throws(() => mergeHandlers(obj, { ohno: null }))

  t.throws(() => getHandler(obj, 'global'))
  registerGlobalHandler(obj, noop)
  t.is(getHandler(obj, 'haha'), noop)
  t.throws(() => mergeHandlers(obj, { _: noop }))
})
