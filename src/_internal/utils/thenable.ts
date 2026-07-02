import { noop, isUndefined } from './shared'

/**
 * A thenable carrying the status fields React's `use()` tracks. React can
 * only unwrap a thenable synchronously when these fields are present;
 * otherwise it has to suspend for at least a microtask to learn the outcome,
 * which can flash Suspense fallbacks over already-rendered content.
 *
 * @see https://github.com/facebook/react/pull/34030
 */
export type ReactThenable<T> = Promise<T> & {
  status?: 'pending' | 'fulfilled' | 'rejected'
  value?: T
  reason?: unknown
}

/**
 * Wrap an already-known value so `use()` unwraps it synchronously. Only
 * userspace knows the value synchronously; React would have to wait a
 * microtask to observe a bare resolved promise.
 */
export const fulfilledThenable = <T>(value: T): ReactThenable<T> => {
  const thenable = Promise.resolve(value) as ReactThenable<T>
  thenable.status = 'fulfilled'
  thenable.value = value
  return thenable
}

/**
 * Wrap an already-known error so `use()` rethrows it synchronously.
 */
export const rejectedThenable = <T>(reason: unknown): ReactThenable<T> => {
  const thenable = Promise.reject(reason) as ReactThenable<T>
  // `use()` rethrows through `reason`; suppress the unhandled rejection.
  thenable.catch(noop)
  thenable.status = 'rejected'
  thenable.reason = reason
  return thenable
}

/**
 * Track a live request in place so that once it settles, later renders
 * unwrap it synchronously instead of suspending again.
 */
export const instrumentThenable = <T>(
  promise: Promise<T>
): ReactThenable<T> => {
  const thenable = promise as ReactThenable<T>
  if (isUndefined(thenable.status)) {
    thenable.status = 'pending'
    thenable.then(
      v => {
        thenable.status = 'fulfilled'
        thenable.value = v
      },
      e => {
        thenable.status = 'rejected'
        thenable.reason = e
      }
    )
  }
  return thenable
}
