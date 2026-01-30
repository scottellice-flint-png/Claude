import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import Layout from '@/components/Layout';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Foremark - Prediction Markets</title>
        <meta name="description" content="Foremark - Trade on the outcome of Australian events" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </>
  );
}
