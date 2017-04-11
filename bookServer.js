// var http = require('http')
var fs = require('mz/fs')
var co = require('co')
var logger = require('koa-logger')
var serve = require('koa-static')
// var route = require('koa-route')
var cobody = require('co-body')
var cobusboy = require('co-busboy')
var path = require('path')
var session = require('koa-session')
var aslk = require('aslk')
var M = require('./lib/model')
var V = require('./lib/view')
var Koa = require('koa')
var Router = require('koa-router')

var app = new Koa()
var router = new Router()

var response = function (self, code, msg) {
  var msgMt = msg
  var res = self.response
  res.status = code
  res.set({'Content-Length': '' + msgMt.length, 'Content-Type': 'text/plain'})
  res.body = msgMt
}

var isPass = function (self) {
  return typeof self.session.user !== 'undefined'
}

var parse = async function (self) {
  var json = await cobody(self)
  // console.log('json=%j', json)
  return (typeof json === 'string') ? JSON.parse(json) : json
}

var view = async function (ctx, next) { // view(mdFile):convert *.md to html
  var book = ctx.params.book
  var file = ctx.params.file || 'README.md'
  var type = path.extname(file)
  if (['.md', '.json', '.mdo', '.html'].indexOf(type) >= 0) {
    var bookObj, fileObj
    var isError = false
    try {
      bookObj = await M.getBook(book)
    } catch (error) {
      isError = true
      bookObj = { book: book }
      fileObj = { book: book, file: file, text: '# Error\nBook not found.\nYou may [Create New Book](/view/system/createBook.html) ?' }
    }
    if (!isError) {
      try {
        fileObj = await M.getBookFile(book, file)
      } catch (error) {
        fileObj = { book: book, file: file, text: '# Error\nFile not found.\nYou may edit and save to create a new file !' }
      }
    }
    console.log('user=%s', ctx.session.user)
    var page = V.viewRender(bookObj, fileObj, M.setting.useLocal, ctx.session.user)
    ctx.body = page
  } else {
    ctx.type = path.extname(ctx.path)
    ctx.body = fs.createReadStream(M.getFilePath(book, file))
  }
}

var asl = async function (ctx, next) {
  try {
    var post = await parse(ctx)
    console.log('asl:post=%j', post)
    var p = aslk.analyze(post.source, ctx.params.s2t)
    console.log('asl:p=%j', p)
    response(ctx, 200, JSON.stringify(p))
  } catch (e) {
    response(ctx, 403, e.stack)
  }
}

var save = async function (ctx, next) { // save markdown file.
  var book = ctx.params.book
  var file = ctx.params.file
  if (!isPass(ctx)) {
    response(ctx, 401, 'Please login to save!')
    return
  }
  var bookObj = await M.getBook(book)
  if (bookObj.editor !== ctx.session.user) {
    response(ctx, 403, 'Save fail: You are not editor of the book !')
    return
  }
  try {
    var post = await parse(ctx)
    await M.saveBookFile(book, file, post.text)
    response(ctx, 200, 'Save Success!')
  } catch (e) {
    response(ctx, 403, 'Save Fail!') // 403: Forbidden
  }
}

var signup = async function (ctx, next) {
  if (!M.setting.signup) {
    response(ctx, 403, 'Error: Signup=false in Setting.mdo !')
    return
  }
  var post = await parse(ctx)
  var user = post.user
  var password = post.password
  var isSuccess = await M.addUser(user, password)
  if (isSuccess) {
    response(ctx, 200, 'Signup success!')
  } else {
    response(ctx, 403, 'Signup Fail: User name already taken by some others!')
  }
}

var search = async function (ctx, next) {
  try {
// console.log('ctx.query = %j', ctx.query)
    var key = ctx.query.key || ''
    var q = JSON.parse(ctx.query.q || '{\'type\':\'md\'}')
    var results = await M.search(key, q)
    response(ctx, 200, JSON.stringify(results))
  } catch (e) {
    response(ctx, 403, e.stack)
  }
}


var userList = async function (ctx, next) {
  var lines = ['<ol>']
  for (var user in M.users) {
    lines.push(' <li><a href=\'/view/book/' + user + '/README.md\'>' + user + '</a></li>')
  }
  lines.push('</ol>')
  response(ctx, 200, lines.join('\n'))
}

var login = async function (ctx, next) {
  var post = await parse(ctx) // console.log('login:user=%s', post.user)
  console.log('login:post=%j', post)
  var user = M.users[post.user] // console.log('ctx.session=%j', ctx.session)
  if (user.password === post.password) {
    response(ctx, 200, 'Login Success!')
    ctx.session.user = post.user
  } else {
    response(ctx, 403, 'Login Fail!') // 403: Forbidden
  }
}

var logout = async function (ctx, next) {
  delete ctx.session.user
  response(ctx, 200, 'Logout Success!')
}

var createBook = async function (ctx, next) {
  if (!isPass(ctx)) {
    response(ctx, 401, 'Please login at first !')
  } else {
    try {
      await M.createBook(ctx.params.book, ctx.session.user)
      response(ctx, 200, 'Create Book Success!')
    } catch (err) {
      response(ctx, 403, 'Fail: Book already exist!')
    }
  }
}

var profile = async function (ctx, next) {
  if (typeof ctx.session.user !== 'undefined') {
    ctx.redirect('/view/' + ctx.session.user + '/')
  } else {
    ctx.redirect('/view/system/error.html')
  }
}

var upload = async function (ctx, next) {
  var part
  var parts = cobusboy(ctx)
  var files = []
  while ((part = await parts)) {
    if (part instanceof Array) {
      // console.log('part=%j', part)
    } else {
      // console.log('part.filename=%s', part.filename)
      var stream = fs.createWriteStream(path.join(M.bookRoot, book, part.filename))
      part.pipe(stream)
      // console.log('uploading %s -> %s', part.filename, stream.path)
      files.push(part.filename)
    }
  }
  ctx.body = files
}

app.keys = ['#*$*#$)_)*&&^^']

var CONFIG = {
  key: 'koa:sess', // (string) cookie key (default is koa:sess)
  maxAge: 86400000, // (number) maxAge in ms (default is 1 days)
  overwrite: true, // (boolean) can overwrite or not (default true)
  httpOnly: true, // (boolean) httpOnly or not (default true)
  signed: true // (boolean) signed or not (default true)
}

app.use(logger())
app.use(session(CONFIG, app))
app.use(serve(path.join(__dirname, 'web')))
app.use(serve(path.join(__dirname, 'user')))

router
  .get('/', function (ctx, next) {
    console.log('ctx=%j', ctx)
    ctx.redirect(M.setting.home)
  })
  .get('/view/:book/:file?', view)
  .post('/save/:book/:file', save)
  .post('/login', login)
  .post('/logout', logout)
  .post('/upload/:book', upload)
  .post('/asl/:s2t', asl)

/*
  .get('/view/:book/:file', view)
// app.use(route.get('/locale/:locale', setLocale))
app.use(route.post('/save/:book/:file', save))
app.use(route.post('/signup', signup))
app.use(route.post('/asl', asl))
app.use(route.get('/createbook/:book', createBook))
app.use(route.post('/createbook/:book', createBook))
app.use(route.post('/login', login))
app.use(route.post('/logout', logout))
app.use(route.get('/search', search))
app.use(route.get('/userlist', userList))
app.use(route.get('/profile', profile))
app.use(route.post('/upload/:book', upload))
*/

co(async function () {
  await M.init(__dirname)
  V.init(__dirname)
  var port = M.setting.port || 8080
  app.use(router.routes()).listen(port)
//   http.createServer(app.callback()).listen(port)
  console.log('http server started: http://localhost:' + port)
})
