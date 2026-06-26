import 'package:agnostic_ui_contract/agnostic_ui_contract.dart';
import 'package:flutter/widgets.dart';

import 'core_components.dart';
import 'dispatch/dispatcher.dart';
import 'sdui_registry.dart';
import 'sdui_scope.dart';
import 'theme.dart';

/// Pipeline de renderização nativo (F2.4): **resolve** o `template` contra os
/// `data` (binding compartilhado com o oráculo TS via `resolveTemplate`) e
/// **compõe** a árvore de widgets pelo `registry` (F2.5/F2.6). Provê o
/// `dispatcher` aos componentes via [SduiScope] (F4/F8). Exception e
/// pull-to-refresh chegam em F9.
class TemplateRenderer extends StatelessWidget {
  const TemplateRenderer({
    super.key,
    required this.template,
    required this.data,
    this.registry,
    this.locale,
    this.dispatcher,
    this.theme,
  });

  final TemplateNode template;
  final Map<String, Object?> data;
  final SduiRegistry? registry;
  final String? locale;
  final NativeDispatcher? dispatcher;
  final SduiTheme? theme;

  @override
  Widget build(BuildContext context) {
    final SduiRegistry resolvedRegistry = registry ?? createDefaultRegistry();
    final TemplateNode resolved =
        resolveTemplate(template, data, locale: locale);
    // O Builder roda o compose num contexto **abaixo** do SduiScope, para os
    // componentes acharem o dispatcher/tema por InheritedWidget.
    return SduiScope(
      dispatcher: dispatcher,
      theme: theme,
      child: Builder(
        builder: (BuildContext inner) =>
            _compose(inner, resolved, resolvedRegistry),
      ),
    );
  }
}

Widget _compose(
  BuildContext context,
  TemplateNode node,
  SduiRegistry registry,
) {
  final List<TemplateNode> childNodes = <TemplateNode>[
    ...?node.body,
    ...?node.children,
  ];
  final List<Widget> children = childNodes
      .map((TemplateNode child) => _compose(context, child, registry))
      .toList();
  return registry.build(context, node, children);
}
