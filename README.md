# グループSNE マダミス一覧

グループSNEのマーダーミステリー全作品を、プレイ人数・価格・評価で絞り込める一覧ページです。GitHub Pagesでの公開を想定した静的サイトです。

## 公開方法（GitHub Pages）

1. GitHubで新しいリポジトリを作成します（例: `sne-madamis`）。Public / Privateどちらでも公開できます（Privateの場合はGitHub Pro以上が必要）。
2. このフォルダの中身（`index.html`, `data/`フォルダなど）をそのリポジトリにpushします。

   ```bash
   cd sne-madamis
   git remote add origin https://github.com/<あなたのユーザー名>/<リポジトリ名>.git
   git branch -M main
   git push -u origin main
   ```

3. GitHubのリポジトリ画面で **Settings → Pages** を開き、「Source」を `Deploy from a branch`、ブランチを `main` / `/(root)` に設定して保存します。
4. 数分後に `https://<あなたのユーザー名>.github.io/<リポジトリ名>/` でアクセスできるようになります。

## ファイル構成

- `index.html` — ページ本体（HTML/CSS/JS、外部ライブラリ不使用）
- `data/madamis.json` — 作品データ（タイトル・プレイ人数・価格・発売日・リンク）
- `scripts/build_data.py` — `data/madamis.json` を生成するスクリプト（作品を追加・修正する際に編集して再実行）
- `scripts/check_page.js` — Playwrightでのページ動作確認スクリプト（任意）

## データの更新

`scripts/build_data.py` 内の `ITEMS` リストに作品を追加・編集し、以下を実行してください。

```bash
python3 scripts/build_data.py
```

## データの出典・注意事項

- 出典: [SNE-EC（グループSNE公式アンテナショップ）](https://sne-ec.com/category/item/murdermystery/) 2026-09-21取得
- 価格はSNE-EC表示の税込定価です。Amazon等の実売価格は自動取得できなかったため、検索リンクのみ掲載しています。
- 「マダミス.jp評価」は[マダミス.jp](https://mdms.jp/)掲載の評価点(5点満点)・評価件数です（2026-09-21取得）。セット商品や同サイトに個別ページが無い作品(65作品中7作品)は評価なしとしています。
- 評価（★）と「プレイ済み」チェックは、各自のブラウザの`localStorage`にのみ保存されます。**メンバー間では共有されません**（このサイトはデータベースを持たない静的サイトのため）。全員で共有したい場合は、Googleスプレッドシート等の併用をおすすめします。
- 対象は「マーダーミステリー」カテゴリの作品のみで、1〜4人用の協力型シリーズ「卓上探偵団」は対象外です。
