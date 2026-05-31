/** Portfolio builder screen (server placeholder). SDUI screens land in the react package. */
export default async function TenantPortfolioBuilderPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  return (
    <main>
      <h1>Portfolio Builder</h1>
      <p>{tenant} · server placeholder.</p>
    </main>
  );
}
