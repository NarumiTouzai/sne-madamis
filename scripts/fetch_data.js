#!/usr/bin/env node
// SNE-EC(公式アンテナショップ)とマダミス.jpから最新データを取得し、data/madamis.json を再生成する。
// 実行: node scripts/fetch_data.js
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const MDMS_MAP_PATH = path.join(__dirname, "mdms-map.json");
const OUT_PATH = path.join(ROOT, "data", "madamis.json");
const UA = "Mozilla/5.0 (compatible; sne-madamis-bot/1.0)";

async function fetchText(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.text();
}

function playersLabel(mn, mx) {
  return mn === mx ? `${mn}人` : `${mn}〜${mx}人`;
}

// SNE-ECの一覧ページ(ページネーションあり)を全件取得してパースする
async function scrapeSneEc() {
  const raw = []; // { slugBase, slugSuffix, title, releaseDate, price, minPlayers, maxPlayers, officialUrl }
  for (let page = 1; ; page++) {
    const url = page === 1
      ? "https://sne-ec.com/category/item/murdermystery/"
      : `https://sne-ec.com/category/item/murdermystery/page/${page}/`;
    let html;
    try {
      html = await fetchText(url);
    } catch (e) {
      break; // ページが存在しない(404)など -> 終了
    }
    const articles = html.split(/<article id="post-/).slice(1);
    if (articles.length === 0) break;

    for (const fullChunk of articles) {
      // 最後の記事はページ末尾までの全HTML(フッター等)を巻き込んでしまうため、
      // 自身の</article>で確実に切り詰めてから解析する。
      const chunk = fullChunk.split("</article>")[0];
      const classMatch = chunk.match(/^[^>]*class="([^"]*)"/);
      const classAttr = classMatch ? classMatch[1] : "";
      const players = [...classAttr.matchAll(/category-murder-(\d+)/g)].map(m => Number(m[1]));
      if (players.length === 0) continue; // マーダーミステリー以外(卓上探偵団など)は対象外

      const nameMatch = chunk.match(/<div class="itemname"><a href="([^"]+)"\s*rel="bookmark">([^<]+)<\/a><\/div>/);
      if (!nameMatch) continue;
      const officialUrl = nameMatch[1];
      const title = nameMatch[2].trim();

      const priceMatch = chunk.match(/<div class="itemprice">¥([\d,]+)/);
      if (!priceMatch) continue;
      const price = Number(priceMatch[1].replace(/,/g, ""));

      const urlMatch = officialUrl.match(/\/(\d{4})\/(\d{2})\/(\d{2})\/([a-z0-9]+)-(\d+)\//);
      if (!urlMatch) continue;
      const [, y, mo, d, slugBase, slugSuffix] = urlMatch;

      raw.push({
        slugBase: slugBase.toUpperCase(),
        slugSuffix,
        title,
        releaseDate: `${y}-${mo}-${d}`,
        price,
        minPlayers: Math.min(...players),
        maxPlayers: Math.max(...players),
        officialUrl,
      });
    }

    if (!html.includes(`page/${page + 1}/`) && !html.includes(`>${page + 1}<`)) break;
  }

  // 同じ base番号(例: M068)が複数回登場する場合だけ枝番を残す(M068-01など)。
  // 単発のものは枝番を落として"M077"のような表記にする(サイト側の表示・既存データに合わせる)。
  const baseCounts = {};
  for (const item of raw) baseCounts[item.slugBase] = (baseCounts[item.slugBase] || 0) + 1;

  const seen = new Set();
  const items = [];
  for (const r of raw) {
    const code = baseCounts[r.slugBase] > 1 ? `${r.slugBase}-${r.slugSuffix}` : r.slugBase;
    if (seen.has(code)) continue; // 重複ページ(タグ経由の再掲など)は無視
    seen.add(code);
    items.push({
      code,
      title: r.title,
      releaseDate: r.releaseDate,
      price: r.price,
      minPlayers: r.minPlayers,
      maxPlayers: r.maxPlayers,
      playersLabel: playersLabel(r.minPlayers, r.maxPlayers),
      officialUrl: r.officialUrl,
      amazonUrl: `https://www.amazon.co.jp/s?k=${encodeURIComponent(r.title)}`,
    });
  }
  return items;
}

// マダミス.jpのシナリオページから評価点・評価件数を取得する
async function fetchMdmsRating(scenarioId) {
  const html = await fetchText(`https://mdms.jp/scenarios/${scenarioId}`);
  const ratingMatch = html.match(/"rating\\?":([\d.]+)/);
  const countMatch = html.match(/"ratingCount\\?":(\d+)/);
  if (!ratingMatch || !countMatch) return null;
  return { score: Math.round(Number(ratingMatch[1]) * 10) / 10, count: Number(countMatch[1]) };
}

function loadPrevious() {
  try {
    const prev = JSON.parse(fs.readFileSync(OUT_PATH, "utf-8"));
    const byCode = {};
    for (const it of prev.items || []) byCode[it.code] = it;
    return byCode;
  } catch (e) {
    return {};
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const previous = loadPrevious();
  const previousCount = Object.keys(previous).length;

  console.log("Fetching SNE-EC catalog...");
  const items = await scrapeSneEc();
  console.log(`  -> ${items.length} items`);

  // 一時的なネットワーク障害・サイト構造変化で取得件数が大きく減った場合は、
  // 既存の data/madamis.json を壊さないよう書き込まずに異常終了する。
  const minExpected = Math.max(10, Math.floor(previousCount * 0.8));
  if (previousCount > 0 && items.length < minExpected) {
    throw new Error(
      `取得件数が異常に少ないため中断しました(今回 ${items.length}件 / 前回 ${previousCount}件、最低 ${minExpected}件を期待)。` +
      ` SNE-EC側のHTML構造変更やアクセス制限の可能性があります。data/madamis.jsonは更新していません。`
    );
  }

  const mdmsMap = JSON.parse(fs.readFileSync(MDMS_MAP_PATH, "utf-8"));
  delete mdmsMap._comment;

  const unmapped = [];
  const mdmsFailures = [];
  for (const item of items) {
    const scenarioId = mdmsMap[item.code];
    const prevItem = previous[item.code];
    if (!scenarioId) {
      item.mdmsUrl = null;
      item.mdmsScore = null;
      item.mdmsReviewCount = null;
      unmapped.push(`${item.code} ${item.title}`);
      continue;
    }
    item.mdmsUrl = `https://mdms.jp/scenarios/${scenarioId}`;
    try {
      const rating = await fetchMdmsRating(scenarioId);
      if (!rating) throw new Error("評価データがページ内に見つかりませんでした");
      item.mdmsScore = rating.score;
      item.mdmsReviewCount = rating.count;
    } catch (e) {
      // 取得失敗時は前回値を維持する(nullで潰さない)。前回値も無ければnullのまま。
      console.warn(`  warn: mdms fetch failed for ${item.code}: ${e.message}`);
      mdmsFailures.push(`${item.code} ${item.title}`);
      item.mdmsScore = prevItem ? prevItem.mdmsScore : null;
      item.mdmsReviewCount = prevItem ? prevItem.mdmsReviewCount : null;
    }
    await sleep(300); // マダミス.jpへの連続アクセスを避ける
  }

  items.sort((a, b) => (a.releaseDate < b.releaseDate ? 1 : a.releaseDate > b.releaseDate ? -1 : 0));

  const today = new Date().toISOString().slice(0, 10);
  const out = {
    source: "SNE-EC（グループSNE公式アンテナショップ） https://sne-ec.com/category/item/murdermystery/",
    fetchedAt: today,
    note: "価格はSNE-EC表示の税込価格。在庫状況・Amazon等の実売価格は自動取得できなかったため、検索リンクのみ掲載しています。mdmsScore/mdmsReviewCountはマダミス.jp(https://mdms.jp/)掲載の評価点(5点満点)・評価件数です。個別ページが無い/未登録の作品はnullです。★評価と「プレイ済み」チェックはブラウザのローカル保存（自分専用）。",
    items,
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + "\n", "utf-8");
  console.log(`Wrote ${items.length} items to ${path.relative(ROOT, OUT_PATH)}`);

  if (unmapped.length) {
    console.log("\n以下はマダミス.jpのシナリオIDが未登録です。scripts/mdms-map.jsonに手動で追加してください:");
    for (const line of unmapped) console.log(`  - ${line}`);
  }
  if (mdmsFailures.length) {
    console.log("\n以下はマダミス.jpからの評価取得に失敗し、前回値を維持しました:");
    for (const line of mdmsFailures) console.log(`  - ${line}`);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
