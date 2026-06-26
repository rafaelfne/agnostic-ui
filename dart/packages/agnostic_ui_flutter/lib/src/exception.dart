import 'package:agnostic_ui_contract/agnostic_ui_contract.dart';
import 'package:flutter/material.dart';

import 'sdui_registry.dart';

/// Template de exceção (F9.2): o renderer troca para ele quando o documento traz
/// `exception` ou o context tem um RequestResult `{ success: false }`. A tela de
/// erro nunca quebra a árvore — degradação graciosa (ADR 0005 §6).
Widget _exceptionError(BuildContext c, TemplateNode n, List<Widget> ch) =>
    Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            const Icon(Icons.error_outline, size: 48, color: Colors.redAccent),
            const SizedBox(height: 12),
            Text(
              n.props?['message']?.toString() ?? 'Algo deu errado',
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );

/// Builder do exception-error, registrado no registry padrão.
final Map<String, SduiBuilder> exceptionComponents = <String, SduiBuilder>{
  'exception-error': _exceptionError,
};
