import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata = {
  title: '凌雲たちばな祭 2026',
  description: '千葉県立船橋高等学校 たちばな祭 公式サイト',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
