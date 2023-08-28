import { RadixDappToolkit } from "@radixdlt/radix-dapp-toolkit";
import { ApiService } from "./services/api";

export type Rdt = ReturnType<typeof RadixDappToolkit>;

export type Api = ReturnType<typeof ApiService>
