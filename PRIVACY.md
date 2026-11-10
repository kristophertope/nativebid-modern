# Privacy Policy — NativeBid Modern

Last updated: November 9, 2026

This Chrome extension provides an alternative interface for nativebid.com. It is not affiliated with or endorsed by NativeBid Auction Services.

## Data collection

The extension does not collect, store, transmit, sell, or share any personal or user data. It has no servers, analytics, tracking, or advertising.

## How the extension works

- It runs only on nativebid.com.
- It reads the content of the NativeBid pages you visit and displays it in a different layout, entirely within your browser.
- To load more search results as you scroll, it requests additional result pages directly from nativebid.com, the same requests the site itself makes.
- To make pages open faster, it asks Chrome to load some NativeBid pages in the background before you click: the All lots page and your most recent results page, plus any NativeBid link you rest your pointer on.
- On NativeBid's results and auction pages, it adjusts two response headers so Chrome can keep the page in memory and the Back button returns to it instantly. Lot pages and account pages are left unchanged so they always load fresh. When you return to a results page, it re-checks prices with nativebid.com in the background.
- On nativebid.com, it blocks the site's analytics and marketing scripts (Google Tag Manager, Facebook, OneSignal, Mailchimp, and Cloudflare Insights) so pages load faster. This uses Chrome's built-in request blocking; the extension does not see or record these requests.
- When a countdown reaches zero, it asks nativebid.com how much time is left on that lot, the same check NativeBid's own pages make, so a lot extended by a last-second bid isn't shown as ended.
- When you place a bid, it sends the bid to nativebid.com using NativeBid's own confirmation and bidding requests, with your existing NativeBid sign-in. It shows NativeBid's fee summary first and only places the bid when you tap to confirm. The extension never sees or handles your password or payment details.

## Local storage

The extension saves a few small pieces of information in your browser only:

- Whether you prefer the modern or classic layout.
- The words and phrases you've added as result filters.
- The addresses of your last few results pages, so they can be loaded ahead of time.
- Your scroll position and the lots already loaded on a results page, so the Back button returns you to the same place instantly. This is cleared when you close the tab.

This information never leaves your device.

## Third parties

Your use of nativebid.com remains subject to NativeBid's own privacy policy and terms.

## Contact

Questions about this policy: open an issue at https://github.com/kristophertope/nativebid-modern/issues
