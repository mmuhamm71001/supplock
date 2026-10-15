'use client';
import { Oops } from '@/components/oops';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Oops code="Oops" title="Something spilled" note="cleanup in aisle 3" onRetry={reset}
      msg="We hit a snag loading this page. Your requests and stock counts are safe. Try again in a moment." />
  );
}
