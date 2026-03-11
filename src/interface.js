import inquirer from "inquirer";
import script from "./index.js";

console.log("\nHello there!\n");

const questions = [
  {
    type: "input",
    name: "username",
    message:
      "Source GitHub username (EMU/work/private account whose contributions you'd like to sync):",
    validate: (value) => value.trim().length > 0 || "Please enter a GitHub username.",
  },
  {
    type: "password",
    name: "token",
    message: "GitHub PAT for the source account:",
    mask: "*",
    validate: (value) => value.trim().length > 0 || "A GitHub PAT is required.",
  },
  {
    type: "password",
    name: "push_token",
    message:
      "GitHub PAT for your personal account to push with (leave blank if git credentials are already configured):",
    mask: "*",
  },
  {
    type: "input",
    name: "email",
    message: "Email to use for commits (tip: use your GitHub noreply address for privacy):",
    validate: (value) => value.trim().length > 0 || "Please enter an email.",
  },
  {
    type: "input",
    name: "startDate",
    message: "Start date to sync from (YYYY-MM-DD):",
    filter: (value) => value.trim(),
    validate: (value) =>
      /^\d{4}-\d{2}-\d{2}$/.test(value.trim()) || "Please enter a valid date in YYYY-MM-DD format.",
  },
  {
    type: "list",
    message: "How would you like this to happen?",
    name: "execute",
    choices: [
      {
        name: `Generate a bash script & execute it immediately.\n  Note: it *will* force push to origin and it would be difficult to undo.`,
        value: true,
      },
      {
        name: "Only generate, no execution.",
        value: false,
      },
    ],
    default: false,
  },
  {
    type: "confirm",
    name: "confirm",
    message: "Ready to proceed?",
  },
];

inquirer.prompt(questions).then((answers) => {
  if (answers.confirm) {
    script(answers);
  }
});
