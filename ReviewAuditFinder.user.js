// ==UserScript==
// @name           Review Audit Finder
// @namespace      https://github.com/Tiny-Giant/
// @version        1.0.0.2
// @description    Finds real post scores in the review queues and puts it under the assumed score, also signals if it is an audit.
// @author         @TinyGiant
// @include        /^https?://\w*.?(stackoverflow|stackexchange|serverfault|superuser|askubuntu|stackapps)\.com/review/.*/
// @grant          none
// ==/UserScript==

$('#hmenus').before($('<h1 id="isaudit"></h1>').css({'margin':'0','padding':'0','transform':'translate(15%, 70%)','box-sizing':'border-box'}));
$(document).ajaxComplete(function() { 
    if(/review.next\-task|review.task\-reviewed/.test(arguments[2].url)) {
        var postData = JSON.parse(arguments[1].responseText);
        if(!postData.postTypeId) return;
        $('#isaudit').html('Audit: ' + (postData.isAudit ? '<span style="color:green">Yes</span>' : '<span style="color:green">No</span>'));
        getScores(postData);
    }
});
function getScores(postData){
    setTimeout(function(){
        var $score = $('.vote');
        var postId = postData.postId;
        console.log(postId);
        $.ajax({
            type: 'GET',
            url: '/posts/' + postId + '/vote-counts',
            dataType: "json",
            success: function (json) {
                StackExchange.helpers.removeMessages();

                var html =
                    '<div style="color:green">' + json.up + '</div>' +
                    '<div class="vote-count-separator"></div>' +
                    '<div style="color:maroon">' + json.down + '</div>';

                $score
                .html($score.html() + '<br>' + html)
                .unbind('click')
                .data('bound', false)
                .css('cursor', 'default')
                .attr('title', (function(n){return n.upCount==1&&n.downCount==1?n.upCount+" up / "+n.downCount+" down":n.upCount==1?n.upCount+" up / "+n.downCount+" down":(n.downCount==1,n.upCount+" up / "+n.downCount+" down")})({upCount:Math.abs(+json.up),downCount:Math.abs(+json.down)}));
            }
        });
    }, 1000);
}
