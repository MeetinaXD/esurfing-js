const { Config } = require("./utils")
const o = new Config("./config.json")
o.get().a = 123
o.write()