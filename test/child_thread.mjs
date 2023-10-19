import test from 'ava'

import { getFunctionHandler, runChildThread } from '../lib/child_thread.mjs'
import { mockHttpClient } from './_client.mjs'

const log = () => {}

test('happy path', async t => {
  t.plan(4)

  const request = mockHttpClient(
    path => {
      t.is(path, 'rpc/v1/download')
      return {
        body: Buffer.from(JSON.stringify({ hello: 'world' })),
        headers: {
          'content-type': 'application/json'
        }
      }
    }
  )

  const invocation = {
    _id: 'my_completed_invocation',
    functionName: 'my_function',
    env: []
  }

  const handler = async (payload, ctx) => {
    t.deepEqual(
      JSON.parse(payload.toString()),
      { hello: 'world' }
    )
    t.like(ctx, {
      invocation,
      contentType: 'application/json'
    })
    return 42
  }

  const result = await runChildThread(log, request, invocation, handler)
  t.is(result, 42)
})

test('rejection', async t => {
  t.plan(4)

  const request = mockHttpClient(
    path => {
      t.is(path, 'rpc/v1/download')
      return {
        body: Buffer.from(JSON.stringify({ hello: 'world' })),
        headers: {
          'content-type': 'application/json'
        }
      }
    }
  )

  const invocation = {
    _id: 'my_failed_invocation',
    functionName: 'my_function',
    env: []
  }

  const handler = async (payload, ctx) => {
    t.deepEqual(
      JSON.parse(payload.toString()),
      { hello: 'world' }
    )
    t.like(ctx, {
      invocation,
      contentType: 'application/json'
    })
    throw new Error('Cockroaches')
  }

  await t.throwsAsync(
    () => runChildThread(log, request, invocation, handler),
    { message: 'Cockroaches' }
  )
})

test('test run', async t => {
  t.plan(1)

  const request = mockHttpClient()

  const invocation = {
    _id: 'my_test_invocation',
    functionName: 'my_function',
    env: [
      {
        name: 'BRER_MODE',
        value: 'test'
      }
    ]
  }

  const handler = () => {
    t.fail()
    throw new Error('Stop')
  }

  const result = await runChildThread(log, request, invocation, handler)
  t.like(result, {
    runtime: {
      type: 'Node.js',
      arch: process.arch,
      platform: process.platform,
      version: process.version
    }
  })
})

test('handler resolution', t => {
  t.truthy(getFunctionHandler(() => {}))
  t.truthy(getFunctionHandler({ _: () => {} }))
  t.truthy(getFunctionHandler({ test: () => {} }, 'test'))
  t.throws(() => getFunctionHandler({}, 'test'))
})
