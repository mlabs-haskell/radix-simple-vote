## Radix simple snapshot polling PoC

This repo is a cumulative developments and exploration of the radixdlt. The
purpose is to show case a prototype of off-ledger snapshot polling on the radix
network. It started off as an exploration of using on-ledger smart contracts from [radix-simple-vote](https://github.com/mlabs-haskell/radix-simple-vote) to
represent votes and evolved into off-ledger snapshot polls.

### Radix

Radix serves as the underlying distributed ledger technology for this project. As of the time of writing, the smart contract functionality scheduled for the Babylon release is exclusively accessible on the latest testnet (aka Ansharnet or RCnet-V2). To better understand and utilize Radix, consult the following relevant resources (in-order):

   1. [Radix Documentation](https://docs-babylon.radixdlt.com/main/index.html): The official Radix documentation provides comprehensive insights into the technology, its features, and its usage.
   2. [Scrypto](https://docs-babylon.radixdlt.com/main/scrypto/introduction.html): Although not mandatory for snapshot polling due to its off-ledger nature, the Scrypto section offers an excellent introduction and conceptual understanding of Radix's built-in components and workflows.
   3. [Transaction Manifests](https://docs-babylon.radixdlt.com/main/scrypto/introduction.html):  This section defines the specification for constructing transaction manifests. Transaction manifests consist of sequential instructions that enable a single transaction to execute multiple tasks or smart contract calls.
   4. [Radix Wallet](https://docs-babylon.radixdlt.com/main/getting-started-developers/wallet/wallet-overview.html) & [Mobile App and Browser Extension Installation](https://docs-babylon.radixdlt.com/main/getting-started-developers/wallet/wallet-and-connector-installation.html): The quickest way to set up a wallet with the testnet (RCnetV2 or Ansharnet) is to request and install the preview mobile wallet. Additionally, the Radix Connector extension facilitates communication between dApps and the wallet.
   5. [Radix dashboard](https://docs-babylon.radixdlt.com/main/getting-started-developers/radix-dashboard.html): Introduction and usage of the dashboard. The dashboard allows submission of transactions with arbitrary manifests and managing dApp definitions. It can also be employed as an explorer to investigate accounts, transactions, and resources.
   6. [Radixdlt discord](https://discord.com/invite/radixdlt): For information that may not be explicitly documented, you can often find insights within existing threads or directly inquire in the discord channel. The #scrypto channel is particularly suitable for addressing development-related questions.

The easiest way to interact with the radix network would be to use the provided typescript sdks:

   - [Radix engine toolkit](https://github.com/radixdlt/typescript-radix-engine-toolkit): This toolkit furnishes essential lower-level functionalities by wrapping the Rust Radix engine compiled to WebAssembly (WASM).
   - [Gateway SDK](https://github.com/radixdlt/babylon-gateway/tree/main/sdk/typescript): Wraps gateway API endpoints to submit and query the public gateway [Base URL](https://rcnet-v2.radixdlt.com) for the RCnetV2.
   - [Core API SDK](https://www.npmjs.com/package/@radixdlt/babylon-core-api-sdk): Wrap Core API endpoints for lower level queries directly to a running node. Use the [testnet-node docker compose](https://github.com/radixdlt/babylon-node/tree/main/testnet-node) to run a local node.
   - [Radix dApp toolkit](https://github.com/radixdlt/radix-dapp-toolkit): Intended for dApp front-ends. Wraps the gateway sdk and the connector browser extension to allow data requests and wallet interaction.


### Snapshot Polling

Snapshot polling is a governance mechanism predominantly executed off-ledger. It enables decentralized applications (dApps) to employ a specific token for vote verification during polling. The polling process is outlined as follows:

  * An administrator or user initiates a poll by defining the governance token and the time the poll will close.
  * Users holding the designated governance token can cast their votes and provide proof of their address ownership.
  * After reaching the designated close time, the poll concludes. Subsequently, the system checks the current ledger snapshot to validate that voters genuinely possess the specified governance token.
  * Post verification, a report is generated to display the final vote count and results.

### Development
To develop on this repo, a `flake.nix` is provided, put together from the [Nix wiki](https://nixos.wiki/wiki/Rust) to make available rust tooling for scrypto on-ledger development. It also provides NPM and nodejs for the typescript implementations of snapshot polling. Note that rust tooling is not required to run snapshot polling and any of the off-ledger code. For that the only dependency NodeJS and NPM.

### Structure

#### `client`
Conains the front-end for snapshot polling. Provides simple interface to create
polls, vote and close polls. Link to the connector extension for authentication
of accounts.
#### `server`
Contains the backend for snapshot polling. Responsible for management of polls,
authentication and voter verification.
#### `scrypto`
Contains on-ledger project adapted to scrypto v0.11.0 for an earlier implementation of on-ledger voting mechanism.
#### `manifests`
Contains `init.rtm` which has incomplete examples of transaction manifests to
initialise the on-ledger simple vote components.
