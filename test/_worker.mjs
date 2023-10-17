import { isMainThread, parentPort, workerData } from 'node:worker_threads'

if (isMainThread) {
  throw new Error('Not a Worker Thread')
}

if (workerData._id === 'fulfilled_result') {
  parentPort.postMessage({
    status: 'fulfilled',
    value: 42
  })
} else if (workerData._id === 'rejected_result') {
  parentPort.postMessage({
    status: 'rejected',
    reason: 'oh no'
  })
} else if (workerData._id === 'test_logs_collection') {
  console.log('cache invalidation')

  parentPort.postMessage({
    status: 'fulfilled',
    value: 'check logs'
  })

  setTimeout(() => {
    // This log line should be collected
    console.error('naming things')
  }, 500)
} else if (workerData._id !== 'clean_exit') {
  throw new Error(`Unknown command ${workerData._id}`)
}
