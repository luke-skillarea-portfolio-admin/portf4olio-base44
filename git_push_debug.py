import subprocess
from pathlib import Path

p = Path('git_cmd_debug.txt')

cmds = [
    ['git', 'status', '--short'],
    ['git', 'rev-parse', '--is-inside-work-tree'],
    ['git', 'branch', '--show-current'],
    ['git', 'remote', '-v'],
]

with p.open('w', encoding='utf-8') as f:
    for cmd in cmds:
        proc = subprocess.run(cmd, capture_output=True, text=True)
        f.write(f'$ {' '.join(cmd)}\n')
        f.write('returncode=' + str(proc.returncode) + '\n')
        f.write('stdout=' + proc.stdout + '\n')
        f.write('stderr=' + proc.stderr + '\n')
        f.write('---\n')
