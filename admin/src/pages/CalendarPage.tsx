import type { ComponentProps } from 'react';
import CalendarView from '../views/CalendarView';

type CalendarPageProps = ComponentProps<typeof CalendarView>;

export default function CalendarPage(props: CalendarPageProps) {
  return <CalendarView {...props} />;
}
