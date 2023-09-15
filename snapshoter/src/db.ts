import postgres from 'postgres'

export type Db = ReturnType<typeof openConnection>;

const openConnection = () => postgres({
  database: "radixdlt_ledger",
  user: "db_dev_superuser",
  password: "db_dev_password"
})

export default openConnection