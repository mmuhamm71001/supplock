// <sl-block> and <sl-icon> come from public/sl/blocks.js and public/sl/icons.js.
import type { DetailedHTMLProps, HTMLAttributes } from 'react';

type SLAttrs = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'sl-block': SLAttrs & {
        color?: 'purple' | 'orchid' | 'teal' | 'navy' | 'ink' | 'berry' | 'lavender' | 'mist' | 'pink' | 'paper';
        tilt?: string;
        float?: string;
        deco?: string;
        nofloat?: string;
        settle?: string;
        mhide?: string;
        radius?: string;
      };
      'sl-icon': SLAttrs & { name?: string; label?: string; size?: string; variant?: 'detail' | 'simple'; tint?: string; space?: 'classroom' | 'subject' };
    }
  }
}
