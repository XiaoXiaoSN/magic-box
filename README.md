# MagicBox
MagicBox is a useful tool :)

## Usage
### Commands
Define `Command` is a starting by `::` and follow case insensitive command.

For example input:
```
https://github.com/XiaoXiaoSN/magic-box
::surl
```

List defined Commands
- `surl`, `shorten` create a shorten URL
- `qr`, `qrcode` show QRCode

## Development                    

Prepare deployment (first time)

```bash                                
npm install -g firebase-tools

firebase login
firebase init
```

```bash
firebase deploy
```