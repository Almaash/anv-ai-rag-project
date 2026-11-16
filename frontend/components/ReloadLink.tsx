"use client";

import type { MouseEvent } from "react";
import Link from "next/link";
import type { LinkProps } from "next/link";

type ReloadLinkProps = LinkProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
    children: React.ReactNode;
  };

export default function ReloadLink({ href, children, ...props }: ReloadLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    props.onClick?.(event);
    window.dispatchEvent(new Event("next-route-change"));
  };

  return (
    <Link href={href} {...props} onClick={handleClick}>
      {children}
    </Link>
  );
}
