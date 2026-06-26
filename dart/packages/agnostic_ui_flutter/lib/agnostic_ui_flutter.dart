/// Renderer SDUI nativo em Flutter (ADR 0005).
///
/// `TemplateRenderer` resolve o template contra os dados (binding compartilhado
/// com o engine TS, via `agnostic_ui_contract`) e compõe widgets nativos pelo
/// `SduiRegistry` (primitivos Core UI + fallback gracioso). Dispatcher/FlowEngine,
/// bridge e catálogo completo vêm nas features seguintes.
library;

export 'package:agnostic_ui_contract/agnostic_ui_contract.dart'
    show
        ActionDef,
        BackAction,
        BridgeAction,
        Envelope,
        EnvelopeError,
        EnvelopeMeta,
        EnvelopeOrigin,
        EnvelopeType,
        NavigateAction,
        NavigateFlowAction,
        RefreshHomePageAction,
        ReplaceCurrentAction,
        SduiDocument,
        SduiException,
        SduiRefresh,
        TemplateNode,
        resolveTemplate,
        evaluateExpression;

export 'src/bridge/bridge_constants.dart';
export 'src/client/sdui_client.dart';
export 'src/dispatch/dispatcher.dart';
export 'src/dispatch/navigation_delegate.dart';
export 'src/bridge/default_handlers.dart' show defaultBridgeHandlers;
export 'src/bridge/native_bridge.dart' show MethodHandler, NativeBridge;
export 'src/core_components.dart' show createDefaultRegistry;
export 'src/document_view.dart' show SduiDocumentView;
export 'src/render_mode.dart';
export 'src/sdui_registry.dart';
export 'src/sdui_scope.dart' show SduiScope;
export 'src/template_renderer.dart';
export 'src/tenant_overlay.dart' show partnercoOverlay;
export 'src/theme.dart' show SduiTheme, buildThemeData;
