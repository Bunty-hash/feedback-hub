import type { CategorySlug } from './categories';

export type Sentiment = 'positive' | 'neutral' | 'negative';

export interface FeedbackRow {
  id: string;
  category: CategorySlug;
  participant_name: string | null;
  event_name: string;
  event_date: string;
  host_name: string | null;
  overall_rating: number;
  sentiment: Sentiment;
  ratings: Record<string, number>;
  comments: Record<string, string>;
  created_at: string;
}
