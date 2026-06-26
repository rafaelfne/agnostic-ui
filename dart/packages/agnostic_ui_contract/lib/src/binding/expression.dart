/// AST de expressão — espelho fechado do `ExpressionNode` do engine TS
/// (`packages/engine/src/schemas/expression.ts`). Vocabulário auditado, sem eval.
sealed class ExprNode {
  const ExprNode();
}

/// Literal: `String`, `num`, `bool` ou `null`.
class LitNode extends ExprNode {
  const LitNode(this.value);
  final Object? value;
}

/// Acesso por path pontuado (ex.: `user.name`, `$item.id`).
class PathNode extends ExprNode {
  const PathNode(this.path);
  final String path;
}

/// Operador (`&&`, `||`, `!`, `==`, `<`, `+`, …) sobre `args`.
class OpNode extends ExprNode {
  const OpNode(this.op, this.args);
  final String op;
  final List<ExprNode> args;
}

/// Condicional ternário `if ? then : otherwise`.
class CondNode extends ExprNode {
  const CondNode(this.condition, this.then, this.otherwise);
  final ExprNode condition;
  final ExprNode then;
  final ExprNode otherwise;
}

/// Chamada a uma função curada (`upper(x)`, `currency(v, 'BRL')`).
class CallNode extends ExprNode {
  const CallNode(this.fn, this.args);
  final String fn;
  final List<ExprNode> args;
}
