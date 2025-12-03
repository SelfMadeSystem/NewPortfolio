import { useMagnet } from '../utils/hooks/useMagnet';
import type { SpringOptions } from 'motion';

export function Magnetized({
  children,
  onlyInside,
  keepLast,
  force,
  spring,
  ...props
}: React.HTMLAttributes<HTMLDivElement> &
  Partial<{
    class: string;
    onlyInside: boolean;
    keepLast: boolean;
    force: number;
    spring: SpringOptions;
  }>) {
  const scope = useMagnet<HTMLDivElement>({
    onlyInside,
    keepLast,
    force,
    spring,
  });

  return (
    <div ref={scope} {...props}>
      {children}
    </div>
  );
}
