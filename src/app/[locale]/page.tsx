import { setRequestLocale } from 'next-intl/server';
import TemplateManager from "../../TemplateManager";

type Props = {
  params: Promise<{ locale: string }>;
};

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="min-h-screen">
      <TemplateManager />
    </main>
  );
}
