import express from 'express'
import { secureRandom } from './helpers/crypto'
import { SignedChallenge } from '@radixdlt/radix-dapp-toolkit'
// import { RolaFactory } from './rola/rola'
import cors from 'cors'
// import { GatewayService } from './rola/gateway'
import { ResultAsync } from 'neverthrow'
import { NetworkId } from '@radixdlt/radix-engine-toolkit'
import { RolaFactory } from './rola/rola'
import { GatewayService } from './gateway/gateway'
import { NetworkConfigurationResponseVersionToJSON } from '@radixdlt/babylon-core-api-sdk'

const app = express()
app.use(cors())
app.use(express.json())

const port = 4000

// A simple in-memory store for challenges. A database should be used in production.
const ChallengeStore = () => {
  const challenges = new Map<string, { expires: number }>()

  const create = () => {
    const challenge = secureRandom(32) // 32 random bytes as hex string
    const expires = Date.now() + 1000 * 60 * 1 // expires in 1 minutes
    challenges.set(challenge, { expires }) // store challenge with expiration
    console.log("challenge store: ", challenges)
    return challenge
  }

  const verify = (input: string) => {
    const challenge = challenges.get(input)

    if (!challenge) return false

    challenges.delete(input) // remove challenge after it has been used
    const isValid = challenge.expires > Date.now() // check if challenge has expired

    console.log("challenge store: ", challenges)
    return isValid
  }

  return { create, verify }
}

const challengeStore = ChallengeStore()

const gatewayService = GatewayService("https://rcnet-v2.radixdlt.com")

const rola = RolaFactory({
  gatewayService,
  expectedOrigin: "http://localhost:3000", // TODO: document how to get this and significance
  dAppDefinitionAddress: "account_tdx_d_128656c7vqkww07ytfudjacjh2snf9z8t6slfrz2n7p9kwaz2ewnjyv",
  networkId: NetworkId.Ansharnet
})

app.get('/status', (req, res) => res.send({ status: 'up' }) )

app.get('/create-challenge', (req, res) => {
  res.send({ challenge: challengeStore.create() })
})

app.post<{}, { valid: boolean }, SignedChallenge>('/verify-challenge', async (req, res) => {
  console.log(req.body)
  const r = await rola(req.body)
  if (r.isErr()) {
    res.send({ valid: false })
    console.log(r)
    return
  }
  res.send({ valid: true })
})

app.listen(port, () => {
  console.log(`server listening on port http://localhost:${port}`)
})
