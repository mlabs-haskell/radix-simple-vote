import openConnection from "./db";
import { initDbSnapshots } from "./db_snapshotter"
import { spam } from "./spammer";
import { XRD_ADDRS } from "./test_addresses";

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

// see if both queries gives consistent results
async function testDb1() {
  const connection = openConnection();
  const snapshots = initDbSnapshots(connection);
  for (const v of KNOWN_VERSIONS) {
    console.log("State version:", v);
    const snapshotV1 = (await snapshots.makeSnapshotV1(TOKENS.SG4, v))._unsafeUnwrap();
    const snapshotV2 = (await snapshots.makeSnapshotV2(TOKENS.SG4, v, TEST_ACCOUNTS))._unsafeUnwrap();
    console.log("V1 snapshot size: ", snapshotV1.size())
    console.log("V2 snapshot size: ", snapshotV2.size())
    TEST_ACCOUNTS.forEach((addr) => {
      const balance1 = snapshotV1.balanceOf(addr);
      const balance2 = snapshotV2.balanceOf(addr);
      console.log("V1:", addr, balance1);
      console.log("V2:", addr, balance2);

      if (balance1 !== balance2) {
        throw new Error("Snapshots have inconsistent balances")
      }
    });
  };
  connection.end()
}

// test how queries perform for getting balances for all XRD tokens for known state
/* Misha's avg out:
    V1 time: 70.80368100013584
    V2 time: 61.12687599938363
    V1 snapshot size:  533
    V2 snapshot size:  533
*/
async function testDb2() {
  const connection = openConnection();
  const snapshots = initDbSnapshots(connection);
  const v = 3297103;
  const token = TOKENS.XRD;

  var startTime = performance.now();
  const snapshotV1 = (await snapshots.makeSnapshotV1(token, v))._unsafeUnwrap();
  var endTime = performance.now();
  console.log(`V1 time: ${endTime - startTime}`);

  var startTime = performance.now();
  const snapshotV2 = (await snapshots.makeSnapshotV2(token, v, XRD_ADDRS))._unsafeUnwrap();
  var endTime = performance.now();
  console.log(`V2 time: ${endTime - startTime}`);

  if (JSON.stringify(snapshotV1) !== JSON.stringify(snapshotV2)) {
    throw new Error(`Snapshots are not equivalent`)
  }
  console.log("V1 snapshot size: ", snapshotV1.size())
  console.log("V2 snapshot size: ", snapshotV2.size())

  connection.end()
}

async function runTests() {
  console.log("----- testDb1 -----")
  await testDb1();
  console.log("\n----- testDb2 -----")
  await testDb2();
  console.log("\n----- spam DB -----")
  spam(10000, 1)
}

runTests()