// ==UserScript==
// @name           CV Request Generator
// @namespace      https://github.com/SO-Close-Vote-Reviewers/
// @version        2.0.0.0
// @description    This script generates formatted close vote requests and sends them to a specified chat room
// @author         @TinyGiant
// @include        /^https?:\/\/\w*.?(stackexchange.com|stackoverflow.com|serverfault.com|superuser.com|askubuntu.com|stackapps.com|mathoverflow.net)\/.*/
// @updateURL      https://github.com/Tiny-Giant/myuserscripts/raw/master/CVRequestGenerator.user.js
// @grant          GM_xmlhttpRequest
// @grant          GM_addStyle
// ==/UserScript==
/* jshint -W097 */
/* jshint esversion: 6 */
'use strict';

const scriptName = GM_info.script.name.replace(/\s+/g, '');
const scriptVersion = GM_info.script.version;
const scriptURL = GM_info.script.updateURL;
const scriptVersionURL = 'https://github.com/Tiny-Giant/myuserscripts/raw/master/CVRequestGenerator.version';

let css = [
    '.post-menu > span > a {',
    '    padding:0 3px 2px 3px;',
    '    color:#888;',
    '}',
    '.post-menu > span > a:hover {',
    '    color:#444;',
    '    text-decoration:none;',
    '}',
    '.cvrgui {',
    '    position:relative;',
    '    display:inline-block;',
    '}',
    '.cvrgui * {',
    '    box-sizing: border-box;',
    '}',
    '.cv-list {',
    '    display: none;',
    '    margin:0;',
    '    padding: 0;',
    '    z-index:1;',
    '    position:absolute;',
    '    white-space:nowrap;',
    '    border:1px solid #ccc;',
    '    border-radius: 5px;',
    '    background:#FFF;',
    '    box-shadow:0px 5px 10px -5px rgb(0,0,0,0.5);',
    '}',
    '.cv-list .cv-request {',
    '    padding: 6px;',
    '}',
    '.cv-list input {',
    '    display: inline-block;',
    '    font-size: 13px;',
    '    line-height: 15px;',
    '    padding: 8px 10px;',
    '    box-sizing: border-box;',
    '    border-radius: 0;',
    '    margin: 0px;',
    '}',
    '.cv-list input[type="text"] {',
    '    border-top-left-radius: 3px;',
    '    border-bottom-left-radius: 3px;',
    '}',
    '.cv-list input[type="submit"] {',
    '    border-top-right-radius: 3px;',
    '    border-bottom-right-radius: 3px;',
    '}',
    '.cv-list dd {',
    '    margin: 0;',
    '    padding: 0;',
    '}',
    '.cv-list .cv-update a {',
    '    border-top: 1px solid #ccc;',
    '    display: block;',
    '    padding: 10px;',
    '    text-align: center;',
    '}',
    '.cv-list .cv-update a:hover {',
    '    background: #eee;',
    '    border-bottom-left-radius: 5px;',
    '    border-bottom-right-radius: 5px;',
    '}',
    '.cv-list * {',
    '    vertical-align: middle;',
    '}',
    '.cv-popup-box {',
    '    padding: 5px;',
    '}',
    '.cv-popup-box input {',
    '    margin: 0px;',
    '}'
].join('\n');

if (false);
else if ("undefined" != typeof GM_addStyle)  GM_addStyle(css);
else if ("undefined" != typeof PRO_addStyle) PRO_addStyle(css);
else if ("undefined" != typeof addStyle)     addStyle(css);
else (document.body || document.getElementsByTagName("body")[0]).appendChild(document.createElement("style").appendChild(document.createTextNode(css)).parentNode);

if (!("StackExchange" in window))
{
    StackExchange = unsafeWindow.StackExchange;
}

let globals = {};

globals.room = {
    "host": "http://chat.stackoverflow.com",
    "url": "http://chat.stackoverflow.com/rooms/41570/so-close-vote-reviewers",
    "id": "41570",
};

// Use this room for testing.
/*globals.room = {
    "host": "https://chat.stackoverflow.com",
    "url": "https://chat.stackoverflow.com/rooms/68414/socvr-testing-facility",
    "id": "68414"
};*/

globals.fkey = undefined;

globals.base = window.location.protocol + '//' + window.location.host;

let funcs = {};

//Wrap local storage access so that we avoid collisions with other scripts
funcs.getStorage = key => localStorage[scriptName + '_' + key]; 
      
funcs.setStorage = (key, val) => (localStorage[scriptName + '_' + key] = val); 

funcs.notify = (() =>
{
    let count = 0;

    return (message, time) =>
    {
        StackExchange.notify.show(message, ++count);

        if (typeof time === "number" && !isNaN(time))
        {
            setTimeout(StackExchange.notify.close.bind(null, count), time);
        }
    };
})();

funcs.update = force => new Promise((resolve, reject) =>
{ 
    GM_xmlhttpRequest(
    {
        method: 'GET',
        url: scriptVersionURL,
        onload: xhr =>
        {
            let newVersion = xhr.responseText.trim();

            let proposed = newVersion.split(".");
            let current = scriptVersion.split(".");

            let isNewer = false;

            while(proposed.length < current.length)
            {
                proposed.push("0");
            }
            while(proposed.length > current.length)
            {
                current.push("0");
            }

            for(let i = 0; i < proposed.length; i++)
            {
                if (+proposed[i] > +current[i])
                {
                    isNewer = true;
                    break;
                }
                if (+proposed[i] < +current[i])
                {
                    isNewer = false;
                    break;
                }
            }

            if (isNewer)
            {
                if (funcs.getStorage('LastAcknowledgedVersion') != newVersion || force)
                {
                    if (confirm('A new version of the CV Request Generator is available, would you like to install it now?'))
                    {
                        window.location.href = scriptURL;
                    }
                    else
                    {
                        funcs.setStorage('LastAcknowledgedVersion', newVersion);
                    }
                }
            }
            else 
            {
                if (force) 
                {
                    funcs.notify('No new version available');
                }
            }
            
            resolve(xhr);
        },
        onerror: xhr =>
        {
            funcs.notify('Failed querying new script version. Check the console.');
            console.log(xhr);
            reject(xhr);
        }
    });
});

funcs.getFKey = () => new Promise((resolve, reject) => 
{
    GM_xmlhttpRequest(
    {
        method: 'GET',
        url: globals.room.url,
        onload: xhr => 
        {
            let fkey = xhr.responseText.match(/hidden" value="([\dabcdef]{32})/)[1];

            if (fkey !== null) 
            {
                globals.fkey = fkey;
                resolve(fkey);
            }
            else
            {
                funcs.notify('Failed retrieving key, Check the console.');
                console.log(xhr);
                reject(xhr);
            }
        },
        onerror: xhr =>
        {
            funcs.notify('Failed retrieving key. Check the console.');
            console.log(xhr);
            reject(xhr);
        }
    });
});

funcs.request = request => new Promise((resolve, reject) => 
{   
    if(typeof globals.fkey === 'undefined')
    {
        funcs.notify('Fkey not set.');
        reject('FKey not set.');
        return;
    }
    
    GM_xmlhttpRequest(
    {
        method: 'POST',
        url: globals.room.host + '/chats/' + globals.room.id + '/messages/new',
        headers: 
        {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: 'text=' + encodeURIComponent(request) + '&fkey=' + globals.fkey,
        onload: xhr => {
            funcs.notify('Close vote request sent.',1000);
            resolve(xhr);
        },
        onerror: xhr =>
        {
            funcs.notify('Failed sending close vote request. Check the console.');
            console.log(xhr);
            reject(xhr);
        }
    });
});

funcs.addXHRListener = callback =>
{
    let open = XMLHttpRequest.prototype.open;

    XMLHttpRequest.prototype.open = function() 
    {
        this.addEventListener('load', callback.bind(null, this), false);
        open.apply(this, arguments);
    };
};

class CVRGUI
{
    constructor(scope)
    {
        if (!(scope instanceof HTMLElement))
        {
            funcs.notify('Error building CV Request Generator GUI. Check the console.');
            console.log('CVRGUI expects scope to be an instance of HTML element.', scope);
            return;
        }
        
        this.question = {};
        
        this.question.id = scope.dataset.questionid;
        
        if (typeof this.question.id === 'undefined')
        {
            console.log('Question ID is not defined.', scope);
        }
        
        this.question.title = (() => 
        {
            let title = document.querySelector('a[href*="questions/' + this.question.id + '"]');
            
            if (title === null || /#/.test(title.href))
            {
                title = document.querySelector('a[href*="q/' + this.question.id + '"]');
                
                if (title === null || /#/.test(title.href))
                {
                    return 'Title not found';
                }
            }
            
            return title.textContent.replace(/\[(.*)\]/g, '($1)');
        })();
        
        this.question.url = window.location.protocol + '//' + window.location.host + '/q/' + this.question.id;
        
        this.question.time = (() => 
        {
            let time = scope.querySelector('.owner .relativetime');
            
            if (time === null)
            {
                return time.title;
            }
        })();
        
        this.question.author = {};
        
        this.question.author.name = (() => 
        {
            let details = scope.querySelector('.post-signature:not([align="right"]) .user-details');
            
            if (details === null)
            {
                return 'Author not found';
            }
            
            return details.textContent.trim().split('\n')[0].trim();
        })();
        
        this.question.author.url = (() =>
        {
            let link = scope.querySelector('.owner a');
            
            if (link !== null)
            {
                return link.href;
            }
        })();
        
        this.nodes = {};
        
        this.nodes.scope = scope;
        
        this.nodes.menu = this.nodes.scope.querySelector('.post-menu');
        
        if (this.nodes.menu === null)
        {
            return;
        }
        
        this.nodes.wrap = document.createElement('span');
        this.nodes.wrap.className = 'cvrgui';
        this.nodes.menu.appendChild(this.nodes.wrap);
        this.nodes.wrap.addEventListener('click', event =>
        {
            event.stopPropagation();
        }, false);
        
        this.nodes.button = document.createElement('a');
        this.nodes.button.href = '#';
        this.nodes.button.className = 'cv-button';
        this.nodes.button.textContent = 'cv-pls';
        this.nodes.wrap.appendChild(this.nodes.button);
        this.nodes.button.addEventListener('click', event =>
        {
            this.nodes.list.toggle();
            event.preventDefault();
        }, false);
        
        this.nodes.list = document.createElement('dl');
        this.nodes.list.className = 'cv-list';
        this.nodes.wrap.appendChild(this.nodes.list);
        this.nodes.list.hidden = true;
        this.nodes.list.hide = () => 
        {
            this.nodes.list.hidden = true;
            this.nodes.list.style.display = '';
        };
        this.nodes.list.show = () => 
        {
            this.nodes.list.hidden = false;
            this.nodes.list.style.display = 'block';
        };
        this.nodes.list.toggle = () => 
        {
            this.nodes.list.hidden = !this.nodes.list.hidden;
            this.nodes.list.style.display = ['block',''][+this.nodes.list.hidden];
        };
        document.addEventListener('click', event =>
        {
            if (!this.nodes.list.hidden)
            {
                this.nodes.list.hide();
            }
        }, false);
        
        this.nodes.request = {};
        
        this.nodes.request.send = reason =>
        {
            let title = '[' + this.question.title + '](' + this.question.url + ')'; 
            let user = this.question.author.name;
            
            if (this.question.author.url)
            {
                user = '[' + this.question.author.name + '](' + this.question.author.url + ')';
            }
            
            let time = this.question.time;
            
            if (time !== undefined)
            {
                user += ' - ' + time;
            }
            
            let before = '[tag:cv-pls] ';
            let after = ' ' + title + ' - ' + user;
            
            let remaining = 500 - (before.length + after.length);
            
            if (reason.length > remaining)
            {
                reason = reason.substr(0, remaining - 3).trim() + '...';
            }
            
            let request = before + reason + after;
            
            console.log(request, request.length);
            
            funcs.getFKey().then(response => 
            {
                funcs.request(request).then(response =>
                {
                    this.nodes.list.hide();
                });
            });
        };
        
        this.nodes.request.item = document.createElement('dd');
        this.nodes.request.item.className = 'cv-request';
        this.nodes.list.appendChild(this.nodes.request.item);
        
        this.nodes.request.form = document.createElement('form');
        this.nodes.request.item.appendChild(this.nodes.request.form);
        this.nodes.request.form.addEventListener('submit', event =>
        {
            event.preventDefault();
            
            let reason = this.nodes.request.input.value;
            
            if (reason === '') 
            {
                return;
            }
            
            this.nodes.request.send(reason);
        }, false);
            
        this.nodes.request.input = document.createElement('input');
        this.nodes.request.input.type = 'text';
        this.nodes.request.input.placeholder = 'Enter reason here...';
        this.nodes.request.input.value = funcs.getStorage(this.question.id + '-reason') || '';
        this.nodes.request.form.appendChild(this.nodes.request.input);
            
        this.nodes.request.submit = document.createElement('input');
        this.nodes.request.submit.type = 'submit';
        this.nodes.request.submit.value = 'Send';
        this.nodes.request.form.appendChild(this.nodes.request.submit);
        
        this.nodes.update = {};
        
        this.nodes.update.item = document.createElement('dd');
        this.nodes.update.item.className = 'cv-update';
        this.nodes.list.appendChild(this.nodes.update.item);
        
        this.nodes.update.link = document.createElement('a');
        this.nodes.update.link.href = '#';
        this.nodes.update.link.textContent = 'Update';
        this.nodes.update.item.appendChild(this.nodes.update.link);
        this.nodes.update.link.addEventListener('click', event =>
        {
            event.preventDefault();
            funcs.update(true);
        }, false);
    }
}

let questions = Array.from(document.querySelectorAll('.question'));

let CVRGUIs = {};
          
for(let question of questions)
{
    let gui = new CVRGUI(question);
    
    if (typeof gui !== 'undefined')
    {
        CVRGUIs[gui.question.id] = gui;
    }
}

funcs.addXHRListener(xhr => 
{
    if (/ajax-load-realtime/.test(xhr.responseURL))
    {
        var matches = /question" data-questionid="(\d+)/.exec(xhr.responseText);
        
        if (matches === null)
        {
            return;
        }
        
        let question = document.querySelector('[data-questionid="' + matches[1] + '"]');
        
        if (question === null)
        {
            return;
        }
        
        let gui = new CVRGUI(question);
        
        CVRGUIs[gui.question.id] = gui;
    }
});

(() =>
{
    let nodes = {};
    
    nodes.label = document.createElement('label');
    nodes.label.className = 'cv-popup-box';

    nodes.checkbox = document.createElement('input');
    nodes.checkbox.type = 'checkbox';
    nodes.label.appendChild(nodes.checkbox);

    nodes.text = document.createTextNode(' cv-pls');
    nodes.label.appendChild(nodes.text);
    
    funcs.addXHRListener(xhr =>
    {
        if (/close\/popup/.test(xhr.responseURL))
        {
            nodes.popup = document.querySelector('#popup-close-question');

            if (nodes.popup === null)
            {
                return;
            }

            nodes.votes = nodes.popup.querySelector('.remaining-votes');

            if (nodes.votes === null)
            {
                return;
            }

            nodes.votes.appendChild(nodes.label);
            
            nodes.textarea = nodes.popup.querySelector('textarea');
            
            nodes.submit = nodes.popup.querySelector('.popup-submit');
        }
    });
    
    funcs.addXHRListener(xhr =>
    {
        if (/close\/add/.test(xhr.responseURL))
        {
            console.log(nodes.checkbox.checked);
            if (!nodes.checkbox.checked)
            {
                return;
            }
            
            let questionid = /\d+/.exec(xhr.responseURL);
            console.log(questionid);
            
            if (questionid === null)
            {
                return;
            }
            
            questionid = questionid[0];
            console.log(questionid);
            
            let gui = CVRGUIs[questionid];
            console.log(gui);
            
            if (typeof gui === 'undefined')
            {
                return;
            }
            
            let reasons = {
                101: "Duplicate",
                102: {
                    2: "Belongs on another site",
                    3: "Custom reason",
                    4: "General computing hardware / software",
                    7: "Professional server / networking administration",
                    11: "Typo or Cannot Reproduce",
                    13: "Debugging / No MCVE",
                    16: "Request for Off-Site Resource",
                },
                103: "Unclear what you're asking",
                104: "Too broad",
                105: "Primarily opinion-based"
            };
            
            if (nodes.textarea instanceof HTMLElement)
            {
                reasons[102][3] = nodes.textarea.value; 
            }
            console.log(reasons);
            
            let data = JSON.parse(xhr.responseText);
            console.log(data);
            
            let reason = reasons[data.CloseReason];
            console.log(reason);
            
            if (typeof data.CloseAsOffTopicReasonId !== 'undefined')
            {
                reason = reason[data.CloseAsOffTopicReasonId];
            }
            console.log(reason);
            
            gui.nodes.request.send(funcs.setStorage(questionid + '-reason', reason));
        }
    });
})();
