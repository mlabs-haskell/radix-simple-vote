import { ApiContext } from "../contexts/api";
import { Api } from "../types";

export const ApiProvider = (
  input: React.PropsWithChildren<{
    value: Api;
  }>
) => (
  <ApiContext.Provider value={input.value}>
    {input.children}
  </ApiContext.Provider>
);
