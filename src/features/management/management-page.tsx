import { Link } from 'react-router-dom';

import { Card, PageHeader } from '../../components/ui';

const sections = [
  { to: '/users', title: 'Users & staff', description: 'Manage admin and staff accounts and roles.' },
  { to: '/courts', title: 'Courts', description: 'Add or update the courts available for checkout.' },
  { to: '/rates', title: 'Rates', description: 'Manage the pricing options used at checkout.' },
];

export function ManagementPage() {
  return (
    <div className="stack large-gap">
      <PageHeader title="Management" subtitle="Control facility resources and staff" />

      <div className="management-grid">
        {sections.map((section) => (
          <Link key={section.to} to={section.to} className="action-link">
            <Card className="stack">
              <h3>{section.title}</h3>
              <p className="muted">{section.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
