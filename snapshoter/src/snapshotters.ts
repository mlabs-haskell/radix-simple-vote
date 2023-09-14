import { ResultAsync } from 'neverthrow'
import { DbConnection } from './db'
import { BalanceInfo, Snapshot, Snapshots, StateVersion, TokenAddress } from './types'
import { Row } from 'postgres'

export const initDbSnapshots =
  (connection: DbConnection): Snapshots => {
    const querySnapshot = (tokenAddress: TokenAddress, stateVersion: StateVersion) => {
      const pendingQuery = connection`
      with token_res_id as (select id from entities where address = ${tokenAddress}),
           required_state as (select entity_id,
                         max(from_state_version) as state_version
                  from entity_resource_aggregated_vaults_history,
                       token_res_id
                  where resource_entity_id = token_res_id.id
                    and from_state_version <= ${stateVersion} 
                  group by entity_id)
      select eravh.from_state_version, eravh.entity_id, eravh.resource_entity_id,eravh.balance,
             es.address as owner_address
      from entity_resource_aggregated_vaults_history eravh,
           entities es,
           required_state,
           token_res_id
      where eravh.entity_id = required_state.entity_id
            and eravh.from_state_version = required_state.state_version
            and eravh.resource_entity_id = token_res_id.id
            and eravh.entity_id = es.id
      `
      const result = //TODO: maybe verify, that all rows have same `resource_entity_id`, which represents current token
        ResultAsync.fromPromise(pendingQuery, (e: unknown) => e as Error)
          .map((rowList) => rowList.map(dbRowToBalanceInfo(tokenAddress)))
          .map(Snapshot.fromBalances)

      return result
    }

    return {
      makeSnapshot: querySnapshot
    }
  }

const dbRowToBalanceInfo = (tokenAddress: TokenAddress) => (row: Row): BalanceInfo => {
  return {
    tokenAddress: tokenAddress,
    ownerAddress: row.owner_address,
    fromStateVersion: row.from_state_version,
    balance: row.balance
  }
}
