# 検証用スクリプト

サイトを実際にブラウザで動かして、見た目と描画コストを確かめるためのもの。
サイト本体には不要。手を入れたあとの確認に使う。

## 準備

```
npm install playwright-core
```

Chromium が必要。Playwright で入れる場合:

```
npx playwright install chromium
```

すでにある Chromium / Chrome を使う場合は、その実行ファイルを環境変数で指定する。

```
export CHROME=/path/to/chrome
```

## 使い方

### 画面のキャプチャ

```
node tools/capture.js            # analysis/ に出力
node tools/capture.js /tmp/shots # 出力先を変える
```

トップ・作品ビューア・作品詳細・ダークモード・About・スマホ（390x844）を撮る。
最後に JS エラーの有無が出る。**エラーが出たらそこを直す。**

### 描画コストの測定

```
node tools/perf.js               # 1920x1080
node tools/perf.js 1280 800
```

1フレームあたりのミリ秒を3つ出す。

| 項目 | 目安 |
|---|---|
| 背景の幾何学模様 | 1ms 前後。ここが数msを超えたらマスを大きくする（`pattern.js` の `base`） |
| 作品（通常時） | 1ms 未満 |
| 渦（切替中のみ） | 10ms 前後。超えるなら `viewer.js` の `_getLo` の画素数上限を下げる |

60fps は1フレーム16.6msなので、合計がそれを超えるとコマ落ちする。

## 実測値（2026-08-08 / 1920x1080）

| 項目 | 実測 |
|---|---|
| 背景の幾何学模様 | 0.9 ms |
| 作品（通常時） | 0.4 ms |
| 渦（切替中のみ） | 9.3 ms |
