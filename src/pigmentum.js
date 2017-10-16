let pigmentum = (function({path = "./", caching = false, individualJSON = true, delayPerLine = 0, streaming = false}){

    const snippets = document.querySelectorAll('.pigmentum');
    let ruleset = null

    function getJSON(lang){
        switch(individualJSON){
            case false:
                return handleNotIndividualJSON(lang);
            break;

            case true:
                switch(caching){
                    case false:
                        return getRequest(path+lang+".json");
                    break;

                    case true:
                        return getLocalStorage(lang);
                    break;
                }
            break;
        }   
    }

    function handleNotIndividualJSON(lang){
        return new Promise((resolve,reject)=>{
            if(!caching){ 
                if(ruleset === null){
                    getRequest(path+"ruleset.json").then((data)=>{
                        ruleset = data;
                        resolve(ruleset[lang]);
                    }).catch((error)=>{
                        reject(error);
                    });
                }else{
                    resolve(ruleset[lang]);
                }
            }else{
                if(ruleset === null){
                    if(window.localStorage.getItem("ruleset")){
                        ruleset = JSON.parse(window.localStorage.getItem("ruleset"));
                        resolve(ruleset[lang]);
                    }else{
                        getRequest(path+"ruleset.json").then((data)=>{
                            ruleset = data;
                            window.localStorage.setItem("ruleset", JSON.stringify(data));
                        resolve(ruleset[lang]);
                        }).catch((error)=>{
                            reject(error);
                        });
                    }
                }else{
                    resolve(ruleset[lang]);
                }
            }
        });
    }

    function getRequest(path){
        return new Promise((resolve,reject)=>{
            let http = new XMLHttpRequest();
            http.onload = ()=>{
                if(http.readyState === XMLHttpRequest.DONE){
                    if(http.status === 200 || http.status === 304){
                        resolve(JSON.parse(http.responseText));
                    }else{
                        reject(http.status);
                    }
                }
            }
            http.open('GET', path);
            http.send();
        });
    }

    function getLocalStorage(lang){
        return new Promise((resolve,reject)=>{
            if(window.localStorage.getItem(lang)){
                try{
                    resolve(JSON.parse(window.localStorage.getItem(lang)));
                }catch(SyntaxError){
                    window.localStorage.removeItem(lang)
                    reject("Invalid JSON");
                }
            }else{
                getRequest(path+lang+".json").then((data)=>{
                    window.localStorage.setItem(lang, JSON.stringify(data));
                    resolve(data);
                }).catch((error)=>{
                    reject(error);
                });
            }
        });
    }

    function validateAround(previousChar,followingChar,rules,kword){
        if(rules == 'ALL')
         return true
        if(rules.both){
            if(rules.both.indexOf(previousChar) != -1 && rules.both.indexOf(followingChar) != -1){
                return true;
            }
            return false;
        }else{
            if(rules.prev.indexOf(previousChar) != -1 && rules.flw.indexOf(followingChar) != -1){
                return true;
            }
            return false;
        }
    }

    function putSpanAround(text, posB, wordLength, type, kword, codiname, rules){
        let previousChar = text.charAt(posB-1);
        let followingChar = text.charAt(posB+wordLength);
        if(validateAround(previousChar,followingChar,rules,kword)){ // Check if keyword around chars are valid, if it is'nt not, highlight it
            let before = text.substr(0,posB) + `<span class='${type} ${codiname}'>`
            before += kword;
            let after = "</span>" + text.substr(posB+wordLength);
            text = before+after;
            let next = text.indexOf(kword,before.length+7);
            return {output: text, next};
        }
        return {output: text, next:text.indexOf(kword,posB+1)};
    }

    function streamToTheDOM(text, domPos){
        domPos.innerHTML = "";
        let splitted = text.split('\n');
        let ol = document.createElement("OL");
        ol.className = 'code-output';
        domPos.appendChild(ol);
        for(let i = 1;i < splitted.length-1;i++){
            setTimeout(()=>{
                ol.innerHTML += (`<li id="${i}"><span class="line-number">${i}</span><pre>${splitted[i]}</pre></li>`);
            }, delayPerLine*i);
        }
    }

    function outputToTheDOM(text, domPos){
        let splitted = text.split('\n');
        let output = "<ol class='code-output'>";
        for(let i = 1;i < splitted.length-1;i++){
            output+=`<li id="${i}"><span class="line-number">${i}</span><pre>${splitted[i]}</pre></li>`;
        }
        output += "</ol>";
        domPos.innerHTML = output;
    }

    function verify(text, keywords, type, rules){
        let rule = undefined;
        for(let  i = 0;i < keywords.length; i++){
            let k;
            let cn;
            if(typeof keywords[i] === "object"){
                k = keywords[i][0];
                cn = keywords[i][1];
            }else{
                k = keywords[i];
                cn = k
            }
            let occur = text.indexOf(k);
            if(rules[k])
                rule = rules[k]
            else
                rule = rules.default
            while(occur != -1){
                let res = putSpanAround(text,occur,k.length,type,k,cn,rule);
                text = res.output;
                occur = res.next;
            }
        }
        return text;
    }

    function getLangs(){
        const langs = {};
        snippets.forEach((snippet)=>{
            cLang = snippet.getAttribute("data-plang");
            if(langs[cLang] !== undefined || langs[cLang]){
                langs[cLang].push(snippet);
            }else{
                langs[cLang] = new Array();
                langs[cLang].push(snippet);
            }
        });
        return langs;
    }

    function throughLangs(){
        let langs = getLangs();
        for(lang in langs){
            handleData(lang, langs[lang]);
            //if(caching && window.localStorage.getItem(snippet.getAttribute(fileName))==null)
                //window.localStorage.setItem(snippet.getAttribute(fileName), JSON.stringify(data));
        }      
    }

    function handleData(lang, langSnippets){
        getJSON(lang).then((data)=>{
            langSnippets.forEach((snippet)=>{
                throughSnippet(snippet, data);
            });
        }).catch((err)=>{
            langSnippets.forEach((snippet)=>{
                let text = snippet.textContent;
                if(!streaming)
                    outputToTheDOM(text,snippet);
                else
                    streamToTheDOM(text, snippet);
            });
            console.error('pigmentum.js > An error occurred when trying to get the data');
            throw err;
        });
    }

    function throughSnippet(snippet, data){
        let text = snippet.textContent;
        for (let opt in data){
            if(opt.charAt(0) == '-') //will ignore properties with a - at the start
                continue;
            if(data['-RULES'][opt])
                text = verify(text, data[opt], opt, data['-RULES'][opt]);
            else
                text = verify(text, data[opt], opt, data['-RULES'].default);
        }
        if(!streaming)
            outputToTheDOM(text,snippet);
        else
            streamToTheDOM(text, snippet);
    }

    throughLangs();

 });

pigmentum({
    path: "../data/", // DEFAULT:"./" % Path to the rulesets.

    caching: true, // DEFAULT:FALSE % Will store the data from the server to the localStorage. It can reduce several HTTP requests.

    individualJSON: true, // DEFAULT:TRUE % Will request for individual ruleset files. It can increase the amount of HTTP requests. 

    delayPerLine: 0, // DEFAULT:0 % Amount of time that each line of code will appear in the browser. This is almost useless, I made it for fun. This only works if streaming is set to TRUE

    streaming: true // DEFAULT:FALSE % Will send a line of code to the browser immediately when it's done. If it's set to false, delayPerLine is ignored and pigmentum.js will wait for the whole code is highlit to send to the browser.
});