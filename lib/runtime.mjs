import { fork } from 'node:child_process'

import {
  applyLogTimeout,
  createLogCollector,
  handleCollectErrors
} from './log.mjs'
import { asRejected, serializeError } from './util.mjs'

export async function executeRuntime ({ log, request, invocationId }, file, env) {
  log('run invocation')
  await request(
    `api/v1/invocations/${invocationId}`,
    {
      method: 'PUT',
      body: {
        status: 'running'
      },
      consume: true
    }
  )

  const collect = applyLogTimeout(
    log,
    handleCollectErrors(
      log,
      createLogCollector(request, invocationId)
    )
  )

  log('fork child process')
  const result = await forkChildProcess(log, collect, file, env)

  log('flush log queue')
  await collect()

  if (result.status === 'fulfilled') {
    log('job completed')
    await request(
      `api/v1/invocations/${invocationId}`,
      {
        method: 'PUT',
        body: {
          status: 'completed',
          result: result.value
        },
        consume: true
      }
    )
  } else {
    log('job failed')
    await request(
      `api/v1/invocations/${invocationId}`,
      {
        method: 'PUT',
        body: {
          status: 'failed',
          reason: serializeError(result.reason)
        },
        consume: true
      }
    )
  }

  return result
}

export function forkChildProcess (log, collect, file, env) {
  return new Promise(resolve => {
    const child = fork(
      file || process.argv[1],
      process.argv.slice(2),
      {
        env: {
          ...process.env,
          ...env
        },
        stdio: [
          'ignore',
          'pipe',
          process.env.BRER_NODEJS_PIPE_STDERR === 'disable'
            ? 'ignore'
            : 'inherit',
          'ipc'
        ]
      }
    )

    let result = null

    const done = err => {
      if (err) {
        resolve(asRejected(err))
      } else if (!result) {
        resolve(asRejected('early worker termination'))
      } else {
        resolve(result)
      }
    }

    child.once('message', data => {
      result = data
    })

    child.on('error', done)

    child.on('spawn', () => {
      log('child process spawn')

      if (process.env.BRER_NODEJS_PIPE_STDOUT !== 'disable') {
        child.stdout.on('data', data => process.stdout.write(data))
      }
      child.stdout.on('data', collect)
    })

    child.on('close', code => {
      log(`child process exited with code ${code}`)

      if (code === 0) {
        done(null)
      } else {
        done(new Error(`Child process exited with code ${code}`))
      }
    })
  })
}
