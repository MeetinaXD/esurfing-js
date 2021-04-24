也许你需要 [简体中文文档](./README_sc.md)

## Esurfing Login
Author: MeetinaXD

Last Edit: Apri 9, 2021

A three-party login script for `GuangDong esurfing` written by `JavaScript`

## Features
- Lighting fast login
- Once configuring, easy use
- Activate connection automatically

## Requirement
The script is running in `Node.JS`

You need to install `Node.JS` and run the following command

``` shell
npm i colors yargs axios md5-node
```

## Usage
The script can works in two modes: `command-line mode` and `PATH mode`

In `command-line mode`, all parameters should be offered by options.

In `PATH mode`, you should define all the parameters in `PATH`. This mode is recommended when the script is run inside a docker container.

By default, the script sends an activation request `every minute` to make sure the connection alive.
You can configure it by option `-t` or PATH `ESU_INTERVAL`.
### `command-line MODE`
``` shell
node ./main.js -u [USERNAME] -p [PASSWORD] -d -t [INTERVAL]
```

**For example**
``` shell
node ./main.js -u 3119000000 -p 12345678 -d -t 3
```

### `PATH MODE`
Configuring `username` `password` and `time interval` in `PATH`
``` shell
# your student id
export ESU_USERNAME=[USERNAME]
# the last 8 digits of ID card number
export ESU_PASSWORD=[PASSWORD]
# Time interval
export ESU_INTERVAL=[INTERVAL]
node ./main.js
```

**For example**
``` shell
export ESU_USERNAME=3119000000
export ESU_PASSWORD=12345678
export ESU_INTERVAL=3
node ./main.js -d
```

### `-t`, interval time
Time interval of sendind two activation requests, default is `1 minute`

### `-d`, disconnect before login
Use this option to fix some unexpected problem such as the connection is still alive when the script is attempting to create a login request.
**NEVER** use this option before the first login.
