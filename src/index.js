import axios from "axios";
import fs from "fs";
import os from "os";
import path from "path";
import shell from "shelljs";

// Gathers needed git commands for bash to execute per provided contribution data.
const getCommand = (contribution) => {
  return `GIT_AUTHOR_DATE="${contribution.date}T12:00:00" GIT_COMMITTER_DATE="${contribution.date}T12:00:00" git commit --allow-empty -m "Rewriting History!" > /dev/null\n`.repeat(
    contribution.count
  );
};

const fetchViaGraphQL = async (startDate, endDate, token) => {
  const query = `
    query($from: DateTime!, $to: DateTime!) {
      viewer {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            weeks {
              contributionDays {
                date
                contributionCount
              }
            }
          }
        }
      }
    }
  `;

  // GitHub API max range is 1 year per call — split into calendar-year chunks.
  const allDays = [];
  let chunkStart = new Date(startDate + "T00:00:00Z");
  const end = new Date(endDate + "T23:59:59Z");

  while (chunkStart <= end) {
    const chunkEnd = new Date(
      Math.min(
        new Date(`${chunkStart.getUTCFullYear()}-12-31T23:59:59Z`).getTime(),
        end.getTime()
      )
    );

    const res = await axios.post(
      "https://api.github.com/graphql",
      { query, variables: { from: chunkStart.toISOString(), to: chunkEnd.toISOString() } },
      { headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json" } }
    );

    if (res.data.errors) {
      throw new Error(res.data.errors[0].message);
    }

    const weeks =
      res.data.data.viewer.contributionsCollection.contributionCalendar.weeks;
    weeks
      .flatMap((week) => week.contributionDays)
      .filter((day) => day.contributionCount > 0)
      .forEach((day) => allDays.push({ date: day.date, count: day.contributionCount }));

    chunkStart = new Date(`${chunkStart.getUTCFullYear() + 1}-01-01T00:00:00Z`);
  }

  return allDays;
};

const getAuthenticatedUrl = (token) => {
  const remoteUrl = shell.exec("git remote get-url origin", { silent: true }).stdout.trim();
  const httpsUrl = remoteUrl.startsWith("git@")
    ? remoteUrl.replace(/^git@github\.com:/, "https://github.com/")
    : remoteUrl;
  return httpsUrl.replace("https://", `https://x-access-token:${token}@`);
};

const getExistingCommitCounts = () => {
  const result = shell.exec(
    `git log --format="%ad" --date=format:"%Y-%m-%d" --grep="Rewriting History!"`,
    { silent: true }
  );
  const counts = {};
  result.stdout
    .split("\n")
    .filter((date) => date.trim())
    .forEach((date) => {
      counts[date] = (counts[date] || 0) + 1;
    });
  return counts;
};

export default async (input) => {
  try {
    const endDate = new Date().toISOString().split("T")[0];
    const startDate = input.startDate;

    console.log(`\nFetching contributions for @${input.username} from ${startDate} to ${endDate}...`);

    const filteredDays = await fetchViaGraphQL(startDate, endDate, input.token);

    const existingCounts = getExistingCommitCounts();
    const totalFetched = filteredDays.reduce((sum, day) => sum + day.count, 0);
    const totalExisting = Object.values(existingCounts).reduce((sum, n) => sum + n, 0);

    console.log(`Found ${totalFetched} contribution(s), ${totalExisting} already synced.`);

    const newDays = filteredDays
      .map((day) => ({
        date: day.date,
        count: day.count - (existingCounts[day.date] || 0),
      }))
      .filter((day) => day.count > 0);

    if (newDays.length === 0) {
      console.log("Nothing new to sync.");
      return;
    }

    const remote = input.push_token ? getAuthenticatedUrl(input.push_token) : "origin";
    const branch = shell.exec("git rev-parse --abbrev-ref HEAD", { silent: true }).stdout.trim();

    const script = `git config user.email "${input.email}"\n`
      .concat(newDays.map((contribution) => getCommand(contribution)).join("\n"))
      .concat(`\ngit push -f ${remote} ${branch}`);

    const scriptPath = path.join(os.tmpdir(), "sync-contributions.sh");

    fs.writeFileSync(scriptPath, script);
    console.log("\nFile was created successfully.");

    if (input.execute) {
      console.log("This might take a moment!\n");
      shell.exec(`sh ${scriptPath}`);
    }
  } catch (err) {
    console.error("\nError:", err.response?.data?.errors?.[0]?.message || err.message);
  }
};
