# HealthBench Rubric Visualizer

An interactive Next.js application for exploring the [HealthBench](https://github.com/openai/healthbench) evaluation dataset — 5,000+ physician-authored medical questions with detailed grading rubrics.

## Features

- **Dataset browser** — Switch between Main (5,000), Hard (1,000), and Consensus (3,671) subsets
- **Full-text search** across all prompts
- **Tag-based filtering** by theme and physician-agreed category
- **Question detail view** with conversation thread and rubric table (points, axes, tags)
- **Rubric quality flags** — Top 10 worst and Top 3 best rubrics flagged with explanations
- **Dark-mode design** with glassmorphism styling

## Getting Started

```bash
# Install dependencies
npm install

# Preprocess data (converts upstream JSONL to static JSON)
node scripts/prepare-data.mjs

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Data Pipeline

The `scripts/prepare-data.mjs` script reads the upstream JSONL files from the parent directory:

- `healthbench_main.jsonl` → `public/data/healthbench_main.json`
- `healthbench_hard.jsonl` → `public/data/healthbench_hard.json`
- `healthbench_consensus.jsonl` → `public/data/healthbench_consensus.json`

It strips `canary` and `ideal_completions_data` fields to reduce file size, and generates a `public/data/index.json` manifest with dataset metadata (counts, available tags).

Rubric quality flags are stored in `public/data/flags.json`.

## Project Structure

```
rubric-visualizer/
├── public/data/          # Static JSON data files (generated)
├── scripts/
│   └── prepare-data.mjs  # JSONL → JSON preprocessing
├── src/app/
│   ├── globals.css       # Design system and styles
│   ├── layout.tsx        # Root layout with header
│   ├── page.tsx          # Main page (search, filter, list)
│   └── question/[id]/
│       └── page.tsx      # Question detail page
└── package.json
```

## Deploying to Vercel

```bash
npx vercel
```

Or connect the repo to Vercel and set **Root Directory** to `rubric-visualizer`.

The static data files in `public/data/` total ~50 MB, well within Vercel's 250 MB limit.

## Tech Stack

- **Next.js 16** (App Router, TypeScript)
- **Custom CSS** (no Tailwind)
- **Static JSON** (no database required)
