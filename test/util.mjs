import test from 'ava'

import { serializeError } from '../lib/util.mjs'

test('serializeError', t => {
  t.plan(1)

  t.like(
    serializeError(new Error('Test')),
    {
      type: 'Error',
      message: 'Test'
    }
  )
})
