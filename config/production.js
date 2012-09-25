module.exports = {
  Redis: {
    host: "pigbaby.cloudapp.net",
    port: 6379
  },

  Mongo: {
    auto_reconnect: true,
    db: "pig-data",
    rs_name: "rs-ds035747",
    host: [ "ds035747-a.mongolab.com"],
    port: [ 35747 ],
    username: process.env.MONGO_USERNAME,
    password: process.env.MONGO_PASSWORD,
  }
};