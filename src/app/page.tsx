import { redirect } from 'next/navigation';
import { routing } from '@/i18n/routing';

export default function RootPage() {
  // 直接重定向到預設語言
  redirect(`/${routing.defaultLocale}`);
}
