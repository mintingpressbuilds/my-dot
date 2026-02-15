import Galaxy from '@/components/Galaxy';

interface Props {
  searchParams: Promise<{ ref?: string }>;
}

export default async function Home({ searchParams }: Props) {
  const { ref } = await searchParams;
  return <Galaxy refSlug={ref} />;
}
