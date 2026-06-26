import 'package:agnostic_ui_contract/agnostic_ui_contract.dart';
import 'package:flutter/material.dart';

import 'dispatch/dispatcher.dart';
import 'sdui_registry.dart';
import 'template_renderer.dart';
import 'theme.dart';

/// Renderiza um [SduiDocument] (F5) ponta a ponta:
/// - **Exceção (F9.2):** se o documento traz `exception` — ou o `context` tem um
///   RequestResult `{ success: false }` — troca o root pelo `exception-error`.
/// - **Pull-to-refresh (F9.1):** se `refresh.enabled`, envolve num
///   `RefreshIndicator` que chama `onRefresh` (o host re-busca via `SduiClient`).
class SduiDocumentView extends StatelessWidget {
  const SduiDocumentView({
    super.key,
    required this.document,
    this.registry,
    this.dispatcher,
    this.theme,
    this.locale,
    this.onRefresh,
  });

  final SduiDocument document;
  final SduiRegistry? registry;
  final NativeDispatcher? dispatcher;
  final SduiTheme? theme;
  final String? locale;
  final Future<void> Function()? onRefresh;

  @override
  Widget build(BuildContext context) {
    final SduiException? exception =
        document.exception ?? detectException(document.context);
    final TemplateNode root = exception != null
        ? TemplateNode(
            type: 'exception-error',
            props: <String, Object?>{'message': exception.message},
          )
        : document.root;
    final Map<String, Object?> data =
        exception != null ? const <String, Object?>{} : document.context;

    final Widget rendered = TemplateRenderer(
      template: root,
      data: data,
      registry: registry,
      dispatcher: dispatcher,
      theme: theme,
      locale: locale,
    );

    final bool refreshable =
        (document.refresh?.enabled ?? false) && onRefresh != null;
    if (!refreshable) return rendered;
    return RefreshIndicator(
      onRefresh: onRefresh!,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: <Widget>[rendered],
      ),
    );
  }
}
