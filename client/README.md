# Radix Simple Vote Frontend 

This is a frontend for interacting with the ["Simple Vote"
blueprint](https://github.com/radixdlt/community-scrypto-examples/pull/122) on
RCNet.

## How to use

Install it and run:

```sh
npm install
npm start
```

Then setup your environment for Radix development:

- Install the wallet and browser extension
  https://docs-babylon.radixdlt.com/main/getting-started-developers/wallet/wallet-and-connecter-installation.html

Then:

- Open the url shown from `npm start` in the browser with the Radix extension
- Click the "Connect" button and keep the wallet open on your phone to respond to
  transaction signing requests
- The app will show different buttons based on the state of the vote on chain,
  starting with a button to instantiate a new vote component

Note:

- The vote blueprint is already deployed on RCNet and the package address is
  hard-coded into the app

## References

- TailwindCSS+Material UI+Create React App template from https://github.com/mui/material-ui/tree/master/examples/base-cra-tailwind-ts
- Radix+React from https://github.com/radixdlt/react-connect-button 
