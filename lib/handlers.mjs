const globalKey = '_'

export function registerHandler (obj, fnName, fnHandler) {
  if (typeof fnName !== 'string') {
    throw new TypeError('Function name must be a string')
  }
  if (typeof fnHandler !== 'function') {
    throw new TypeError('Function handler must be a function')
  }
  if (obj[fnName]) {
    throw new Error(
      fnName === globalKey
        ? 'Global handler already registered'
        : `Function ${fnName} handler already registered`
    )
  }
  obj[fnName] = fnHandler
}

export function registerGlobalHandler (obj, fnHandler) {
  registerHandler(obj, globalKey, fnHandler)
}

export function mergeHandlers (target, source) {
  for (const key of Object.keys(Object(source))) {
    registerHandler(target, key, source[key])
  }
}

export function getHandler (obj, fnName) {
  return obj[fnName] || obj[globalKey] || null
}
