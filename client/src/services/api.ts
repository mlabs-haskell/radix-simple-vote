import { SignedChallenge } from "@radixdlt/radix-dapp-toolkit";

export const ApiService = (baseUrl: string) => {
  const get = (path: string) =>
    fetch(`${baseUrl}${path}`).then((res) => res.json());
  const post = <T>(path: string, body: T) =>
    fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }).then((res) => res.json());

  const getStatus: () => Promise<{ status: string }> = () => get("/status");
  const createChallenge: () => Promise<string> = () =>
    get("/create-challenge").then((res) => res.challenge);
  const verifySignedChallenge: (
    c: SignedChallenge
    ) => Promise<{ success: boolean, message?: string }> = (c) => post("/verify-challenge", c);
  const submitVote: (
    c: { signedChallenge: SignedChallenge, pollId: string, vote: 'yes' | 'no' }
  ) => Promise<{ success: boolean }> = (c) => post("/vote", c);

  const createPoll: (poll: {
    orgName: string;
    title: string;
    description: string;
    closes: number;
    voteTokenResource: string;
  }) => Promise<string> = (poll) =>
    post("/create-poll", poll).then((res) => res.pollId);
  const getPolls: () => Promise<{
    polls: {
      id: string;
      orgName: string;
      title: string;
      description: string;
      closes: number;
      voteTokenResource: string;
      closed: boolean;
      votes: any[];
    }[];
  }> = () => get("/polls");
  const closePoll: (pollId: string) => Promise<void> = (pollId) =>
    get("/close-poll/" + pollId);

  return {
    status: {
      getStatus,
    },
    vote: {
      createChallenge,
      verifySignedChallenge,
      submitVote,
    },
    polls: {
      createPoll,
      getPolls,
      closePoll,
    },
  };
};
