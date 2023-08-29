import { readFileSync, writeFileSync } from "fs";
import {
  ManifestBuilder,
  ManifestAstValue,
  PrivateKey,
  NetworkId,
  TransactionBuilder,
  TransactionHeader,
  generateRandomNonce,
  ValidationConfig,
  Convert,
} from "@radixdlt/radix-engine-toolkit";
import {
  CoreApiClient,
  StateApi as CoreStateApi,
} from "@radixdlt/babylon-core-api-sdk";
import {
  Configuration,
  StateApi,
  StatusApi,
  StreamApi,
  TransactionApi,
  TransactionCommittedDetailsResponse,
  TransactionStatusResponse,
  TransactionSubmitResponse,
} from "@radixdlt/babylon-gateway-api-sdk";
import { PublishPackageAdvanced } from "@radixdlt/radix-engine-toolkit/dist/models/transaction/instruction";
import { SignedChallenge } from "@radixdlt/radix-dapp-toolkit";

let gatewayBaseUrl = "https://rcnet-v2.radixdlt.com";

let votePackageAddr =
  "package_tdx_d_1p4dfl5futstan4685698g9czuc6x9qwk7042rvuykz6fh04z7danm3";
let voteComponentAddr =
  "component_tdx_d_1czp3kwtwjpkcj0m6umyh6xuzm48ycp97f483szz4nft7q8cxwtj56e";
let adminVoteResourceAddr =
  "resource_tdx_d_1t564wm6t9tnvg2h448yz66wvwz8lu34r976a4s4qz5ncsasjde365j";

let actors = {
  admin: new PrivateKey.Secp256k1(
    "1e98ffa135c23318e461b682eaae8c8312ce154b3cf2ac068a12d8646eea5429",
  ),
  user1: new PrivateKey.Secp256k1(
    "aead13499d1c8c030af68400bd1ec1a6f95e3e0a48d145bbf0a350952b24d467",
  ),
  user2: new PrivateKey.Secp256k1(
    "cda4e10bd9505b9849a999cbea4832c378647d97fd355c4392f2ea701d434c26",
  ),
  test: new PrivateKey.Ed25519(
    "174e1e288d72d81eba48482a6559761c64d5bf702edd902b9f2bc2e689717062")
};

const voteCode = (() => {
  const fileBuffer = readFileSync("./simple_vote.wasm");
  return new Uint8Array(fileBuffer);
})();

const voteSchema = (() => {
  const fileBuffer = readFileSync("./simple_vote.rpd");
  return new Uint8Array(fileBuffer);
})();

let faucet =
  "component_tdx_d_1cptxxxxxxxxxfaucetxxxxxxxxx000527798379xxxxxxxxxdrq597";

const getCurrentEpoch = (statusApi: StatusApi) =>
  statusApi.gatewayStatus().then((o) => o.ledger_state.epoch);

const submitTransaction = async (
  transactionApi: TransactionApi,
  compiledTransaction: Uint8Array,
): Promise<TransactionSubmitResponse> =>
  transactionApi.transactionSubmit({
    transactionSubmitRequest: {
      notarized_transaction_hex:
        Convert.Uint8Array.toHexString(compiledTransaction),
    },
  });

const getTransactionStatus = async (
  transactionApi: TransactionApi,
  transactionId: Uint8Array,
): Promise<TransactionStatusResponse> =>
  transactionApi.transactionStatus({
    transactionStatusRequest: {
      intent_hash_hex: Convert.Uint8Array.toHexString(transactionId),
    },
  });

const getTransactionResult = async (
  transactionApi: TransactionApi,
  transactionId: Uint8Array,
): Promise<TransactionCommittedDetailsResponse> =>
  transactionApi.transactionCommittedDetails({
    transactionCommittedDetailsRequest: {
      intent_hash_hex: Convert.Uint8Array.toHexString(transactionId),
    },
  });

// not working. errors out due to missing owner role. unsure how to fix.
const createFungibleResource = async (
  prvKey: PrivateKey.IPrivateKey,
  txApi: TransactionApi,
  statusApi: StatusApi,
  tkName: string,
  tkSymbol: string,
  receiver: string,
) => {
  const manifest = new ManifestBuilder()
    .createFungibleResourceWithInitialSupply(
      new ManifestAstValue.Bool(true),  
      new ManifestAstValue.U8(1),
      new ManifestAstValue.Map(
        ManifestAstValue.Kind.String,
        ManifestAstValue.Kind.String,
        [
          [new ManifestAstValue.String("name"), new ManifestAstValue.String(tkName)],
          [new ManifestAstValue.String("symbol"), new ManifestAstValue.String(tkSymbol)],
        ] 
      ),
      new ManifestAstValue.Map(
        ManifestAstValue.Kind.Enum,
        ManifestAstValue.Kind.Tuple,
        []
      ),
      new ManifestAstValue.Decimal(50)
    )
    .callMethod(receiver, "try_deposit_batch_or_abort", [
      ManifestAstValue.Expression.entireWorktop()
    ])
    .build()
  let currentEpoch = await getCurrentEpoch(statusApi);
  let txHeader = new TransactionHeader(
    NetworkId.Ansharnet,
    currentEpoch,
    currentEpoch + 50,
    generateRandomNonce(),
    prvKey.publicKey(),
    false,
    0,
  );
  let tx = await TransactionBuilder.new().then((builder) =>
    builder.header(txHeader).manifest(manifest).notarize(prvKey),
  );
  // console.log(tx.toString())
  // process.exit(0)
  let txCompiled = await tx.compile();
  console.log(tx.toString())
  await submitTransaction(txApi, txCompiled);
  return await tx.transactionId();
}

const submitFaucetTransaction = async (
  prvKey: PrivateKey.IPrivateKey,
  txApi: TransactionApi,
  statusApi: StatusApi,
) => {
  let pubKey = prvKey.publicKey();
  let myAddress = await ManifestAstValue.Address.virtualAccountAddress(
    pubKey,
    NetworkId.Ansharnet,
  );
  let faucetComponentAddress =
    await ManifestAstValue.Address.faucetComponentAddress(NetworkId.Ansharnet);
  const fundManifest = new ManifestBuilder()
    .callMethod(faucet, "lock_fee", [new ManifestAstValue.Decimal(25)])
    .callMethod(faucet, "free", [])
    .callMethod(myAddress, "try_deposit_batch_or_abort", [
      ManifestAstValue.Expression.entireWorktop(),
    ])
    .build();
  let currentEpoch = await getCurrentEpoch(statusApi);
  let txHeader = new TransactionHeader(
    NetworkId.Ansharnet,
    currentEpoch,
    currentEpoch + 50,
    generateRandomNonce(),
    pubKey,
    false,
    0,
  );
  let tx = await TransactionBuilder.new().then((builder) =>
    builder.header(txHeader).manifest(fundManifest).notarize(prvKey),
  );
  let txCompiled = await tx.compile();
  await submitTransaction(txApi, txCompiled);
  return await tx.transactionId();
};

const getAddress = async (prvKey: PrivateKey.IPrivateKey) =>
  await ManifestAstValue.Address.virtualAccountAddress(
    prvKey.publicKey(),
    NetworkId.Ansharnet,
  );

const printAddresses = async () =>
  console.log(
    await (() => Promise.all(Object.entries(actors).map(([key, value]) => getAddress(value).then(a => [key, a])))
    )(),
  );

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const waitUntilSuccessfull: (
  txApi: TransactionApi,
  txId: Uint8Array,
) => Promise<TransactionStatusResponse> = async (txApi, txId) =>
  getTransactionStatus(txApi, txId).then((txStatus) =>
    txStatus.status == "Pending"
      ? delay(1000).then(() => {
          console.log(txStatus);
          return waitUntilSuccessfull(txApi, txId);
        })
      : txStatus,
  );

const publishVote = async (
  prvKey: PrivateKey.IPrivateKey,
  txApi: TransactionApi,
  statusApi: StatusApi,
  voteCode: Uint8Array,
  voteSchema: Uint8Array,
) => {
  let pubKey = prvKey.publicKey();
  let myAddress = await ManifestAstValue.Address.virtualAccountAddress(
    pubKey,
    NetworkId.Ansharnet,
  );
  const manifest = new ManifestBuilder()
    .callMethod(myAddress, "lock_fee", [new ManifestAstValue.Decimal(25)])
    .publishPackage(
      voteCode,
      voteSchema,
      new ManifestAstValue.Map(
        ManifestAstValue.Kind.String,
        ManifestAstValue.Kind.Tuple,
      ),
    )
    .callMethod(myAddress, "try_deposit_batch_or_abort", [
      ManifestAstValue.Expression.entireWorktop(),
    ])
    .build();
  let currentEpoch = await getCurrentEpoch(statusApi);
  let txHeader = new TransactionHeader(
    NetworkId.Ansharnet,
    currentEpoch,
    currentEpoch + 50,
    generateRandomNonce(),
    pubKey,
    false,
    0,
  );
  let tx = await TransactionBuilder.new().then((builder) =>
    builder.header(txHeader).manifest(manifest).notarize(prvKey),
  );
  let txCompiled = await tx.compile();
  await submitTransaction(txApi, txCompiled);
  return await tx.transactionId();
};

const submitInitVote = async (
  prvKey: PrivateKey.IPrivateKey,
  txApi: TransactionApi,
  statusApi: StatusApi,
  votePackageAddr: string,
) => {
  let pubKey = prvKey.publicKey();
  let myAddress = await ManifestAstValue.Address.virtualAccountAddress(
    pubKey,
    NetworkId.Ansharnet,
  );
  const manifest = new ManifestBuilder()
    .callMethod(myAddress, "lock_fee", [new ManifestAstValue.Decimal(25)])
    .callFunction(votePackageAddr, "Vote", "instantiate_vote", [
      new ManifestAstValue.String("Test Org 1"),
    ])
    .callMethod(myAddress, "try_deposit_batch_or_abort", [
      ManifestAstValue.Expression.entireWorktop(),
    ])
    .build();
  let currentEpoch = await getCurrentEpoch(statusApi);
  let txHeader = new TransactionHeader(
    NetworkId.Ansharnet,
    currentEpoch,
    currentEpoch + 50,
    generateRandomNonce(),
    pubKey,
    false,
    0,
  );
  let tx = await TransactionBuilder.new().then((builder) =>
    builder
      .header(txHeader)
      .manifest(manifest)
      // admin needs to be a signer for the Account to allow 'lock_fee'
      .sign(prvKey)
      .notarize(prvKey),
  );
  let txCompiled = await tx.compile();
  await submitTransaction(txApi, txCompiled);
  return await tx.transactionId();
};

const becomeMember = async (
  prvKey: PrivateKey.IPrivateKey,
  txApi: TransactionApi,
  statusApi: StatusApi,
  voteComponentAddr: string,
  adminResourceAddr: string,
  userAddr: ManifestAstValue.Address,
) => {
  let pubKey = prvKey.publicKey();
  let myAddress = await ManifestAstValue.Address.virtualAccountAddress(
    pubKey,
    NetworkId.Ansharnet,
  );
  const manifest = new ManifestBuilder()
    .callMethod(faucet, "lock_fee", [new ManifestAstValue.Decimal(25)])
    .callMethod(myAddress, "create_proof_of_amount", [
      new ManifestAstValue.Address(adminResourceAddr),
      new ManifestAstValue.Decimal(1),
    ])
    .callMethod(voteComponentAddr, "become_member", [])
    .callMethod(userAddr, "try_deposit_batch_or_abort", [
      ManifestAstValue.Expression.entireWorktop(),
    ])
    .build();
  let currentEpoch = await getCurrentEpoch(statusApi);
  let txHeader = new TransactionHeader(
    NetworkId.Ansharnet,
    currentEpoch,
    currentEpoch + 50,
    generateRandomNonce(),
    pubKey,
    false,
    0,
  );
  let tx = await TransactionBuilder.new().then((builder) =>
    builder
      .header(txHeader)
      .manifest(manifest)
      // admin needs to be a signer for the Account to allow 'lock_fee'
      .sign(prvKey)
      .notarize(prvKey),
  );
  let txCompiled = await tx.compile();
  await submitTransaction(txApi, txCompiled);
  return await tx.transactionId();
};

const main = async () => {
  const apiCfg = new Configuration({
    basePath: gatewayBaseUrl,
  });
  const statusApi = new StatusApi(apiCfg);
  const txApi = new TransactionApi(apiCfg);
  const streamApi = new StreamApi(apiCfg);
  const stateApi = new StateApi(apiCfg);

  // const coreClient = await CoreApiClient.initialize({
  //   basePath: "http://127.0.0.1:3333/core",
  //   logicalNetworkName: "ansharnet",
  // });

  printAddresses();

  // const r = await coreClient.state.innerClient.stateAccountPost({
  //   stateAccountRequest: {
  //     network: "ansharnet",
  //     account_address:(await getAddress(actors.user1)).value,
  //   }
  // })

  const entityDetails = await stateApi.stateEntityDetails({
    stateEntityDetailsRequest: {
      addresses: [
        // "resource_tdx_d_1n2p5gq2f7g00ag2ndug0983s2xy7kq8esdvumf3mvelt5kn7jehr8v",
        "account_tdx_d_12xs46zcft32snejqeh5q3kudppna7vx4eu6rjqdnk70sazgrx3nppp",
        (await getAddress(actors.user1)).value,
        (await getAddress(actors.user2)).value,
        (await getAddress(actors.admin)).value,
      ]
    }
  })

  const entityNonFungiblePaged = await stateApi.entityNonFungiblesPage({
    stateEntityNonFungiblesPageRequest: {
      address: (await getAddress(actors.user1)).value,
    },
  });

  const nonFungibleIds = await stateApi.nonFungibleIds({
    stateNonFungibleIdsRequest: {
      resource_address: "resource_tdx_d_1n2p5gq2f7g00ag2ndug0983s2xy7kq8esdvumf3mvelt5kn7jehr8v",
    }
  })

  const nonFungibleData = await stateApi.nonFungibleData({
    stateNonFungibleDataRequest: {
      resource_address: "resource_tdx_d_1n2p5gq2f7g00ag2ndug0983s2xy7kq8esdvumf3mvelt5kn7jehr8v",
      non_fungible_ids: [
        "{7e8bdbd2cf231059-7ba24f1c2b6ff067-89c58903e50e160b-e0f6b57e292d90b7}"
      ]
    }
  })

  // const cr = await createFungibleResource(actors.admin, txApi, statusApi, "SnapshotGov1", "SG1", "account_tdx_d_12yy5c6um2nlhnkp504ul3dq62ecv29g3tmpzj2l56w7lfdhcgwqf35")


  // publish package, initialise vote, become member
  // let txId = await publishVote(actors.admin, txApi, statusApi, voteCode, voteSchema);
  // let txId = await submitInitVote(actors.admin, txApi, statusApi, votePackageAddr);
  // let txId = await becomeMember(actors.admin, txApi, statusApi, voteComponentAddr, adminVoteResourceAddr, await getAddress(actors.user1));
  // waitUntilSuccessfull(txApi, txId).then((txStatus) => console.log(txStatus))
};

main()
