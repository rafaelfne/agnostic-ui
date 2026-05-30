import type { ReactNode } from 'react';

export const metadata = {
  title: 'Agnostic UI BFF',
  description: 'Backend-for-Frontend for the Embed Experience.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
