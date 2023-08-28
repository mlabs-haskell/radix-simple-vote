import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';
import { BIP32Interface } from 'bip32';
import * as bip39 from 'bip39';
import { derivePath, getMasterKeyFromSeed } from 'ed25519-hd-key'
// const bitcoin = require('bitcoinjs-lib');
import { SLIP10Node } from '@metamask/key-tree';

// Create a SLIP10Node from a derivation path. You can also specify a key and depth instead.

const mnemonic = 
  'merry gift virus trumpet agent around direct bleak ridge session betray lyrics husband job marble budget pave fold advice topic pulp phone smoke review'; // Replace with your mnemonic

export const testDerive = async () => {
  // SLIP-10 supports Ed25519 as well.
  const ed25519Node = await SLIP10Node.fromDerivationPath({
    curve: 'ed25519',
    derivationPath: [`bip39:${mnemonic}`, `slip10:44'`, `slip10:1022'`],
  });

  // Derive the child node at m / 0' / 1' / 2'. This results in a new SLIP10Node.
  // Note that you cannot derive unhardened child nodes when using Ed25519.
  const childNode = await ed25519Node.derive([`slip10:12'`, `slip10:525'`, `slip10:1460'`, `slip10:0'`]);
  console.log(childNode.privateKey?.toString())
  console.log(childNode.publicKey.toString())
  return childNode.privateKey?.toString();
}

export const testDeriveOld = (path: string) => {
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const { key, chainCode } = getMasterKeyFromSeed(seed.toString('hex'))
  // const { key, chainCode } = getMasterKeyFromSeed('000102030405060708090a0b0c0d0e0f')
  const child = derivePath(path, key.toString('hex'))
  const p = child.key
  console.log("chain code: ", child.chainCode.toString('hex'))
  console.log("private key: ", child.key.toString('hex'))
  return p.toString('hex');
}

export default () => {

  // You must wrap a tiny-secp256k1 compatible implementation
  const bip32 = BIP32Factory(ecc);

  const seed = bip39.mnemonicToSeedSync(mnemonic);

  // const rootEd = getMasterKeyFromSeed(seed.toString('hex'));
  // const ch = derivePath("m/1022'/0'/1'/0'/0'", rootEd.key.toString('hex'));
  // const p = ch.key

  const root: BIP32Interface = bip32.fromSeed(seed);
  const path = "m/44'/0'/0'/0/0"; // Replace with the correct derivation path for your use case
  const child = root.derivePath(path);

  const p = child.privateKey;
  return p?.toString('hex');

  // console.log(p?.toString('hex')); // This is the private key as a Buffer
}
// const privateKeyWIF = bitcoin.ECPair.fromPrivateKey(privateKey).toWIF();

// console.log(privateKeyWIF); // This is the private key in Wallet Import Format

