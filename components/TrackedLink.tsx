'use client';

import type { AnchorHTMLAttributes } from 'react';
import { event } from '@/lib/gtag';

interface TrackedLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  eventName: string;
  eventParams?: Record<string, string | number | boolean>;
}

export default function TrackedLink({
  eventName,
  eventParams,
  onClick,
  ...anchorProps
}: TrackedLinkProps) {
  return (
    <a
      {...anchorProps}
      onClick={(e) => {
        event(eventName, eventParams);
        onClick?.(e);
      }}
    />
  );
}
