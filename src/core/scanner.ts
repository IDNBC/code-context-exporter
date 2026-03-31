// [src/core/scanner.ts]
import * as vscode from 'vscode';
import * as path from 'path';
import { FileNode, ProjectModel, CCPConfig, sortNodes } from '../types';

export async function createProjectModel(config: CCPConfig): Promise<ProjectModel | undefined> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return undefined;

    const rootPath = workspaceFolders[0].uri.fsPath;
    const tree = await buildTree(rootPath, config); // configを渡す

    return { rootPath, tree };
}

// [src/core/scanner.ts]
async function buildTree(currentPath: string, config: CCPConfig): Promise<FileNode> {
    const name = path.basename(currentPath);
    const uri = vscode.Uri.file(currentPath);
    const stat = await vscode.workspace.fs.stat(uri);

    // ★ 判定ロジック
    const isIgnored = config.ignorePatterns.some(p => name === p || name.endsWith(p));
    const isSoftIgnored = config.softIgnorePatterns.some(p => name === p || name.endsWith(p));

    const node: FileNode = {
        path: currentPath,
        name: name,
        type: stat.type === vscode.FileType.Directory ? "folder" : "file",
        isSelected: false, // 初期値
        isIgnored: isIgnored,
        isSoftIgnored: isSoftIgnored
    };

    if (node.type === "folder" && !isIgnored) {
        const entries = await vscode.workspace.fs.readDirectory(uri);
        node.children = [];
        
        // 並列処理で高速化（STEP 4の対策）
        const childPromises = entries.map(async ([childName, childType]) => {
            const childPath = path.join(currentPath, childName);
            const childNode = await buildTree(childPath, config);
            if (!childNode.isIgnored) {
                return childNode;
            }
            return null;
        });

        const results = await Promise.all(childPromises);
        node.children = results.filter((n): n is FileNode => n !== null).sort(sortNodes); // ★ ここで順序を一生分確定させる;
    }
    return node;
}