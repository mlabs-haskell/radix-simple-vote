import { createContext } from "react";
import { Api } from "../types";

export const ApiContext = createContext<Api>(null!);
