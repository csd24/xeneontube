"""Create a Windows source/companion bundle from an explicit, credential-free list.

Run `npm run widget:package` first, then `python3 scripts/bundle.py`.
"""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib

root = Path(__file__).resolve().parents[1]
files = [root / name for name in (
    'README.md', 'package.json', 'package-lock.json', '.env.example',
    'Start-XeneonTube.cmd', 'server.js',
)]
for folder in ('public', 'widget', 'scripts', 'test'):
    files.extend(p for p in (root / folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
files.append(root / 'dist' / 'XeneonTube.icuewidget')

output = root / 'dist' / 'XeneonTube-Windows.zip'
with ZipFile(output, 'w', ZIP_DEFLATED) as bundle:
    for file in sorted(files):
        if file.is_symlink() or file.name == '.env':
            raise ValueError(f'Refusing unexpected file: {file.name}')
        bundle.write(file, Path('XeneonTube') / file.relative_to(root))
digest = hashlib.sha256(output.read_bytes()).hexdigest()
output.with_suffix('.zip.sha256').write_text(f'{digest}  {output.name}\n')
print(f'Created {output.name} with {len(files)} files; no .env or node_modules included.')
