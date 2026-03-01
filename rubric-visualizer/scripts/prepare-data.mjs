#!/usr/bin/env node
/**
 * Converts HealthBench JSONL files into static JSON for the Next.js app.
 * Strips `canary` and `ideal_completions_data` to reduce size.
 * Also generates an index.json manifest with tag enumerations.
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "../../data");
const OUT_DIR = join(__dirname, "../public/data");

const DATASETS = [
    { name: "healthbench_main", file: "healthbench_main.jsonl" },
    { name: "healthbench_hard", file: "healthbench_hard.jsonl" },
    { name: "healthbench_consensus", file: "healthbench_consensus.jsonl" },
];

mkdirSync(OUT_DIR, { recursive: true });

const manifest = { datasets: [] };

for (const ds of DATASETS) {
    const raw = readFileSync(join(DATA_DIR, ds.file), "utf-8");
    const examples = raw
        .trim()
        .split("\n")
        .map((line) => {
            const obj = JSON.parse(line);
            delete obj.canary;
            delete obj.ideal_completions_data;
            return obj;
        });

    // Collect unique tags
    const exampleTags = new Set();
    const rubricTags = new Set();
    for (const ex of examples) {
        for (const t of ex.example_tags || []) exampleTags.add(t);
        for (const r of ex.rubrics || []) {
            for (const t of r.tags || []) rubricTags.add(t);
        }
    }

    writeFileSync(join(OUT_DIR, `${ds.name}.json`), JSON.stringify(examples));

    manifest.datasets.push({
        name: ds.name,
        label: ds.name
            .replace("healthbench_", "")
            .replace(/^\w/, (c) => c.toUpperCase()),
        count: examples.length,
        exampleTags: [...exampleTags].sort(),
        rubricTags: [...rubricTags].sort(),
    });

    console.log(`✓ ${ds.name}: ${examples.length} examples`);
}

writeFileSync(join(OUT_DIR, "index.json"), JSON.stringify(manifest, null, 2));
console.log("✓ index.json manifest written");
console.log("Done!");
