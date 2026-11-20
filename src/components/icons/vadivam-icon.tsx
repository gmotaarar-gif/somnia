import type * as React from "react";

export type VadivamIconProps = React.ComponentProps<"svg"> & {
  size?: number | string;
  color?: string;
  strokeWidth?: number | string;
  absoluteStrokeWidth?: boolean;
  title?: string;
};

function mergeClasses(...values: unknown[]): string { return values.flatMap((value) => typeof value === "string" ? value.split(/\s+/) : []).filter((value, index, all) => value && all.indexOf(value) === index).join(" "); }
function isLabelled(title: unknown, attributeNames: string[]): boolean { return Boolean(title) || attributeNames.some((name) => name.startsWith("aria-") || name === "role" || name === "title"); }
function scaledStrokeWidth(strokeWidth: string | number, size: string | number, absolute: unknown): string | number { const numericSize = Number(size); const numericStroke = Number(strokeWidth); return absolute && Number.isFinite(numericSize) && numericSize !== 0 && Number.isFinite(numericStroke) ? numericStroke * 24 / numericSize : strokeWidth; }

export function VadivamIcon({
  name,
  size = 24,
  color = "currentColor",
  strokeWidth = 2,
  absoluteStrokeWidth = false,
  title,
  className,
  children,
  ...props
}: VadivamIconProps & { name: string }) {
  // Props passed as undefined, like aria-label={maybeLabel} with no label, don't label the icon.
  const labelled = isLabelled(title, Object.entries(props).flatMap(([key, value]) => (value == null ? [] : [key])));
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={scaledStrokeWidth(strokeWidth, size, absoluteStrokeWidth)}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={mergeClasses("vadivam", `vadivam-${name}`, className)}
      aria-hidden={labelled ? undefined : true}
      role={title ? "img" : undefined}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}
