// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const child_process = require('child_process');

let prevLine = 0;
let prevFileName = '';

function executeCommandAndGetOutput(command) {
  return new Promise((resolve, reject) => {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const options = workspaceRoot ? { cwd: workspaceRoot } : {};
    
    return child_process.exec(command, options, (error, stdout, stderr) => {
      if (error) {
        reject(`${error.message}\n${stderr}`);
      } else {
        resolve(stdout);
      }
    });
  });
}

function formString(currentLine, fileName) {
  return `git log -L ${currentLine},${currentLine}:${fileName}`;
}

async function runGitLineLogCommand(currentLine, fileName) {
  try {
    const contentString = formString(currentLine, fileName);
    const terminalOutput = await executeCommandAndGetOutput(contentString);
    return terminalOutput;
  } catch (error) {
    return error;
  }
}

function activate(context) {
  vscode.languages.registerHoverProvider('*', {
    async provideHover(document, position) {
      try {
        const currentLine = position.line + 1;
        const currentFileName = vscode.workspace.asRelativePath(document.fileName);
        if (prevLine !== currentLine || prevFileName !== currentFileName) {
          prevLine = currentLine;
          prevFileName = currentFileName;
          const result = await runGitLineLogCommand(currentLine, currentFileName);
          return {
            contents: [result],
          }
        }
      } catch (error) {
        return {
          contents: [`Contents: ${error.message || error}`],
        };
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
