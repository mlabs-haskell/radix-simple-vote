import { Button, CssBaseline } from '@mui/material'
import {
    Address,
    String,
    Decimal,
    Expression,
    I64,
    ManifestBuilder,
    Enum,
    Proof,
} from '@radixdlt/radix-dapp-toolkit'
import { Fragment, useState } from 'react'
import {
    FungibleResourcesCollectionItem as NonFungibleResourcesCollectionItem,
    GatewayApiClient,
    StateEntityDetailsResponseItem,
} from '@radixdlt/babylon-gateway-api-sdk'
import {
    useAccounts,
    useRequestData,
    useConnected,
    useSendTransaction,
    usePersona,
} from './hooks/radix'

declare global {
    namespace JSX {
        interface IntrinsicElements {
            'radix-connect-button': React.DetailedHTMLProps<
                React.HTMLAttributes<HTMLElement>,
                HTMLElement
            >
        }
    }
}

type DataJsonField =
    | { kind: 'String'; value: string }
    | { kind: 'U64'; value: string }
    | { kind: 'I64'; value: string }
    | { kind: 'Tuple'; fields: DataJsonField[] }
    | { kind: 'Enum'; fields: DataJsonField[]; variant_id: number }
    | { kind: 'Address'; value: string }
    | { kind: 'Own'; value: string }

type NonFungibleResource = NonFungibleResourcesCollectionItem & {
    vaults: {
        items: {
            vault_address: string
            total_count: string
        }[]
    }
}

interface VoteStatus {
    yesVotes: number
    noVotes: number
    name: string
    end: Date
}

/*
* TODO:
- Allow entering an organization name
- Allow switching accounts to vote multiple times
- Show past votes results
- Allow choosing which way to vote
- Add check for whether the user has already voted
- Allow setting the name of the vote, and error if a vote with the given name
  already exists
- Allow setting the duration of the vote
- Add timer to automatically refresh when vote ends 
*/
function App() {
    const packageAddr =
        'package_tdx_c_1qz0z9jwx72qsu7qe47te65fl24m6ms42nl92sylhjs6s905cce'
    const gatewayApi = GatewayApiClient.initialize({
        basePath: 'https://rcnet.radixdlt.com',
    })
    const { transaction, state } = gatewayApi

    const accounts = useAccounts()
    const persona = usePersona()
    const requestData = useRequestData()
    const connected = useConnected()
    const account = accounts[0]
    const sendTransaction = useSendTransaction()

    const [componentAddr, setComponentAddr] = useState<string | undefined>()
    const [componentBadge, setComponentBadge] = useState<string | undefined>()
    const [adminBadge, setAdminBadge] = useState<string | undefined>()
    const [memberBadge, setMemberBadge] = useState<string | undefined>()
    const [voteResultsAddr, setVoteResultsAddr] = useState<string | undefined>()
    const voteInstantiated = [
        componentAddr,
        componentBadge,
        adminBadge,
        memberBadge,
        voteResultsAddr,
    ].every((v) => typeof v === 'string' && v.length > 0)

    const [isMember, setIsMember] = useState(false)
    const [voteStatus, setVoteStatus] = useState<VoteStatus | undefined>()
    const [currentTime, setCurrentTime] = useState<Date>(new Date())
    const voteEndTime = voteStatus?.end
    const voteInProgress = typeof voteEndTime !== 'undefined'
    const voteEndTimePassed = voteInProgress ? currentTime > voteEndTime : false

    const orgName = 'Test Org'
    let instantiateManifest: string
    let becomeMemberManifest: string
    let newVoteManifest: string
    let voteManifest: string
    let endVoteManifest: string
    if (connected) {
        instantiateManifest = new ManifestBuilder()
            .callFunction(packageAddr, 'Vote', 'instantiate_vote', [
                String(orgName),
            ])
            .callMethod(account.address, 'deposit_batch', [
                Expression('ENTIRE_WORKTOP'),
            ])
            .build()
            .toString()
    }
    if (connected && componentAddr && adminBadge && memberBadge) {
        becomeMemberManifest = new ManifestBuilder()
            .callMethod(account.address, 'create_proof_by_amount', [
                Address(adminBadge),
                Decimal(1),
            ])
            .callMethod(componentAddr, 'become_member', [])
            .callMethod(account.address, 'deposit_batch', [
                Expression('ENTIRE_WORKTOP'),
            ])
            .build()
            .toString()
        newVoteManifest = new ManifestBuilder()
            .callMethod(account.address, 'create_proof_by_amount', [
                Address(adminBadge),
                Decimal(1),
            ])
            .callMethod(componentAddr, 'new_vote', [
                String('New Vote'),
                I64('2'),
            ])
            .build()
            .toString()
        voteManifest = new ManifestBuilder()
            .callMethod(account.address, 'create_proof_by_amount', [
                Address(memberBadge),
                Decimal(1),
            ])
            .popFromAuthZone('memberProof')
            .callMethod(componentAddr, 'vote', [Enum(0), Proof('memberProof')])
            .build()
            .toString()
        endVoteManifest = new ManifestBuilder()
            .callMethod(componentAddr, 'end_vote', [])
            .build()
            .toString()
    }

    async function requestUserDetails() {
        await requestData({
            accounts: {
                quantifier: 'atLeast',
                quantity: 1,
                oneTime: false,
            },
            personaData: { oneTime: false, fields: ['givenName'] },
        })
    }

    async function instantiateVote() {
        const result = await sendTransaction(instantiateManifest)
        console.log('Transaction result: ', result)
        if (result.isErr()) throw result.error
        const tx = result.value.transactionIntentHash
        // '1fb3a7bee6691cf25a88fa66e8c2e969a75fe0d20b7b06d1d3a3498a77523566'
        const status = await transaction.getStatus(tx)
        console.log('Instantiate TransactionApi transaction/status:', status)

        const commitReceipt = await transaction.getCommittedDetails(tx)
        console.log('Instantiate Committed Details Receipt', commitReceipt)

        console.log(
            'Component address:',
            commitReceipt.details.referenced_global_entities[0]
        )
        const entities = await state.getEntityDetailsVaultAggregated(
            commitReceipt.details.referenced_global_entities
        )
        console.log('Entity details:', entities)
        setComponentAddr(
            entities.find((v) => v.details?.type === 'Component')?.address
        )
        const metadataNameIs =
            (name: string) => (v: StateEntityDetailsResponseItem) =>
                v.metadata.items.find((m) => m.key === 'name')?.value
                    .as_string === name
        setAdminBadge(
            entities.find(metadataNameIs(`${orgName} Vote Admin`))?.address
        )
        setComponentBadge(
            entities.find(metadataNameIs(`${orgName} Component`))?.address
        )
        setMemberBadge(
            entities.find(metadataNameIs(`${orgName} Voting Member`))?.address
        )
        setVoteResultsAddr(
            entities.find(metadataNameIs(`${orgName} Vote Result`))?.address
        )
    }

    async function becomeMember() {
        const accountResources = await state.getEntityDetailsVaultAggregated(
            account.address
        )
        console.log(accountResources)
        const non_fungible_resources = accountResources.non_fungible_resources
            .items as unknown as NonFungibleResource[]
        const memberResource = non_fungible_resources.find(
            (v) =>
                v.resource_address == memberBadge &&
                v.vaults.items.find((vault) => Number(vault.total_count) > 0)
        )
        if (typeof memberResource !== 'undefined') {
            alert('You are already a member!')
            setIsMember(true)
            return
        }
        const result = await sendTransaction(becomeMemberManifest)
        console.log('Transaction result: ', result)
        if (result.isErr()) throw result.error
        const tx = result.value.transactionIntentHash
        const commitReceipt = await transaction.getCommittedDetails(tx)
        console.log('Become Member Committed Details Receipt', commitReceipt)
        setIsMember(true)
    }

    /** Updates the state with the current vote status, returns true if a vote
     * is in progress */
    async function updateVoteStatus(): Promise<boolean> {
        if (typeof componentAddr === 'undefined') {
            throw new Error('Vote component address not available')
        }
        const componentResources = await state.getEntityDetailsVaultAggregated(
            componentAddr
        )
        type ComponentDetails = {
            state: { data_json: { fields: DataJsonField[] } }
        }
        const details = componentResources.details as
            | ComponentDetails
            | undefined
        const fields = details?.state.data_json.fields
        const currentVote = fields?.[1]
        if (
            typeof details === 'undefined' ||
            fields?.length != 6 ||
            currentVote?.kind !== 'Enum'
        ) {
            throw new Error('Invalid vote component details')
        }
        console.log(
            'Current vote data:',
            currentVote.fields,
            currentVote.variant_id
        )

        // Check for "None" Rust "Option" variant
        if (currentVote.variant_id !== 0) {
            const currentVoteData = currentVote.fields[0]
            if (
                currentVoteData.kind !== 'Tuple' ||
                currentVoteData.fields.length !== 4 ||
                currentVoteData.fields[0].kind !== 'U64' ||
                currentVoteData.fields[1].kind !== 'U64' ||
                currentVoteData.fields[2].kind !== 'String' ||
                currentVoteData.fields[3].kind !== 'Tuple' ||
                currentVoteData.fields[3].fields.length !== 1 ||
                currentVoteData.fields[3].fields[0].kind !== 'I64'
            ) {
                throw new Error('Invalid vote component details')
            }
            setVoteStatus({
                yesVotes: Number(currentVoteData.fields[0].value),
                noVotes: Number(currentVoteData.fields[1].value),
                name: currentVoteData.fields[2].value,
                end: new Date(
                    Number(currentVoteData.fields[3].fields[0].value) * 1000
                ),
            })

            return true
        }
        return false
    }

    async function newVote() {
        const voteInProgress = await updateVoteStatus()
        if (voteInProgress) {
            alert('Vote is already in progress!')
            return
        }
        const result = await sendTransaction(newVoteManifest)
        console.log('Transaction result: ', result)
        if (result.isErr()) throw result.error
        const tx = result.value.transactionIntentHash
        const commitReceipt = await transaction.getCommittedDetails(tx)
        console.log('New Vote Committed Details Receipt', commitReceipt)
        await updateVoteStatus()
    }

    async function vote() {
        if (!voteInProgress || voteEndTimePassed) {
            alert('No active vote!')
            return
        }
        const result = await sendTransaction(voteManifest)
        console.log('Transaction result: ', result)
        if (result.isErr()) throw result.error
        const tx = result.value.transactionIntentHash
        const commitReceipt = await transaction.getCommittedDetails(tx)
        console.log('End Vote Committed Details Receipt', commitReceipt)
        await updateVoteStatus()
    }

    async function endVote() {
        const result = await sendTransaction(endVoteManifest)
        console.log('Transaction result: ', result)
        if (result.isErr()) throw result.error
        const tx = result.value.transactionIntentHash
        const commitReceipt = await transaction.getCommittedDetails(tx)
        console.log('End Vote Committed Details Receipt', commitReceipt)
        setVoteStatus(undefined)
    }

    return (
        <CssBaseline>
            <div className='max-w-4xl mx-auto'>
                <div className='flex bg-white my-7 flex-row justify-between'>
                    <h1 className='text-3xl font-medium'>Radix Simple Vote</h1>
                    <radix-connect-button />
                </div>
                {connected ? (
                    <Fragment>
                        <h2 className='text-2xl font-medium mb-5'>User Data</h2>
                        <div className='mb-3'>
                            <h2>
                                <b>Persona</b>: {persona?.label} <br />{' '}
                                {persona.data?.map((v) => (
                                    <Fragment>
                                        {' '}
                                        <b>{v.field}</b>: {v.value}{' '}
                                    </Fragment>
                                ))}
                            </h2>
                        </div>
                        <div className='mb-3'>
                            <b>Accounts:</b>
                            {accounts.map((account) => (
                                <div key={account.appearanceId}>
                                    {account.label}
                                </div>
                            ))}
                        </div>
                        <div className='mb-10'>
                            <Button
                                variant='contained'
                                onClick={requestUserDetails}
                            >
                                Request data
                            </Button>
                        </div>
                        {voteInstantiated ? (
                            <Fragment>
                                <h2 className='text-2xl font-medium mb-5'>
                                    Vote
                                </h2>
                                <div className='mb-5'>
                                    <p>
                                        <b>
                                            Vote Instantiated for organization{' '}
                                            {orgName}!
                                        </b>
                                    </p>
                                    <p>Vote component: {componentAddr}</p>
                                    <p>Member badge: {memberBadge}</p>
                                </div>
                                {isMember ? (
                                    <Fragment>
                                        {voteInProgress ? (
                                            <Fragment>
                                                <p>
                                                    <b>
                                                        A vote "
                                                        {voteStatus?.name}" has
                                                        been created, it{' '}
                                                        {voteEndTimePassed
                                                            ? 'ended'
                                                            : 'will end at'}{' '}
                                                        {voteEndTime.toString()}
                                                        <br />
                                                        Yes votes:{' '}
                                                        {voteStatus?.yesVotes}
                                                        <br />
                                                        No votes:{' '}
                                                        {voteStatus?.noVotes}
                                                    </b>
                                                </p>
                                                {voteEndTimePassed ? (
                                                    <Button
                                                        variant='outlined'
                                                        onClick={endVote}
                                                    >
                                                        End the vote
                                                    </Button>
                                                ) : (
                                                    <Fragment>
                                                        <Button
                                                            variant='outlined'
                                                            onClick={vote}
                                                        >
                                                            Vote
                                                        </Button>
                                                    </Fragment>
                                                )}
                                                <Button
                                                    variant='outlined'
                                                    onClick={async () => {
                                                        await updateVoteStatus()
                                                        setCurrentTime(
                                                            new Date()
                                                        )
                                                    }}
                                                >
                                                    Refresh
                                                </Button>
                                            </Fragment>
                                        ) : (
                                            <Button
                                                variant='outlined'
                                                onClick={newVote}
                                            >
                                                Start a vote
                                            </Button>
                                        )}
                                    </Fragment>
                                ) : (
                                    <Button
                                        variant='outlined'
                                        onClick={becomeMember}
                                    >
                                        Become voting member
                                    </Button>
                                )}
                            </Fragment>
                        ) : (
                            <Button
                                variant='outlined'
                                onClick={instantiateVote}
                            >
                                Instantiate new vote component
                            </Button>
                        )}
                    </Fragment>
                ) : null}
            </div>
        </CssBaseline>
    )
}

export default App
