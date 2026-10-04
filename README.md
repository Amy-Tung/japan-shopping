# 日本代購小清單

讓朋友填入訂購人姓名與想買的商品，估算台幣金額並複製明細。

## 功能

- 訂購人姓名會一起放入明細；複製前需要填寫姓名。
- 日幣使用商店含稅價格，全部先加總。
- 自動讀取臺灣銀行日圓現金賣出牌價，再無條件進位到小數點第二位。
- 整筆台幣最後取最接近 NT$50，中間值向上。
- 每份清單在開始時取得並保留匯率；「新清單」會重新取得報價。
- 結果只有日幣加總和要給 Amy 的錢；複製文字不包含匯率。
- 文字框即時顯示明細，複製成功提示明顯；不支援剪貼簿時提供手動複製提示。
- 匯入直接追加商品，不取代目前清單、不預覽；舊版本明細也可匯入。
- 若目前姓名為空，匯入時會帶入明細中的姓名；已有姓名則保留。
- 清單只保存於目前瀏覽器的 localStorage，不會上傳訂購人或商品資料。

## 自動匯率與來源

GitHub Pages 是靜態網站，臺灣銀行原站不提供瀏覽器跨站存取。網站使用 RateWise 公開 API 的臺銀同步資料；並不是台銀官方 API，也不保證零延遲。

- 原始來源：[臺灣銀行牌告匯率](https://rate.bot.com.tw/xrt?Lang=zh-TW)
- 資料整理：[匯率好工具 RateWise](https://app.haotool.org/ratewise/)
- API 契約：[公開資料 API](https://app.haotool.org/ratewise/open-data/)

讀取 v3 current → manifest → BOT provider snapshot，驗證兩個 immutable object 的 SHA-256。只採用 `sourceQuote.originalSellField = cash.sell` 的日圓報價，不使用反向匯率或現金買入價。採用整數算式進位，避免浮點數導致 0.21 變成 0.22。

如果同步資料的成功查核時間超過 24 小時，或資料無法校驗，不建立新報價；可重試。已開始的清單保留原有匯率，不會因重新整理而變價。

## 部署

GitHub Pages：Settings → Pages → Source「Deploy from a branch」，選 `main`、`/ (root)`，Save。

程式無套件依賴。請透過 HTTPS 或本機 HTTP 開啟，以確保自動匯率及 Clipboard API 正常運作。
