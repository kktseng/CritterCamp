module.exports = {
  Redis: {
    host: "localhost",
    port: 6379
  },

  Mongo: {
    auto_reconnect: true,
    db: "pig-main",
    rs_name: "rs-ds41177",
    host: [ "ds041177.mongolab.com"],
    port: [ 41177 ],
    username: process.env.MONGO_USERNAME,
    password: process.env.MONGO_PASSWORD,
  }
};