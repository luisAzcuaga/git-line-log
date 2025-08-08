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
        reject(stderr);
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
  const contentString = formString(currentLine, fileName);
  try {
    const terminalOutput = await executeCommandAndGetOutput(contentString);
    return formatGitLogOutput(terminalOutput);
  } catch (error) {
    if (/fatal: There is no path .+ in the commit/.test(error)) {
      return 'Git Line Log: Untracked file'
    } else if (/fatal: file .+ has only \d+ lines/.test(error)) {
      return 'Git Line Log: Uncommited line'
    }
    return `Git Line Log Error: ${error}`;
  }
}

function formatGitLogOutput(gitOutput) {
  if (!gitOutput) {
    return 'Git Line Log: No output received 🙈';
  }
  const lines = gitOutput.trim().split('\n');
  // Filter to only keep lines that show actual code changes (+ or -) and commit/author/date info
  const displayLines = lines.filter(line => /^[+-](?![+-])|^(commit|Author|Date)/.test(line));

  // Process lines to format commit and author info more compactly
  const processedLines = [];
  let currentCommit = null;
  let commitDate = null;
  let currentAuthor = null;

  for (const line of displayLines) {
    if (line.startsWith('commit ')) {
      currentCommit = line.match(/commit ([a-f0-9]+)/)?.[1]?.substring(0, 7);
    } else if (line.startsWith('Author: ')) {
      const authorMatch = line.match(/Author: ([^<]+)/);
      currentAuthor = authorMatch?.[1]?.trim() || line.substring(8);
    } else if (line.startsWith('Date: ')) {
      const dateRegexMatch = line.match(/Date: (.+)/)?.[1]?.trim();
      commitDate = new Date(dateRegexMatch).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      if (currentCommit && currentAuthor) {
        processedLines.push(`commit: ${currentCommit} | 🧑🏻‍💻 ${currentAuthor} | 📅 ${commitDate}`);
        commitDate = null;
        currentCommit = null;
        currentAuthor = null;
      }
    } else {
      // Keep code change lines as they are
      processedLines.push(line);
    }
  }

  return `\`\`\`diff\n${processedLines.join('\n')}\n\`\`\``;
}

function activate(context) {
  vscode.languages.registerHoverProvider('*', {
    async provideHover(document, position) {
      const currentLine = position.line + 1;
      const currentFileName = vscode.workspace.asRelativePath(document.fileName);
      const result = await runGitLineLogCommand(currentLine, currentFileName);
      return {
        contents: [`Ran: ${formString(currentLine, currentFileName)}`, new vscode.MarkdownString(result)],
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
