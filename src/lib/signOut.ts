/**
 * "Sign out" for HTTP Basic auth, which has no real logout: the browser keeps
 * the password until it's closed. Sending one request with a deliberately
 * wrong login makes Chrome, Edge and Firefox replace the remembered one, so
 * the next visit asks again. The signed-out page itself needs no login
 * (see the vhost), so it doesn't trigger the prompt straight away.
 */
export async function signOut(): Promise<void> {
  await new Promise<void>((resolve) => {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', `/api/me?signout=${Date.now()}`, true, 'signed-out', 'signed-out')
    xhr.setRequestHeader('Accept', 'application/json')
    xhr.onloadend = () => resolve()
    xhr.send()
  })
  window.location.replace('/signed-out.html')
}
