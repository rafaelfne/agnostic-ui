import 'package:agnostic_ui_contract/agnostic_ui_contract.dart';
import 'package:flutter/widgets.dart';

import 'dispatch/dispatcher.dart';

/// Escopo do renderer: leva o [NativeDispatcher] pela árvore via InheritedWidget,
/// para os componentes despacharem ações **sem mudar a assinatura dos builders**
/// (F4 ⇄ F8). O tema por tenant entra aqui em F9.
class SduiScope extends InheritedWidget {
  const SduiScope({required this.dispatcher, required super.child, super.key});

  final NativeDispatcher? dispatcher;

  static NativeDispatcher? dispatcherOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<SduiScope>()?.dispatcher;

  @override
  bool updateShouldNotify(SduiScope oldWidget) =>
      dispatcher != oldWidget.dispatcher;
}

/// Callback que despacha a ação da prop `action` de um nó (ActionDef), se houver
/// um dispatcher no escopo. Capturado no build; seguro de chamar no onPressed.
VoidCallback nodeActionHandler(BuildContext context, TemplateNode node) {
  final NativeDispatcher? dispatcher = SduiScope.dispatcherOf(context);
  final Object? action = node.props?['action'];
  return () {
    if (action is Map && dispatcher != null) {
      dispatcher.dispatch(ActionDef.fromJson(action.cast<String, Object?>()));
    }
  };
}
