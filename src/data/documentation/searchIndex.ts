import type { SearchResult } from './types';
import { docCategories } from './docRegistry';

/**
 * Searches across all documentation categories, topics, sections, and steps.
 * Returns ranked results with contextual snippets.
 */
export const searchDocumentation = (
  query: string,
  categoryIdFilter?: string
): SearchResult[] => {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) return [];

  const queryTerms = cleanQuery.split(/\s+/).filter(t => t.length > 0);
  const results: SearchResult[] = [];

  for (const category of docCategories) {
    if (categoryIdFilter && category.id !== categoryIdFilter) {
      continue;
    }

    for (const topic of category.topics) {
      const topicTitleLower = topic.title.toLowerCase();
      const topicDescLower = topic.description.toLowerCase();
      const tagsLower = topic.tags.map(t => t.toLowerCase());

      // 1. Topic-level match
      let topicScore = 0;
      for (const term of queryTerms) {
        if (topicTitleLower.includes(term)) {
          topicScore += 100;
          if (topicTitleLower.startsWith(term)) topicScore += 50;
        }
        if (tagsLower.some(tag => tag.includes(term))) {
          topicScore += 60;
        }
        if (topicDescLower.includes(term)) {
          topicScore += 30;
        }
      }

      if (topicScore > 0) {
        results.push({
          topicId: topic.id,
          topicTitle: topic.title,
          categoryId: category.id,
          categoryTitle: category.title,
          snippet: topic.description,
          matchScore: topicScore,
          type: 'topic'
        });
      }

      // 2. Section and step matches
      for (const section of topic.sections) {
        const secTitleLower = section.title.toLowerCase();
        const secContentLower = section.content.toLowerCase();

        let secScore = 0;
        for (const term of queryTerms) {
          if (secTitleLower.includes(term)) {
            secScore += 80;
          }
          if (secContentLower.includes(term)) {
            secScore += 40;
          }
        }

        // Check inside steps
        let matchedStepText = '';
        if (section.steps) {
          for (const step of section.steps) {
            const stepTitleLower = step.title.toLowerCase();
            const stepDescLower = step.description.toLowerCase();
            for (const term of queryTerms) {
              if (stepTitleLower.includes(term) || stepDescLower.includes(term)) {
                secScore += 50;
                if (!matchedStepText) {
                  matchedStepText = `Step ${step.stepNumber}: ${step.title} — ${step.description}`;
                }
              }
            }
          }
        }

        if (secScore > 0) {
          // Extract snippet
          let snippet = matchedStepText || section.content;
          if (snippet.length > 180) {
            // Find position of first term
            const firstTermPos = snippet.toLowerCase().indexOf(queryTerms[0]);
            if (firstTermPos > 40) {
              snippet = '...' + snippet.substring(firstTermPos - 30, firstTermPos + 150) + '...';
            } else {
              snippet = snippet.substring(0, 180) + '...';
            }
          }

          results.push({
            topicId: topic.id,
            topicTitle: topic.title,
            categoryId: category.id,
            categoryTitle: category.title,
            sectionId: section.id,
            sectionTitle: section.title,
            snippet,
            matchScore: secScore,
            type: matchedStepText ? 'step' : 'section'
          });
        }
      }
    }
  }

  // Deduplicate and rank by highest match score
  results.sort((a, b) => b.matchScore - a.matchScore);
  return results.slice(0, 25);
};
