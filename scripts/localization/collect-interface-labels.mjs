import ts from 'typescript-ast';
import fs from 'node:fs';
import path from 'node:path';

const labels = {};
const skipped = [];
const technical = /^(CloudCLI|Claude(?: Code)?|Codex|Cursor|OpenCode|DeepSeek(?:.*)?|Git(?:Hub)?|MCP|API|JSON|HTTP|HTTPS|URL|ID|PID|SDK|UTF-8|SSH|CPU|RAM|esc|Esc|Enter|Tab|Shift|Ctrl|Alt|Cmd|Space|px|ms|fps|\/command arg1 arg2|\$ARGUMENTS|@file|\.env|\.md|\.json)$/;
function eligible(text) {
  return !text.startsWith('{') && /[A-Za-z]{2}/.test(text) && !/[\u4e00-\u9fff]/.test(text) && !technical.test(text) && !/^https?:|^[A-Z_]+$/.test(text);
}
function key(text) {
  let value = 2166136261;
  for (let i = 0; i < text.length; i++) value = Math.imul(value ^ text.charCodeAt(i), 16777619);
  const id = `label_${(value >>> 0).toString(16)}`;
  if (labels[id] && labels[id] !== text) throw new Error('Translation key collision');
  labels[id] = text;
  return id;
}
function normalizeJsx(text) {
  const lines = text.split(/\r\n|\n|\r/);
  let last = 0;
  lines.forEach((line, i) => { if (line.trim()) last = i; });
  return lines.map((line, i) => {
    let part = line.replace(/\t/g, ' ');
    if (i) part = part.replace(/^ +/, '');
    if (i < lines.length - 1) part = part.replace(/ +$/, '');
    return part ? part + (i !== last ? ' ' : '') : '';
  }).join('');
}
function componentOwner(node) {
  for (let n = node.parent; n; n = n.parent) {
    if (ts.isFunctionDeclaration(n) && n.body && (!n.name || /^[A-Z]/.test(n.name.text))) return n;
    if (ts.isArrowFunction(n) || ts.isFunctionExpression(n)) {
      let parent = n.parent;
      while (parent && (ts.isCallExpression(parent) || ts.isParenthesizedExpression(parent))) parent = parent.parent;
      if (parent && ts.isVariableDeclaration(parent) && /^[A-Z]/.test(parent.name.getText()) && ts.isBlock(n.body)) return n;
    }
  }
  return null;
}
function scan(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'tests') scan(file);
    else if (entry.isFile() && file.endsWith('.tsx') && !file.endsWith('/LocalizedText.tsx')) transform(file);
  }
}
function transform(file) {
  const source = fs.readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits = [];
  const owners = new Set();
  let useText = false;
  function visit(node) {
    if (ts.isJsxText(node)) {
      const normalized = normalizeJsx(node.text);
      const text = normalized.trim();
      if (eligible(text)) {
        if (ts.isJsxElement(node.parent) && node.parent.openingElement.tagName.getText(ast) === 'Shimmer') {
          const owner = componentOwner(node);
          if (!owner) { skipped.push({ file, text }); return; }
          key(text); owners.add(owner);
          edits.push({ start: node.pos, end: node.end, value: `{translateInterfaceText(${JSON.stringify(text)})}` });
          return;
        }
        key(text); useText = true;
        const prefix = normalized.startsWith(' ') ? "{' '}" : '';
        const suffix = normalized.endsWith(' ') ? "{' '}" : '';
        edits.push({ start: node.pos, end: node.end, value: `${prefix}<LocalizedText text={${JSON.stringify(text)}} />${suffix}` });
      }
    } else if (ts.isJsxAttribute(node) && ['title', 'placeholder', 'aria-label', 'alt'].includes(node.name.text)
      && node.initializer && ts.isStringLiteral(node.initializer) && eligible(node.initializer.text)) {
      const owner = componentOwner(node);
      if (owner) {
        key(node.initializer.text); owners.add(owner);
        edits.push({ start: node.initializer.getStart(ast), end: node.initializer.end,
          value: `{translateInterfaceText(${JSON.stringify(node.initializer.text)})}` });
      } else skipped.push({ file, text: node.initializer.text });
    }
    if (ts.isJsxExpression(node) && node.expression
      && (!ts.isJsxAttribute(node.parent) || ['title', 'placeholder', 'aria-label', 'alt'].includes(node.parent.name.text))) {
      function collect(expression) {
        if (ts.isConditionalExpression(expression)) {
          collect(expression.whenTrue); collect(expression.whenFalse); return;
        }
        if (ts.isParenthesizedExpression(expression)) { collect(expression.expression); return; }
        if (ts.isBinaryExpression(expression) && [ts.SyntaxKind.AmpersandAmpersandToken,
          ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(expression.operatorToken.kind)) {
          collect(expression.right); return;
        }
        if (ts.isStringLiteral(expression) && eligible(expression.text)) {
          const owner = componentOwner(node);
          if (owner) {
            key(expression.text); owners.add(owner);
            edits.push({ start: expression.getStart(ast), end: expression.end,
              value: `translateInterfaceText(${JSON.stringify(expression.text)})` });
          } else skipped.push({ file, text: expression.text });
        }
      }
      collect(node.expression);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  if (!edits.length) return;
  for (const owner of owners) if (!owner.body.getText(ast).includes('const translateInterfaceText = useInterfaceText();')) edits.push({ start: owner.body.getStart(ast) + 1, end: owner.body.getStart(ast) + 1,
    value: '\n  const translateInterfaceText = useInterfaceText();\n' });
  let imports = '';
  if (useText && !source.includes("import { LocalizedText }")) imports += "import { LocalizedText } from '@/shared/ui/LocalizedText';\n";
  if (owners.size && !source.includes("import { useInterfaceText }")) imports += "import { useInterfaceText } from '@/shared/hooks/useInterfaceText';\n";
  edits.push({ start: 0, end: 0, value: imports });
  let output = source;
  for (const edit of edits.sort((a, b) => b.start - a.start)) output = output.slice(0, edit.start) + edit.value + output.slice(edit.end);
  fs.writeFileSync(file, output);
}
scan('src');
const resourcePath = 'src/modules/i18n/locales/en/common.json';
const resource = JSON.parse(fs.readFileSync(resourcePath));
resource.literal = { ...resource.literal, ...labels };
fs.writeFileSync(resourcePath, JSON.stringify(resource, null, 2) + '\n');
console.log('Collected static labels:', Object.keys(labels).length);
console.log('Attributes requiring manual handling:', skipped);
