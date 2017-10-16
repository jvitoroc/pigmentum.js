let startMoon = (function({
    individualJSON = false,
    path = 'moon-src/',
    fileName = 'ruleset.json',
    caching = false
}){
    const snippets = document.querySelectorAll('.moon');
    let rules = {}

    function getJSON(url){
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
            http.open('GET', url);
            http.send();
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

    function putSpanAround(text,posB,wordLength,color,kword,rules){
        let previousChar = text.charAt(posB-1);
        let followingChar = text.charAt(posB+wordLength);
        if(validateAround(previousChar,followingChar,rules,kword)){ // Check if the keyword spaces, if not, highlight it
            let before = text.substr(0,posB) + `<span style='color:${color}'>`
            before += kword;
            let after = "</span>" + text.substr(posB+wordLength);
            text = before+after;
            let next = text.indexOf(kword,before.length+7);
            return {output: text, next};
        }
        return {output: text, next:text.indexOf(kword,posB+1)};
    }

    function outputToTheDOM(text,domPos){
        let splitted = text.split('\n');
        let output = "<ol class='code-output'>";
        for(let i = 1;i < splitted.length-1;i++){
            output+=`<li><pre>${splitted[i]}</pre></li>`;
        }
        output += "</ol>";
        domPos.innerHTML = output;
    }

    function verify(text, keywords,rules){
        let rule = undefined;
        for(let kw in keywords){
            let occur = text.indexOf(kw);
            if(rules[kw])
                rule = rules[kw]
            else
                rule = rules.default
            while(occur != -1){
                let res = putSpanAround(text,occur,kw.length,keywords[kw],kw,rule);
                text = res.output;
                occur = res.next;
            }
        }
        return text;
    }

    function handleDataIndividually(snippet, data){
        snippets.forEach((snippet)=>{
            let text = snippet.textContent;
            for (let opt in data){
                if(opt.charAt(0) == '-') //will ignore properties with a - at the start
                    continue;
                if(data['-RULES'][opt])
                    text = verify(text,data[opt],data['-RULES'][opt]);
                else
                    text = verify(text,data[opt],data['-RULES'].default);
            }
            outputToTheDOM(text,snippet);
            if(caching && window.localStorage.getItem(snippet.getAttribute(fileName))==null)
                window.localStorage.setItem(snippet.getAttribute(fileName), JSON.stringify(data));
        });
    }

    function handleDataNotIndividual(snippet, data){
        snippets.forEach((snippet)=>{
            let lang = snippet.getAttribute('data-plang');
            let text = snippet.textContent;
            for (let opt in data[lang]){
                if(opt.charAt(0) == '-') //will ignore properties with a - at the start
                    continue;
                if(data[lang]['-RULES'][opt])
                    text = verify(text,data[lang][opt],data[lang]['-RULES']);
                else
                    text = verify(text,data[lang][opt],data[lang]['-RULES'].default);
            }
            outputToTheDOM(text,snippet);
            if(caching && window.localStorage.getItem(lang)==null)
                window.localStorage.setItem(lang, JSON.stringify(data));
        });
    }

    function getData(url){
        getJSON(url).then((data)=>{
            if(individualJSON)
                handleDataIndividually(snippets, data);
            else
                handleDataNotIndividual(snippets, data);
        }).catch((err)=>{
            snippets.forEach((snippet)=>{
                let text = snippet.textContent;
                outputToTheDOM(text,snippet);
            });
            console.error('MOON > An error occurred when trying to get the data');
            throw err;
         });
    }

    function individual(){
        snippets.forEach((snippet)=>{
            if(caching){
                let localStorageResponse = window.localStorage.getItem(snippet.getAttribute('data-plang'));
                if(localStorageResponse !== null){
                    handleDataIndividually(snippet, JSON.parse(localStorageResponse));
                }else{
                    getData(path+snippet.getAttribute('data-plang')+'.json');
                    return;
                }
            }
            getData(path+snippet.getAttribute('data-plang')+'.json');

            });
    }

    function notIndividual(){
        if(caching){
            let localStorageResponse = window.localStorage.getItem(fileName);
            if(localStorageResponse !== null){
                handleDataNotIndividual(snippets, JSON.parse(localStorageResponse));
            }else{
                getData(path+fileName);
                return;
            }
        }
        getData(path+fileName);
    }

    switch(individualJSON){
        case true:
            individual();
            break;
        case false:
            notIndividual();
            break;
    }

 });

startMoon({
    fileName: 'ruleset.json', // Will be ignored if individualJSON is set to true
    path: './data/',
    caching: true // If it is true, all data retrieved from the server will be stored on the localStorage and requests are reduced.
});
