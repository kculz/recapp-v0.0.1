import type { ComponentProps } from 'react';
import IntakeView from '../views/IntakeView';

type IntakePageProps = ComponentProps<typeof IntakeView>;

export default function IntakePage(props: IntakePageProps) {
  return <IntakeView {...props} />;
}
