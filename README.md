# AI Research Mentorship

An AI research course home for mentors and mentees: 15 learning modules, 216 knowledge checkpoints, links to papers and textbooks, and an adjustable 24-week suggested schedule. The course preserves the original syllabus topics, priorities, and assessment requirements. Adapt the schedule to the mentee's background, research direction, and compute budget.

Built with static HTML, CSS, and JavaScript, with no runtime dependencies. Ready for GitHub Pages.

## Use the Course

- Expand modules in the curriculum to check off topics, open readings, and keep learning notes.
- Use the schedule to review each week's focus, assigned readings, and concrete deliverables. Weeks 21–22 are direction electives that can also be used for revision or project reproduction.
- Practice research methods throughout the course. Advanced P2 topics in Flow Matching and reinforcement learning are optional extensions for relevant research directions.
- Progress and notes are saved in the current browser's `localStorage`. They do not automatically sync to GitHub, other devices, or your mentor. Use JSON export and import to back up or transfer your records.

This site combines a shared curriculum with personal learning records. It has no account system or mentor administration dashboard. Clearing the browser's site data removes local records, so export a backup first.

## Local Preview

Use Node.js 22. No `npm install` is needed.

If Windows PowerShell blocks `npm.ps1`, replace `npm` with `npm.cmd` in the commands below.

```sh
npm run dev
```

Open the local address printed in the terminal. Use the local server because the data files need to load over HTTP.

```sh
npm run check
npm run build
```

`check` validates the application and course data. `build` copies static files to `dist/` and generates `.nojekyll`.

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
| 13 | Video Understanding & Memory | P2, direction elective |
| 14 | Vision-Language-Action / World Models | P2, direction elective |
| 15 | Research Skills & Scientific Method | P0–P1, required throughout |

## Edit the Curriculum and Readings

Content lives in `data/`. Edit the JSON files directly on GitHub and commit your changes:

| File | Content |
| --- | --- |
| `data/curriculum.json` | Modules, topics, groups, priorities, core formulas, and assessments |
| `data/papers.json` | Papers, guides, and textbooks, linked to modules through `moduleIds` |
| `data/schedule.json` | Suggested weeks, learning focus, deliverables, and assigned readings |

Module IDs use `"01"`–`"15"`. Topic `id` values identify saved checkbox records. Keep existing IDs when editing text, and assign a unique ID to each new topic.

Example reading resource:

```json
{
  "id": "attention",
  "title": "Attention Is All You Need",
  "authors": "Ashish Vaswani et al.",
  "year": 2017,
  "moduleIds": ["04"],
  "kind": "paper",
  "url": "https://arxiv.org/abs/1706.03762",
  "level": "essential",
  "note": "Work through Q/K/V, scaled dot-product attention, and the Transformer block."
}
```

`kind` is `paper`, `guide`, or `book`; `level` is `essential` or `further`. The year records the resource's initial release; online guides may receive ongoing updates. Recommended readings provide an entry point to each topic. Mentees are not expected to finish every resource in a module within one week.

Example schedule entry:

```json
{
  "week": 1,
  "title": "Math Foundations & Research Habits",
  "phase": "foundations",
  "moduleIds": ["01", "15"],
  "focus": "Review matrices and the chain rule; establish paper-reading and experiment-logging habits.",
  "deliverable": "Submit a gradient derivation and a structured reading note.",
  "readingIds": ["deep-learning-book", "how-to-read"],
  "readingModuleIds": ["01", "15"],
  "readingLimit": 2
}
```

`phase` is `foundations`, `core`, `frontiers`, or `research`. Prefer `readingIds` to specify the exact resources and their order for a week; every ID must exist in `papers.json`, and the complete explicit list is shown. If no explicit resources are specified, `readingModuleIds` provides a fallback by linking readings from those modules, with `readingLimit` controlling only this fallback selection. Add `"optional": true` for an elective week. The schedule uses relative week numbers with no preset start date. Run `npm run check` after editing.

## GitHub Pages

Repository: [`Enmingzz/ai-research-mentorship`](https://github.com/Enmingzz/ai-research-mentorship)

1. In the repository, set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**.
2. Push changes to `main`, or manually run the **Deploy course to GitHub Pages** workflow.
3. The workflow validates and builds the site, then publishes `dist/`. The deployment URL appears in the Actions deployment result.

Site URL: <https://enmingzz.github.io/ai-research-mentorship/>. Commit future course or style changes to `main` to trigger an update.

## Files

- `index.html` / `style.css` / `app.js`: interface, interactions, and local learning records.
- `tools/`: local server, data validation, and static build scripts.
- `.github/workflows/pages.yml`: GitHub Pages deployment workflow.
- `dist/`: generated output, excluded from version control.
