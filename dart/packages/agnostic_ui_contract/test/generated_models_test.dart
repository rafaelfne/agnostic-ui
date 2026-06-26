import 'package:agnostic_ui_contract/agnostic_ui_contract.dart';
import 'package:test/test.dart';

void main() {
  group('modelos de contrato gerados (F1.4)', () {
    test('TemplateNode faz round-trip recursivo', () {
      final Map<String, Object?> json = <String, Object?>{
        'type': 'screen',
        'id': 'home',
        'children': <Object?>[
          <String, Object?>{
            'type': 'text',
            'props': <String, Object?>{'value': 'oi'},
          },
        ],
      };
      final TemplateNode node = TemplateNode.fromJson(json);
      expect(node.type, 'screen');
      expect(node.children, hasLength(1));
      expect(node.children!.first.type, 'text');
      expect(node.toJson(), json);
    });

    test('Envelope decodifica enums e objetos aninhados', () {
      final Map<String, Object?> json = <String, Object?>{
        'id': '0bf1f0e0-0000-4000-8000-000000000000',
        'origin': 'app',
        'type': 'request',
        'meta': <String, Object?>{'bridgeVersion': '1', 'tenantId': 'acme'},
      };
      final Envelope env = Envelope.fromJson(json);
      expect(env.origin, EnvelopeOrigin.app);
      expect(env.type, EnvelopeType.request);
      expect(env.meta.tenantId, 'acme');
      expect(env.toJson(), json);
    });

    test('TenantConfig decodifica enum, mapas e aninhamento profundo', () {
      final Map<String, Object?> json = <String, Object?>{
        'id': 't1',
        'name': 'Acme',
        'slug': 'acme',
        'dataSource': 'mock',
        'version': '1.0.0',
        'theme': <String, Object?>{'primaryColor': '#fff'},
        'features': <String, Object?>{'invest': true},
        'layout': <String, Object?>{
          'appBar': <String, Object?>{
            'routes': <String, Object?>{
              'home': <String, Object?>{'backBehavior': 'close'},
            },
          },
        },
      };
      final TenantConfig cfg = TenantConfig.fromJson(json);
      expect(cfg.dataSource, TenantConfigDataSource.mock);
      expect(cfg.features, <String, bool>{'invest': true});
      expect(cfg.layout!.appBar!.routes!['home']!.backBehavior, 'close');
      expect(cfg.toJson(), json);
    });
  });
}
