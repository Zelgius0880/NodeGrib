const Database = require('better-sqlite3');
const db = new Database('notification.db', {verbose: console.log});
initDb();

exports.getNotificationPersistentIds = function () {
    return db.prepare("SELECT persistentId FROM notification_persistent_ids").all();
};

exports.insertPersistentIds = function (persistentId) {
    let stmt = db.prepare("INSERT INTO notification_persistent_ids (persistentId) VALUES (?)");
    stmt.run(persistentId);
};


function initDb() {
    db.exec("CREATE TABLE IF NOT EXISTS notification_persistent_ids (id INTEGER PRIMARY KEY AUTOINCREMENT, persistentId TEXT)")

    /* var stmt = db.prepare("INSERT INTO user VALUES (?,?)");
     for (var i = 0; i < 10; i++) {

         var d = new Date();
         var n = d.toLocaleTimeString();
         stmt.run(i, n);
     }
     stmt.finalize();

     db.each("SELECT id, dt FROM user", function(err, row) {
         console.log("User id : "+row.id, row.dt);
     });*/
}
