"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var pigmentum = function pigmentum(_ref) {
    var _ref$path = _ref.path,
        path = _ref$path === undefined ? "./" : _ref$path,
        _ref$caching = _ref.caching,
        caching = _ref$caching === undefined ? false : _ref$caching,
        _ref$individualJSON = _ref.individualJSON,
        individualJSON = _ref$individualJSON === undefined ? true : _ref$individualJSON,
        _ref$delayPerLine = _ref.delayPerLine,
        delayPerLine = _ref$delayPerLine === undefined ? 0 : _ref$delayPerLine,
        _ref$streaming = _ref.streaming,
        streaming = _ref$streaming === undefined ? false : _ref$streaming;


    var snippets = document.querySelectorAll('.pigmentum');
    var ruleset = null;

    function getJSON(lang) {
        switch (individualJSON) {
            case false:
                return handleNotIndividualJSON(lang);
                break;

            case true:
                switch (caching) {
                    case false:
                        return getRequest(path + lang + ".json");
                        break;

                    case true:
                        return getLocalStorage(lang);
                        break;
                }
                break;
        }
    }

    function handleNotIndividualJSON(lang) {
        return new Promise(function (resolve, reject) {
            if (!caching) {
                if (ruleset === null) {
                    getRequest(path + "ruleset.json").then(function (data) {
                        ruleset = data;
                        resolve(ruleset[lang]);
                    }).catch(function (error) {
                        reject(error);
                    });
                } else {
                    resolve(ruleset[lang]);
                }
            } else {
                if (ruleset === null) {
                    if (window.localStorage.getItem("ruleset")) {
                        ruleset = JSON.parse(window.localStorage.getItem("ruleset"));
                        resolve(ruleset[lang]);
                    } else {
                        getRequest(path + "ruleset.json").then(function (data) {
                            ruleset = data;
                            window.localStorage.setItem("ruleset", JSON.stringify(data));
                            resolve(ruleset[lang]);
                        }).catch(function (error) {
                            reject(error);
                        });
                    }
                } else {
                    resolve(ruleset[lang]);
                }
            }
        });
    }

    function getRequest(path) {
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
            http.open('GET', path);
            http.send();
        });
    }

    function getLocalStorage(lang) {
        return new Promise(function (resolve, reject) {
            if (window.localStorage.getItem(lang)) {
                try {
                    resolve(JSON.parse(window.localStorage.getItem(lang)));
                } catch (SyntaxError) {
                    window.localStorage.removeItem(lang);
                    reject("Invalid JSON");
                }
            } else {
                getRequest(path + lang + ".json").then(function (data) {
                    window.localStorage.setItem(lang, JSON.stringify(data));
                    resolve(data);
                }).catch(function (error) {
                    reject(error);
                });
            }
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
    }

    function putSpanAround(text, posB, wordLength, type, kword, codiname, rules) {
        var previousChar = text.charAt(posB - 1);
        var followingChar = text.charAt(posB + wordLength);
        if (validateAround(previousChar, followingChar, rules, kword)) {
            // Check if keyword around chars are valid, if it is'nt not, highlight it
            var before = text.substr(0, posB) + ("<span class='" + type + " " + codiname + "'>");
            before += kword;
            var after = "</span>" + text.substr(posB + wordLength);
            text = before + after;
            var next = text.indexOf(kword, before.length + 7);
            return { output: text, next: next };
        }
        return { output: text, next: text.indexOf(kword, posB + 1) };
    }

    function streamToTheDOM(text, domPos) {
        domPos.innerHTML = "";
        var splitted = text.split('\n');
        var ol = document.createElement("OL");
        ol.className = 'code-output';
        domPos.appendChild(ol);

        var _loop = function _loop(i) {
            setTimeout(function () {
                ol.innerHTML += "<li id=\"" + i + "\"><span class=\"line-number\">" + i + "</span><pre>" + splitted[i] + "</pre></li>";
            }, delayPerLine * i);
        };

        for (var i = 1; i < splitted.length - 1; i++) {
            _loop(i);
        }
    }

    function outputToTheDOM(text, domPos) {
        var splitted = text.split('\n');
        var output = "<ol class='code-output'>";
        for (var i = 1; i < splitted.length - 1; i++) {
            output += "<li id=\"" + i + "\"><span class=\"line-number\">" + i + "</span><pre>" + splitted[i] + "</pre></li>";
        }
        output += "</ol>";
        domPos.innerHTML = output;
    }

    function verify(text, keywords, type, rules) {
        var rule = undefined;
        for (var i = 0; i < keywords.length; i++) {
            var k = void 0;
            var cn = void 0;
            if (_typeof(keywords[i]) === "object") {
                k = keywords[i][0];
                cn = keywords[i][1];
            } else {
                k = keywords[i];
                cn = k;
            }
            var occur = text.indexOf(k);
            if (rules[k]) rule = rules[k];else rule = rules.default;
            while (occur != -1) {
                var res = putSpanAround(text, occur, k.length, type, k, cn, rule);
                text = res.output;
                occur = res.next;
            }
        }
        return text;
    }

    function getLangs() {
        var langs = {};
        snippets.forEach(function (snippet) {
            cLang = snippet.getAttribute("data-plang");
            if (langs[cLang] !== undefined || langs[cLang]) {
                langs[cLang].push(snippet);
            } else {
                langs[cLang] = new Array();
                langs[cLang].push(snippet);
            }
        });
        return langs;
    }

    function throughLangs() {
        var langs = getLangs();
        for (lang in langs) {
            handleData(lang, langs[lang]);
            //if(caching && window.localStorage.getItem(snippet.getAttribute(fileName))==null)
            //window.localStorage.setItem(snippet.getAttribute(fileName), JSON.stringify(data));
        }
    }

    function handleData(lang, langSnippets) {
        getJSON(lang).then(function (data) {
            langSnippets.forEach(function (snippet) {
                throughSnippet(snippet, data);
            });
        }).catch(function (err) {
            langSnippets.forEach(function (snippet) {
                var text = snippet.textContent;
                if (!streaming) outputToTheDOM(text, snippet);else streamToTheDOM(text, snippet);
            });
            console.error('pigmentum.js > An error occurred when trying to get the data');
            throw err;
        });
    }

    function throughSnippet(snippet, data) {
        var text = snippet.textContent;
        for (var opt in data) {
            if (opt.charAt(0) == '-') //will ignore properties with a - at the start
                continue;
            if (data['-RULES'][opt]) text = verify(text, data[opt], opt, data['-RULES'][opt]);else text = verify(text, data[opt], opt, data['-RULES'].default);
        }
        if (!streaming) outputToTheDOM(text, snippet);else streamToTheDOM(text, snippet);
    }

    throughLangs();
};

pigmentum({
    path: "../data/", // DEFAULT:"./" % Path to the rulesets.

    caching: true, // DEFAULT:FALSE % Will store the data from the server to the localStorage. It can reduce several HTTP requests.

    individualJSON: true, // DEFAULT:TRUE % Will request for individual ruleset files. It can increase the amount of HTTP requests. 

    delayPerLine: 0, // DEFAULT:0 % Amount of time that each line of code will appear in the browser. This is almost useless, I made it for fun. This only works if streaming is set to TRUE

    streaming: true // DEFAULT:FALSE % Will send a line of code to the browser immediately when it's done. If it's set to false, delayPerLine is ignored and pigmentum.js will wait for the whole code is highlighted to send to the browser.
});
