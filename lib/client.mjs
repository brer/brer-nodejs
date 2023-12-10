import { fetch } from 'undici'

const IDEMPOTENT_METHODS = ['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS', 'TRACE']

export function createHttpClient (url, token, log) {
  const doRequest = async (path, options, retries) => {
    if (retries) {
      const ms = 1000 * retries
      log(`retry #${retries} (sleep for ${ms} ms)`)
      await sleep(ms)
    }

    const request = {
      method: 'GET',
      ...options,
      headers: {
        accept: '*/*',
        authorization: `Bearer ${token}`,
        'user-agent': 'brer-nodejs/alpha',
        ...options.headers
      }
    }
    if (
      request.body !== undefined &&
      typeof request.body !== 'string' &&
      !request.headers['content-type']
    ) {
      request.headers['content-type'] = 'application/json; charset=utf-8'
      request.body = JSON.stringify(request.body)
    }

    let response = { bodyUsed: true, ok: false, status: 500 }
    let reason = null
    try {
      response = await fetch(new URL(path, url), request)
    } catch (err) {
      log(err)
      reason = err
    }

    if (response.status >= 500) {
      if (retries < 2 && IDEMPOTENT_METHODS.includes(request.method)) {
        await consume(response)
        return doRequest(path, options, retries + 1)
      } else if (reason) {
        // fake response object (no need to consume)
        return Promise.reject(reason)
      }
    }

    if (!response.ok && !options.expectedStatuses?.includes(response.status)) {
      await consume(response)
      throw new Error(
        `Route ${path} replied with status ${response.status}`
      )
    }

    if (options.consume) {
      await consume(response)
    }

    return response
  }

  return (path, options = {}) => doRequest(path, options, 0)
}

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms, ms))
}

async function consume (response) {
  if (response.body && !response.bodyUsed) {
    // eslint-disable-next-line no-unused-vars
    for await (const chunk of response.body) {
      // just consume the stream
    }
  }
}
