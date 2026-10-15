import { Oops } from '@/components/oops';

export default function NotFound() {
  return (
    <Oops code="404" title="This shelf is empty" note="check the aisle number?"
      msg="We looked behind the tissues and under the copy paper. The page you're after isn't here." />
  );
}
