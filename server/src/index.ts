import express from "express";
import { SignedChallenge } from "@radixdlt/radix-dapp-toolkit";
import cors from "cors";
import { NetworkId } from "@radixdlt/radix-engine-toolkit";
import { RolaFactory } from "./rola/rola";
import { GatewayService } from "./gateway/gateway";
import { ChallengeStore } from "./rola/challenge-store";
import { DbStore, DbKeys } from "./db-store";
import { UUID } from "@radixdlt/radix-engine-toolkit/dist/models/value/scrypto_sbor";
import { secureRandom } from "./helpers/crypto";
import { VerifyVoters } from "./verify-voters";

const app = express();
app.use(cors());
app.use(express.json());

const port = 4000;

const dbStore = DbStore("./db.json");

const challengeStore = ChallengeStore(dbStore);

const gatewayService = GatewayService("https://rcnet-v2.radixdlt.com");

const verifyVoters = VerifyVoters(gatewayService);

const rola = RolaFactory({
  gatewayService,
  expectedOrigin: "http://localhost:3000", // TODO: document how to get this and significance
  dAppDefinitionAddress:
    "account_tdx_d_128656c7vqkww07ytfudjacjh2snf9z8t6slfrz2n7p9kwaz2ewnjyv",
  networkId: NetworkId.Ansharnet,
});

app.get("/status", (_req, res) => res.send({ status: "up" }));

app.get("/ed", (req, res) => {
  let poll = dbStore.get(DbKeys.Polls).find((x: any) => x.votes.length);
  const voters = verifyVoters(poll.voteTokenResource, poll.votes).then((x) =>
    res.send(x),
  );
});

app.post("/create-poll", (req, res) => {
  const { orgName, title, description, voteTokenResource, closes } = req.body;
  const id = secureRandom(32);
  const currentPolls = dbStore.get(DbKeys.Polls) || [];
  const newPoll = {
    id,
    orgName,
    title,
    description,
    voteTokenResource,
    closes,
    closed: false,
    votes: [],
  };
  dbStore.set(DbKeys.Polls, [...currentPolls, newPoll]);
  res.status(200).send(newPoll);
});

app.get("/polls", (_req, res) => {
  const polls = dbStore.get(DbKeys.Polls);
  res.send(polls || []);
});

app.get("/close-poll/:id", async (req, res) => {
  const { id } = req.params;
  const currentMillis = Date.now();
  const poll = dbStore.get(DbKeys.Polls).find((p: any) => p.id === id);
  if (poll && poll.closes < currentMillis) {
    poll.closed = true;
    const r = await verifyVoters(poll.voteTokenResource, poll.votes);
    if (r.isErr()) {
      return res.send({ success: false, message: r.error.reason });
    }
    console.log(r.value);
    dbStore.set(
      DbKeys.Polls,
      dbStore
        .get(DbKeys.Polls)
        .map((p: any) =>
          p.id === id
            ? {
                ...poll,
                unverifiedVotes: p.votes,
                votes: r.value.map((v: any) => ({
                  voter: v.voter,
                  vote: v.vote,
                  id: v.id,
                })),
              }
            : p,
        ),
    );
    return res.send({ success: true });
  }
  return res.send({ success: false, message: "Poll can't be closed" });
});

app.get("/create-challenge", (_req, res) => {
  const challenge = challengeStore.create();
  res.send({ challenge });
});

app.post<{}, { success: boolean; message?: string }, SignedChallenge>(
  "/verify-challenge",
  async (req, res) => {
    const { challenge, proof, address } = req.body;
    const r = await rola(req.body);
    if (r.isErr()) {
      res.send({ success: false, message: r.error.reason });
      console.log("error verifying", r);
      console.log(r);
      return;
    }
    res.send({ success: true });
  },
);

app.post<
  {},
  { success: boolean; message?: string },
  { pollId: string; vote: string; signedChallenge: SignedChallenge }
>("/vote", async (req, res) => {
  const { pollId, vote, signedChallenge } = req.body;
  const { challenge } = signedChallenge;
  console.log(req.body);
  const r = await rola(signedChallenge);
  if (r.isErr()) {
    res.send({ success: false, message: r.error.reason });
    console.log("error verifying", r);
    return;
  }
  const poll = dbStore.get(DbKeys.Polls).find((p: any) => p.id === pollId);
  if (poll.closed)
    return res.send({ success: false, message: "Poll is closed" });
  if (poll.votes.find((v: any) => v.voter === r.value))
    return res.send({ success: false, message: "Already voted" });

  dbStore.set(
    DbKeys.Polls,
    dbStore.get(DbKeys.Polls).map((p: any) =>
      p.id === pollId
        ? {
            ...p,
            votes: [
              ...p.votes,
              {
                id: challenge,
                voter: r.value,
                vote,
              },
            ],
          }
        : p,
    ),
  );
  res.send({ success: true });
});

app.listen(port, () => {
  console.log(`server listening on port http://localhost:${port}`);
});
