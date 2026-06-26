import 'package:agnostic_ui_flutter/agnostic_ui_flutter.dart';
import 'package:flutter/widgets.dart';

/// Builder do conteúdo no modo WebView — **injetável** para não acoplar
/// `webview_flutter` ao SDK; o host pluga o WebView na adoção.
typedef WebViewContentBuilder = Widget Function(
    BuildContext context, String token);

/// Superfície única do manual (§14.3) estendida com `renderMode` (ADR 0005 §1):
/// mesmo `token`/`tenant`, o parceiro adota o nativo **virando uma flag**. No
/// modo `native` monta o `TemplateRenderer` sobre o documento (`template`+`data`);
/// no modo `webview` delega ao `webViewBuilder` do host. O `SduiClient` (F5) e a
/// bridge ligam o ciclo de token/dados nas features seguintes.
class EmbedView extends StatelessWidget {
  const EmbedView({
    super.key,
    required this.token,
    required this.tenant,
    this.renderMode = RenderMode.webview,
    this.template,
    this.data,
    this.webViewBuilder,
  });

  final String token;
  final String tenant;
  final RenderMode renderMode;
  final TemplateNode? template;
  final Map<String, Object?>? data;
  final WebViewContentBuilder? webViewBuilder;

  @override
  Widget build(BuildContext context) {
    switch (renderMode) {
      case RenderMode.native:
        final TemplateNode? document = template;
        if (document == null) return const SizedBox.shrink();
        return TemplateRenderer(
          template: document,
          data: data ?? const <String, Object?>{},
        );
      case RenderMode.webview:
        return webViewBuilder?.call(context, token) ?? const SizedBox.shrink();
    }
  }
}
