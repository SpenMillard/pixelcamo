import { Icon } from '../icons';

interface SectionProps {
  title: string;
  badge?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export function Section({ title, badge, open, onToggle, children }: SectionProps) {
  return (
    <div className={`section${open ? ' open' : ''}`}>
      <div className={`section-head${open ? ' open' : ''}`} onClick={onToggle}>
        <span className="chev">{Icon.chev}</span>
        <span className="title">{title}</span>
        {badge && <span className="badge">{badge}</span>}
      </div>
      <div className="section-body">{children}</div>
    </div>
  );
}
