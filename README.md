# AI Research Mentorship

为 mentor / mentee 准备的 AI 研究课程主页：15 个学习模块、216 个知识点、论文与教材链接，以及可调整的 24 周建议计划。课程保留原始大纲的主题、优先级和验收要求；周计划是起点，可按基础、研究方向和计算预算修改。

静态 HTML / CSS / JavaScript，无运行时依赖，适合 GitHub Pages。

## 使用

- 在课程地图中展开模块，勾选知识点、查看论文和记录学习笔记。
- 在学习计划中查看每周重点、关联阅读和具体交付物；第 21–22 周为方向选修，可用于补强或课题复现。
- 研究方法贯穿整个计划；P2 的 Flow Matching 和 RL 深入内容按方向选学。
- 学习进度和笔记保存在当前浏览器的 `localStorage`，不会自动同步到 GitHub、其他设备或 mentor。使用页面的 JSON 导出 / 导入功能备份或迁移记录。

这是一份共享课程加个人学习记录，不包含账号系统或 mentor 管理后台。清理浏览器站点数据会删除本地记录，请先导出备份。

## 本地预览

使用 Node.js 22，无需 `npm install`：

Windows PowerShell 若限制 `npm.ps1` 执行，将下方命令中的 `npm` 换为 `npm.cmd` 即可。

```sh
npm run dev
```

打开终端显示的本地地址。请通过本地服务器访问，数据文件需要通过 HTTP 加载。

```sh
npm run check
npm run build
```

`check` 验证应用和课程数据，`build` 将静态文件复制到 `dist/`，并生成 `.nojekyll`。

## 课程结构

| 模块 | 主题 | 优先级 |
| --- | --- | --- |
| 01 | Mathematics & Machine Learning Foundations | P0 |
| 02 | PyTorch & Engineering Basics | P0 |
| 03 | Fundamental Neural Networks | P0 |
| 04 | Attention & Transformer | P0 |
| 05 | Large Language Models | P1 |
| 06 | Fine-Tuning & LoRA | P1 |
| 07 | Mixture of Experts (MoE) | P1 |
| 08 | Computer Vision & Visual Representation | P1 |
| 09 | Generative Models | P1：VAE / Diffusion；P2：Flow Matching 深入 |
| 10 | Vision-Language Models (VLM) | P1 |
| 11 | Efficient Deep Learning | P1 |
| 12 | Post-Training, Distillation & Reinforcement Learning | P1：SFT / Distillation；P2：RL 深入 |
| 13 | Video Understanding & Memory | P2，方向选修 |
| 14 | Vision-Language-Action / World Models | P2，方向选修 |
| 15 | Research Skills & Scientific Method | P0–P1，全过程必修 |

## 修改课程与阅读清单

内容集中在 `data/`，可以直接通过 GitHub 编辑 JSON 并提交：

| 文件 | 内容 |
| --- | --- |
| `data/curriculum.json` | 模块、知识点、分组、优先级、核心公式和验收要求 |
| `data/papers.json` | 论文、教程和教材；通过 `moduleIds` 关联模块 |
| `data/schedule.json` | 建议周次、学习重点、交付物和关联阅读 |

模块 ID 使用 `"01"`–`"15"`。知识点的 `id` 用于保存勾选记录，修改文字时保留原 ID；新增知识点时使用唯一 ID。

阅读资源示例：

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
  "note": "逐项推导 Q/K/V、scaled dot-product attention 与 Transformer Block。"
}
```

`kind` 为 `paper`、`guide` 或 `book`；`level` 为 `essential` 或 `further`。年份表示资源首发年份，在线指南可能持续更新。推荐阅读用于帮助进入主题，不要求在一周内读完模块下的所有资源。

周计划示例：

```json
{
  "week": 1,
  "title": "数学起点与研究习惯",
  "phase": "foundations",
  "moduleIds": ["01", "15"],
  "focus": "复习矩阵与链式法则，建立论文阅读和实验记录习惯。",
  "deliverable": "提交梯度推导和一份结构化阅读笔记。",
  "readingIds": ["deep-learning-book", "how-to-read"],
  "readingModuleIds": ["01", "15"],
  "readingLimit": 2
}
```

`phase` 为 `foundations`、`core`、`frontiers` 或 `research`。优先通过 `readingIds` 指定当周资源的 ID 和顺序，使阅读与每周主题对应；ID 必须存在于 `papers.json`。未指定时，`readingModuleIds` 按模块关联资源作为回退。`readingLimit` 控制周卡片展示的资源数量；选修周加 `"optional": true`。计划只使用相对周次，没有预设开课日期。修改后运行 `npm run check`。

## GitHub Pages

仓库：[`Enmingzz/ai-research-mentorship`](https://github.com/Enmingzz/ai-research-mentorship)

1. 在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
2. 将内容推送到 `main`，或手动运行 **Deploy course to GitHub Pages** 工作流。
3. 工作流会先验证、构建，再发布 `dist/`；部署地址显示在 Actions 的部署结果中。

预期地址：<https://enmingzz.github.io/ai-research-mentorship/>。后续修改课程数据或页面样式并提交到 `main`，即可触发更新。

## 文件说明

- `index.html` / `style.css` / `app.js`：界面、交互与本地学习记录。
- `tools/`：本地服务、数据检查与静态构建脚本。
- `.github/workflows/pages.yml`：GitHub Pages 发布流程。
- `dist/`：生成目录，不提交到仓库。
