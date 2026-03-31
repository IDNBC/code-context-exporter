// [src/types.ts]

export interface FileNode {
  path: string;
  name: string;
  type: "file" | "folder";
  children?: FileNode[];

  // ★ 追加：状態管理用
  isSelected: boolean;  // チェックボックスの状態
  isIgnored: boolean;   // ツリーに表示すらしない（node_modules等）
  isSoftIgnored: boolean; // 表示はするが、初期状態でチェックを入れない（dist, .env等）
}

export interface ProjectModel {
  rootPath: string;
  tree: FileNode;
}

/**
 * 出力時の詳細設定を切り出し
 */
export interface CCPOptions {
  includeStructure: boolean;
  removeComments: boolean;
  extractOnlyOutline: boolean;
  showCharCount: boolean;      // ★ 追加
  showTokenEstimate: boolean;   // ★ 追加
}

export interface CCPConfig {
  templatePrompt: string;
  ignorePatterns: string[];     // 完全非表示（ハード）
  softIgnorePatterns: string[]; // 表示するが初期OFF（ソフト）
  options: CCPOptions;          // ★ CCPOptionsを使用
}

// 選択状態を管理するインターフェース
export interface UIState {
  selectedPaths: Set<string>;
}

// 出力ログ
export interface OutputLog {
  fileName: string;
  timestamp: number;
  fullPath: string;
}

/**
 * エクスプローラー互換の共通ソート関数
 * フォルダ優先 > 名前順（数値考慮）
 */
export function sortNodes(a: FileNode, b: FileNode): number {
    if (a.type !== b.type) {
        return a.type === "folder" ? -1 : 1;
    }
    return a.name.localeCompare(b.name, undefined, { 
        numeric: true, 
        sensitivity: 'base' 
    });
}