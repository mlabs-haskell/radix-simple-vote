import {
    AppBar,
    Button,
    CssBaseline,
    FormControl,
    FormControlLabel,
    FormHelperText,
    FormLabel,
    MenuItem,
    Radio,
    RadioGroup,
    Select,
    TextField,
    Toolbar,
} from '@mui/material'
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
import { Fragment, useState, useEffect } from 'react'
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

type Account = {
    address: string
    label: string
    appearanceId: number
}

/*
* TODO:
- Allow entering an organization name
- Show past votes results
- Add check for whether the user has already voted
- Error if a vote with the given name already exists
- Add timer to automatically refresh when vote ends 
*/
function App() {
    const packageAddr =
        'package_tdx_c_1qz0z9jwx72qsu7qe47te65fl24m6ms42nl92sylhjs6s905cce'
    const gatewayApi = GatewayApiClient.initialize({
        basePath: 'https://rcnet.radixdlt.com',
    })
    const { transaction, state } = gatewayApi

    const accounts: Account[] = useAccounts()
    const persona = usePersona()
    const requestData = useRequestData()
    const connected = useConnected()
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

    const [voteChoice, setVoteChoice] = useState<number | null>(null)
    const [voteChoiceError, setVoteChoiceError] = useState<string | null>(null)

    const [voteName, setVoteName] = useState<string>('')
    const [voteDuration, setVoteDuration] = useState<number>(5)

    const [accountId, setAccountId] = useState<number | undefined>()
    const [adminAccount, setAdminAccount] = useState<Account | undefined>()
    useEffect(() => {
        if (accounts.length > 0) {
            setAccountId((v) =>
                typeof v !== 'undefined' ? v : accounts[0].appearanceId
            )
        }
    }, [accounts])
    const account = accounts.find((v) => v.appearanceId === accountId)!

    useEffect(() => {
        if (typeof accountId !== 'undefined') updateIsMember()
    }, [accountId])

    const orgName = 'Test Org'
    let instantiateManifest: string
    let becomeMemberManifest: string
    let newVoteManifest: string
    let voteManifest: string
    let endVoteManifest: string
    if (connected && account) {
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
    if (connected && componentAddr && adminBadge && memberBadge && account) {
        if (adminAccount) {
            becomeMemberManifest = new ManifestBuilder()
                .callMethod(adminAccount.address, 'create_proof_by_amount', [
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
                .callMethod(adminAccount.address, 'create_proof_by_amount', [
                    Address(adminBadge),
                    Decimal(1),
                ])
                .callMethod(componentAddr, 'new_vote', [
                    String(voteName),
                    I64(voteDuration.toString()),
                ])
                .build()
                .toString()
        }
        voteManifest = new ManifestBuilder()
            .callMethod(account.address, 'create_proof_by_amount', [
                Address(memberBadge),
                Decimal(1),
            ])
            .popFromAuthZone('memberProof')
            .callMethod(componentAddr, 'vote', [
                Enum(voteChoice!),
                Proof('memberProof'),
            ])
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
        setAdminAccount(account)
    }

    /**
     * @returns true if the current account is a member
     */
    async function updateIsMember() {
        const accountResources = await state.getEntityDetailsVaultAggregated(
            account.address
        )
        console.log('Account resources:', accountResources)
        const non_fungible_resources = accountResources.non_fungible_resources
            .items as unknown as NonFungibleResource[]
        const memberResource = non_fungible_resources.find(
            (v) =>
                v.resource_address == memberBadge &&
                v.vaults.items.find((vault) => Number(vault.total_count) > 0)
        )
        const _isMember = typeof memberResource !== 'undefined'
        setIsMember(_isMember)
        return _isMember
    }

    async function becomeMember() {
        const _isMember = await updateIsMember()
        if (_isMember) {
            alert('You are already a member!')
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
        if (!voteName) {
            alert('Vote must have a name')
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
        if (!voteInProgress || new Date() >= voteEndTime) {
            alert('No active vote!')
            return
        }
        setCurrentTime(new Date())
        if (voteChoice === null) {
            setVoteChoiceError('Please select a voting option')
            return
        }
        setVoteChoiceError(null)
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

    const voteChoiceForm = (
        <FormControl>
            <FormLabel id='vote-choice-form'>Place your vote</FormLabel>
            <RadioGroup
                row
                aria-labelledby='vote-choice-form'
                name='radio-buttons-group'
                value={voteChoice}
                onChange={(event) => {
                    setVoteChoice(
                        Number((event.target as HTMLInputElement).value)
                    )
                }}
            >
                <FormControlLabel value={0} control={<Radio />} label='Yes' />
                <FormControlLabel value={1} control={<Radio />} label='No' />
            </RadioGroup>
            <FormHelperText>{voteChoiceError}</FormHelperText>
            <Button
                variant='contained'
                sx={{ my: 1 }}
                onClick={vote}
                disabled={voteChoice === null}
            >
                Vote
            </Button>
        </FormControl>
    )

    const newVoteForm = (
        <FormControl className='max-w-sm'>
            <FormLabel id='vote-name-input'>Give a name to the vote</FormLabel>
            <TextField
                aria-labelledby='vote-name-input'
                required
                error={!voteName}
                value={voteName}
                onChange={(event) => {
                    setVoteName((event.target as HTMLInputElement).value)
                }}
            />
            <FormHelperText>
                {voteName ? '' : 'Vote must have a name'}
            </FormHelperText>
            <FormLabel id='vote-duration-input'>
                Set the vote duration in minutes (minimum 2)
            </FormLabel>
            <TextField
                aria-labelledby='vote-duration-input'
                type='number'
                value={voteDuration}
                onChange={(event) => {
                    const val = Number((event.target as HTMLInputElement).value)
                    if (val >= 2) setVoteDuration(val)
                }}
            />
            <Button
                sx={{ my: 1 }}
                variant='contained'
                onClick={newVote}
                disabled={!voteName}
            >
                Start vote
            </Button>
            <FormHelperText>
                Note: you must use the account which instantiated the component
                (the account with the admin badge)
            </FormHelperText>
        </FormControl>
    )

    const accountSelectForm = typeof accountId !== 'undefined' && (
        <FormControl>
            <FormLabel id='account-select-input'>Select an account</FormLabel>
            <Select
                aria-labelledby='account-select-input'
                value={accountId}
                onChange={async (event) => {
                    setAccountId(
                        Number((event.target as HTMLInputElement).value)
                    )
                }}
            >
                {accounts.map((a) => (
                    <MenuItem key={a.appearanceId} value={a.appearanceId}>
                        {a.label} ({a.address})
                    </MenuItem>
                ))}
            </Select>
            <FormHelperText>
                All actions will use this account. Use the Connect button in the
                top right to add more accounts.
            </FormHelperText>
        </FormControl>
    )

    const userDataDisplay = (
        <div className='flex justify-between mb-5'>
            <div className='mb-3'>
                <h2>
                    <b>Persona</b>: {persona?.label} <br />{' '}
                    {persona.data?.map((v) => (
                        <Fragment key={v.field}>
                            {' '}
                            <b>{v.field}</b>: {v.value}{' '}
                        </Fragment>
                    ))}
                </h2>
            </div>
            <div className='mb-3'>
                <b>Accounts:</b>
                {accounts.map((account) => (
                    <div key={account.appearanceId}>{account.label}</div>
                ))}
            </div>
            <div className=''>
                <Button variant='outlined' onClick={requestUserDetails}>
                    Request data
                </Button>
            </div>
        </div>
    )

    const voteInProgressDisplay = (
        <>
            <h3 className='text-xl font-medium mb-5'>Vote Status</h3>
            <p>
                <b>
                    A vote "{voteStatus?.name}" has been created, it{' '}
                    {voteEndTimePassed ? 'ended' : 'will end at'}{' '}
                    {voteEndTime?.toString()}
                    <br />
                    {voteEndTimePassed &&
                        'Click below to save the vote result to an NFT in the component, and allow starting a new vote'}
                    <br />
                    Yes votes: {voteStatus?.yesVotes}
                    <br />
                    No votes: {voteStatus?.noVotes}
                </b>
            </p>
            {voteEndTimePassed ? (
                <Button variant='contained' onClick={endVote}>
                    End the vote
                </Button>
            ) : (
                <div className='my-5'>{voteChoiceForm}</div>
            )}
            <Button
                variant='contained'
                onClick={async () => {
                    await updateVoteStatus()
                    setCurrentTime(new Date())
                }}
            >
                Refresh
            </Button>
        </>
    )

    const voteInstantiatedDisplay = (
        <>
            <div className='mb-5'>
                <p>
                    <b>Vote Instantiated for organization {orgName}!</b>
                </p>
                <p>Vote component: {componentAddr}</p>
                <p>Member badge: {memberBadge}</p>
            </div>
            {isMember ? (
                <>{voteInProgress ? voteInProgressDisplay : newVoteForm}</>
            ) : (
                <Button variant='contained' onClick={becomeMember}>
                    Become voting member
                </Button>
            )}
        </>
    )

    const walletConnectedDisplay = (
        <>
            <h2 className='text-2xl font-medium mb-5'>User Data</h2>
            {userDataDisplay}
            <h2 className='text-2xl font-medium mb-5'>Vote</h2>
            <div className='my-5'>{accountSelectForm}</div>
            {voteInstantiated ? (
                voteInstantiatedDisplay
            ) : (
                <Button variant='contained' onClick={instantiateVote}>
                    Instantiate new vote component
                </Button>
            )}
        </>
    )

    return (
        <CssBaseline>
            <AppBar className='mb-5 w-screen' position='sticky'>
                <Toolbar
                    className='w-full max-w-4xl mx-auto'
                    sx={{ p: { sm: 0 } }}
                >
                    <h1 className='text-3xl font-medium grow'>
                        Radix Simple Vote
                    </h1>
                    <radix-connect-button />
                </Toolbar>
            </AppBar>
            <div className='max-w-4xl mx-auto mb-96'>
                <p className='mb-10'>
                    If you haven't already,{' '}
                    <a
                        href='https://docs-babylon.radixdlt.com/main/getting-started-developers/wallet/wallet-and-connecter-installation.html'
                        className='text-blue-500'
                    >
                        install the wallet and browser extension
                    </a>{' '}
                    to use this app, then click the connect button in the top
                    right. Note that you may have to open and close the wallet
                    app sometimes if transactions aren't showing up.
                </p>
                {connected ? walletConnectedDisplay : null}
            </div>
        </CssBaseline>
    )
}

export default App
