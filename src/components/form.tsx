import type { CSSProperties, InputHTMLAttributes, ReactNode } from 'react';

export const inputStyle: CSSProperties = {
  height: 52, border: '2px solid #2e0f38', borderRadius: 14, padding: '0 14px', font: 'inherit', fontWeight: 400, fontSize: 16, background: '#fff', color: '#2e0f38'
};
export const codeInputStyle: CSSProperties = {
  ...inputStyle, fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 18, letterSpacing: '.06em', textTransform: 'uppercase'
};
export const primaryButton: CSSProperties = {
  height: 56, border: 'none', borderRadius: 16, background: '#8351a8', color: '#fff', font: 'inherit', fontWeight: 700, fontSize: 17, cursor: 'pointer', boxShadow: '0 5px 0 #5e3680'
};
export const h1Style: CSSProperties = { fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 32, margin: 0 };

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, fontWeight: 700 }}>
      <span>{label}{hint && <span style={{ display: 'block', fontWeight: 400, fontSize: 13, color: '#5c4766', marginTop: 2 }}>{hint}</span>}</span>
      {children}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...inputStyle, ...props.style }} />;
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <div role="alert" style={{ color: '#8c1c45', fontSize: 14, fontWeight: 700 }}>{children}</div>;
}
