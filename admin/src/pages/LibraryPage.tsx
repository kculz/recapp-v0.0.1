import type { ComponentProps } from 'react';
import LibraryView from '../views/LibraryView';

type LibraryPageProps = ComponentProps<typeof LibraryView>;

export default function LibraryPage(props: LibraryPageProps) {
  return <LibraryView {...props} />;
}
