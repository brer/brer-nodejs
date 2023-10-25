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
  t.is(getHandler(obj, 'nope'), null)

  mergeHandlers(obj, { prop: noop })
  t.is(getHandler(obj, 'prop'), noop)
  t.throws(() => mergeHandlers(obj, { test: noop }))
  t.throws(() => mergeHandlers(obj, { ohno: null }))

  t.is(getHandler(obj, 'global'), null)
  registerGlobalHandler(obj, noop)
  t.is(getHandler(obj, 'haha'), noop)
  t.throws(() => mergeHandlers(obj, { _: noop }))
})
