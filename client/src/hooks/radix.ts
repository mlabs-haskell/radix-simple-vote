import { useContext, useEffect, useState, useCallback } from 'react'
import { State, DataRequestInput } from '@radixdlt/radix-dapp-toolkit'

import { RdtContext } from '../rdt-context'

export const useSendTransaction = () => {
    const rdt = useRdt()!

    return useCallback(
        (transactionManifest: string) => {
            console.log('Sending transaction: ', transactionManifest);
            
            return rdt.sendTransaction({ transactionManifest, version: 1 })
        },
        [rdt]
    )
}

export const useRequestData = () => {
    const rdt = useRdt()!

    return useCallback(
        (value: DataRequestInput) => rdt.requestData(value),
        [rdt]
    )
}

export const usePersona = () => {
    const state = useRdtState()

    return {
        ...state?.persona,
        data: state?.personaData,
    }
}

export const useConnected = () => {
    const state = useRdtState()

    return state?.connected ?? false
}

export const useAccounts = () => {
    const state = useRdtState()

    return state?.accounts ?? []
}

export const useRdtState = () => {
    const rdt = useRdt()
    const [state, setState] = useState<State>()

    useEffect(() => {
        const subscription = rdt?.state$.subscribe((state) => {
            setState(state)
        })

        return () => {
            subscription?.unsubscribe()
        }
    })

    return state
}

export const useRdt = () => {
    const rdt = useContext(RdtContext)

    return rdt
}
