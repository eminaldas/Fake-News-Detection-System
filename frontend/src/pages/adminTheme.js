export const A = {
  bg:        '#0f1419',
  surface:   '#161c22',
  card:      '#1d2329',
  border:    '#2d343d',
  text1:     '#eef2f7',
  text2:     '#c9d1d9',
  text3:     '#7d8896',
  brand:     '#10b981',
  brandDim:  'rgba(16,185,129,0.12)',
  brandGlow: 'rgba(16,185,129,0.25)',
  red:       '#ef4444',
  redDim:    'rgba(239,68,68,0.12)',
  amber:     '#f59e0b',
  amberDim:  'rgba(245,158,11,0.12)',
  blue:      '#3b82f6',
  blueDim:   'rgba(59,130,246,0.12)',
  purple:    '#a855f7',
  purpleDim: 'rgba(168,85,247,0.12)',
};

export const card = {
  background:   A.surface,
  border:       `1px solid ${A.border}`,
  borderRadius:  12,
  overflow:      'hidden',
};

export const cardHead = {
  padding:         '14px 20px',
  borderBottom:    `1px solid ${A.border}`,
  display:         'flex',
  alignItems:      'center',
  justifyContent:  'space-between',
};

export const label = {
  fontFamily:    'Open Sans, system-ui, sans-serif',
  fontSize:      '10px',
  fontWeight:    700,
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  color:         A.text3,
};

export const pageWrap = {
  background: A.bg,
  minHeight:  '100%',
  padding:    28,
  color:      A.text1,
  fontFamily: 'Open Sans, system-ui, sans-serif',
};

export const badge = (color, dim) => ({
  background:   dim,
  color,
  fontSize:     '10px',
  fontWeight:   700,
  padding:      '2px 8px',
  borderRadius: 20,
  whiteSpace:   'nowrap',
});

export const btn = (color, dim) => ({
  background:   dim,
  color,
  border:       'none',
  borderRadius:  6,
  padding:       '6px 14px',
  fontSize:      '12px',
  fontWeight:    600,
  cursor:        'pointer',
  fontFamily:    'Open Sans, system-ui, sans-serif',
  transition:    'opacity 0.15s',
});

export const ghostBtn = {
  background:   'transparent',
  border:       `1px solid ${A.border}`,
  borderRadius:  6,
  padding:       '6px 14px',
  fontSize:      '12px',
  fontWeight:    600,
  color:         A.text3,
  cursor:        'pointer',
  fontFamily:    'Open Sans, system-ui, sans-serif',
  transition:    'border-color 0.15s, color 0.15s',
};

export const pill = (color, dim) => ({
  display:       'inline-block',
  background:    dim,
  color,
  fontSize:      '10px',
  fontWeight:    700,
  padding:       '3px 9px',
  borderRadius:  20,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
});

export const tableWrap = {
  background:   A.surface,
  border:       `1px solid ${A.border}`,
  borderRadius:  12,
  overflow:      'hidden',
};

export const thead = {
  background:    A.card,
  borderBottom:  `1px solid ${A.border}`,
};

export const th = {
  padding:       '11px 16px',
  fontSize:      '10px',
  fontWeight:    700,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color:         A.text3,
  textAlign:     'left',
  whiteSpace:    'nowrap',
};

export const td = {
  padding:    '11px 16px',
  fontSize:   '13px',
  color:      A.text2,
  borderTop:  `1px solid ${A.border}`,
};

export const input = {
  background:   A.card,
  border:       `1px solid ${A.border}`,
  borderRadius:  8,
  padding:       '8px 14px',
  fontSize:      '13px',
  color:         A.text1,
  outline:       'none',
  fontFamily:    'Open Sans, system-ui, sans-serif',
  width:         '100%',
};

export const ANIM = `
  @keyframes spin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.4} }
  @keyframes dot-blink { 0%,100%{transform:scale(1)} 50%{transform:scale(1.3)} }
`;
