// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

let prevLine = 0;
let prevFileName = '';

function formString(currentLine, fileName) {
 return `git log -L ${currentLine},${currentLine}:${fileName}`;
}

function runGitLineLogCommand(currentLine, fileName) {
  const contentString = formString(currentLine, fileName);
  const terminal = vscode.window.createTerminal('Git Line Log');
  const terminalOutput = terminal.sendText(contentString);
  terminal.show();
  return '';
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  vscode.languages.registerHoverProvider('*', {
    provideHover(document, position) {
      const currentLine = position.line + 1;
      const currentFileName = vscode.workspace.asRelativePath(document.fileName);
      if (prevLine !== currentLine || prevFileName !== currentFileName) {
        prevLine = currentLine;
        prevFileName = currentFileName;
        const result = runGitLineLogCommand(currentLine, currentFileName);
        return {
          contents: [result],
        }
      }
    }
  });
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
