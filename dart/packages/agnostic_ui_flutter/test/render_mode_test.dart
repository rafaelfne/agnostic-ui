import 'package:agnostic_ui_flutter/agnostic_ui_flutter.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('RenderMode oferece os dois modos de host (ADR 0005 §1)', () {
    expect(
        RenderMode.values, <RenderMode>[RenderMode.webview, RenderMode.native]);
  });
}
