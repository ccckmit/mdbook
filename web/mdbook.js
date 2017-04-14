var converter, setting
var scriptLoaded = {}
var PLUGIN = { load: function () {} }

var mt = function (msg) {
  return msg
}

var menuRender = function () {
  var nodes = document.getElementsByClassName('mt')
  for (var i = 0; i < nodes.length; i++) {
    var node = nodes[i]
    var s = node.getAttribute('data-mt')
    var t = mt(s)
    node.innerHTML = t
  }
}

window.onload = function () {
//  if (setting.defaultLocale === '') setting.defaultLocale = 'Global'
  loadScript('../../plugin/plugin.js', function () { PLUGIN.load() })
  loadScript(setting.showdownJsUrl, function () {
    converter = new window.showdown.Converter()
    converter.setOption('tables', true)
    bookRender()
    menuRender()
    view()
  })
}

function id (ID) {
  return document.getElementById(ID)
}

function loadStyle (url) {
  var ss = document.createElement('link')
  ss.type = 'text/css'
  ss.rel = 'stylesheet'
  ss.href = url
  document.getElementsByTagName('head')[0].appendChild(ss)
}

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

function ajaxFormPost (path, form, callback) {
  var data = new window.FormData(form)
  var request = new window.XMLHttpRequest()
  request.open(form.method, path)
  request.onreadystatechange = function () {
    if (request.readyState !== 4) return
    if (callback != null) callback(request)
  }
  request.send(data)
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

function plugin (file) {
  ajaxGet('../../plugin/' + file, function (status, text) {
    if (status === 200) {
      id('pluginBox').innerHTML = text
      showBox('pluginBox')
      render()
    } else {
      window.alert('Error : plugin file ' + file + ' not found')
    }
  })
}

function mdRender (md, callback) {
  // markdown-it 對 <code>...</code> 的解讀有誤，因此會把數學式裡的 *...* 與 ^...^ 誤解而翻錯成 <em> 與 <sup>！
  // 所以只能用 showdown.js  // var html = converter.render(md) // markdown-it
  var html = converter.makeHtml(md) // showdown.js
  callback(html)
}

var mdRewrite = function (md, callback) {
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
  mdRender(md, callback)
}

// fileRender => mdRewrite => mdRender
function fileRender (text, callback) {
  if (setting.file.endsWith('.html')) {
    callback(text)
  } else {
    var md
    if (setting.file.endsWith('.json')) {
      md = '```json\n' + text + '\n```'
    } else
    if (setting.file.endsWith('.mdo')) {
      md = '```mdo\n' + text + '\n```'
    } else { // *.md
      md = text
    }
  }
  mdRewrite(md, callback)
}

function bookRender () {
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
  id('pluginBox').style.display = 'none'
//  id('searchBox').style.display = 'none'
  id('viewBox').style.display = 'none'
  id('editBox').style.display = 'none'
  id(ID).style.display = 'block'
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
    loadScript(setting.katexJsUrl, function () {
      loadStyle(setting.katexCssUrl)
      text = texApply(text)
      callback(text)
    })
  } else {
    callback(text)
  }
}

// render => fileRender => texRender
function render () {
  fileRender(id('editText').value, function (html) {
    texRender(html, function (texHtml) {
      id('viewBox').innerHTML = texHtml
      menuRender()
      codeHighlight()
//      id('searchBox').innerHTML = chineseMt(searchHtml)
    })
  })
}

function codeHighlight () {
  var codes = document.querySelectorAll('pre code')
  if (codes.length > 0) {
    loadScript(setting.highlightJsUrl, function () {
      loadStyle(setting.highlightCssUrl)
      for (var i = 0; i < codes.length; i++) {
        window.hljs.highlightBlock(codes[i])
      }
    })
  }
}

function view () {
  showBox('viewBox')
  render()
}

function edit () {
  showBox('editBox')
}

function save () {
  ajaxPost('../../save/' + setting.book + '/' + setting.file, {text: id('editText').value}, function (r) {
    if (r.status !== 200) {
      plugin('login.html')
    }
  })
}

// =================== CURD Server 編輯登入儲存 =============================
function login () {
  var userBox = id('user')
  var passwordBox = id('password')
  ajaxPost('../../login', {user: userBox.value, password: passwordBox.value}, function (r) {
    window.location.reload()
  })
}

function createBook () {
  var bookName = id('book').value
  ajaxGet('../../createbook/' + bookName, function (status, msg) {
    window.alert(msg)
    if (status === 200) window.location.href = '../../view/' + bookName + '/'
  })
}

function uploadSubmit (e) {
  try {
    var form = id('uploadForm')
    ajaxFormPost('../../upload/' + book, form, function (r) {
      if (r.status === 200) {
        window.alert('Success !')
      } else {
        window.alert('Fail!')
      }
      showBox('viewBox')
    })
  } catch (e) {}
  return false
}

function logout () {
  ajaxPost('../../logout', {}, function (r) {
    window.location.reload()
  })
}

function signup () {
  ajaxPost('../../signup', {user: id('user').value, password: id('password').value})
}

// ============== purecss ui.js ====================
/*eslint-disable */
(function (window, document) {

    var layout = document.getElementById('layout'),
        menu = document.getElementById('menu'),
        menuLink = document.getElementById('menuLink'),
        content = document.getElementById('main');

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
/*eslint-enable */
