/**
 * Gerador de DI (manual §2.5.3 / §2.6.3). Varre os use cases e controllers e
 * emite, em `src/infra/di/generated/`, os tokens Symbol + `registerGeneratedServices`.
 * Convenção: cada `*UseCase.ts` / `*Controller.ts` exporta uma classe com o nome
 * igual ao stem do arquivo. NÃO editar a saída à mão — alterar este gerador e regenerar.
 *
 *   node scripts/generate-di.mjs           # escreve os arquivos gerados
 *   node scripts/generate-di.mjs --check   # falha (exit 1) se a saída estiver desatualizada
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, '..');
const srcDir = join(packageRoot, 'src');
const generatedDir = join(srcDir, 'infra', 'di', 'generated');

const HEADER = [
  '// AUTO-GERADO por scripts/generate-di.mjs — não editar à mão (manual §2.5.3).',
  '// Rode `pnpm --filter @yukilabs/agnostic-ui-next gen:di` após adicionar use case ou controller.',
  '',
].join('\n');

/** `GetBalanceUseCase` → `GET_BALANCE_USE_CASE_TOKEN`. */
function toTokenName(className) {
  return (
    className
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
      .toUpperCase() + '_TOKEN'
  );
}

function listTsFilesRecursive(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listTsFilesRecursive(full));
    else if (entry.isFile() && entry.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

/** Discovers the injectable classes by convention (stem === class name). */
function collectClasses() {
  const useCases = readdirSync(join(srcDir, 'application', 'useCases'))
    .filter((name) => name.endsWith('UseCase.ts'))
    .map((name) => name.replace(/\.ts$/, ''))
    .sort();

  const controllers = listTsFilesRecursive(join(srcDir, 'interface', 'controllers'))
    .map((file) => basename(file))
    .filter((name) => name.endsWith('Controller.ts'))
    .map((name) => name.replace(/\.ts$/, ''))
    .sort();

  return { useCases, controllers };
}

function namedImport(keyword, names, from) {
  return `${keyword} {\n${names.map((name) => `  ${name},`).join('\n')}\n} from '${from}';`;
}

function renderTokens({ useCases, controllers }) {
  const all = [...useCases, ...controllers];
  return [
    HEADER,
    `import type { InjectionToken } from 'tsyringe';`,
    namedImport('import type', useCases, '../../../application/useCases'),
    namedImport('import type', controllers, '../../../interface/controllers'),
    '',
    all
      .map(
        (name) => `export const ${toTokenName(name)}: InjectionToken<${name}> = Symbol('${name}');`,
      )
      .join('\n'),
    '',
  ].join('\n');
}

function renderRegistry({ useCases, controllers }) {
  const all = [...useCases, ...controllers];
  return [
    HEADER,
    `import type { DependencyContainer } from 'tsyringe';`,
    namedImport('import', useCases, '../../../application/useCases'),
    namedImport('import', controllers, '../../../interface/controllers'),
    namedImport('import', all.map(toTokenName), './tokens'),
    '',
    '/**',
    ' * Registra use cases e controllers no container raiz (manual §2.6.1). Transient:',
    ' * cada `resolve` constrói uma instância nova, então as dependências request-scoped',
    ' * (gateway, executionContext) resolvem do child container que iniciou o `resolve`.',
    ' */',
    'export function registerGeneratedServices(container: DependencyContainer): void {',
    all
      .map((name) => `  container.register(${toTokenName(name)}, { useClass: ${name} });`)
      .join('\n'),
    '}',
    '',
  ].join('\n');
}

async function build() {
  const classes = collectClasses();
  const prettierConfig = await resolveConfig(join(srcDir, 'infra', 'di', 'container.ts'));
  const targets = [
    { path: join(generatedDir, 'tokens.ts'), source: renderTokens(classes) },
    { path: join(generatedDir, 'registry.ts'), source: renderRegistry(classes) },
  ];
  return Promise.all(
    targets.map(async (target) => ({
      path: target.path,
      content: await format(target.source, { ...prettierConfig, parser: 'typescript' }),
    })),
  );
}

async function main() {
  const check = process.argv.includes('--check');
  const files = await build();

  if (check) {
    const drifted = files.filter(
      (file) => !existsSync(file.path) || readFileSync(file.path, 'utf8') !== file.content,
    );
    if (drifted.length > 0) {
      for (const file of drifted) {
        console.error(`DI desatualizado: ${relative(packageRoot, file.path)}`);
      }
      console.error('Rode `pnpm --filter @yukilabs/agnostic-ui-next gen:di` e commite a saída.');
      process.exit(1);
    }
    console.log('Registro de DI em dia (sem drift).');
    return;
  }

  mkdirSync(generatedDir, { recursive: true });
  for (const file of files) {
    writeFileSync(file.path, file.content);
    console.log(`gerado ${relative(packageRoot, file.path)}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
