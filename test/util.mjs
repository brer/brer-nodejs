import test from 'ava'

import { serializeError } from '../lib/util.mjs'

test('serializeError', t => {
  t.plan(2)

  t.like(
    serializeError(new Error('Oh no')),
    {
      type: 'Error',
      message: 'Oh no'
    }
  )
  t.like(
    serializeError(new TypeError('No oh')),
    {
      type: 'TypeError',
      message: 'No oh'
    }
  )
})
