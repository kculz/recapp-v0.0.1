import type { ComponentProps } from 'react';
import CrisisView from '../views/CrisisView';

type CrisisPageProps = ComponentProps<typeof CrisisView>;

export default function CrisisPage(props: CrisisPageProps) {
  return <CrisisView {...props} />;
}
