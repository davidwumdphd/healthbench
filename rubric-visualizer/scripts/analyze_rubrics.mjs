import { readFileSync, writeFileSync } from 'fs';

const data = JSON.parse(readFileSync('/Users/dwu/Code/healthbench/rubric-visualizer/public/data/healthbench_main.json', 'utf-8'));

const vagueTerms = ['appropriate', 'sufficient', 'adequate', 'reasonable', 'unnecessarily', 'too general', 'overly', 'properly'];

// Score each question by reliability issues
const scored = data.map(ex => {
    let score = 0;
    const issues = [];

    for (let i = 0; i < ex.rubrics.length; i++) {
        const r = ex.rubrics[i];
        const c = r.criterion;
        const absP = Math.abs(r.points);

        // 1. Very long criterion — weighted by length and points
        if (c.length > 500) {
            const penalty = (c.length / 500) * absP;
            score += penalty;
            issues.push({ idx: i + 1, type: 'long', detail: c.length + ' chars', pts: r.points });
        }

        // 2. Multi-dimensional — count AND conditions, weight by points
        const andCount = (c.match(/\band\b/gi) || []).length;
        if (andCount >= 3 && absP >= 5) {
            score += andCount * absP * 0.5;
            issues.push({ idx: i + 1, type: 'multi_dim', detail: andCount + ' ANDs', pts: r.points });
        }

        // 3. Vague language on high-weight
        const vagueCount = vagueTerms.filter(t => c.toLowerCase().includes(t)).length;
        if (vagueCount >= 2 && absP >= 5) {
            score += vagueCount * absP;
            issues.push({ idx: i + 1, type: 'vague', detail: vagueCount + ' vague terms', pts: r.points });
        }

        // 4. Ambiguous negatives
        if (r.points < 0 && (c.includes('not ') || c.includes('does not')) &&
            (c.includes('without') || c.includes('fail'))) {
            score += absP * 1.5;
            issues.push({ idx: i + 1, type: 'ambig_neg', detail: 'double negation', pts: r.points });
        }

        // 5. Overlapping pos/neg
        if (r.points > 0) {
            for (let j = 0; j < ex.rubrics.length; j++) {
                if (j === i || ex.rubrics[j].points >= 0) continue;
                const words1 = new Set(c.toLowerCase().split(/\W+/).filter(w => w.length > 4));
                const words2 = new Set(ex.rubrics[j].criterion.toLowerCase().split(/\W+/).filter(w => w.length > 4));
                const overlap = [...words1].filter(w => words2.has(w)).length;
                if (overlap / Math.min(words1.size, words2.size) > 0.5 && words1.size > 3) {
                    score += absP * 0.8;
                    issues.push({ idx: i + 1, type: 'overlap', detail: 'with #' + (j + 1), pts: r.points });
                    break; // only count once per rubric
                }
            }
        }
    }

    return { prompt_id: ex.prompt_id, score, issues, question: ex.prompt[0].content, rubrics: ex.rubrics };
});

// Top 10 worst
scored.sort((a, b) => b.score - a.score);
console.log('=== TOP 10 WORST RUBRICS ===');
for (const q of scored.slice(0, 10)) {
    console.log();
    console.log('Score:', q.score.toFixed(1), '| ID:', q.prompt_id);
    console.log('Q:', q.question.slice(0, 120));
    console.log('Rubrics:', q.rubrics.length);
    for (const iss of q.issues) {
        console.log('  #' + iss.idx, '(' + (iss.pts > 0 ? '+' : '') + iss.pts + ')', iss.type + ':', iss.detail);
    }
}

// Now find 3 best: high rubric count, all short, all single-dimensional, no issues
console.log();
console.log('=== FINDING BEST RUBRICS ===');

const goodCandidates = scored
    .filter(q => q.score === 0 && q.rubrics.length >= 10)
    .map(q => {
        // Score positively: short rubrics, clear binary criteria, no vague terms
        const avgLen = q.rubrics.reduce((s, r) => s + r.criterion.length, 0) / q.rubrics.length;
        const maxLen = Math.max(...q.rubrics.map(r => r.criterion.length));
        const hasNeg = q.rubrics.some(r => r.points < 0);
        const allShort = maxLen < 200;
        const goodness = q.rubrics.length / (avgLen / 50) * (hasNeg ? 1.2 : 1) * (allShort ? 2 : 1);
        return { ...q, avgLen: avgLen.toFixed(0), maxLen, goodness: goodness.toFixed(1) };
    })
    .sort((a, b) => b.goodness - a.goodness);

console.log('Good candidates (0 issues, 10+ rubrics):', goodCandidates.length);
for (const q of goodCandidates.slice(0, 10)) {
    console.log();
    console.log('Goodness:', q.goodness, '| ID:', q.prompt_id);
    console.log('Q:', q.question.slice(0, 120));
    console.log('Rubrics:', q.rubrics.length, '| Avg len:', q.avgLen, '| Max len:', q.maxLen);
    for (const r of q.rubrics.slice(0, 5)) {
        console.log('  (' + (r.points > 0 ? '+' : '') + r.points + ')', r.criterion.slice(0, 100));
    }
}

// Output the IDs
console.log();
console.log('=== FINAL SELECTIONS ===');
console.log('Top 10 worst IDs:', JSON.stringify(scored.slice(0, 10).map(q => q.prompt_id)));
console.log('Top 3 best IDs:', JSON.stringify(goodCandidates.slice(0, 3).map(q => q.prompt_id)));
