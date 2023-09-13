# Running stack for aggregation

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
