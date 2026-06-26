import 'package:agnostic_ui_flutter/agnostic_ui_flutter.dart';
import 'package:flutter_test/flutter_test.dart';

class _FakeNav implements NavigationDelegate {
  final List<String> calls = <String>[];
  @override
  void navigate(String target) => calls.add('navigate:$target');
  @override
  void navigateFlow(String target) => calls.add('navigateFlow:$target');
  @override
  void replaceCurrent(String target) => calls.add('replaceCurrent:$target');
  @override
  void back() => calls.add('back');
  @override
  void refreshHomePage() => calls.add('refreshHomePage');
}

void main() {
  group('NativeDispatcher (F4.4)', () {
    test('roteia cada ação de navegação para o delegate', () async {
      final _FakeNav nav = _FakeNav();
      final NativeDispatcher dispatcher = NativeDispatcher(navigation: nav);
      await dispatcher.dispatch(const NavigateAction(target: '/invest'));
      await dispatcher.dispatch(const ReplaceCurrentAction(target: '/home'));
      await dispatcher.dispatch(const BackAction());
      await dispatcher.dispatch(const RefreshHomePageAction());
      expect(nav.calls, <String>[
        'navigate:/invest',
        'replaceCurrent:/home',
        'back',
        'refreshHomePage',
      ]);
    });

    test('cadeia de middleware transforma a ação', () async {
      final _FakeNav nav = _FakeNav();
      final NativeDispatcher dispatcher = NativeDispatcher(
        navigation: nav,
        middlewares: <DispatchMiddleware>[
          (ActionDef a) => a is NavigateAction
              ? const NavigateAction(target: '/redirected')
              : a,
        ],
      );
      await dispatcher.dispatch(const NavigateAction(target: '/x'));
      expect(nav.calls, <String>['navigate:/redirected']);
    });

    test('middleware que veta (null) interrompe o dispatch e o afterDispatch',
        () async {
      final _FakeNav nav = _FakeNav();
      final List<String> after = <String>[];
      final NativeDispatcher dispatcher = NativeDispatcher(
        navigation: nav,
        middlewares: <DispatchMiddleware>[(ActionDef a) => null],
        afterDispatch: (ActionDef a) => after.add('after'),
      );
      await dispatcher.dispatch(const BackAction());
      expect(nav.calls, isEmpty);
      expect(after, isEmpty);
    });

    test('hooks before/after rodam ao redor do handle', () async {
      final _FakeNav nav = _FakeNav();
      final List<String> order = <String>[];
      final NativeDispatcher dispatcher = NativeDispatcher(
        navigation: nav,
        beforeDispatch: (ActionDef a) => order.add('before'),
        afterDispatch: (ActionDef a) => order.add('after'),
      );
      await dispatcher.dispatch(const BackAction());
      expect(order, <String>['before', 'after']);
      expect(nav.calls, <String>['back']);
    });

    test('ação bridge é despachada para a NativeBridge', () async {
      final List<String> seen = <String>[];
      final NativeBridge bridge = NativeBridge(
        tenantId: 'acme',
        handlers: <String, MethodHandler>{
          'haptics': (Object? params) async {
            seen.add('haptics:${(params! as Map)['type']}');
            return null;
          },
        },
      );
      final NativeDispatcher dispatcher = NativeDispatcher(
        navigation: _FakeNav(),
        bridge: bridge,
      );
      await dispatcher.dispatch(
        const BridgeAction(
            method: 'haptics', params: <String, Object?>{'type': 'light'}),
      );
      expect(seen, <String>['haptics:light']);
      await bridge.dispose();
    });
  });
}
