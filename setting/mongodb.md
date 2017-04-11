// https://docs.mongodb.com/manual/tutorial/enable-authentication/

mongod --dbpath db
use admin
db.createUser(
  {
    user: "ccc",
    pwd: "ccc371461",
    roles: [ { role: "userAdminAnyDatabase", db: "admin" } ]
  }
)
use bookdown
db.createUser(
  {
    user: "ccc",
    pwd: "ccc371461",
    roles: [ { role: "readWrite", db: "bookdown" } ]
  }
)

mongod --auth --dbpath db

mongo bookdown -u "ccc" -p "ccc371461" --authenticationDatabase "bookdown"

```javascript
var MongoClient = require('mongodb').MongoClient
  , assert = require('assert');

// Connection URL
var url = 'mongodb://dave:password@localhost:27017/myproject';
// Use connect method to connect to the Server
MongoClient.connect(url, function(err, db) {
  assert.equal(null, err);
  console.log("Connected correctly to server");

  db.close();
});
```

�p�G�{�Ҥ��O�θӸ�Ʈw�A�ӬO admin�A�h���Өϥ�

mongodb://dave:password@localhost:27017/myproject?authSource=admin