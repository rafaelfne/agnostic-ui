import 'package:agnostic_ui_contract/agnostic_ui_contract.dart';

import '../bridge/native_bridge.dart';
import 'navigation_delegate.dart';

/// Transforma ou **veta** uma ação na cadeia: retornar `null` interrompe o
/// dispatch (a ação não é tratada).
typedef DispatchMiddleware = ActionDef? Function(ActionDef action);

/// Observador de dispatch (telemetria/log), sem alterar a ação.
typedef DispatchHook = void Function(ActionDef action);

/// Dispatcher baseado em middlewares (manual §4.6 / plano §7): cadeia de
/// transformação → `beforeDispatch` → handle → `afterDispatch`. Ações de
/// navegação vão ao [NavigationDelegate] (FlowEngine → GoRouter no host); a ação
/// `bridge` vai à [NativeBridge].
class NativeDispatcher {
  NativeDispatcher({
    required this.navigation,
    this.bridge,
    this.middlewares = const <DispatchMiddleware>[],
    this.beforeDispatch,
    this.afterDispatch,
  });

  final NavigationDelegate navigation;
  final NativeBridge? bridge;
  final List<DispatchMiddleware> middlewares;
  final DispatchHook? beforeDispatch;
  final DispatchHook? afterDispatch;

  Future<void> dispatch(ActionDef action) async {
    ActionDef current = action;
    for (final DispatchMiddleware middleware in middlewares) {
      final ActionDef? next = middleware(current);
      if (next == null) return;
      current = next;
    }
    beforeDispatch?.call(current);
    await _handle(current);
    afterDispatch?.call(current);
  }

  Future<void> _handle(ActionDef action) async {
    switch (action) {
      case NavigateAction(:final String target):
        navigation.navigate(target);
      case NavigateFlowAction(:final String target):
        navigation.navigateFlow(target);
      case ReplaceCurrentAction(:final String target):
        navigation.replaceCurrent(target);
      case BackAction():
        navigation.back();
      case RefreshHomePageAction():
        navigation.refreshHomePage();
      case BridgeAction(:final String method, :final Object? params):
        await bridge?.call(method, params);
    }
  }
}
