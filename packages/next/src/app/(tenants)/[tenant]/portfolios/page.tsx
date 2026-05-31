/** Portfolios screen (server placeholder). SDUI screens land in the react package. */
export default async function TenantPortfoliosPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  return (
    <main>
      <h1>Portfolios</h1>
      <p>{tenant} · server placeholder.</p>
    </main>
  );
}
