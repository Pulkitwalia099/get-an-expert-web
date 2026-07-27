const FIRST_HOUR = 10; // 10:00 AM
const LAST_HOUR = 23; // last slot starts 11:30 PM

// Consultation slots shown to visitors, Pacific Time. The window is Rohit's
// spec: 10:00 AM through 11:59 PM PST, half hour steps, 15 minute calls.
export function consultSlots(): string[] {
  const slots: string[] = [];
  for (let hour = FIRST_HOUR; hour <= LAST_HOUR; hour++) {
    for (const minute of [0, 30]) {
      const meridiem = hour < 12 ? 'AM' : 'PM';
      const display = hour % 12 === 0 ? 12 : hour % 12;
      slots.push(`${display}:${minute === 0 ? '00' : '30'} ${meridiem}`);
    }
  }
  return slots;
}

export interface MonthGrid {
  label: string;
  year: number;
  month: number;
  cells: (number | null)[];
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// Calendar cells for one month: leading nulls so day 1 lands on its weekday
// (Sunday first), then the days. Pure so tests can pin any month.
export function monthGrid(year: number, month: number): MonthGrid {
  const firstWeekday = new Date(year, month, 1).getDay();
  const dayCount = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: dayCount }, (_, i) => i + 1),
  ];
  return { label: `${MONTHS[month]} ${year}`, year, month, cells };
}

export function toDateKey(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}
