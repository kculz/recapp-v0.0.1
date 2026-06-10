import type { ComponentProps } from 'react';
import LoginView from '../views/LoginView';

type LoginPageProps = ComponentProps<typeof LoginView>;

export default function LoginPage(props: LoginPageProps) {
  return <LoginView {...props} />;
}
