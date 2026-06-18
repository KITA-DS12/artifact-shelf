type IconProps = {
  size?: number;
  filled?: boolean;
};

export function PencilIcon({ size = 14 }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11.5 1.8L14.2 4.5L5 13.7H2.3V11L11.5 1.8Z" />
      <path d="M10 3.3L12.7 6" />
    </svg>
  );
}

export function StarIcon({ size = 14, filled = false }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2.5l2.92 6.32 6.83.7-5.13 4.72 1.48 6.86L12 17.6l-6.1 3.5 1.48-6.86L2.25 9.52l6.83-.7L12 2.5z" />
    </svg>
  );
}

export function PlusIcon({ size = 10 }: IconProps) {
  return (
    <svg
      viewBox="0 0 12 12"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 1.5V10.5M1.5 6H10.5" />
    </svg>
  );
}

export function CrossIcon({ size = 10 }: IconProps) {
  return (
    <svg
      viewBox="0 0 12 12"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M2.5 2.5L9.5 9.5M9.5 2.5L2.5 9.5" />
    </svg>
  );
}
