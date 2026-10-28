/* 勇者へっぽこの小さな冒険 — ゲームの中身データ(data.js)
   ここには「数字と言葉」だけを書く。動かすしくみ(ロジック)は別のファイル。
   文字コード: UTF-8 / ES modules は使わない / window.DATA に全部入れる */

window.DATA = {

  /* =========================================================
     ITEMS: 武器・防具・アクセ(へっぽこ専用)
     slot: rhand lhand head face body cape waist feet ring charm
     attack.type: phys(ぶつり) / magic(まほう) / heal(かいふく) / weird(へんなわざ)
     ========================================================= */
  ITEMS: [

    /* ---------- 右手(rhand) ---------- */
    { id:'wooden_stick', name:'ひのきの棒', slot:'rhand', price:30, atk:1, def:0, extra:{hp:0,spd:0,luck:0,heal:0},
      desc:'ゆうしゃの はじまりは いつも これ。においが いい。',
      look:{emoji:'🪵', color:'#a0703a', pos:'rhand'},
      attack:{name:'ぼうでたたく', power:1.0, type:'phys', text:'へっぽこは ひのきの棒で ぺちっと たたいた!'} },

    { id:'oden_skewer', name:'おでんの串', slot:'rhand', price:130, atk:3, def:0, extra:{hp:0,spd:1,luck:0,heal:0},
      desc:'ちくわ・たまご・だいこん つき。先が とがってる。',
      look:{emoji:'🍢', color:'#c48a3f', pos:'rhand'},
      attack:{name:'串でつく', power:1.1, type:'phys', text:'へっぽこは おでんの串で ちくちく ついた! つゆが とんだ。'} },

    { id:'leek', name:'長ネギ', slot:'rhand', price:290, atk:4, def:0, extra:{hp:0,spd:0,luck:2,heal:0},
      desc:'スーパーの袋から はみ出てたやつ。意外と しなる。',
      look:{emoji:'🥬', color:'#7bb661', pos:'rhand'},
      attack:{name:'ネギでしばく', power:1.2, type:'phys', text:'へっぽこは 長ネギで びしっと しばいた! ネギの においが ひろがる。'} },

    { id:'rubber_duck', name:'ゴムのアヒル', slot:'rhand', price:610, atk:2, def:0, extra:{hp:0,spd:0,luck:8,heal:0},
      desc:'にぎると「ピュー」と鳴く。それだけ。でも なんか うんが いい。',
      look:{emoji:'🦆', color:'#ffd93b', pos:'rhand'},
      attack:{name:'ピューと鳴らす', power:0.8, type:'weird', text:'へっぽこは アヒルを にぎった。ピュー! 敵は なんだか 気が ぬけた。'} },

    { id:'frying_pan', name:'フライパン', slot:'rhand', price:1300, atk:10, def:0, extra:{hp:0,spd:0,luck:0,heal:0},
      desc:'ママの台所から こっそり もってきた。いい音が する。',
      look:{emoji:'🍳', color:'#555555', pos:'rhand'},
      attack:{name:'フライパンでなぐる', power:1.3, type:'phys', text:'へっぽこは フライパンで ガーンと なぐった! いい音。'} },

    { id:'wet_umbrella', name:'ぬれたかさ', slot:'rhand', price:2200, atk:7, def:0, extra:{hp:0,spd:0,luck:0,heal:0},
      desc:'ちょっと びしょびしょ。ひらくと ふせげる。ふると とぶ。',
      look:{emoji:'☂️', color:'#4a7fd4', pos:'rhand'},
      attack:{name:'かさをふる', power:1.0, type:'phys', text:'へっぽこは かさを ぶんぶん ふった! 水しぶきが とんだ。'} },

    { id:'magic_wand', name:'まほうのつえ', slot:'rhand', price:43000, atk:22, def:0, extra:{hp:0,spd:0,luck:3,heal:5},
      desc:'ふると 星が 出る。たまに 出ない。ほんものかは なぞ。',
      look:{emoji:'🪄', color:'#9b59b6', pos:'rhand'},
      attack:{name:'キラキラまほう', power:1.4, type:'magic', text:'へっぽこは つえを ふった。キラキラ〜! 星が ふりそそぐ。'} },

    { id:'steel_sword', name:'はがねの剣', slot:'rhand', price:14000, atk:26, def:0, extra:{hp:0,spd:0,luck:0,heal:0},
      desc:'ちゃんとした剣。ちゃんと してるのが めずらしい店。',
      look:{emoji:'🗡️', color:'#b0b7c3', pos:'rhand'},
      attack:{name:'剣できる', power:1.5, type:'phys', text:'へっぽこは はがねの剣で ズバッと きった!'} },

    { id:'smartphone', name:'スマホ', slot:'rhand', price:77000, atk:9, def:0, extra:{hp:0,spd:6,luck:5,heal:10},
      desc:'さいしんがた。でんちは 23%。かどで なぐると つよい。',
      look:{emoji:'📱', color:'#222222', pos:'rhand'},
      attack:{name:'かどでなぐる', power:1.2, type:'weird', text:'へっぽこは スマホの かどで なぐった! フィルムが はがれた…。'} },

    { id:'bundle_of_bills', name:'札束', slot:'rhand', price:420000, atk:59, def:0, extra:{hp:0,spd:0,luck:12,heal:0},
      desc:'お金は ちからだ。たたくと いい音。たたいた ぶんは へらない。',
      look:{emoji:'💴', color:'#7cb86a', pos:'rhand'},
      attack:{name:'札束でたたく', power:1.7, type:'weird', text:'へっぽこは 札束で バシッと たたいた! 敵の 目が ¥マークに なった。'} },

    { id:'legend_sword', name:'伝説の剣', slot:'rhand', price:900000, atk:110, def:0, extra:{hp:0,spd:0,luck:5,heal:0},
      desc:'伝説の剣。ねふだが ついてるのが ちょっと しょっく。',
      look:{emoji:'⚔️', color:'#f1c40f', pos:'rhand'},
      attack:{name:'伝説のいちげき', power:2.0, type:'phys', text:'へっぽこは 伝説の剣を ふりおろした! 空が 光った!'} },

    /* ---------- 左手(lhand) ---------- */
    { id:'cardboard_shield', name:'段ボールの盾', slot:'lhand', price:220, atk:0, def:1, extra:{hp:0,spd:0,luck:0,heal:0},
      desc:'みかんの箱。「天地無用」と かいてある。',
      look:{emoji:'📦', color:'#c9a066', pos:'lhand'},
      attack:{name:'箱でおしつぶす', power:0.6, type:'phys', text:'へっぽこは 段ボールで ぼふっと おした。敵は くすぐったそう。'} },

    { id:'homework', name:'宿題', slot:'lhand', price:30, atk:1, def:1, extra:{hp:0,spd:0,luck:-3,heal:0},
      desc:'ぜんぶ 白い。見ると 気分が おもくなる。敵も おもくなる。',
      look:{emoji:'📝', color:'#ffffff', pos:'lhand'},
      attack:{name:'宿題を見せる', power:0.9, type:'weird', text:'へっぽこは 宿題を つきつけた! 敵は「やりたくない…」と つぶやいた。'} },

    { id:'pot_lid', name:'なべのふた', slot:'lhand', price:660, atk:15, def:3, extra:{hp:0,spd:0,luck:0,heal:0},
      desc:'ゆうしゃ の 盾の はじまり。あつい うちは さわらないで。',
      look:{emoji:'🍲', color:'#8d8d8d', pos:'lhand'},
      attack:{name:'ふたでガンガン', power:0.8, type:'phys', text:'へっぽこは なべのふたを ガンガン ならした! うるさい。'} },

    { id:'pizza_box', name:'ピザの箱', slot:'lhand', price:1200, atk:10, def:2, extra:{hp:0,spd:0,luck:1,heal:3},
      desc:'ひときれ のこってる。においで 元気が 出る。',
      look:{emoji:'🍕', color:'#e07b39', pos:'lhand'},
      attack:{name:'ピザをなげる', power:0.9, type:'phys', text:'へっぽこは ピザの箱を フリスビーみたいに なげた! チーズが のびた。'} },

    { id:'wooden_shield', name:'木の盾', slot:'lhand', price:2400, atk:0, def:5, extra:{hp:0,spd:0,luck:0,heal:0},
      desc:'ふつうの 木の盾。ここでは ふつうが いちばん めずらしい。',
      look:{emoji:'🛡️', color:'#a0703a', pos:'lhand'} },

    { id:'plushie', name:'ぬいぐるみ', slot:'lhand', price:3400, atk:20, def:2, extra:{hp:0,spd:0,luck:5,heal:5},
      desc:'ずっと いっしょに ねてた くま。だきしめると おちつく。',
      look:{emoji:'🧸', color:'#c98a4b', pos:'lhand'},
      attack:{name:'くまパンチ', power:0.7, type:'weird', text:'へっぽこは ぬいぐるみで ぽふっと たたいた。敵は「かわいい」と 思って しまった。'} },

    { id:'mama_bento', name:'ママの愛妻弁当', slot:'lhand', price:5100, atk:0, def:2, extra:{hp:10,spd:0,luck:0,heal:30},
      desc:'たこさんウインナー入り。食べると 元気が もどる。愛の味。',
      look:{emoji:'🍱', color:'#e74c3c', pos:'lhand'},
      attack:{name:'おべんとうを食べる', power:1.5, type:'heal', text:'へっぽこは おべんとうを ぱくっ。愛の味で 元気が わいた!'} },

    { id:'randoseru', name:'ランドセル', slot:'lhand', price:76000, atk:25, def:25, extra:{hp:0,spd:-2,luck:0,heal:0},
      desc:'6年間 たえる じょうぶさ。中に 教科書 ぜんぶ 入ってる。おもい。',
      look:{emoji:'🎒', color:'#c0392b', pos:'lhand'},
      attack:{name:'ランドセルでなぐる', power:1.4, type:'phys', text:'へっぽこは ランドセルを ぶんまわした! 教科書が ばらばら とんだ。'} },

    { id:'manhole', name:'マンホールのふた', slot:'lhand', price:110000, atk:40, def:45, extra:{hp:0,spd:-8,luck:0,heal:0},
      desc:'どこから もってきたの? すごく おもい。すごく かたい。',
      look:{emoji:'⚫', color:'#444444', pos:'lhand'},
      attack:{name:'ふたでおしつぶす', power:1.6, type:'phys', text:'へっぽこは マンホールのふたを ごろごろ ころがして ぶつけた!'} },

    { id:'hero_shield', name:'勇者の盾', slot:'lhand', price:600000, atk:50, def:50, extra:{hp:10,spd:0,luck:5,heal:0},
      desc:'光る 伝説の盾。「ゆうしゃ」と ひらがなで 書いてある。',
      look:{emoji:'🔰', color:'#f1c40f', pos:'lhand'},
      attack:{name:'盾でどーん', power:1.3, type:'phys', text:'へっぽこは 勇者の盾で どーんと おした! まぶしい。'} },

    /* ---------- 頭(head) ---------- */
    { id:'party_hat', name:'とんがり帽子', slot:'head', price:850, atk:0, def:1, extra:{hp:0,spd:0,luck:5,heal:0},
      desc:'たんじょう日の かみの ぼうし。ゴムが ちょっと いたい。',
      look:{emoji:'🥳', color:'#ff6fae', pos:'head'},
      attack:{name:'とんがりつつき', power:0.7, type:'phys', text:'へっぽこは 頭を さげて とんがりで つついた。ちくっ。'} },

    { id:'leather_cap', name:'皮のぼうし', slot:'head', price:1300, atk:0, def:4, extra:{hp:0,spd:0,luck:0,heal:0},
      desc:'ゆうしゃの さいしょの ぼうし。ちょっと くさい。',
      look:{emoji:'🧢', color:'#8e5a2b', pos:'head'} },

    { id:'bucket', name:'バケツ', slot:'head', price:1500, atk:1, def:9, extra:{hp:70,spd:0,luck:0,heal:0},
      desc:'かぶると 前が 見えない。でも かたい。音が ひびく。',
      look:{emoji:'🪣', color:'#3498db', pos:'head'},
      attack:{name:'バケツ頭つき', power:1.1, type:'phys', text:'へっぽこは バケツを かぶったまま 頭つきした! ゴーン…。'} },

    { id:'rice_bowl', name:'どんぶり', slot:'head', price:2700, atk:1, def:7, extra:{hp:30,spd:0,luck:0,heal:3},
      desc:'ラーメン屋の どんぶり。かぶると スープの においが する。',
      look:{emoji:'🍜', color:'#f5f5f5', pos:'head'},
      attack:{name:'どんぶりなげ', power:1.0, type:'phys', text:'へっぽこは どんぶりを なげた! ガシャーン。…すみません。'} },

    { id:'octopus_hat', name:'タコ', slot:'head', price:3200, atk:2, def:5, extra:{hp:50,spd:2,luck:3,heal:0},
      desc:'生きてる。頭に のってる。たまに すみを はく。',
      look:{emoji:'🐙', color:'#e74c3c', pos:'head'},
      attack:{name:'タコがすみをはく', power:1.2, type:'weird', text:'タコが すみを はいた! 敵は 前が 見えない。'} },

    { id:'pudding_hat', name:'プリンのぼうし', slot:'head', price:4900, atk:0, def:3, extra:{hp:10,spd:0,luck:0,heal:10},
      desc:'ぷるぷる ゆれる。歩くと カラメルが たれる。',
      look:{emoji:'🍮', color:'#f4c430', pos:'head'},
      attack:{name:'プリンをたべる', power:0.8, type:'heal', text:'へっぽこは 頭の プリンを ひとくち。ぷるん。元気が でた!'} },

    { id:'neko_ears', name:'ネコ耳', slot:'head', price:12000, atk:1, def:4, extra:{hp:20,spd:6,luck:6,heal:0},
      desc:'つけると ぴょこぴょこ うごく。かわいさは せいぎ。',
      look:{emoji:'🐱', color:'#ff9ecd', pos:'head'},
      attack:{name:'ネコパンチ', power:1.0, type:'weird', text:'へっぽこは「にゃー」と ネコパンチ! 敵は ちょっと にやけた。'} },

    { id:'bike_helmet', name:'ヘルメット', slot:'head', price:13000, atk:0, def:23, extra:{hp:100,spd:0,luck:0,heal:0},
      desc:'じてんしゃ用。あんぜん だいいち。あごひもが きつい。',
      look:{emoji:'⛑️', color:'#f39c12', pos:'head'},
      attack:{name:'ヘルメット頭つき', power:1.1, type:'phys', text:'へっぽこは ヘルメットで ガツン! あんぜんに 頭つき。'} },

    { id:'steel_helm', name:'はがねのかぶと', slot:'head', price:51000, atk:0, def:35, extra:{hp:130,spd:-1,luck:0,heal:0},
      desc:'ちゃんとした かぶと。おもいけど 安心。耳が ふさがる。',
      look:{emoji:'🪖', color:'#95a5a6', pos:'head'} },

    { id:'fake_crown', name:'王冠(にせもの)', slot:'head', price:130000, atk:1, def:18, extra:{hp:80,spd:0,luck:12,heal:0},
      desc:'王さまが 落とした? いいえ、おもちゃ屋で 買った。でも うんが いい。',
      look:{emoji:'👑', color:'#f1c40f', pos:'head'},
      attack:{name:'王さまのめいれい', power:1.2, type:'weird', text:'へっぽこは「ひかえおろう」と いった! 敵は 一しゅん ひかえた。'} },

    { id:'alien_antenna', name:'宇宙人のアンテナ', slot:'head', price:500000, atk:10, def:35, extra:{hp:150,spd:6,luck:7,heal:0},
      desc:'ぴこぴこ 光る。どこかと つうしん してる。だれと?',
      look:{emoji:'👽', color:'#2ecc71', pos:'head'},
      attack:{name:'うちゅうでんぱ', power:1.6, type:'magic', text:'へっぽこの アンテナが ぴこぴこ。うちゅうから ビームが ふってきた!'} },

    /* ---------- 顔(face) ---------- */
    { id:'red_nose', name:'赤いはな', slot:'face', price:9500, atk:0, def:1, extra:{hp:0,spd:0,luck:8,heal:0},
      desc:'ピエロの はな。つけると みんな わらう。敵も わらう。',
      look:{emoji:'🔴', color:'#e74c3c', pos:'face'},
      attack:{name:'はなをおす', power:0.6, type:'weird', text:'へっぽこは 赤いはなを おした。プー! 敵は ふきだした。'} },

    { id:'glasses_3d', name:'3Dメガネ', slot:'face', price:11000, atk:1, def:1, extra:{hp:0,spd:0,luck:0,heal:0},
      desc:'赤と青。せかいが とびだして 見える。見えすぎる。',
      look:{emoji:'🕶️', color:'#3b5bdb', pos:'face'},
      attack:{name:'とびだしパンチ', power:0.9, type:'weird', text:'へっぽこは とびだして 見える パンチを した! 敵は よけた つもり。'} },

    { id:'mosquito_net', name:'虫よけネット', slot:'face', price:14000, atk:0, def:4, extra:{hp:0,spd:0,luck:4,heal:0},
      desc:'顔じゅう あみあみ。虫は こない。友だちも こない。',
      look:{emoji:'🕸️', color:'#95a5a6', pos:'face'} },

    { id:'fake_glasses', name:'ひげメガネ', slot:'face', price:17000, atk:1, def:2, extra:{hp:0,spd:0,luck:1,heal:0},
      desc:'メガネに はなと ひげが ついてる。へんそう かんぺき。',
      look:{emoji:'🥸', color:'#6b4f2a', pos:'face'},
      attack:{name:'へんそうアタック', power:0.9, type:'weird', text:'へっぽこは「だれだか わかるかな?」と いった! 敵は こんらんした。'} },

    { id:'face_pack', name:'パック', slot:'face', price:29000, atk:0, def:3, extra:{hp:0,spd:0,luck:3,heal:15},
      desc:'うるおう。10分 うごけない。戦いの あいだに するもの?',
      look:{emoji:'🧖', color:'#dff3f9', pos:'face'},
      attack:{name:'うるおう', power:1.2, type:'heal', text:'へっぽこは パックで うるおった。おはだ ぷるぷる。元気も もどった!'} },

    { id:'snorkel', name:'シュノーケル', slot:'face', price:51000, atk:2, def:3, extra:{hp:0,spd:3,luck:6,heal:0},
      desc:'水の中で 息が できる。りくの上では じゃま。',
      look:{emoji:'🤿', color:'#1abc9c', pos:'face'},
      attack:{name:'水をふきかける', power:1.0, type:'phys', text:'へっぽこは シュノーケルから 水を ぷーっと ふきかけた!'} },

    { id:'eye_patch', name:'海賊の眼帯', slot:'face', price:81000, atk:5, def:2, extra:{hp:0,spd:0,luck:8,heal:0},
      desc:'かたほうの 目が 見えない。でも かっこいい。',
      look:{emoji:'🏴‍☠️', color:'#222222', pos:'face'},
      attack:{name:'海賊のにらみ', power:1.1, type:'weird', text:'へっぽこは かいぞくみたいに にらんだ! 敵は たからものを かくした。'} },

    { id:'sunglasses', name:'サングラス', slot:'face', price:160000, atk:5, def:5, extra:{hp:0,spd:5,luck:10,heal:0},
      desc:'かける だけで つよそうに 見える。中身は かわらない。',
      look:{emoji:'😎', color:'#111111', pos:'face'},
      attack:{name:'キメがお', power:1.0, type:'weird', text:'へっぽこは サングラスを くいっと あげた。きまった! 敵は まぶしい。'} },

    { id:'hero_mask', name:'勇者のマスク', slot:'face', price:220000, atk:7, def:10, extra:{hp:0,spd:2,luck:12,heal:0},
      desc:'正体を かくす。みんな へっぽこだと 知ってる。',
      look:{emoji:'🎭', color:'#2980b9', pos:'face'},
      attack:{name:'マスクパンチ', power:1.2, type:'phys', text:'へっぽこは「しょうたいは ひみつだ」と いって パンチした!'} },

    { id:'granny_dentures', name:'おばあちゃんの入れ歯', slot:'face', price:400000, atk:25, def:3, extra:{hp:0,spd:0,luck:15,heal:0},
      desc:'かりかり うめぼしも かめる。かみつくと すごく いたい。',
      look:{emoji:'🦷', color:'#fdf2e9', pos:'face'},
      attack:{name:'ガブッとかむ', power:1.6, type:'phys', text:'へっぽこは 入れ歯で ガブッ! おばあちゃんの ちからが こもってる。'} },

    /* ---------- 体(body) ---------- */
    { id:'cloth_armor', name:'ぬののふく', slot:'body', price:440, atk:0, def:2, extra:{hp:0,spd:0,luck:0,heal:0},
      desc:'ゆうしゃの はじまりの ふく。ただの ふく。',
      look:{emoji:'👕', color:'#ecf0f1', pos:'body'} },

    { id:'bubble_wrap', name:'プチプチ', slot:'body', price:2300, atk:2, def:7, extra:{hp:120,spd:0,luck:2,heal:0},
      desc:'体に まく。ぶつかっても へいき。つぶしたくなる。',
      look:{emoji:'🔘', color:'#cfe9f7', pos:'body'},
      attack:{name:'プチプチつぶし', power:0.8, type:'weird', text:'へっぽこは プチプチを つぶした。プチプチプチ。敵も つぶしたく なった!'} },

    { id:'apron', name:'おかあさんのエプロン', slot:'body', price:3400, atk:3, def:3, extra:{hp:30,spd:0,luck:0,heal:8},
      desc:'ポケットに あめが 入ってる。ちょっと 安心する。',
      look:{emoji:'🥼', color:'#f8a5c2', pos:'body'},
      attack:{name:'あめをなげる', power:0.9, type:'phys', text:'へっぽこは ポケットの あめを なげた! 敵は ひろって 食べた。'} },

    { id:'cardboard_robot', name:'段ボールロボ', slot:'body', price:2800, atk:5, def:10, extra:{hp:50,spd:-3,luck:0,heal:0},
      desc:'じぶんで 作った。「ガシャン」と 自分で 言う しくみ。',
      look:{emoji:'🤖', color:'#c9a066', pos:'body'},
      attack:{name:'ロボパンチ', power:1.1, type:'phys', text:'へっぽこは「ガシャン、ガシャン」と 言いながら パンチした!'} },

    { id:'pajamas', name:'パジャマ', slot:'body', price:5000, atk:0, def:4, extra:{hp:10,spd:0,luck:0,heal:10},
      desc:'ふわふわ。これで 冒険に 出たら ママに おこられた。',
      look:{emoji:'🛌', color:'#a29bfe', pos:'body'},
      attack:{name:'ひるね', power:1.0, type:'heal', text:'へっぽこは パジャマなので ひるねした。ぐー…。元気が もどった!'} },

    { id:'school_uniform', name:'体操服', slot:'body', price:7000, atk:6, def:4, extra:{hp:80,spd:6,luck:0,heal:0},
      desc:'名前の ぬいとり つき。はしると すごく はやい 気が する。',
      look:{emoji:'🎽', color:'#ffffff', pos:'body'},
      attack:{name:'ダッシュタックル', power:1.1, type:'phys', text:'へっぽこは 全力で はしって タックルした! 体育の 時間みたい。'} },

    { id:'rice_cooker', name:'炊飯器', slot:'body', price:42000, atk:11, def:25, extra:{hp:160,spd:-5,luck:0,heal:20},
      desc:'だきかかえて 歩く。中で ごはんが たけてる。いいにおい。',
      look:{emoji:'🍚', color:'#f5f5f5', pos:'body'},
      attack:{name:'たきたてごはん', power:1.3, type:'heal', text:'ピーッ。ごはんが たけた! ほかほかの ごはんで 元気に なった。'} },

    { id:'kotatsu', name:'こたつ', slot:'body', price:100000, atk:20, def:40, extra:{hp:250,spd:-8,luck:5,heal:5},
      desc:'入ると 出られない。せおって 歩く。みかん つき。',
      look:{emoji:'🛋️', color:'#c0392b', pos:'body'},
      attack:{name:'こたつでつぶす', power:1.5, type:'phys', text:'へっぽこは こたつを もちあげて どすん! 敵は ぬくぬくで うごけない。'} },

    { id:'fur_coat', name:'毛皮(ふわふわ)のコート', slot:'body', price:290000, atk:6, def:27, extra:{hp:200,spd:0,luck:10,heal:0},
      desc:'ふわふわで あたたかい。お金持ちの 子の においが する。',
      look:{emoji:'🧥', color:'#d9b38c', pos:'body'},
      attack:{name:'ふわふわアタック', power:0.9, type:'weird', text:'へっぽこは コートで ふわっと つつんだ。敵は ねむくなった。'} },

    { id:'mithril_armor', name:'ミスリルの鎧', slot:'body', price:900000, atk:11, def:60, extra:{hp:300,spd:0,luck:0,heal:0},
      desc:'かるくて かたい 伝説の鎧。サイズは ちょっと 大きめ。',
      look:{emoji:'🛡️', color:'#aee1f9', pos:'body'},
      attack:{name:'鎧でタックル', power:1.3, type:'phys', text:'へっぽこは ミスリルの鎧で ドーンと タックルした!'} },

    /* ---------- マント(cape) ---------- */
    { id:'towel', name:'タオル', slot:'cape', price:3900, atk:1, def:1, extra:{hp:0,spd:0,luck:0,heal:5},
      desc:'首に まくと なんでも できる気に なる。あせも ふける。',
      look:{emoji:'🧣', color:'#ffffff', pos:'cape'},
      attack:{name:'タオルでしばく', power:0.9, type:'phys', text:'へっぽこは ぬれタオルで ピシッと しばいた! いたい。'} },

    { id:'ghost_sheet', name:'おばけのシーツ', slot:'cape', price:6800, atk:1, def:2, extra:{hp:10,spd:1,luck:5,heal:0},
      desc:'目の ところに 穴が あいてる。おばけごっこ 用。',
      look:{emoji:'👻', color:'#f8f8f8', pos:'cape'},
      attack:{name:'おばけだぞ〜', power:1.0, type:'weird', text:'へっぽこは「おばけだぞ〜」と おどかした。敵は ちょっと びくっとした。'} },

    { id:'raincoat', name:'レインコート', slot:'cape', price:14000, atk:0, def:4, extra:{hp:20,spd:2,luck:0,heal:0},
      desc:'黄色くて 目立つ。雨の日は さいきょう。はれの日は あつい。',
      look:{emoji:'🧥', color:'#f9d71c', pos:'cape'} },

    { id:'furoshiki_cape', name:'ふろしきマント', slot:'cape', price:16000, atk:1, def:3, extra:{hp:30,spd:5,luck:3,heal:0},
      desc:'ヒーローの マントは だいたい これ。風で ひらひら。',
      look:{emoji:'🦸', color:'#e74c3c', pos:'cape'},
      attack:{name:'ヒーローキック', power:1.2, type:'phys', text:'へっぽこは マントを ひらひらさせて キックした! かっこいい。'} },

    { id:'curtain', name:'カーテン', slot:'cape', price:9300, atk:1, def:10, extra:{hp:50,spd:-2,luck:0,heal:0},
      desc:'リビングの カーテン。レールごと もってきた。ママが さがしてる。',
      look:{emoji:'🪟', color:'#7f8c8d', pos:'cape'},
      attack:{name:'カーテンでつつむ', power:1.0, type:'phys', text:'へっぽこは カーテンで 敵を つつんだ! まっくら。'} },

    { id:'futon', name:'おふとん', slot:'cape', price:28000, atk:5, def:21, extra:{hp:90,spd:-6,luck:0,heal:15},
      desc:'ほかほか。せなかに せおう。ねむくなるのが けってん。',
      look:{emoji:'🛏️', color:'#a3cef1', pos:'cape'},
      attack:{name:'ふとんたたき', power:1.3, type:'phys', text:'へっぽこは おふとんで ばさばさ たたいた! ほこりが 出た。'} },

    { id:'fake_wings', name:'天使の羽(つくりもの)', slot:'cape', price:260000, atk:3, def:9, extra:{hp:70,spd:7,luck:10,heal:10},
      desc:'とべない。でも ちょっと うかんでる 気が する。',
      look:{emoji:'🪶', color:'#ffffff', pos:'cape'},
      attack:{name:'はばたき', power:1.1, type:'magic', text:'へっぽこは 羽を ぱたぱた。羽が ひらひら 敵の 目に 入った!'} },

    { id:'hero_cape', name:'勇者のマント', slot:'cape', price:500000, atk:5, def:18, extra:{hp:120,spd:15,luck:5,heal:0},
      desc:'赤くて ながい。地面に ずるずる。でも かっこいい。',
      look:{emoji:'🥻', color:'#c0392b', pos:'cape'},
      attack:{name:'マントひらり', power:1.2, type:'phys', text:'へっぽこは マントを ひらりと させて 一げき! さまに なってる。'} },

    { id:'solar_panel', name:'ソーラーパネル', slot:'cape', price:410000, atk:15, def:25, extra:{hp:150,spd:12,luck:0,heal:25},
      desc:'せなかで 発電。はれの日は ずっと 元気。夜は ただの 板。',
      look:{emoji:'🔋', color:'#2c3e50', pos:'cape'},
      attack:{name:'たいようビーム', power:1.5, type:'magic', text:'へっぽこは ためた 電気で ビーム! ピカーッ。エコな いちげき。'} },

    /* ---------- 腰(waist) ---------- */
    { id:'rope', name:'なわとび', slot:'waist', price:1100, atk:3, def:0, extra:{hp:0,spd:4,luck:0,heal:0},
      desc:'二重とびが できる。むちみたいにも 使える。',
      look:{emoji:'➰', color:'#e67e22', pos:'waist'},
      attack:{name:'なわでピシッ', power:1.0, type:'phys', text:'へっぽこは なわとびを ピシッと ふった! 二重とびの 音。'} },

    { id:'leather_belt', name:'かわのベルト', slot:'waist', price:2500, atk:0, def:0, extra:{hp:0,spd:0,luck:0,heal:0},
      desc:'ズボンが おちない。それが いちばん だいじ。',
      look:{emoji:'🪢', color:'#6b4f2a', pos:'waist'} },

    { id:'inner_tube', name:'浮き輪', slot:'waist', price:3400, atk:3, def:6, extra:{hp:30,spd:-1,luck:3,heal:0},
      desc:'アヒルの かたち。こしに はめて 歩く。ぶつかっても へいき。',
      look:{emoji:'🦆', color:'#ff7675', pos:'waist'},
      attack:{name:'浮き輪ボディアタック', power:1.0, type:'phys', text:'へっぽこは 浮き輪で ぼよんと ぶつかった! はねかえった。'} },

    { id:'fanny_pack', name:'ウエストポーチ', slot:'waist', price:9000, atk:1, def:1, extra:{hp:10,spd:0,luck:8,heal:5},
      desc:'おやつ・ばんそうこう・ひみつの石 が 入ってる。べんり。',
      look:{emoji:'👝', color:'#2d3436', pos:'waist'},
      attack:{name:'ポーチからなにか', power:0.9, type:'weird', text:'へっぽこは ポーチから なにかを 出して なげた! なんだったのかは わからない。'} },

    { id:'fake_snake', name:'おもちゃのヘビ', slot:'waist', price:11000, atk:6, def:0, extra:{hp:20,spd:3,luck:5,heal:0},
      desc:'こしに まいてる。ゴム製。見た人は かならず とびあがる。',
      look:{emoji:'🐍', color:'#27ae60', pos:'waist'},
      attack:{name:'ヘビだー!', power:1.2, type:'weird', text:'へっぽこは ヘビを なげた! 敵は「ギャッ」と とびあがった。'} },

    { id:'tool_belt', name:'大工さんの道具ベルト', slot:'waist', price:26000, atk:10, def:1, extra:{hp:50,spd:0,luck:0,heal:0},
      desc:'ハンマー・くぎ・メジャー。なんでも なおせる 気が する。',
      look:{emoji:'🔨', color:'#8e5a2b', pos:'waist'},
      attack:{name:'ハンマーでトンカチ', power:1.3, type:'phys', text:'へっぽこは ハンマーで トンカチ トンカチ! しゅうりでは ない。'} },

    { id:'sumo_mawashi', name:'まわし', slot:'waist', price:39000, atk:25, def:10, extra:{hp:80,spd:-3,luck:0,heal:0},
      desc:'お相撲さんの やつ。しめると どすこい したくなる。',
      look:{emoji:'🩲', color:'#2c3e50', pos:'waist'},
      attack:{name:'どすこい', power:1.4, type:'phys', text:'へっぽこは「どすこい」と つっぱりした! 土ひょうが ゆれた。'} },

    { id:'obi', name:'きれいな帯(おび)', slot:'waist', price:92000, atk:5, def:4, extra:{hp:60,spd:0,luck:12,heal:5},
      desc:'きんいろの ししゅう。むすぶのに 30分 かかる。',
      look:{emoji:'🎀', color:'#d4af37', pos:'waist'},
      attack:{name:'帯でくるくる', power:1.1, type:'phys', text:'へっぽこは 帯を ほどいて 敵を くるくる まいた! きれい。'} },

    { id:'champion_belt', name:'チャンピオンベルト', slot:'waist', price:450000, atk:35, def:5, extra:{hp:100,spd:0,luck:10,heal:0},
      desc:'きんぴか。だれが チャンピオンかは 書いてない。',
      look:{emoji:'🏅', color:'#f1c40f', pos:'waist'},
      attack:{name:'チャンピオンパンチ', power:1.6, type:'phys', text:'へっぽこは チャンピオンの パンチ! 会場(?)が わいた。'} },

    /* ---------- 足(feet) ---------- */
    { id:'slippers', name:'スリッパ', slot:'feet', price:9000, atk:2, def:2, extra:{hp:0,spd:0,luck:0,heal:0},
      desc:'家の中 用。外に 出ると ママに おこられる。ぬいで たたける。',
      look:{emoji:'🥿', color:'#74b9ff', pos:'feet'},
      attack:{name:'スリッパでパシッ', power:1.1, type:'phys', text:'へっぽこは スリッパを ぬいで パシッ! ママの わざだ。'} },

    { id:'leather_boots', name:'かわのくつ', slot:'feet', price:22000, atk:0, def:4, extra:{hp:0,spd:1,luck:0,heal:0},
      desc:'ふつうの くつ。ちょっと きゅうくつ。',
      look:{emoji:'👞', color:'#6b4f2a', pos:'feet'} },

    { id:'geta', name:'げた', slot:'feet', price:2700, atk:4, def:2, extra:{hp:20,spd:-1,luck:3,heal:0},
      desc:'カラコロ いい音。けると いたい。あしたの 天気が わかる。',
      look:{emoji:'🩴', color:'#c9a066', pos:'feet'},
      attack:{name:'げたをとばす', power:1.2, type:'phys', text:'へっぽこは げたを とばした! あしたは 晴れ。'} },

    { id:'rain_boots', name:'長ぐつ', slot:'feet', price:53000, atk:1, def:10, extra:{hp:40,spd:7,luck:0,heal:0},
      desc:'水たまりに 入っても へいき。入りたくなる。',
      look:{emoji:'👢', color:'#f9d71c', pos:'feet'},
      attack:{name:'水たまりジャンプ', power:1.0, type:'phys', text:'へっぽこは 水たまりで バシャーン! 敵に 水が かかった。'} },

    { id:'stilts', name:'たけうま', slot:'feet', price:3400, atk:5, def:1, extra:{hp:30,spd:-2,luck:0,heal:0},
      desc:'高いところから 見下ろせる。おちると いたい。',
      look:{emoji:'🎋', color:'#27ae60', pos:'feet'},
      attack:{name:'たけうまキック', power:1.2, type:'phys', text:'へっぽこは たけうまの 上から キック! たかいところから しつれい。'} },

    { id:'swim_fins', name:'足ひれ', slot:'feet', price:5700, atk:3, def:2, extra:{hp:10,spd:-5,luck:2,heal:0},
      desc:'水の中では さいきょう。りくでは ぺたぺた。',
      look:{emoji:'🐧', color:'#0984e3', pos:'feet'},
      attack:{name:'ぺたぺたキック', power:1.0, type:'phys', text:'へっぽこは 足ひれで ぺたぺた キック! 音が おもしろい。'} },

    { id:'light_sneakers', name:'光るスニーカー', slot:'feet', price:200000, atk:2, def:9, extra:{hp:50,spd:9,luck:5,heal:0},
      desc:'歩くと ピカピカ 光る。夜の へやで さいきょう。',
      look:{emoji:'👟', color:'#00cec9', pos:'feet'},
      attack:{name:'ピカピカダッシュ', power:1.1, type:'phys', text:'へっぽこは ピカピカ 光りながら ダッシュした! まぶしくて はやい。'} },

    { id:'roller_skates', name:'ローラースケート', slot:'feet', price:250000, atk:4, def:6, extra:{hp:70,spd:14,luck:0,heal:0},
      desc:'とまれない。それ いがいは かんぺき。',
      look:{emoji:'🛼', color:'#fd79a8', pos:'feet'},
      attack:{name:'とまれないタックル', power:1.3, type:'phys', text:'へっぽこは ローラースケートで つっこんだ! とまれないー…。'} },

    { id:'spring_shoes', name:'バネぐつ', slot:'feet', price:380000, atk:8, def:16, extra:{hp:80,spd:18,luck:5,heal:0},
      desc:'ぼよん ぼよん。てんじょうに 頭を ぶつける。',
      look:{emoji:'🦘', color:'#e17055', pos:'feet'},
      attack:{name:'ぼよんキック', power:1.4, type:'phys', text:'へっぽこは ぼよーんと とびあがって キック! 空から こんにちは。'} },

    { id:'iron_boots', name:'てつのブーツ', slot:'feet', price:95000, atk:15, def:20, extra:{hp:100,spd:6,luck:0,heal:0},
      desc:'とても おもい。ふむと とても いたい。はしれない。',
      look:{emoji:'🥾', color:'#636e72', pos:'feet'},
      attack:{name:'てつのふみつけ', power:1.5, type:'phys', text:'へっぽこは てつのブーツで ドスンと ふんだ! 地面が へこんだ。'} },

    /* ---------- 指輪(ring) ---------- */
    { id:'rubber_band', name:'輪ゴム', slot:'ring', price:30, atk:9, def:0, extra:{hp:0,spd:5,luck:8,heal:0},
      desc:'指に はめると 指輪。とばすと ぶき。30Gで これは おとく。',
      look:{emoji:'⭕', color:'#e8c07d', pos:'ring'},
      attack:{name:'輪ゴムをとばす', power:1.3, type:'phys', text:'へっぽこは 輪ゴムを びゅんと とばした! 敵の はなに ヒット。'} },

    { id:'washer', name:'ワッシャー', slot:'ring', price:160, atk:1, def:0, extra:{hp:0,spd:0,luck:0,heal:0},
      desc:'ねじの あいだに はさむ 金ぞくの 輪。指輪だと 言いきる。',
      look:{emoji:'⚙️', color:'#95a5a6', pos:'ring'} },

    { id:'toy_ring', name:'おもちゃの指輪', slot:'ring', price:270, atk:1, def:0, extra:{hp:0,spd:0,luck:0,heal:0},
      desc:'お菓子の おまけ。石の ぶぶんは あめ。なめられる。',
      look:{emoji:'💍', color:'#ff9ff3', pos:'ring'},
      attack:{name:'あめをなめる', power:0.6, type:'heal', text:'へっぽこは 指輪の あめを なめた。あまい。ちょっと 元気!'} },

    { id:'onion_ring', name:'オニオンリング', slot:'ring', price:380, atk:2, def:0, extra:{hp:0,spd:1,luck:2,heal:8},
      desc:'さくさく。指に はめて 歩くと においで 気づかれる。',
      look:{emoji:'🧅', color:'#e0a94d', pos:'ring'},
      attack:{name:'オニオンリングをたべる', power:0.8, type:'heal', text:'へっぽこは オニオンリングを さくっと 食べた。おいしい!'} },

    { id:'donut', name:'ドーナツ', slot:'ring', price:640, atk:1, def:0, extra:{hp:0,spd:0,luck:1,heal:12},
      desc:'輪っかだから 指輪。はめた 指が べたべたする。',
      look:{emoji:'🍩', color:'#d35400', pos:'ring'},
      attack:{name:'ドーナツをたべる', power:1.0, type:'heal', text:'へっぽこは ドーナツを ぱくり。穴の ぶぶんは 食べられない。'} },

    { id:'key_ring', name:'キーホルダー', slot:'ring', price:970, atk:4, def:0, extra:{hp:0,spd:1,luck:3,heal:0},
      desc:'家の かぎ つき。じゃらじゃら 音が する。',
      look:{emoji:'🔑', color:'#f39c12', pos:'ring'},
      attack:{name:'じゃらじゃらアタック', power:1.0, type:'phys', text:'へっぽこは キーホルダーを ぶんぶん ふった! じゃらじゃら。'} },

    { id:'mood_ring', name:'気分の指輪', slot:'ring', price:9200, atk:6, def:0, extra:{hp:0,spd:2,luck:8,heal:5},
      desc:'気分で 色が かわる。今は むらさき。なんの 気分?',
      look:{emoji:'🔮', color:'#8e44ad', pos:'ring'},
      attack:{name:'きぶんビーム', power:1.1, type:'magic', text:'指輪が 今日の 気分の 色で 光った! へっぽこにも よく わからない 色。'} },

    { id:'smartwatch', name:'スマートウォッチ', slot:'ring', price:98000, atk:11, def:0, extra:{hp:0,spd:5,luck:7,heal:20},
      desc:'歩いた 歩数が わかる。きょうは まだ 300歩。',
      look:{emoji:'⌚', color:'#2d3436', pos:'ring'},
      attack:{name:'アラームをならす', power:1.2, type:'weird', text:'ピピピピピ! アラームが なった。敵は 朝かと 思って あせった。'} },

    { id:'power_ring', name:'ちからの指輪', slot:'ring', price:120000, atk:32, def:0, extra:{hp:0,spd:4,luck:8,heal:0},
      desc:'はめると うでが むきむきに なる 気が する。気が する だけ。',
      look:{emoji:'💪', color:'#c0392b', pos:'ring'},
      attack:{name:'むきむきパンチ', power:1.5, type:'phys', text:'へっぽこは むきむきの 気分で パンチ! 気分は だいじ。'} },

    { id:'diamond_ring', name:'ダイヤの指輪', slot:'ring', price:800000, atk:50, def:0, extra:{hp:0,spd:5,luck:10,heal:0},
      desc:'キラキラ。はめると みんなが ふりむく。敵も ふりむく。',
      look:{emoji:'💎', color:'#aee1f9', pos:'ring'},
      attack:{name:'ダイヤの光', power:1.8, type:'magic', text:'ダイヤが 光った! まぶしい。敵は 目が くらんで うごけない。'} },

    /* ---------- お守り(charm) ---------- */
    { id:'receipt', name:'レシート', slot:'charm', price:30, atk:0, def:0, extra:{hp:0,spd:0,luck:0,heal:0},
      desc:'ポケットに いつも 入ってる やつ。ごりやくは とくに ない。',
      look:{emoji:'🧾', color:'#ffffff', pos:'charm'} },

    { id:'bell', name:'すず', slot:'charm', price:510, atk:1, def:0, extra:{hp:30,spd:3,luck:1,heal:0},
      desc:'ちりん ちりん。ネコが あつまってくる。',
      look:{emoji:'🔔', color:'#f1c40f', pos:'charm'},
      attack:{name:'ちりんちりん', power:0.8, type:'weird', text:'へっぽこは すずを ならした。ちりん。敵は なぜか おじぎした!'} },

    { id:'omamori', name:'お守り(神社)', slot:'charm', price:610, atk:0, def:1, extra:{hp:60,spd:0,luck:8,heal:5},
      desc:'合格きがん と 書いてある。戦いにも きくのかな。',
      look:{emoji:'🎴', color:'#c0392b', pos:'charm'} },

    { id:'wrinkled_bill', name:'しわくちゃの千円札', slot:'charm', price:1100, atk:1, def:1, extra:{hp:90,spd:0,luck:8,heal:0},
      desc:'おばあちゃんに もらった。しわは おばあちゃんの 愛。',
      look:{emoji:'💵', color:'#a3cef1', pos:'charm'},
      attack:{name:'千円札をひらひら', power:1.0, type:'weird', text:'へっぽこは 千円札を ひらひらさせた! 敵は 目で おった。'} },

    { id:'four_leaf', name:'四つ葉のクローバー', slot:'charm', price:2600, atk:0, def:0, extra:{hp:10,spd:0,luck:8,heal:0},
      desc:'公園で 3時間 さがした。うんが よくなる。たぶん。',
      look:{emoji:'🍀', color:'#27ae60', pos:'charm'} },

    { id:'dumbbell', name:'ダンベル', slot:'charm', price:8200, atk:20, def:3, extra:{hp:230,spd:-6,luck:8,heal:0},
      desc:'首から さげてる。おもい。でも うでが つよくなる(気が する)。',
      look:{emoji:'🏋️', color:'#636e72', pos:'charm'},
      attack:{name:'ダンベルなげ', power:1.4, type:'phys', text:'へっぽこは ダンベルを なげた! おもい。ドスン。'} },

    { id:'daruma', name:'だるま', slot:'charm', price:11000, atk:5, def:10, extra:{hp:130,spd:-2,luck:8,heal:0},
      desc:'ころんでも おきあがる。目は かた目だけ 入ってる。',
      look:{emoji:'🪆', color:'#c0392b', pos:'charm'},
      attack:{name:'だるまさんがころんだ', power:1.0, type:'weird', text:'へっぽこは「だるまさんが ころんだ」と 言った! 敵は うごけない。'} },

    { id:'lucky_cat', name:'まねきねこ', slot:'charm', price:12000, atk:2, def:1, extra:{hp:180,spd:0,luck:8,heal:5},
      desc:'手が うごく。お金を まねく。敵も まねいてしまう。',
      look:{emoji:'🐈', color:'#f1c40f', pos:'charm'},
      attack:{name:'まねきの手', power:1.1, type:'weird', text:'まねきねこが 手を ふった! 敵は ついつい 近づいて ころんだ。'} },

    { id:'alien_part', name:'宇宙人のパーツ', slot:'charm', price:160000, atk:6, def:5, extra:{hp:340,spd:6,luck:13,heal:10},
      desc:'何の 部品かは わからない。ときどき 光る。ときどき しゃべる。',
      look:{emoji:'🛸', color:'#2ecc71', pos:'charm'},
      attack:{name:'なぞのスイッチ', power:1.5, type:'magic', text:'へっぽこは なぞの スイッチを おした! ピカーッ。何かが おきた。'} },

    { id:'magic_stone', name:'まほうの石', slot:'charm', price:190000, atk:8, def:3, extra:{hp:280,spd:5,luck:10,heal:30},
      desc:'あたたかい。手に もつと 元気が わく。ただの 石かも。',
      look:{emoji:'🪨', color:'#9b59b6', pos:'charm'},
      attack:{name:'石のちから', power:1.4, type:'heal', text:'まほうの石が あたたかく 光った。へっぽこの 元気が もどった!'} },

    { id:'gold_poop', name:'金のうんち', slot:'charm', price:999999, atk:16, def:7, extra:{hp:400,spd:5,luck:15,heal:10},
      desc:'うん が つく。この店で いちばん 高い。かたちは ふつうの うんち。',
      look:{emoji:'💩', color:'#f1c40f', pos:'charm'},
      attack:{name:'うんのちから', power:2.0, type:'weird', text:'金のうんちが まばゆく 光った! うんが 敵に ぶつかった。ついてる。'} }
  ],

  /* =========================================================
     COMPANIONS: 仲間候補(10組まで えらべる)
     how.type: pay / favor / quest / free / riddle
     battle.role: attack / guard / heal / weird / support
     special.effect: big_hit / guard_all / heal_all / revive / random / buff_atk / debuff_boss / taunt / nothing
     ========================================================= */
  COMPANIONS: [

    { id:'warrior', name:'戦士', emoji:'🧔', count:1,
      desc:'きんにくが じまんの 戦士。りれきしょを もって 仲間さがし中。',
      where:{x:3,y:3},
      how:{type:'pay', text:'おれを やとうなら 50万G だ。前ばらいで。', price:500000, steps:[]},
      talk:{before:['おれは 戦士。きんにくは うそを つかない。','ゆうしゃ? きみが? …まあ、お金が あるなら いいか。'], ok:'よし、やとわれた。きんにくで おんがえし する!', no:'お金が ない やつとは 旅を しない。きんにくの ルールだ。'},
      battle:{hp:1080, def:25, role:'attack', power:55, lines:['おれの きんにくを 見ろ!','うおおお!','あとで プロテイン のまないと…'],
        special:{name:'きんにく大回転', text:'戦士の きんにくが 大回転! 大魔王に 大ダメージ。', effect:'big_hit'}} },

    { id:'mage', name:'魔法使い', emoji:'🧙', count:1,
      desc:'なぞなぞが 大すきな 魔法使い。まほうは 3つしか つかえない。',
      where:{x:19,y:4},
      how:{type:'riddle', text:'なぞなぞに こたえられたら 仲間に なろう。', price:0, steps:[],
        question:'パンは パンでも 食べられない パンは なに?', answer:'フライパン', choices:['フライパン','メロンパン','あんパン']},
      talk:{before:['ふふふ、わたしは 魔法使い。なぞなぞが すきです。','まほうは 3つしか 使えないけど、どれも すごいのよ。'], ok:'せいかい! あなた、かしこいわね。いっしょに 行きましょう。', no:'ざんねん。もう いちど かんがえてきて。'},
      battle:{hp:540, def:25, role:'attack', power:65, lines:['メラメラ〜!','つえが ちょっと 熱い…','あと 2回しか 使えないのよ。'],
        special:{name:'ドカーンの魔法', text:'魔法使いの つえが 光った! ドカーン。大魔王が こげた。', effect:'big_hit'}} },

    { id:'priest', name:'僧侶', emoji:'🧑‍🦲', count:1,
      desc:'やさしい 僧侶。回復が とくい。お寺の そうじも とくい。',
      where:{x:11,y:20},
      how:{type:'favor', text:'わたしに 3回 話しかけて、お寺の かねを 3回 ならしてください。', price:0, steps:['お寺(僧侶の ところ)で 3回 話しかける']},
      talk:{before:['なむなむ…。おや、ゆうしゃさま。','だれかを 助ける 旅なら、よろこんで。'], ok:'かねの 音が きれいでした。おともします。', no:'まだ 3回 なっていませんよ。'},
      battle:{hp:720, def:15, role:'heal', power:40, lines:['なむなむ、いやしの ちから!','だいじょうぶ、だいじょうぶ。','あとで みんなで お茶 しましょう。'],
        special:{name:'みんな元気の祈り', text:'僧侶が いのった。あたたかい 光が みんなを つつんだ!', effect:'heal_all'}} },

    { id:'player', name:'本当の遊び人', emoji:'🤡', count:1,
      desc:'ぜんぜん 役に 立たない… はずなのに、なぜか すごい ときが ある。',
      where:{x:7,y:12},
      how:{type:'free', text:'ひまだから ついていく〜。', price:0, steps:[]},
      talk:{before:['あ〜 ひま。ひますぎる。','なんか おもしろいこと ない?'], ok:'いいね いいね! 行こう 行こう!', no:'えー つれていってよー。'},
      battle:{hp:450, def:15, role:'weird', power:30, lines:['ぴょんぴょん!','みてみて、へんがお!','あ、ちょうちょ。'],
        special:{name:'なにかがおきた', text:'遊び人が へんな おどりを おどった。…なにか すごいことが おきた!', effect:'random'}} },

    { id:'kobito', name:'小人700人', emoji:'🧚', count:700,
      desc:'ひとり ひとりは よわい。でも 700人。かぞえた人は いない。',
      where:{x:21,y:22},
      how:{type:'quest', text:'ぼくたち 700人が ひとり 3Gずつ 出すと、ぜんぶで いくら?', price:0, steps:[],
        question:'700人が 1人 3Gずつ 出すと、ぜんぶで いくら?', answer:'2100G', choices:['2100G','700G','3000G']},
      talk:{before:['わいわい!','ぼくたち 700人。たぶん 700人。','かしこい人と いっしょに 行きたいな。'], ok:'せいかーい! みんな、ついていくよー!(700人の 声)', no:'ちがうよー!(700人の 声)'},
      battle:{hp:1260, def:25, role:'attack', power:35, lines:['わーっ!(700人)','ちくちくちくちく!','だれか ふまれたー!'],
        special:{name:'700人つつき', text:'700人が いっせいに つついた! ちくちくちくちく。', effect:'big_hit'}} },

    { id:'monsters', name:'大魔王にこき使われてたモンスターたち', emoji:'👹', count:6,
      desc:'ざんぎょう ばかりで つかれてる。おにぎりを あげると なつく。',
      where:{x:2,y:21},
      how:{type:'favor', text:'おにぎり… 食べたい… 雑貨屋の「ママの愛妻弁当」でも いい… 買ってきて…', price:0, steps:['雑貨屋で「ママの愛妻弁当」を 買う','モンスターたちに 話しかける']},
      talk:{before:['うう… 休みが ない…','大魔王は ざんぎょう代を くれない…','おにぎり…'], ok:'おべんとう! うまい…。おんがえし する。大魔王 ゆるさん!', no:'おべんとう… ない…?'},
      battle:{hp:1440, def:25, role:'support', power:45, lines:['大魔王の よわみは 知ってるぞ!','もう 働かされないぞ!','おにぎり ごちそうさま!'],
        special:{name:'よわみをばらす', text:'モンスターたちが 大魔王の よわみを ばらした! 大魔王の まもりが さがった。', effect:'debuff_boss'}} },

    { id:'aunt', name:'隣の家のおばさん', emoji:'👩‍🦱', count:1,
      desc:'となりの家の おばさん。ふつうの おばさん。この町で いちばん つよい。',
      where:{x:9,y:6},
      how:{type:'favor', text:'あら へっぽこちゃん。回覧板を となりの パン屋さんに とどけてきて くれる?', price:0, steps:['パン屋さんに 話しかけて 回覧板を わたす','おばさんに 話しかける']},
      talk:{before:['あら、へっぽこちゃん。大きくなったねえ。','ちょっと おばさん 手が はなせなくて。'], ok:'ありがとう! じゃあ おばさんも ついていこうかねえ。買いものの ついでに。', no:'まだ 回覧板 とどけてないでしょ?'},
      battle:{hp:2500, def:25, role:'attack', power:120, lines:['あらあら、まあまあ。','ちょっと そこ どいてねえ。','こんなの 近所の そうじより かんたんよ。'],
        special:{name:'ご近所のちから', text:'おばさんが スリッパを ぬいだ。パシーン! 大魔王が せいざした。', effect:'big_hit'}} },

    { id:'retired_hero', name:'定年退職した元勇者', emoji:'👴', count:1,
      desc:'むかし 魔王を たおした。今は 毎日 ゲートボール。こしが いたい。',
      where:{x:17,y:2},
      how:{type:'pay', text:'わしの ねんきんは すくない。100万G くれたら、もういちど がんばろう。', price:1000000, steps:[]},
      talk:{before:['わしは むかし… 魔王を たおしたんじゃ。','もう 引退した。こしが いたいんじゃ。'], ok:'ほほう、お金持ちじゃな。よし、ひざに サポーターを つけてくる。', no:'ねんきん ぐらしは きびしいんじゃ。'},
      battle:{hp:1620, def:25, role:'attack', power:85, lines:['むかしの わしを 見せてやる!','こ、こしが…!','若いもんには まけん!'],
        special:{name:'むかしの必殺技', text:'元勇者の 伝説の 一げき! …の あと、こしを おさえた。', effect:'big_hit'}} },

    { id:'pomeranians', name:'ポメラニアン3匹', emoji:'🐩', count:3,
      desc:'ふわふわ。ちいさい。とても うるさい。',
      where:{x:5,y:16},
      how:{type:'favor', text:'ワンワン!(ボールを なげて ほしいみたい。3回 なげて あげよう)', price:0, steps:['ポメラニアンに 3回 話しかける(ボールを なげる)']},
      talk:{before:['ワン! ワンワン!','(しっぽを ぶんぶん ふっている)','(ボールを くわえて こっちを 見ている)'], ok:'ワンワンワーン!(ついてくる みたい)', no:'クゥーン…(まだ あそびたい みたい)'},
      battle:{hp:360, def:15, role:'weird', power:25, lines:['ワンワン!','キャンキャン!','(くるくる まわっている)'],
        special:{name:'ふわふわ大合唱', text:'3匹が いっせいに ほえた! 大魔王は うるさくて こっちを 見た。', effect:'taunt'}} },

    { id:'shopping_street', name:'商店街のおばちゃん会', emoji:'👩‍🍳', count:8,
      desc:'商店街の おばちゃん 8人。おしゃべりが とまらない。あめを くれる。',
      where:{x:13,y:11},
      how:{type:'free', text:'あらー ゆうしゃ? じゃあ みんなで 行こうか!', price:0, steps:[]},
      talk:{before:['あらー、へっぽこちゃん! 大きく なって。','あめ 食べる? はい どうぞ。','大魔王? ちょっと いって きかせないと ねえ。'], ok:'じゃあ 店は しめて、みんなで 行こうか!', no:'またね〜。あめ もってって〜。'},
      battle:{hp:1440, def:15, role:'heal', power:35, lines:['はい あめ! はい あめ!','ちょっと 大魔王さん! 聞いてる?','おばちゃんたちは 元気よ〜。'],
        special:{name:'あめくばり', text:'おばちゃんたちが みんなに あめを くばった。元気 もりもり!', effect:'heal_all'}} },

    { id:'slime_family', name:'スライムの親子', emoji:'💧', count:3,
      desc:'おかあさんスライムと 子スライム 2匹。ぷにぷに。1匹 まいごに なってる。',
      where:{x:17,y:14},
      how:{type:'favor', text:'ぷるぷる…(子どもが 1匹 まいご。町の どこかで 見つけて 話しかけてあげて)', price:0, steps:['町の どこかに いる まいごの 子スライムに 話しかける','おかあさんスライムに 話しかける']},
      talk:{before:['ぷるぷる…','(おかあさんスライムが こまってる)','(子スライムが 1匹 たりない)'], ok:'ぷるん! ぷるん!(ありがとうって 言ってる)', no:'ぷる…(まだ 見つかって ない)'},
      battle:{hp:810, def:45, role:'guard', power:30, lines:['ぷるん!','ぷにぷに!','(はねている)'],
        special:{name:'ぷにぷにバリア', text:'スライムたちが みんなの 前で ぷにぷにの かべに なった!', effect:'guard_all'}} },

    { id:'lost_ninja', name:'迷子の忍者', emoji:'🥷', count:1,
      desc:'かくれるのが とくい すぎて、じぶんが どこに いるか わからなくなった。',
      where:{x:1,y:10},
      how:{type:'riddle', text:'忍者の なぞなぞに こたえよ。', price:0, steps:[],
        question:'わたしは 木の上に います。木の 下に いるのは だれ?', answer:'かげ', choices:['かげ','ネコ','もう1人の忍者']},
      talk:{before:['…ここは どこだ。','ニンニン。見つかって しまったか。','かくれるのが うますぎて まいごだ。'], ok:'みごと。きみに ついていけば まいごに ならぬ。', no:'ちがう。しゅぎょうが たりぬ。'},
      battle:{hp:630, def:25, role:'attack', power:60, lines:['ニンニン!','かげの じゅつ!','あれ、どっちが 前だ?'],
        special:{name:'ぶんしんのじゅつ', text:'忍者が 5人に ふえた! …1人は どこかで まいごに なった。', effect:'big_hit'}} },

    { id:'robot_vacuum', name:'ロボット掃除機', emoji:'🤖', count:1,
      desc:'まるくて ひくい。ゴミを すう。段差で とまる。',
      where:{x:12,y:16},
      how:{type:'pay', text:'ピピッ。5万Gで おともします。でんちは 40%です。', price:50000, steps:[]},
      talk:{before:['ピピッ。そうじ中です。','ピー。段差を けんちしました。','ピピッ。ゴミを 見つけました。'], ok:'ピピピッ。おともします。ゴミが あれば すいます。', no:'ピー。ざんだかが たりません。'},
      battle:{hp:540, def:25, role:'support', power:30, lines:['ピピッ。そうじ中。','ピー。しょうがいぶつ。','ゴミを すいました。'],
        special:{name:'大魔王のゴミをすう', text:'ロボット掃除機が 大魔王の 足もとの ゴミを すった! 大魔王が ころびかけた。', effect:'debuff_boss'}} },

    { id:'crows', name:'カラスの群れ', emoji:'🐦', count:30,
      desc:'黒くて かしこい。キラキラが すき。ゴミの日を おぼえてる。',
      where:{x:20,y:15},
      how:{type:'favor', text:'カァ!(キラキラが ほしいみたい。アクセサリー屋の「キーホルダー」を 見せて)', price:0, steps:['アクセサリー屋で「キーホルダー」を 買う','カラスに 話しかける']},
      talk:{before:['カァ! カァ!','(じーっと こっちを 見ている)','(ゴミ袋を つついている)'], ok:'カァァ!(キラキラに 大よろこび。ついてくる)', no:'カァ…(キラキラが ない)'},
      battle:{hp:900, def:25, role:'attack', power:40, lines:['カァー!','カァカァカァ!','(なにか キラキラを ひろった)'],
        special:{name:'空からいっせい', text:'カラス 30羽が 空から いっせいに つついた!', effect:'big_hit'}} },

    { id:'student', name:'受験生', emoji:'🤓', count:1,
      desc:'ねむそう。暗記カードを もってる。計算が はやい。',
      where:{x:6,y:2},
      how:{type:'riddle', text:'この計算、できる? できたら 息ぬきに ついていく。', price:0, steps:[],
        question:'大魔王の HPは 999,999。ここから 1 ひいたら いくつ?', answer:'999,998', choices:['999,998','999,990','1,000,000']},
      talk:{before:['ふぁ〜… ねむい…','あと 3ページ… いや 30ページ…','ちょっと 息ぬきしたいな。'], ok:'おお、できるね。じゃあ 息ぬきに ついていくよ。', no:'うーん、ちがうよ。もういちど。'},
      battle:{hp:500, def:25, role:'support', power:35, lines:['公式は… あ、これだ!','ねむい… でも がんばる!','せんせい、見てますか!'],
        special:{name:'よわみを計算', text:'受験生が 大魔王の よわみを 計算した! みんなの こうげきが あがった。', effect:'buff_atk'}} },

    { id:'yankees', name:'ヤンキー2人', emoji:'😤', count:2,
      desc:'こわそう。でも ネコには やさしい。じゃんけんが よわい。',
      where:{x:22,y:10},
      how:{type:'quest', text:'じゃんけんで 勝てたら ついていってやる。(ヒント: いつも グーしか 出さない)', price:0, steps:[],
        question:'じゃんけん! なにを 出す?', answer:'パー', choices:['グー','チョキ','パー']},
      talk:{before:['なんだよ、おれたちに ようか?','…おい、ネコが いるぞ。かわいいな。','じゃんけんは つよいぜ。たぶん。'], ok:'ま、まけた…。しかたねえ、ついていくよ。', no:'へへ、おれたちの 勝ちだな!'},
      battle:{hp:990, def:25, role:'attack', power:50, lines:['おらおらー!','おい、ネコには 手を 出すなよ!','なめんなよー!'],
        special:{name:'ふたりでいっせいに', text:'ヤンキー 2人が いっせいに つっこんだ! 「なめんなよー!」', effect:'big_hit'}} },

    { id:'florist', name:'お花屋さん', emoji:'💐', count:1,
      desc:'いつも 花の においが する。花の 名前を ぜんぶ 知ってる。',
      where:{x:10,y:14},
      how:{type:'free', text:'大魔王に お花を とどけたいの。つれていって くれる?', price:0, steps:[]},
      talk:{before:['いらっしゃい。今日の おすすめは ひまわり。','大魔王さんにも お花を あげたら、やさしく なるかしら。'], ok:'ありがとう! 花束を もって いきましょう。', no:'また きてね。'},
      battle:{hp:580, def:15, role:'heal', power:30, lines:['お花の ちから!','いい においでしょ?','トゲに 気をつけて!'],
        special:{name:'花びらのいやし', text:'花びらが ふわ〜っと まった。みんな 元気に なった!', effect:'heal_all'}} },

    { id:'monk', name:'お寺のお坊さん', emoji:'🧘', count:1,
      desc:'ずっと すわってる。むずかしいことを かんたんに 言う。',
      where:{x:14,y:21},
      how:{type:'riddle', text:'ひとつ 問おう。こたえられたら ついていこう。', price:0, steps:[],
        question:'たたくと 音が 出て、たたかれても おこらない ものは なに?', answer:'たいこ', choices:['たいこ','大魔王','おとうさん']},
      talk:{before:['……。','こころを しずめなさい。','おや、ゆうしゃか。ひとつ 問おう。'], ok:'ほほう。こころが きれいだ。ついていこう。', no:'まだ こころが ざわざわ しておる。'},
      battle:{hp:1080, def:45, role:'guard', power:40, lines:['どうどう。','おちつきなさい。','ぽくぽくぽく、チーン。'],
        special:{name:'ぜんの構え', text:'お坊さんが しずかに すわった。ふしぎな ちからで みんなが 守られた!', effect:'guard_all'}} },

    { id:'ghost', name:'ゆうれい', emoji:'👻', count:1,
      desc:'こわくない。さみしがり。足は ある(見えないだけ)。',
      where:{x:4,y:19},
      how:{type:'free', text:'うらめしや〜… じゃなくて、ともだちに なって〜。', price:0, steps:[]},
      talk:{before:['う、うらめしや〜…。','あ、びびらなかった? すごい。','ずっと ひとりで さみしかったの。'], ok:'ともだち! いっしょに 行く〜。ふわふわ〜。', no:'そっか… またね…。'},
      battle:{hp:270, def:15, role:'weird', power:35, lines:['うらめしや〜!','すりぬけた〜!','さむくない?'],
        special:{name:'おどろかす', text:'ゆうれいが 大魔王の うしろに まわった。「わっ!」大魔王が とびあがった。', effect:'taunt'}} },

    { id:'grandma', name:'へっぽこのおばあちゃん', emoji:'👵', count:1,
      desc:'へっぽこの おばあちゃん。入れ歯は 店に 売ってしまった。あめを くれる。',
      where:{x:5,y:9},
      how:{type:'free', text:'まごの ためなら、おばあちゃん がんばるよ。', price:0, steps:[]},
      talk:{before:['へっぽこ、ごはん 食べたかい?','大魔王? こわくないよ。おばあちゃんは 台風も 地しんも のりこえたんだから。'], ok:'いいよ、ついていくよ。ひざかけ もってくね。', no:'またね。あめ もっていきなさい。'},
      battle:{hp:720, def:15, role:'heal', power:45, lines:['はい、あめ。','だいじょうぶ、だいじょうぶ。','おばあちゃんは 見てるよ。'],
        special:{name:'おばあちゃんの魔法', text:'おばあちゃんの「いたいの いたいの とんでいけ〜」。ほんとに 元気に なった!', effect:'revive'}} },

    { id:'cat_gang', name:'ネコの集会', emoji:'🐈‍⬛', count:12,
      desc:'夜に 公園で 集まってる。えらそう。ちくわが 大すき。',
      where:{x:19,y:11},
      how:{type:'favor', text:'ニャー。(ちくわが ほしいみたい。武器屋で「おでんの串」を 買って きて)', price:0, steps:['武器屋で「おでんの串」を 買う','ネコたちに 話しかける']},
      talk:{before:['ニャー。','(12匹が いっせいに こっちを 見た)','(1匹が あくびをした)'], ok:'ニャーン!(ちくわに つられた。ついてくる)', no:'フン。(ちくわが ない)'},
      battle:{hp:650, def:15, role:'weird', power:40, lines:['ニャー!','シャーッ!','(ねてる)'],
        special:{name:'12匹のネコパンチ', text:'12匹が いっせいに ネコパンチ! ぽふぽふぽふぽふ。', effect:'random'}} },

    { id:'idol', name:'地下アイドル', emoji:'🎤', count:1,
      desc:'ファンは まだ 3人。でも いつか スターに なる。歌が 元気。',
      where:{x:16,y:6},
      how:{type:'pay', text:'ライブの チケット、30万G! 買ってくれたら いっしょに 行きます!', price:300000, steps:[]},
      talk:{before:['みんなー! …あ、1人か。','ライブ 見にきてね!','ファン 3人から 4人に なる チャンス!'], ok:'やったー! 4人目の ファン。歌で おうえん するよ!', no:'チケット… 買ってくれない…?'},
      battle:{hp:500, def:25, role:'support', power:40, lines:['みんなー! 元気ー?','いくよー! せーの!','サイリウム ふってー!'],
        special:{name:'元気のうた', text:'アイドルが 歌った。みんなの やる気が 大アップ!', effect:'buff_atk'}} },

    { id:'dragon_small', name:'ちいさなドラゴン', emoji:'🐲', count:1,
      desc:'手のひらサイズ。でも 火を はく。おさいふは 大きい。',
      where:{x:2,y:14},
      how:{type:'pay', text:'ガオー。120万G で やとわれてやる。ちいさいけど 高いぞ。', price:1200000, steps:[]},
      talk:{before:['ガオー!(ちいさい声)','おれは ドラゴン。ちいさいのは 気に するな。','やとうなら 高いぞ。'], ok:'ガオー! よし、火を はいてやる!', no:'ガオ…(お金が たりない)'},
      battle:{hp:2160, def:25, role:'attack', power:100, lines:['ガオー!','火を はくぞ!','ちいさいけど つよいぞ!'],
        special:{name:'ちいさな大火炎', text:'ちいさなドラゴンが 大きな 火を はいた! 大魔王の まゆげが こげた。', effect:'big_hit'}} },

    { id:'king_guards', name:'王さまの兵士(やる気なし)', emoji:'💂', count:2,
      desc:'王さまの 兵士 2人。王さまが いい加減なので やる気が ない。',
      where:{x:11,y:5},
      how:{type:'favor', text:'王さまに「兵士は がんばってます」と 伝えてきてよ。たのむよ。', price:0, steps:['王さまに 話しかけて 伝言する','兵士に 話しかける']},
      talk:{before:['はぁ… 今日も 立ってるだけか。','王さま、ぼくらの こと 名前も おぼえてないんだよ。'], ok:'おお、伝えてくれたのか! よし、ひさしぶりに はたらくぞ。', no:'まだ 伝えてない みたいだね。'},
      battle:{hp:1260, def:45, role:'guard', power:45, lines:['守ります!(ひさしぶり)','やる気 出てきた!','王さまより ゆうしゃのほうが いい!'],
        special:{name:'ふたりの盾', text:'兵士 2人が 大きな 盾で みんなを 守った!', effect:'guard_all'}} },

    { id:'gamer', name:'ゲーム実況者', emoji:'🎮', count:1,
      desc:'ずっと しゃべってる。ボス戦が 大すき。カメラは いつも まわってる。',
      where:{x:21,y:2},
      how:{type:'pay', text:'きざい代として 20万G ほしいな。ボス戦、じっきょう させて!', price:200000, steps:[]},
      talk:{before:['はーい、どうもー! 今日も はいしん していくよー。','ボス戦? それ ぜったい のびるやつ。'], ok:'さいこう! 見てる みんな、おうえん してね。', no:'きざいが ないと はいしん できないんだよね…。'},
      battle:{hp:540, def:25, role:'support', power:35, lines:['ここ、見どころー!','コメント ありがとー!','これは 神回!'],
        special:{name:'大魔王をちょうはつ', text:'実況者が 大魔王に カメラを むけた。「はな毛 うつってますよ」大魔王は おこった!', effect:'taunt'}} },

    { id:'sumo', name:'お相撲さん', emoji:'🤼', count:1,
      desc:'大きい。やさしい。ちゃんこ鍋が 大すき。',
      where:{x:17,y:20},
      how:{type:'pay', text:'ちゃんこ代 10万G、出してくれたら どすこい しに いくぞ。', price:100000, steps:[]},
      talk:{before:['どすこい!','おなか すいたなあ。','ゆうしゃ? いっしょに ちゃんこ 食べるか?'], ok:'ごっつぁんです! どすこーい!', no:'ちゃんこが 食べられないと ちからが 出ないんだ。'},
      battle:{hp:1800, def:45, role:'guard', power:60, lines:['どすこい!','ごっつぁんです!','はっけよい のこった!'],
        special:{name:'どすこい大つっぱり', text:'お相撲さんの 大つっぱり! 大魔王が 土ひょうの そとに 出た。', effect:'big_hit'}} },

    { id:'baker', name:'パン屋さん', emoji:'🥖', count:1,
      desc:'朝 4時から 働いてる。パンの においが する。回覧板を もらう人。',
      where:{x:10,y:9},
      how:{type:'pay', text:'パンの ざいりょう代 8万G くれたら、焼きたてを もって いっしょに 行くよ。', price:80000, steps:[]},
      talk:{before:['いらっしゃい! 焼きたてだよ。','今日は メロンパンが おすすめ。','回覧板? ああ、おばさんから だね。ありがとう。'], ok:'よし、パンを いっぱい 焼いて もっていこう!', no:'ざいりょうが ないと パンは 焼けないんだ。'},
      battle:{hp:680, def:15, role:'heal', power:38, lines:['焼きたて どうぞ!','パンの ちから!','こげないように 気をつけて!'],
        special:{name:'焼きたてパンくばり', text:'パン屋さんが 焼きたてパンを くばった。いい におい。みんな 元気に なった!', effect:'heal_all'}} },

    { id:'bus_driver', name:'バスの運転手(バスごと)', emoji:'🚌', count:1,
      desc:'バスごと 仲間に なる。「つぎ とまります」が すき。',
      where:{x:5,y:4},
      how:{type:'pay', text:'チャーターりょうきんは 150万G。バスごと 行きますよ。', price:1500000, steps:[]},
      talk:{before:['つぎは〜 大魔王の まえ〜、大魔王の まえ〜。','ごじょうしゃ ありがとうございます。','ボタンは 1回だけ おしてね。'], ok:'出発します! 手すりに おつかまり ください。', no:'りょうきんが たりません。おつりは 出ません。'},
      battle:{hp:2500, def:45, role:'guard', power:70, lines:['きゅうブレーキに 気をつけて!','つぎ とまります!','ピンポーン!'],
        special:{name:'バスでどーん', text:'バスが 大魔王に つっこんだ!「ゆれますので ご注意ください」', effect:'big_hit'}} },

    { id:'inventor', name:'発明家のおじいさん', emoji:'🧑‍🔬', count:1,
      desc:'へんな 発明ばかり。たまに すごい。たまに ばくはつ。',
      where:{x:17,y:21},
      how:{type:'riddle', text:'わしの 発明クイズに こたえてみい。', price:0, steps:[],
        question:'おしても ひいても あかない ドアは なに?', answer:'ドアじゃない(かべ)', choices:['ドアじゃない(かべ)','じどうドア','おもいドア']},
      talk:{before:['ふむふむ、これを こうして…。','あっ、ばくはつ するぞ! …しなかった。','わしの 発明を 見たいか?'], ok:'ほほう、あたまが やわらかいな。発明を もって ついていこう。', no:'ちがうな。あたまを やわらかく せい。'},
      battle:{hp:630, def:15, role:'weird', power:50, lines:['発明 その1!','あ、まちがえた。','ばくはつ しないでくれ…'],
        special:{name:'なぞの発明品', text:'発明家が なぞの きかいの ボタンを おした。…なにかが おきた!', effect:'random'}} },

    { id:'snowman', name:'夏でも溶けない雪だるま', emoji:'⛄', count:1,
      desc:'なぜ とけないのかは だれも 知らない。すずしい。',
      where:{x:3,y:12},
      how:{type:'free', text:'ぼく、あついところ 行ってみたかった。', price:0, steps:[]},
      talk:{before:['…。(とけない)','ぼく、なんで とけないのかな。','すずしいよ。さわってみて。'], ok:'いく! あついところ、たのしみ。', no:'…(とけない)'},
      battle:{hp:900, def:45, role:'guard', power:35, lines:['すずしいよー。','ゆき、ゆき!','とけないよ!'],
        special:{name:'こおりのかべ', text:'雪だるまが こおりの かべを 作った! 大魔王の 火が きかない。', effect:'guard_all'}} },

    { id:'bees', name:'ミツバチの群れ', emoji:'🐝', count:3000,
      desc:'3000匹。はたらきもの。花が あれば どこへでも。',
      where:{x:13,y:13},
      how:{type:'favor', text:'ブーン…(花が ほしいみたい。お花屋さんで 花束を もらって きて)', price:0, steps:['お花屋さんに 話しかけて 花束を もらう','ミツバチに 話しかける']},
      talk:{before:['ブーン…','(花の まわりを とんでいる)','(1匹が こっちに きた)'], ok:'ブーン!(花に 大よろこび。3000匹が ついてくる)', no:'ブン…(花が ない)'},
      battle:{hp:1080, def:25, role:'attack', power:45, lines:['ブーン!','ちくっ!','はたらくぞー!'],
        special:{name:'3000匹のちくちく', text:'3000匹が いっせいに さした! 大魔王は かゆい。', effect:'big_hit'}} },

    { id:'delivery', name:'宅配のおにいさん', emoji:'📦', count:1,
      desc:'いつも 走ってる。にもつを たくさん もってる。はやい。',
      where:{x:13,y:17},
      how:{type:'pay', text:'おとどけ りょうきん 2万G で、大魔王の ところまで はこびます!', price:20000, steps:[]},
      talk:{before:['おとどけものです!','はんこ おねがいします!','つぎ 行かないと!'], ok:'ありがとうございます! さいそくで おとどけします。', no:'りょうきんが… たりません!'},
      battle:{hp:580, def:25, role:'support', power:40, lines:['おとどけー!','はんこ ください!','つぎの はいたつが…!'],
        special:{name:'おとどけものです', text:'宅配の おにいさんが 大魔王に 大きな にもつを わたした! 両手が ふさがった。', effect:'debuff_boss'}} },

    { id:'fisher', name:'釣りのおじさん', emoji:'🎣', count:1,
      desc:'池で ずっと 釣りをしてる。今日は まだ 0匹。',
      where:{x:20,y:14},
      how:{type:'favor', text:'えさが ないんだ。雑貨屋の「ゴムのアヒル」を 買ってきてくれ。おとりに なる。', price:0, steps:['雑貨屋で「ゴムのアヒル」を 買う','釣りのおじさんに 話しかける']},
      talk:{before:['しーっ、魚が にげる。','今日は まだ 0匹。きのうも 0匹。','えさが なくてな。'], ok:'おお、これは いい おとりだ。よし、ついていこう。', no:'えさが ないと 釣れないんだ。'},
      battle:{hp:720, def:15, role:'weird', power:45, lines:['釣れた!','しーっ。','大物の よかん!'],
        special:{name:'大魔王を釣る', text:'おじさんが 大魔王に つり糸を なげた。ひっかかった! 大魔王が ころんだ。', effect:'random'}} },

    { id:'magician', name:'手品師', emoji:'🎩', count:1,
      desc:'ぼうしから ハトが 出る。たまに 出ない。トランプが すき。',
      where:{x:7,y:19},
      how:{type:'quest', text:'どっちの 手に コインが ある? 当てたら 仲間に なろう。(ヒント: いつも 左手)', price:0, steps:[],
        question:'コインは どっちの手?', answer:'左手', choices:['右手','左手','ぼうしの中']},
      talk:{before:['さあ、よく 見ていてください。','はい、ハトです。…出ません。','コインは どっちの 手かな?'], ok:'おみごと! 見やぶられては しかたない。ついていきましょう。', no:'ざんねん! 手品は 見やぶれないのです。'},
      battle:{hp:540, def:15, role:'weird', power:45, lines:['はい、ハト!','トランプを えらんで!','タネも シカケも あります。'],
        special:{name:'大魔王を消す?', text:'手品師が 大魔王に ぬのを かけた。「消えました!」…消えてないけど こんらんした。', effect:'random'}} }
  ],

  /* =========================================================
     NPCS: 町の人・ペット・王さま・家族・店の人
     ========================================================= */
  NPCS: [
    { id:'king', name:'王さま', emoji:'🤴', x:12, y:5,
      lines:['おお ゆうしゃよ! …えっと、名前 なんだっけ。','大魔王? となりの町に いるらしいな。わしは 行かんぞ。こしが いたいからの。','ほうびは… そうだな… あとで。あとで な。','さっき 王冠を 落としてな。見つけたら ないしょで もってきてくれ。','兵士の 名前? 2人 いたっけ? まあ がんばってるんじゃろ。','今日の おやつは プリンじゃ。ゆうしゃにも… やらん。','では、たのんだぞ。わしは ひるねの 時間じゃ。'] },
    { id:'princess', name:'お姫さま', emoji:'👸', x:14, y:5,
      lines:['あら、ゆうしゃさん。おとうさま(王さま)は いいかげんでしょう? ごめんなさいね。','わたしは 大魔王より、おとうさまの ひるねの 方が 心配です。','がんばってね。おみやげは いりません。無事に 帰ってきて。'] },
    { id:'mama', name:'ママ', emoji:'👩', x:7, y:6,
      lines:['へっぽこ、ちゃんと ごはん 食べなさいね。','お小づかいは 1,000万G で たりる? たりなかったら 言ってね。たしません。','フライパンと カーテンを 見なかった? …へっぽこ?','大魔王に あったら、ちゃんと あいさつ しなさい。'] },
    { id:'papa', name:'パパ', emoji:'👨', x:8, y:6,
      lines:['おお へっぽこ。パパも むかし ゆうしゃに なりたかったんだ。','ママには ないしょで… これ(50万G)。…ママに 見つかったら パパが おこられる。','がんばれよ。パパは 会社に 行ってくる。'] },

    /* 店の人(SHOPS の店主と おなじ人) */
    { id:'shop_weapon', name:'武器屋のゴンゾウ', emoji:'🧑‍🔧', x:4, y:6,
      lines:['いらっしゃい! 武器なら なんでも あるぞ。ネギも あるぞ。','伝説の剣は ねふだ つきだ。文句は 言わんでくれ。'] },
    { id:'shop_armor', name:'防具屋のタエコ', emoji:'👩‍🔧', x:16, y:10,
      lines:['いらっしゃーい。こたつは 防具よ。だれが なんと 言おうと。','ランドセルは 6年 もつからね。おとく おとく。'] },
    { id:'shop_acc', name:'アクセサリー屋のキラリ', emoji:'💁', x:18, y:15,
      lines:['キラキラしたもの、好き? わたしは 大好き。','金のうんちは 99万9999G。100万に しないのは うんが つくから。'] },
    { id:'shop_zakka', name:'雑貨屋のじいちゃん', emoji:'🧓', x:6, y:14,
      lines:['なんでも あるよ。ないものは ないよ。','ママの愛妻弁当? ママから あずかってる。ないしょに してくれ。'] },

    /* 町の人 */
    { id:'townsman1', name:'おじさん', emoji:'👷', x:10, y:5,
      lines:['大魔王が となりの町に… こまったなあ。','うちの にわの トマトを 大魔王に 食べられないか しんぱいだ。'] },
    { id:'townsman2', name:'おしゃべりなおばさん', emoji:'🙋', x:15, y:5,
      lines:['あらー、へっぽこちゃん! 聞いた? 大魔王が ね! となりの町に ね!','となりの 家の おばさん、あの人 じつは すごく つよいのよ。知ってた?','おばさんの 話は ながいからね。じゃ、またね!'] },
    { id:'kid1', name:'男の子', emoji:'👦', x:9, y:15,
      lines:['ぼくも ゆうしゃに なりたい! なり方 おしえて!','お金持ちは いいなあ。ぼくの お小づかい 500円。'] },
    { id:'kid2', name:'女の子', emoji:'👧', x:11, y:17,
      lines:['大魔王って どんな顔? こわい? それとも へんな顔?','ネコ耳 つけてるの? かわいい!'] },
    { id:'oldman', name:'ベンチのおじいさん', emoji:'🧓', x:13, y:8,
      lines:['むかしは この町にも 魔王が いてなあ…。','…なんの 話だったかな。まあ がんばれ。'] },
    { id:'jogger', name:'ジョギングの人', emoji:'🏃', x:20, y:6,
      lines:['はっ、はっ、はっ。(走りながら)','大魔王まで 走ると 23分 だって。はっ、はっ。'] },
    { id:'police', name:'おまわりさん', emoji:'👮', x:18, y:2,
      lines:['マンホールの ふたが なくなってるんだが… 知らないか?','大魔王の つうほうは 110番じゃなくて、ゆうしゃに たのむよ。'] },
    { id:'konbini', name:'コンビニの店員', emoji:'🙇', x:21, y:12,
      lines:['いらっしゃいませー。おでん あたためますかー。','大魔王も 夜中に おでん 買いに きますよ。ちくわばっかり。'] },
    { id:'farmer', name:'畑のおばさん', emoji:'👩‍🌾', x:2, y:4,
      lines:['大魔王が 来る前に ネギを ぜんぶ とらなきゃ。','ネギ、もっていくかい? いい ぶきに なるよ。'] },
    { id:'ramen', name:'ラーメン屋の店主', emoji:'🍜', x:19, y:20,
      lines:['どんぶり、1こ たりないんだよな…。','大魔王に ラーメン 食わせたら、やさしく なるかもな。'] },
    { id:'baby', name:'赤ちゃん', emoji:'👶', x:5, y:8,
      lines:['ばぶー。','(へっぽこの ふくを ひっぱってる)'] },
    { id:'maiko', name:'まいこさん', emoji:'👘', x:16, y:21,
      lines:['おこしやす。この町にも 和の こころが ありますえ。','帯は きれいに むすんで くださいな。'] },
    { id:'alien_npc', name:'宇宙人(観光中)', emoji:'👽', x:1, y:15,
      lines:['ワレワレハ ウチュウジン ダ。カンコウ デ キタ。','パーツ ヲ オトシタ。ミツケタラ… イヤ、イラナイ。アゲル。'] },
    { id:'lost_slime', name:'まいごの子スライム', emoji:'🔵', x:22, y:4, pet:true,
      lines:['ぷる…ぷる…(まいごに なった みたい)','ぷるん!(おかあさんの ところに もどるみたい)'] },

    /* ペットのモンスター(かわいい) */
    { id:'pet_slime', name:'ペットのスライム', emoji:'🟢', x:10, y:10, pet:true,
      lines:['ぷるぷる〜','ぷるん! ぷるん!'] },
    { id:'pet_bat', name:'ちいさなコウモリ', emoji:'🦇', x:3, y:1, pet:true,
      lines:['キィキィ!','(さかさまに ぶらさがって ねている)'] },
    { id:'pet_mushroom', name:'きのこモンスター', emoji:'🍄', x:19, y:21, pet:true,
      lines:['ぽふぽふ。','(かさの 上に ちょうちょが のってる)'] },
    { id:'pet_dog', name:'町のイヌ', emoji:'🐶', x:13, y:19, pet:true,
      lines:['ワン!','(しっぽを ふっている)'] },
    { id:'pet_turtle', name:'おおきなカメ', emoji:'🐢', x:2, y:1, pet:true,
      lines:['…。(ゆっくり こっちを 見た)','…。(100才 だそうです)'] },
    { id:'pet_ghostcat', name:'おばけネコ', emoji:'😺', x:22, y:22, pet:true,
      lines:['ニャ〜(すけて見える)','(かべを すりぬけた)'] },
    { id:'pet_chick', name:'ひよこ', emoji:'🐥', x:8, y:22, pet:true,
      lines:['ピヨピヨ!','(へっぽこの あとを ついてくる)'] },
    { id:'pet_frog', name:'カエル', emoji:'🐸', x:17, y:3, pet:true,
      lines:['ゲコッ。','ゲコゲコ。(雨が ふるかも)'] },
    { id:'pet_dragon_baby', name:'赤ちゃんドラゴン', emoji:'🥚', x:6, y:21, pet:true,
      lines:['ぷすー(けむりが 出た)','(たまごの からが まだ ついてる)'] },
    { id:'pet_golem', name:'ちいさなゴーレム', emoji:'🪨', x:22, y:14, pet:true,
      lines:['ゴゴゴ…(こっちを 見た)','(花を もっている)'] }
  ],

  /* =========================================================
     BOSS: 大魔王(1回だけの 大決戦)
     move.kind: attack / all / big(予告つき) / heal / taunt / cry / brag / sleep
     ========================================================= */
  BOSS: {
    id:'boss',
    name:'大魔王ドドンガ・ヤミマックス三世',
    emoji:'😈',
    hp: 999999,
    lines: {
      intro: [
        'ドドドド…… 地面が ゆれる……',
        '「よく来たな、ちびっこ。われこそ 大魔王ドドンガ・ヤミマックス三世!」',
        '「三世 と いうのは おじいちゃんも 大魔王 だったからだ。じまんだ。」',
        '「おまえの ような お金持ちの 子に、わがはいが たおせるかな? ふはははは!」'
      ],
      phase2: [
        '「ぬぬっ、ちょっと いたかったぞ。ちょっとだけだ。」',
        '「ふん、本気を 出すのは ここからだ。マントを なおしてからな。」'
      ],
      phase3: [
        '「な、なんだ この 仲間たちは! 近所の おばさんまで いるではないか!」',
        '「わがはいの 部下は どこだ! …やめた? ざんぎょう代?」'
      ],
      phase4: [
        '「ま、まて。はなしあおう。わがはいにも 都合が…」',
        '「おじいちゃん… ごめん… 三世 もう だめかも…」'
      ],
      lose: [
        '「ぐわあああ! こ、こんな ちびっこに…!」',
        '「わがはいは… 帰って… おふろに 入る……」',
        '大魔王ドドンガ・ヤミマックス三世は、となりの町から 出ていった。',
        'そして こう つぶやいた。「つぎは 四世に まかせる…」'
      ],
      win: [
        '「ふはははは! よわい! よわすぎる!」',
        '「おうちに 帰って ママに なぐさめて もらえ! わがはいも 帰る!」',
        '目を さますと、へっぽこは 自分の ベッドの 上だった。ママが となりに いる。',
        '「おかえり。お小づかい、まだ あるでしょ? また 行ってきなさい。」'
      ]
    },
    moves: [
      { id:'claw', name:'やみのツメ', text:'大魔王は やみのツメで ひっかいた! きのう 切ったばかりの ツメだ。', power:2, kind:'attack' },
      { id:'stomp', name:'ドドンガふみつけ', text:'大魔王は 大きな足で ドドンと ふみつけた! 足が ちょっと しびれた。', power:3, kind:'attack' },
      { id:'dark_wave', name:'やみのなみ', text:'大魔王は やみのなみを おこした! みんなに あたった。', power:2, kind:'all' },
      { id:'meteor', name:'大魔王メテオ(予告)', text:'大魔王は 空に 手を かざした! なにか 大きいのが 落ちてくる!', power:6, kind:'big' },
      { id:'breath', name:'まっくろブレス', text:'大魔王は まっくろな いきを はいた! …くさい。', power:4, kind:'all' },
      { id:'heal_self', name:'おやつタイム', text:'大魔王は ポケットの おやつを 食べた! HPが かいふくした。', power:3, kind:'heal' },
      { id:'brag_grandpa', name:'おじいちゃんじまん', text:'大魔王は おじいちゃん(二世)の はなしを はじめた。ながい。', power:0, kind:'brag' },
      { id:'taunt_rich', name:'お金持ちをバカにする', text:'大魔王は「お金で 買った 勇者か」と わらった。自分も おこづかい制なのに。', power:1, kind:'taunt' },
      { id:'cry', name:'ちょっと泣く', text:'大魔王は 部下が いなくなったのを 思い出して ちょっと 泣いた…', power:0, kind:'cry' },
      { id:'sleep', name:'ひるね', text:'大魔王は たたかいの とちゅうで ねむってしまった! ぐー…', power:0, kind:'sleep' },
      { id:'tail', name:'しっぽビンタ', text:'大魔王は しっぽで ビンタした! ペシーン。', power:3, kind:'attack' },
      { id:'ultimate', name:'ヤミマックス(予告)', text:'大魔王の 体が まっくろに 光りはじめた! …ちょっと 時間が かかる。', power:6, kind:'big' }
    ]
  },

  /* =========================================================
     COMMANDS: 無駄コマンド(言葉だけ。効果の数字は 別の人が きめる)
     ========================================================= */
  COMMANDS: [
    { id:'talk', name:'はなしあう', desc:'ちゃんと はなしあう', text:'へっぽこは「ちょっと はなしませんか」と いった!', fail:['大魔王は 聞く気が なさそうだ。','話が ぜんぜん 通じない。','大魔王は スマホを 見はじめた。'] },
    { id:'tsukkomi', name:'ツッコむ', desc:'「なんでやねん」', text:'へっぽこは「なんでやねん」と ツッコんだ!', fail:['大魔王は「…なにが?」と いった。','しーんと した。','仲間だけが わらった。'] },
    { id:'soothe', name:'なだめる', desc:'よしよし する', text:'へっぽこは「よしよし」と なだめた!', fail:['大魔王は「子どもじゃ ない」と いった。','手が とどかなかった。','なだめる 相手を まちがえた。'] },
    { id:'janken', name:'じゃんけん', desc:'大魔王と しょうぶ', text:'へっぽこは「じゃんけん しよう!」と さそった!', fail:['大魔王は ツメしか 出せなかった。','あいこが つづいた。','大魔王は ルールを 知らなかった。'] },
    { id:'ignore', name:'むしする', desc:'あえて 見ない', text:'へっぽこは 大魔王を 見ないで 空を 見た!', fail:['大魔王は 気づかなかった。','雲が ひつじの 形だった。','むしして いるのを むしされた。'] },
    { id:'dajare', name:'ダジャレ', desc:'さむい ギャグ', text:'へっぽこは「ふとんが ふっとんだ!」と いった!', fail:['さむくなった。','大魔王は 鼻で わらった。','仲間が 聞いていない ふりを した。'] },
    { id:'tea', name:'お茶をいれる', desc:'きゅうすで いっぷく', text:'へっぽこは お茶を いれて 大魔王に 出した!', fail:['あつすぎた。','大魔王は 湯のみを 見つめた。','お茶の はっぱが うかんでいた。'] },
    { id:'glare', name:'にらむ', desc:'じーっと にらむ', text:'へっぽこは 大魔王を じーっと にらんだ!', fail:['目が かわいた。','大魔王は 見ていなかった。','にらみすぎて 目が 合った。きまずい。'] },
    { id:'sorry', name:'あやまる', desc:'とりあえず あやまる', text:'へっぽこは「ごめんなさい」と あやまった!', fail:['大魔王は「なにを?」と いった。','大魔王は 聞いていなかった。','大魔王は ちょっと 気まずそうに した。'] },
    { id:'flee', name:'にげたい', desc:'にげたいと いう', text:'へっぽこは「にげたい…」と つぶやいた!', fail:['でも 足が うごかない!','大魔王は 出口を ふさいだ!','にげたい 気持ちだけが にげていった!'] },
    { id:'fake', name:'こうげきのふり', desc:'こうげき する ふりだけ', text:'へっぽこは こうげきの ふりを した。「えいっ(ふり)」', fail:['大魔王は だまされなかった。','大魔王は「ふり だな」と 見ぬいた。','ふりが へたすぎて 仲間が わらった。'] },
    { id:'cry', name:'なく', desc:'えーんと なく', text:'へっぽこは 大声で ないた。えーん…。', fail:['大魔王は こまった顔を した。','なみだで 前が 見えない!','仲間が ティッシュを くれた。'] },
    { id:'boast', name:'じまんする', desc:'お金持ちを じまん', text:'へっぽこは「うちは お金持ちだぞ」と じまんした!', fail:['大魔王は「で?」と いった。','大魔王は きょうみが なさそうだ。','仲間が ちょっと ひいた。'] },
    { id:'money', name:'お金をみせる', desc:'札束を ちらっと', text:'へっぽこは 札束を ちらっと 見せた!', fail:['大魔王は 目を そらした。…ちょっと 見た。','大魔王は「わいろは きかん」と いった。','風で 1まい とんでいった!'] },
    { id:'praise', name:'ほめる', desc:'大魔王を ほめる', text:'へっぽこは「ツノが かっこいいですね」と ほめた!', fail:['大魔王は てれた。だけ。','大魔王は「知ってる」と いった。','ほめすぎて うそっぽく なった。'] },
    { id:'sleep', name:'ねる', desc:'その場で ねる', text:'へっぽこは その場で ねた。ぐー…', fail:['大魔王は 毛布を かけてくれた。それだけ。','ねすぎて 1ターン むだに した!','ゆめの中でも 大魔王が いた!'] },
    { id:'dance', name:'おどる', desc:'へんな おどり', text:'へっぽこは へんな おどりを おどった!', fail:['大魔王は 手びょうしを した。だけ。','だれも 見ていなかった。','おどりすぎて 息が きれた!'] },
    { id:'sing', name:'うたう', desc:'大きな声で うたう', text:'へっぽこは 大きな声で うたった。ラララ〜♪', fail:['おんちだった。','大魔王は 耳を ふさいだ。だけ。','さびで 歌詞を わすれた!'] },
    { id:'hungry', name:'おなかすいた', desc:'おなかが すいたと いう', text:'へっぽこは「おなか すいた…」と いった!', fail:['大魔王も「おれも」と いった。','ぐうううと おなかが なった。','仲間が おにぎりを くれた。おいしい。'] },
    { id:'pray', name:'いのる', desc:'手を あわせて いのる', text:'へっぽこは 目を とじて いのった!', fail:['なにも おきなかった。','大魔王も いっしょに いのった。','いのりすぎて 1ターン たった。'] },
    { id:'photo', name:'じどり', desc:'大魔王と じどり', text:'へっぽこは 大魔王と じどりを とった。パシャ。', fail:['大魔王は ピースした。だけ。','ぶれた。','大魔王の ほうが うつりが よかった。'] },
    { id:'pout', name:'すねる', desc:'ぷいっと すねる', text:'へっぽこは ぷいっと すねた!', fail:['大魔王は どうすれば いいか わからない。','仲間が「元気 出して」と 言った。','すねている 間に 大魔王は おやつを 食べた。'] },
    { id:'mama', name:'ママをよぶ', desc:'大声で ママを よぶ', text:'へっぽこは「ママー」と 大声で よんだ!', fail:['ママは 買いもの中だった。','大魔王も 自分の ママを 思い出した。','声が とどかなかった。'] },
    { id:'play_dead', name:'しんだふり', desc:'ばたんと たおれる', text:'へっぽこは ばたんと たおれて しんだふりを した!', fail:['大魔王は つんつん した。','目が あいてるのが バレた。','へっぽこは ふりの まま ねむりかけた。'] },
    { id:'tickle', name:'こちょこちょ', desc:'大魔王を くすぐる', text:'へっぽこは 大魔王を こちょこちょ した!', fail:['大魔王は くすぐりに つよかった。','大魔王の 体は かたかった。','こちょこちょ しすぎて 手が つかれた。'] },
    { id:'hug', name:'だきつく', desc:'ぎゅっと だきつく', text:'へっぽこは 大魔王に ぎゅっと だきついた!', fail:['大魔王は ちょっと あたたかかった。','大魔王は かたまった。','大魔王は「はなせ」と 言った。それだけ。'] },
    { id:'count', name:'かずをかぞえる', desc:'1から かぞえる', text:'へっぽこは「1、2、3…」と かぞえはじめた!', fail:['10で あきた。','大魔王も いっしょに かぞえた。','とちゅうで 何を かぞえてるか わすれた。'] },
    { id:'space_out', name:'ぼーっとする', desc:'なにも しない', text:'へっぽこは ぼーっと した…', fail:['雲が きれいだった。','大魔王も ぼーっと した。','1ターン すぎた。'] },
    { id:'homework_cmd', name:'しゅくだい', desc:'宿題を はじめる', text:'へっぽこは 宿題を はじめた!', fail:['大魔王が 答えを おしえてくれた。まちがってた。','1もんも とけなかった。','やる気が 出なかった。'] },
    { id:'onigiri', name:'おにぎりたべる', desc:'もぐもぐ 食べる', text:'へっぽこは おにぎりを もぐもぐ 食べた!', fail:['うめぼしだった。すっぱい。','大魔王が「ひとくち」と 言った。あげなかった。','のみこむのに 時間が かかった。'] },
    { id:'greet', name:'あいさつ', desc:'ていねいに あいさつ', text:'へっぽこは「こんにちは、へっぽこです」と あいさつした!', fail:['大魔王も「こんにちは」と 言った。それだけ。','ていねいすぎて ながかった。','おじぎで 頭を ぶつけた!'] },
    { id:'mimic', name:'ものまね', desc:'大魔王の ものまね', text:'へっぽこは 大魔王の ものまねを した。「ふはははは」', fail:['にていなかった。','大魔王は「もっと ひくい声だ」と ちゅういした。','仲間が ちがう人の まねだと 思った。'] },
    { id:'riddle_cmd', name:'なぞなぞ', desc:'大魔王に なぞなぞ', text:'へっぽこは なぞなぞを 出した! 「パンは パンでも…」', fail:['大魔王は 答えを 知っていた。','大魔王は かんがえこんで しまった。','へっぽこが 答えを わすれた。'] },
    { id:'lecture', name:'おせっきょう', desc:'大魔王を しかる', text:'へっぽこは「人に めいわくを かけては いけません」と おせっきょうした!', fail:['大魔王は 下を 向いた。だけ。','ママの まねだと バレた。','話が ながくなった。'] },
    { id:'toilet', name:'トイレ', desc:'トイレに 行きたい', text:'へっぽこは「トイレ 行っていいですか」と きいた!', fail:['大魔王は「あっち」と おしえてくれた。','がまんすることに した。','トイレは なかった。'] },
    { id:'sneeze', name:'くしゃみ', desc:'大きな くしゃみ', text:'へっぽこは 大きな くしゃみを した。はっくしょん!', fail:['大魔王は「おだいじに」と 言った。','はなみずが 出た。','つづけて 3回 出た。'] }
  ],

  /* =========================================================
     SHOPS: 4つの店(すべての ITEMS が どこかの店に ある)
     ========================================================= */
  SHOPS: [
    { id:'weapon', name:'武器屋', emoji:'⚔️', owner:'ゴンゾウ', npc:'shop_weapon', x:5, y:7,
      talk:{ hello:'いらっしゃい! 武器屋 ゴンゾウだ。ネギから 伝説の剣まで、なんでも あるぞ!', buy:'よし、買ったな! だいじに つかえ。たたいても いいぞ。', poor:'おっと、お金が たりねえな。ママに 言ってみるか?' },
      items:['wooden_stick','oden_skewer','leek','frying_pan','wet_umbrella','magic_wand','steel_sword','bundle_of_bills','legend_sword',
             'tool_belt','dumbbell','granny_dentures','octopus_hat','fake_snake','rope','stilts'] },

    { id:'armor', name:'防具屋', emoji:'🛡️', owner:'タエコ', npc:'shop_armor', x:15, y:10,
      talk:{ hello:'いらっしゃーい。防具屋 タエコよ。こたつも 防具。おふとんも 防具。いいわね?', buy:'まいど! きるだけで つよくなる。気分がね。', poor:'あら、お金が たりないわ。まけては あげないわよ。' },
      items:['cardboard_shield','pot_lid','wooden_shield','randoseru','manhole','hero_shield',
             'leather_cap','bucket','bike_helmet','steel_helm','fake_crown',
             'cloth_armor','bubble_wrap','cardboard_robot','pajamas','school_uniform','kotatsu','fur_coat','mithril_armor',
             'raincoat','curtain','futon','hero_cape','solar_panel',
             'leather_belt','inner_tube','sumo_mawashi','champion_belt',
             'leather_boots','rain_boots','roller_skates','spring_shoes','iron_boots',
             'mosquito_net','hero_mask','eye_patch'] },

    { id:'accessory', name:'アクセサリー屋', emoji:'💎', owner:'キラリ', npc:'shop_acc', x:18, y:14,
      talk:{ hello:'いらっしゃい。アクセサリー屋 キラリです。キラキラも、キラキラじゃないのも あります。', buy:'おにあい! うんも ついてくるかもね。', poor:'あら、ざんねん。キラキラは おあずけ。' },
      items:['rubber_band','washer','toy_ring','key_ring','mood_ring','smartwatch','power_ring','diamond_ring',
             'receipt','bell','omamori','wrinkled_bill','four_leaf','daruma','lucky_cat','alien_part','magic_stone','gold_poop',
             'neko_ears','sunglasses','obi','fake_wings','light_sneakers'] },

    { id:'zakka', name:'雑貨屋(なんでも屋)', emoji:'🏪', owner:'じいちゃん', npc:'shop_zakka', x:6, y:13,
      talk:{ hello:'なんでも あるよ。なんでも 売るよ。おべんとうも スマホも 宿題も。', buy:'はいよ。ふくろは いるかい? 5G だよ。', poor:'お金が ないなら 見てるだけに しとこう。見るのは ただ。' },
      items:['rubber_duck','smartphone','homework','pizza_box','plushie','mama_bento',
             'party_hat','rice_bowl','pudding_hat','alien_antenna',
             'red_nose','glasses_3d','fake_glasses','face_pack','snorkel',
             'apron','rice_cooker',
             'towel','ghost_sheet','furoshiki_cape',
             'fanny_pack',
             'slippers','geta','swim_fins',
             'onion_ring','donut'] }
  ],

  /* =========================================================
     TEXTS: オープニング・タイトル・勝ち負け・ポーズ
     ========================================================= */
  TEXTS: {
    title: {
      greeting: 'ようこそ、へっぽこの 小さな冒険へ。',
      start: 'はじめから',
      resume: 'つづきから',
      hint: 'お金で 勇者に なろう。'
    },
    opening: [
      'ある日、となりの町に 大魔王が あらわれた。',
      'みんな こまっている。王さまは ひるねをしている。',
      'この町に、勇者に あこがれる 子がいた。名前は へっぽこ。',
      'へっぽこの 家は、とても とても お金持ちだった。',
      'ママは 言った。「お小づかい 1,000万G あげる。これで 勇者に なってきなさい。」',
      'へっぽこは 思った。「お金で そうびを そろえて、お金で 仲間を あつめれば…」',
      '「ぼくも 勇者に なれるかも!」',
      'こうして、へっぽこの 小さくて 大きな 冒険が はじまった。'
    ],
    beforeBoss: [
      'となりの町が 見えてきた。空が まっくろだ。',
      'ここから 先は 一回だけの 大決戦。もどれない。',
      'そうびと 仲間は そろった? よし、行こう!'
    ],
    victory: [
      '大魔王は にげていった! へっぽこと 仲間たちの 勝ちだ!',
      'となりの町に 光が もどった。みんなが はくしゅ している。',
      '王さまは「わしは しんじていた!」と 言った。(ひるねしていた)',
      'ママは 言った。「おかえり。おつりは?」',
      'へっぽこは、ほんとうの 勇者に なった。…お金も つかったけど。',
      'さあ、みんなで 記念写真を とろう!'
    ],
    defeat: [
      'へっぽこは まけてしまった…。',
      '気がつくと、町の 自分の ベッドの 上だった。',
      'ママ:「お小づかい、まだ のこってるでしょ? そうびを 見なおして また 行きなさい。」',
      'お金持ちだから、だいじょうぶ。もう一度 がんばろう!'
    ],
    poses: [
      { id:'hero', name:'勇者の構え', emoji:'🗡️' },
      { id:'peace', name:'ピース', emoji:'✌️' },
      { id:'smug', name:'ドヤ顔', emoji:'😏' },
      { id:'jump', name:'大ジャンプ', emoji:'🙌' },
      { id:'money', name:'札束ばらまき', emoji:'💸' },
      { id:'sleep', name:'ねむりポーズ', emoji:'😴' }
    ],
    photoCaption: 'へっぽこと 仲間たち — 大魔王を たおした日',
    money: { unit:'G', start: 10000000, allowanceFromPapa: 500000 }
  }
};
