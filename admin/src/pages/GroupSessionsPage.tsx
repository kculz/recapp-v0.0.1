import type { ComponentProps } from 'react';
import GroupSessionsView from '../views/GroupSessionsView';

type GroupSessionsPageProps = ComponentProps<typeof GroupSessionsView>;

export default function GroupSessionsPage(props: GroupSessionsPageProps) {
  return <GroupSessionsView {...props} />;
}
