import {
  Button,
  Card,
  CardActions,
  CardContent,
  Typography,
} from "@mui/material";
import React from "react";

type PollData = {
  id: string;
  orgName: string;
  title: string;
  description: string;
  voteTokenResource: string;
  closes: number;
  closed: boolean;
  votes: any[]; // you may wish to further type this depending on the vote structure
};

type Props = {
  data: PollData[];
  onClosePoll: (pollId: string) => void;
  onVote: (pollId: string, vote: "yes" | "no") => void;
};

const PollList: React.FC<Props> = ({ data, onClosePoll, onVote }) => {
  const handleClose = (pollId: string) => {
    onClosePoll(pollId);
  };

  const currentTime = Date.now();

  return (
    <div>
      {data.map((item) => (
        <Card key={item.id} className="w-full m-2 p-4 border rounded">
          <CardContent>
            <Typography variant="h6" className="text-lg font-bold">
              {item.title}
            </Typography>
            <Typography variant="subtitle1" className="text-gray-500 mt-2">
              By: {item.orgName}
            </Typography>
            <Typography variant="body2" className="mt-2">
              {item.description}
            </Typography>
            <Typography
              variant="caption"
              className="text-gray-400 mt-2 break-all"
            >
              Vote Token: {item.voteTokenResource}
            </Typography>
            <div className="mt-2">
              <Typography variant="caption" className="text-gray-500">
                Closes At: {new Date(item.closes).toLocaleString()}
              </Typography>
            </div>
            <div className="mt-2">
              <Typography
                variant="caption"
                className={item.closed ? "text-red-500" : "text-green-500"}
              >
                Status: {item.closed ? "Closed" : "Open"}
              </Typography>
            </div>
            <div className="mt-2">
              <Typography variant="overline">
                Yes: {item.votes.filter((v) => v.vote === "yes").length}
                <br />
                No: {item.votes.filter((v) => v.vote === "no").length}
              </Typography>
            </div>
          </CardContent>
          <CardActions>
            {!item.closed && (
              <>
                {item.closes < currentTime && (
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={() => handleClose(item.id)}
                    className="mt-2"
                  >
                    Close
                  </Button>
                )}
                <div className="flex mt-2">
                  <Button
                    variant="outlined"
                    onClick={() => onVote(item.id, "yes")}
                    className="mr-2"
                  >
                    Yes
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => onVote(item.id, "no")}
                    className="mr-2"
                  >
                    No
                  </Button>
                </div>
              </>
            )}
          </CardActions>
        </Card>
      ))}
    </div>
  );
};

export default PollList;
