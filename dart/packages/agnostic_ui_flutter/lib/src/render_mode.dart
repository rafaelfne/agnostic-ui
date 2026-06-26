/// Como a `EmbedView` materializa a UI de um tenant (ADR 0005 §1).
///
/// O parceiro troca de host por uma flag, sem mudar a API: `webview` mantém o
/// comportamento do manual (carrega o BFF num WebView); `native` monta o
/// `TemplateRenderer` nativo.
enum RenderMode {
  /// Carrega o WebView do BFF (comportamento do manual §14.3).
  webview,

  /// Monta o renderer SDUI nativo, sem WebView.
  native,
}
