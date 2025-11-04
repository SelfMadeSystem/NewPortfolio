import '../styles/hashVisible.css';
import type { ComponentProps, PropsWithChildren } from 'react';
import { useEffect, useState } from 'react';

/**
 * An element that's only visible when the URL hash matches its ID.
 */
export function HashVisible({
  children,
  id,
  defaultVisible = false,
  ...props
}: PropsWithChildren<
  ComponentProps<'div'> & {
    defaultVisible?: boolean;
    id: string;
  }
>) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!id) return;
    const updateVisibility = () => {
      if (
        window.location.hash === `#${id}` ||
        (defaultVisible && window.location.hash === '')
      ) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('hashchange', updateVisibility);
    updateVisibility();

    return () => {
      window.removeEventListener('hashchange', updateVisibility);
    };
  }, [id, defaultVisible]);

  if (!isVisible) {
    return null;
  }

  return (
    <div id={id} {...props}>
      {children}
    </div>
  );
}
