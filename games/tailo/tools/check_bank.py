#!/usr/bin/env python3
"""台羅拼音練習題庫檢查（只用標準函式庫）

用法（在 repo 根目錄）：
  python3 games/tailo/tools/check_bank.py          # 只檢查、印報告
  python3 games/tailo/tools/check_bank.py --fix    # 依 lo／alt 重新計算 modes 並寫回 bank.js

檢查項目：必要欄位、重複詞、錄音檔存在、聲母在 18 鍵內、韻母只用 a i u e o m n g p t k h 拼得出、
modes 與唸法一致、各模式題數是否夠一回合 20 題、聲調題最後一字的聲調分布。
拆解規則必須跟 games/tailo/index.html 的 parseSyl() 保持一致，改一邊就要改另一邊。
"""
import json
import re
import sys
import unicodedata
from collections import Counter
from pathlib import Path

# Windows 中文主控台預設 cp950，印不出「个」等字會當掉，統一用 UTF-8 輸出
for _s in (sys.stdout, sys.stderr):
    if hasattr(_s, 'reconfigure'):
        _s.reconfigure(encoding='utf-8')

HERE = Path(__file__).resolve().parent.parent          # games/tailo
BANK = HERE / 'bank.js'
ROUND = 20
INI = ['tsh', 'ts', 'ph', 'th', 'kh', 'ng', 'p', 'b', 'm', 't', 'n', 'l', 'k', 'g', 'h', 's', 'j']
FIN_KEYS = set('aiueomngptkh')
TONE_MARK = {'́': 2, '̀': 3, '̂': 5, '̄': 7, '̍': 8, '̋': 9}
HEAD = ('// 台羅拼音練習題庫：han 漢字、lo 台羅（照課本）、alt 其他唸法、audio 錄音（相對於 games/tailo/）、src 出處\n'
        '// modes：這個詞可以出哪幾種題（ini 聲母、fin 韻母、tone 聲調）；有其他唸法而且考的部分不同時，就不出那種題\n'
        '// modes 由 tools/check_bank.py --fix 自動計算，不用手改\n')


def parse_syl(raw):
    nfd = unicodedata.normalize('NFD', raw.lower())
    tone = 0
    for c in nfd:
        tone = TONE_MARK.get(c, tone)
    base = ''.join(c for c in nfd if not unicodedata.combining(c))
    if not tone:
        tone = 4 if base[-1] in 'ptkh' else 1
    if re.fullmatch(r'(m|ng)h?', base):              # 成音節 m、ng：無聲母
        ini = ''
    else:
        ini = next((i for i in INI if base.startswith(i) and len(base) > len(i)), '')
    return ini, base[len(ini):], tone


def sylls(lo):
    return [parse_syl(x) for x in re.split(r'[-\s]+', lo.strip()) if x]


def modes_of(w):
    readings = [sylls(r) for r in [w['lo']] + w.get('alt', [])]
    first = readings[0]

    def same(k):
        return all(len(r) == len(first) and all(a[k] == b[k] for a, b in zip(r, first)) for r in readings)

    out = [m for m, k in (('ini', 0), ('fin', 1)) if same(k)]
    if all(r[-1][2] == first[-1][2] for r in readings):
        out.append('tone')
    return out


def load():
    s = BANK.read_text(encoding='utf-8')
    return json.loads(s[s.index('['):s.rindex(']') + 1])


def save(words):
    body = ',\n'.join('  ' + json.dumps(w, ensure_ascii=False) for w in words)
    BANK.write_text(HEAD + 'window.TL_BANK = [\n' + body + '\n];\n', encoding='utf-8')


def main():
    fix = '--fix' in sys.argv
    words = load()
    errs, warns = [], []
    seen = Counter(w.get('han') for w in words)
    for d, n in seen.items():
        if n > 1:
            warns.append(f'重複的詞：{d}（{n} 次）')
    for w in words:
        tag = w.get('han', '?')
        for f in ('han', 'lo', 'audio', 'src'):
            if not w.get(f):
                errs.append(f'{tag}：缺少欄位 {f}')
        if not w.get('lo'):
            continue
        if w.get('audio') and not (HERE / w['audio']).is_file():
            errs.append(f'{tag}：找不到錄音 {w["audio"]}')
        for ini, fin, _ in sylls(w['lo']):
            if not set(fin) <= FIN_KEYS:
                errs.append(f'{tag}：韻母「{fin}」有按鍵打不出的字母（只有 a i u e o m n g p t k h）')
        want = modes_of(w)
        if w.get('modes') != want:
            (warns if fix else errs).append(f'{tag}：modes 應為 {want}，目前是 {w.get("modes")}' + ('（已修正）' if fix else '（執行 --fix 自動修正）'))
            if fix:
                w['modes'] = want
    if fix:
        save(words)

    print(f'題庫共 {len(words)} 個詞')
    for m, name in (('ini', '聲母'), ('fin', '韻母'), ('tone', '聲調')):
        n = sum(m in w.get('modes', []) for w in words)
        print(f'  {name}模式可出 {n} 題' + ('' if n >= ROUND else f'  ⚠ 少於一回合 {ROUND} 題'))
    tones = Counter(sylls(w['lo'])[-1][2] for w in words if 'tone' in w.get('modes', []))
    print('  聲調題最後一字的聲調分布：' + '、'.join(f'{t} 調 {tones.get(t, 0)}' for t in (1, 2, 3, 4, 5, 7, 8)))
    for t in (1, 2, 3, 4, 5, 7, 8):
        if tones.get(t, 0) < 4:
            warns.append(f'第 {t} 調只有 {tones.get(t, 0)} 題，建議補到 4 題以上')
    for x in warns:
        print('提醒：' + x)
    for x in errs:
        print('錯誤：' + x)
    sys.exit(1 if errs else 0)


if __name__ == '__main__':
    main()
