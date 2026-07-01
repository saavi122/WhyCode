import { Octokit } from "@octokit/rest";

const getGithubClient = (accessToken) => {
  return new Octokit({ auth: accessToken });
};

export default getGithubClient;
