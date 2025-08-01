// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const child_process = require('child_process');

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

    // Format the git log output for better display
    return formatGitLogOutput(terminalOutput);
  } catch (error) {
    return `**Error:** ${error}`;
  }
}

function formatGitLogOutput(gitOutput) {
  if (!gitOutput || gitOutput.trim() === '') {
    return '**No git history found for this line**';
  }

  const lines = gitOutput.trim().split('\n');

  // Extract the file extension from the diff line to set the language for syntax highlighting
  const diffLine = lines.find(line => line.includes('diff --git'));
  const fileExtension = diffLine ? diffLine.match(/\.([a-zA-Z0-9]+)$/)?.[1] || '' : '';
  // Filter to only keep lines that show actual code changes (+ or -)
  const displayLines = lines.filter(line => /^[+-](?![+-])/.test(line));

  // Limit the number of lines to prevent overly large tooltips
  // const maxLines = 30;
  // const displayLines = filteredLines.slice(0, maxLines);

  // if (filteredLines.length > maxLines) {
  //   displayLines.push('...', `(${filteredLines.length - maxLines} more lines truncated)`);
  // }

  return `\`\`\`${fileExtension}\n${displayLines.join('\n')}\n\`\`\``;
}

function activate(context) {
  vscode.languages.registerHoverProvider('*', {
    async provideHover(document, position) {
      try {
        const currentLine = position.line + 1;
        const currentFileName = vscode.workspace.asRelativePath(document.fileName);
        const result = await runGitLineLogCommand(currentLine, currentFileName);
        return {
          contents: [`Ran: ${formString(currentLine, currentFileName)}`, new vscode.MarkdownString(result)],
        }
      } catch (error) {
        return {
          contents: [new vscode.MarkdownString(`**Error:** ${error.message || error}`)],
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
