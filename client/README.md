# Simple Snapshot Poll Frontend 

Front-end for radix simple snapshot poll concept

## Setup

Install the wallet and browser extension
https://docs-babylon.radixdlt.com/main/getting-started-developers/wallet/wallet-and-connector-installation.html

## Development

With NodeJs and NPM installed, run:

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

Interface:
    AppBar buttons:
        - ROLA: Rola button is used to test the correct functioning of the [ROLA](https://github.com/radixdlt/rola-examples/tree/main) workflow
        - Connect: Used to connect the dApp, connector extension and the radix preview mobile wallet app
        - Refresh: Reload polls
        - ST: Check wether server is up
    Main:
        - Use the card on the left to create polls and post the to the back end.
        - Polls will show as cards on the right hand side. Submit votes by
pressing the 'yes' | 'no' buttons.
        - If a poll's closes timestamp has passed, the `Close` button can be used to close the vote, and verify voters

## Build

Build the production site:

```sh
npm run build
```

## References

- TailwindCSS+Material UI+Create React App template from https://github.com/mui/material-ui/tree/master/examples/base-cra-tailwind-ts
- Radix+React from https://github.com/radixdlt/react-connect-button 
