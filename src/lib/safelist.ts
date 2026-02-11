// This file is used to ensure specific Tailwind classes are generated
// even if they are constructed dynamically or not explicitly detected by the scanner.

export const safeList = [
  'grid',
  'grid-cols-1',
  'grid-cols-2',
  'grid-cols-3',
  'grid-cols-4',
  'grid-cols-12',
  'gap-1',
  'gap-2',
  'gap-3',
  'gap-4',
].join(' ');
