import { ResultAsync } from 'neverthrow'
import { Db } from './db'
import { BalanceInfo, OwnerAddress, Snapshot, Snapshots, StateVersion, TokenAddress } from './types'
import { Row } from 'postgres'

export const initDbSnapshots =
  (sql: Db): Snapshots => {
    return {
      makeSnapshotV1: querySnapshotV1(sql),
      makeSnapshotV2: querySnapshotV2(sql)
    }
  }

const querySnapshotV1 = (sql: Db) => (tokenAddress: TokenAddress, stateVersion: StateVersion) => {
  const pendingQuery = sql`
      with token_res_id as (select id from entities where address = ${tokenAddress}),
           required_state as (select entity_id,
                              max(from_state_version) as state_version
                              from entity_resource_aggregated_vaults_history,
                                   token_res_id
                              where resource_entity_id = token_res_id.id
                                and from_state_version <= ${stateVersion} 
                              group by entity_id
                             )
      select eravh.from_state_version,
             eravh.entity_id,
             eravh.resource_entity_id,
             eravh.balance,
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
      .map((bs) => Snapshot.fromBalances(stateVersion, bs))

  return result
}

const querySnapshotV2 =
  (sql: Db) =>
    (tokenAddress: TokenAddress, stateVersion: StateVersion, owners: OwnerAddress[]) => {
      const pendingQuery = sql`
  with accounts_ids as (select id, address
                        from entities
                        where address in ${sql(owners)}
                       ),
       token_res_id as (select id
                        from entities
                        where address = ${tokenAddress}
                       ),
       required_state as (select entity_id,
                                 max(from_state_version) as state_version
                          from entity_resource_aggregated_vaults_history,
                               token_res_id
                          where resource_entity_id = token_res_id.id
                            and from_state_version <= ${stateVersion}
                            and entity_id in (select id from accounts_ids)
                          group by entity_id
                         )
       select eravh.from_state_version,
              eravh.entity_id          as owner_id,
              eravh.resource_entity_id as token_id,
              eravh.balance,
              accounts_ids.address as owner_address
       from required_state,
            entity_resource_aggregated_vaults_history eravh,
            token_res_id,
            accounts_ids
       where required_state.entity_id = eravh.entity_id
             and required_state.state_version = eravh.from_state_version
             and eravh.resource_entity_id = token_res_id.id
             and eravh.entity_id = accounts_ids.id
      `
      const result = //TODO: maybe verify, that all rows have same `resource_entity_id`, which represents current token
        ResultAsync.fromPromise(pendingQuery, (e: unknown) => e as Error)
          .map((rowList) =>rowList.map(dbRowToBalanceInfo(tokenAddress)))
          .map((bs) => Snapshot.fromBalances(stateVersion, bs))

      return result
    }

const dbRowToBalanceInfo = (tokenAddress: TokenAddress) => (row: Row): BalanceInfo => {
  return {
    tokenAddress: tokenAddress,
    ownerAddress: row.owner_address,
    fromStateVersion: row.from_state_version,
    balance: row.balance
  }
}


