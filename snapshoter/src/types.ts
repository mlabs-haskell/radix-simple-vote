import { ResultAsync } from "neverthrow";

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
  private accountsInfo: Map<OwnerAddress, BalanceInfo>

  // private constructor(map: Map<OwnerAddress, BalanceInfo>) {
  //   this.accountsInfo = map;
  // }

  private constructor() {
    this.accountsInfo = new Map();
  }

  addBalance(balance: BalanceInfo): this {
    this.accountsInfo.set(balance.ownerAddress, balance)
    return this
  }

  static fromBalances(balances: BalanceInfo[]): Snapshot {
    return balances.reduce(
      (s, balanceInfo) => s.addBalance(balanceInfo),
      new Snapshot()
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

  makeSnapshot(tokenAddress: string, stateVersion: number): ResultAsync<Snapshot, Error>

}

