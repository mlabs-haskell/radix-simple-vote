import { DbInterface, DbKeys } from "../db-store"
import { secureRandom } from "../helpers/crypto"

// A simple in-memory store for challenges. A database should be used in production.
export const ChallengeStore = (db: DbInterface) => {
  const challenges = new Map<string, { expires: number }>()

  const persistChallengeStore = () => db.set(DbKeys.Challenges, Object.fromEntries(challenges))

  const create = () => {
    const challenge = secureRandom(32) // 32 random bytes as hex string
    const expires = Date.now() + 1000 * 60 * 1 // expires in 1 minutes
    challenges.set(challenge, { expires }) // store challenge with expiration
    persistChallengeStore()
    return challenge
  }

  const verify = (input: string) => {
    const challenge = challenges.get(input)

    if (!challenge) return false

    challenges.delete(input) // remove challenge after it has been used
    const isValid = challenge.expires > Date.now() // check if challenge has expired

    persistChallengeStore()
    return isValid
  }

  return { create, verify }
}
