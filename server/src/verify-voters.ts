import { FungibleResourcesCollectionItem } from "@radixdlt/babylon-gateway-api-sdk";
import { GatewayService } from "./gateway/gateway";
import { Result, ResultAsync, ok } from "neverthrow";

// checks only existence of voteTokenResource at the relevant address. Does not
// take into account number of tokens held.
export const VerifyVoters =
  (gatewayService: GatewayService) =>
  (
    voteToken: string,
    votes: { voter: string; vote: "yes" | "no"; id: string }[],
  ): ResultAsync<any[], { reason: string }> => {
    return gatewayService
      .getEntityResources(votes.map((x) => x.voter))
      .andThen((resources) => {
        console.log(resources)
        // Map the resources to votes
        const combinedData = resources.map((y, i) => ({
          id: votes[i].id,
          voter: votes[i].voter,
          vote: votes[i].vote,
          resources: y,
        }));
        return ok(combinedData);
      })
     .map((combinedData) => combinedData.filter(v => 
        v.resources.some((r: any) => 
          r.resource_address === voteToken && 
          r.vaults.items.some((vault: any) => vault.amount !== "0")
        )
      ))
      .mapErr(() => ({ reason: "couldNotVerifyPublicKeyOnLedger" }));
  };

