import 'package:agnostic_ui_contract/agnostic_ui_contract.dart';
import 'package:agnostic_ui_flutter/agnostic_ui_flutter.dart';
import 'package:flutter/material.dart';

import 'src/mock_documents.dart';

void main() => runApp(const PlaygroundApp());

/// App de referência (F10): demonstra o renderer nativo dirigido por **marker de
/// sandbox** (`app_sandbox_<tenant>_<profile>`), com documentos mock por perfil.
class PlaygroundApp extends StatelessWidget {
  const PlaygroundApp({super.key});

  @override
  Widget build(BuildContext context) {
    final SduiTheme theme = SduiTheme.fromTenant(const <String, Object?>{
      'primaryColor': '#1565C0',
    });
    return MaterialApp(
      title: 'Yuki Labs Playground',
      theme: buildThemeData(theme),
      home: const PlaygroundHome(tenant: 'partnerco'),
    );
  }
}

class PlaygroundHome extends StatefulWidget {
  const PlaygroundHome({super.key, required this.tenant});

  final String tenant;

  @override
  State<PlaygroundHome> createState() => _PlaygroundHomeState();
}

class _PlaygroundHomeState extends State<PlaygroundHome> {
  MockProfile _profile = MockProfile.happyPath;

  String get _marker => 'app_sandbox_${widget.tenant}_${_profile.name}';

  @override
  Widget build(BuildContext context) {
    // O perfil sai do marker — exatamente como o host nativo injetaria o token.
    final MockProfile profile =
        parseSandboxMarker(_marker)?.profile ?? MockProfile.happyPath;
    final SduiDocument document = mockDocumentFor(profile);

    return Scaffold(
      appBar: AppBar(title: const Text('Yuki Labs Playground')),
      body: Column(
        children: <Widget>[
          Padding(
            padding: const EdgeInsets.all(8),
            child: Wrap(
              spacing: 8,
              children: <Widget>[
                for (final MockProfile p in MockProfile.values)
                  ChoiceChip(
                    label: Text(p.name),
                    selected: p == _profile,
                    onSelected: (_) => setState(() => _profile = p),
                  ),
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: SduiDocumentView(
              key: ValueKey<MockProfile>(_profile),
              document: document,
              dispatcher: NativeDispatcher(navigation: _LoggingNavigation()),
              onRefresh: () async {},
            ),
          ),
        ],
      ),
    );
  }
}

class _LoggingNavigation implements NavigationDelegate {
  @override
  void navigate(String target) => debugPrint('navigate: $target');
  @override
  void navigateFlow(String target) => debugPrint('navigateFlow: $target');
  @override
  void replaceCurrent(String target) => debugPrint('replaceCurrent: $target');
  @override
  void back() => debugPrint('back');
  @override
  void refreshHomePage() => debugPrint('refreshHomePage');
}
