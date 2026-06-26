/// Host SDK da Agnostic UI (ADR 0005).
///
/// `EmbedView(renderMode: webview | native)` é a superfície única: o parceiro
/// adota o renderer nativo virando uma flag, sem trocar de API. Reexporta o
/// renderer nativo e a bridge para o host nativo.
library;

export 'package:agnostic_ui_flutter/agnostic_ui_flutter.dart'
    show
        Envelope,
        MethodHandler,
        NativeBridge,
        RenderMode,
        TemplateNode,
        defaultBridgeHandlers;

export 'src/embed_view.dart';
