// ==UserScript==
// @name         Sticky vote controls
// @namespace    http://github.com/TinyGiant/
// @version      1.0.0.3
// @description  Brings back the experimental sticky vote controls.
// @author       @TinyGiant
// @include      /^https?://(?!chat)\w*.?(stackoverflow|stackexchange|serverfault|superuser|askubuntu|stackapps)\.com/.*/
// @grant        none
// ==/UserScript==
/* jshint esnext: true */

(function(){
    "use strict";

    const funcs = {};

    funcs.addXHRListener = callback =>
    {
        let open = XMLHttpRequest.prototype.open;

        XMLHttpRequest.prototype.open = function()
        {
            this.addEventListener('load', callback.bind(null, this), false);
            open.apply(this, arguments);
        };
    };

    funcs.run = () => {
        const votes = $('.question .vote:not(.sticky), .answer .vote:not(.sticky)');
        const cells = $('.question .votecell:not(.sticky), .answer .votecell:not(.sticky)');

        votes.css({'position':'absolute', 'z-index':'100'}).addClass('sticky');
        cells.css({'width':'46px'}).addClass('sticky');

        votes.each(function(i,el){
            el = $(el);
            var postheight = el.parent().next().find('.post-text').height();
            if(el.height() >= postheight) return;
            var parent = el.parent();
            $(document).scroll(window.requestAnimationFrame.bind(null,function() {
                if(document.body.scrollTop > parent.offset().top) document.body.scrollTop < parent.offset().top + parent.height() - el.height() && el.css({'top':document.body.scrollTop}); else el.css({'top':''});
            }));
        });
    };

    funcs.run();

    funcs.addXHRListener(funcs.run);
})();
