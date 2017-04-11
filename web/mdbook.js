var converter, book, file, defaultLocale, cn2tw, tw2cn
var dictionary = {}

function id (ID) {
  return document.getElementById(ID)
}

function load (pBook, pFile) { // eslint-disable-line
  book = pBook
  file = pFile
  if (defaultLocale === '') defaultLocale = 'Global'
  window.onhashchange()
  converter = new window.showdown.Converter()
  converter.setOption('tables', true)
  id('searchQuery').addEventListener('keyup', function (event) {
    event.preventDefault()
    if (event.keyCode === 13) {
      var key = id('searchQuery').value
      window.location.hash = '#search:' + key
      showBox('searchBox')
    }
  })
  addToDictionary('tw', tw)
  loadChinese()
}

function loadChinese () {
  if (window.localStorage.chineseDictionary != null) {
    var chineseDictionary = JSON.parse(window.localStorage.chineseDictionary)
    cn2tw = chineseDictionary.cn2tw
    tw2cn = chineseDictionary.tw2cn
    renderBook()
    pageToLocale()
  } else {
    loadScript('../../chinese.js', function () {
      console.log('load chinese.js')
      renderBook()
      pageToLocale()
      window.localStorage.chineseDictionary = JSON.stringify({cn2tw: cn2tw, tw2cn: tw2cn})
    })
  }
}

window.onhashchange = function () {
  var hash = window.location.hash.trim()
  if (hash.startsWith('search:')) {
    search(hash.substring('#search:'.length))
  } else {
    showBox('viewBox')
  }
}

window.onpopstate = function (event) {}

function renderBook () {
  var bookJson = id('editBook').value
  var bookObj = JSON.parse(bookJson)
  id('bookTitle').innerHTML = '<a href="README.md" class="pure-menu-link mt" data-mt="' + bookObj.title + '"></a>'
  var chapters = bookObj.chapters
  var bookHtmls = []
  for (var i in chapters) {
    bookHtmls.push('<li class="pure-menu-item"><a href="' + chapters[i].link + '" class="pure-menu-link mt" data-mt="' + chapters[i].title + '">' + mt(chapters[i].title) + '</a></li>')
  }
  id('bookBox').innerHTML = bookHtmls.join('\n')
}

function showBox (ID) {
  id('searchBox').style.display = 'none'
  id('viewBox').style.display = 'none'
  id('editBox').style.display = 'none'
  id(ID).style.display = 'block'
}

function ajaxGet (path, callback) {
  var r = new window.XMLHttpRequest()
  r.open('GET', path, true)
  r.onreadystatechange = function () {
    if (r.readyState !== 4) return
    callback(r.status, r.responseText)
  }
  r.send(null)
}

function ajaxPost (path, obj, callback, isAlert) {
  if (isAlert == null) isAlert = true
  var r = new window.XMLHttpRequest()
  r.open('POST', path, true)
  r.onreadystatechange = function () {
    if (r.readyState !== 4) return
    if (isAlert) window.alert(mt(r.responseText))
    if (callback != null) callback(r)
  }
  r.send(JSON.stringify(obj))
}

function ajaxFormPost (path, form, callback) { // eslint-disable-line 
  var data = new window.FormData(form)
  var request = new window.XMLHttpRequest()
  request.onreadystatechange = function () {
    if (request.readyState !== 4) return
    if (callback != null) callback(request)
  }
  request.open(form.method, path)
  request.send(data)
}

function loadStyle (url) {
  var ss = document.createElement('link')
  ss.type = 'text/css'
  ss.rel = 'stylesheet'
  ss.href = url
  document.getElementsByTagName('head')[0].appendChild(ss)
}

var scriptLoaded = {}

function loadScript (url, onload) {
  var urlLoaded = scriptLoaded[url]
  if (urlLoaded != null) {
    if (onload != null) onload()
    return
  }
  var script = document.createElement('script')
  script.onload = onload
  script.src = url
  document.getElementsByTagName('head')[0].appendChild(script)
  scriptLoaded[url] = true
}

function texApply (text) {
  return text.replace(/(```\w*\n([\s\S]*?)\n```)|(`[^`\n]*`)|(<code>\$\$\s*\n\s*([^$]+)\s*\n\s*\$\$<\/code>)|(<code>\$\$([^$\n]+)\$\$<\/code>)/gmi, function (match, p1, p2, p3, p4, p5, p6, p7, offset, str) {
    var texHtml
    try {
      if (p1 != null) {
        return match
      } else if (p3 != null) {
        return match
      } else if (p4 != null) {
        texHtml = window.katex.renderToString(p5, { displayMode: true })
        return (texHtml == null) ? p5 : texHtml
      } else if (p6 != null) {
        texHtml = window.katex.renderToString(p7)
        return (texHtml == null) ? p7 : texHtml
      }
    } catch (err) {
      return err.toString()
    }
  })
}

function texRender (text, callback) {
  if (text.indexOf('$$') >= 0) {
    loadScript(window.katexJsUrl, function () {
      loadStyle(katexCssUrl)
      text = texApply(text)
      callback(text)
    })
  } else {
    callback(text)
  }
}

function map (s, s2t) {
  return s2t[s] || s
}

function locale () {
  var loc = (window.localStorage.locale || defaultLocale)
  if (loc === 'Global') {
    var userLang = navigator.language || navigator.userLanguage
    if (userLang === 'zh-TW') return 'tw'
    if (userLang === 'zh-CN') return 'cn'
    return 'en'
  }
  return loc
}

function localeChinese () {
  return ['tw', 'cn'].indexOf(locale()) >= 0
}

function chineseMt (text) {
  var toText = []
  var s2t = (locale() === 'tw') ? cn2tw
           : (locale() === 'cn') ? tw2cn : {}
  for (var i = 0; i < text.length; i++) {
    toText[i] = map(text[i], s2t)
  }
  return toText.join('')
}

function mdRender (md, callback) {
  // markdown-it 對 <code>...</code> 的解讀有誤，因此會把數學式裡的 *...* 與 ^...^ 誤解而翻錯成 <em> 與 <sup>！
  // 所以只能用 showdown.js  // var html = converter.render(md) // markdown-it
  var html = converter.makeHtml(md) // showdown.js
  callback(html)
}

// fileRender => ?mtRender => mdRender
function fileRender (text, callback) {
  if (file.endsWith('.html')) {
    callback(text)
  } else {
    var md = text
    if (file.endsWith('.json')) {
      md = '```json\n' + text + '\n```'
    } else if (file.endsWith('.mdo')) {
      md = '```mdo\n' + text + '\n```'
    } else { // *.md
      var mdParts = md.split(/\nchinese:\n/mi)
      if (mdParts.length >= 2) {
        if (localeChinese()) {
          md = mdParts[1]
        } else {
          md = mdParts[0]
        }
      }
      if (localeChinese()) md = chineseMt(md) // 繁簡轉換
    }
    md = md.replace(/(```\w*\n([\s\S]*?)\n```)|(`[^`\n]*`)|(\$\$\s*\n\s*([^$]+)\s*\n\s*\$\$)|(\$\$([^$\n]+)\$\$)/gmi, function (match, p1, p2, p3, p4, p5, p6, p7, offset, str) {
      var texHtml
      try {
        if (p1 != null) {
          return match
        } else if (p3 != null) {
          return match
        } else if (p4 != null) {
          texHtml = '<code>' + p4 + '</code>'
          return (texHtml == null) ? p5 : texHtml
        } else if (p6 != null) {
          texHtml = '<code>' + p6 + '</code>'
          return (texHtml == null) ? p7 : texHtml
        }
      } catch (err) {}
    })
    if (!localeChinese()) {
/*      
      aslMt(md, function (mdt) {
        mdRender(mdt, callback)
      }, false)
*/      
      mdRender(md, callback)
    } else {
      mdRender(md, callback)
    }
  }
}

function aslMt (source, callback) {
  ajaxPost('/asl/c2e/', {source: source}, function (r) {
    var p = JSON.parse(r.responseText)
    var toTags = []
    for (var i = 0; i < p.tokens.length; i++) {
      if (p.tags[i] === '.') {
        if (p.tokens[i] === '↓') {
          toTags.push('\n')
        } else {
          toTags.push(p.en[i])
        }
      } else { // if (/^[a-z]$/.test(p.en[i])){
        toTags.push(p.en[i] + ' ')
      }
//      if (p.cuts[i]) toTags.push('~' + p.tags[i] + '~')
    }
    callback(toTags.join('').replace(/_/gi, '-')) // .replace(/~/gi, '_'))
  }, false)
}

function codeHighlight () {
  var codes = document.querySelectorAll('pre code')
  if (codes.length > 0) {
    loadScript(highlightJsUrl, function () { // eslint-disable-line 
      loadStyle(highlightCssUrl)
      for (var i = 0; i < codes.length; i++) {
        window.hljs.highlightBlock(codes[i])
      }
    })
  }
}

var localeFull = {
  '': 'Global',
  tw: '繁體中文',
  cn: '简体中文',
  en: 'English'
}

// render => fileRender => texRender

function render () {
  fileRender(id('editText').value, function (html) {
    texRender(html, function (texHtml) {
      id('viewBox').innerHTML = texHtml
      menuToLocale()
      codeHighlight()
      id('searchBox').innerHTML = chineseMt(searchHtml)
      if (window.localStorage.locale != null) {
        id('locale').innerHTML = mt(localeFull[window.localStorage.locale])
      }
    })
  })
}

function view () { // eslint-disable-line 
  showBox('viewBox')
  render()
}

function edit () { // eslint-disable-line 
  showBox('editBox')
}

function save () { // eslint-disable-line 
  ajaxPost('../../save/' + book + '/' + file, {text: id('editText').value}, function (r) {
    if (r.status !== 200) {
      window.location.href = '../../view/system/login.html'
    }
  })
}

var searchHtml = ''

function search (key) {
  ajaxGet('../../search?key=' + key + '', function (status, msg) {
    var obj = JSON.parse(msg)
    var results = obj
    var lines = []
    for (var i = 0; i < results.length; i++) {
      lines.push('<h3><a href="../../view/' + results[i].path + '">' + results[i].path + '</a></h3>')
      var robj = results[i].text || results[i].json
      var text = JSON.stringify(robj)
      lines.push('<p>' + text.replace(/\n/gi, '') + '</p>')
    }
    id('searchBox').innerHTML = searchHtml = lines.join('\n')
    showBox('searchBox')
  })
}

function logout () { // eslint-disable-line 
  ajaxPost('../../logout', {}, function (r) {
    window.location.reload()
  })
}

function redirectToSsl () { // eslint-disable-line 
  if (window.location.href.startsWith('http://')) {
    window.location.href = window.location.href.replace('http://', 'https://')
  }
}

// ====================== MT ====================================
var tw = {
  'menu': '選單',
  'edit': '編輯',
  'view': '檢視',
  'save': '存檔',
  'signup': '註冊',
  'login': '登入',
  'logout': '登出',
  'home': '首頁',
  'book': '書籍',
  'search': '搜尋',
  'user': '使用者',
  'locale': '語言',
  'Upload': '上傳',
  'Files': '檔案',
  'Submit': '送出',
  'NewBook': '寫書',
  'users': '使用者',
  'books': '書籍',
  'Contents': '內容',
  'GoBack': '回前頁',
  'User': '使用者',
  'Author': '作者',
  'Password': '密碼',
  'Profile': '私人',
  'System': '系統',
  'Global': '全球',
  'Error: Signup=false in Setting.mdo !': '錯誤:設定檔的 signup=false !',
  'Please login to save!': '請先登入後才能存檔！',
  'Save fail: You are not editor of the book !': '存檔失敗：你不是本書的編輯！',
  'Save Success!': '存檔成功',
  'Save Fail!': '存檔失敗',
  'Signup success!': '註冊成功',
  'Signup Fail: User name already taken by some others!': '註冊失敗:該名稱已被佔用！',
  'Login Success!': '登入成功！',
  'Login Fail!': '登入失敗！',
  'Logout Success!': '登出成功！',
  'Please login at first !': '請先登入！',
  'Create Book Success!': '創建書籍成功！',
  'Fail: Book already exist!': '登入失敗！'
}

function addToDictionary (locale, dic) {
  var d = dictionary[locale] || {}
  for (var e in dic) {
    d[e.toLowerCase()] = dic[e]
  }
  dictionary[locale] = d
}

function pageToLocale (locale) {
  if (locale != null) {
    window.localStorage.locale = locale
  }
  render()
}

function menuToLocale () {
  var nodes = document.getElementsByClassName('mt')
  for (var i = 0; i < nodes.length; i++) {
    var node = nodes[i]
    var e = node.getAttribute('data-mt')
    var eMt = mt(e)
    node.innerHTML = eMt
  }
}

function mt (msg) {
  var d = (localeChinese()) ? dictionary['tw'] : {}
  var toMsg = d[msg.toLowerCase()]
  msg = (toMsg == null) ? msg : toMsg
  if (msg.indexOf('=') >= 0) {
    var tokens = msg.split('=')
    msg = (localeChinese()) ? tokens[1] : tokens[0]
  }
  return (localeChinese()) ? chineseMt(msg) : msg
}

// 以下原本寫在 innerHTML 裏，但不 work 所以拉到本 js 檔裏
// http://stackoverflow.com/questions/13390588/script-tag-create-with-innerhtml-of-a-div-doesnt-work
function login () {
  var userBox = document.getElementById('user')
  var passwordBox = document.getElementById('password')
  ajaxPost('../../login', {user: userBox.value, password: passwordBox.value}, function (r) {
    window.history.back()
  })
}

function createBook () {
  var bookName = id('bookBox').value
  ajaxGet('../../createbook/' + bookName, function (status, msg) {
    window.alert(msg)
    if (status === 200) window.location.href = '../../view/' + book + '/'
  })
}

function uploadSubmit (e) {
  try {
    var form = id('uploadForm')
    var book = window.location.hash.substring('#book:'.length)
    ajaxFormPost('../../upload/' + book, form, function (r) {
      if (r.status === 200) {
        window.alert('Success:' + r.responseText)
      } else {
        window.alert('Error:' + r.responseText)
      }
    })
  } catch (e) {}
  return false
}

function signup () {
  ajaxPost('../../signup', {user: id('user').value, password: id('password').value})
}

// ============== purecss ui.js ====================

(function (window, document) {

    var layout   = document.getElementById('layout'),
        menu     = document.getElementById('menu'),
        menuLink = document.getElementById('menuLink'),
        content  = document.getElementById('main');

    function toggleClass(element, className) {
        var classes = element.className.split(/\s+/),
            length = classes.length,
            i = 0;

        for(; i < length; i++) {
          if (classes[i] === className) {
            classes.splice(i, 1);
            break;
          }
        }
        // The className is not found
        if (length === classes.length) {
            classes.push(className);
        }

        element.className = classes.join(' ');
    }

    function toggleAll(e) {
        var active = 'active';

        e.preventDefault();
        toggleClass(layout, active);
        toggleClass(menu, active);
        toggleClass(menuLink, active);
    }

    menuLink.onclick = function (e) {
        toggleAll(e);
    };

    content.onclick = function(e) {
        if (menu.className.indexOf('active') !== -1) {
            toggleAll(e);
        }
    };

}(this, this.document));