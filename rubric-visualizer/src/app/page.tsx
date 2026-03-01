"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";

/* ────────────────────── types ────────────────────── */
interface Rubric {
  criterion: string;
  points: number;
  tags: string[];
}

interface Example {
  prompt_id: string;
  prompt: { role: string; content: string }[];
  rubrics: Rubric[];
  example_tags: string[];
}

interface DatasetMeta {
  name: string;
  label: string;
  count: number;
  exampleTags: string[];
  rubricTags: string[];
}

interface Manifest {
  datasets: DatasetMeta[];
}

const PER_PAGE = 25;

/* ───────────── tag helpers ────────────────────────── */
function tagCategory(tag: string) {
  if (tag.startsWith("theme:")) return "theme";
  if (tag.startsWith("physician_agreed_category:")) return "category";
  return "other";
}

function tagLabel(tag: string) {
  return tag.replace(/^(theme:|physician_agreed_category:)/, "").replace(/_/g, " ");
}

function parseExampleTags(tags: string[]) {
  const themes = tags.filter((t) => t.startsWith("theme:"));
  const categories = tags.filter((t) => t.startsWith("physician_agreed_category:"));
  return { themes, categories };
}

/* ────────────────────── component ────────────────── */
export default function HomePage() {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [dataset, setDataset] = useState("healthbench_main");
  const [examples, setExamples] = useState<Example[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedThemes, setSelectedThemes] = useState<Set<string>>(new Set());
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

  // Load manifest on mount
  useEffect(() => {
    fetch("/data/index.json")
      .then((r) => r.json())
      .then((m: Manifest) => setManifest(m));
  }, []);

  // Load dataset when dataset changes
  useEffect(() => {
    setLoading(true);
    setPage(1);
    fetch(`/data/${dataset}.json`)
      .then((r) => r.json())
      .then((data: Example[]) => {
        setExamples(data);
        setLoading(false);
      });
  }, [dataset]);

  // Parse available filter tags from manifest
  const currentMeta = manifest?.datasets.find((d) => d.name === dataset);
  const availableThemes = useMemo(() => {
    if (!currentMeta) return [];
    return currentMeta.exampleTags
      .filter((t) => t.startsWith("theme:"))
      .sort();
  }, [currentMeta]);

  const availableCategories = useMemo(() => {
    if (!currentMeta) return [];
    return currentMeta.exampleTags
      .filter((t) => t.startsWith("physician_agreed_category:"))
      .sort();
  }, [currentMeta]);

  // Filter examples
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return examples.filter((ex) => {
      // Text search
      if (q) {
        const promptText = ex.prompt.map((m) => m.content).join(" ").toLowerCase();
        if (!promptText.includes(q)) return false;
      }
      // Tag filters
      if (selectedThemes.size > 0) {
        if (!ex.example_tags.some((t) => selectedThemes.has(t))) return false;
      }
      if (selectedCategories.size > 0) {
        if (!ex.example_tags.some((t) => selectedCategories.has(t))) return false;
      }
      return true;
    });
  }, [examples, search, selectedThemes, selectedCategories]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const pageExamples = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const toggleTag = useCallback(
    (tag: string, set: Set<string>, setter: React.Dispatch<React.SetStateAction<Set<string>>>) => {
      const next = new Set(set);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      setter(next);
      setPage(1);
    },
    []
  );

  // Reset filters when dataset changes
  useEffect(() => {
    setSelectedThemes(new Set());
    setSelectedCategories(new Set());
    setSearch("");
  }, [dataset]);

  // ─── Render ──────────────────────────
  if (!manifest) {
    return (
      <main className="main-container">
        <div className="loading">
          <div className="spinner" />
          <div className="loading-text">Loading manifest…</div>
        </div>
      </main>
    );
  }

  return (
    <main className="main-container">
      {/* Dataset tabs */}
      <div className="dataset-tabs">
        {manifest.datasets.map((ds) => (
          <button
            key={ds.name}
            className={`dataset-tab ${ds.name === dataset ? "active" : ""}`}
            onClick={() => setDataset(ds.name)}
          >
            {ds.label}
            <span className="tab-count">({ds.count.toLocaleString()})</span>
          </button>
        ))}
      </div>

      {/* Stats bar */}
      <div className="stats-bar">
        <div className="stat-card">
          <div className="stat-value">{filtered.length.toLocaleString()}</div>
          <div className="stat-label">
            {filtered.length === examples.length ? "Questions" : "Filtered"}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {examples.length > 0
              ? (
                examples.reduce((s, e) => s + e.rubrics.length, 0) / examples.length
              ).toFixed(1)
              : "—"}
          </div>
          <div className="stat-label">Avg Rubrics / Q</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {examples.filter((e) => e.prompt.length > 1).length.toLocaleString()}
          </div>
          <div className="stat-label">Multi-turn</div>
        </div>
      </div>

      {/* Search & filter controls */}
      <div className="controls-row">
        <div className="search-wrapper">
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            placeholder="Search prompts…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <button
          className={`filter-toggle ${showFilters ? "active" : ""}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          ⚙ Filters
          {(selectedThemes.size > 0 || selectedCategories.size > 0) && (
            <span className="badge badge-rubrics">
              {selectedThemes.size + selectedCategories.size}
            </span>
          )}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="filter-panel">
          <div className="filter-group">
            <h3>Theme</h3>
            <div className="filter-chips">
              {availableThemes.map((t) => (
                <button
                  key={t}
                  className={`filter-chip ${selectedThemes.has(t) ? "active" : ""}`}
                  onClick={() => toggleTag(t, selectedThemes, setSelectedThemes)}
                >
                  {tagLabel(t)}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <h3>Physician Category</h3>
            <div className="filter-chips">
              {availableCategories.map((t) => (
                <button
                  key={t}
                  className={`filter-chip ${selectedCategories.has(t) ? "active" : ""}`}
                  onClick={() => toggleTag(t, selectedCategories, setSelectedCategories)}
                >
                  {tagLabel(t)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Question list */}
      {loading ? (
        <div className="loading">
          <div className="spinner" />
          <div className="loading-text">Loading dataset…</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔎</div>
          <h3>No matching questions</h3>
          <p>Try adjusting your search or filters.</p>
        </div>
      ) : (
        <>
          <div className="question-list">
            {pageExamples.map((ex, i) => {
              const idx = (page - 1) * PER_PAGE + i;
              const firstMsg = ex.prompt[0]?.content || "";
              const posPoints = ex.rubrics
                .filter((r) => r.points > 0)
                .reduce((s, r) => s + r.points, 0);
              const negPoints = ex.rubrics
                .filter((r) => r.points < 0)
                .reduce((s, r) => s + r.points, 0);
              const { themes, categories } = parseExampleTags(ex.example_tags);

              return (
                <Link
                  key={ex.prompt_id}
                  href={`/question/${ex.prompt_id}?dataset=${dataset}`}
                  className="question-card"
                >
                  <div className="question-card-header">
                    <span className="question-number">#{idx + 1}</span>
                    <div className="question-meta">
                      <span className="badge badge-rubrics">
                        {ex.rubrics.length} rubrics
                      </span>
                      {ex.prompt.length > 1 && (
                        <span className="badge badge-turns">
                          {Math.ceil(ex.prompt.length / 2)} turns
                        </span>
                      )}
                      <span className="badge badge-points-pos">+{posPoints}</span>
                      {negPoints < 0 && (
                        <span className="badge badge-points-neg">{negPoints}</span>
                      )}
                    </div>
                  </div>
                  <div className="question-prompt">{firstMsg}</div>
                  <div className="question-footer">
                    {themes.map((t) => (
                      <span key={t} className="tag-pill theme">
                        {tagLabel(t)}
                      </span>
                    ))}
                    {categories.map((t) => (
                      <span key={t} className="tag-pill category">
                        {tagLabel(t)}
                      </span>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="page-btn"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                ← Prev
              </button>
              {generatePageNumbers(page, totalPages).map((p, i) =>
                p === "..." ? (
                  <span key={`ellipsis-${i}`} className="page-info">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    className={`page-btn ${p === page ? "active" : ""}`}
                    onClick={() => setPage(p as number)}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                className="page-btn"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}

/* ─── Pagination helper ───────────────────────── */
function generatePageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 7)
    return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | string)[] = [1];
  if (current > 3) pages.push("...");
  for (
    let p = Math.max(2, current - 1);
    p <= Math.min(total - 1, current + 1);
    p++
  ) {
    pages.push(p);
  }
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}
