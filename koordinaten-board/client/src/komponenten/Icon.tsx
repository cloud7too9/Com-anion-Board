import type { Kategorie } from '../lib/typen';

// Einfache Linien-Icons (24er Raster, stroke = currentColor)
const PFADE: Record<string, string> = {
  basis: 'M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z',
  farm: 'M12 21V11M12 11c0-4.4 3.1-7.5 7.5-7.5 0 4.4-3.1 7.5-7.5 7.5zM12 15c0-3.6-2.6-6.5-6.5-6.5 0 3.6 2.6 6.5 6.5 6.5z',
  portal: 'M5 21V6.5a7 7 0 0 1 14 0V21M9 21V8.5a3 3 0 0 1 6 0V21M3 21h18',
  dorf: 'M2 21v-9l5-4 5 4v9zM12 21v-6l5-4 5 4v6zM5.5 21v-4h3v4',
  struktur: 'M4 21V4h3v3h3V4h4v3h3V4h3v17zM10 21v-5h4v5',
  ressource: 'M6.5 3h11L22 9 12 21 2 9zM2 9h20M12 21 8.5 9l3.5-6 3.5 6z',
  sonstiges: 'M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  kompass: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM16 8l-2 6-6 2 2-6z',
};

export type IconName = keyof typeof PFADE | Kategorie;

export function Icon({ name, groesse = 20 }: { name: IconName; groesse?: number }) {
  return (
    <svg
      width={groesse}
      height={groesse}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PFADE[name]} />
    </svg>
  );
}
