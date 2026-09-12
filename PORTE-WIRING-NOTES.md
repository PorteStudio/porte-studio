# Porte Studio — Wiring Checklist

Plain-English notes on the custom bits that make the site's forms work.
Claude Design does **not** know about these, so they must be re-added after
any Claude Design export. (Zac never has to do this — it's Claude's job.)

## The two custom files
- **porte-forms.js** — makes the forms actually send, adds the popup, opens
  it from the "Book a discovery call" / "Get in touch" buttons, and hides the
  ".html" in links.
- **vercel.json** — tells the host to serve clean URLs (/services, not
  /services.html) and use "/" for home.

## The one setting that matters
Inside `porte-forms.js`, near the top:
```
var WEB3FORMS_KEY = "...";
```
This is the Web3Forms access key tied to **hello@portestudio.com.au**.
Every enquiry emails that inbox (a Google Group), so Jess or Zac can pick it up.

## Re-apply steps after a Claude Design export (Claude does this)
1. Copy `porte-forms.js` and `vercel.json` into the exported site folder.
2. Make sure `WEB3FORMS_KEY` still holds the real key.
3. Add this line just before `</body>` on every page
   (index, services, work, about, contact):
   ```
   <script src="porte-forms.js"></script>
   ```
4. Upload everything to GitHub → Vercel redeploys in ~60 seconds.
5. Quick check: open the live site, click "Get in touch", send a test —
   confirm it lands in hello@.

## Where things live
- Design & content: **Claude Design** (Zac edits visually here)
- Form wiring & clean URLs: **the two files above** (Claude re-applies)
- Live source of truth: **GitHub → Vercel** (what's deployed)
