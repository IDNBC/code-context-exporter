import * as vscode from 'vscode';
import * as path from 'path'; // パス操作に必要
import { createProjectModel } from './core/scanner';
import { CCPTreeDataProvider, registerCheckboxListener } from './ui/treeView';
import { generateOutput, saveToFile } from './core/generator';
import { CCPConfig, UIState, ProjectModel, FileNode } from './types';

export async function activate(context: vscode.ExtensionContext) {
    // --- 1. 初期設定 ---
    // src/extension.ts 内の初期化部分
    const config: CCPConfig = {
        templatePrompt: "Please analyze the context of the following code and answer the questions accordingly.",
        ignorePatterns: ['node_modules', '.git', 'out', 'dist', '.vscode', '.DS_Store'],
        softIgnorePatterns: ['.env', 'package-lock.json', 'yarn.lock', 'ccp_ver*.txt'],
        options: { 
            includeStructure: true, 
            removeComments: false, 
            extractOnlyOutline: false,
            showCharCount: true,      // 追加
            showTokenEstimate: true   // 追加
        }
    };

    const uiState: UIState = {
        selectedPaths: new Set<string>()
    };

    let model: ProjectModel | undefined;

    // --- 2. UIの準備 ---
    const treeDataProvider = new CCPTreeDataProvider(undefined, uiState.selectedPaths);
    const treeView = vscode.window.createTreeView('ccp-view', { 
        treeDataProvider,
        canSelectMany: true,
        showCollapseAll: true
    });

    // --- 3. プロジェクト読み込み関数 (共通化) ---
    const refreshTree = async () => {
        model = await createProjectModel(config);
        if (model) {
            treeDataProvider.refresh(model.tree);
        }
    };

    // 初回読み込み
    await refreshTree();

    // --- 4. 自動更新 (FileSystemWatcher) ---
    // すべてのファイルを監視
    const watcher = vscode.workspace.createFileSystemWatcher('**/*');
    
    let refreshTimeout: NodeJS.Timeout | undefined;

    // デバウンス処理: 300ms 以内の連続イベントを 1回にまとめる
    const triggerRefresh = (uri: vscode.Uri) => {
        // ignorePatterns に含まれるファイル（node_modules等）への変更は無視
        const fileName = path.basename(uri.fsPath);
        if (config.ignorePatterns.includes(fileName)) {
            return;
        }

        if (refreshTimeout) {
            clearTimeout(refreshTimeout);
        }
        refreshTimeout = setTimeout(async () => {
            await refreshTree();
        }, 300);
    };

    // イベント登録
    watcher.onDidCreate(triggerRefresh);
    watcher.onDidChange(triggerRefresh);
    watcher.onDidDelete(triggerRefresh);

    // ウォッチャーを破棄対象に登録
    context.subscriptions.push(watcher);

    // --- 5. イベント登録 (チェック状態の同期) ---
    registerCheckboxListener(treeView, uiState.selectedPaths);

    // --- 6. コマンド登録 ---
    const runGenerate = async () => {
        if (uiState.selectedPaths.size === 0) {
            vscode.window.showWarningMessage("サイドバーでファイルにチェックを入れてください。");
            return;
        }

        if (!model) return;

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "CCP: 生成中...",
        }, async () => {
            try {
                const finalDoc = await generateOutput(model!.tree, config, uiState.selectedPaths);
                const savedPath = await saveToFile(model!.rootPath, finalDoc);
                
                const doc = await vscode.workspace.openTextDocument(savedPath);
                await vscode.window.showTextDocument(doc);
            } catch (err) {
                vscode.window.showErrorMessage("生成エラー: " + err);
            }
        });
    };

    context.subscriptions.push(
        vscode.commands.registerCommand('ccp.runGenerate', runGenerate),
        vscode.commands.registerCommand('ccp.refresh', refreshTree),
        
        // --- selectAll コマンドの書き換え例 ---
        vscode.commands.registerCommand('ccp.selectAll', () => {
            if (!model) return;
            
            // 末尾のヘルパー関数を使用する（引数の型エラーが消えます）
            const allPaths: string[] = [];
            // ファイルだけを抽出したい場合は addChildrenRecursive を使用
            addAllPathsRecursive(model.tree, allPaths);
            
            allPaths.forEach(p => uiState.selectedPaths.add(p));
            treeDataProvider.refresh(model.tree);
        }),
        vscode.commands.registerCommand('ccp.clearAll', () => {
            if (!model) return;
            uiState.selectedPaths.clear();
            treeDataProvider.refresh(model.tree);
        })
        
    );
}



// ヘルパー関数：フォルダ配下のファイルをすべてリストに入れる
function addChildrenRecursive(node: FileNode, list: string[]) {
    node.children?.forEach((child: FileNode) => {
        if (child.type === "file") {
            list.push(child.path);
        } else {
            addChildrenRecursive(child, list);
        }
    });
}

// --- ヘルパー関数 (ファイルの末尾などに追加) ---

function updateStateRecursive(node: FileNode, isChecked: boolean, stateSet: Set<string>) {
    if (isChecked) stateSet.add(node.path);
    else stateSet.delete(node.path);

    node.children?.forEach(child => updateStateRecursive(child, isChecked, stateSet));
}

function addAllPathsRecursive(node: FileNode, list: string[]) {
    list.push(node.path);
    node.children?.forEach(child => addAllPathsRecursive(child, list));
}