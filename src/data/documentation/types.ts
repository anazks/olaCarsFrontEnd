export interface DocStep {
  stepNumber: number;
  title: string;
  description: string;
  expectedOutcome?: string;
}

export interface DocSection {
  id: string;
  title: string;
  content: string;
  steps?: DocStep[];
  tips?: string[];
  warnings?: string[];
  keyFields?: { name: string; required: boolean; description: string }[];
}

export interface DocTopic {
  id: string;
  categoryId: string;
  title: string;
  shortTitle?: string;
  description: string;
  iconName?: string;
  rolesAllowed?: string[];
  relatedRoutes?: { label: string; path: string }[];
  tags: string[];
  sections: DocSection[];
}

export interface DocCategory {
  id: string;
  title: string;
  description: string;
  iconName: string;
  topics: DocTopic[];
}

export interface SearchResult {
  topicId: string;
  topicTitle: string;
  categoryId: string;
  categoryTitle: string;
  sectionId?: string;
  sectionTitle?: string;
  snippet: string;
  matchScore: number;
  type: 'topic' | 'section' | 'step';
}

// Runtime marker to ensure module export compliance in ES module environments
export const DOCUMENTATION_VERSION = '1.0.0';
