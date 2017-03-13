// ==UserScript==
// @name           Thing Checker
// @namespace      https://github.com/Tiny-Giant/
// @version        1.0.0.6
// @description    Indicates if the current review task is an audit; shows true post score for audits.
// @author         @TinyGiant
// @include        /^https?://\w*.?(stackoverflow|stackexchange|serverfault|superuser|askubuntu|stackapps)\.com/review/.*/
// @grant          none
// ==/UserScript==
/* jshint -W097 */
/* jshint: esnext: true */
'use strict';

/*********************************************************
 * This is an experiment to show that it is possible.    *
 * This is not intended to actually be used              *
 * If you get caught using this you may be review banned *
 *********************************************************/

const ThingChecker = (function() { 
    document.querySelector('.review-actions').insertAdjacentHTML('beforebegin', `
        <h1 class="audit-indicator"></h1>
        <span class="lsep">|</span>
        <span class="indicator-counts"></span>
        <style type="text/css">
            .audit-indicator {
                display: inline-block;
                margin: 0;
                padding: 0;
                line-height: 1.0em;
                vertical-align: middle;
            }
            .audit-indicator {
                color: red;
            }
            .audit-indicator > .indicator-counts {
                font-size: 0.8em;
                display: inline-block;
                vertical-align: middle;
            }
        </style>
    `);
    
    let indicator = document.querySelector('.audit-indicator');
    let counts = document.querySelector('.indicator-counts');
    
    const posts = (function() {
        const funcs = {
            votes: post => new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();

                xhr.addEventListener('load', () => {
                    if(xhr.status !== 200)
                        return reject(xhr);

                    resolve(JSON.parse(xhr.response));
                }, false);

                xhr.open('GET', `/posts/${ post }/vote-counts`);

                xhr.send();
            })
        };

        return new Proxy({}, {
            get: (target, post) => new Proxy({}, { get: (target, key) => funcs[key](post) })
        });
    })();
    
    let listener; // JSHint doesn't understand async / await
    /* jshint ignore:start */
    listener = async event => {
        const json = JSON.parse(event.target.response);
        indicator.textContent = json.isAudit ? 'This is an audit' : '';
        counts.textContent = json.isAudit ? (votes => `(${ votes.up } / ${ votes.down })`)(await posts[json.postId].votes) : '';
    };
    /* jshint ignore:end */
        
    const open = XMLHttpRequest.prototype.open;

    XMLHttpRequest.prototype.open = function(...args) {
        if(/review.next\-task|review.task\-reviewed/.test(args[1])) {
            this.addEventListener('load', listener, false);
        }

        open.apply(this, args);
    };
})();
