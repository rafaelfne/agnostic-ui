import 'package:agnostic_ui_contract/agnostic_ui_contract.dart';
import 'package:flutter/widgets.dart';

import 'dispatch/dispatcher.dart';
import 'theme.dart';

/// Escopo do renderer: leva o [NativeDispatcher] e o tema por tenant ([SduiTheme])
/// pela árvore via InheritedWidget, para os componentes despacharem ações e lerem
/// tokens **sem mudar a assinatura dos builders** (F4/F8/F9).
class SduiScope extends InheritedWidget {
  const SduiScope({
    required this.dispatcher,
    this.theme,
    required super.child,
    super.key,
  });

  final NativeDispatcher? dispatcher;
  final SduiTheme? theme;

  static NativeDispatcher? dispatcherOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<SduiScope>()?.dispatcher;

  static SduiTheme? themeOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<SduiScope>()?.theme;

  @override
  bool updateShouldNotify(SduiScope oldWidget) =>
      dispatcher != oldWidget.dispatcher || theme != oldWidget.theme;
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
