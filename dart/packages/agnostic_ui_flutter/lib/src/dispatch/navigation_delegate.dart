/// Abstração de navegação que o FlowEngine aciona (F4.3). O host pluga a
/// implementação concreta — **GoRouter recomendado** (manual §7) — mantendo o
/// renderer sem acoplar um router específico e o dispatcher 100% testável.
///
/// | Handler         | Host (GoRouter)            |
/// | --------------- | -------------------------- |
/// | navigate        | `GoRouter.push(target)`    |
/// | navigateFlow    | `push` com prefixo de flow |
/// | replaceCurrent  | `GoRouter.replace`         |
/// | back            | `GoRouter.pop`             |
/// | refreshHomePage | RefreshController da home  |
abstract interface class NavigationDelegate {
  void navigate(String target);
  void navigateFlow(String target);
  void replaceCurrent(String target);
  void back();
  void refreshHomePage();
}
