import { RdtContext } from "../contexts/rdt";
import { Rdt } from "../types";

export const RdtProvider = (
  input: React.PropsWithChildren<{
    value: Rdt;
  }>
) => (
  <RdtContext.Provider value={input.value}>
    {input.children}
  </RdtContext.Provider>
);
