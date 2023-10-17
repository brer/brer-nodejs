# Brer bindings for Node.js

[![npm](https://img.shields.io/npm/v/brer)](https://www.npmjs.com/package/brer)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

This is the Node.js package for Brer Function declaration.

> **WARNING:** This package is pure ESM. Use `const brer = await import('brer')` if you need It within a CommonJS environment.

```javascript
import brer from 'brer'

async function myTask (payload, ctx) {
  console.log('Function name: ' + ctx.invocation.functionName)
  console.log('Invocation id: ' + ctx.invocation._id)

  console.log('Payload type: ' + ctx.contentType)
  // TODO: do something useful with the payload (Buffer)

  return 42
}

// Run
brer(myTask)
```
