/**
 * Carrega o polyfill `reflect-metadata` uma única vez no boot do servidor, antes
 * de qualquer classe decorada (tsyringe) ser avaliada por uma rota.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('reflect-metadata');
  }
}
