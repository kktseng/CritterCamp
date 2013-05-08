module.exports = {
  Redis: {
    host: "localhost",
    port: 6379
  },

  Mongo: {
    auto_reconnect: true,
    db: "cceast_prd",
    rs_name: "rs-ds41177",
    host: "ds061757.mongolab.com",
    port: 61757,
    username: process.env.MONGO_USERNAME,
    password: process.env.MONGO_PASSWORD
  }
};