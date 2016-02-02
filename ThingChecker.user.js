// ==UserScript==
// @name           Thing Checker
// @namespace      https://github.com/Tiny-Giant/
// @version        1.0.0.5
// @description    Finds real post scores in the review queues and puts it under the assumed score, also signals if it is an audit.
// @author         @TinyGiant
// @include        /^https?://\w*.?(stackoverflow|stackexchange|serverfault|superuser|askubuntu|stackapps)\.com/review/.*/
// @grant          none
// ==/UserScript==

/*********************************************************
 * This is an experiment to show that it is possible.    *
 * This is not intended to actually be used              *
 * If you get caught using this you may be review banned *
 *********************************************************/

(function(){
    let headerWidth = $('#header').width();
    let logoWidth = $('#hlogo').width();
    let navWidth = $('#hmenus').width();
    let availableWidth = headerWidth - (logoWidth + navWidth);

    let auditHolder = $('<div/>').css({'position':'absolute','left':logoWidth + 'px','font-size':'2em','font-weight':'bold','line-height':'75px','width':availableWidth + 'px','text-align':'center'});
    $('#hmenus').before(auditHolder);

    $(document).ajaxComplete(function() { 
        if(/review.next\-task|review.task\-reviewed/.test(arguments[2].url)) {
            let postData = JSON.parse(arguments[1].responseText);
            
            if (!postData.postTypeId) return;
            
            let isAudit = postData.isAudit;
            
            auditHolder.html(['<span style="color:green">This is not an audit.</span>','<span style="color:maroon">This is an audit!</span>'][+isAudit]);
            
            $.ajax({
                type: 'GET',
                url: '/posts/' + postData.postId + '/vote-counts',
                dataType: "json",
                success: function (json) {
                    $('.vote').after('<div class="vote"><div style="color:green">' + json.up + '</div>' +
                                     '<div class="vote-count-separator"></div>' +
                                     '<div style="color:maroon">' + json.down + '</div></div>');
                }
            });
        }
    });
})();
