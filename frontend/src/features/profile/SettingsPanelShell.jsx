import React from 'react';

export default function SettingsPanelShell({ children, contextCard }) {
  return (
    <div className="space-y-5">
      {children}
      {contextCard && <div className="mt-2">{contextCard}</div>}
    </div>
  );
}
