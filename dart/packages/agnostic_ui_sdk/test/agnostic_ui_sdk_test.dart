import 'package:agnostic_ui_sdk/agnostic_ui_sdk.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('reexporta RenderMode do renderer nativo', () {
    expect(RenderMode.values, contains(RenderMode.native));
  });
}
