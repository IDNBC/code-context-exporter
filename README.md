# Code Context Exporter (CCE)

---

# 🇺🇸 English

## Overview

Code Context Exporter (CCE) is a VSCode extension that collects selected files and exports them into a single structured text optimized for AI interaction.

It is designed to provide full code context in a clean, structured format for use with LLMs and to support future development as a tool that helps AI or humans understand large and complex codebases.

---

## Features

* Select files via tree view
* Export project structure + file contents
* Token & character estimation
* Binary / large file auto-skip
* Structured output optimized for AI prompts

---

## Usage

1. Open the **CCE** sidebar
2. Select files using checkboxes
3. Click **Generate Prompt**
4. A combined output file is generated in your workspace

---

## Output Format

```
[Instruction]
...

[Summary]
Files: X
Estimated Tokens: ~XXXX

[Selected Project Structure]
📁 src
  📄 index.ts

--- FILE: src/index.ts ---
...
```

---

## Use Cases

* Providing full context to AI tools
* Debugging with complete code visibility
* Saving project snapshots
* Submitting assignments as a single file
* Code review and documentation

---

## Design Philosophy

This tool prioritizes explicit user control over automatic filtering.

Instead of relying heavily on .gitignore, users decide what to include.

It is designed to evolve into a tool that helps AI or humans understand large and complex code.

---

## Branch Strategy

This repository uses separate branches:

* `main` → development branch (may include experimental features)
* `release/v0.1` → stable version for marketplace publishing

---

## Naming Note

This project was originally named **CCP (Code Context Protocol)**.
Some internal identifiers (commands, variables) still use `ccp`.

---

## Contributing

Feel free to fork this project and build your own variations.

---

## Roadmap

* [ ] Comment removal (optional mode)
* [ ] File type filtering
* [ ] Token limit optimization
* [ ] Optional `.gitignore` integration
* [ ] Selection presets

---

## License

MIT License

This project is open-source and can be freely used, modified, and redistributed.

---

# 🇯🇵 日本語

## 概要

Code Context Exporter (CCE) は、VSCode上で選択した複数ファイルを
AIに渡しやすい形式で1つのテキストにまとめる拡張機能です。

LLMにコード全体の文脈を与えることを目的とし、
将来的にはAIや人間が巨大で複雑なコードを理解する助けになるツールへ発展させることを目指しています。

---

## 主な機能

* ツリービューからファイル選択
* プロジェクト構造＋ファイル内容の出力
* トークン数・文字数の推定
* バイナリ・巨大ファイルの自動除外
* AIプロンプト向けの整形出力

---

## 使い方

1. サイドバーの **CCE** を開く
2. ファイルをチェックで選択
3. **Generate Prompt** をクリック
4. ワークスペースに出力ファイルが生成されます

---

## 出力形式

```
[Instruction]
...

[Summary]
Files: X
Estimated Tokens: ~XXXX

[Selected Project Structure]
📁 src
  📄 index.ts

--- FILE: src/index.ts ---
...
```

---

## 想定用途

* AIにコード全体を解析させる
* 文脈付きでのデバッグ
* プロジェクトのスナップショット保存
* 課題提出用に1ファイル化
* コードレビューやドキュメント化

---

## 設計思想

本ツールは「自動除外」よりも ユーザーが明示的に選択すること を重視しています。

.gitignoreには完全には依存しません。

将来的には、AIや人間が巨大で複雑なコードを理解する助けになるツールへ発展させることを目指しています。

`.gitignore`には完全には依存しません。

---

## ブランチ運用

本リポジトリでは以下のブランチを使用しています：

* `main` → 開発用（実験的機能を含む可能性あり）
* `release/v0.1` → 公開用の安定版

---

## 命名について

本プロジェクトは元々 **CCP (Code Context Protocol)** として設計されており、
内部コードでは現在も `ccp` という識別子が使用されています。

---

## コントリビューション

フォーク・改変・再公開など自由に行っていただいて構いません。

---

## 今後の開発予定

* コメント削除機能（オプション）
* 拡張子フィルタ
* トークン最適化
* `.gitignore`連携（オプション）
* 選択状態の保存

---

## ライセンス

MIT License

本ソフトウェアは自由に利用・改変・再配布が可能です。
