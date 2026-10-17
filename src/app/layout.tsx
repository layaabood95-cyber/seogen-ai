import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SeoGen AI — Product Description & SEO Generator',
  description:
    'SeoGen AI: Generate SEO-optimized product titles, meta descriptions, and Markdown product copy using OpenAI gpt-4o-mini.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
