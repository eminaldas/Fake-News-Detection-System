import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';

const OFFSET = 8;

function getPosition(triggerRect, side, tooltipEl) {
  const tt = tooltipEl?.getBoundingClientRect() ?? { width: 160, height: 36 };

  switch (side) {
    case 'bottom':
      return {
        top:  triggerRect.bottom + OFFSET,
        left: triggerRect.left + triggerRect.width / 2 - tt.width / 2,
      };
    case 'left':
      return {
        top:  triggerRect.top + triggerRect.height / 2 - tt.height / 2,
        left: triggerRect.left - tt.width - OFFSET,
      };
    case 'right':
      return {
        top:  triggerRect.top + triggerRect.height / 2 - tt.height / 2,
        left: triggerRect.right + OFFSET,
      };
    default: // top
      return {
        top:  triggerRect.top - (tt.height || 36) - OFFSET,
        left: triggerRect.left + triggerRect.width / 2 - tt.width / 2,
      };
  }
}

export default function Tooltip({
  content,
  children,
  side      = 'top',
  delay     = 150,
  maxWidth  = 240,
  disabled  = false,
}) {
  const [visible, setVisible] = useState(false);
  const [pos,     setPos]     = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const timerRef   = useRef(null);

  const show = useCallback(() => {
    if (disabled || !content) return;
    timerRef.current = setTimeout(() => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPos(getPosition(rect, side, tooltipRef.current));
      setVisible(true);
      requestAnimationFrame(() => {
        const rect2 = triggerRef.current?.getBoundingClientRect();
        if (rect2) setPos(getPosition(rect2, side, tooltipRef.current));
      });
    }, delay);
  }, [content, delay, disabled, side]);

  const hide = useCallback(() => {
    clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const tooltip = visible ? ReactDOM.createPortal(
    <div
      ref={tooltipRef}
      role="tooltip"
      style={{
        position:     'fixed',
        top:           pos.top,
        left:          pos.left,
        maxWidth,
        background:   '#1c2128',
        border:       '1px solid #30363d',
        borderTop:    '2px solid #10b981',
        borderRadius:  4,
        padding:      '6px 10px',
        fontSize:     '0.74rem',
        color:        '#c9d1d9',
        lineHeight:    1.5,
        boxShadow:    '0 4px 16px rgba(0,0,0,0.4)',
        zIndex:        9000,
        pointerEvents: 'none',
        whiteSpace:   maxWidth ? 'normal' : 'nowrap',
        animation:    'tooltip-fade 0.15s ease-out',
      }}
    >
      {content}
    </div>,
    document.body,
  ) : null;

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        style={{ display: 'inline-flex', alignItems: 'center' }}
      >
        {children}
      </span>
      {tooltip}
    </>
  );
}
