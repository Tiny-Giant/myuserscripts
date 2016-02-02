// ==UserScript==
// @name         Trainwreck
// @namespace    http://github.com/Tiny-Giant
// @version      1.0.0.1
// @description  Posts a link to a random trainwreck image with the text "#RekdTrain"
// @author       @TinyGiant
// @include      /https?:\/\/chat.stackoverflow.com\/rooms\/.*/
// @grant        GM_xmlhttpRequest
// ==/UserScript==
/* jshint -W097 */
'use strict';

let images = [
    'https://upload.wikimedia.org/wikipedia/commons/1/19/Train_wreck_at_Montparnasse_1895.jpg',
    'https://s3.amazonaws.com/img.ultrasignup.com/events/raw/6a76f4a3-4ad2-4ae2-8a3b-c092e85586af.jpg',
    'https://kassontrainwreck.files.wordpress.com/2015/03/cropped-trainwreck.jpg',
    'http://www.ncbam.org/images/photos/train-wreck.jpg',
    'http://oralfixationshow.com/wp-content/uploads/2014/09/train-wreck.jpg',
    'http://experiencedynamics.blogs.com/.a/6a00d8345a66bf69e201901ed419a4970b-pi',
    'https://timedotcom.files.wordpress.com/2015/05/150513-1943-train-wreck-02.jpg?quality=75&strip=color&w=573',
    'http://static6.businessinsider.com/image/5554e92369bedd8f33c45a0d/heres-everything-we-know-about-the-amtrak-train-wreck-in-philadelphia.jpg',
    'http://goldsilverworlds.com/wp-content/uploads/2015/07/trainwreck.jpg',
    'http://allthingsd.com/files/2012/06/trainwreck.jpg',
    'http://sailinganarchy.com/wp-content/uploads/2015/09/trainwreck.jpg',
    'http://iamphildodd.com/wp-content/uploads/2013/12/trainwreck1.jpg',
    'http://cdn.theatlantic.com/assets/media/img/posts/2013/11/758px_Train_Wreck_1922/56ae9c9fc.jpg',
    'http://static.messynessychic.com/wp-content/uploads/2012/10/trainwreck.jpg',
    'http://www.baycolonyrailtrail.org/gallery2/d/1282-3/trainwreck.jpg',
    'http://trainwreckwinery.com/wp-content/uploads/2012/05/trainwreckTHEN.jpg',
    'http://www.skvarch.com/images/trains/trainwreck.jpg',
    'http://conselium.com/wp-content/uploads/train-wreck.jpg',
    'http://imgs.sfgate.com/blogs/images/sfgate/bmangan/2010/10/18/trainwreck.jpg',
    'https://img1.etsystatic.com/043/0/7724935/il_fullxfull.613833437_37a5.jpg',
    'http://ncpedia.org/sites/default/files//bostian_wreck.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/9/9f/NewMarketTrainWreck.jpg',
    'https://ethicsalarms.files.wordpress.com/2015/04/train-wrecks-accidents.jpg',
    'http://offbeatoregon.com/Images/H1002b_General/BridgeWreck1800.jpg',
    'http://www3.gendisasters.com/files/newphotos/Naperville%20IL%20Train%20Wreck%204-26-1946.JPG',
    'http://static01.nyt.com/images/2011/07/25/world/25china-span/25china-span-articleLarge.jpg',
    'http://shorespeak.com/blog/wp-content/uploads/2011/01/train_wreck_2.jpg',
    'http://www.cfm-fmh.org/files/QuickSiteImages/MuseumPhotos/Train_Wreck.jpg',
    'http://www.circusesandsideshows.com/images/algbarnestrainwrecklarge.jpg',
    'http://www.scitechantiques.com/trainwreck/trainwreck.jpg',
    'http://www3.gendisasters.com/files/newphotos/nj-woodbridge-trainwreck3r.jpg',
    'http://travel.gunaxin.com/wp-content/uploads/2010/07/Ep9_TrainWreck.jpg'
];

let room = (/\d+/.exec(window.location.href)||[false])[0];

if (!room) return;

let fkey = (document.querySelector('#fkey')||{value: false}).value;

if (!fkey) return;

let nodes = {};

nodes.scope = document.querySelector('#chat-buttons');

nodes.rekdbtn = document.createElement('button');
nodes.rekdbtn.className = 'button rekdbtn';
nodes.rekdbtn.textContent = 'wreck train';
nodes.scope.appendChild(nodes.rekdbtn);

let getRandomWreck = () => {
    return images[Math.floor(Math.random() * ((images.length - 1) -  + 1))];
}

nodes.rekdbtn.addEventListener('click', event => {
    GM_xmlhttpRequest({
        method: 'POST',
        url: '/chats/' + room + '/messages/new',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        data: 'text=' + encodeURIComponent('[#RekdTrain](' + getRandomWreck() + ')') + '&fkey=' + fkey,
        onload: function(resp) {
            if(resp.status !== 200) console.log(resp);
        }
    });
}, false);
