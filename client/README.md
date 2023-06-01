# Radix Simple Vote Frontend 

This is a frontend for interacting with the ["Simple Vote"
blueprint](https://github.com/radixdlt/community-scrypto-examples/pull/122) on
RCNet.

## Demo

Follow the setup instructions below to install the wallet and browser extension,
then go to https://radix-simple-vote.netlify.app/ to try it out!

## Setup

Install the wallet and browser extension
https://docs-babylon.radixdlt.com/main/getting-started-developers/wallet/wallet-and-connecter-installation.html


## Development

Install it and run:

```sh
npm install
npm start
```

Follow the setup instructions above, then:

- Open the url shown from `npm start` in the browser with the Radix extension
- Click the "Connect" button and keep the wallet open on your phone to respond to
  transaction signing requests
- The app will show different buttons based on the state of the vote on chain,
  starting with a button to instantiate a new vote component

Note:

- The vote blueprint is already deployed on RCNet and the package address is
  hard-coded into the app

## Deploy

Build the production site:

```sh
npm run build
```

Deploy a preview with:

```sh
npx netlify deploy
```

Deploy to prod with:

```sh
npx netlify deploy --prod
```

## References

- TailwindCSS+Material UI+Create React App template from https://github.com/mui/material-ui/tree/master/examples/base-cra-tailwind-ts
- Radix+React from https://github.com/radixdlt/react-connect-button 
