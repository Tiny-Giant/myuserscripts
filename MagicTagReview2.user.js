// ==UserScript==
// @name         Magic™ Tag Review 2
// @namespace    http://github.com/Tiny-Giant
// @version      1.0.1.2
// @description  Custom review queue for tag oriented reviewing with the ability to filter by close votes and delete votes
// @author       @TinyGiant
// @contributor  @Makyen
// @include      /^https?:\/\/(?:\w*\.)?stackoverflow\.com\/review(?:/?|\/MagicTagReview)(?:\?.*)?$/
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// @grant        GM_addValueChangeListener
// @run-at       document-start
// ==/UserScript==
/* jshint -W097 */
/* jshint esnext: true */
/* globals $, GM_setValue, GM_getValue, StackExchange, GM_info */
'use strict';

/** Start Reusable Utilities **/
        
const executeInPage = function(functionToRunInPage, leaveInPage, id) {
    //Execute a function in the page context.
    // Any additional arguments for this function are passed into the page to the functionToRunInPage.
    // Such arguments must be JSON-ifiable (also Date, Function, and RegExp) (prototypes are not copied).
    // Using () => doesn't set arguments, so can't use it to define this function.
    // This has to be done without jQuery, as jQuery creates the script
    // within this context, not the page context, which results in
    // permission denied to run the function.
    function convertToText(args) {
        //This uses the fact that the arguments are converted to text which is interpreted
        //  within a <script>. That means we can create other types of objects by recreating their
        //  normal JavaScript representation.
        //  It's actually easier to do this without JSON.strigify() for the whole Object/Array.
        var asText = '';
        var level = 0;
        function lineSeparator(adj, isntLast) {
            level += adj - ((typeof isntLast === 'undefined' || isntLast) ? 0 : 1);
            asText += (isntLast ? ',' : '') + '\n' + (new Array(level * 2 + 1)).join('');
        }
        function recurseObject(obj) {
            if (Array.isArray(obj)) {
                asText += '[';
                lineSeparator(1);
                obj.forEach(function(value, index, array) {
                    recurseObject(value);
                    lineSeparator(0, index !== array.length - 1);
                });
                asText += ']';
            } else if (obj === null) {
                asText += 'null';
            //undefined
            } else if (obj === void(0)) {
                asText += 'void(0)';
            //Special cases for Number
            } else if (Number.isNaN(obj)) {
                asText += 'Number.NaN';
            } else if (obj === 1/0) {
                asText += '1/0';
            } else if (obj === 1/-0) {
                asText += '1/-0';
            //function
            } else if (obj instanceof RegExp || typeof obj === 'function') {
                asText +=  obj.toString();
            } else if (obj instanceof Date) {
                asText += 'new Date("' + obj.toJSON() + '")';
            } else if (typeof obj === 'object') {
                asText += '{';
                lineSeparator(1);
                Object.keys(obj).forEach(function(prop, index, array) {
                    asText += JSON.stringify(prop) + ': ';
                    recurseObject(obj[prop]);
                    lineSeparator(0, index !== array.length - 1);
                });
                asText += '}';
            } else if (['boolean', 'number', 'string'].indexOf(typeof obj) > -1) {
                asText += JSON.stringify(obj);
            } else {
                console.log('Didn\'t handle: typeof obj:', typeof obj, '::  obj:', obj);
            }
        }
        recurseObject(args);
        return asText;
    }
    var newScript = document.createElement('script');
    if(typeof id === 'string' && id) {
        newScript.id = id;
    }
    var args = [];
    //using .slice(), or other Array methods, on arguments prevents optimization
    for(var index=3;index<arguments.length;index++){
        args.push(arguments[index]);
    }
    newScript.textContent = '(' + functionToRunInPage.toString() + ').apply(null,' + convertToText(args) + ");";
    (document.head || document.documentElement).appendChild(newScript);
    if(!leaveInPage) {
        //Synchronous scripts are executed immediately and can be immediately removed.
        //Scripts with asynchronous functionality *may* need to remain in the page until complete.
        document.head.removeChild(newScript);
    }
    return newScript;
};


/**
 * @typedef XHRListener
 * @type {function}
 * @param {object} data - Object containing the request object, the property being accessed or method being called, and the value that would be returned
 * @param {XMLHttpRequest} data.xhr - The request object
 * @param {string} [data.property] - The property being accessed (get/set)
 * @param {string} [data.method] - the method being called (call)
 * @param {*} data.value - The value being returned or set (get/set/call)
 * @returns {undefined}
 */
/**
 * @typedef XHRListenerObject
 * @type {object}
 * @param {RegExp} regex - To be matched against XMLHttpRequest.responseURL in order to execute the listener
 * @param {XHRListener} [get] - Called when get operations occur on the request object, 
 * @param {XHRListener} [set] - Called when set operations occur on the request object
 * @param {XHRListener} [call] - Called when methods of the request object are called
 */
/**
 * @function addXHRListener - Intercepts XMLHttpRequests 
 * @param {XHRListenerObject} listener
 * @return {bool} false
 * @github https://github.com/Tiny-Giant/JS-Examples/blob/master/addXHRListener.js
 */
const inPageAddXHRListener = listen => {
    window.addXHRListener = (_ => {
        const XHR = XMLHttpRequest;

        const listeners = [];
        
        XMLHttpRequest = new Proxy(XHR, {
            construct: (target, args) => {
                const callall = (type, data) => (listeners.forEach(e => type in e && e.regex.test(xhr.responseURL) && e[type](data)), data);

                const xhr = new XHR();

                return new Proxy(xhr, {
                    get: (t, k) => {
                        if(typeof xhr[k] === 'function') {
                            return new Proxy(xhr[k], {
                                apply: async (target, self, args) => {
                                    const result = await xhr[k](...args);
                                    const data = callall('call', { xhr, 'method': k, 'args': args.join(', '), 'value': result });
                                    return data.value;
                                }
                            });
                        }
                        const data = callall('get', { xhr, 'property': k, 'value': xhr[k] });
                        return data.value;
                    },
                    set: (t, k, v) => {
                        const data = callall('set', { xhr, 'property': k, 'value': v });
                        xhr[k] = data.value;
                        return true;
                    }
                });
            }
        });

        return listener => (listeners.push(listener), !0);
    })();
};
/* For de bug porpoises */
/*addXHRListener({
    regex: /./,
    get: data => console.log(data.xhr.responseURL, 'get', data),
    set: data => console.log(data.xhr.responseURL, 'set', data),
    call: data => console.log(data.xhr.responseURL, 'call', data)
});*/
executeInPage(inPageAddXHRListener, true, 'magicTagReview-addXHRListener');

//LZ-String 1.4.4
// Copyright (c) 2013 Pieroxy <pieroxy@pieroxy.net>
// This work is free. You can redistribute it and/or modify it
// under the terms of the WTFPL, Version 2
// For more information see LICENSE.txt or http://www.wtfpl.net/
//
// For more information, the home page:
// http://pieroxy.net/blog/pages/lz-string/testing.html
//
// LZ-based compression algorithm, version 1.4.4
// From: https://github.com/pieroxy/lz-string/blob/master/libs/lz-string.min.js
var LZString=function(){function o(o,r){if(!t[o]){t[o]={};for(var n=0;n<o.length;n++)t[o][o.charAt(n)]=n}return t[o][r]}var r=String.fromCharCode,n="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$",t={},i={compressToBase64:function(o){if(null==o)return"";var r=i._compress(o,6,function(o){return n.charAt(o)});switch(r.length%4){default:case 0:return r;case 1:return r+"===";case 2:return r+"==";case 3:return r+"="}},decompressFromBase64:function(r){return null==r?"":""==r?null:i._decompress(r.length,32,function(e){return o(n,r.charAt(e))})},compressToUTF16:function(o){return null==o?"":i._compress(o,15,function(o){return r(o+32)})+" "},decompressFromUTF16:function(o){return null==o?"":""==o?null:i._decompress(o.length,16384,function(r){return o.charCodeAt(r)-32})},compressToUint8Array:function(o){for(var r=i.compress(o),n=new Uint8Array(2*r.length),e=0,t=r.length;t>e;e++){var s=r.charCodeAt(e);n[2*e]=s>>>8,n[2*e+1]=s%256}return n},decompressFromUint8Array:function(o){if(null===o||void 0===o)return i.decompress(o);for(var n=new Array(o.length/2),e=0,t=n.length;t>e;e++)n[e]=256*o[2*e]+o[2*e+1];var s=[];return n.forEach(function(o){s.push(r(o))}),i.decompress(s.join(""))},compressToEncodedURIComponent:function(o){return null==o?"":i._compress(o,6,function(o){return e.charAt(o)})},decompressFromEncodedURIComponent:function(r){return null==r?"":""==r?null:(r=r.replace(/ /g,"+"),i._decompress(r.length,32,function(n){return o(e,r.charAt(n))}))},compress:function(o){return i._compress(o,16,function(o){return r(o)})},_compress:function(o,r,n){if(null==o)return"";var e,t,i,s={},p={},u="",c="",a="",l=2,f=3,h=2,d=[],m=0,v=0;for(i=0;i<o.length;i+=1)if(u=o.charAt(i),Object.prototype.hasOwnProperty.call(s,u)||(s[u]=f++,p[u]=!0),c=a+u,Object.prototype.hasOwnProperty.call(s,c))a=c;else{if(Object.prototype.hasOwnProperty.call(p,a)){if(a.charCodeAt(0)<256){for(e=0;h>e;e++)m<<=1,v==r-1?(v=0,d.push(n(m)),m=0):v++;for(t=a.charCodeAt(0),e=0;8>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}else{for(t=1,e=0;h>e;e++)m=m<<1|t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t=0;for(t=a.charCodeAt(0),e=0;16>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}l--,0==l&&(l=Math.pow(2,h),h++),delete p[a]}else for(t=s[a],e=0;h>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;l--,0==l&&(l=Math.pow(2,h),h++),s[c]=f++,a=String(u)}if(""!==a){if(Object.prototype.hasOwnProperty.call(p,a)){if(a.charCodeAt(0)<256){for(e=0;h>e;e++)m<<=1,v==r-1?(v=0,d.push(n(m)),m=0):v++;for(t=a.charCodeAt(0),e=0;8>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}else{for(t=1,e=0;h>e;e++)m=m<<1|t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t=0;for(t=a.charCodeAt(0),e=0;16>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}l--,0==l&&(l=Math.pow(2,h),h++),delete p[a]}else for(t=s[a],e=0;h>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;l--,0==l&&(l=Math.pow(2,h),h++)}for(t=2,e=0;h>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;for(;;){if(m<<=1,v==r-1){d.push(n(m));break}v++}return d.join("")},decompress:function(o){return null==o?"":""==o?null:i._decompress(o.length,32768,function(r){return o.charCodeAt(r)})},_decompress:function(o,n,e){var t,i,s,p,u,c,a,l,f=[],h=4,d=4,m=3,v="",w=[],A={val:e(0),position:n,index:1};for(i=0;3>i;i+=1)f[i]=i;for(p=0,c=Math.pow(2,2),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;switch(t=p){case 0:for(p=0,c=Math.pow(2,8),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;l=r(p);break;case 1:for(p=0,c=Math.pow(2,16),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;l=r(p);break;case 2:return""}for(f[3]=l,s=l,w.push(l);;){if(A.index>o)return"";for(p=0,c=Math.pow(2,m),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;switch(l=p){case 0:for(p=0,c=Math.pow(2,8),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;f[d++]=r(p),l=d-1,h--;break;case 1:for(p=0,c=Math.pow(2,16),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;f[d++]=r(p),l=d-1,h--;break;case 2:return w.join("")}if(0==h&&(h=Math.pow(2,m),m++),f[l])v=f[l];else{if(l!==d)return null;v=s+s.charAt(0)}w.push(v),f[d++]=s+v.charAt(0),h--,s=v,0==h&&(h=Math.pow(2,m),m++)}}};return i}();"function"==typeof define&&define.amd?define(function(){return LZString}):"undefined"!=typeof module&&null!=module&&(module.exports=LZString);


/** @Proxy store - Wraps GM_(set/get)value */
//Use an in-script cache for what's being stored to GM storage. A side effect is that updates in other tabs
//  are NOT seen cross-tab once the value is first read from storage. This provides semi-independance across
//  tabs.
var storageCache = {};
try {
    storageCache = JSON.parse(localStorage['MagicTagReview-storeageCache']);
} catch(e) {
}
var storageCacheSeparate = {};
var storageCacheTimeout=0;
const storageSeparateList = ['queue', 'question_list', 'current'];
const store = new Proxy({}, {
    get: (target, key) => {
        if (storageSeparateList.indexOf(key) > -1) {
            if(key === 'current') {
                var current = +localStorage['MagicTagReview-' + key];
                return current ? current : 0;
            } else {
                if(typeof storageCacheSeparate[key] === 'undefined') {
                    const lzString = GM_getValue(`${key}-LZString`);
                    const uncompressed = LZString.decompressFromBase64(lzString);
                    storageCacheSeparate[key] = uncompressed;
                }
                return storageCacheSeparate[key];
            }
        } else {
            return storageCache[key];
        }
    },
    //Immediately update the cache and GM storage.
    //Saving the data to GM storage asynchronously doesn't solve the problem of long times to store data.
    //Storing large amounts of data or multiple values to GM storage in Chrome/Tampermonkey is expensive. It will freeze the tab and
    //  all Tampermonkey UI tabs (i.e. ones in the background context) for several seconds (it may affect all Tampermonkey
    //  operations (at least in the background context, which will probably affect loading scripts in new pages).
    //  Thus, only the queue and question_list are stored in GM storage. Everything else is stored in localStorage.
    set: (target, key, value) => {
        if (storageSeparateList.indexOf(key) > -1) {
            if(key === 'current') {
                localStorage['MagicTagReview-' + key] = value;
            } else {
                storageCacheSeparate[key] = value;
                const compressed = LZString.compressToBase64(value);
                const uncompressed = LZString.decompressFromBase64(compressed);
                GM_setValue(`${key}-LZString`, compressed);
                const lzString = GM_getValue(`${key}-LZString`);
                const uncompressed2 = LZString.decompressFromBase64(lzString);
            }
        } else {
            storageCache[key] = value;
            //Don't stall execution for storing the chache (this doesn't actually help Chrome/Tampermonkey).
            clearTimeout(storageCacheTimeout);
            storageCacheTimeout = setTimeout(_ => {
                localStorage['MagicTagReview-storeageCache'] = JSON.stringify(storageCache);
            }, 0);
        }
        return true;
    }
});

//Clean-up from earlier released version of the script/Transfer data from original GM_setValue keys to storageCache.
//We need to clear localStorage *and* GM_storage
var gmValuesList = GM_listValues();
gmValuesList.forEach(key => {
    if(key.indexOf('MagicTagReview-') === 0) {
        var mainKey = key.replace(/^MagicTagReview-/,'');
        var value = GM_getValue(key);
        store[mainKey] = value;
        GM_deleteValue(key);
    }
});

/*Get values from in-page properties/functions (e.g. window.StackExchange...)
 * To get the value you do something like:
 *   A global value:
 *       (getPageValue('value', 'StackExchange.options.serverTimeOffsetSec'), returnedPageValue)
 *   A value from a property on an element:
 *       (getPageValue(someElement, 'value', 'expandoProperty'), returnedPageValue)
 *   The return value from calling a synchronous function:
 *       (getPageValue('someGlobalFunction', argumentArray), returnedPageValue)
 *   (getPageValue('StackExchange.options.serverTimeOffsetSec'), returnedPageValue)
 * Doing so sends a CustomEvent to the page context asking for the value. The value
 *  is returned in JSON format in another CustomEvent, parsed and stored in
 *  returnedPageValue. If the in-page call isn't an async function, then this
 *  is synchronous, so it's immediately available.
 */
const inPageReplyWithPageValue = () => {
    window.addEventListener('magicTagReview-getPageValue', e => {
        // e.detail = {
        //    type: String: The type of data to get: 'value' the value, 'syncFunction' (the return value), 'asyncFunction' (a single value passed to a callback appended to any provided arguments);
        //    argArray: array of arguments for the sync or async function
        //    pagePropText: text representation of the in-page value (e.g. StackExchange.options.serverTimeOffsetSec).
        // }
        var getPageValueCount;
        function sendBackData(result) {
            //Send the value back.
            window.dispatchEvent(new CustomEvent('magicTagReview-pageValueReturn', {
                bubbles: true,
                cancelable: true,
                detail: JSON.stringify({
                    getPageValueCount: getPageValueCount,
                    result: result
                })
            }, window));
        }
        e.stopPropagation();
        if(e.detail) {
            var message = JSON.parse(e.detail);
            getPageValueCount = message.getPageValueCount;
            var pageInfo = message.pagePropText.split('.').reduce((sum, prop, index, array) => {
                    var type = typeof sum;
                    if ((type === 'object' && sum !== null) || type === 'function') {
                        return sum[prop];
                    } //else
                    //We're not done, but this isn't a object/function, so we failed.
                    return null;
            }, e.target);
            if(message.type) {
                if(message.type === 'syncFunction') {
                    if(typeof pageInfo === 'function') {
                        sendBackData(pageInfo.apply(e.target, message.argArray));
                        return;
                    } else {
                        console.log('inPageReplyWithPageValue: specified in-page value was not a function:', message, '::  pageInfo:', pageInfo);
                    }
                } else if(message.type === 'asyncFunction') {
                    if(typeof pageInfo === 'function') {
                        message.argArray = Array.isArray(message.argArray) ? message.argArray : [];
                        message.argArray.push(sendBackData);
                        pageInfo.apply(e.target, argArray);
                        return;
                    } else {
                        console.log('inPageReplyWithPageValue: specified in-page value was not a function:', message, '::  pageInfo:', pageInfo);
                    }
                } else if(message.type === 'value') {
                    sendBackData(pageInfo);
                    return;
                } else {
                    console.log('inPageReplyWithPageValue: message.type not understood:', message, '::  pageInfo:', pageInfo);
                }
            } else {
                console.log('inPageReplyWithPageValue: no message.type:', message);
            }
            sendBackData(null);
        } else {
            //default with no message
            sendBackData(pageInfo.apply(e.target, message.args));
        }
    }, true);
};
executeInPage(inPageReplyWithPageValue, true, 'magicTagReview-pageValueReturner');

var returnedPageValue;
var getPageValueCallbacks = {};
var getPageValueCount = 0;
const getPageValue = function() {
    // Arguments: [element] [type] pagePropText [arguments]
    // Arguments: [element] 'asyncFunction' pagePropText [arguments] callback
    //Request a page value;
    var target = window;
    var shift = 0;
    if (arguments[0] instanceof Node) {
        target = arguments[0];
        shift++;
    }
    var type = (typeof arguments[1 + shift] === 'string') ? arguments[shift++] : 'value';
    var pagePropText = arguments[shift];
    var argArray = arguments[shift + 1];
    var callback = arguments[shift + 2];
    var testPropTextForFunction = pagePropText.replace(/\(\)$/,'');
    if(pagePropText !== testPropTextForFunction) {
        pagePropText = testPropTextForFunction;
        type = type === 'value' ? 'syncFunction' : type;
    }
    if (type === 'asyncFunction') {
        if(argArray === 'function') {
            callback = argArray;
            argArray = null;
        }
    }
    getPageValueCount++;
    getPageValueCallbacks[getPageValueCount] = callback;
    target.dispatchEvent(new CustomEvent('magicTagReview-getPageValue', {
        bubbles: true,
        cancelable: true,
        detail: JSON.stringify({
            type: type,
            getPageValueCount: getPageValueCount,
            pagePropText: pagePropText,
            argArray: argArray
        })
    }));
};
window.addEventListener('magicTagReview-pageValueReturn', e => {
    e.stopPropagation();
    //Receive the value from the page and assign it to the global variable.
    var message = JSON.parse(e.detail);
    returnedPageValue = message.result;
    if(typeof message.getPageValueCount) {
        var callback = getPageValueCallbacks[message.getPageValueCount];
        if(typeof callback === 'function') {
            callback(returnedPageValue);
        }
    }
});


/** End Reusable Utilities **/

document.addEventListener('DOMContentLoaded', async _ => {
    if (/^\/?review\/?$/.test(window.location.pathname)) {
        // We are on the review queue list page
        document.querySelector('.dashboard-item').insertAdjacentHTML('beforebegin', `
            <div class="dashboard-item">
                <div class="dashboard-count"></div>
                <div class="dashboard-summary">
                    <div class="dashboard-summary">
                        <div class="dashboard-title"><a href="/review/MagicTagReview">Magic™ Tag Review</a></div>
                        <div class="dashboard-description">Concentrated tag review with options to filter by close votes or delete votes.</div>
                    </div>
                </div>
                <br class="cbt">
            </div>
        `);
    } else if (/^\/?review\/MagicTagReview/.test(window.location.pathname)) {
        // We are on the Magic™ Tag Review page
        document.querySelector('title').textContent = 'Magic™ Tag Review';
        document.querySelector('#mainbar-full').innerHTML = '';
        
        /** Start Interface **/

        const nodes = (_ => {
            const scope = document.querySelector('#mainbar-full');
            const wrapper = scope.appendChild(Object.assign(document.createElement('span'), { className: 'review-bar-wrapper'  }));
            const CSS = `
                body {
                    overflow-y: scroll;
                }
                .review-indicator {
                    padding-left: 5px;
                    display: inline-block;
                    vertical-align: middle;
                }
                .review-spinner {
                    display: inline-block;
                    vertical-align: middle;
                    height: 30px;
                }
                .review-indicator .progress,
                .review-indicator .quota {
                    font-size: 11px;
                    height: 15px;
                }
                .review-bar-container .review-bar {
                    white-space: nowrap;
                    position: static;
                    margin-top: 0px;
                    padding: 5px;
                    font-size: 0px;
                }
                .review-bar-container .review-bar input {
                    font-size: 13px;
                }
                .review-bar input,
                .review-bar select {
                    margin: 0px;
                    display: inline-block;
                    vertical-align: middle;
                    box-sizing: border-box;
                    height: 35px;
                }
                .review-bar select {
                    font-size: 13px;
                    line-height: 30px;
                    border-color: rgb(200, 204, 208);
                }
                .review-form {
                    display: inline-block
                }
                .question-status {
                    width: 660px
                }
                .question {
                    float: left;
                }
                .review-sidebar {
                    width: 280px;
                    float: right;
                }
                .review-sidebar hr {
                    height: 2px;
                }
                .review-info label {
                    font-weight: bold;
                    font-size: 0.9em;
                    vertical-align: middle;
                    display: inline-block;
                    color: #9C988B;
                }
                h1, h2, h3, h4, h5, h6 {
                    font-weight: normal
                }
                [hidden] {
                    display: none;
                }
                .review-filters-toggle {
                    font-size:  11px;
                    text-align:  center;
                    padding:  0px;
                    margin: -5px;
                    margin-top:  5px;
                    border-top: 1px solid #c8ccd0;
                    line-height: 15px;
                    color: rgb(122, 122, 122);
                }
                .review-filters td {
                    font-size: 11px;
                    min-width: 85px;
                }
                .review-filters input {
                    margin: 0;
                    width: 100%;
                    box-sizing:  border-box;
                }
                .review-filters input[type="button"],
                .review-filters input[type="submit"] {
                    width: auto;
                    float: right;
                }
                .review-filters {
                    font-size: 12px;
                }
                .review-filters-toggle:hover {
                    background: #eee;
                    cursor: pointer;
                }
                .review-bar-top {
                    overflow: hidden;
                }
                .review-form {
                    white-space: nowrap;
                    float: left;
                }
                .review-top-right {
                    float: right;
                }
                .review-info {
                    overflow: hidden;
                }
                .review-info .left {
                    float: left;
                }
                .review-info .right {
                    float: right;
                }
                .review-filters-help-header:hover {
                    cursor: pointer;
                    background: #eee;
                }
                .review-filters-help-header {
                    padding: 5px;
                }
                .review-filters-help-header .toggle-indicator {
                    font-weight: bold;
                    font-size:  11px;
                    color: rgb(122, 122, 122);
                }
                .review-bar-container {
                    margin: 0;
                }
                div#content {
                    padding-top: 15px !important;
                }
                .review-bar {
                    margin-bottom: 15px!important;
                }
                .review-indicator .quota {
                    font-size: 11px;
                }
                .review-position {
                    text-align: center;
                    width: 50px;
                }
                .review-didCloseVote {
                    color: red;
                }
            `;
            const HTML = `
                <div class="review-bar-container">
                    <div class="review-bar-anchor"></div>
                    <div class="review-bar">
                        <div class="review-bar-top">
                            <form class="review-form">
                                <input class="review-tagged" type="text" placeholder="tag">
                                <select class="review-sort">
                                    <option selected value="activity">activity</option>
                                    <option value="votes">votes</option>
                                    <option value="creation">creation</option>
                                    <option value="hot">hot</option>
                                    <option value="week">week</option>
                                    <option value="month">month</option>
                                </select>
                                <select class="review-order">
                                    <option selected value="desc">desc</option>
                                    <option value="asc">asc</option>
                                </select>
                                <input class="review-fetch" type="submit" value="Fetch">
                                <input class="review-stop" type="button" value="Stop" disabled="">
                                <img class="review-spinner" src="https://i.stack.imgur.com/ccvLD.gif" style="display: none">
                                <div class="review-indicator">
                                    <div class="progress"></div>
                                    <div class="quota"></div>
                                </div>
                            </form>
                            <div class="review-top-right review-actions">
                                <input class="review-prev" type="button" value="Previous">
                                <input class="review-position" type="text" readonly value="0/0">
                                <input class="review-next" type="button" value="Next">
                            </div>
                        </div>
                        <div class="review-filters" style="display: none">
                            <form class="review-filters-form">
                                <div class="review-filters-help-header"><b>Filters:</b> <span class="toggle-indicator">?\u25BC</span></div>
                                <ul class="review-filters-help">
                                    <li>Leave filters blank to exclude them</li>
                                    <li>Close, reopen, and delete vote filters are primary filters.
                                        <ul>
                                            <li>Primary filters operate independantly of each other, except when both delete and reopen vote filters are set.</li>
                                            <li>When both delete and reopen vote filters are set, both will be required of questions matching either filter.</li>
                                            <li>When including a maximum primary filter a corresponding minimum should also be included to avoid short-circuiting.</li>
                                        </ul>
                                    </li>
                                    <li>The rest of the filters are secondary filters.
                                        <ul>
                                            <li>Secondary filters are required of all questions being filtered, except the close date range filters.</li>
                                            <li>The close date range filters do not apply to open questions.</li>
                                        </ul>
                                    </li>
                                </ul>
                                <table class="review-filters-table" border="0">
                                    <thead>
                                        <tr>
                                            <td colspan="42">
                                            </td>
                                        <tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>Min Close:</td>
                                            <td>Max Close:</td>
                                            <td title="Will be ignored for close vote filter">Min Reopen:*</td>
                                            <td title="Will be ignored for close vote filter">Max Reopen:*</td>
                                            <td title="Will be ignored for close vote filter">Min Delete:*</td>
                                            <td title="Will be ignored for close vote filter">Max Delete:*</td>
                                            <td>Min Answers:</td>
                                            <td>Max Answers:</td>
                                            <td>Min Score:</td>
                                            <td>Max Score:</td>
                                            <td>Min Views:</td>
                                            <td>Max Views:</td>
                                        </tr>
                                        <tr>
                                            <td><input class="review-minclosevotes" type="number" min="1" max="4" value=""></td>
                                            <td><input class="review-maxclosevotes" type="number" min="0" max="4" value=""></td>
                                            <td title="Will be ignored for close vote filter"><input class="review-minreopenvotes" type="number" min="1" max="4" value=""></td>
                                            <td title="Will be ignored for close vote filter"><input class="review-maxreopenvotes" type="number" min="0" max="4" value=""></td>
                                            <td title="Will be ignored for close vote filter"><input class="review-mindeletevotes" type="number" min="1" value=""></td>
                                            <td title="Will be ignored for close vote filter"><input class="review-maxdeletevotes" type="number" min="0" value=""></td>
                                            <td><input class="review-minanswers" type="number" min="0" value=""></td>
                                            <td><input class="review-maxanswers" type="number" min="0" value=""></td>
                                            <td><input class="review-minscore" type="number" value=""></td>
                                            <td><input class="review-maxscore" type="number" value=""></td>
                                            <td><input class="review-minviews" type="number" value=""></td>
                                            <td><input class="review-maxviews" type="number" value=""></td>
                                        </tr>
                                        <tr>
                                            <td colspan="2" title="Will be ignored for close vote filter">Close Date Range Start:*</td>
                                            <td colspan="2" title="Will be ignored for close vote filter">Close Date Range End:*</td>
                                            <td colspan="2">Asked Date Range Start:</td>
                                            <td colspan="2">Asked Date Range End:</td>
                                            <td colspan="2">Last Activity Date Range Start:</td>
                                            <td colspan="2">Last Activity Date Range End:</td>
                                        </tr>
                                        <tr>
                                            <td colspan="2" title="Will be ignored for close vote filter"><input class="review-closedatestart" type="date"></td>
                                            <td colspan="2" title="Will be ignored for close vote filter"><input class="review-closedateend" type="date"></td>
                                            <td colspan="2"><input class="review-askeddatestart" type="date"></td>
                                            <td colspan="2"><input class="review-askeddateend" type="date"></td>
                                            <td colspan="2"><input class="review-activitydatestart" type="date"></td>
                                            <td colspan="2"><input class="review-activitydateend" type="date"></td>
                                        </tr>
                                        <tr>
                                            <td colspan="4">Includes Tags:</td>
                                            <td colspan="4">Excludes Tags:</td>
                                            <td colspan="2">Last Edit Date Range Start:</td>
                                            <td colspan="2">Last Edit Date Range End:</td>
                                        </tr>
                                        <tr>
                                            <td colspan="4"><input class="review-includestags" type="text" placeholder="html, css"></td>
                                            <td colspan="4"><input class="review-excludestags" type="text" placeholder="php, java"></td>
                                            <td colspan="2"><input class="review-editdatestart" type="date"></td>
                                            <td colspan="2"><input class="review-editdateend" type="date"></td>
                                        </tr>
                                        <tr>
                                            <td colspan="10"></td>
                                            <td colspan="2"><input class="review-stop-filter" type="button" value="Stop" disabled>
                                                            <input class="review-apply-filters" type="submit" value="Apply Filters"></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </form>
                        </div>
                        <div class="review-filters-toggle">\u25BC</div>
                    </div>
                </div>
                <div class="review-task" style="display: none">
                    <div class="review-header" id="question-header">
                        <h1><a class="review-title" target="_blank"></a></h1>
                    </div>
                    <div class="review-question"></div>
                    <div class="review-sidebar module community-bulletin">
                        <div class="bulletin-title review-sidebar-header">Post Information</div> <hr>
                        <div class="review-information"></div>
                    </div>
                </div>
                <style type="text/css">${CSS}</style>
            `;
            wrapper.insertAdjacentHTML('beforeend', HTML);

            const trap = (target, key) => {
                if (!(key in target)) {
                    const selector = `.review-${ 
                        key.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)
                           .replace(/_/g,     m => ` .${m.toLowerCase().substr(1)}`)
                    }`;
                    const node  = nodes.wrapper.querySelector(selector);
                    if(!node) console.log(selector);
                    target[key] = node || null;
                }
            };
        
            return new Proxy({scope, wrapper}, {
                get: (target, key) => (trap(target, key),   target[key]),
                has: (target, key) => (trap(target, key), !!target[key]),
            });
        })();
        
        nodes.spinner.show = _ => nodes.spinner.style.display = '';
        nodes.spinner.hide = _ => nodes.spinner.style.display = 'none';

        /** End Interface **/

        /** Start Initialization **/

        const inPageInitInlineEditing = inlineEditingInitId => {
            StackExchange.using('inlineEditing', function () {
                StackExchange.inlineEditing.init();
                document.getElementById(inlineEditingInitId).remove();
            });
        };
        const inlineEditingInitId = 'magicTag2-initInlineEditing-' + performance.now();
        executeInPage(inPageInitInlineEditing, true, inlineEditingInitId, inlineEditingInitId);

        let stop          = false,
            queue         = JSON.parse(store.queue              || '[]'),
            question_list = JSON.parse(store.question_list      || '[]');

        nodes.tagged           .value = store.tagged            || '';
        nodes.sort             .value = store.sort              || '';
        nodes.order            .value = store.order             || '';
        nodes.minclosevotes    .value = store.minclose          || '';
        nodes.maxclosevotes    .value = store.maxclose          || '';
        nodes.mindeletevotes   .value = store.mindelete         || '';
        nodes.maxdeletevotes   .value = store.maxdelete         || '';
        nodes.minreopenvotes   .value = store.minreopen         || '';
        nodes.maxreopenvotes   .value = store.maxreopen         || '';
        nodes.minanswers       .value = store.minanswers        || '';
        nodes.maxanswers       .value = store.maxanswers        || '';
        nodes.minscore         .value = store.minscore          || '';
        nodes.maxscore         .value = store.maxscore          || '';
        nodes.minviews         .value = store.minviews          || '';
        nodes.maxviews         .value = store.maxviews          || '';
        nodes.closedatestart   .value = store.closedatestart    || '';
        nodes.closedateend     .value = store.closedateend      || '';
        nodes.askeddatestart   .value = store.askeddatestart    || '';
        nodes.askeddateend     .value = store.askeddateend      || '';
        nodes.activitydatestart.value = store.activitydatestart || '';
        nodes.activitydateend  .value = store.activitydateend   || '';
        nodes.editdatestart    .value = store.editdatestart     || '';
        nodes.editdateend      .value = store.editdateend       || '';
        nodes.includestags     .value = store.includestags      || '';
        nodes.excludestags     .value = store.excludestags      || '';

        /** End Initialization **/

        /** Start Functions **/

        const reset = (queue, filters, current, keepProgresText) => {
            if(queue) {
                queue         = [];
                question_list = [];
                store.queue         = '[]';
                store.question_list = '[]';
                nodes.indicator_quota.textContent = '';
            }
            if(filters) {
                nodes.tagged           .value = '';
                nodes.sort             .value = '';
                nodes.order            .value = '';
                nodes.minclosevotes    .value = '';
                nodes.maxclosevotes    .value = '';
                nodes.mindeletevotes   .value = '';
                nodes.maxdeletevotes   .value = '';
                nodes.minreopenvotes   .value = '';
                nodes.maxreopenvotes   .value = '';
                nodes.minanswers       .value = '';
                nodes.maxanswers       .value = '';
                nodes.minscore         .value = '';
                nodes.maxscore         .value = '';
                nodes.minviews         .value = '';
                nodes.maxviews         .value = '';
                nodes.closedatestart   .value = '';
                nodes.closedateend     .value = '';
                nodes.askeddatestart   .value = '';
                nodes.askeddateend     .value = '';
                nodes.activitydatestart.value = '';
                nodes.activitydateend  .value = '';
                nodes.editdatestart    .value = '';
                nodes.editdateend      .value = '';
                nodes.includestags     .value = '';
                nodes.excludestags     .value = '';
            }
            if(current) {
                store.current = 0;
            }

            executeInPage( _ => $(document).off("click", ".post-menu a.short-link"));
            nodes.task.style.display    = 'none';
            nodes.information.innerHTML = '';
            nodes.question.innerHTML    = '';
            nodes.title.href            = '';
            nodes.title.innerHTML       = '';
            nodes.fetch.disabled        = false;
            nodes.stop.disabled         = true;
            nodes.prev.disabled         = true;
            nodes.next.disabled         = true;
            if(!keepProgresText) {
                nodes.indicator_progress.textContent  = '';
            }
        };

        const retrieve = _ => new Promise(async (resolve, reject) => {
            if(!nodes.tagged.value) {
                nodes.indicator_progress.textContent = 'Tag is required';
                return;
            }
            
            store.tagged = nodes.tagged.value;
            store.sort   = nodes.sort  .value;
            store.order  = nodes.order .value;
            
            reset(1,0,1);
            
            nodes.fetch.disabled = true;
            nodes.stop .disabled = false;
            nodes.spinner.show();

            const result = { quota_remaining: 1, backoff: undefined };

            let page = 1, totalpages = 1, url;
        
            while(page <= totalpages && result.quota_remaining !== 0 && !result.backoff && stop === false) {
                nodes.indicator_progress.textContent = `Retrieving question list (page ${page} of ${(totalpages||1)})`;
                nodes.indicator_quota   .textContent = `API Quota remaining: ${result.quota_remaining}`;
                url = `${location.protocol}//api.stackexchange.com/2.2/questions?${[
                    `page=${page++}`,
                    'pagesize=100',
                    `order=${store.order}`,
                    `sort=${store.sort}`,
                    `site=${/\/([\w.]*)\.com/.exec(location.href)[1]}`,
                    'key=dwtLmAaEXumZlC5Nj0vDuw((',
                    'filter=!6C_(7U8z1Z.G(-FUAWXe3PUs*p6kip9BgZ*MrbbgvOQV*)k6GLjHx*p3_q6',
                    `tagged=${encodeURIComponent(store.tagged)}`
                ].join('&')}`;
                
                const response = await fetch(url);
                
                if(!response.ok) {
                    return reject(response);
                }
                
                Object.assign(result, await response.json());
                
                totalpages = Math.ceil(result.total / 100);
                
                question_list.push(...result.items);
                
                if(result.backoff) console.log('Backoff: ' + result.backoff);
            }
            store.question_list = JSON.stringify(question_list);
            
            nodes.spinner.hide();
            nodes.fetch.disabled = true;
            nodes.stop.disabled = true;
            nodes.indicator_progress.textContent = '';
            stop = false;
            
            delete result.items;
            console.log(result, url);
            
            if(result.quota_remaining === 0) {
                nodes.indicator_quota.textContent = "No requests left, wait until next UTC day.";
            }
            
            resolve(question_list);
        });

        const fetchVotes = post => new Promise(resolve => {
            const url = `/posts/${post.question_id}/votes`;
            const xhr = new XMLHttpRequest();
            xhr.addEventListener('load', _ => {
                if (xhr.status !== 200) {
                    console.log(xhr.status, xhr.statusText, xhr);
                    resolve([]);
                } else {
                    resolve(JSON.parse(xhr.responseText));
                }
            });
            xhr.open('GET', url);
            xhr.send();
        });
        
        const fetchQuestion = post => new Promise(resolve => {
            const xhr = new XMLHttpRequest();
            xhr.addEventListener('load', _ => {
                if (xhr.status !== 200) {
                    console.log(xhr.status, xhr.statusText, xhr);
                    resolve(`<h1>${xhr.status} - ${xhr.statusText}</h1><div>${post.question_id}</div>`);
                } else {
                    resolve(xhr.responseText);
                }
            });
            xhr.open('GET', `/posts/ajax-load-realtime/${post.question_id}`);
            xhr.send();
        });

        const inPageInitQuestionWithComments = (initInfo, questionInitId) => {
            //Direct SE to load what we need (SE.using), but wait to execute until we know it's available (SE.ready).
            //StackExchange.question.init is in "full.js", which is loaded for any of: "loggedIn", "inlineEditing", "beginEditEvent", "translation".
            StackExchange.using('inlineEditing', function () {
                StackExchange.ready(function () {
                    StackExchange.question.init(initInfo);
                    var title = document.querySelector('.review-title');
                    var didCloseVote = title.parentNode.querySelector('.review-didCloseVoteFull');
                    if (document.querySelector('a[title^="You voted to close"]')) {
                        if(didCloseVote) {
                            didCloseVote.style.display = '';
                        } else {
                            if(title) {
                                title.insertAdjacentHTML('afterend','<span class="review-didCloseVoteFull"> - <span class="review-didCloseVote">Voted</span></span>');
                            }
                        }
                    } else {
                        if(didCloseVote) {
                            didCloseVote.style.display = 'none';
                        }
                    }
                    StackExchange.comments.loadAll($('.question'));
                    StackExchange.using("snippets", function () {
                        StackExchange.snippets.initSnippetRenderer();
                        StackExchange.snippets.redraw();
                        document.querySelector('.review-spinner').style.display = 'none';
                        document.querySelector('.review-indicator .progress').textContent = '';
                        //Remove the <script> this was loaded in.
                        document.getElementById(questionInitId).remove();
                    });
                });
            });
        };

        const display = current => new Promise(async (resolve, reject) => {
            reset(0,0,0,1);

            const post = queue[current];

            if (post) {
                nodes.title.href      = 'http://stackoverflow.com/q/' + post.question_id;
                nodes.title.innerHTML = post.title;

                nodes.question.innerHTML = await fetchQuestion(post);

                //Initialize the question, with comments
                //Get a unique ID for this execution of inPageInitQuestionWithComments.
                const questionInitId = 'magicTag2-initQuestion-' + performance.now();
                executeInPage(inPageInitQuestionWithComments, true, questionInitId , {
                    votesCast: await fetchVotes(post),
                    canViewVoteCounts: true,
                    questionId: post
                }, questionInitId);

                const prettyDate = time => {
                    if (time === null || time.length != 20) return;

                    // firefox requires ISO 8601 formated dates
                    time = time.substr(0, 10) + "T" + time.substr(11, 10);
                    var date = new Date(time),
                        diff = (((new Date()).getTime() - date.getTime()) / 1000) + (getPageValue('StackExchange.options.serverTimeOffsetSec'), returnedPageValue),
                        day_diff = Math.floor(diff / 86400);

                    if (isNaN(day_diff) || day_diff < 0 || day_diff >= 31)
                        return;

                    return day_diff == 0 && (
                        diff < 2 && "just now" ||
                        diff < 60 && (function(n){return n.seconds==1?n.seconds+" sec ago":n.seconds+" secs ago"})({seconds:Math.floor(diff)}) ||
                        diff < 120 && "1 min ago" ||
                        diff < 3600 && (function(n){return n.minutes==1?n.minutes+" min ago":n.minutes+" mins ago"})({minutes:Math.floor(diff/60)}) ||
                        diff < 7200 && "1 hour ago" ||
                        diff < 86400 && (function(n){return n.hours==1?n.hours+" hour ago":n.hours+" hours ago"})({hours:Math.floor(diff/3600)}));
                };

                const buildInfo = obj => {
                    const excludes = ['title'];
                    let str = '';
                    for(let [k, v] of Object.entries(obj)) {
                        if(excludes.includes(k)) continue;
                        if (k === 'tags') v = v.join(', ');
                        let h = k.replace(/_/g, ' ');
                        h = h.charAt(0).toUpperCase() + h.slice(1);
                        if (/Object/.test(v.toString())) {
                            if ("display_name" in v && "link" in v)  {
                                 v = `<a href="${v.link}">${v.display_name}</a>`;
                            } else {
                                str += `<div class="spacer review-info"><label class="left">${h}:</label>&nbsp;${buildInfo(v)}</div>`;
                                continue;
                            }
                        }
                        if (/date/.test(k)) {
                            const date = new Date(v * 1000).toISOString().replace(/T(.*)\..*/, ' $1Z');
                            v = `<span class="relativetime" title="${date}">${prettyDate(date) || date}</span>`;
                        }
                        str += `<div class="spacer review-info"><label class="left">${h}:</label> <span class="right">${v}</span></div>`;
                    }
                    return str;
                };
                
                nodes.information.innerHTML = '';
                nodes.information.insertAdjacentHTML('beforeend', buildInfo(post));
                nodes.task.style.display="";
            }
            
            nodes.prev.disabled = !queue.length || current < 1;
            nodes.next.disabled = !queue.length || current === queue.length - 1;
            nodes.position.value = queue.length ? `${current + 1}/${queue.length}` : '0/0';
        });
        
        const delay = _ => new Promise(resolve => setTimeout(resolve));
        
        const filterQuestions = async question_list => {
            var performStart = performance.now();
            reset(0,0,1);
            nodes.spinner.show();
            nodes.applyFilters.disabled = true;
            nodes.stopFilter.disabled = false;
            
            const voteFilters = ['close', 'reopen', 'delete'];
            const nonVoteNumberFilters = ['answers', 'score', 'views'];
            const numberFilters = voteFilters .concat(nonVoteNumberFilters);
            const dateFilters = ['closedate', 'askeddate', 'activitydate', 'editdate'];
            const tagFilters = ['includestags', 'excludestags'];

            //Update values from UI
            voteFilters.forEach(filter => {
                store['min' + filter] = nodes[`min${filter}votes`].value ? +nodes[`min${filter}votes`].value : '';
                store['max' + filter] = nodes[`max${filter}votes`].value ? +nodes[`max${filter}votes`].value : '';
            });
            nonVoteNumberFilters.forEach(filter => {
                store['min' + filter] = nodes[`min${filter}`].value ? +nodes[`min${filter}`].value : '';
                store['max' + filter] = nodes[`max${filter}`].value ? +nodes[`max${filter}`].value : '';
            });
            dateFilters.forEach(filter => {
                store[filter + 'start'] = nodes[filter + 'start'].value ? nodes[filter + 'start'].value : '';
                store[filter + 'end']   = nodes[filter + 'end']  .value ? nodes[filter + 'end']  .value : '';
            });
            tagFilters.forEach(filter => {
                store[filter] = nodes[filter].value ? nodes[filter].value : '';
                store[filter] = nodes[filter].value ? nodes[filter].value : '';
            });
            
            //Convert stored data to values we'll actually use in comparisons.
            const closedatestart    = new Date(store.closedatestart   ).getTime() / 1000;
            const closedateend      = new Date(store.closedateend     ).getTime() / 1000;
            const askeddatestart    = new Date(store.askeddatestart   ).getTime() / 1000;
            const askeddateend      = new Date(store.askeddateend     ).getTime() / 1000;
            const activitydatestart = new Date(store.activitydatestart).getTime() / 1000;
            const activitydateend   = new Date(store.activitydateend  ).getTime() / 1000; 
            const editdatestart     = new Date(store.editdatestart    ).getTime() / 1000;
            const editdateend       = new Date(store.editdateend      ).getTime() / 1000; 
            const includestags      = store.includestags.split(/,\s+/g); 
            const excludestags      = store.excludestags.split(/,\s+/g); 
            
            //Full list of available filter functions.
            const filters = {
                incloserange       : e => (store.minclose          !== '' ? store.minclose          <= e.close_vote_count   : true) &&
                                          (store.maxclose          !== '' ? store.maxclose          >= e.close_vote_count   : true) ,
                indeleterange      : e => (store.mindelete         !== '' ? store.mindelete         <= e.delete_vote_count  : true) &&
                                          (store.maxdelete         !== '' ? store.maxdelete         >= e.delete_vote_count  : true) ,
                inreopenrange      : e => (store.minreopen         !== '' ? store.minreopen         <= e.reopen_vote_count  : true) &&
                                          (store.maxreopen         !== '' ? store.maxreopen         >= e.reopen_vote_count  : true) ,
                inanswersrange     : e => (store.minanswers        !== '' ? store.minanswers        <= e.answer_count       : true) &&
                                          (store.maxanswers        !== '' ? store.maxanswers        >= e.answer_count       : true) ,
                inscorerange       : e => (store.minscore          !== '' ? store.minscore          <= e.score              : true) &&
                                          (store.maxscore          !== '' ? store.maxscore          >= e.score              : true) ,
                inviewsrange       : e => (store.minviews          !== '' ? store.minviews          <= e.view_count         : true) &&
                                          (store.maxviews          !== '' ? store.maxviews          >= e.view_count         : true) ,
                inclosedaterange   : e => (store.closedatestart    !== '' ?       closedatestart    <= e.closed_date        : true) &&
                                          (store.closedateend      !== '' ?       closedateend      >= e.closed_date        : true) ,
                inaskeddaterange   : e => (store.askeddatestart    !== '' ?       askeddatestart    <= e.creation_date      : true) &&
                                          (store.askeddateend      !== '' ?       askeddateend      >= e.creation_date      : true) ,
                inactivitydaterange: e => (store.activitydatestart !== '' ?       activitydatestart <= e.last_activity_date : true) &&
                                          (store.activitydateend   !== '' ?       activitydateend   >= e.last_activity_date : true) ,
                ineditdaterange    : e => (store.editdatestart     !== '' ?       editdatestart     <= e.last_edit_date     : true) &&
                                          (store.editdateend       !== '' ?       editdateend       >= e.last_edit_date     : true) ,
                includestags       : e =>  store.includestags      !== '' ? includestags.every(t =>  e.tags.includes(t))    : true  ,
                excludestags       : e =>  store.excludestags      !== '' ? excludestags.every(t => !e.tags.includes(t))    : true  
            };

            //Remove inactive filters, as there's no need to consider them.
            numberFilters.forEach(filter => {
                if(store['min' + filter] === '' && store['max' + filter] === '') {
                    delete filters['in' + filter + 'range'];
                }
            });
            dateFilters.forEach(filter => {
                if(store[filter + 'start'] === '' && store[filter + 'end'] === '') {
                    delete filters['in' + filter + 'range'];
                }
            });
            tagFilters.forEach(filter => {
                if(store[filter] === '') {
                    delete filters[filter];
                }
            });

            //Prepare lists so we only look at the filters which are active.
            const activeSecondaryFilters = ['inanswersrange','inscorerange','inviewsrange','inaskeddaterange','inactivitydaterange','ineditdaterange','includestags','excludestags'].filter(key => key in filters);
            const activeDeleteFilters = ['indeleterange','inreopenrange','inclosedaterange'].filter(key => key in filters);
            const activeReopenFilters = ['inreopenrange','inclosedaterange'].filter(key => key in filters);

            //Only convert the filters Object into an Array once.
            const filterList = Object.entries(filters);
            //Function to get the results for every active filter on a question.
            const filterQuestion = question => filterList.reduce((allResults, [filterKey, filter]) => Object.assign(allResults, {[filterKey]: filter(question)}), {});
            
            const queue = await new Promise(async resolve => {
                const filteredQueue = [];

                const isset = {
                    close : 'incloserange' in filters,
                    delete: 'indeleterange' in filters,
                    reopen: 'inreopenrange' in filters
                }
                
                await delay();
                const progressIndicator = nodes.indicator_progress;
                const progressTextPre = 'Filtering question ';
                const progressTextPost = ' of ' + question_list.length;
                progressIndicator.textContent = progressTextPre + '1' + progressTextPost;
                var currentTime, lastUIUpdate = Date.now();
                
                for(const [index, question] of Object.entries(question_list)) {
                    currentTime = Date.now();
                    if(currentTime - lastUIUpdate >= 100) {
                        //Every 100ms: Update displayed progress and release the processor for any other tasks (e.g. let the user click Stop).
                        lastUIUpdate = currentTime;
                        await delay();
                        progressIndicator.textContent = progressTextPre + (+index + 1) + progressTextPost;
                    }
                    
                    //If the user has clicked stop, then do so.
                    if(stop) {
                        stop = !stop;
                        break;
                    }
                    
                    //Get results for all active filters for the question.
                    const resultsAllFilters = filterQuestion(question);
                    
                    //To qualify, the question must match all secondry filters.
                    if(!activeSecondaryFilters.every(filterKey => resultsAllFilters[filterKey])) continue;
                    
                    //A set of filter groups which are OR'ed together. A question needs to only pass one group to qualify.
                    const primaryFilters = {
                        close  :  isset.close  && resultsAllFilters.incloserange,
                        delete :  isset.delete && activeDeleteFilters.every(filterKey => resultsAllFilters[filterKey]),
                        reopen :  isset.reopen && activeReopenFilters.every(filterKey => resultsAllFilters[filterKey]),
                        default: !isset.delete && !isset.close && !isset.reopen && resultsAllFilters.inclosedaterange
                    };
                    
                    //Add the question to the queue, if it matches at least one primary filter. Add the primary filter results to any accepted question.
                    if(Object.values(primaryFilters).some(primeFilter => primeFilter)) filteredQueue.push(Object.assign(question, {primaryFilters}));
                }
                
                resolve(filteredQueue);
            });
            
            //Don't hide the spinner here due to Chrome/Tampermonkey's issue with GM Storage being expensive.
            //nodes.spinner.hide();
            nodes.applyFilters.disabled = false;
            nodes.stopFilter.disabled = true;
            nodes.indicator_progress.textContent = '';
            if(GM_info.script.author) {
                nodes.indicator_progress.textContent = 'Waiting for data to store (Tampermonkey issue)';
            }
            stop = false;
            
            console.log(queue.map(post => ' - https://stackoverflow.com/q/' + post.question_id).join('\n'));

            var performElapsedSeconds = (performance.now() - performStart)/1000;
            var questionsPerSecond = question_list.length/performElapsedSeconds;
            console.log('Filtered', question_list.length.toLocaleString(), 'questions in', performElapsedSeconds.toLocaleString(), 'seconds at a rate of', questionsPerSecond.toLocaleString(), 'questions/s.');
            
            return queue;
        };

        /** End Functions **/
        
        /** Start Event Listeners **/
        nodes.stop.addEventListener('click', _ => stop = true);
        nodes.stopFilter.addEventListener('click', _ => stop = true);

        nodes.form.addEventListener('submit', async event => {
            event.preventDefault();
            question_list = await retrieve();
            store.question_list = JSON.stringify(question_list);
            queue = await filterQuestions(question_list);
            store.queue = JSON.stringify(queue);
            display(+store.current);
        });
        
        nodes.filtersForm.addEventListener('submit', async event => {
            event.preventDefault();
            queue = await filterQuestions(question_list);
            store.queue = JSON.stringify(queue);
            display(+store.current);
        }, false);

        nodes.prev.addEventListener('click', _ => {
            store.current = +store.current - 1;
            display(+store.current);
        }, false);

        nodes.next.addEventListener('click', _ => {
            store.current = +store.current + 1;
            display(+store.current);
        }, false);
        
        (_ => {
            let open = false;
            if(typeof store.filtersToggleOpen !== 'undefined') open = store.filtersToggleOpen;
            nodes.filters.style.display = open ? '' : 'none';
            nodes.filtersToggle.textContent = open ? `\u25B2` : `\u25BC`;
            nodes.filtersToggle.addEventListener('click', _ => {
                nodes.filters.style.display = open ? 'none' : '';
                nodes.filtersToggle.textContent = open ? `\u25BC` : `\u25B2`;
                open = !open;
                store.filtersToggleOpen = open;
            }, false);
        })();
        
        (_ => {
            let open = true;
            if(typeof store.filtersHelpOpen !== 'undefined') open = store.filtersHelpOpen;
            nodes.filtersHelp.style.display = open ? '' : 'none';
            nodes.filtersHelpHeader_toggleIndicator.textContent = open ? `?\u25BC` : `?\u25B6`;
            nodes.filtersHelpHeader.addEventListener('click', _  => {
                nodes.filtersHelp.style.display = open ? 'none' : '';
                nodes.filtersHelpHeader_toggleIndicator.textContent = open ? `?\u25B6` : `?\u25BC`;
                open = !open;
                store.filtersHelpOpen = open;
            }, false);
        })();
        /** End Event Listeners **/
        
        // Prevent reloading the page on post state change; reload post instead.
        executeInPage(listener => addXHRListener(listener), true, 'magicTagReview-addXHRListener-preventReloadOnClose', {
            regex: /close\/add/,
            get: data => {
                if(data.property === 'responseText') {
                    console.log(data.xhr.responseText);
                    const obj = JSON.parse(data.xhr.responseText);
                    if(!obj.Count) {
                        Object.assign(obj, {
                            "Message":"Your vote has been recorded",
                            "ResultChangedState":false,
                            "Count":4,
                            "CountNeededForStateChange":1
                        });
                        data.value = JSON.stringify(obj);
                        window.dispatchEvent(new CustomEvent('magicTagReview-userCloseVoted', {
                            bubbles: true,
                            cancelable: true
                        }));
                    }
                }
            }
        });
        window.addEventListener('magicTagReview-userCloseVoted', e => display(store.current), true);
        
        display(+store.current);
    }
}, false);
