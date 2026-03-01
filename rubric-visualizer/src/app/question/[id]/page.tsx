"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";

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

function tagLabel(tag: string) {
    return tag
        .replace(/^(theme:|physician_agreed_category:|axis:|cluster:|level:)/, "")
        .replace(/_/g, " ");
}

function tagType(tag: string) {
    if (tag.startsWith("theme:")) return "theme";
    if (tag.startsWith("physician_agreed_category:")) return "category";
    if (tag.startsWith("axis:")) return "axis";
    if (tag.startsWith("cluster:")) return "cluster";
    return "";
}

export default function QuestionDetailPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const promptId = params.id as string;
    const dataset = searchParams.get("dataset") || "healthbench_main";

    const [example, setExample] = useState<Example | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/data/${dataset}.json`)
            .then((r) => r.json())
            .then((data: Example[]) => {
                const found = data.find((ex) => ex.prompt_id === promptId);
                setExample(found || null);
                setLoading(false);
            });
    }, [dataset, promptId]);

    const rubricStats = useMemo(() => {
        if (!example) return null;
        const rubrics = example.rubrics;
        const totalPos = rubrics
            .filter((r) => r.points > 0)
            .reduce((s, r) => s + r.points, 0);
        const totalNeg = rubrics
            .filter((r) => r.points < 0)
            .reduce((s, r) => s + r.points, 0);

        const axisCounts: Record<string, number> = {};
        for (const r of rubrics) {
            for (const t of r.tags) {
                if (t.startsWith("axis:")) {
                    const axis = tagLabel(t);
                    axisCounts[axis] = (axisCounts[axis] || 0) + 1;
                }
            }
        }

        return { total: rubrics.length, totalPos, totalNeg, axisCounts };
    }, [example]);

    if (loading) {
        return (
            <main className="main-container">
                <div className="loading">
                    <div className="spinner" />
                    <div className="loading-text">Loading question…</div>
                </div>
            </main>
        );
    }

    if (!example) {
        return (
            <main className="main-container">
                <div className="empty-state">
                    <div className="empty-state-icon">❌</div>
                    <h3>Question not found</h3>
                    <p>
                        No question with ID <code>{promptId}</code> in{" "}
                        {dataset.replace("healthbench_", "")}.
                    </p>
                    <Link href="/" className="back-link" style={{ marginTop: 20 }}>
                        ← Back to all questions
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main className="main-container">
            <Link href="/" className="back-link">
                ← Back to all questions
            </Link>

            {/* Header */}
            <div className="detail-header">
                <div className="detail-title">Question</div>
                <div className="detail-id">{example.prompt_id}</div>
                <div className="detail-tags">
                    {example.example_tags.map((t) => (
                        <span key={t} className={`tag-pill ${tagType(t)}`}>
                            {tagLabel(t)}
                        </span>
                    ))}
                </div>
            </div>

            {/* Conversation */}
            <h2 className="section-title">
                💬 Conversation
                {example.prompt.length > 1 && (
                    <span className="badge badge-turns">
                        {Math.ceil(example.prompt.length / 2)} turns
                    </span>
                )}
            </h2>
            <div className="conversation">
                {example.prompt.map((msg, i) => (
                    <div
                        key={i}
                        className={`message ${msg.role === "user" ? "message-user" : "message-assistant"
                            }`}
                    >
                        <div className="message-role">{msg.role}</div>
                        {msg.content}
                    </div>
                ))}
            </div>

            {/* Rubric stats */}
            <h2 className="section-title">📋 Rubric Items</h2>
            {rubricStats && (
                <div className="rubric-summary">
                    <div className="rubric-stat">
                        <div className="rubric-stat-value">{rubricStats.total}</div>
                        <div className="rubric-stat-label">Total Rubrics</div>
                    </div>
                    <div className="rubric-stat">
                        <div className="rubric-stat-value" style={{ color: "var(--green)" }}>
                            +{rubricStats.totalPos}
                        </div>
                        <div className="rubric-stat-label">Max Positive Pts</div>
                    </div>
                    {rubricStats.totalNeg < 0 && (
                        <div className="rubric-stat">
                            <div className="rubric-stat-value" style={{ color: "var(--red)" }}>
                                {rubricStats.totalNeg}
                            </div>
                            <div className="rubric-stat-label">Max Penalty Pts</div>
                        </div>
                    )}
                    {Object.entries(rubricStats.axisCounts).map(([axis, count]) => (
                        <div className="rubric-stat" key={axis}>
                            <div className="rubric-stat-value">{count}</div>
                            <div className="rubric-stat-label">{axis}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Rubric table */}
            <div className="rubric-table-container">
                <table className="rubric-table">
                    <thead>
                        <tr>
                            <th style={{ width: 60 }}>#</th>
                            <th>Criterion</th>
                            <th style={{ width: 80 }}>Points</th>
                            <th>Tags</th>
                        </tr>
                    </thead>
                    <tbody>
                        {example.rubrics.map((r, i) => (
                            <tr key={i}>
                                <td style={{ color: "var(--text-muted)", fontSize: 13 }}>
                                    {i + 1}
                                </td>
                                <td className="rubric-criterion">{r.criterion}</td>
                                <td>
                                    <span
                                        className={`rubric-points ${r.points >= 0 ? "positive" : "negative"
                                            }`}
                                    >
                                        {r.points > 0 ? `+${r.points}` : r.points}
                                    </span>
                                </td>
                                <td>
                                    <div className="rubric-tags-cell">
                                        {r.tags
                                            .filter((t) => !t.startsWith("level:"))
                                            .map((t) => (
                                                <span key={t} className={`tag-pill ${tagType(t)}`}>
                                                    {tagLabel(t)}
                                                </span>
                                            ))}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </main>
    );
}
