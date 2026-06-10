import type { ComponentProps } from 'react';
import DirectoryView from '../views/DirectoryView';

type DirectoryPageProps = ComponentProps<typeof DirectoryView>;

export default function DirectoryPage(props: DirectoryPageProps) {
  return <DirectoryView {...props} />;
}
