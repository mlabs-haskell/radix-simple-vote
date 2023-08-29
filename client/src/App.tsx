import { Button } from "@mui/base";
import Refresh from "@mui/icons-material/Refresh";
import { Fab, Grid } from "@mui/material";
import AppBar from "@mui/material/AppBar";
import CssBaseline from "@mui/material/CssBaseline";
import Toolbar from "@mui/material/Toolbar";
import { DataRequestBuilder } from "@radixdlt/radix-dapp-toolkit";
import { fromPromise } from "neverthrow";
import {useState, useEffect } from "react";
import CreatePollFormCard from "./components/CreatePollFormCard";
import PollList from "./components/PollList";
import { useApiPolls, useApiStatus, useApiVote } from "./hooks/api";
import { useRdt, useWalletDataState } from "./hooks/radix";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "radix-connect-button": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}

const App = () => {
  const rdt = useRdt();
  const ws = useWalletDataState();
  const [polls, setPolls] = useState<any>([]);

  const { getStatus } = useApiStatus();
  const { createChallenge, submitVote, verifySignedChallenge} = useApiVote();
  const { getPolls, createPoll, closePoll } = useApiPolls();

  const refreshPolls = () => getPolls().then(setPolls);

  useEffect(() => {
    refreshPolls();
  }, []);

  useEffect(() => {
    rdt && console.log(rdt);
    rdt?.walletApi.provideChallengeGenerator(createChallenge);

    rdt?.walletApi.dataRequestControl(async (r) => {
      console.log("data request control", r);
    });
  }, [rdt]);

  useEffect(() => {
    console.log("wallet state change", ws);
  }, [ws]);

  const isConnected = !ws?.persona;

  const request = () => {
    const dataReq = DataRequestBuilder.accounts().exactly(1).withProof();
    rdt?.walletApi.sendOneTimeRequest(dataReq).andThen((r) => {
      console.log(r.proofs[0]);
      return fromPromise(
        verifySignedChallenge(r.proofs[0]).then(console.log),
        (e) => {
          throw e;
        },
      );
    });
  };

  const onVoteHandler = (pollId: string, vote: 'yes' | 'no') => {
    const dataReq = DataRequestBuilder.accounts().exactly(1).withProof();
    rdt?.walletApi.sendOneTimeRequest(dataReq).andThen((r) => {
      return fromPromise(
        submitVote({ pollId, vote, signedChallenge: r.proofs[0] }).then((r) => {
          if (!r.success) console.error(r);
          refreshPolls()
          }),
        (e) => {
          throw e;
        },
      );
    });
  }

  return (
    <CssBaseline>
      <AppBar className="mb-5 w-screen" position="sticky">
        <Toolbar className="w-full max-w-4xl mx-auto" sx={{ p: { sm: 0 } }}>
          <h1 className="text-3xl font-medium grow">Radix Simple Vote</h1>
          <Button onClick={request} className="m-2 p-2 bg-gray-500 rounded">
            ROLA
          </Button>
          <radix-connect-button />
          <div className="m-2">
            <Fab color="primary" size="small" onClick={refreshPolls}>
              <Refresh />
            </Fab>
          </div>
          <div className="m-2">
            <Fab
              color="primary"
              size="small"
              onClick={() => getStatus().then(console.log)}
            >
              ST
            </Fab>
          </div>
        </Toolbar>
      </AppBar>
      {isConnected ? (
        <div className="max-w-4xl mx-auto mb-96">
          <p className="mb-10">
            If you haven't already,{" "}
            <a
              href="https://docs-babylon.radixdlt.com/main/getting-started-developers/wallet/wallet-and-connecter-installation.html"
              className="text-blue-500"
            >
              install the wallet and browser extension
            </a>{" "}
            to use this app, then click the connect button in the top right.
            Note that you may have to open and close the wallet app sometimes if
            transactions aren't showing up.
          </p>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto mb-96">
          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <Grid container spacing={1}>
                <Grid item xs={12} md={12}>
                  <CreatePollFormCard onSubmit={(p) => createPoll(p).then((s) => {refreshPolls(); return s})} />
                </Grid>
              </Grid>
            </Grid>
            <Grid item xs={12} md={4}>
              <Grid container spacing={1}>
                <PollList data={polls} onClosePoll={(pid) => closePoll(pid).then(() => {refreshPolls()})} onVote={onVoteHandler} />
              </Grid>
            </Grid>
          </Grid>
        </div>
      )}
    </CssBaseline>
  );
};

export default App;
