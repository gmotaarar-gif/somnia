'use client';
/**
 * SlideToConfirm for React on the web, from dissolve (dissolve-ui). This file is yours. Same props as
 * the React Native version; the track itself lives in slide-to-confirm.core.ts.
 *
 * <SlideToConfirm label="Slide to pay 42 €" doneLabel="Paid" onConfirm={() => pay(order)} />
 *
 * <SlideToConfirm label="Slide to delete" height={52} threshold={0.8} resetAfter={0} onConfirm={remove} className="bg-red-50" />
 */
import type { CSSProperties } from 'react';
import { createSlideToConfirm, type SlideToConfirmProps as CoreProps } from './slide-to-confirm.core';
import { useDissolveCore } from './react';

export type SlideToConfirmProps = CoreProps & {
  /** Track classes (background, radius, margins...). */
  className?: string;
  style?: CSSProperties;
};

export function SlideToConfirm({ className, style, ...props }: SlideToConfirmProps) {
  const { host } = useDissolveCore(createSlideToConfirm, props);
  return <div ref={host} className={className} style={style} />;
}
