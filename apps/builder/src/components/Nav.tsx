import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';

export function Nav(): ReactElement {
  const { signOut } = useAuth();
  return (
    <nav>
      <Link to="/">Artefatos</Link> · <Link to="/flows">Flows</Link> ·{' '}
      <button type="button" onClick={signOut}>
        Sair
      </button>
    </nav>
  );
}
