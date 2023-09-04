export type GatewayService = ReturnType<typeof GatewayService>;
import { GatewayApiClient } from "@radixdlt/babylon-gateway-api-sdk";
import { ResultAsync } from "neverthrow";

export const GatewayService = (basePath: string) => {
  const { state, status, transaction, stream } = GatewayApiClient.initialize({
    basePath,
    applicationName: "snapshot polling",
    applicationDappDefinitionAddress: 'account_tdx_d_128656c7vqkww07ytfudjacjh2snf9z8t6slfrz2n7p9kwaz2ewnjyv',
  });

  const getEntityDetails = (addresses: string[]) =>
    ResultAsync.fromPromise(
      state.getEntityDetailsVaultAggregated(addresses),
      (e: unknown) => e as Error,
    );

  const getEntityResources = (addresses: string[]) =>
    ResultAsync.fromPromise(
      state.getEntityDetailsVaultAggregated(addresses),
      (e: unknown) => e as Error,
    ).map((response) => {
        // response is returned in a different order than the addresses we sent in
        response.sort((a, b) => addresses.indexOf(a.address) - addresses.indexOf(b.address));
        return response.map((entityDetails) => entityDetails.fungible_resources.items)
      }
    );

  return {
    getEntityResources,
    getEntityOwnerKeys: (address: string) =>
      getEntityDetails([address]).map((response) =>
        response.map(
          (entityDetails) =>
            entityDetails.metadata.items.find(
              (item) => item.key === "owner_keys",
            )?.value.raw_hex ?? "",
        ),
      ),
  };
};
