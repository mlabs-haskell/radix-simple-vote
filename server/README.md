# Simple Snapshot Poll Server

## Introduction
This simple Snapshot Polling application is designed to demonstrate the implementation of off-ledger snapshot polling using [ROLA](https://github.com/radixdlt/rola-examples) (Radix off-ledger Authentication) for authentication and governance token verification. It enables users to create polls, cast votes, and close polls when necessary.

## Getting Started

To run the Radix Voting Application, follow these steps:

1. **Install Dependencies**: Make sure you have Node.js installed. Clone the application repository and navigate to the root directory. Run `npm install` to install the required dependencies.

2. **Configure SDKs**: In `index.ts`, configure the dApp definition address, expected origin, and gateway base URL.

3. **Run the Application**: Use the command `npm start` to launch the application.

## Endpoints

The Radix Voting Application provides the following endpoints for interaction:

- `GET /status`: Check the server status.

- `POST /create-poll`: Create a new poll.
    Sample request body:
    ```json
    {
        "orgName": "My Org",
        "title": "Poll Title",
        "description": "Poll Description",
        "voteTokenResource": "resource_tdx_d_1t564wm6t9tnvg2h448yz66wvwz8lu34r976a4s4qz5ncsasjde365j",
        "closes": 1693245126502
    }
    ```

- `GET /polls`: Get a list of all polls.

- `GET /close-poll/:id`: Close a poll and verify voters. This endpoint updates the poll's votes field by filtering out unverified votes.

- `GET /create-challenge`: Create a challenge to be signed by the wallet. This is the initial interaction for ROLA.

- `POST /verify-challenge`: Verify a challenge using the Radix Engine Toolkit.

- `POST /vote`: Verify a challenge alongside casting a vote for a poll.

## Playground
The playground contians some scripts and functions to query and/or create transaction manifests and submit them to the network. Examples includes, running a faucet transaction, querying entity details, creating and minting fungible resource etc. as well as initialisation of original on-chain components (not relevant to snapshot polling).
