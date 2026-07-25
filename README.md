# MyChat

本程式為原創作品，僅有下拉式選單修改自[W3Schools的範例](https://www.w3schools.com/howto/howto_custom_select.asp)。

## 實作細節

### 第一步：設定環境

先前往 `Deno` [官網](https://deno.land)查看安裝指令，並在查好後根據對應的系統將指令輸入於終端機內。  
輸入完畢後，先等待安裝完成，然後再重啟 `IDE` ，便可開始使用。

### 第二步：撰寫程式

閱讀老師所寫的[網站設計進階](https://gitlab.com/cccnqu111/ws)課程，並複習之前學過的[網頁設計](https://gitlab.com/ccc110/wp)課，來結合前後端的技術。  
結合完畢後，把後端程式碼放到 `index.ts` 底下，並把前端程式碼獨立到 `public` 資料夾之下。

### 第三步：設定資料庫

先到 `MongoDB Atlas` 取得連線字串，然後在專案根目錄建立 `.env` 檔，並把字串填入 `URI` 變數。  
填寫完畢後，先確認格式如下，然後再確認密碼中的特殊字元是否已做 `URL` 編碼。

```
URI=mongodb+srv://<使用者>:<密碼>@cluster0.vxvhpav.mongodb.net/?appName=Cluster0
```

連線字串的路徑請保持空白，資料庫名稱由程式以 `client.db("chat")` 指定；  
若在路徑加上 `/chat` ，驗證會改用 `chat` 而非 `admin` ，導致登入失敗。

### 第四步：執行程式

在該專案下打開終端機，並輸入 `deno run -A index.ts` 。  
輸入完畢後，先在瀏覽器裡打開先前設定的網站位址，然後再確認執行結果是否正常。

若要改用最小權限，請輸入 `deno task start` 。  
其中的 `--allow-sys=osRelease` 是 `npm:mongodb` 建立 `MongoClient` 時讀取 `os.release()` 所需，舊的驅動程式並不需要。

## 備註

除了基本的程式設計外，該專案還使用了 `Deno Deploy` 及 `MongoDB` 雲端資料庫來進行線上託管。  
資料庫的部分採用官方的 `npm:mongodb@6.21.0` 驅動程式，並啟用 `Stable API v1` （ `strict` 模式）。  
部署到 `Deno Deploy` 時，請改在專案設定的環境變數中填入 `URI` ，並在 `Atlas` 的 `Network Access` 允許 `0.0.0.0/0` ，因為 `Deno Deploy` 沒有固定的對外 `IP` 。

## 授權聲明

[LICENSE](LICENSE)
