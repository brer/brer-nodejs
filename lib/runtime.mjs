import { fork } from 'node:child_process'

import { Pager, writeLog } from './log.mjs'
import { asRejected, serializeError } from './util.mjs'

export async function executeRuntime ({ log, request, invocationId }, file, env) {
  log('run invocation')
  await request(
    `api/v1/invocations/${invocationId}/status`,
    {
      method: 'PUT',
      body: {
        status: 'running'
      },
      consume: true
    }
  )

  // Log collector
  const pager = new Pager()

  // Schedule log push (ignore errors, for now...)
  const timer = setInterval(() => {
    log('push log stream')
    writeLog(request, invocationId, pager).catch(
      err => log('log collection error', err)
    )
  }, 30000)

  log('fork child process')
  const result = await forkChildProcess(log, pager, file, env)
  clearInterval(timer)

  log('flush log stream')
  await writeLog(request, invocationId, pager)

  if (result.status === 'fulfilled') {
    log('job completed')
    await request(
      `api/v1/invocations/${invocationId}/status`,
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
      `api/v1/invocations/${invocationId}/status`,
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

export function forkChildProcess (log, pager, file, env) {
  return new Promise(resolve => {
    const child = fork(
      file || process.argv[1],
      process.argv.slice(2),
      {
        env: {
          ...process.env,
          ...env
        },
        stdio: ['ignore', 'pipe', 'pipe', 'ipc']
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

      // Toggle piping between parent/child std
      if (process.env.BRER_NODEJS_PIPE_STDOUT !== 'disable') {
        child.stdout.on('data', data => process.stdout.write(data))
      }
      if (process.env.BRER_NODEJS_PIPE_STDERR !== 'disable') {
        child.stderr.on('data', data => process.stderr.write(data))
      }

      const write = data => pager.write(data)
      child.stdout.on('data', write)
      child.stderr.on('data', write)
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
