import { useSolid } from './solids';

export function SolidElement({
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const setSolid = useSolid();

  return (
    <div {...props} ref={setSolid}>
      {children}
    </div>
  );
}
