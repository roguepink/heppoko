# 部品どうしの約束(interfaces)— 実装者全員が守る

読み込み順: data.js → audio.js → engine.js → map.js → battle.js → doll.js → town.js → menu.js → battle-ui.js → photo.js → main.js
ES modules なし。各ファイルは グローバル変数/関数を定義する(`'use strict';` で始めてよい)。

## engine.js が用意しているもの(使う側)
- `W=390, H=780`、`PAL`(色)、`ctx`(メイン canvas。毎フレーム `baseTransform()` 済み。論理座標 390×780 で描く)
- `ui`(= `#ui` DOM。390×780 の層。ここに DOM を足す。`el(tag, cls, html)`, `btn(label, cls, fn)`, `show(node)`, `hide(node)`)
- `ATL.draw(emoji, x, y, size, alpha?)`(〜100px の絵文字)、`BIG.draw(emoji, x, y, size, alpha?)`(100〜260px)。中心座標。
- `txt(s, x, y, size, color, align, weight, stroke)`(縁取り文字。stroke=null で縁なし)、`rrect(x,y,w,h,r,fill,stroke,lw)`
- `clamp, lerp, rnd(a,b), pick(arr), esc(s)`、`fmtG(n)`(お金)、`fmtBig(n)`(大魔王 HP)
- `SCENES[name] = { enter(arg, prev), leave(next), update(dt), draw(), tap(x,y,ev), tapUp, move, key(k) }`、`G.scene`、`G.t`(秒)
- `go(name,arg)`, `pushScene(name,arg)`, `popScene(arg)`
- `AUDIO.unlock()/bgm(name)/sfx(name)/setMute/isMuted`。曲: town shop battle pinch victory sad photo。効果音: tap ok cancel step door coin buy equip join talk hit bighit hurt heal magic weird miss warn guard fanfare shutter lose laugh
- `SETTINGS` {font:'normal'|'big', dpad:bool, speed:1|2|3, textSpeed}、`saveSettings()`
- `saveGame(slot?)`, `loadSave()`, `clearSave()`(中身は `G.save()` が返す。main.js が定義)

## main.js が用意するもの(ゲームの状態)
- `ITEMS[id]`, `COMPS[id]`, `NPCS[id]`(DATA から id → 物 の辞書)
- `P`(プレイヤー): `{ money, items:[itemId...](持っている・装備中も含む), equip:{rhand:id|null, lhand, head, face, body, cape, waist, feet, ring, charm}, party:[compId...](最大10), flags:{...}, discovered:{'angry:sorry':true}, x, y, dir, wins, losses }`
- `heroStats()` → `{hp,atk,def,spd,luck}`(BATTLE.calcHeroStats(装備中の id 一覧, ITEMS))
- `equippedIds()` → 装備中の id の配列
- `partyComps()` → 仲間の COMPANIONS オブジェクト配列(順番どおり)
- `pay(n)` → 払えたら true(お金を減らし HUD 更新)、`gain(n)`
- `toast(text, ms)`(短いお知らせ)、`confirm(msg, okLabel, cancelLabel, cb)`(確認窓。cb(true/false))
- `HUD.update()`、`HUD.show()/hide()`
- 会話: `say(who, lines, cb)`(who = {name, emoji} か null。lines = 文字列の配列。全部読んだら cb)、`ask(who, text, choices:[{label, cls?, fn}])`
- 場面名: title opening town shop equip party items home castle church inn aunt showoff confirmBoss battle win photo lose ending

## doll.js(着せ替え人形)が用意するもの
- `DOLL.draw(cx, cy, scale, opts)`: 今の `P.equip` の装備つきで へっぽこを描く(ctx に)。cx,cy は人形の中心(設計 7-2 の (195,345) が中心。全身 400px = scale 1)。
  `opts = { equip?(省略時 P.equip), pose?('normal'|'hero'|'peace'|'smug'|'jump'|'money'|'sleep'), face?(顔の絵文字), t?(時間。呼吸), highlight?(slot 名。光らせる), flip? }`
- `SCENES.showoff`: `pushScene('showoff', { itemId, before:{atk,def,hp}, after:{atk,def,hp} })` で お披露目。1.6 秒の演出のあと タップで `popScene()`。
- `DOLL.renderPhoto(canvas, opts)`: `opts = { bg:0|1|2, pose, comps:[{emoji,name,count}], date:'2026.10.29', record:'12ターン / コンボ4回 / とどめ: 隣の家のおばさん', w:1080, h:1350 }` に描く(保存用)。
- `DOLL.drawPhotoFrame(x, y, w, h, opts)`: 画面の写真枠(360×450)に同じ絵を描く(photo.js が毎フレーム呼ぶ)。

## battle-ui.js が用意するもの
- `SCENES.battle`: `go('battle')` で開始。`BATTLE.newState(heroStats(), equippedIds(), partyComps(), DATA.BOSS)` を作り、DOM(#battle)を `ui` に作る。
  1 ターンごとに `BATTLE.runTurn(state, cmd, ITEMS, DATA.BOSS, rng)` を呼び、events を順に演出。
  終わったら `P.discovered` に state.discovered を合流し、`G.lastBattle = { turns, combos, finisher(名前), won }` を入れて `go('win')` か `go('lose')`。
  ボスのセリフ: `DATA.BOSS.lines`(intro, phase2, phase3, phase4, lose, win)と `DATA.BOSS.moves`(kind: attack/all/big/heal/taunt/cry/brag/sleep。text を演出に使う)。
- `localStorage['heppoko.battle']` に毎ターン保存、終わったら消す。

## photo.js が用意するもの
- `SCENES.win`(勝利の文 → タップで photo へ)、`SCENES.photo`(記念写真。背景3・ポーズ6・保存・ならび替え・おしまい → `go('ending')`)。
