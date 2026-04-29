"""CLI for working with the development-only local KMS."""

from __future__ import annotations

import argparse
import getpass
from pathlib import Path

from .local_key_manager import LocalKeyManager
from .serialization import payload_from_json, payload_to_json


def _passphrase_provider() -> str:
    return getpass.getpass('Local KMS passphrase: ')


def _build_manager(args: argparse.Namespace) -> LocalKeyManager:
    return LocalKeyManager(
        args.key_file,
        env_var_name=args.env_var,
        passphrase_provider=_passphrase_provider,
    )


def _read_text_file(path: str) -> str:
    return Path(path).read_text(encoding='utf-8')


def _write_text_file(path: str, content: str) -> None:
    Path(path).write_text(content, encoding='utf-8')


def main() -> int:
    parser = argparse.ArgumentParser(description='Development-only local KMS CLI')
    parser.add_argument(
        '--key-file',
        default=str(Path.cwd() / 'security' / '.local' / 'master_key.json'),
        help='Path to the encrypted local master key file.',
    )
    parser.add_argument(
        '--env-var',
        default='LISTER_LOCAL_KMS_PASSPHRASE',
        help='Environment variable used to unlock the local master key.',
    )
    subparsers = parser.add_subparsers(dest='command', required=True)

    subparsers.add_parser('init-master-key', help='Initialize the encrypted master key file')

    encrypt_parser = subparsers.add_parser('encrypt', help='Encrypt a UTF-8 text file into a payload JSON file')
    encrypt_parser.add_argument('--in-file', required=True)
    encrypt_parser.add_argument('--out-file', required=True)

    decrypt_parser = subparsers.add_parser('decrypt', help='Decrypt a payload JSON file into a UTF-8 text file')
    decrypt_parser.add_argument('--in-file', required=True)
    decrypt_parser.add_argument('--out-file', required=True)

    args = parser.parse_args()
    manager = _build_manager(args)

    if args.command == 'init-master-key':
        manager.master_key_store.load_or_initialize()
        print('Encrypted local master key is ready.')
        return 0

    if args.command == 'encrypt':
        plaintext = _read_text_file(args.in_file).encode('utf-8')
        payload = manager.encrypt(plaintext)
        _write_text_file(args.out_file, payload_to_json(payload))
        print(f'Encrypted payload written to {args.out_file}.')
        return 0

    if args.command == 'decrypt':
        payload = payload_from_json(_read_text_file(args.in_file))
        plaintext = manager.decrypt(payload).decode('utf-8')
        _write_text_file(args.out_file, plaintext)
        print(f'Decrypted payload written to {args.out_file}.')
        return 0

    parser.error('Unknown command')
    return 2


if __name__ == '__main__':
    raise SystemExit(main())
