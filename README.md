# enming group

A research workspace for projects and tasks, with an AI reference library alongside it. The homepage starts with no projects or tasks; add real work by editing the repository on GitHub.

- [Research homepage](https://enmingzz.github.io/vlm-project/): shared projects, links, and tasks.
- [Reference library](https://enmingzz.github.io/vlm-project/library.html): 12 subjects, 174 articles, and 29 reading resources, with search and subject filters.
- [Example article](https://enmingzz.github.io/vlm-project/learn/04-03/): a standalone explanation with worked examples and original source links.

Built with static HTML, CSS, and JavaScript, with no runtime dependencies. The repository is `Enmingzz/vlm-project`. Article paths remain `learn/<topicId>/` under the new site URL. On this site, `course.html` redirects to `library.html` and older topic hashes still resolve. Use the new site URL for sharing; the previous GitHub Pages base path is no longer the published address.

## Add Projects and Tasks on GitHub

The shared research homepage reads [`data/projects.json`](https://github.com/Enmingzz/vlm-project/blob/main/data/projects.json). Its initial content is intentionally empty:

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

## Use the Library

- Open `library.html` to browse subjects, articles, and papers. Search for an idea or filter by subject.
- Every topic links to an English article and relevant papers, textbooks, or official documentation.
- Articles at `learn/<topicId>/` are static pages that can be shared directly and read without JavaScript. Each has explanations, examples, related concepts, and sources.
- Readers can open any topic in any order. There are no completion checkboxes, reading statuses, personal notes, schedules, or progress dashboards.

Research projects and tasks are shared records maintained on GitHub. The library does not read, write, or delete browser storage; any records from the former course interface remain untouched.

## Library Subjects

| Subject ID | Subject |
| --- | --- |
| 01 | Mathematics & Machine Learning Foundations |
| 02 | PyTorch & Engineering Basics |
| 03 | Fundamental Neural Networks |
| 04 | Attention & Transformer |
| 05 | Large Language Models |
| 06 | Fine-Tuning & LoRA |
| 07 | Mixture of Experts (MoE) |
| 08 | Computer Vision & Visual Representation |
| 09 | Generative Models |
| 10 | Vision-Language Models (VLM) |
| 11 | Efficient Deep Learning |
| 12 | Post-Training, Distillation & Reinforcement Learning |

## Edit Library Content

| Source file | Content |
| --- | --- |
| `data/curriculum.json` | Subjects and their topic lists; legacy planning fields are not displayed |
| `data/papers.json` | Shared reading resources, linked to subjects through `moduleIds` |
| `data/lessons/01.json`–`12.json` | One article and topic-specific reading list per topic |

Subject IDs use `"01"`–`"12"`. The source schema retains the names `modules` and `moduleIds`. Keep topic IDs stable because they identify article URLs. Use only existing topic IDs in article prerequisites.

Each article has a `topicId`, `title`, `summary`, `prerequisites`, at least three `sections`, an `exercise` with a `prompt` and `answer`, `takeaways`, and `references`. Sections use a unique `id`, a `title`, and a `paragraphs` array. Optional `formula`, `code`, `language`, and `bullets` fields add worked material. Write plain text and Unicode mathematics; HTML is escaped when rendered.

Article references contain `title`, `url`, `kind` (`paper`, `book`, or `guide`), and `note` describing the source. They appear beside the library topic and at the end of its article. Shared reading resources in `papers.json` additionally include `id`, `authors`, `year`, `moduleIds`, and `level` (`essential` or `further`).

The historical `data/schedule.json` is retained in the repository but excluded from the published site. It is not loaded by the library.

The build creates `dist/learn/<topicId>/index.html`, `dist/data/topic-index.json`, and `dist/sitemap.xml`. Edit source JSON rather than generated files. Checks validate topic coverage, references, prerequisites, and substantive article content. External source availability can change even when a URL is structurally valid.

## Local Preview and Validation

Use Node.js 22. No `npm install` is needed. If Windows PowerShell blocks `npm.ps1`, replace `npm` with `npm.cmd`.

```sh
npm run dev
```

Open the address printed in the terminal for the research homepage. Add `/library.html` for the library. Use the local server because data files load over HTTP.

```sh
npm run check
npm run build
```

`check` validates content, reference links, navigation, search, and application behavior. `build` prepares the research homepage, library, and standalone articles in `dist/`, including `.nojekyll` for GitHub Pages.

## GitHub Pages

Repository: [`Enmingzz/vlm-project`](https://github.com/Enmingzz/vlm-project)

In **Settings → Pages → Build and deployment → Source**, select **GitHub Actions**. Changes pushed to `main` trigger the **Deploy enming group to GitHub Pages** workflow. It validates, builds, and publishes the site; its deployment result links to the live URL.

`dist/` is generated output and is not committed. `examples/projects.example.json` is an illustrative editing aid; `data/projects.json` is the source of published research records.
