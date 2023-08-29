import {
  Card,
  CardActions,
  CardContent,
  Button,
  TextField,
  Select,
  MenuItem,
  CardHeader,
} from "@mui/material";
import { useState } from "react";
import { Api } from "../types";

const CreatePollFormCard = ({
  onSubmit,
}: {
  onSubmit: Api["polls"]["createPoll"];
}) => {
  const [orgName, setOrgName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [voteTokenResource, setVoteTokenResource] = useState("");
  const [closesDuration, setClosesDuration] = useState(60 * 1000); // Initializing with 0, but you can have a default duration

  const handleSubmit = () => {
    const closesTimestamp = Date.now() + closesDuration;
    onSubmit({
      orgName,
      title,
      description,
      closes: closesTimestamp,
      voteTokenResource,
    });
  };

  return (
    <Card>
      <CardHeader title="Create Poll" />
      <CardContent>
        <div>
          <TextField
            id="orgName"
            className="w-full"
            label="Organization Name"
            variant="standard"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
          />
        </div>
        <div>
          <TextField
            id="title"
            label="Title"
            className="w-full"
            variant="standard"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <TextField
            id="description"
            label="Description"
            className="w-full"
            variant="standard"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <TextField
            id="voteTokenResource"
            className="w-full"
            label="Vote Token Resource"
            variant="standard"
            value={voteTokenResource}
            onChange={(e) => setVoteTokenResource(e.target.value)}
          />
        </div>
        <Select
          id="closes"
          value={closesDuration}
          onChange={(e) => setClosesDuration(Number(e.target.value))}
        >
          <MenuItem value={60 * 1000}>1 Minute</MenuItem>
          <MenuItem value={60 * 60 * 1000}>1 Hour</MenuItem>
          <MenuItem value={24 * 60 * 60 * 1000}>1 Day</MenuItem>
        </Select>
      </CardContent>
      <CardActions>
        <Button onClick={handleSubmit}>Submit</Button>
      </CardActions>
    </Card>
  );
};

export default CreatePollFormCard;
