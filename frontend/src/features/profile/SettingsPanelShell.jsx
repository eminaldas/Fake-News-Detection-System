import React from 'react';

/* Artık dış layout 3-kolon grid — bu sarmalayıcı sadece dikey yığar. */
export default function SettingsPanelShell({ children, contextCard }) {
  return (
    <div className="space-y-5">
      {children}
      {contextCard && <div className="mt-2">{contextCard}</div>}
    </div>
  );
}
