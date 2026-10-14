# enming group

A research workspace for projects and tasks, with an AI learning course alongside it. The homepage starts with no projects or tasks; add real work by editing the repository on GitHub.

- [Research homepage](https://enmingzz.github.io/ai-research-mentorship/): shared projects, links, and tasks.
- [Learning course](https://enmingzz.github.io/ai-research-mentorship/course.html): 12 modules, 174 knowledge checkpoints and topic guides, reading resources, and a suggested 20-week schedule.
- [Example topic guide](https://enmingzz.github.io/ai-research-mentorship/learn/04-03/): a standalone explanation with an example, exercise, answer, and source links.

Built with static HTML, CSS, and JavaScript, with no runtime dependencies. The existing repository name and site URL remain in place; topic-guide URLs for the retained modules are unchanged.

## Add Projects and Tasks on GitHub

The shared research homepage reads [`data/projects.json`](https://github.com/Enmingzz/ai-research-mentorship/blob/main/data/projects.json). Its initial content is intentionally empty:

```json
{
  "projects": [],
  "tasks": []
}
```

To publish an update:

1. Open `data/projects.json` in the GitHub repository and select the pencil icon to edit it.
2. Add or update entries inside `projects` and `tasks`. Use the field reference below. The separate [`examples/projects.example.json`](examples/projects.example.json) shows valid example records; replace its illustrative titles, dates, assignee, and placeholder links with your own information before using them.
3. Keep IDs stable when changing a title or status. Use a new unique ID for each new project or task, and keep task `projectId` values linked to existing projects.
4. Select **Commit changes** and commit to `main`, or use a branch and merge its pull request into `main` after review.
5. Open **Actions → Deploy enming group to GitHub Pages** and wait for the checks and deployment to succeed. The homepage updates after publication. If checks fail, open the failed job, correct the reported JSON or data issue, and commit the fix.

Use double quotes for JSON strings, commas between entries, and no trailing comma or comments. Editing this file updates the shared website. It does not require the local development tools.

The example file is documentation only. It is not loaded as production project or task data. The project and task lists on the homepage are maintained through GitHub rather than through a separate account or administration system.

### Project Fields

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | Yes | Unique, stable identifier, such as `visual-token-study` |
| `title` | Yes | Project name |
| `summary` | Yes | Short description of the question or objective |
| `status` | Yes | `planned`, `active`, or `completed` |
| `tags` | Yes | Array of topic labels; use `[]` if none |
| `links` | Yes | Array of `{ "label": "...", "url": "https://..." }`; use `[]` if none |
| `updated` | No | Last update date in `YYYY-MM-DD` format |

### Task Fields

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | Yes | Unique, stable task identifier |
| `title` | Yes | Short action-oriented title |
| `description` | Yes | Scope, context, or expected deliverable |
| `projectId` | No | Existing project ID, or `null` for a standalone task |
| `status` | Yes | `open`, `in-progress`, or `done` |
| `priority` | Yes | `normal` or `high` |
| `assignee` | No | Display name of the person responsible |
| `dueDate` | No | Due date in `YYYY-MM-DD` format |
| `links` | Yes | Array of labeled HTTPS links; use `[]` if none |

When removing a project, first move its tasks to another project or set their `projectId` to `null`. Change status to `completed` or `done` when you want to retain finished work. Dates are entered explicitly; they are not inferred from commits.

## Use the Learning Course

- Open `course.html` to browse the curriculum, schedule, and reading room.
- Every topic links to an original English guide and relevant papers, textbooks, or official documentation. Select the topic title or **Read guide** to open the article.
- Articles at `learn/<topicId>/` are static pages that can be shared directly and read without JavaScript. Their understanding checkboxes share progress with the course checklist.
- The 20-week plan is a recommendation with relative week numbers. Adjust it to the learner's background, research direction, and compute budget. Advanced Flow Matching and RL topics remain optional extensions within the relevant modules.
- Learning progress, notes, and the chosen start date are saved in the current browser. They do not automatically sync to GitHub, other devices, or another group member. Use JSON export and import to back up or transfer these records before clearing browser site data.

Shared research information is published from GitHub. Personal learning records remain local to the browser. Existing course progress and backup identifiers are retained for compatibility. Personal records for removed modules remain in local storage and exported backups, but are excluded from active course totals.

## Course Structure

| Module | Topic | Priority |
| --- | --- | --- |
| 01 | Mathematics & Machine Learning Foundations | P0 |
| 02 | PyTorch & Engineering Basics | P0 |
| 03 | Fundamental Neural Networks | P0 |
| 04 | Attention & Transformer | P0 |
| 05 | Large Language Models | P1 |
| 06 | Fine-Tuning & LoRA | P1 |
| 07 | Mixture of Experts (MoE) | P1 |
| 08 | Computer Vision & Visual Representation | P1 |
| 09 | Generative Models | P1: VAE / Diffusion; P2: advanced Flow Matching |
| 10 | Vision-Language Models (VLM) | P1 |
| 11 | Efficient Deep Learning | P1 |
| 12 | Post-Training, Distillation & Reinforcement Learning | P1: SFT / Distillation; P2: advanced RL |

## Edit Learning Content

| Source file | Content |
| --- | --- |
| `data/curriculum.json` | Modules, knowledge checkpoints, priorities, formulas, and assessments |
| `data/papers.json` | Shared reading resources, linked to modules through `moduleIds` |
| `data/schedule.json` | Weekly focus, deliverables, and assigned readings |
| `data/lessons/01.json`–`12.json` | One explanation and topic-specific reading list per knowledge checkpoint |

Module IDs use `"01"`–`"12"`. Keep topic IDs stable when editing text because they identify saved learning records. Use only existing topic IDs in article prerequisites.

Each article has a `topicId`, `title`, `summary`, `prerequisites`, at least three `sections`, an `exercise` with a `prompt` and `answer`, `takeaways`, and `references`. Sections use a unique `id`, a `title`, and a `paragraphs` array. Optional `formula`, `code`, `language`, and `bullets` fields add worked material. Write plain text and Unicode mathematics; HTML is escaped when rendered.

Article references contain `title`, `url`, `kind` (`paper`, `book`, or `guide`), and `note` describing what to read. They appear beside the curriculum topic and at the end of its guide. Shared reading resources in `papers.json` additionally include `id`, `authors`, `year`, `moduleIds`, and `level` (`essential` or `further`).

For a schedule entry, `week` is the relative week number, `moduleIds` links the relevant modules, and `focus` and `deliverable` explain the assignment. Prefer `readingIds` to specify exact resource IDs from `papers.json` in the desired order. If that list is absent, `readingModuleIds` selects readings by module and `readingLimit` limits this fallback selection. The complete explicit `readingIds` list is displayed as supplied.

The build creates `dist/learn/<topicId>/index.html`, `dist/data/topic-index.json`, and `dist/sitemap.xml`. Edit source JSON rather than generated files. Checks validate topic coverage, references, prerequisites, and substantive article content. External source availability can change even when a URL is structurally valid.

## Local Preview and Validation

Use Node.js 22. No `npm install` is needed. If Windows PowerShell blocks `npm.ps1`, replace `npm` with `npm.cmd`.

```sh
npm run dev
```

Open the address printed in the terminal for the research homepage. Add `/course.html` for the course. Use the local server because data files load over HTTP.

```sh
npm run check
npm run build
```

`check` validates content and application behavior. `build` prepares the research homepage, course, and standalone guides in `dist/`, including `.nojekyll` for GitHub Pages.

## GitHub Pages

Repository: [`Enmingzz/ai-research-mentorship`](https://github.com/Enmingzz/ai-research-mentorship)

In **Settings → Pages → Build and deployment → Source**, select **GitHub Actions**. Changes pushed to `main` trigger the **Deploy enming group to GitHub Pages** workflow. It validates, builds, and publishes the site; its deployment result links to the live URL.

The repository path remains unchanged for continuity. `dist/` is generated output and is not committed. `examples/projects.example.json` is an illustrative editing aid; `data/projects.json` is the source of published research records.
