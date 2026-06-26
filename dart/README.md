# Frente nativa Dart/Flutter

Renderer SDUI nativo em Flutter, par do `@yukilabs/agnostic-ui-react`
([ADR 0005](../docs/adr/0005-flutter-native-sdui-renderer.md)). Vive no mesmo
repositório, mas **fora do workspace pnpm** (toolchains separadas) — é um
**workspace Dart nativo** (pub workspaces, Dart ≥ 3.6) orquestrado por
[melos](https://melos.invertase.dev).

## Pacotes

| Pacote                 | Papel                                                                | Flutter |
| ---------------------- | -------------------------------------------------------------------- | ------- |
| `agnostic_ui_contract` | Espelho Dart do contrato (`core`): modelos gerados, validação, binding | não     |
| `agnostic_ui_flutter`  | Renderer nativo: `TemplateRenderer`, registry, Dispatcher/FlowEngine  | sim     |
| `agnostic_ui_sdk`      | Host de WebView do manual + switch `renderMode` (webview \| native)   | sim     |

## Toolchain

- **Flutter/Dart** — recomendado via [fvm](https://fvm.app) (canal `stable`).
- **melos** — `dart pub global activate melos` (garanta `~/.pub-cache/bin` no `PATH`).

## Comandos

```bash
flutter pub get            # resolve todos os membros do workspace de uma vez
melos run analyze          # dart analyze --fatal-infos em todos os pacotes
melos run test             # dart test (puros) + flutter test (Flutter)
```

O contrato Dart é **gerado** a partir do JSON Schema publicado pelo `core`
(`packages/core/schema/`, via `pnpm --filter @yukilabs/agnostic-ui-core gen:schema`);
não editar os modelos gerados à mão. O check de drift TS↔Dart chega em F1.5.
