import getGithubClient from "../config/github.js";

// Fetch repo metadata
export const fetchRepoMeta = async (token, owner, repo) => {
  if (!token || token.startsWith("mock")) {
    return {
      id: 999999999,
      name: repo,
      full_name: `${owner}/${repo}`,
      default_branch: "main",
      language: "JavaScript",
    };
  }
  const octokit = getGithubClient(token);
  const { data } = await octokit.repos.get({ owner, repo });
  return data;
};

// Fetch file tree (recursive)
export const fetchRepoTree = async (token, owner, repo, branch) => {
  if (!token || token.startsWith("mock")) {
    return [
      { path: "src/app.js", type: "blob" },
      { path: "src/controllers/authController.js", type: "blob" },
      { path: "README.md", type: "blob" },
    ];
  }
  const octokit = getGithubClient(token);
  const { data: refData } = await octokit.git.getRef({ owner, repo, ref: `heads/${branch}` });
  const { data: tree } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: refData.object.sha,
    recursive: true,
  });
  return tree.tree.filter((item) => item.type === "blob");
};

// Fetch file content
export const fetchFileContent = async (token, owner, repo, path) => {
  if (!token || token.startsWith("mock")) {
    if (path === "README.md") {
      return "# WhyCode Demo\nThis is a mock repository for local verification of WhyCode scans.";
    }
    if (path.includes("authController")) {
      return `/**
 * @api {post} /api/auth/github GitHub OAuth Login
 * @apiDescription Exchanges temporary code for a JWT token
 */
export const githubLogin = async (req, res) => {
  // logic here
};`;
    }
    return `/**
 * Core application entry point
 */
import express from "express";
const app = express();
app.listen(5000);`;
  }
  const octokit = getGithubClient(token);
  const { data } = await octokit.repos.getContent({ owner, repo, path });
  return Buffer.from(data.content, "base64").toString("utf-8");
};

// Fetch commit history for a file
export const fetchFileCommits = async (token, owner, repo, path) => {
  if (!token || token.startsWith("mock")) {
    return [
      {
        sha: "mocksha111111111111111111111111111111111",
        commit: {
          message: "feat: add user authentication controller",
          author: { name: "Mock Developer", date: new Date().toISOString() },
        },
      },
      {
        sha: "mocksha222222222222222222222222222222222",
        commit: {
          message: "refactor: convert codebase to ES modules",
          author: { name: "Mock Developer", date: new Date().toISOString() },
        },
      },
    ];
  }
  const octokit = getGithubClient(token);
  const { data } = await octokit.repos.listCommits({ owner, repo, path, per_page: 30 });
  return data; // includes sha, commit.message, author, date
};

// Fetch git blame via GraphQL (line-level authorship)
export const fetchBlame = async (token, owner, repo, path, branch) => {
  if (!token || token.startsWith("mock")) {
    return [
      {
        startingLine: 1,
        endingLine: 10,
        commit: {
          oid: "mocksha111111111111111111111111111111111",
          message: "feat: add user authentication controller",
          committedDate: new Date().toISOString(),
          author: { name: "Mock Developer" },
        },
      },
    ];
  }
  const octokit = getGithubClient(token);
  const query = `
    query ($owner: String!, $repo: String!, $expr: String!) {
      repository(owner: $owner, name: $repo) {
        ref(qualifiedName: $expr) {
          target {
            ... on Commit {
              blame(path: "${path}") {
                ranges {
                  startingLine
                  endingLine
                  commit {
                    oid
                    message
                    committedDate
                    author { name }
                  }
                }
              }
            }
          }
        }
      }
    }`;
  const result = await octokit.graphql(query, { owner, repo, expr: `refs/heads/${branch}` });
  return result.repository.ref.target.blame.ranges;
};

// Fetch PR linked to a commit (search by SHA)
export const fetchLinkedPR = async (token, owner, repo, sha) => {
  if (!token || token.startsWith("mock")) {
    return {
      title: "Feature: Add Authentication and Scans Pipeline",
      body: "Closes #15. Adds the GitHub OAuth controller flow and background scan runner.",
    };
  }
  const octokit = getGithubClient(token);
  const { data } = await octokit.search.issuesAndPullRequests({ q: `${sha} repo:${owner}/${repo} type:pr` });
  return data.items[0] || null;
};
