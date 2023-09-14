# Snapshot data querying

> Misha's note: I was running stack in stages: first started the node and let it sync, then started rest of the stack with database and aggregator.

## Running aggregation stack

All commands and paths that will be mentioned below imply that we are currently in `snapshoter/deploy` directory.

`.env` and `docker-compose.yaml` files already configured for `zabanet` network - additional configuration should not be required.

It is possible to start the node with existing `ledger` database and avoid syncing from the beginning.

There are two database dumps available in [google drive](https://drive.google.com/drive/folders/1bLzKlFwpLzJFYr2HjRPEEfsfGIvOZZkb?usp=sharing):

- For the node - `node_ledger.zip`. It contains single directory `leger` that can be unzipped and placed into `./container-volumes/node` directory. Node container should pick it from there and start syncing from the state version somewhere around 3200000.
- For the aggregator Postgres database - `aggregator_db.tar.gz`. This is dump that was made with `pg_dump -F c`.

### Starting the node

```shell
docker compose --profile node up
```

It will create required directories is `./container-volumes/node`. If there is already `ledger` directory in `./container-volumes/node`, node will use data from there.

### Starting aggregation

```shell
docker compose --profile aggregation up
```

It will first start Postgres database, then run container that will perform required DB initialization, and if everything went OK, it will start aggregator container.

### Running DB only

To run only DB (e.g. for debugging):

```shell
docker compose --profile database up
```

## Working with own hosted database directly

Current WIP of getting desired data directly from the database is the following query:

```sql
with token_res_id as (select id
                      from entities
                      where address = ?),
     required_state as (select entity_id,
                              max(from_state_version) as state_version
                       from entity_resource_aggregated_vaults_history,
                            token_res_id
                       where resource_entity_id = token_res_id.id
                         and from_state_version <= ? -- 3293441 -- 3297103
                       group by entity_id)
select eravh.from_state_version,
       eravh.entity_id,
       eravh.resource_entity_id,
       eravh.balance,
       es.address
from entity_resource_aggregated_vaults_history eravh,
     entities es,
     required_state,
     token_res_id
where eravh.entity_id = required_state.entity_id
  and eravh.from_state_version = required_state.state_version
  and eravh.resource_entity_id = token_res_id.id
  and eravh.entity_id = es.id
order by from_state_version desc;
```
Where in place of `?` resource address and desired state version can be inserted accordingly. Filtering by address can be also added if needed, to reduce the amount of data to fetch.

This query should return all latest known balances for some token up to the state version specified by the user.

It gives output like this:
| from\_state\_version | entity\_id | resource\_entity\_id | balance | address |
| :--- | :--- | :--- | :--- | :--- |
| 3293441 | 9415 | 9420 | 4000000000000000000 | account\_tdx\_e\_129s9mvn2y6d9fdg8jmfk3utzz76ttkw4ph656g5rwg5zuahpmcxywz |
| 3293441 | 9727 | 9420 | 3000000000000000000 | account\_tdx\_e\_129e3tmjvyu0satgn033mqxtm5ywau8jk606rrxjxhjzmetvj4j43ng |
| 3287295 | 9786 | 9420 | 3000000000000000000 | account\_tdx\_e\_12953xu5wu3rlsl9dc7xdqw0zcnu2ryff9jxywjp69c2wgmcjnwek7a |
| 3248475 | 5814 | 9420 | 9000000000000000000 | account\_tdx\_e\_12xh6phmj4ngshz9nwncteqxjpslval00g32rxz2fhc6ce2v8t48200 |
| 3248475 | 5815 | 9420 | 9000000000000000000 | account\_tdx\_e\_12x8tszjk2m96xjtlgksnan0nv0wtefgvuepsn0rau49hxww7gpnl55 |
| 3248475 | 5816 | 9420 | 9000000000000000000 | account\_tdx\_e\_12y6mkylr8wudflrva8yeqwcn0lyv9q5ff8kcyr4rjw5wnl0kday5jp |
| 3248475 | 5817 | 9420 | 9000000000000000000 | account\_tdx\_e\_12xfav2w2z4073wj9fenppt3n9sfq5v7u3dxcd522xsk3d5sk8hmydt |
| 3248475 | 246 | 9420 | 0 | account\_tdx\_e\_169tc5ghq3zlz7hrmjr80w63lafehq3m8vhthp0l7a7hmy6ejvs3y3n |
| 3248475 | 5819 | 9420 | 9000000000000000000 | account\_tdx\_e\_12yfrc35qy5vwcy5rtlaadcdg8vy29h2ktaqlqw8e9gql8ac0fua6j5 |
| 3248475 | 5820 | 9420 | 9000000000000000000 | account\_tdx\_e\_12yeunuhfaullfugazu0lkyfrlj3neqssh0jyn4tucz4w6a9ym5zdnd |
| 3248475 | 5528 | 9420 | 9000000000000000000 | account\_tdx\_e\_1295y4zwa9hp5w4ffk3642l24rk2ex23uhuzlrtcfmudy8ccqzw0thg |
| 3248475 | 5818 | 9420 | 9000000000000000000 | account\_tdx\_e\_129kv7n4dlc0lhnuwpxsvdkccy9zgqy4j650tugel9gulhrs39ctcxf |
| 3248475 | 5812 | 9420 | 9000000000000000000 | account\_tdx\_e\_1299achkker3qzu362xlcry7h364955sakre0xvu9tv9gpu6x5ewzxj |
| 3248475 | 5813 | 9420 | 9000000000000000000 | account\_tdx\_e\_128emjdx9ctkjyc3d8qs50am2w6x6gc2d6yu6cwjwgfmnl8z26zaf25 |

Query breakdown:

- `token_res_id` sub-query is used to get internal database ID of the resource by specified address
- `required_state` sub-query is used to get the latest state of the balances of all token holders up to the state version specified by the user. As I understood, `entity_resource_aggregated_vaults_history` tracks all balance changes for each `address + token` pair. `entity_id` - is internal DB ID of the token holder address, and `resource_entity_id` is internal DB ID of the token address. Query gets all balances for all states for desired token, groups them by holder address (`entity_id`) and then for each group gets the result with maximum state version which should be the current state of the balance for the state version provided by the user.
- The rest of the query serves the purpose to enrich the data received from the `required_state` sub-query. It uses `address + token` pair from `required_state` to identify exact row in  `entity_resource_aggregated_vaults_history` and adds token holders addresses based on `entity_resource_aggregated_vaults_history.entity_id`

TODOs:
- [ ] return also token address instead of just `resource_entity_id`

## Working with own hosted Gateway

TBD