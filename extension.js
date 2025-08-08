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
  // Filter to only keep lines that show actual code changes (+ or -) and commit/author/date info
  const displayLines = lines.filter(line => /^[+-](?![+-])|^(commit|Author|Date)/.test(line));

  // Process lines to format commit and author info more compactly
  const processedLines = [];
  let currentCommit = null;
  let currentAuthor = null;

  for (const line of displayLines) {
    if (line.startsWith('commit ')) {
      currentCommit = line.match(/commit ([a-f0-9]+)/)?.[1]?.substring(0, 7);
    } else if (line.startsWith('Author: ')) {
      const authorMatch = line.match(/Author: ([^<]+)/);
      currentAuthor = authorMatch?.[1]?.trim() || line.substring(8);

      // When we have both commit and author, add the formatted line
      if (currentCommit && currentAuthor) {
        processedLines.push(` commit: ${currentCommit} | Author: ${currentAuthor}`);
        currentCommit = null;
        currentAuthor = null;
      }
    } else {
      // Keep code change lines as they are
      processedLines.push(line);
    }
  }

  return `\`\`\`${fileExtension}\n${processedLines.join('\n')}\n\`\`\``;
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
