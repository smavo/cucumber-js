import { performance } from 'perf_hooks'
import * as messages from '@cucumber/messages'

let previousTimestamp: number

interface ProtectedTimingBuiltins {
  clearImmediate: typeof clearImmediate
  clearInterval: typeof clearInterval
  clearTimeout: typeof clearTimeout
  Date: typeof Date
  setImmediate: typeof setImmediate
  setInterval: typeof setInterval
  setTimeout: typeof setTimeout
  performance: typeof performance
}

interface CustomTimingFunctions {
  beginTiming: () => void
  endTiming: () => number
}

const methods: Partial<ProtectedTimingBuiltins & CustomTimingFunctions> = {
  beginTiming() {
    previousTimestamp = getTimestamp()
  },
  clearInterval: clearInterval.bind(global),
  clearTimeout: clearTimeout.bind(global),
  Date,
  endTiming() {
    return getTimestamp() - previousTimestamp
  },
  setInterval: setInterval.bind(global),
  setTimeout: setTimeout.bind(global),
  performance,
}

if (typeof setImmediate !== 'undefined') {
  methods.setImmediate = setImmediate.bind(global)
  methods.clearImmediate = clearImmediate.bind(global)
}

function getTimestamp(): number {
  return methods.performance.now()
}

export function durationBetweenTimestamps(
  startedTimestamp: messages.Timestamp,
  finishedTimestamp: messages.Timestamp
): messages.Duration {
  const durationMillis =
    messages.TimeConversion.timestampToMillisecondsSinceEpoch(
      finishedTimestamp
    ) -
    messages.TimeConversion.timestampToMillisecondsSinceEpoch(startedTimestamp)
  return messages.TimeConversion.millisecondsToDuration(durationMillis)
}

export async function wrapPromiseWithTimeout<T>(
  promise: Promise<T>,
  timeoutInMilliseconds: number,
  timeoutMessage: string = ''
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>
  if (timeoutMessage === '') {
    timeoutMessage = `Action did not complete within ${timeoutInMilliseconds} milliseconds`
  }
  const timeoutPromise = new Promise<T>((resolve, reject) => {
    timeoutId = methods.setTimeout(() => {
      reject(new Error(timeoutMessage))
    }, timeoutInMilliseconds)
  })
  return await Promise.race([promise, timeoutPromise]).finally(() =>
    methods.clearTimeout(timeoutId)
  )
}

export default methods
