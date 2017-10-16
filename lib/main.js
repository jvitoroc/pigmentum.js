'use strict';

var startMoon = function startMoon(_ref) {
    var _ref$individualJSON = _ref.individualJSON,
        individualJSON = _ref$individualJSON === undefined ? false : _ref$individualJSON,
        _ref$path = _ref.path,
        path = _ref$path === undefined ? 'moon-src/' : _ref$path,
        _ref$fileName = _ref.fileName,
        fileName = _ref$fileName === undefined ? 'ruleset.json' : _ref$fileName,
        _ref$caching = _ref.caching,
        caching = _ref$caching === undefined ? false : _ref$caching;

    var snippets = document.querySelectorAll('.moon');
    var rules = {};

    function getJSON(url) {
        return new Promise(function (resolve, reject) {
            var http = new XMLHttpRequest();
            http.onload = function () {
                if (http.readyState === XMLHttpRequest.DONE) {
                    if (http.status === 200 || http.status === 304) {
                        resolve(JSON.parse(http.responseText));
                    } else {
                        reject(http.status);
                    }
                }
            };
            http.open('GET', url);
            http.send();
        });
    }

    function validateAround(previousChar, followingChar, rules, kword) {
        if (rules == 'ALL') return true;
        if (rules.both) {
            if (rules.both.indexOf(previousChar) != -1 && rules.both.indexOf(followingChar) != -1) {
                return true;
            }
            return false;
        } else {
            if (rules.prev.indexOf(previousChar) != -1 && rules.flw.indexOf(followingChar) != -1) {
                return true;
            }
            return false;
        }

        // if(type=="keywords"){
        //     if(rules.indexOf(previousChar) != -1 && rules.indexOf(followingChar) != -1){
        //         return true;
        //     }
        //     return false;
        // }else if(type=="misc"){
        //     rules = rules[kword]
        //     if(rules){
        //         if(rules.indexOf(previousChar) != -1 && rules.indexOf(followingChar) != -1){
        //             return true;
        //         }
        //         return false;
        //     }
        //     return true;
        // }else if(type=="properties"){
        //      if(previousChar == "." && (followingChar == " " || followingChar == " " || followingChar == "\n" || followingChar == "("))
        //         return true;
        //      return false;
        // }
        // let output = false;
        // if("keywords" == type){
        //     dos = ;
        //     for (let i = 0; i < dos.length;i++){
        //         if(previousChar
        //     }
        //     if((previousChar == " " || previousChar == "\n") && (followingChar == " " || followingChar == "\n"))
        //         return true
        //     return false
        // }
        // else if("properties"){
        //     if(previousChar == "." || previousChar == ")" && (followingChar != " " || followingChar != "\n"))
        //         return true
        //     return false
        // }
    }

    function putSpanAround(text, posB, wordLength, color, kword, rules) {
        var previousChar = text.charAt(posB - 1);
        var followingChar = text.charAt(posB + wordLength);
        if (validateAround(previousChar, followingChar, rules, kword)) {
            // Check if the keyword spaces, if not, highlight it
            var before = text.substr(0, posB) + ('<span style=\'color:' + color + '\'>');
            before += kword;
            var after = "</span>" + text.substr(posB + wordLength);
            text = before + after;
            var next = text.indexOf(kword, before.length + 7);
            return { output: text, next: next };
        }
        return { output: text, next: text.indexOf(kword, posB + 1) };
    }

    function outputToTheDOM(text, domPos) {
        var splitted = text.split('\n');
        var output = "<ol class='code-output'>";
        for (var i = 1; i < splitted.length - 1; i++) {
            output += '<li><pre>' + splitted[i] + '</pre></li>';
        }
        output += "</ol>";
        domPos.innerHTML = output;
    }

    function verify(text, keywords, rules) {
        var rule = undefined;
        for (var kw in keywords) {
            var occur = text.indexOf(kw);
            if (rules[kw]) rule = rules[kw];else rule = rules.default;
            while (occur != -1) {
                var res = putSpanAround(text, occur, kw.length, keywords[kw], kw, rule);
                text = res.output;
                occur = res.next;
            }
        }
        return text;
    }

    function handleDataIndividually(snippet, data) {
        snippets.forEach(function (snippet) {
            var text = snippet.textContent;
            for (var opt in data) {
                if (opt.charAt(0) == '-') //will ignore properties with a - at the start
                    continue;
                if (data['-RULES'][opt]) text = verify(text, data[opt], data['-RULES'][opt]);else text = verify(text, data[opt], data['-RULES'].default);
            }
            outputToTheDOM(text, snippet);
            if (caching && window.localStorage.getItem(snippet.getAttribute(fileName)) == null) window.localStorage.setItem(snippet.getAttribute(fileName), JSON.stringify(data));
        });
    }

    function handleDataNotIndividual(snippet, data) {
        snippets.forEach(function (snippet) {
            var lang = snippet.getAttribute('data-plang');
            var text = snippet.textContent;
            for (var opt in data[lang]) {
                if (opt.charAt(0) == '-') //will ignore properties with a - at the start
                    continue;
                if (data[lang]['-RULES'][opt]) text = verify(text, data[lang][opt], data[lang]['-RULES']);else text = verify(text, data[lang][opt], data[lang]['-RULES'].default);
            }
            outputToTheDOM(text, snippet);
            if (caching && window.localStorage.getItem(lang) == null) window.localStorage.setItem(lang, JSON.stringify(data));
        });
    }

    function getData(url) {
        getJSON(url).then(function (data) {
            if (individualJSON) handleDataIndividually(snippets, data);else handleDataNotIndividual(snippets, data);
        }).catch(function (err) {
            snippets.forEach(function (snippet) {
                var text = snippet.textContent;
                outputToTheDOM(text, snippet);
            });
            console.error('MOON > An error occurred when trying to get the data');
            throw err;
        });
    }

    function individual() {
        snippets.forEach(function (snippet) {
            if (caching) {
                var localStorageResponse = window.localStorage.getItem(snippet.getAttribute('data-plang'));
                if (localStorageResponse !== null) {
                    handleDataIndividually(snippet, JSON.parse(localStorageResponse));
                } else {
                    getData(path + snippet.getAttribute('data-plang') + '.json');
                    return;
                }
            }
            getData(path + snippet.getAttribute('data-plang') + '.json');
        });
    }

    function notIndividual() {
        if (caching) {
            var localStorageResponse = window.localStorage.getItem(fileName);
            if (localStorageResponse !== null) {
                handleDataNotIndividual(snippets, JSON.parse(localStorageResponse));
            } else {
                getData(path + fileName);
                return;
            }
        }
        getData(path + fileName);
    }

    switch (individualJSON) {
        case true:
            individual();
            break;
        case false:
            notIndividual();
            break;
    }
};

startMoon({
    fileName: 'ruleset.json', //will be ignored if individualJSON is set to true
    path: './data/',
    caching: true //if it is true, all data retrieved from the server will be stored on the localStorage of the browser
});