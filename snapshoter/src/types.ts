import { Err, ResultAsync } from "neverthrow";

export type TokenAddress = string;
export type OwnerAddress = string;
export type StateVersion = number;

export interface BalanceInfo {
  tokenAddress: TokenAddress,
  ownerAddress: OwnerAddress, // it can be user or script AFAIK
  fromStateVersion: StateVersion,
  balance: number
}

export class Snapshot {
  readonly stateVersion: number;
  private accountsInfo: Map<OwnerAddress, BalanceInfo>;

  private constructor(stateVersion: number) {
    this.stateVersion = stateVersion;
    this.accountsInfo = new Map();
  }

  size(): number {
    return this.accountsInfo.size
  }

  addBalance(balance: BalanceInfo): this {
    if (balance.fromStateVersion > this.stateVersion) {
      throw new Error(`Balance info has higher state version than snapshot: ${balance.fromStateVersion} vs. ${this.stateVersion}.
      Something went very wrong.`);
    }
    this.accountsInfo.set(balance.ownerAddress, balance);
    return this;
  }

  static fromBalances(stateVersion: number, balances: BalanceInfo[]): Snapshot {
    return balances.reduce(
      (s, balanceInfo) => s.addBalance(balanceInfo),
      new Snapshot(stateVersion)
    );
  }

  getBalanceInfo(ownerAddress: OwnerAddress): BalanceInfo | undefined {
    return this.accountsInfo.get(ownerAddress);
  }
  balanceOf(ownerAddress: OwnerAddress): number | undefined {
    return this.getBalanceInfo(ownerAddress)?.balance;
  }
}

export interface Snapshots {

  makeSnapshotV1(tokenAddress: string, stateVersion: number): ResultAsync<Snapshot, Error>

  /// Accepts list of addresses
  makeSnapshotV2(tokenAddress: string, stateVersion: number, owners: OwnerAddress[]): ResultAsync<Snapshot, Error>

}

