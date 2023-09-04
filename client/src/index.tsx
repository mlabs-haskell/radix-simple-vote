import * as React from 'react'
import * as ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'
import { RdtProvider } from './providers/RdtProvider'
import { ApiService } from './services/api'
import {
    RadixDappToolkit,
} from '@radixdlt/radix-dapp-toolkit'
import { ApiProvider } from './providers/ApiProvider'

const dAppId =
    'account_tdx_d_128656c7vqkww07ytfudjacjh2snf9z8t6slfrz2n7p9kwaz2ewnjyv'

const rdt = RadixDappToolkit({
  dAppDefinitionAddress: dAppId,
  gatewayBaseUrl: 'https://rcnet-v3.radixdlt.com',
  networkId: 14,
  onDisconnect: () => console.log('Disconnected!'),
})

const apiService = ApiService("http://localhost:4000");

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(
    <React.StrictMode>
        <ApiProvider value={apiService}>
          <RdtProvider value={rdt}>
              <App />
          </RdtProvider>
        </ApiProvider>
    </React.StrictMode>
)
