import React from 'react';

// Questo componente farà da "cornice" a tutte le pagine della dashboard.
// In futuro qui potrai mettere una sidebar, un header, etc.
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="p-4 sm:p-6 lg:p-8">
      {/* <header>Qui ci sarà l'header della dashboard</header> */}
      <div className="container mx-auto">
        {children}
      </div>
    </section>
  );
}