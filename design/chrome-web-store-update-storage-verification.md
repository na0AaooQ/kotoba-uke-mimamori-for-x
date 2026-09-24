# Chrome Web Store通常更新時の `chrome.storage.local` 保存データ保持検証

- Status: Verified
- 検証日: 2026-09-24
- 対象: ことばうけみまもり DEVELOPMENT BUILD
- Version A: 2.0.0
- Version B: 2.0.1
- Chrome Web Store test item ID: `megpmaldmnadmmoikidgbjlcjchdenci`（検証専用のPrivate / Trusted Tester用item。production itemではない）
- 保存領域: `chrome.storage.local`
- 主な検証対象: `distanceTermsSettings`
- 更新方式: Chrome Web Storeからの自然な通常更新

本書は、Chrome Web Store実環境で実施した検証の記録である。
設計判断の正本はADR、具体的な実装契約の正本はImplementation Designとし、本書はそれらを変更しない。

## 1. 目的

v2.0.0では、利用者が登録する「距離を置きたい言葉」を、独立したtop-level keyである`distanceTermsSettings`として`chrome.storage.local`へ保存する。

Chrome Web Storeの通常更新時に、既存設定およびこの保存データが保持されるかを確認する必要があった。
また、通常更新によるデータ消失への対策としてexport/import機能を必須と判断すべきかを検討するための基礎情報とすることも目的とした。
これはexport/importの一般的な価値や、通常更新以外の目的での必要性を否定するものではない。

## 2. 結論

同一Chrome Web Store item、同一extension ID、同一Chrome Profileを維持し、Version 2.0.0からVersion 2.0.1へのChrome Web Store通常更新を実施した。
Chromeによる自然な更新後も、`chrome.storage.local`に保存されていた既存設定および`distanceTermsSettings`の登録内容が保持され、更新後のコードから正常に利用できることを確認した。

今回の検証範囲では、Chrome Web Storeの通常バージョン更新への対策としてexport/import機能を必須とする根拠は確認されなかった。
ただし、これはexport/importが不要であること、またはどのような条件でもデータが消えないことを示すものではない。

## 3. 「通常更新」の定義

本書における「通常更新」とは、すでにインストール済みの同一extension IDの拡張機能について、同じChrome Web Store itemで新しいversionが公開され、Chromeが自然に新しいversionへ更新した状態をいう。

今回、次の操作は行っていない。

- アンインストール
- 再インストール
- 別Store itemへの切替
- 別extension IDへの切替
- unpacked extensionへの差替え
- 最終検証時の`chrome://extensions`での手動「更新」操作

専用Profileには変更を加えず、時間経過後にChromeが行った自然更新を確認した。

## 4. Chrome公式仕様の確認

本節はChrome公式文書から確認できる事項を整理したものであり、次節以降の実機検証結果とは区別する。

- [Storage API](https://developer.chrome.com/docs/extensions/reference/api/storage)では、`storage.local`のデータはローカルに保存され、拡張機能がremovedされたときにclearされると説明されている。
  また、`storage.session`は、拡張機能のdisable、reload、update、およびブラウザ再起動時にclearされると明記されている。
- [Runtime API](https://developer.chrome.com/docs/extensions/reference/api/runtime)では、`onInstalled`のreasonとして`install`と`update`が区別されている。
  初回installとextension updateは、ライフサイクル上で別のreasonとして扱われる。
- [Chrome Web Store API](https://developer.chrome.com/docs/webstore/using-api)では、既存Store itemを更新する場合に新しいpackageを既存itemへuploadすること、manifestの`version`を増加させなければuploadが失敗すること、新しいversionがreview対象となることを確認した。

これらの公式文書は、`storage.local`があらゆる通常更新で必ず保持されることを直接保証するものとしては扱わない。
本検証では、通常のextension updateが`storage.local`の削除条件として示されていないことを公式仕様上で確認したうえで、実際のChrome Web Store通常更新でもデータが保持されることを実機で確認した。

## 5. 検証環境

| 項目 | 内容 |
| --- | --- |
| Chrome Profile | `Kotoba-Store-Update-Test` |
| Chrome Web Store test item | `megpmaldmnadmmoikidgbjlcjchdenci`（検証専用item） |
| Version A | 2.0.0 |
| Version B | 2.0.1 |

Version Bは、Version AからStore packageとして意味のある内容について`manifest.json`のversionを`2.0.0`から`2.0.1`へ変更しただけの検証packageである。
A/B Store ZIPを別々に展開して比較し、内容差分が`manifest.json`のversionのみであることを確認済みである。
これにより、機能変更を混ぜず、Chrome Web Store通常更新という条件そのものを検証した。

## 6. 検証パッケージ

| package | ファイル名 | SHA-256 |
| --- | --- | --- |
| Version A | `kotoba-uke-mimamori-for-x-v2.0.0.zip` | `a6aca547f636458960989b7f14f1ee8342931f534dfed94197f98883f3be0263` |
| Version B | `kotoba-uke-mimamori-for-x-v2.0.1.zip` | `a8eccb37316fd2d91adc4dc2362fb1c867738d0b0e37bf4e8fbfa424b04aeb25` |

A/B ZIPを展開後に比較した内容差分は、`manifest.json`のversion `2.0.0`から`2.0.1`への変更のみであった。
ローカルtest directoryおよびZIP packageはGit管理対象へ追加しない。

## 7. 更新前の保存データ

Version Aでは、次の既存設定を保存していた。

- `enabled = true`
- `cushionSensitivity = "high"`
- `uiLanguage = "en"`
- `distanceTermsSettings.schemaVersion = 1`
- `distanceTermsSettings.masterEnabled = true`

`distanceTermsSettings`には、登録順に次の4件を保存していた。

| 登録順 | term | enabled |
| ---: | --- | --- |
| 1 | `テスト文字列` | ON |
| 2 | `#サンプル` | OFF |
| 3 | `test phrase` | ON |
| 4 | `🌿テスト` | ON |

各itemにはUUID形式の`id`が存在していた。
更新前後で各itemの`id`が同一であることを目視で確認した。
raw storage JSON全文およびスクリーンショットは、本リポジトリには追加しない。

## 8. 検証手順

1. Version AをPrivate / Trusted TesterのChrome Web Store test itemから専用Profileへインストールした。
2. 既存設定および4件のdistance termを登録した。
3. OptionsのDevToolsで`await chrome.storage.local.get(null)`を実行し、更新前状態を確認した。
4. 同一Chrome Web Store itemへVersion Bをuploadして審査申請した。
5. Version Bの審査通過後、tester向けに公開した。
6. 専用Profileには変更を加えず、Chromeによる自然更新を待機した。
7. Version `2.0.1`への自然更新を確認した。
8. extension IDが同一であることを確認した。
9. Options UIを確認した。
10. `chrome.storage.local`の更新後状態を確認した。
11. 更新前後の保存内容を目視比較した。
12. X実画面でdistance termによるワンクッション動作を確認した。

アンインストール、再インストール、登録し直しは行っていない。

## 9. 検証結果

次の結果を確認した。

- Version `2.0.0`から`2.0.1`への自然更新に成功した。
- extension IDは`megpmaldmnadmmoikidgbjlcjchdenci`のままであった。
- `enabled`、`cushionSensitivity`、`uiLanguage`が保持された。
- `distanceTermsSettings.schemaVersion`および`distanceTermsSettings.masterEnabled`が保持された。
- item数4件、item配列の登録順、各term、各itemのUUID / `id`、各itemのenabled状態が保持された。
- `#サンプル`はOFFのまま保持された。
- 不要な再登録および再設定は不要だった。

保存内容は、更新前後の状態を目視比較して確認した。
機械的diffによる完全一致の確認は行っていない。

## 10. X実画面での確認

Storageにデータが残っているだけでなく、Version Bが保存済みデータを読み取り、正常に利用できることを確認した。

- ONになっている登録語を含む投稿では、distance term由来のワンクッションが正常に表示された。
- OFFの`#サンプル`はOFF状態のまま保持された。
- OFF項目が更新によって勝手にONになることはなかった。
- 「今は見ない」後の案内も正常に動作した。

## 11. PASS判定

本検証はPASSと判定する。
同一Store item・同一extension ID・同一Chrome ProfileにおけるChrome Web Storeの自然な通常更新で、`chrome.storage.local`の既存設定と`distanceTermsSettings`が保持され、更新後も正常に利用できたためである。

## 12. この検証から判断できないこと

次の事項は本検証の範囲外である。

- extensionのアンインストール後の再インストール
- Chrome Profileの削除、Profile間の移行、別PCへの移行
- 異なるextension IDへの移行
- ユーザーまたは実装による明示的な`chrome.storage.local.clear()`および`chrome.storage.local.remove()`
- Storage自体の破損・消失
- 将来のschema migration
- 将来の実装不具合によるoverwrite
- その他、今回と異なる保存・移行条件

Chrome公式Storage APIでは、`storage.local`は拡張機能がremovedされた場合にclearされると説明されている。
したがって、アンインストールは今回確認した「通常更新」と明確に異なる境界であり、通常更新で保持されたことからアンインストール後の保持を推測することはできない。

## 13. 今後の運用方針

通常のChrome Web Storeバージョン更新については、本検証結果を今後の運用上の基礎情報として扱う。

ただし、将来Storage schemaを変更するversionでは、Chromeが既存Storageデータを保持することと、新しいコードが旧schemaを正しく解釈・移行できることは別の問題である。
その場合はschema migrationおよびbackward compatibilityについて、別途設計とテストを行う。

export/import機能は、通常のChrome Web Store更新によるデータ消失対策として必須とは判断しない。
一方、PC移行、Chrome Profile移行、アンインストール前のバックアップ、その他の利用者自身によるデータ移行といった通常更新とは別の目的については、将来の別工程で必要性を検討する。

## 14. 関連文書

- [「距離を置きたい言葉」実装設計](distance-terms-implementation-design.md)
- [ADR-0001 「距離を置きたい言葉」機能のアーキテクチャ](adr/0001-distance-terms-architecture.md)
