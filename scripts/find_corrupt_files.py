import subprocess
import os

result = subprocess.run(
    ['git', 'ls-files', 'src/'],
    capture_output=True
)
files = result.stdout.decode('utf-8', errors='replace').strip().split('\n')
files = [f.strip() for f in files if f.strip().endswith(('.ts', '.tsx'))]

for f in files:
    git_r = subprocess.run(['git', 'show', f'origin/main:{f}'], capture_output=True)
    disk_lines = 0
    if os.path.exists(f):
        with open(f, encoding='utf-8', errors='replace') as fh:
            disk_lines = len(fh.readlines())

    git_lines = len(git_r.stdout.decode('utf-8', errors='replace').splitlines()) if git_r.returncode == 0 else 0

    if git_lines > 50 and disk_lines > git_lines * 1.4:
        ratio = disk_lines / max(git_lines, 1)
        print(f"SUSPECT ratio={ratio:.1f} git={git_lines} disk={disk_lines}  {f}")
