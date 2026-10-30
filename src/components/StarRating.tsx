interface Props {
  value: number;
  onChange: (n: number) => void;
  labelledBy: string;
  id?: string;
}

const WORDS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

export function StarRating({ value, onChange, labelledBy, id }: Props) {
  return (
    <div>
      <div className="stars" role="radiogroup" aria-labelledby={labelledBy} id={id}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} out of 5, ${WORDS[n]}`}
            className={n <= value ? 'star on' : 'star'}
            onClick={() => onChange(n)}
          >
            <span className="star-glyph" aria-hidden="true">★</span>
            <small aria-hidden="true">{n}</small>
          </button>
        ))}
      </div>
      <p className="stars-text">{value > 0 ? `${value}/5 · ${WORDS[value]}` : 'Click a star, or press 1–5'}</p>
    </div>
  );
}

/** Read-only stars used in the admin views. */
export function Stars({ value }: { value: number }) {
  return (
    <span className="stars-ro" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= value ? 'on' : ''}>★</span>
      ))}
    </span>
  );
}
