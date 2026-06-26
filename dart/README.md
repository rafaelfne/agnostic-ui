# Frente nativa Dart/Flutter

Renderer SDUI nativo em Flutter, par do `@yukilabs/agnostic-ui-react`
([ADR 0005](../docs/adr/0005-flutter-native-sdui-renderer.md)). Vive no mesmo
repositório, mas **fora do workspace pnpm** (toolchains separadas) — é um
**workspace Dart nativo** (pub workspaces, Dart ≥ 3.6) orquestrado por
[melos](https://melos.invertase.dev).

## Pacotes

| Pacote                 | Papel                                                                | Flutter |
| ---------------------- | -------------------------------------------------------------------- | ------- |
| `agnostic_ui_contract` | Espelho Dart do contrato (`core`): modelos gerados, binding, ações, documento | não     |
| `agnostic_ui_flutter`  | Renderer nativo: `TemplateRenderer`/`SduiDocumentView`, registry (catálogo), Dispatcher, bridge, `SduiClient` | sim     |
| `agnostic_ui_sdk`      | Host de WebView do manual + `EmbedView(renderMode: webview \| native)` | sim     |
| `agnostic_ui_playground` | App de referência (Yuki Labs Playground) dirigido por marker — exemplo/E2E | sim     |

O catálogo de componentes está em [CATALOG.md](CATALOG.md).

## Adoção

```dart
// 1) Host nativo: EmbedView com a flag de modo (mesmo token/tenant).
EmbedView(token: token, tenant: tenant, renderMode: RenderMode.native, template: doc.root, data: doc.context);

// 2) Buscar o documento do BFF (transporte http injetado pelo host):
final client = SduiClient(baseUrl: bff, tenantId: tenant, transport: myHttpTransport);
final doc = await client.fetchDocument('home', token: token); // erro HTTP → documento de exceção

// 3) Renderizar o documento (exceção + pull-to-refresh + tema):
SduiDocumentView(
  document: doc,
  theme: SduiTheme.fromTenant(tenantThemeMap),
  dispatcher: NativeDispatcher(navigation: myGoRouterDelegate), // GoRouter no host
  onRefresh: () => reload(),
);
```

Deps pesados são **injetados pelo host** (não acoplados às libs): o cliente HTTP
(`SduiTransport`), a navegação (`NavigationDelegate` → GoRouter) e o WebView
(`webViewBuilder` da `EmbedView`).

## Toolchain

- **Flutter/Dart** — recomendado via [fvm](https://fvm.app) (canal `stable`).
- **melos** — `dart pub global activate melos` (garanta `~/.pub-cache/bin` no `PATH`).

## Comandos

```bash
flutter pub get            # resolve todos os membros do workspace de uma vez
melos run analyze          # dart analyze --fatal-infos em todos os pacotes
melos run test             # dart test + flutter test (exclui a tag `golden`)
flutter test --tags golden # goldens, localmente (sensíveis à plataforma — fora do CI)
```

O contrato Dart é **gerado** a partir do JSON Schema publicado pelo `core`
(`packages/core/schema/`, via `pnpm --filter @yukilabs/agnostic-ui-core gen:schema`);
não editar os modelos gerados à mão. O check de drift TS↔Dart roda no `dart:ci`.

## Release (pub.dev)

Os três pacotes (`agnostic_ui_contract`/`_flutter`/`_sdk`) são publicáveis; o
`playground` não. O gate de release roda no workflow `publish-dart`
(`workflow_dispatch`). Para publicar de fato:

1. Remova `publish_to: none` dos 3 pacotes e fixe a `version`.
2. Configure as credenciais do pub.dev (`PUB_TOKEN`).
3. `dart pub publish` em cada pacote (na ordem: contract → flutter → sdk).
