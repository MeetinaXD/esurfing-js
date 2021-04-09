Maybe you need [English Version](./README.md)


## Esurfing Login
作者： MeetinaXD

最后更新日期： Apri 9, 2021

一个用于`广东天翼校园网`的第三方登录程序

## 功能
- 光速登录，比官方不知道高到哪里去了
- 一次配置，终身受用
- 自动保活，自动断线重连


## 运行环境要求
脚本运行在`Node.JS`环境中，请自行百度对应平台的安装方法

在`Node.JS`安装完后，执行以下命令安装其余环境

``` shell
npm i colors yargs axios -S
```

## 使用方法
脚本提供了两种运行模式：`命令行配置模式`以及`环境变量配置模式`

在`命令行配置模式`中，你需要在运行指令中提供所有需要的信息，如`登录帐号`和`登录密码`

在`环境变量配置模式`中，你需要预先在`PATH`中配置所有所需环境变量。如果你使用`docker容器`封装运行脚本，建议使用该模式。

默认情况下，脚本会每`一分钟`发送一次激活请求来维持网络连接。你可以使用`-t`选项或`ESU_INTERVAL`环境变量来指定该值。

### 命令行配置模式
用法
``` shell
node ./main.js -u [USERNAME] -p [PASSWORD] -d -t [INTERVAL]
```

**举例**
``` shell
node ./main.js -u 3119000000 -p 12345678 -d -t 3
```

### 环境变量配置模式
运行前需要在`PATH`中指定`登录帐号` `登录密码` 和 `激活时间间隔` ，用法如下
``` shell
# 一般是你的学号
export ESU_USERNAME=[USERNAME]
# 身份证后8位
export ESU_PASSWORD=[PASSWORD]
# 时间间隔
export ESU_INTERVAL=[INTERVAL]
node ./main.js
```

**举例**
``` shell
export ESU_USERNAME=3119000000
export ESU_PASSWORD=12345678
export ESU_INTERVAL=3
node ./main.js -d
```

### `-t`, 间隔时间间隔
该值为两次发送激活请求的时间间隔，默认为`1`（分钟）

### `-d`, 在首次登录前先断开连接
这个选项用于解决一些可能存在且未预料的问题，如：在登录时网络未断开，则导致登录失败。
脚本已对上述情况做了处理，可以不用。
`切勿`在首次使用脚本时就使用该选项