export type CategorySlug = 'training' | 'exhibition' | 'masterclass' | 'presentation';
export type FieldType = 'text' | 'date' | 'rating' | 'textarea';
/** Fields with a role are stored in dedicated database columns; others go into ratings / comments. */
export type FieldRole = 'event_name' | 'event_date' | 'host_name' | 'overall';

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  role?: FieldRole;
}

export interface CategoryDef {
  slug: CategorySlug;
  title: string;
  blurb: string;
  icon: string;
  fields: FieldDef[];
}

interface Opts {
  role?: FieldRole;
  required?: boolean;
}

const text = (key: string, label: string, o: Opts = {}): FieldDef => ({
  key, label, type: 'text', required: o.required ?? true, role: o.role,
});
const date = (key: string, label: string, o: Opts = {}): FieldDef => ({
  key, label, type: 'date', required: o.required ?? true, role: o.role,
});
const rating = (key: string, label: string, o: Opts = {}): FieldDef => ({
  key, label, type: 'rating', required: o.required ?? true, role: o.role,
});
const area = (key: string, label: string, o: Opts = {}): FieldDef => ({
  key, label, type: 'textarea', required: o.required ?? false, role: o.role,
});

export const CATEGORIES: CategoryDef[] = [
  {
    slug: 'training',
    title: 'Training Feedback',
    blurb: 'Tell us how your training programme went.',
    icon: '🎓',
    fields: [
      text('event_name', 'Training programme name', { role: 'event_name' }),
      date('event_date', 'Training date', { role: 'event_date' }),
      text('host_name', 'Trainer name', { role: 'host_name' }),
      rating('overall', 'Overall satisfaction', { role: 'overall' }),
      rating('content_quality', 'Training content quality'),
      rating('trainer_effectiveness', 'Trainer effectiveness'),
      rating('knowledge_gained', 'Knowledge gained'),
      area('liked_most', 'What did you like most?'),
      area('improvements', 'What can be improved?'),
    ],
  },
  {
    slug: 'exhibition',
    title: 'Exhibition Training Feedback',
    blurb: 'Share your experience of training at an exhibition.',
    icon: '🏛️',
    fields: [
      text('event_name', 'Exhibition name', { role: 'event_name' }),
      date('event_date', 'Exhibition date', { role: 'event_date' }),
      rating('overall', 'Overall experience', { role: 'overall' }),
      rating('training_quality', 'Training quality'),
      rating('product_knowledge', 'Product knowledge'),
      rating('staff_support', 'Staff support'),
      rating('learning_experience', 'Learning experience'),
      area('suggestions', 'Suggestions for improvement'),
    ],
  },
  {
    slug: 'masterclass',
    title: 'Masterclass Feedback',
    blurb: 'Rate your masterclass session and instructor.',
    icon: '🎯',
    fields: [
      text('event_name', 'Masterclass title', { role: 'event_name' }),
      date('event_date', 'Session date', { role: 'event_date' }),
      text('host_name', 'Instructor name', { role: 'host_name' }),
      rating('overall', 'Overall satisfaction', { role: 'overall' }),
      rating('content_quality', 'Content quality'),
      rating('instructor_effectiveness', 'Instructor effectiveness'),
      rating('practical_knowledge', 'Practical knowledge gained'),
      area('key_takeaways', 'Key takeaways'),
      area('suggestions', 'Suggestions for improvement'),
    ],
  },
  {
    slug: 'presentation',
    title: 'Presentation Questionnaire',
    blurb: 'Let us know how clear and useful the presentation was.',
    icon: '📊',
    fields: [
      text('event_name', 'Presentation topic', { role: 'event_name' }),
      date('event_date', 'Presentation date', { role: 'event_date' }),
      text('host_name', 'Speaker name', { role: 'host_name' }),
      rating('content_clarity', 'Content clarity'),
      rating('speaker_effectiveness', 'Speaker effectiveness'),
      rating('overall', 'Overall presentation rating', { role: 'overall' }),
      rating('key_messages_understood', 'Key messages understood'),
      area('questions_concerns', 'Questions or concerns'),
      area('additional_comments', 'Additional comments'),
    ],
  },
];

export const CATEGORY_BY_SLUG = Object.fromEntries(
  CATEGORIES.map((c) => [c.slug, c]),
) as Record<CategorySlug, CategoryDef>;
