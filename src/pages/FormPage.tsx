import { useParams } from 'react-router-dom';
import { CATEGORIES } from '../lib/categories';
import FeedbackForm from '../components/FeedbackForm';
import NotFound from './NotFound';

export default function FormPage() {
  const { slug } = useParams();
  const category = CATEGORIES.find((c) => c.slug === slug);
  if (!category) return <NotFound />;
  return <FeedbackForm key={category.slug} category={category} />;
}
