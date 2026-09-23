import { startTransition, type FormEvent } from 'react'

/**
 * Submit a form to a `useActionState` dispatcher WITHOUT React's automatic
 * form reset. With `<form action={...}>`, React 19 clears every uncontrolled
 * field after each submit — including failed ones — so a validation error
 * would wipe what the user typed. Use `<form onSubmit={keepValues(action)}>`.
 */
export function keepValues(dispatch: (formData: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    startTransition(() => dispatch(formData))
  }
}
