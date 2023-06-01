import * as React from 'react'
import * as ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'
import { RdtProvider } from './RdtProvider'
import {
    Expression,
    ManifestBuilder,
    RadixDappToolkit,
} from '@radixdlt/radix-dapp-toolkit'

const dAppId =
    'account_tdx_c_1p80kys4exr54xcezp7a5nzwmy8cnssdlnach2unu05yq2jmnpn'

const rdt = RadixDappToolkit(
    { dAppDefinitionAddress: dAppId, dAppName: 'Simple Vote' },
    (requestData) => {
        requestData({
            accounts: { quantifier: 'atLeast', quantity: 1 },
        }).map(({ data: { accounts } }) => {
            // add accounts to dApp application state
            console.log('account data: ', accounts)
        })
    },
    {
        networkId: 12, // 12 is for RCnet 01 for Mainnet
        onDisconnect: () => {
            console.log('Disconnected!')

            // clear your application state
        },
        onInit: ({ accounts }) => {
            // set your initial application state
            console.log('onInit accounts: ', accounts)
            if (accounts && accounts.length > 0) {
                console.log('Found account')
            }
        },
    }
)


const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(
    <React.StrictMode>
        <RdtProvider value={rdt}>
            <App />
        </RdtProvider>
    </React.StrictMode>
)
