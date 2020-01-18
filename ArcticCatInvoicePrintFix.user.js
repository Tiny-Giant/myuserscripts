// ==UserScript==
// @name         Arctic Cat Invoice Print Fix
// @namespace    http://github.com/Tiny-Giant
// @version      1.0.0.2
// @description  Fixes Arctic Cat invoice printing
// @author       @TinyGiant
// @match        https://cattrackeronline.arcticcatinc.com/DP_Old_NWD/app/displayInvoice.do*
// @match        https://cattrackeronline.arcticcatinc.com/DP_Old_NWD/app/loadElectronicInvoicing.do
// @grant        none
// @run-at       document-idle
// ==/UserScript==

if(/displayInvoice/.test(window.location.href)) {
    document.body.insertAdjacentHTML('afterbegin', `
        <form id="print">
            <button type="submit">Print</button>
        </form>
        <style type="text/css">
            @media print {
                #print {
                    display: none;
                }
            }
        </style>
    `);

    const form = document.getElementById('print')
    form.addEventListener('submit', e => {
        e.preventDefault()
        window.print()
    }, false)
} else {
    document.head.insertAdjacentHTML('beforeend', `
        <style type="text/css">
            .icon-print {
                display: none;
            }
        </style>
    `)
}
