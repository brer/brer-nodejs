export function asFulfilled (value) {
  return {
    status: 'fulfilled',
    value
  }
}

export function asRejected (reason) {
  return {
    status: 'rejected',
    reason
  }
}

/**
 * Cast an Error instance into some JSON value with enough details.
 */
export function serializeError (err) {
  if (!(err instanceof Error) || typeof Object(err).toJSON === 'function') {
    return err
  }
  const result = {
    type: err.constructor.name,
    code: err.code,
    message: err.message,
    stack: err.stack
  }
  const usedKeys = Object.keys(result)
  for (const key of Object.keys(err)) {
    if (!usedKeys.includes(key)) {
      result[key] = err[key]
    }
  }
  return result
}
