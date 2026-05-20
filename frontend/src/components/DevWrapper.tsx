// Dev-only wrapper that renders the mock macOS desktop + window chrome
// so the screenshot is directly comparable to Pixelcamo.html.
// Stripped in production — pywebview provides the real OS chrome.
import { Icon } from '../icons';

interface DevWrapperProps {
  docTitle: string;
  dirty: boolean;
  children: React.ReactNode;
}

export function DevWrapper({ docTitle, dirty, children }: DevWrapperProps) {
  return (
    <div className="desktop">
      {/* Fake macOS system menubar */}
      <div className="menubar">
        <div className="menubar-left">
          <span className="menubar-apple">{Icon.apple}</span>
          <span className="menubar-app">Pixelcamo</span>
          {['File', 'Edit', 'View', 'Pattern', 'Window', 'Help'].map((item) => (
            <span key={item} className="menubar-item">{item}</span>
          ))}
        </div>
        <div className="menubar-right">
          <span className="mono" style={{ color: 'var(--accent)', fontSize: 11 }}>●REC seed</span>
          <span className="menubar-icon">{Icon.battery}</span>
          <span className="menubar-icon">{Icon.wifi}</span>
          <span className="menubar-icon">{Icon.search}</span>
          <span className="menubar-icon">{Icon.cc}</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>Wed 21 May  10:42</span>
        </div>
      </div>

      {/* Window stage */}
      <div className="stage">
        <div className="window">
          {/* Fake titlebar */}
          <div className="titlebar">
            <div className="traffic">
              <span className="dot close" />
              <span className="dot min" />
              <span className="dot max" />
            </div>
            <div className="titlebar-title">
              Pixelcamo
              <span className="doc">
                {' — '}{docTitle}{dirty ? ' · edited' : ''}
              </span>
            </div>
            <div className="titlebar-right">
              <span className="status-led" />
              <span>READY</span>
            </div>
          </div>

          {/* App body renders here */}
          {children}
        </div>
      </div>
    </div>
  );
}
