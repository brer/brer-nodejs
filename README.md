# Official Node.js bindings for [Brer](https://github.com/brer/brer)

[![npm](https://img.shields.io/npm/v/brer)](https://www.npmjs.com/package/brer)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

> **WARNING:** This package is pure ESM. Learn more aboud It [here](https://nodejs.org/api/esm.html).

```javascript
import brer from 'brer'

async function myTask (payload, ctx) {
  console.log('Function name: ' + ctx.invocation.functionName)
  console.log('Invocation id: ' + ctx.invocation._id)

  console.log('Payload type: ' + ctx.contentType)
  // do something useful with the payload (Buffer)

  return 42
}

// Run
brer(myTask)
```
