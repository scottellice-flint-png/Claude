import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { SessionProvider } from 'next-auth/react';
import Layout from '@/components/Layout';
import { useStore } from '@/store';

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  const router = useRouter();
  const isAdminRoute = router.pathname.startsWith('/admin');
  const fetchMarkets = useStore((state) => state.fetchMarkets);
  const marketsLoaded = useStore((state) => state.marketsLoaded);
  const marketsLoading = useStore((state) => state.marketsLoading);

  // Fetch markets from database on app load (for non-admin routes)
  useEffect(() => {
    if (!isAdminRoute && !marketsLoaded && !marketsLoading) {
      fetchMarkets();
    }
  }, [isAdminRoute, marketsLoaded, marketsLoading, fetchMarkets]);

  return (
    <SessionProvider session={session}>
      <Head>
        <title>Foremark - Prediction Markets</title>
        <meta name="description" content="Foremark - Bet on the outcome of Australian events" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {isAdminRoute ? (
        <Component {...pageProps} />
      ) : (
        <Layout>
          <Component {...pageProps} />
        </Layout>
      )}
    </SessionProvider>
  );
}
