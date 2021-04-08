## Esurfing Login
Author: MeetinaXD
Last Edit: Apir 8, 2021

A three-party login script for `GuangDong esurfing` written by `JavaScript`

## Before run
The script is running in `Node.JS`
You need to install `Node.JS`, then install the following requirement
``` shell
npm i colors yargs axios -S
```

## Usage
The script can be run in two modes, `command-line mode` and `PATH mode`
In `command-line mode`, you can specify your `username` and `password` in the command line.
In `PATH mode`, you can put your username and password in `PATH`, it works better in docker.

What's more, the script will send an activation request `every 1 min`.
You can configure it by edit `main.js: 235`, function `setTask` receive a value as a `minute`.

### `command-line MODE`
``` shell
node ./main.js -u [USERNAME] -p [PASSWORD]
```

### `PATH MODE`
``` shell
export ESU_USERNAME=[USERNAME]
export ESU_PASSWORD=[PASSWORD]
node ./main.js
```

### `-d`, disconnect before login
I recommend you use this option, it maybe can avoid some problem.
For example:
``` shell
node ./main.js -d -u [USERNAME] -p [PASSWORD]
```
