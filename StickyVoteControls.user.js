// ==UserScript==
// @name         Sticky vote controls
// @namespace    http://github.com/TinyGiant/
// @version      1.0.0.1
// @description  Brings back the experimental sticky vote controls.
// @author       @TinyGiant
// @include      /^https?://\w*.?(stackoverflow|stackexchange|serverfault|superuser|askubuntu|stackapps)\.com/questions/(?!tagged|new).*/
// @grant        none
// ==/UserScript==

var votes = $('.vote');
var cells = $('.votecell');

votes.css({'position':'absolute'});
cells.css({'width':'46px'});

votes.each(function(i,el){
    el = $(el);
    var postheight = el.parent().next().find('.post-text').height();
    if(el.height() >= postheight) return;
    var parent = el.parent();
    var maxTop = parent.offset().top;
    var maxBottom = maxTop + parent.height() - el.height();
    $(document).scroll(window.requestAnimationFrame.bind(null,function() {
        if(document.body.scrollTop > maxTop) document.body.scrollTop < maxBottom && el.css({'top':document.body.scrollTop}); else el.css({'top':''});
    }));
})
