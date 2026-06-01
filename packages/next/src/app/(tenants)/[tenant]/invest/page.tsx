/** Invest screen (server placeholder). SDUI screens land in the react package. */
export default async function TenantInvestPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  return (
    <main>
      <h1>Invest</h1>
      <p>{tenant} · server placeholder.</p>
    </main>
  );
}
