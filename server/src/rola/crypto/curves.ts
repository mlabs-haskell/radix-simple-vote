import ec from 'elliptic'

export const secp256k1 = new ec.ec('secp256k1')
export const curve25519 = new ec.eddsa('ed25519')
