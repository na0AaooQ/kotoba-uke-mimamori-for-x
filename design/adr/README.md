# Architecture Decision Records（ADR）

このディレクトリには、ことばうけみまもりの重要なアーキテクチャ判断を残します。各ADRは、何を決めたかだけでなく、その背景、判断理由、検討した代替案、影響、意図的に対象外としたことを将来確認できるようにするための記録です。

## 運用方針

- ADRには連番を付けます。
- 各ADRには `Status` を明記します。
- `Accepted` は、設計判断が採用されたことを意味します。機能が実装済みであることは意味しません。
- 実装状況は `Implementation status` として、ADRの採否とは分けて記録します。
- 未決の事項は `Open Questions` として、Acceptedな判断と明確に区別します。
- AcceptedになったADRは、原則として履歴として残します。方針が変わった場合も、過去のADRを削除・上書きして履歴を消すのではなく、新しいADRなどで変更理由を残します。

## ADR一覧

| ADR | Status | Implementation status | 概要 |
| --- | --- | --- | --- |
| [ADR-0001](0001-distance-terms-architecture.md) | Accepted | Not implemented | 「距離を置きたい言葉」機能のアーキテクチャ |
| [ADR-0002](0002-after-not-now-support.md) | Accepted | Not implemented | 「今は見ない」後のセルフケア・距離の取り方支援 |
