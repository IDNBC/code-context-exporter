import * as vscode from 'vscode';
import * as path from 'path';
import { CCPConfig, FileNode } from '../types';

/**
 * 分析：文字数と推定トークンを計算
 */
function analyzeContent(content: string) {
    const charCount = content.length;
    // 日本語が含まれる場合は1文字0.5、英語のみなら0.25とする簡易計算
    const isCJK = /[\u3000-\u9FFF]/.test(content);
    const tokenEstimate = isCJK ? Math.ceil(charCount / 2) : Math.ceil(charCount / 4);
    
    return { charCount, tokenEstimate };
}

/**
 * 変換：コメント削除などの加工
 */
function transformContent(content: string, filePath: string, config: CCPConfig): string {
    if (!config.options.removeComments) {
        return content;
    }

    const ext = path.extname(filePath).toLowerCase();
    let transformed = content;

    // 言語別のコメント削除ロジック
    if (['.ts', '.js', '.tsx', '.jsx', '.java', '.cpp', '.c', '.cs', '.css', '.go'].includes(ext)) {
        transformed = transformed
            .replace(/\/\*[\s\S]*?\*\//g, '') // ブロックコメント
            .replace(/(^|\s)\/\/.*$/gm, '');  // 行コメント
    } 
    else if (['.py', '.rb', '.sh', '.yaml', '.yml', '.r'].includes(ext)) {
        transformed = transformed.replace(/#.*/g, ''); // 行コメント
        if (ext === '.py') {
            transformed = transformed.replace(/'''[\s\S]*?'''|"""[\s\S]*?"""/g, ''); // docstring
        }
    } 
    else if (['.html', '.xml', '.vue'].includes(ext)) {
    transformed = transformed.replace(/<!--[\s\S]*?-->/g, '');
    }

    // 改行の整理（3行以上の連続改行を2行にまとめる）
    transformed = transformed.replace(/\n\s*\n\s*\n/g, '\n\n');

    return transformed.trim();
}

/**
 * 書式化：ファイルヘッダーの作成
 */
function formatFileHeader(relativePath: string, charCount: number, tokenEstimate: number, config: CCPConfig): string {
    let header = `--- FILE: ${relativePath}`;
    
    const parts: string[] = [];
    if (config.options.showCharCount) {
        parts.push(`${charCount} chars`);
    }
    if (config.options.showTokenEstimate) {
        parts.push(`~${tokenEstimate} tokens`);
    }
    
    if (parts.length > 0) {
        header += ` (${parts.join(' / ')})`;
    }
    
    header += ` ---\n`;
    return header;
}

/**
 * 走査（DFS）：見たままの順番でファイルをリストに格納
 */
function collectFilesRecursive(node: FileNode, result: string[]) {
    if (node.type === "file") {
        result.push(node.path);
        return;
    }
    if (node.children) {
        for (const child of node.children) {
            collectFilesRecursive(child, result);
        }
    }
}

/**
 * 構成図の生成
 */
function generateSmartTreeText(node: FileNode, selectedPaths: Set<string>, indent: string = ""): string {
    const isSelected = selectedPaths.has(node.path);
    const hasSelectedChild = hasSelectedInTree(node, selectedPaths);

    if (!isSelected && !hasSelectedChild) return "";

    let text = `${indent}${node.type === "folder" ? "📁" : "📄"} ${node.name}\n`;
    
    if (node.children) {
        for (const child of node.children) {
            text += generateSmartTreeText(child, selectedPaths, indent + "  ");
        }
    }
    return text;
}

function hasSelectedInTree(node: FileNode, selectedPaths: Set<string>): boolean {
    return node.children?.some(child => 
        selectedPaths.has(child.path) || hasSelectedInTree(child, selectedPaths)
    ) ?? false;
}

/**
 * メインの出力生成
 */
export async function generateOutput(
    rootNode: FileNode | undefined,
    config: CCPConfig,
    selectedPaths: Set<string>
): Promise<string> {
    if (!rootNode) return "";

    let fileContentSection = "";
    let totalChars = 0;
    let totalTokens = 0;
    let fileCount = 0;

    const allFilesSorted: string[] = [];
    collectFilesRecursive(rootNode, allFilesSorted);
    const filteredPaths = allFilesSorted.filter(p => selectedPaths.has(p));

    const rootPath = rootNode.path;
    for (const filePath of filteredPaths) {
        try {
            const uri = vscode.Uri.file(filePath);
            const contentBuffer = await vscode.workspace.fs.readFile(uri);
            if (contentBuffer.includes(0)) continue; 

            let content = new TextDecoder().decode(contentBuffer);
            
            // 変換と分析
            content = transformContent(content, filePath, config);
            const { charCount, tokenEstimate } = analyzeContent(content);
            
            totalChars += charCount;
            totalTokens += tokenEstimate;
            fileCount++;

            const relativePath = path.relative(rootPath, filePath);
            fileContentSection += formatFileHeader(relativePath, charCount, tokenEstimate, config);
            fileContentSection += `${content.replace(/\u2028/g, '\n').replace(/\u2029/g, '\n')}\n\n`;

        } catch (err) {
            console.error(`Failed to read: ${filePath}`, err);
        }
    }

    let output = "";
    output += `[Instruction]\n${config.templatePrompt}\n\n`;

    // Summary
    output += `[Summary]\n`;
    output += `Files: ${fileCount}\n`;
    if (config.options.showCharCount) {
        output += `Total Characters: ${totalChars}\n`;
    }
    if (config.options.showTokenEstimate) {
        let warning = "";
        if (totalTokens > 100000) warning = " ⚠️ VERY LARGE";
        else if (totalTokens > 30000) warning = " ⚠️ LARGE";
        output += `Estimated Total Tokens: ~${totalTokens}${warning}\n`;
    }
    output += `\n`;

    output += `[Selected Project Structure]\n`;
    output += generateSmartTreeText(rootNode, selectedPaths);
    output += `\n`;

    output += fileContentSection;

    return output;
}

export async function saveToFile(rootPath: string, content: string): Promise<string> {
    let version = 1;
    let fileUri: vscode.Uri;
    while (true) {
        const fileName = `ccp_ver${version}.txt`;
        fileUri = vscode.Uri.file(path.join(rootPath, fileName));
        try {
            await vscode.workspace.fs.stat(fileUri);
            version++;
        } catch {
            break;
        }
    }
    const encoder = new TextEncoder();
    await vscode.workspace.fs.writeFile(fileUri, encoder.encode(content));
    return fileUri.fsPath;
}