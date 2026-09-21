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
- `data/madamis.json` — 作品データ（タイトル・プレイ人数・価格・発売日・評価・リンク）。`scripts/fetch_data.js` が自動生成する
- `scripts/fetch_data.js` — SNE-ECとマダミス.jpから最新データを取得し`data/madamis.json`を再生成するスクリプト
- `scripts/mdms-map.json` — 作品コード→マダミス.jpシナリオIDの対応表（新作は手動追加が必要）
- `scripts/check_page.js` — Playwrightでのページ動作確認スクリプト（任意）
- `.github/workflows/update-data.yml` — 毎週自動でデータを更新するGitHub Actionsワークフロー

## データの更新

### 自動更新

`.github/workflows/update-data.yml` により毎週自動で`data/madamis.json`が再生成され、変更があれば自動コミットされます。GitHub Pagesも連動して再公開されます。Actionsタブから手動実行（workflow_dispatch）も可能です。

### 手動更新

```bash
node scripts/fetch_data.js
```

新作が出て`scripts/mdms-map.json`に未登録の場合、実行後にコンソールへ「マダミス.jpのシナリオIDが未登録」と表示されます。[マダミス.jp](https://mdms.jp/)で該当作品を検索し、シナリオページURL末尾の数字を`scripts/mdms-map.json`に追記してください。

## データの出典・注意事項

- 出典: [SNE-EC（グループSNE公式アンテナショップ）](https://sne-ec.com/category/item/murdermystery/)。取得日は`data/madamis.json`の`fetchedAt`（ページ下部にも表示）。
- 価格はSNE-EC表示の税込定価です。在庫状況・Amazon等の実売価格は自動取得できなかったため、検索リンクのみ掲載しています。
- サムネイル画像はSNE-EC上の画像URLを直接参照（ホットリンク）しているだけで、このリポジトリには画像ファイルを保存していません。
- 「マダミス.jp評価」は[マダミス.jp](https://mdms.jp/)掲載の評価点(5点満点)・評価件数です。セット商品や同サイトに個別ページが無い作品は評価なしとしています。
- 評価（★）と「プレイ済み」チェックは、各自のブラウザの`localStorage`にのみ保存されます。**メンバー間では共有されません**（このサイトはデータベースを持たない静的サイトのため）。全員で共有したい場合は、Googleスプレッドシート等の併用をおすすめします。
- 対象は「マーダーミステリー」カテゴリの作品のみで、1〜4人用の協力型シリーズ「卓上探偵団」は対象外です。
