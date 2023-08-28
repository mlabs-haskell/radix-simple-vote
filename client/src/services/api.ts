import { SignedChallenge } from "@radixdlt/radix-dapp-toolkit"

export const ApiService = (baseUrl: string) => {
  const get = (path: string) => fetch(`${baseUrl}${path}`).then(res => res.json())
  const post = <T>(path: string, body: T) => fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  }).then(res => res.json())

  const getStatus: () => Promise<{status: string}> = () => get('/status');
  const createChallenge: () => Promise<string> = () => get('/create-challenge').then(res => res.challenge)
  const verifySignedChallenge: (c: SignedChallenge) => Promise<{ valid: boolean}> = (c) => post('/verify-challenge', c)

  return {
    status: {
      getStatus,
    },
    vote: {
      createChallenge,
      verifySignedChallenge,
    }
  }
}
