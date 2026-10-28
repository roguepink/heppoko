#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
勇者へっぽこ — ボス戦(大魔王)のバランス確認シミュレーション
設計書 docs/design-battle.md の数字と同じルールで、何千回も戦わせて勝率を出す。

使い方:  python3 sim_battle.py            # 表を出す(1組み合わせ 2000回)
         python3 sim_battle.py --n 500    # 回数を変える
         python3 sim_battle.py --one      # 1回だけ、ターンごとのログを出す
"""
import random, sys, statistics

# ============================================================
# 1. 数字(設計書と同じ。ここを変えたら設計書も変える)
# ============================================================
BOSS_MAX_HP   = 999_999
DMG_SCALE_HERO = 20      # へっぽこ: 威力 × (こうげき合計 × 20 + 200)
DMG_SCALE_COMP = 115     # 仲間:   パワー × 150
BOSS_ATK_SINGLE = 900    # 通常攻撃(1人に)
BOSS_ATK_ALL    = 450    # 全体攻撃(全員に)
BOSS_ATK_BIG    = 2000    # 大技(予告つき・全員に)
BOSS_HEAL_RATE  = 0.08   # 回復 8%(第3フェーズ、最大2回)
DEF_K           = 100    # 受けるダメージ = 攻撃 × 100 ÷ (100 + 守り)
GUARD_BIG_MUL   = 0.2    # guard の仲間がいると 大技のダメージ ×0.2(2人なら ×0.1)
HERO_GUARD_MUL  = 0.3    # へっぽこが「まもる」→ 自分へのダメージ ×0.3
COMBO_TURN_LIMIT = 1     # 同じ気分へのコンボは 1回だけ効く(連打ふうじ)

# フェーズ: HP割合 → (名前, 攻撃倍率, 行動の重み)
# 重み: normal(通常) all(全体) charge(大技の予告) heal(回復) mood(気分だけ出して攻撃しない)
PHASES = [
    (0.70, dict(name='よゆう',  atk=1.0, w=dict(normal=45, all=20, charge=0,  heal=0,  mood=35), charge_gap=99, mood_p=0.6,
                moods=['boast','taunt','laugh','sleepy'])),
    (0.40, dict(name='いらいら', atk=1.2, w=dict(normal=35, all=25, charge=20, heal=0,  mood=20), charge_gap=3,  mood_p=0.5,
                moods=['angry','boast','sleepy','taunt','hungry'])),
    (0.15, dict(name='あせり',  atk=1.5, w=dict(normal=30, all=25, charge=25, heal=10, mood=10), charge_gap=3,  mood_p=0.5,
                moods=['cry','hungry','lonely','angry','laugh'])),
    (0.00, dict(name='ほんき',  atk=2.0, w=dict(normal=25, all=35, charge=40, heal=0,  mood=0),  charge_gap=2,  mood_p=0.3,
                moods=['angry'])),
]

# 気分の受け身の効果(その気分の間ずっと)
MOOD_PASSIVE = {
    'normal':  dict(atk=1.0, dmg_taken=1.0, skip=0.0),
    'angry':   dict(atk=1.4, dmg_taken=1.1, skip=0.0),   # 怒り: 強いが受けるダメージも増える
    'boast':   dict(atk=1.0, dmg_taken=0.7, skip=0.0),   # 自慢: 守りがかたい(ほめると0に)
    'cry':     dict(atk=0.7, dmg_taken=1.0, skip=0.0),
    'sleepy':  dict(atk=1.0, dmg_taken=1.0, skip=0.4),
    'taunt':   dict(atk=1.0, dmg_taken=1.0, skip=0.0),
    'hungry':  dict(atk=0.8, dmg_taken=1.0, skip=0.0),
    'lonely':  dict(atk=1.0, dmg_taken=1.0, skip=0.0),
    'laugh':   dict(atk=1.0, dmg_taken=1.0, skip=0.3),
    'charge':  dict(atk=1.0, dmg_taken=1.0, skip=0.0),   # ためている(次ターン大技)
    'careless':dict(atk=1.0, dmg_taken=2.0, skip=0.0),   # 油断(ほめられた後 2ターン)
    'asleep':  dict(atk=1.0, dmg_taken=1.5, skip=1.0),   # 眠っている(2ターン)
    'shaken':  dict(atk=1.0, dmg_taken=1.0, skip=1.0),   # 動揺(1ターン何もしない)
}
MOOD_DURATION = {'angry':2,'boast':2,'cry':2,'sleepy':2,'taunt':2,'hungry':2,'lonely':2,'laugh':2,
                 'careless':2,'asleep':2,'shaken':1}

# 「気分 × コマンド」の最強コンボ(設計書の表の、プレイヤーが選ぶ最良手)
# 値: (心のダメージ 割合, 気分を消すか, 追加効果)
BEST_COMBO = {
    'angry':  ('sorry',   0.12, 'clear'),
    'boast':  ('praise',  0.00, 'careless'),   # 油断 → 2ターン 受けるダメージ2倍
    'cry':    ('cry',     0.15, 'clear'),      # もらい泣き
    'sleepy': ('sing',    0.00, 'asleep'),     # 子守歌 → 2ターン眠る
    'taunt':  ('ignore',  0.06, 'shaken'),     # 無視 → 動揺 1ターン
    'hungry': ('onigiri', 0.10, 'clear'),
    'lonely': ('talk',    0.10, 'calm'),       # 話し合う → 3ターン 攻撃×0.7
    'laugh':  ('tsukkomi',0.08, 'clear'),
}

# ============================================================
# 2. 装備(弱・中・強)と仲間
# ============================================================
# へっぽこの素の力
HERO_BASE = dict(hp=100, atk=3, def_=2, spd=5, luck=5)
# 10部位ぶんの合計(装備レベルごと)。値段は目安。
GEAR = {
    '弱': dict(hp=200,  atk=45,  def_=28,  spd=6,  luck=6,  price=120_000,   best_power=1.2),
    '中': dict(hp=600,  atk=160, def_=100, spd=18, luck=20, price=1_800_000, best_power=1.5),
    '強': dict(hp=1200, atk=350, def_=220, spd=38, luck=40, price=6_200_000, best_power=1.8),
}

# 仲間 10組(「お金で買える最強寄り」の例)。power は 1回の攻撃の基本値、count は人数
COMPANIONS_10 = [
    dict(name='隣の家のおばさん',   role='attack',  power=70, hp=1500, def_=30, count=1,   price=0),
    dict(name='せんし',             role='attack',  power=45, hp=1200, def_=40, count=1,   price=600_000),
    dict(name='まほうつかい',       role='attack',  power=50, hp=700,  def_=10, count=1,   price=700_000),
    dict(name='小人700人の群れ',    role='attack',  power=40, hp=2000, def_=5,  count=700, price=350_000),
    dict(name='元・手下モンスター', role='guard',   power=40, hp=1800, def_=35, count=12,  price=0),
    dict(name='鉄壁のおじいちゃん', role='guard',   power=35, hp=1600, def_=50, count=1,   price=500_000),
    dict(name='そうりょ',           role='heal',    power=35, hp=800,  def_=15, count=1,   price=800_000),
    dict(name='スマホ少女',         role='heal',    power=30, hp=600,  def_=10, count=1,   price=0),
    dict(name='王様のへいたい',     role='support', power=30, hp=1000, def_=30, count=1,   price=400_000),
    dict(name='本当の遊び人',       role='weird',   power=45, hp=900,  def_=15, count=1,   price=0),
]
COMPANIONS_6 = [COMPANIONS_10[i] for i in (0,1,3,4,6,9)]   # 攻3 守1 回1 変1
COMPANIONS_3 = [COMPANIONS_10[i] for i in (1,3,6)]         # 攻2 回1

# ============================================================
# 3. 戦闘のロジック(JS に移しやすいように、純粋な関数ふうに)
# ============================================================
def rnd(a, b):
    return random.uniform(a, b)

def phase_of(boss_hp):
    r = boss_hp / BOSS_MAX_HP
    for th, ph in PHASES:
        if r > th:
            return ph
    return PHASES[-1][1]

def damage_to_party(base, atk_mul, target_def):
    raw = base * atk_mul * rnd(0.9, 1.1)
    return int(raw * DEF_K / (DEF_K + target_def))

def hero_attack_damage(hero, power, boss_mood, party_buff):
    base = power * (hero['atk'] * DMG_SCALE_HERO + 200) * rnd(0.9, 1.1)
    crit = 2.0 if random.random() < min(0.3, hero['luck'] / 100) else 1.0
    return int(base * crit * MOOD_PASSIVE[boss_mood]['dmg_taken'] * party_buff)

def comp_attack_damage(c, boss_mood, party_buff, mul=1.0):
    alive_ratio = c['hp'] / c['max_hp']
    crowd = (0.5 + 0.5 * alive_ratio) if c['count'] > 1 else 1.0   # 数の力: 減ると弱くなる
    base = c['power'] * DMG_SCALE_COMP * rnd(0.85, 1.15) * crowd * mul
    return int(base * MOOD_PASSIVE[boss_mood]['dmg_taken'] * party_buff)

# ============================================================
# 4. 1回の戦い
# ============================================================
class Battle:
    def __init__(self, gear, comps, skill=0.7, log=False):
        g = GEAR[gear]
        self.hero = dict(hp=HERO_BASE['hp']+g['hp'], max_hp=HERO_BASE['hp']+g['hp'],
                         atk=HERO_BASE['atk']+g['atk'], def_=HERO_BASE['def_']+g['def_'],
                         spd=HERO_BASE['spd']+g['spd'], luck=HERO_BASE['luck']+g['luck'],
                         best_power=g['best_power'])
        self.comps = []
        for c in comps:
            cc = dict(c); cc['max_hp'] = c['hp']; cc['revive_left'] = 1 if c['role']=='heal' else 0
            self.comps.append(cc)
        self.boss_hp = BOSS_MAX_HP
        self.mood = 'normal'; self.mood_left = 0
        self.charged = False          # 予告ずみ(次の行動は大技)
        self.last_charge_turn = -99
        self.heals_left = 2
        self.calm_left = 0            # 話し合い後 攻撃×0.7
        self.mama_used = False
        self.combo_used = {}          # 気分ごとに1回
        self.skill = skill            # プレイヤーがヒントに気づいて正しい手を選ぶ確率
        self.turn = 0
        self.log = log
        self.combos_hit = 0
        self.known_phase = None

    def say(self, s):
        if self.log: print(f'  {s}')

    def alive_comps(self):
        return [c for c in self.comps if c['hp'] > 0]

    # ---------- へっぽこのコマンド ----------
    def hero_command(self):
        """返す: ('attack'|'guard'|'combo'|'mama'|'wasted', info)"""
        h = self.hero
        if not self.mama_used and h['hp'] < h['max_hp'] * 0.35:
            return ('mama', None)
        if self.mood == 'charge':
            # 予告中。guard がいなければ まもる、いても 70% まもる
            if random.random() < (0.95 if not any(c['role']=='guard' for c in self.alive_comps()) else 0.7):
                return ('guard', None)
        if self.mood in BEST_COMBO and not self.combo_used.get(self.mood):
            if random.random() < self.skill:
                return ('combo', BEST_COMBO[self.mood])
            # 気づかない → 無駄コマンドを押して外す(たまに笑える小ダメージ)ことにして、ここでは攻撃
        return ('attack', None)

    def apply_hero(self, cmd, info, party_buff):
        h = self.hero
        if cmd == 'attack':
            d = hero_attack_damage(h, h['best_power'], self.mood, party_buff)
            self.boss_hp -= d; self.say(f'へっぽこ こうげき {d:,}')
            return False
        if cmd == 'guard':
            self.say('へっぽこ まもる'); return True
        if cmd == 'mama':
            self.mama_used = True
            h['hp'] = h['max_hp']
            for c in self.comps:
                if c['hp'] > 0: c['hp'] = c['max_hp']
            self.say('ママを呼ぶ → 全員 全回復!'); return False
        if cmd == 'combo':
            name, rate, eff = info
            d = int(BOSS_MAX_HP * rate)
            self.boss_hp -= d; self.combos_hit += 1
            self.combo_used[self.mood] = True
            self.say(f'コンボ {name} 心のダメージ {d:,} ({eff})')
            if eff == 'clear':
                self.set_mood('normal')
            elif eff == 'calm':
                self.calm_left = 3; self.set_mood('normal')
            else:
                self.set_mood(eff)
            return False
        return False

    # ---------- 仲間 ----------
    def companions_act(self, hero_guarding):
        party_buff = 1.0
        guard_count = 0
        # support の バフは このターンの仲間全員に先に効く(順番: support → ほか)
        order = sorted(self.alive_comps(), key=lambda c: 0 if c['role']=='support' else 1)
        for c in order:
            r = c['role']
            if r == 'support':
                k = self.turn % 3
                if k == 0:
                    party_buff = 1.25; self.say(f'{c["name"]} こうげきの歌 ×1.25')
                elif k == 1:
                    self.party_def_buff = 0.75; self.say(f'{c["name"]} まもりの旗 ×0.75')
                else:
                    d = comp_attack_damage(c, self.mood, party_buff, 0.6); self.boss_hp -= d
                    self.say(f'{c["name"]} こうげき {d:,}')
            elif r == 'attack':
                d = comp_attack_damage(c, self.mood, party_buff); self.boss_hp -= d
                self.say(f'{c["name"]} こうげき {d:,}')
            elif r == 'guard':
                if self.mood == 'charge':
                    guard_count += 1; self.say(f'{c["name"]} まもりの構え!')
                else:
                    d = comp_attack_damage(c, self.mood, party_buff, 0.6); self.boss_hp -= d
                    self.say(f'{c["name"]} こうげき {d:,}')
            elif r == 'heal':
                targets = [self.hero] + self.alive_comps()
                low = min(targets, key=lambda t: t['hp']/t['max_hp'])
                downed = [x for x in self.comps if x['hp'] <= 0]
                if self.hero['hp'] < self.hero['max_hp']*0.6:
                    amt = int(c['power'] * 12); self.hero['hp'] = min(self.hero['max_hp'], self.hero['hp']+amt)
                    self.say(f'{c["name"]} へっぽこを回復 {amt}')
                elif downed and c['revive_left'] > 0:
                    c['revive_left'] -= 1; t = downed[0]; t['hp'] = t['max_hp']//2
                    self.say(f'{c["name"]} {t["name"]} をよびもどした!')
                elif low['hp'] < low['max_hp']*0.5:
                    amt = int(c['power'] * 12); low['hp'] = min(low['max_hp'], low['hp']+amt)
                    self.say(f'{c["name"]} {low["name"]} を回復 {amt}')
                else:
                    d = comp_attack_damage(c, self.mood, party_buff, 0.4); self.boss_hp -= d
                    self.say(f'{c["name"]} こうげき {d:,}')
            elif r == 'weird':
                roll = random.random()
                if roll < 0.15:
                    d = comp_attack_damage(c, self.mood, party_buff, 3.0); self.boss_hp -= d
                    self.say(f'{c["name"]} なぜか大当たり {d:,}')
                elif roll < 0.30:
                    for t in [self.hero] + self.alive_comps():
                        t['hp'] = min(t['max_hp'], t['hp'] + int(t['max_hp']*0.2))
                    self.say(f'{c["name"]} みんな元気に 20%回復')
                elif roll < 0.55:
                    self.say(f'{c["name"]} 昼寝している')
                elif roll < 0.70:
                    if self.mood not in ('charge','asleep','careless'):
                        m = random.choice(['angry','boast','cry','sleepy','taunt','hungry','lonely','laugh'])
                        self.set_mood(m); self.say(f'{c["name"]} 大魔王の気分を変えた → {m}')
                elif roll < 0.80:
                    c['hp'] = max(1, c['hp'] - int(c['max_hp']*0.2)); self.say(f'{c["name"]} 自分でころんだ')
                elif roll < 0.90:
                    if self.mood not in ('charge','asleep','careless'):
                        self.set_mood('laugh'); self.say(f'{c["name"]} 大魔王を笑わせた')
                else:
                    self.boss_hp = min(BOSS_MAX_HP, self.boss_hp + int(BOSS_MAX_HP*0.01))
                    self.say(f'{c["name"]} まちがえて大魔王を回復 1%')
        return guard_count

    # ---------- 大魔王 ----------
    def set_mood(self, m):
        self.mood = m; self.mood_left = MOOD_DURATION.get(m, 0)

    def boss_act(self, hero_guarding, guard_count):
        ph = phase_of(self.boss_hp)
        atk = ph['atk'] * MOOD_PASSIVE[self.mood]['atk'] * (0.7 if self.calm_left > 0 else 1.0)
        def_buff = getattr(self, 'party_def_buff', 1.0)
        self.party_def_buff = 1.0
        if self.calm_left > 0: self.calm_left -= 1

        # 動けない気分
        if self.mood in ('asleep', 'shaken'):
            self.say(f'大魔王は {self.mood} で 動けない')
            self.tick_mood(); return
        if random.random() < MOOD_PASSIVE[self.mood]['skip']:
            self.say(f'大魔王は {self.mood} で ぼんやりしている'); self.tick_mood(); return

        # 予告していたら 大技
        if self.mood == 'charge':
            mul = atk
            for t in [self.hero] + self.alive_comps():
                d = damage_to_party(BOSS_ATK_BIG, mul, t['def_'])
                if guard_count >= 1: d = int(d * (GUARD_BIG_MUL if guard_count == 1 else GUARD_BIG_MUL/2))
                if t is self.hero and hero_guarding: d = int(d * HERO_GUARD_MUL)
                d = int(d * def_buff)
                t['hp'] -= d
            self.say(f'大魔王の大技!! (guard {guard_count}, へっぽこまもる {hero_guarding})')
            self.set_mood('normal'); self.charged = False
            return

        # 行動を選ぶ
        w = dict(ph['w'])
        if self.turn - self.last_charge_turn < ph['charge_gap']: w['charge'] = 0
        if self.heals_left <= 0: w['heal'] = 0
        total = sum(w.values()); r = random.random() * total; acc = 0
        for k, v in w.items():
            acc += v
            if r < acc: act = k; break

        if act == 'normal':
            targets = [self.hero]*35 + [c for c in self.alive_comps() for _ in range(max(1, 65 // max(1, len(self.alive_comps()))))]
            t = random.choice(targets)
            d = int(damage_to_party(BOSS_ATK_SINGLE, atk, t['def_']) * def_buff)
            if t is self.hero and hero_guarding: d = int(d * HERO_GUARD_MUL)
            t['hp'] -= d; self.say(f'大魔王 通常攻撃 → {t["name"] if t is not self.hero else "へっぽこ"} {d}')
        elif act == 'all':
            for t in [self.hero] + self.alive_comps():
                d = int(damage_to_party(BOSS_ATK_ALL, atk, t['def_']) * def_buff)
                if t is self.hero and hero_guarding: d = int(d * HERO_GUARD_MUL)
                t['hp'] -= d
            self.say('大魔王 全体攻撃')
        elif act == 'charge':
            self.set_mood('charge'); self.last_charge_turn = self.turn
            self.say('大魔王は 力をためはじめた!(予告)'); return
        elif act == 'heal':
            self.heals_left -= 1
            self.boss_hp = min(BOSS_MAX_HP, self.boss_hp + int(BOSS_MAX_HP*BOSS_HEAL_RATE))
            self.say('大魔王 回復 8%')
        elif act == 'mood':
            self.set_mood(random.choice(ph['moods'])); self.say(f'大魔王の気分 → {self.mood}'); return

        # 攻撃のあと、気分が変わることがある
        if self.mood == 'normal' and random.random() < ph['mood_p']:
            self.set_mood(random.choice(ph['moods'])); self.say(f'(気分 → {self.mood})')
        else:
            self.tick_mood()

    def tick_mood(self):
        if self.mood in MOOD_DURATION:
            self.mood_left -= 1
            if self.mood_left <= 0: self.mood = 'normal'

    # ---------- 1戦 ----------
    def run(self, max_turns=40):
        self.party_def_buff = 1.0
        while self.turn < max_turns:
            self.turn += 1
            ph = phase_of(self.boss_hp)
            if ph['name'] != self.known_phase:
                self.known_phase = ph['name']
                if ph['name'] == 'いらいら' and self.mood != 'charge': self.set_mood('angry')
                if ph['name'] == 'あせり' and self.mood != 'charge': self.set_mood('cry')
                if ph['name'] == 'ほんき' and self.turn - self.last_charge_turn >= 1:
                    self.set_mood('charge'); self.last_charge_turn = self.turn
            if self.log: print(f'--- ターン{self.turn} 大魔王HP {max(0,self.boss_hp):,} ({ph["name"]}) 気分:{self.mood} へっぽこHP {self.hero["hp"]}/{self.hero["max_hp"]} 仲間{len(self.alive_comps())}')
            cmd, info = self.hero_command()
            hero_guarding = self.apply_hero(cmd, info, 1.0)
            if self.boss_hp <= 0: return ('win', self.turn)
            guard_count = self.companions_act(hero_guarding)
            if self.boss_hp <= 0: return ('win', self.turn)
            self.boss_act(hero_guarding, guard_count)
            if self.hero['hp'] <= 0: return ('lose', self.turn)
        return ('lose', self.turn)   # 長すぎたら負け扱い(実際は時間切れなし)

# ============================================================
# 5. 表を出す
# ============================================================
def table(n=2000, skill=0.7):
    comps_sets = {'3組': COMPANIONS_3, '6組': COMPANIONS_6, '10組': COMPANIONS_10}
    print(f'\n■ 勝率(各 {n} 回)  プレイヤーのうまさ={skill}(ヒントに気づいて正しいコマンドを選ぶ確率)')
    print('| 装備 \\ 仲間 | 3組 | 6組 | 10組 | 勝ったときの平均ターン(10組) |')
    print('|---|---|---|---|---|')
    for gear in ('弱', '中', '強'):
        row = []; turns = []
        for label, comps in comps_sets.items():
            wins = 0; tsum = []
            for _ in range(n):
                b = Battle(gear, comps, skill=skill)
                res, t = b.run()
                if res == 'win': wins += 1; tsum.append(t)
            row.append(f'{100*wins/n:5.1f}%')
            if label == '10組': turns = tsum
        avg = f'{statistics.mean(turns):.1f}' if turns else '-'
        print(f'| {gear} | ' + ' | '.join(row) + f' | {avg} |')

if __name__ == '__main__':
    args = sys.argv[1:]
    n = 2000
    if '--n' in args: n = int(args[args.index('--n')+1])
    if '--one' in args:
        random.seed(int(args[args.index('--one')+1]) if len(args) > args.index('--one')+1 else None)
        b = Battle('強', COMPANIONS_10, skill=0.7, log=True)
        print(b.run())
        sys.exit()
    random.seed(1)
    for sk in (0.35, 0.7, 1.0):
        table(n, sk)
