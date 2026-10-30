// The Phantom mark: a minimal, elegant specter drawn in strokes — no clip-art.
// Used in the header, the processing state, and the Haunt Score hero.

export default function PhantomMark({ size = 44, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M24 5c-7.7 0-13 5.8-13 13.6V40l4.4-3.4L20 40l4-3.2L28 40l4.6-3.4L37 40V18.6C37 10.8 31.7 5 24 5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="18.5" cy="20" r="1.9" fill="currentColor" />
      <circle cx="29.5" cy="20" r="1.9" fill="currentColor" />
      <path
        d="M20.5 28.2c1.1 1 2.3 1.5 3.5 1.5s2.4-.5 3.5-1.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
