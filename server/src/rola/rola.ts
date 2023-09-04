import { SignedChallenge } from "@radixdlt/radix-dapp-toolkit";
import { Result, ResultAsync, err, errAsync, ok, okAsync } from "neverthrow";
import { GatewayService } from "../gateway/gateway";
import { blake2b } from "./crypto/blake2b";
import { curve25519, secp256k1 } from "./crypto/curves";
import { PublicKey, RadixEngineToolkit, address } from "@radixdlt/radix-engine-toolkit";

export type RolaError = { reason: string; jsError?: Error };

export const RolaFactory =
  ({
    gatewayService,
    expectedOrigin,
    dAppDefinitionAddress,
    networkId,
  }: {
    gatewayService: GatewayService;
    expectedOrigin: string;
    dAppDefinitionAddress: string;
    networkId: number;
  }) =>
  (signedChallenge: SignedChallenge): ResultAsync<string, RolaError> => {
    const result = createPublicKeyHash(signedChallenge.proof.publicKey);

    if (result.isErr()) return errAsync({ reason: "couldNotHashPublicKey" });

    const hashedPublicKey = result.value;

    const verifyProof = verifyProofFactory(signedChallenge);

    const getDerivedAddress = () =>
      deriveVirtualAddress(signedChallenge, networkId)
        .mapErr((jsError) => ({
          reason: "couldNotDeriveAddressFromPublicKey",
          jsError,
        }));

    const queryLedger = () =>
      gatewayService
        .getEntityOwnerKeys(signedChallenge.address)
        .mapErr(() => ({ reason: "couldNotVerifyPublicKeyOnLedger" }))
        .map((ownerKeys) => ({
          ownerKeysMatchesProvidedPublicKey: ownerKeys
            .map((x) => x.toUpperCase())
            .some((x) => x.includes(hashedPublicKey.toUpperCase())),
          ownerKeysSet: !!ownerKeys,
        }));

    const deriveAddressFromPublicKeyAndQueryLedger = () =>
      ResultAsync.combine([getDerivedAddress(), queryLedger()]);

    return createSignatureMessage({
      dAppDefinitionAddress,
      origin: expectedOrigin,
      challenge: signedChallenge.challenge,
    })
      .andThen(verifyProof)
      .asyncAndThen(deriveAddressFromPublicKeyAndQueryLedger)
      .andThen(
        ([
          derivedAddress,
          { ownerKeysMatchesProvidedPublicKey, ownerKeysSet },
        ]) => {
          // console.log(derivedAddress, ownerKeysMatchesProvidedPublicKey, ownerKeysSet)
          const derivedAddressMatchesPublicKey =
            !ownerKeysSet && derivedAddress === signedChallenge.address;

          return ownerKeysMatchesProvidedPublicKey ||
            derivedAddressMatchesPublicKey
            ? ok(derivedAddress)
            : err({ reason: "invalidPublicKey" });
        },
      );
  };

type HexEncodedPublicKeyHash = string;

export const createPublicKeyHash = (
  publicKey: string,
): Result<HexEncodedPublicKeyHash, Error> =>
  blake2b(Buffer.from(publicKey, "hex"))
    .map((hash) => hash.subarray(-29))
    .map((hash) => Buffer.from(hash).toString("hex"));

const supportedCurves = new Set(["curve25519", "secp256k1"]);

export const verifyProofFactory =
  (input: SignedChallenge) =>
  (
    signatureMessageHex: string,
  ): Result<undefined, { reason: string; jsError?: Error }> => {
    const isSupportedCurve = supportedCurves.has(input.proof.curve);
    if (!isSupportedCurve) return err({ reason: "unsupportedCurve" });

    try {
      let isValid = false;

      if (input.proof.curve === "curve25519") {
        const publicKey = curve25519.keyFromPublic(
          input.proof.publicKey,
          // @ts-ignore: incorrect type definition in EC lib
          "hex",
        );
        isValid = publicKey.verify(signatureMessageHex, input.proof.signature);
      } else {
        const signature = Buffer.from(input.proof.signature, "hex")
          .toJSON()
          .data.slice(1);
        const r = signature.slice(0, 32);
        const s = signature.slice(32, 64);
        isValid = secp256k1
          .keyFromPublic(input.proof.publicKey, "hex")
          .verify(signatureMessageHex, { r, s });
      }
      return isValid ? ok(undefined) : err({ reason: "invalidSignature" });
    } catch (error: any) {
      return err({ reason: "verifyProofinvalidPublicKey", jsError: error });
    }
  };

const deriveVirtualIdentityAddress = (publicKey: string, networkId: number) =>
  ResultAsync.fromPromise(
    RadixEngineToolkit.Derive.virtualAccountAddressFromPublicKey(
      new PublicKey.Ed25519(publicKey),
      networkId /* The ID of the network to derive the address for. */,
    ),
    (error: any): Error => error,
  );

const deriveVirtualEddsaEd25519AccountAddress = (
  publicKey: string,
  networkId: number,
) =>
  ResultAsync.fromPromise(
    RadixEngineToolkit.Derive.virtualAccountAddressFromPublicKey(
      new PublicKey.Ed25519(publicKey),
      networkId /* The ID of the network to derive the address for. */,
    ),
    (error: any): Error => error,
  );

const deriveVirtualEcdsaSecp256k1AccountAddress = (
  publicKey: string,
  networkId: number,
) =>
  ResultAsync.fromPromise(
    RadixEngineToolkit.Derive.virtualAccountAddressFromPublicKey(
      new PublicKey.Secp256k1(publicKey),
      networkId /* The ID of the network to derive the address for. */,
    ),
    (error: any): Error => error,
  );

export const deriveVirtualAddress = (
  signedChallenge: SignedChallenge,
  networkId: number,
) => {
  if (signedChallenge.type === "persona")
    return deriveVirtualIdentityAddress(
      signedChallenge.proof.publicKey,
      networkId,
    );
  else if (
    signedChallenge.type === "account" &&
    signedChallenge.proof.curve === "curve25519"
  )
    return deriveVirtualEddsaEd25519AccountAddress(
      signedChallenge.proof.publicKey,
      networkId,
    );
  else if (
    signedChallenge.type === "account" &&
    signedChallenge.proof.curve === "secp256k1"
  )
    return deriveVirtualEcdsaSecp256k1AccountAddress(
      signedChallenge.proof.publicKey,
      networkId,
    );

  return errAsync(new Error("Could not derive virtual address"));
};

// re-creates the signature message that is created by the wallet and signed
// alongside the challenge
// see https://github.com/radixdlt/rola-examples/blob/main/README.md#6-7-dapp-backend-verifies-the-proof-using-rola
export const createSignatureMessage = ({
  challenge,
  dAppDefinitionAddress,
  origin,
}: {
  challenge: string;
  dAppDefinitionAddress: string;
  origin: string;
}): Result<string, { reason: string; jsError: Error }> => {
  const prefix = Buffer.from("R", "ascii");
  const lengthOfDappDefAddress = dAppDefinitionAddress.length;
  const lengthOfDappDefAddressBuffer = Buffer.from(
    lengthOfDappDefAddress.toString(16),
    "hex",
  );
  const dappDefAddressBuffer = Buffer.from(dAppDefinitionAddress, "utf-8");
  const originBuffer = Buffer.from(origin, "utf-8");
  const challengeBuffer = Buffer.from(challenge, "hex");

  const messageBuffer = Buffer.concat([
    prefix,
    challengeBuffer,
    lengthOfDappDefAddressBuffer,
    dappDefAddressBuffer,
    originBuffer,
  ]);

  return blake2b(messageBuffer)
    .map((hash) => Buffer.from(hash).toString("hex"))
    .mapErr((jsError) => ({ reason: "couldNotHashMessage", jsError }));
};
