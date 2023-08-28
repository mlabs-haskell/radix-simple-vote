export type GatewayService = ReturnType<typeof GatewayService>;
import { GatewayApiClient } from "@radixdlt/babylon-gateway-api-sdk";
import { ResultAsync } from "neverthrow";

export const GatewayService = (basePath: string) => {
  const { state, status, transaction, stream } = GatewayApiClient.initialize({
    basePath,
  });

  const getEntityDetails = (addresses: string[]) =>
    ResultAsync.fromPromise(
      state.getEntityDetailsVaultAggregated(addresses),
      (e: unknown) => e as Error,
    );

  return {
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
