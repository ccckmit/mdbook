var co   = require('co')
var M    = require('../lib/model')

co(async function () {
  await M.init('../')
  await M.uploadToDb()
//  await M.query({type:'json'})
//  await M.search('陳鍾誠 email')
//  await M.search('八極語 grammar')
//  await M.search('Africa')
  var results = await M.search('十分鐘小論文', {type:'md'})
  console.log('results=%j', results)
  var results = await M.search('十分鐘小論文')
  console.log('results=%j', results)
  await M.close()
});

