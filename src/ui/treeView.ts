import * as vscode from 'vscode';
import * as path from 'path';
import { FileNode } from '../types';

export class CCPTreeDataProvider implements vscode.TreeDataProvider<CCPItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<CCPItem | undefined | void> = new vscode.EventEmitter<CCPItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<CCPItem | undefined | void> = this._onDidChangeTreeData.event;

    // ★ currentUiState をクラス内で保持できるように定義
    constructor(
        private rootNode: FileNode | undefined,
        private currentUiState: Set<string> // extension.ts から受け取る
    ) {}

    refresh(newRoot: FileNode | undefined): void {
        this.rootNode = newRoot;
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: CCPItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: CCPItem): Thenable<CCPItem[]> {
        if (!this.rootNode) return Promise.resolve([]);
        if (element) {
            return Promise.resolve(this.createItems(element.node.children || []));
        } else {
            return Promise.resolve(this.createItems(this.rootNode.children || []));
        }
    }

    private createItems(nodes: FileNode[]): CCPItem[] {
        // Scannerでソート済みなので、ここでは sort() を呼ばない
        return nodes.map(node => new CCPItem(node, this.currentUiState));
    }
}

class CCPItem extends vscode.TreeItem {
    constructor(public readonly node: FileNode, private uiState: Set<string>) {
        super(
            node.name,
            node.type === "folder" 
                ? vscode.TreeItemCollapsibleState.Collapsed 
                : vscode.TreeItemCollapsibleState.None
        );

        this.id = node.path;
        this.resourceUri = vscode.Uri.file(node.path);
        
        // ★ UIState を参照して初期状態を決める
        this.checkboxState = uiState.has(node.path)
            ? vscode.TreeItemCheckboxState.Checked
            : vscode.TreeItemCheckboxState.Unchecked;
    }
}

// ★ uiState を第2引数で受け取るように定義（これで extension.ts の赤線が消えます）
export function registerCheckboxListener(view: vscode.TreeView<CCPItem>, uiState: Set<string>) {
    view.onDidChangeCheckboxState(e => {
        e.items.forEach(([item, newState]) => { 
            updateChildCheckboxes(item, newState, uiState);
        });
    });
}

function updateChildCheckboxes(item: CCPItem, state: vscode.TreeItemCheckboxState, uiState: Set<string>) {
    const isChecked = state === vscode.TreeItemCheckboxState.Checked;
    applyStateRecursive(item.node, isChecked, uiState);
}

function applyStateRecursive(node: FileNode, isChecked: boolean, uiState: Set<string>) {
    if (isChecked) uiState.add(node.path);
    else uiState.delete(node.path);

    if (node.children) {
        node.children.forEach(child => applyStateRecursive(child, isChecked, uiState));
    }
}