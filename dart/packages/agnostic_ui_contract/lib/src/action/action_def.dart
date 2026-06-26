// Espelho Dart do contrato de ações do core (schemas/action.ts). União fechada
// discriminada por `type`. Sem codegen (o gerador Dart ainda não faz uniões/anyOf,
// F1.A.6) — mantido em sincronia à mão com action.ts.

/// Ação de UI que um nó (ex.: botão) despacha. União fechada por `type`.
sealed class ActionDef {
  const ActionDef({this.label});
  final String? label;

  factory ActionDef.fromJson(Map<String, Object?> json) {
    final Object? type = json['type'];
    final String? label = json['label'] as String?;
    switch (type) {
      case 'navigate':
        return NavigateAction(target: json['target']! as String, label: label);
      case 'navigateFlow':
        return NavigateFlowAction(
          target: json['target']! as String,
          label: label,
        );
      case 'replaceCurrent':
        return ReplaceCurrentAction(
          target: json['target']! as String,
          label: label,
        );
      case 'back':
        return BackAction(label: label);
      case 'refreshHomePage':
        return RefreshHomePageAction(label: label);
      case 'bridge':
        return BridgeAction(
          method: json['method']! as String,
          params: json['params'],
          label: label,
        );
      default:
        throw FormatException('unknown action type: $type');
    }
  }
}

/// Navega para uma rota.
class NavigateAction extends ActionDef {
  const NavigateAction({required this.target, super.label});
  final String target;
}

/// Navega para dentro de um flow (target prefixado pelo flow).
class NavigateFlowAction extends ActionDef {
  const NavigateFlowAction({required this.target, super.label});
  final String target;
}

/// Substitui a rota atual por `target`.
class ReplaceCurrentAction extends ActionDef {
  const ReplaceCurrentAction({required this.target, super.label});
  final String target;
}

/// Volta (pop) a rota atual.
class BackAction extends ActionDef {
  const BackAction({super.label});
}

/// Dispara o refresh da home.
class RefreshHomePageAction extends ActionDef {
  const RefreshHomePageAction({super.label});
}

/// Invoca um método da bridge nativa (envelope `method`/`params`).
class BridgeAction extends ActionDef {
  const BridgeAction({required this.method, this.params, super.label});
  final String method;
  final Object? params;
}
