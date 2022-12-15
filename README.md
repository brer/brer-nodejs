# Brer bindings for Node.js

[![npm](https://img.shields.io/npm/v/brer)](https://www.npmjs.com/package/brer)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

This is the Node.js package for Brer Function declaration.

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
const promise = brer(myTask)

// This Promise is safe, you can skip ".catch()"
promise.then(result => {
  console.log(result) // 42
  // TODO: do something after the function invocation
})
```
