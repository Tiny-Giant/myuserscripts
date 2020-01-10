// ==UserScript==
// @name         Arctic Cat Invoice Print Fix
// @namespace    http://github.com/Tiny-Giant
// @version      1.0.0.0
// @description  Fixes Arctic Cat invoice printing
// @author       @TinyGiant
// @match        https://cattrackeronline.arcticcatinc.com/DP_Old_NWD/app/displayInvoice.do*
// @grant        none
// ==/UserScript==

var mywindow = window.open('', 'PRINT', 'height=900,width=900');

mywindow.document.write('<html><head>');
mywindow.document.write(document.head.innerHTML)
mywindow.document.write('</head><body >');
mywindow.document.write(document.body.innerHTML);
mywindow.document.write('</body></html>');

mywindow.focus(); // necessary for IE >= 10*/
mywindow.print();
mywindow.close();

return true;
