import { useContext } from "react"
import { ApiContext } from "../contexts/api"

const useApi = () => useContext(ApiContext)

export const useApiVote = () => useApi().vote
export const useApiStatus = () => useApi().status
export const useApiPolls = () => useApi().polls
