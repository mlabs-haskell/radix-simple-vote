import openConnection from "./db";
import sql from "./db"
import { initDbSnapshots } from "./snapshotters"
import { Snapshots } from "./types";

// These are Misha's test accounts atm
const TEST_ACCOUNTS = [
  'account_tdx_e_129s9mvn2y6d9fdg8jmfk3utzz76ttkw4ph656g5rwg5zuahpmcxywz',
  'account_tdx_e_129e3tmjvyu0satgn033mqxtm5ywau8jk606rrxjxhjzmetvj4j43ng',
  'account_tdx_e_12953xu5wu3rlsl9dc7xdqw0zcnu2ryff9jxywjp69c2wgmcjnwek7a'
];

const KNOWN_VERSIONS = [3297103, 3293441]

const TOKENS = {
  XRD: 'resource_tdx_e_1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxx8rpsmc',
  SG4: 'resource_tdx_e_1thmnph8gg88pmfethyy2s7k5pjz54fmfnlskd6a8y3qtwjter47nas'
}

async function getSnapshotsUnsafe(version: number, token: string, snapshots: Snapshots) {
  return (await snapshots.makeSnapshot(token, version))._unsafeUnwrap();
}

async function testDb() {
  const connection = openConnection();
  const snapshots = initDbSnapshots(connection);
  for (const v of KNOWN_VERSIONS) {
    console.log("State version:", v);
    const snapshot = await getSnapshotsUnsafe(v, TOKENS.SG4, snapshots);
    TEST_ACCOUNTS.forEach((addr) => {
      console.log(addr, snapshot.balanceOf(addr))
    });
  };
  connection.end()
}

testDb()