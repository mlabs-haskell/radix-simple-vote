import openConnection, { Db } from "./db";
import { initDbSnapshots } from "./db_snapshotter";
import { OwnerAddress, Snapshots, TokenAddress } from "./types";

/// Spams DB with requests.
/// For each request it takes some known token address and random subset of known account addresses
export async function spam(numOfRequests: number, delayMs: number) {
  const connection = openConnection();
  const snapshots = initDbSnapshots(connection);
  const v = 3297103;
  const tokenAddresses = await allFungibleAddresses(connection);
  const accounts = await allAccounts(connection);
  
  let stats: number[] = [];
  let requests = [];
  for (let i = 0; i < numOfRequests; i++) {
    const randomToken = randomElement(tokenAddresses);
    const addresses = randomSubarray(accounts);
    requests.push(timedRequest(i, snapshots, randomToken, v, addresses, stats));
    await sleep(delayMs);
  }

  // wait for all requests
  for (const r of requests) {
    await r;
  }
  connection.end()
  const avg = (stats.reduce((a, b) => a + b, 0)) / stats.length;
  console.log(`
    Spam stats for ${stats.length} requests with ${delayMs} ms delays
    Longest request: ${Math.max(...stats)}
    Fastest request: ${Math.min(...stats)}
    Average: ${avg}
    `)
}

async function timedRequest(
  reqId: number,
  snapshots: Snapshots,
  randomToken: TokenAddress,
  version: number,
  addresses: OwnerAddress[],
  stats: number[]) {
  var startTime = performance.now();
  const results = await snapshots.makeSnapshotV2(randomToken, version, addresses);
  if (results.isErr()) {
    throw new Error("DB query failed")
  }
  var execTime = performance.now() - startTime;
  stats.push(execTime)

  // console.log(`#${reqId}: Addresses size: ${addresses.length}, exec time:`, execTime);
}


async function allFungibleAddresses(sql: Db) {
  const q = sql`
  select distinct address
  from entities
  where discriminator = 'global_fungible_resource'
  `
  return (await q).map(r => r.address);
}

async function allAccounts(sql: Db) {
  const q = sql`
  select distinct address
  from entities
  where address like 'account%'
  `
  return (await q).map(r => r.address);
}

function randomSubarray(arr: any[]) {
  return arr
    .sort(() => 0.5 - Math.random())
    .slice(0, Math.floor(Math.random() * arr.length));
}

function randomElement(arr: any[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}